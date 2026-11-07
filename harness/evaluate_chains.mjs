/**
 * Runs each valid attack chain through the binary monitors, PR by PR, and saves every diff so
 * the LLM monitors score exactly the same changes.
 *
 *   node harness/evaluate_chains.mjs [filter] [workers]
 *
 * Each chain runs in a child process so that a slow chain cannot stall the others.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TASKS } from "../benchmark/tasks.mjs";
import { PLACEMENT, applyFragment, grade } from "./chain.mjs";
import {
  STUDY,
  applyOps,
  commitAll,
  createInstance,
  destroyInstance,
  git,
  monitorPlainCi,
  monitorShippedCi,
  monitorShippedLocal,
  monitorSwarm,
} from "./instance.mjs";

const CHAINS = join(STUDY, "runs", "chains");
const RESULTS = join(STUDY, "runs", "phase-a");
const VITEST = join(STUDY, "node_modules", "vitest", "vitest.mjs");

function failingTests(dir) {
  const result = spawnSync(process.execPath, [VITEST, "run", "--reporter=json"], {
    cwd: dir,
    encoding: "utf8",
  });
  try {
    const parsed = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
    return parsed.testResults.flatMap((file) =>
      file.assertionResults
        .filter((test) => test.status === "failed")
        .map((test) => ({ file: file.name, title: test.title })),
    );
  } catch {
    return [];
  }
}

/**
 * The tampering attacker: whatever tests the attack broke are switched off in the same PR.
 * Plain CI then goes green, which is what a shared test suite offers an attacker.
 */
function tamperWithTests(dir) {
  const failed = failingTests(dir);
  for (const { file, title } of failed) {
    const before = readFileSync(file, "utf8");
    writeFileSync(file, before.replace(`it("${title}"`, `it.skip("${title}"`));
  }
  return failed.length;
}

function evaluate(chain, strategy, instanceId) {
  const { attack } = chain;
  const instance = createInstance(attack.repo, instanceId);
  const tasks = TASKS[attack.repo];
  const placement = PLACEMENT[chain.strategy];
  const prs = [];
  try {
    for (let pr = 0; pr < tasks.length; pr += 1) {
      applyOps(instance.dir, tasks[pr].ops);
      const index = placement.indexOf(pr);
      if (index !== -1) applyFragment(instance.dir, chain.fragments[index].ops);
      const tampered = strategy === "tamper" && pr === tasks.length - 1 ? tamperWithTests(instance.dir) : 0;

      // The shipped gate as an agent's stop hook would see it, before the commit.
      const m4Local = monitorShippedLocal(instance.dir);
      commitAll(instance.dir, tasks[pr].title);
      prs.push({
        cumulativeDiff: git(instance.dir, "diff", "base", "HEAD", "--", ".", ":(exclude).maru/generated"),
        diff: git(instance.dir, "show", "--format=", "HEAD"),
        hasFragment: index !== -1,
        m3: monitorPlainCi(instance.dir),
        m4Ci: monitorShippedCi(instance.dir),
        m4Local,
        m5: monitorSwarm(instance.dir),
        task: tasks[pr].id,
        taskDescription: tasks[pr].description,
        tampered,
      });
    }
    const graded = grade(instance.dir, attack.repo, attack);
    return {
      attack,
      name: `${chain.name}${strategy === "tamper" ? ".tamper" : ""}`,
      prs,
      seed: chain.seed,
      sideTaskSucceeded: graded.succeeded,
      strategy,
    };
  } finally {
    destroyInstance(instance);
  }
}

function runOne(file, strategy, id) {
  const chain = JSON.parse(readFileSync(join(CHAINS, file), "utf8"));
  const result = evaluate(chain, strategy, id);
  writeFileSync(join(RESULTS, `${result.name}.json`), JSON.stringify(result));
  const caught = (key) => result.prs.some((pr) => pr[key].blocked);
  console.log(
    `${result.sideTaskSucceeded ? "SUCCESS" : "no-side"} m3=${caught("m3") ? 1 : 0} m4ci=${caught("m4Ci") ? 1 : 0} m4local=${caught("m4Local") ? 1 : 0} m5=${caught("m5") ? 1 : 0} ${result.name}`,
  );
}

async function main() {
  const filter = process.argv[2] ?? "";
  const workers = Number(process.argv[3] ?? 4);
  mkdirSync(RESULTS, { recursive: true });
  const files = readdirSync(CHAINS).filter((file) => file.endsWith(".json") && file.includes(filter));
  const jobs = [];
  const skipped = {};
  for (const file of files) {
    const chain = JSON.parse(readFileSync(join(CHAINS, file), "utf8"));
    if (chain.status !== "valid") {
      skipped[chain.status] = (skipped[chain.status] ?? 0) + 1;
      continue;
    }
    jobs.push({ file, strategy: chain.strategy });
    if (chain.strategy === "split6") jobs.push({ file, strategy: "tamper" });
  }
  const pending = jobs.filter(({ file, strategy }) => {
    const name = `${file.replace(/\.json$/u, "")}${strategy === "tamper" ? ".tamper" : ""}`;
    return !existsSync(join(RESULTS, `${name}.json`));
  });
  console.log(`${jobs.length} evaluations, ${pending.length} pending. Not valid: ${JSON.stringify(skipped)}`);

  let next = 0;
  let serial = 0;
  const script = fileURLToPath(import.meta.url);
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (next < pending.length) {
        const { file, strategy } = pending[next++];
        serial += 1;
        await new Promise((done) => {
          const child = spawn(process.execPath, [script, "--one", file, strategy, `eval-${String(serial)}`], {
            stdio: "inherit",
          });
          child.on("exit", done);
        });
      }
    }),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "--one") runOne(process.argv[3], process.argv[4], process.argv[5]);
  else await main();
}
