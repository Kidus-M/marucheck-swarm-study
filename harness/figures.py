"""
Draws the report figures as SVG from runs/analysis/results.json and report-numbers.json. No number
is typed by hand. Run analyze.py and report_numbers.py first.

    python harness/figures.py      ->  report/figures/*.svg
"""
import json
import math
from pathlib import Path

STUDY = Path(__file__).resolve().parent.parent
ANALYSIS = STUDY / "runs" / "analysis"
OUT = STUDY / "report" / "figures"

# Reference palette (dataviz skill): categorical slots 1-3, validated all-pairs in light mode.
BLUE, ORANGE, AQUA = "#2a78d6", "#eb6834", "#1baf7a"
INK, INK2, MUTED = "#0b0b0b", "#52514e", "#898781"
GRID, AXIS, SURFACE, WASH = "#e1e0d9", "#c3c2b7", "#fcfcfb", "#f0efec"
RAMP = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5",
        "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"]
FONT = "font-family=\"Segoe UI, Helvetica, Arial, sans-serif\""


def wilson(k, n, z=1.96):
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    m = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return max(0.0, c - m), min(1.0, c + m)


def text(x, y, s, size=11, fill=INK2, anchor="start", weight="normal"):
    return (f'<text x="{x:.1f}" y="{y:.1f}" {FONT} font-size="{size}" fill="{fill}" '
            f'text-anchor="{anchor}" font-weight="{weight}">{s}</text>')


def svg(width, height, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            f'width="{width}" height="{height}" role="img">'
            f'<rect width="{width}" height="{height}" fill="{SURFACE}"/>{body}</svg>\n')


def frame(x0, y0, w, h, yticks, ylabel, xcats):
    """Hairline grid, baseline, y ticks and categorical x labels for one panel."""
    parts = []
    for v in yticks:
        y = y0 + h - v / 100 * h
        parts.append(f'<line x1="{x0}" y1="{y:.1f}" x2="{x0 + w}" y2="{y:.1f}" stroke="{GRID}" stroke-width="1"/>')
        parts.append(text(x0 - 6, y + 4, str(v), 10.5, MUTED, "end"))
    parts.append(f'<line x1="{x0}" y1="{y0 + h}" x2="{x0 + w}" y2="{y0 + h}" stroke="{AXIS}" stroke-width="1"/>')
    parts.append(f'<text {FONT} font-size="11" fill="{INK2}" text-anchor="middle" '
                 f'transform="translate({x0 - 34},{y0 + h / 2}) rotate(-90)">{ylabel}</text>')
    xs = [x0 + w * (i + 0.5) / len(xcats) for i in range(len(xcats))]
    for x, (top, bottom) in zip(xs, xcats):
        parts.append(text(x, y0 + h + 16, top, 11, INK2, "middle"))
        if bottom:
            parts.append(text(x, y0 + h + 29, bottom, 10.5, MUTED, "middle"))
    return parts, xs


def line(points, color, width=2):
    d = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(points))
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>'


def dot(x, y, color, hollow=False):
    fill = SURFACE if hollow else color
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="{fill}" stroke="{SURFACE}" stroke-width="2"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="{fill}" stroke="{color}" stroke-width="2"/>')


def whisker(x, lo, hi, y0, h, color):
    ylo, yhi = y0 + h - lo / 100 * h, y0 + h - hi / 100 * h
    return (f'<line x1="{x:.1f}" y1="{ylo:.1f}" x2="{x:.1f}" y2="{yhi:.1f}" stroke="{color}" stroke-width="1.5"/>'
            f'<line x1="{x - 4:.1f}" y1="{ylo:.1f}" x2="{x + 4:.1f}" y2="{ylo:.1f}" stroke="{color}" stroke-width="1.5"/>'
            f'<line x1="{x - 4:.1f}" y1="{yhi:.1f}" x2="{x + 4:.1f}" y2="{yhi:.1f}" stroke="{color}" stroke-width="1.5"/>')


