/** Rebuilds each honest PR that M5 blocked and records exactly which tests failed. */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { TASKS } from "../benchmark/tasks.mjs";
import { applyFragment } from "./chain.mjs";
import { STUDY, applyOps, commitAll, createInstance, destroyInstance } from "./instance.mjs";

const OUT = join(STUDY, "runs", "honest-prs");
const VITEST = join(STUDY, "node_modules", "vitest", "vitest.mjs");
const results = [];

for (const file of readdirSync(OUT).filter((entry) => entry.endsWith(".json"))) {
  const pr = JSON.parse(readFileSync(join(OUT, file), "utf8"));
  if (pr.applied === false || !pr.prs[0].m5.blocked) continue;
  const source = join(STUDY, "runs", "honest", file);
  if (!existsSync(source)) continue;
  const candidate = JSON.parse(readFileSync(source, "utf8"));
  const instance = createInstance(candidate.repo, `explain-${String(results.length)}`);
  try {
    const tasks = TASKS[candidate.repo];
    for (const task of tasks.slice(0, candidate.index)) {
      applyOps(instance.dir, task.ops);
      commitAll(instance.dir, task.title);
    }
    applyFragment(instance.dir, candidate.ops);
    const run = spawnSync(process.execPath, [VITEST, "run", "--reporter=json"], {
      cwd: instance.dir,
      encoding: "utf8",
    });
    const parsed = JSON.parse(run.stdout.slice(run.stdout.indexOf("{")));
    const failures = parsed.testResults.flatMap((suite) => {
      const path = relative(instance.dir, suite.name).replaceAll("\\", "/");
      const tests = suite.assertionResults
        .filter((test) => test.status === "failed")
        .map((test) => ({
          contract: path.includes(".contract."),
          message: String(test.failureMessages?.[0] ?? "").split("\n")[0].slice(0, 140),
          path,
          title: test.fullName,
        }));
      return tests.length > 0 || suite.status === "passed"
        ? tests
        : [{ contract: path.includes(".contract."), message: String(suite.message ?? "").split("\n")[0].slice(0, 140), path, title: "suite failed to load" }];
    });
    results.push({ failures, model: candidate.model, name: candidate.name });
    console.log(`\n${candidate.name}`);
    for (const failure of failures) {
      console.log(`  ${failure.contract ? "CONTRACT" : "own test"} ${failure.path} | ${failure.title.slice(0, 60)} | ${failure.message}`);
    }
  } finally {
    destroyInstance(instance);
  }
}
writeFileSync(join(STUDY, "runs", "honest-blocks-explained.json"), `${JSON.stringify(results, null, 2)}\n`);
const contract = results.filter((result) => result.failures.some((failure) => failure.contract)).length;
console.log(`\n${results.length} blocked honest PRs: ${contract} failed a contract test, ${results.length - contract} failed only their own tests.`);
