"""
Builds report/report.pdf from report/report.html. Fills the appendix tables from the analysis files
(only between the <!-- tableN:start/end --> markers, so the prose can be edited freely), checks the
abstract length, prints the PDF with headless Chrome, and reports the page count.

    python harness/build_report.py
"""
import json
import re
import subprocess
import tempfile
from pathlib import Path

STUDY = Path(__file__).resolve().parent.parent
REPORT = STUDY / "report"
HTML = REPORT / "report.html"
PDF = REPORT / "report.pdf"
ANALYSIS = STUDY / "runs" / "analysis"
CHROME = Path("C:/Program Files/Google/Chrome/Application/chrome.exe")
GROUPS = [("all", "All"), ("contract-broad", "In-contract broad"),
          ("contract-targeted", "In-contract targeted"), ("out-of-contract", "Out-of-contract")]
STRATEGIES = [("concentrated", "concentrated"), ("split3", "split 3"), ("split6", "split 6"),
              ("tamper", "tamper"), ("evade", "evade")]
COLS = ["M1:qwen3.5-397b:0.05", "M1:gemma-4-31b-it:0.05", "M2:qwen3.5-397b:0.05", "M2:gemma-4-31b-it:0.05",
        "m3", "m4Ci", "m4Local", "m5", "M6:qwen3.5-397b:0.05"]


def table2(results):
    rows = []
    for group, glabel in GROUPS:
        for strategy, slabel in STRATEGIES:
            cell = results["table"][f"{group}/{strategy}"]
            n = cell["m5"]["n"]
            values = "".join(f'<td class="num">{cell[c]["hits"]}</td>' for c in COLS)
            style = ' style="font-weight:700"' if group == "all" else ""
            rows.append(f'<tr{style}><td>{glabel}, {slabel}</td><td class="num">{n}</td>{values}</tr>')
    return "".join(rows)


def table3(results, numbers):
    thr = results["thresholds"]
    honest = results["honest"]["by_monitor"]
    rows = []
    for monitor, label in [("M1", "M1, per PR"), ("M2", "M2, cumulative")]:
        for model, short in [("qwen3.5-397b", "qwen"), ("gemma-4-31b-it", "gemma")]:
            a, b = thr[f"{monitor}|{model}|0.02"], thr[f"{monitor}|{model}|0.05"]
            flagged = round(b["actual_fpr"] * b["n"])
            rows.append(f'<tr><td>{label} ({short})</td><td class="num">&gt; {a["threshold"]:g} / &gt; {b["threshold"]:g}</td>'
                        f'<td class="num">{flagged} ({100 * flagged / b["n"]:.1f}%)</td></tr>')
    for key, label in [("m3", "M3, plain CI"), ("m4Ci", "M4, shipped PR check"),
                       ("m4Local", "M4 local, verify --diff"), ("m5", "M5, Swarm oracle")]:
        h = honest[key]
        rows.append(f'<tr><td>{label}</td><td class="num">binary</td>'
                    f'<td class="num">{h["hits"]} ({100 * h["hits"] / h["n"]:.1f}%)</td></tr>')
    for model, short in [("qwen3.5-397b", "qwen"), ("gemma-4-31b-it", "gemma")]:
        m6 = numbers["m6_honest"][model]
        rows.append(f'<tr><td>M6, M5 or M2 ({short})</td><td class="num">as M2</td>'
                    f'<td class="num">{m6["m6_flags"]} ({100 * m6["m6_flags"] / m6["honest_prs_matched"]:.1f}%)</td></tr>')
    return "".join(rows)


def fill(html, name, content):
    pattern = re.compile(rf"(<!-- {name}:start -->).*?(<!-- {name}:end -->)", re.S)
    if not pattern.search(html):
        raise SystemExit(f"marker {name} not found in report.html")
    return pattern.sub(lambda m: m.group(1) + content + m.group(2), html)


def main():
    results = json.loads((ANALYSIS / "results.json").read_text(encoding="utf-8"))
    numbers = json.loads((ANALYSIS / "report-numbers.json").read_text(encoding="utf-8"))
    html = HTML.read_text(encoding="utf-8")
    html = fill(html, "table2", table2(results))
    html = fill(html, "table3", table3(results, numbers))
    HTML.write_text(html, encoding="utf-8")

    abstract = re.search(r'<div class="abstract">(.*?)</div>', html, re.S).group(1)
    words = len(re.sub(r"<[^>]+>", " ", abstract).split())
    print(f"abstract: {words} words ({'ok' if 150 <= words <= 250 else 'OUT OF RANGE 150-250'})")
    todos = re.findall(r'class="todo">(.*?)</span>', html)
    print(f"placeholders left: {len(todos)}: " + "; ".join(re.sub(r"<[^>]+>", "", t) for t in todos))

    print_pdf(HTML.resolve().as_uri(), PDF)
    print(f"wrote {PDF.relative_to(STUDY)}: {pages(PDF)} pages")

    # The page cap counts the body before references and appendices; measure it on a copy without them.
    with tempfile.TemporaryDirectory() as tmp:
        body = html[: html.index("<h2>References</h2>")] + "</body></html>"
        body = body.replace("<head>", f'<head><base href="{REPORT.resolve().as_uri()}/">', 1)
        path = Path(tmp) / "body.html"
        path.write_text(body, encoding="utf-8")
        print_pdf(path.as_uri(), Path(tmp) / "body.pdf")
        print(f"pages before references (title page included): {pages(Path(tmp) / 'body.pdf')} of 8 allowed")


def pages(pdf):
    return len(re.findall(rb"/Type\s*/Page[^s]", pdf.read_bytes()))


def print_pdf(url, out):
    """Headless Chrome with a throwaway profile, so the user's own Chrome profile is never touched."""
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run([str(CHROME), "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        "--no-first-run", "--disable-extensions", f"--user-data-dir={profile}",
                        "--virtual-time-budget=15000", f"--print-to-pdf={out}", url],
                       check=True, capture_output=True)


if __name__ == "__main__":
    main()
