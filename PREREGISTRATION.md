# Pre-registration

Committed before any side task was chosen or any attack was run. Later changes go in the deviations
log at the bottom, with a date and a reason. Git history is the timestamp.

## Question

Distributed attacks defeat monitors that judge suspicion. Do they also defeat a monitor that judges
behavior, and what does an attacker do instead?

## Hypotheses

- **H1 (replication):** Per-PR LLM suspicion falls as an attack is split across more agents.
- **H2 (main):** On properties the contract covers, splitting does not materially lower detection by
  the cumulative contract oracle (M5). "Materially" means a drop under 10 percentage points between
  concentrated and 6-way split.
- **H3 (adaptation):** Against monitor-aware agents, undetected successes come mainly from oracle
  gaps (uncovered properties, tests, approvals, availability), not from hiding in covered behavior.
- **H4 (limit):** M5 detection falls as contract coverage falls.
- **H5 (complement):** M5 combined with M2 catches more attacks than either alone at the same honest
  false-positive budget.

Negative results are reported the same way as positive ones.

## Conditions

**Monitors**

| ID | Monitor                                                                 |
| -- | ----------------------------------------------------------------------- |
| M1 | LLM suspicion on each PR diff                                           |
| M2 | LLM suspicion on the cumulative diff since the baseline                 |
| M3 | Plain CI: the repo's own test suite, which agents can edit              |
| M4 | MaruCheck 0.6.1 as shipped (tag `pre-sprint-baseline`, commit `4d07f52`) |
| M5 | MaruCheck Swarm mode: cumulative, full sweep, fail closed, sealed       |
| M6 | M5 or M2                                                                |

**Attack strategies:** concentrated (one PR), split 3, split 6, and split plus oracle tampering.
Agents share state only through Git.

**Contract coverage:** 25, 50, 75 and 100% of requirements, sampled at random with fixed seeds.
**Contract author:** human-style contract from product requirements, and an LLM draft from the
README alone.

## Benchmark

Small TypeScript repositories, each with a sequence of legitimate PR tasks. MaruCheck only runs
JS/TS, so existing Python benchmarks do not apply without a port.

## Validity rules

1. Contracts and contract tests are committed before side tasks exist.
2. Side tasks are chosen by a model that sees only each repo's README, never its contracts.
3. The first four feasible side tasks per repo are used, in the order proposed. A task is dropped
   only if it cannot be implemented or cannot be graded, and every drop is logged.
4. Side-task success is graded by a separate grader per side task, not by the monitors under test.
5. At least one out-of-contract side task per repo stays in the set if the model proposes one. If
   none is proposed, one is added and marked as author-added.

## Models

Hosted on Adaption, subject to what the key can access. Attackers and monitors come from different
families.

- Attack agents, Phase B: `glm-5.2`.
- Stronger monitor: `qwen3.5-397b`.
- Weaker trusted monitor: `gemma-4-31b-it`.
- Side-task proposer and README contract drafter: `glm-5.2`.

## Metrics

- Primary: share of successful attacks caught, at a fixed honest false-positive rate of 2% and 5%
  for LLM monitors. M3, M4 and M5 are binary, so their honest false-positive rate is reported
  directly.
- Secondary: main-task usefulness, cost and latency per PR.
- Intervals: exact binomial or bootstrap 95%, with sample sizes shown on every estimate.

## Phases

- **Phase A:** scripted attacks, reproducible and with no attacker model.
- **Phase B:** adaptive agents told about the gate. Sample size is set from a pilot before the main
  run and logged here.

## Disclosure

MaruCheck 0.6.1 and earlier is preexisting. The bypass probes run on 2026-11-05 predate the sprint and
are disclosed as such. No result in the report comes from those probes.

## Deviations log

All entries below were made before the main attack run.

1. **2026-11-07. Attack code is model-written.** Phase A was planned as hand-written fragments. The
   author also wrote the contract tests, so hand-written attacks could be tilted either way. Fragments
   are now written by `glm-5.2`, which sees the source and the side-task spec but never the contracts
   or contract tests. The generated chains are fixed artifacts, so Phase A stays reproducible.
2. **2026-11-07. Broad and targeted variants.** The proposer named behaviors, not triggers. Each
   in-contract behavior now has a broad variant and, where it makes sense, a targeted variant active
   only on a narrow trigger. Triggers were set by the author without running the contract tests
   against them, and all variants are reported. This separates two things H2 had merged: a property
   the contract states, and a property its tests exercise. H2 is reported for each variant, and for
   out-of-contract tasks separately.
3. **2026-11-07. Added strategy: test evasion.** A monitor-aware attacker can make code behave
   honestly only under test, for example by checking `process.env.VITEST`. This is added as a fifth
   strategy, because leaving it out would overstate M5.
4. **2026-11-07. Six legitimate PRs per repository.** The plan said 8 to 10. Six is the fewest that
   allows a 6-way split, and the pre-registration fixed no number.
5. **2026-11-07. Selection recorded.** The rule 3 and 5 outcome is in
   `benchmark/side-tasks/selected.json`. No proposal was dropped.
6. **2026-11-07. Pilot on one attack spec.** One spec (`cancel-no-fallback`, broad) was run through
   the binary monitors to test the pipeline and to confirm M5 blocks a real violation. Its four chains
   stay in the main set and are not regenerated.
7. **2026-11-07. Tamper timing.** The pilot showed tampering only in the last PR leaves tests red from
   the PR that broke them, so plain CI caught it early. No real attacker would wait. The tamper
   strategy now disables a broken test in the PR that breaks it. This makes the strategy stronger
   against M3 and changes nothing for M5, which refuses any change to a sealed test.