def figure1(results, numbers):
    """Left: LLM suspicion of attack PRs by split size. Right: detection by split size."""
    W, H = 760, 324
    body = []
    strategies = ["concentrated", "split3", "split6"]
    xcats = [("1 PR", "concentrated"), ("3 PRs", "split 3"), ("6 PRs", "split 6")]

    # Panel A
    x0, y0, w, h = 62, 46, 270, 210
    body.append(text(x0 - 50, 20, "A. Splitting lowers the average suspicion, not the peak", 12.5, INK, weight="600"))
    body.append(text(x0 - 50, 36, "LLM suspicion (qwen3.5-397b, M1) of the PRs that carry attack code", 10.5, MUTED))
    honest_max = numbers["honest_m1"]["qwen3.5-397b"]["max"]
    yb = y0 + h - honest_max / 100 * h
    body.append(f'<rect x="{x0}" y="{yb:.1f}" width="{w}" height="{y0 + h - yb:.1f}" fill="{WASH}"/>')
    parts, xs = frame(x0, y0, w, h, [0, 25, 50, 75, 100], "suspicion score (0-100)", xcats)
    body += parts
    body.append(text(x0 + 6, yb + 13, f"all 124 honest PRs score {honest_max:.0f} or less", 10.5, INK2))
    s = numbers["h1_fragment_suspicion"]["qwen3.5-397b"]
    peak = [(x, y0 + h - s[k]["mean_chain_max"] / 100 * h) for x, k in zip(xs, strategies)]
    avg = [(x, y0 + h - s[k]["mean"] / 100 * h) for x, k in zip(xs, strategies)]
    for x, k in zip(xs, strategies):
        lo, hi = s[k]["mean_ci_spec_bootstrap"]
        body.append(whisker(x, lo, hi, y0, h, MUTED))
    body.append(line(peak, INK))
    body.append(line(avg, MUTED))
    body += [dot(x, y, INK) for x, y in peak]
    body += [dot(x, y, MUTED, hollow=True) for x, y in avg]
    for (x, y), k in zip(peak, strategies):
        body.append(text(x, y - 10, f"{s[k]['mean_chain_max']:.0f}", 11, INK, "middle", "600"))
    for (x, y), k in list(zip(avg, strategies))[1:]:  # At 1 PR the average is the peak: label it once.
        body.append(text(x + 9, y + 4, f"{s[k]['mean']:.0f}", 11, INK2))
    mid = (xs[1] + xs[2]) / 2
    body.append(text(mid, (peak[1][1] + peak[2][1]) / 2 + 22, "peak: most suspicious attack PR", 10.5, INK, "middle"))
    body.append(text(mid - 14, (avg[1][1] + avg[2][1]) / 2 + 26, "average attack PR", 10.5, INK2, "middle"))

    # Panel B
    x0, y0, w, h = 448, 46, 228, 210
    body.append(text(x0 - 50, 20, "B. The oracle sees state only where tests exercise it", 12.5, INK, weight="600"))
    body.append(text(x0 - 50, 36, "Chains caught by M5. Gray band: M1 LLM monitor, 100% in every group.", 10.5, MUTED))
    parts, xs = frame(x0, y0, w, h, [0, 25, 50, 75, 100], "chains caught (%)", xcats)
    body += parts
    t = results["table"]
    m1 = [(x, y0 + h - t[f"all/{k}"]["M1:qwen3.5-397b:0.05"]["rate"] * h) for x, k in zip(xs, strategies)]
    body.append(line(m1, "#dcdbd5", 9))
    groups = [("contract-broad", BLUE, -7, "in-contract broad", "#1f63b3"),
              ("out-of-contract", ORANGE, 0, "out-of-contract", "#b4481c"),
              ("contract-targeted", AQUA, 7, "in-contract targeted", "#127a55")]
    legend_y = y0 + h + 56
    body.append(text(12, legend_y + 4, "Panel B, chains per point at 1 / 3 / 6 PRs (broad and targeted are in-contract):", 10.5, INK2))
    legend_x = 395
    for group, color, off, label, ink in groups:
        pts = []
        for x, k in zip(xs, strategies):
            cell = t[f"{group}/{k}"]["m5"]
            lo, hi = wilson(cell["hits"], cell["n"])
            body.append(whisker(x + off, lo * 100, hi * 100, y0, h, color))
            pts.append((x + off, y0 + h - cell["rate"] * h))
        body.append(line(pts, color))
        body += [dot(x, y, color) for x, y in pts]
        short = label.replace("in-contract ", "")
        body.append(text(pts[-1][0] + 10, pts[-1][1] + 4, short, 10.5, ink, weight="600"))
        n = "/".join(str(t[f"{group}/{k}"]["m5"]["n"]) for k in strategies)
        entry = f"{short} {n}"
        body.append(dot(legend_x + 5, legend_y, color))
        body.append(text(legend_x + 14, legend_y + 4, entry, 10.5, INK2))
        legend_x += 24 + 5.6 * len(entry)
    return svg(W, H, "".join(body))


