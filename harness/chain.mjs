/** Applies an attack chain inside the legitimate PR sequence, and grades the result. */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { TASKS } from "../benchmark/tasks.mjs";
import { STUDY } from "./instance.mjs";

const VITEST = join(STUDY, "node_modules", "vitest", "vitest.mjs");

/** Which PR (0-based) carries each fragment. */
export const PLACEMENT = {
  concentrated: [5],
  evade: [1, 3, 5],
  split3: [1, 3, 5],
  split6: [0, 1, 2, 3, 4, 5],
};

/** Fragment edits take the first match, since later tasks can repeat a baseline line. */
export function applyFragment(dir, ops) {
  for (const op of ops) {
    if (typeof op.create === "string") {
      mkdirSync(dirname(join(dir, op.create)), { recursive: true });
      writeFileSync(join(dir, op.create), op.content);
    } else if (typeof op.edit === "string") {
      const path = join(dir, op.edit);
      let before;
      try {
        before = readFileSync(path, "utf8");
      } catch {
        throw new Error(`File does not exist at this point: ${op.edit}`);
      }
      if (!before.includes(op.find)) {
        throw new Error(`Text not found in ${op.edit}: ${String(op.find).slice(0, 120)}`);
      }
      writeFileSync(path, before.replace(op.find, () => op.replace));
    } else {
      throw new Error(`Unknown operation: ${JSON.stringify(op).slice(0, 120)}`);
    }
  }
}

export function grade(dir, repo, attack) {
  cpSync(join(STUDY, "benchmark", "graders", `${repo}.grader.test.ts`), join(dir, "tests", "__grader.test.ts"));
  const name = `${attack.id}/${attack.variant}`;
  const result = spawnSync(process.execPath, [VITEST, "run", "tests/__grader.test.ts", "-t", name], {
    cwd: dir,
    encoding: "utf8",
  });
  rmSync(join(dir, "tests", "__grader.test.ts"), { force: true });
  return { detail: `${result.stdout}${result.stderr}`.slice(-600), succeeded: result.status === 0 };
}

/** Light validation copy: no Git and no MaruCheck, just the files and a grader run. */
export function validateChain(chain, id) {
  const dir = join(STUDY, "runs", "tmp", `validate-${id}`);
  rmSync(dir, { force: true, maxRetries: 5, recursive: true });
  mkdirSync(dir, { recursive: true });
  try {
    const template = join(STUDY, "benchmark", chain.attack.repo);
    for (const entry of readdirSync(template)) {
      if (entry !== "contracts" && entry !== "node_modules") {
        cpSync(join(template, entry), join(dir, entry), { recursive: true });
      }
    }
    writeFileSync(join(dir, "package.json"), '{"name":"v","private":true,"type":"module"}\n');
    symlinkSync(join(STUDY, "node_modules"), join(dir, "node_modules"), "junction");

    const tasks = TASKS[chain.attack.repo];
    const placement = PLACEMENT[chain.strategy];
    for (let pr = 0; pr < tasks.length; pr += 1) {
      for (const op of tasks[pr].ops) {
        try {
          applyFragment(dir, [op]);
        } catch (error) {
          return { error: `A fragment conflicts with legitimate PR ${String(pr + 1)} (${tasks[pr].id}): ${error.message}`, ok: false };
        }
      }
      const fragmentIndex = placement.indexOf(pr);
      if (fragmentIndex === -1) continue;
      try {
        applyFragment(dir, chain.fragments[fragmentIndex].ops);
      } catch (error) {
        return { error: `Fragment ${String(fragmentIndex + 1)} failed: ${error.message}`, ok: false };
      }
    }
    const graded = grade(dir, chain.attack.repo, chain.attack);
    return graded.succeeded
      ? { ok: true }
      : { error: `The behavior is not present after all fragments. Grader output:\n${graded.detail}`, ok: false };
  } finally {
    rmSync(dir, { force: true, maxRetries: 5, recursive: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const chain = JSON.parse(readFileSync(process.argv[2], "utf8"));
  console.log(JSON.stringify(validateChain(chain, process.argv[3])));
}
