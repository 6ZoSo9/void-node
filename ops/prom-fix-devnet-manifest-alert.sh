#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"
NODE_METRICS="${NODE_METRICS:-http://127.0.0.1:9100/metrics}"
F="${F:-/etc/prometheus/alerts/void-devnet-manifest.yml}"
ALERT="${ALERT:-VoidDevnetManifestExpiringSoon}"

# Use a single-quoted bash string so we can safely include Prom label quotes.
NEW_EXPR=${NEW_EXPR:-'last_over_time(void_update_manifest_devnet_days_left{chain="devnet",chainId="2050"}[10m]) < 7'}

echo "=== [0] precheck: node_exporter metric ==="
curl -fsS "$NODE_METRICS" | rg -n 'void_update_manifest_devnet_days_left\{chain="devnet",chainId="2050"\}' || true

echo
echo "=== [1] precheck: Prom current value ==="
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=void_update_manifest_devnet_days_left{chain="devnet",chainId="2050"}' \
  | (command -v jq >/dev/null 2>&1 && jq -c '.data.result' || head -c 2000; echo)

echo
echo "=== [2] patch rule file (backup + edit) ==="
sudo test -f "$F"
ts="$(date +%Y%m%d-%H%M%S)"
sudo cp -a "$F" "$F.bak.$ts"
echo "[bak] $F.bak.$ts"

# Patch the alert block expr safely (handles expr: one-liner or expr: | multiline)
sudo env F="$F" ALERT="$ALERT" NEW_EXPR="$NEW_EXPR" python3 - <<'PY'
import os, re, pathlib

path = pathlib.Path(os.environ["F"])
alert = os.environ["ALERT"]
new_expr = os.environ["NEW_EXPR"]

lines = path.read_text().splitlines(True)

# Find "- alert: <name>" line
alert_re = re.compile(r'^(\s*)-\s*alert:\s*' + re.escape(alert) + r'\s*$')
expr_re  = re.compile(r'^(\s*)expr:\s*(.*)$')

i_alert = None
indent_alert = None
for i, ln in enumerate(lines):
    m = alert_re.match(ln)
    if m:
        i_alert = i
        indent_alert = m.group(1)
        break

if i_alert is None:
    raise SystemExit(f"[ERR] alert not found: {alert}")

# Scan forward to find expr within this alert block (stop if next '- alert:' at same indent)
i_expr = None
indent_expr = None
for j in range(i_alert + 1, len(lines)):
    # next alert at same indent ends the block
    if alert_re.match(lines[j]):
        break
    m = expr_re.match(lines[j])
    if m:
        i_expr = j
        indent_expr = m.group(1)
        break

if i_expr is None:
    raise SystemExit(f"[ERR] expr: not found inside alert block: {alert}")

# Replace expr line; if it was a block expr (expr: | / >), skip the indented block lines
old = lines[i_expr]
lines[i_expr] = f"{indent_expr}expr: {new_expr}\n"

# If old expr was multiline indicator, drop subsequent more-indented lines
if old.strip().endswith("|") or old.strip().endswith(">"):
    k = i_expr + 1
    # remove lines that are more indented than expr line (continuation block)
    while k < len(lines):
        if lines[k].strip() == "":
            # blank lines inside block are still part of block; keep consuming
            k += 1
            continue
        if len(lines[k]) - len(lines[k].lstrip(" ")) <= len(indent_expr):
            break
        lines[k] = ""  # delete by blanking
        k += 1
    lines = [x for x in lines if x != ""]

path.write_text("".join(lines))
print("[ok] patched", path)
print("[new expr]", new_expr)
PY

echo
echo "=== [3] promtool check + reload ==="
sudo promtool check rules "$F"
sudo promtool check config /etc/prometheus/prometheus.yml

# reload (requires --web.enable-lifecycle which you already have)
curl -fsS -X POST "$PROM/-/reload" >/dev/null && echo "[ok] reloaded"

echo
echo "=== [4] verify: expr value + alert not firing ==="
echo "--- prom query (expr) ---"
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode "query=last_over_time(void_update_manifest_devnet_days_left{chain=\"devnet\",chainId=\"2050\"}[10m])" \
  | (command -v jq >/dev/null 2>&1 && jq -c '.data.result' || head -c 2000; echo)

echo
echo "--- alert status (should be empty) ---"
curl -fsS "$PROM/api/v1/alerts" \
  | (command -v jq >/dev/null 2>&1 && jq -r '.data.alerts[]? | select(.labels.alertname=="'"$ALERT"'") | .state' || cat)

echo "=== DONE ==="
