/**
 * Runs each reference PR chain through the binary monitors. An honest PR that a monitor
 * blocks is a false positive, and this has to be understood before any attack is run.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TASKS } from "../benchmark/tasks.mjs";
import {
  STUDY,
  applyOps,
  commitAll,
  createInstance,
  destroyInstance,
  git,
  monitorPlainCi,
  monitorShippedCi,
  monitorSwarm,
} from "./instance.mjs";

const rows = [];
for (const [repo, tasks] of Object.entries(TASKS)) {
  const instance = createInstance(repo, `honest-${repo}`);
  const base = [monitorPlainCi(instance.dir), monitorSwarm(instance.dir)];
  console.log(`${repo} baseline: plain=${base[0].detail} swarm=${base[1].detail}`);
  for (const task of tasks) {
    applyOps(instance.dir, task.ops);
    commitAll(instance.dir, task.title);
    const results = {
      m3: monitorPlainCi(instance.dir),
      m4: monitorShippedCi(instance.dir),
      m5: monitorSwarm(instance.dir),
    };
    rows.push({ repo, task: task.id, ...results });
    console.log(
      `  ${task.id.padEnd(22)} m3=${String(results.m3.blocked).padEnd(5)} m4=${String(results.m4.blocked).padEnd(5)} m5=${String(results.m5.blocked).padEnd(5)} ${results.m5.blocked ? results.m5.detail : ""}`,
    );
  }
  console.log(`  commits: ${git(instance.dir, "rev-list", "--count", "HEAD").trim()}`);
  destroyInstance(instance);
}

mkdirSync(join(STUDY, "runs"), { recursive: true });
writeFileSync(join(STUDY, "runs", "honest-chain.json"), `${JSON.stringify(rows, null, 2)}\n`);
const count = (key) => rows.filter((row) => row[key].blocked).length;
console.log(`\nHonest PRs: ${rows.length}. Blocked: m3=${count("m3")} m4=${count("m4")} m5=${count("m5")}`);