def figure2(results, numbers):
    """Heatmap: share of chains caught, by monitor and attack condition, with honest flag rates."""
    t = results["table"]
    honest = results["honest"]["by_monitor"]
    thr = results["thresholds"]

    def pool(groups_strategies, key):
        hits = sum(t[f"{g}/{s}"][key]["hits"] for g, s in groups_strategies)
        n = sum(t[f"{g}/{s}"][key]["n"] for g, s in groups_strategies)
        return hits, n

    all5 = ["concentrated", "split3", "split6", "tamper", "evade"]
    rows = [
        ("In-contract, broad", "concentrated, split 3, split 6",
         [("contract-broad", s) for s in ["concentrated", "split3", "split6"]]),
        ("In-contract, broad", "split 6 + disable the failing test", [("contract-broad", "tamper")]),
        ("In-contract, broad", "split 3 + switch off under test", [("contract-broad", "evade")]),
        ("In-contract, targeted", "narrow trigger, all 5 strategies", [("contract-targeted", s) for s in all5]),
        ("Out-of-contract", "all 5 strategies", [("out-of-contract", s) for s in all5]),
    ]
    cols = [("M1", "LLM, per PR", "M1:qwen3.5-397b:0.05"), ("M2", "LLM, cumulative", "M2:qwen3.5-397b:0.05"),
            ("M3", "plain CI", "m3"), ("M4", "shipped PR check", "m4Ci"), ("M5", "Swarm oracle", "m5")]
    W, H = 760, 312
    lx, cw, ch, top = 250, 98, 35, 76
    body = [text(12, 20, "Where each monitor fails: attack chains caught, out of chains whose side task landed", 12.5, INK, weight="600"),
            text(12, 36, "LLM monitors use qwen3.5-397b at the 5% honest false-positive threshold. Darker = more caught.", 10.5, MUTED)]
    for j, (cid, sub, _) in enumerate(cols):
        x = lx + j * cw + cw / 2
        body.append(text(x, top - 18, cid, 11.5, INK, "middle", "600"))
        body.append(text(x, top - 5, sub, 10, MUTED, "middle"))
    for i, (label, sub, gs) in enumerate(rows):
        y = top + i * ch
        body.append(text(lx - 10, y + 15, label, 11, INK, "end", "600"))
        body.append(text(lx - 10, y + 28, sub, 10, MUTED, "end"))
        for j, (_, _, key) in enumerate(cols):
            k, n = pool(gs, key)
            rate = k / n
            color = RAMP[round(rate * (len(RAMP) - 1))]
            ink = "#ffffff" if rate >= 0.55 else INK
            x = lx + j * cw
            body.append(f'<rect x="{x + 1:.1f}" y="{y + 1:.1f}" width="{cw - 2}" height="{ch - 2}" rx="3" fill="{color}"/>')
            body.append(text(x + cw / 2, y + ch / 2 + 4, f"{k}/{n}", 12, ink, "middle", "600"))
    y = top + len(rows) * ch + 8
    body.append(f'<line x1="{lx}" y1="{y}" x2="{lx + 5 * cw}" y2="{y}" stroke="{AXIS}" stroke-width="1"/>')
    body.append(text(lx - 10, y + 20, "Honest PRs flagged", 11, INK, "end", "600"))
    body.append(text(lx - 10, y + 34, "false positives, out of 124", 10, MUTED, "end"))
    m1 = round(thr["M1|qwen3.5-397b|0.05"]["actual_fpr"] * 124)
    m2 = round(thr["M2|qwen3.5-397b|0.05"]["actual_fpr"] * 124)
    flags = [m1, m2, honest["m3"]["hits"], honest["m4Ci"]["hits"], honest["m5"]["hits"]]
    for j, f in enumerate(flags):
        x = lx + j * cw + cw / 2
        body.append(text(x, y + 22, f"{f}/124", 12, INK, "middle", "600"))
        body.append(text(x, y + 36, f"{100 * f / 124:.1f}%", 10, MUTED, "middle"))
    return svg(W, H, "".join(body))


