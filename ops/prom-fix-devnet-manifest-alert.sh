#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"
NODE_METRICS="${NODE_METRICS:-http://127.0.0.1:9100/metrics}"
F="${F:-/etc/prometheus/alerts/void-devnet-manifest.yml}"
ALERT="${ALERT:-VoidDevnetManifestExpiringSoon}"

# Default expr (no surrounding quotes; safe, because we pass via env).
DEFAULT_EXPR='last_over_time(void_update_manifest_devnet_days_left{chain="devnet",chainId="2050"}[10m]) < 7'
NEW_EXPR="${NEW_EXPR:-$DEFAULT_EXPR}"

# Prefer rg, fall back to grep.
_rg() { command -v rg >/dev/null 2>&1 && rg "$@" || grep -E "$@" ; }

echo "=== [0] precheck: node_exporter metric ==="
curl -fsS "$NODE_METRICS" | _rg -n 'void_update_manifest_devnet_days_left\{chain="devnet",chainId="2050"\}' || true

echo
echo "=== [1] precheck: Prom current value ==="
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=void_update_manifest_devnet_days_left{chain="devnet",chainId="2050"}' \
  | (command -v jq >/dev/null 2>&1 && jq -c '.data.result' || head -c 2000; echo)

echo
echo "=== [2] patch rule file (idempotent; only writes if needed) ==="
sudo test -f "$F"

sudo env F="$F" ALERT="$ALERT" NEW_EXPR="$NEW_EXPR" python3 - <<'PY'
import os, re, pathlib, datetime

path = pathlib.Path(os.environ["F"])
alert = os.environ["ALERT"]
new_expr = os.environ["NEW_EXPR"].strip()

text = path.read_text()
lines = text.splitlines(True)

# Helpers
def indent_len(s: str) -> int:
    return len(s) - len(s.lstrip(" "))

alert_re = re.compile(r'^(\s*)-\s*alert:\s*' + re.escape(alert) + r'\s*$', re.M)
expr_re  = re.compile(r'^(\s*)expr:\s*(.*)$')

# Find the alert start line
i_alert = None
alert_indent = None
for i, ln in enumerate(lines):
    m = alert_re.match(ln)
    if m:
        i_alert = i
        alert_indent = m.group(1)
        break

if i_alert is None:
    raise SystemExit(f"[ERR] alert not found: {alert}")

# Find the end of this alert block (next "- alert:" at same indent)
i_end = len(lines)
for j in range(i_alert + 1, len(lines)):
    m = alert_re.match(lines[j])
    if m and m.group(1) == alert_indent:
        i_end = j
        break

# Find expr line within [i_alert, i_end)
i_expr = None
expr_indent = None
expr_tail = None
for j in range(i_alert + 1, i_end):
    m = expr_re.match(lines[j])
    if m:
        i_expr = j
        expr_indent = m.group(1)
        expr_tail = m.group(2).rstrip("\n")
        break

if i_expr is None:
    raise SystemExit(f"[ERR] expr: not found inside alert block: {alert}")

# Read existing expr content (supports one-liner or expr: | / > blocks)
old_expr_content = ""
old_is_block = False

tail = (expr_tail or "").strip()
if tail in ("|", ">"):
    old_is_block = True
    k = i_expr + 1
    chunks = []
    while k < i_end:
        ln = lines[k]
        if ln.strip() == "":
            chunks.append("")
            k += 1
            continue
        if indent_len(ln) <= indent_len(expr_indent):
            break
        # Remove the common "block indent" (expr_indent + 2 spaces is typical)
        chunks.append(ln.strip("\n").lstrip(" "))
        k += 1
    old_expr_content = "\n".join([c.rstrip() for c in chunks]).strip()
    i_expr_block_end = k
else:
    old_expr_content = tail.strip()
    i_expr_block_end = i_expr + 1

# Normalize for comparison
def norm(s: str) -> str:
    return re.sub(r'\s+', ' ', s.strip())

if norm(old_expr_content) == norm(new_expr):
    print(f"[noop] {path} already has desired expr for {alert}")
    print("[expr]", old_expr_content)
    raise SystemExit(0)

# Build replacement: always write as expr: | block (avoids YAML quoting issues)
expr_line = f"{expr_indent}expr: |\n"
expr_body = f"{expr_indent}  {new_expr}\n"

# Create a backup before writing
ts = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
bak = path.with_name(path.name + f".bak.{ts}")
bak.write_text(text)

# Splice: replace expr stanza (expr line + any old block) with new block
new_lines = []
new_lines.extend(lines[:i_expr])
new_lines.append(expr_line)
new_lines.append(expr_body)
new_lines.extend(lines[i_expr_block_end:])

path.write_text("".join(new_lines))

print("[ok] patched", str(path))
print("[bak]", str(bak))
print("[old expr]", old_expr_content)
print("[new expr]", new_expr)
PY

echo
echo "=== [3] promtool check + reload ==="
sudo promtool check rules "$F"
sudo promtool check config /etc/prometheus/prometheus.yml
curl -fsS -X POST "$PROM/-/reload" >/dev/null && echo "[ok] reloaded"

echo
echo "=== [4] verify: expr value + alert not firing ==="
echo "--- prom query (expr) ---"
# Query the same expression we intend to use (quoted safely for URL encoding)
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode "query=last_over_time(void_update_manifest_devnet_days_left{chain=\"devnet\",chainId=\"2050\"}[10m])" \
  | (command -v jq >/dev/null 2>&1 && jq -c '.data.result' || head -c 2000; echo)

echo
echo "--- alert status (should be empty) ---"
curl -fsS "$PROM/api/v1/alerts" \
  | (command -v jq >/dev/null 2>&1 && jq -r '.data.alerts[]? | select(.labels.alertname=="'"$ALERT"'") | .state' || cat)

echo "=== DONE ==="
