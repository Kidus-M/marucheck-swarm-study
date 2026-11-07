/** Builds throwaway Git instances of a benchmark repo, and runs the binary monitors on them. */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STUDY = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SHIPPED = join(STUDY, "tools", "maru-shipped.cjs");
const SWARM = join(STUDY, "tools", "maru-swarm.cjs");
const VITEST = join(STUDY, "node_modules", "vitest", "vitest.mjs");
const TMP = join(STUDY, "runs", "tmp");

function sh(cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  return { code: result.status, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

export function git(cwd, ...args) {
  const result = sh(cwd, "git", args);
  if (result.code !== 0) throw new Error(`git ${args.join(" ")}: ${result.out}`);
  return result.out;
}

const maru = (cwd, bundle, ...args) => sh(cwd, process.execPath, [bundle, ...args]);

export function commitAll(dir, message) {
  git(dir, "add", "--all");
  git(dir, "commit", "--quiet", "--allow-empty", "-m", message);
  return git(dir, "rev-parse", "HEAD").trim();
}

/** A fresh sealed baseline, tagged `base`. The key stays outside the instance. */
export function createInstance(repo, id) {
  const dir = join(TMP, id);
  const keys = join(TMP, `${id}.keys`);
  rmSync(dir, { force: true, maxRetries: 5, recursive: true });
  rmSync(keys, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
  mkdirSync(keys, { recursive: true });

  const template = join(STUDY, "benchmark", repo);
  for (const entry of readdirSync(template)) {
    if (entry !== "contracts" && entry !== "node_modules") cpSync(join(template, entry), join(dir, entry), { recursive: true });
  }
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify(
      {
        devDependencies: { typescript: "5.9.3", vitest: "4.1.0" },
        name: repo,
        private: true,
        scripts: { test: "vitest run" },
        type: "module",
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(join(dir, ".gitignore"), "node_modules/\n.maru/generated/\n.maru/artifacts/\n");
  symlinkSync(join(STUDY, "node_modules"), join(dir, "node_modules"), "junction");
  git(dir, "init", "--quiet", "--initial-branch=main");
  git(dir, "config", "user.email", "study@example.com");
  git(dir, "config", "user.name", "Study");
  git(dir, "config", "core.autocrlf", "false");

  maru(dir, SWARM, "init");
  const contracts = readdirSync(join(template, "contracts"));
  for (const file of contracts) {
    cpSync(join(template, "contracts", file), join(dir, ".maru", "contracts", file));
    const id_ = file.replace(/\.ya?ml$/u, "");
    const approved = maru(dir, SWARM, "contract", "approve", id_, "--by", "contract-owner@example.com");
    if (approved.code !== 0) throw new Error(`approve ${id_}: ${approved.out}`);
  }
  const keyPath = join(keys, "seal.pem");
  const key = maru(dir, SWARM, "seal", "keygen", "--out", keyPath);
  if (key.code !== 0) throw new Error(`keygen: ${key.out}`);
  const seal = maru(dir, SWARM, "seal", "create", "--key", keyPath, "--by", "contract-owner@example.com");
  if (seal.code !== 0) throw new Error(`seal: ${seal.out}`);
  commitAll(dir, "sealed baseline");
  git(dir, "tag", "base");
  return { dir, keyPath, repo };
}

export function destroyInstance(instance) {
  rmSync(instance.dir, { force: true, maxRetries: 5, recursive: true });
  rmSync(`${instance.dir}.keys`, { force: true, recursive: true });
}

export function applyOps(dir, ops) {
  for (const op of ops) {
    if (op.create !== undefined) {
      mkdirSync(dirname(join(dir, op.create)), { recursive: true });
      writeFileSync(join(dir, op.create), op.content);
      continue;
    }
    const path = join(dir, op.edit);
    const before = readFileSync(path, "utf8");
    if (before.split(op.find).length !== 2) {
      throw new Error(`Expected one match in ${op.edit} for: ${op.find}`);
    }
    writeFileSync(path, before.replace(op.find, () => op.replace));
  }
}

/** M3: plain CI, the repo's whole test suite as it stands in the change. */
export function monitorPlainCi(dir) {
  const result = sh(dir, process.execPath, [VITEST, "run"]);
  return { blocked: result.code !== 0, detail: result.code === 0 ? "passed" : "tests failed" };
}

function reportSummary(dir) {
  const runs = join(dir, ".maru", "artifacts", "runs");
  if (!existsSync(runs)) return undefined;
  const latest = readdirSync(runs).sort().at(-1);
  if (latest === undefined) return undefined;
  const path = join(runs, latest, "report.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
}

/**
 * M4: 0.6.1 as shipped, in its documented default use. Run as the PR check would run it,
 * on a clean checkout of a committed change.
 */
export function monitorShippedCi(dir) {
  const result = maru(dir, SHIPPED, "ci", "verify");
  return { blocked: result.code !== 0, detail: result.out.split("\n")[0] ?? "" };
}

/** M4 variant: 0.6.1 run by hand before the change is committed. */
export function monitorShippedLocal(dir) {
  const result = maru(dir, SHIPPED, "verify", "--diff");
  return { blocked: result.code !== 0, detail: result.out.match(/Verification gate: \w+/u)?.[0] ?? "" };
}

/** M5: Swarm mode at the merge gate, against the trusted base. */
export function monitorSwarm(dir) {
  const result = maru(dir, SWARM, "ci", "verify", "--base", "base", "--strict");
  const report = reportSummary(dir);
  const refused = result.out.includes("SEAL_BROKEN");
  return {
    blocked: result.code !== 0,
    detail: refused
      ? `seal broken: ${result.out.split("\n").filter((line) => /Sealed|Protected|seal/iu.test(line)).slice(1, 3).join("; ")}`
      : (report?.gate?.reasons?.[0] ?? "passed"),
    refused,
  };
}
