/**
 * The honest baseline. Each honest PR sits on the reference chain before its task, then goes
 * through the same monitors as attack PRs. Reference PRs are included as their own samples.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TASKS } from "../benchmark/tasks.mjs";
import { applyFragment } from "./chain.mjs";
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

const CANDIDATES = join(STUDY, "runs", "honest");
const OUT = join(STUDY, "runs", "honest-prs");

function evaluate(candidate, id) {
  const tasks = TASKS[candidate.repo];
  const instance = createInstance(candidate.repo, id);
  try {
    for (const task of tasks.slice(0, candidate.index)) {
      applyOps(instance.dir, task.ops);
      commitAll(instance.dir, task.title);
    }
    const task = tasks[candidate.index];
    try {
      if (candidate.reference) applyOps(instance.dir, task.ops);
      else applyFragment(instance.dir, candidate.ops);
    } catch (error) {
      return { name: candidate.name, applied: false, error: error.message };
    }
    const m4Local = monitorShippedLocal(instance.dir);
    commitAll(instance.dir, task.title);
    return {
      applied: true,
      index: candidate.index,
      model: candidate.model,
      name: candidate.name,
      priorTasks: tasks.slice(0, candidate.index).map((prior) => prior.description),
      prs: [
        {
          cumulativeDiff: git(instance.dir, "diff", "base", "HEAD", "--", ".", ":(exclude).maru/generated"),
          diff: git(instance.dir, "show", "--format=", "HEAD"),
          m3: monitorPlainCi(instance.dir),
          m4Ci: monitorShippedCi(instance.dir),
          m4Local,
          m5: monitorSwarm(instance.dir),
          task: task.id,
          taskDescription: task.description,
        },
      ],
      repo: candidate.repo,
    };
  } finally {
    destroyInstance(instance);
  }
}

function runOne(file, id) {
  const candidate = JSON.parse(readFileSync(file, "utf8"));
  const result = evaluate(candidate, id);
  writeFileSync(join(OUT, `${candidate.name}.json`), JSON.stringify(result));
  const pr = result.prs?.[0];
  console.log(
    result.applied
      ? `m3=${pr.m3.blocked ? 1 : 0} m4ci=${pr.m4Ci.blocked ? 1 : 0} m4local=${pr.m4Local.blocked ? 1 : 0} m5=${pr.m5.blocked ? 1 : 0} ${result.name}`
      : `not-applied ${result.name}: ${String(result.error).slice(0, 80)}`,
  );
}

async function main() {
  const workers = Number(process.argv[2] ?? 4);
  mkdirSync(OUT, { recursive: true });
  const references = join(STUDY, "runs", "tmp", "honest-references");
  mkdirSync(references, { recursive: true });
  const files = [];
  for (const [repo, tasks] of Object.entries(TASKS)) {
    tasks.forEach((task, index) => {
      const name = `${repo}.${String(index + 1)}-${task.id}.reference`;
      const path = join(references, `${name}.json`);
      writeFileSync(path, JSON.stringify({ index, model: "reference", name, reference: true, repo }));
      files.push({ name, path });
    });
  }
  for (const file of readdirSync(CANDIDATES).filter((entry) => entry.endsWith(".json"))) {
    const candidate = JSON.parse(readFileSync(join(CANDIDATES, file), "utf8"));
    if (candidate.status === "generated") files.push({ name: candidate.name, path: join(CANDIDATES, file) });
  }
  const pending = files.filter(({ name }) => !existsSync(join(OUT, `${name}.json`)));
  console.log(`${files.length} honest PRs, ${pending.length} pending`);

  let next = 0;
  const script = fileURLToPath(import.meta.url);
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (next < pending.length) {
        const serial = next;
        const { path } = pending[next++];
        await new Promise((done) => {
          const child = spawn(process.execPath, [script, "--one", path, `honest-${String(serial)}`], {
            stdio: "inherit",
          });
          child.on("exit", done);
        });
      }
    }),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv[2] === "--one") runOne(process.argv[3], process.argv[4]);
  else await main();
}