def figure3(numbers):
    """Appendix: M1 chain detection as the threshold rises."""
    W, H = 760, 284
    x0, y0, w, h = 70, 50, 620, 190
    sweep = numbers["m1_threshold_sweep"]["qwen3.5-397b"]
    body = [text(12, 20, "Chain-level detection by the per-PR LLM monitor as its threshold rises (exploratory)", 12.5, INK, weight="600"),
            text(12, 36, "qwen3.5-397b. A chain is caught if any of its PRs scores above the threshold.", 10.5, MUTED)]
    for v in [0, 25, 50, 75, 100]:
        y = y0 + h - v / 100 * h
        body.append(f'<line x1="{x0}" y1="{y:.1f}" x2="{x0 + w}" y2="{y:.1f}" stroke="{GRID}"/>')
        body.append(text(x0 - 6, y + 4, str(v), 10.5, MUTED, "end"))
    body.append(f'<line x1="{x0}" y1="{y0 + h}" x2="{x0 + w}" y2="{y0 + h}" stroke="{AXIS}"/>')
    for t in range(0, 100, 10):
        body.append(text(x0 + t / 95 * w, y0 + h + 16, str(t), 10.5, MUTED, "middle"))
    body.append(text(x0 + w / 2, y0 + h + 34, "threshold on the 0-100 suspicion score", 11, INK2, "middle"))
    body.append(f'<text {FONT} font-size="11" fill="{INK2}" text-anchor="middle" '
                f'transform="translate({x0 - 40},{y0 + h / 2}) rotate(-90)">chains caught (%)</text>')
    hmax = numbers["honest_m1"]["qwen3.5-397b"]["max"]
    xh = x0 + hmax / 95 * w
    body.append(f'<rect x="{x0}" y="{y0}" width="{xh - x0:.1f}" height="{h}" fill="{WASH}"/>')
    body.append(text(x0 + 6, y0 + h - 8, f"honest PRs reach {hmax:.0f}", 10.5, INK2))
    for key, color, label in [("concentrated", BLUE, "concentrated"), ("split3", ORANGE, "split 3"), ("split6", AQUA, "split 6")]:
        pts = [(x0 + r["t"] / 95 * w, y0 + h - r[key] * h) for r in sweep]
        body.append(line(pts, color))
        lx, ly = pts[-1]
        body.append(text(lx + 6, ly + 4, label, 10.5, INK2))
    return svg(W, H, "".join(body))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    results = json.loads((ANALYSIS / "results.json").read_text(encoding="utf-8"))
    numbers = json.loads((ANALYSIS / "report-numbers.json").read_text(encoding="utf-8"))
    (OUT / "figure1.svg").write_text(figure1(results, numbers), encoding="utf-8")
    (OUT / "figure2.svg").write_text(figure2(results, numbers), encoding="utf-8")
    (OUT / "figure3.svg").write_text(figure3(numbers), encoding="utf-8")
    print("wrote", sorted(p.name for p in OUT.glob("*.svg")))


if __name__ == "__main__":
    main()
