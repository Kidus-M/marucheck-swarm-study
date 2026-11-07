# Splitting Lowers Suspicion, Not Detection

Benchmark, harness and results for a study of behavioral oracles and LLM monitors against distributed
coding-agent sabotage, written for the Swarm Alignment Hackathon (Apart Research, November 2026).

**Report:** [`report/report.pdf`](report/report.pdf)

Splitting an attack across six pull requests cut the mean LLM suspicion of attack-carrying PRs from 93 to
45, but the most suspicious PR in each chain still averaged 88, so a per-PR LLM monitor caught all 97 attack
chains at a 5% honest false-positive budget. A sealed contract oracle (MaruCheck Swarm mode) ignored
splitting and test tampering for behavior its tests exercise, and missed every narrow trigger and every
attack that switches itself off under test.

## What is preexisting and what is sprint work

- **Preexisting:** MaruCheck 0.6.1 and everything before it, commit `4d07f52`, tagged `pre-sprint-baseline`
  in [Kidus-M/MaruCheck](https://github.com/Kidus-M/MaruCheck). `tools/maru-shipped.cjs` is a build of that
  release. The MaruCheck bypass probes run on 2026-11-05 also predate the sprint, and no result here comes
  from them.
- **Sprint work:** Swarm mode, on the
  [`swarm-sprint`](https://github.com/Kidus-M/MaruCheck/tree/swarm-sprint) branch (commits `3a9839b` to
  `2a77d51`), built here as `tools/maru-swarm.cjs`; and everything in this repository: the pre-registration,
  the benchmark, the harness, the runs, the analysis and the report.

The pre-registration ([`PREREGISTRATION.md`](PREREGISTRATION.md)) was committed before the benchmark,
contracts or side tasks (commit `cbecbf4`). Its deviations log records every later change, with a date and a
reason.

## Layout

| Path                       | What it holds                                                                    |
| -------------------------- | -------------------------------------------------------------------------------- |
| `benchmark/`               | Three TypeScript repositories, their contracts and legitimate PR tasks           |
| `benchmark/side-tasks/`    | The selected side tasks (`selected.json`), proposed from each README alone        |
| `benchmark/graders/`       | A separate grader for each side task, kept apart from every monitor              |
| `harness/`                 | Generation, evaluation, LLM monitors, Phase B, analysis, figures, report build   |
| `tools/`                   | Built MaruCheck CLIs: 0.6.1 as shipped, and Swarm mode, with their commit hashes |
| `runs/analysis/`           | Aggregate results behind every number in the report                              |
| `runs/honest-chain.json`   | The reference PR chains through the binary monitors                              |
| `report/`                  | The report source, figures and PDF                                               |

## What is withheld

The benchmark repositories are small and synthetic, with no users or data, and network targets are
reserved example domains. The harness is published in full, including the attacker prompt template in
`harness/generate_attacks.py`, so the study can be rerun. These are not published: the generated attack
fragments and evaluated chains (`runs/chains`, `runs/phase-a`, `runs/phase-b`), the per-PR diffs, monitor
scores and reasoning (`runs/scores`, `runs/honest-prs`), and the model call log (`runs/llm-calls.jsonl`).
The aggregate results in `runs/analysis/` are enough to check every table and figure.

## Reproducing

Requirements: Node 24 or later, Python 3.13 with `adaption==0.19.0`, and an Adaption API key in
`~/.config/adaption/key`. Model calls are logged to `runs/llm-calls.jsonl`.

```sh
npm install
python -m venv .venv && .venv/Scripts/pip install adaption==0.19.0   # .venv/bin on macOS and Linux
```

The pipeline, in the order it was run:

```sh
node harness/honest-chain.mjs                 # reference PR chains through the binary monitors
python harness/propose_side_tasks.py          # side tasks from each README alone
python harness/generate_honest.py             # honest PR candidates from three models
node harness/evaluate_honest.mjs              # honest PRs through the binary monitors
python harness/generate_attacks.py 1          # attack chains, validated by each grader
node harness/evaluate_chains.mjs              # attack chains through M3, M4 and M5, PR by PR
python harness/llm_monitor.py                 # M1 and M2 on every honest and attack PR
python harness/analyze.py                     # runs/analysis/results.json and rows.json
python harness/phase_b.py "<spec filters>" 1 3   # the adaptive attacker, three rounds
python harness/analyze_phase_b.py             # runs/analysis/phase-b.json
python harness/report_numbers.py              # runs/analysis/report-numbers.json
python harness/figures.py                     # report/figures/*.svg
python harness/build_report.py                # report/report.pdf, with a page-count check
```

Model outputs are not deterministic, so a full rerun gives new samples. The last four steps rebuild every
number, figure and table of the report from `runs/analysis/` and the withheld runs; with only the published
files, `figures.py` and `build_report.py` reproduce the figures and the PDF.

## Author

Kidus Mesfin Teferi, independent researcher. Claude Code (Anthropic) was used to execute the study under
Kidus's direction; Kidus reviewed all code, results and text.
