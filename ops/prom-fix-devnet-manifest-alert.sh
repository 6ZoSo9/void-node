#!/usr/bin/env bash
set -euo pipefail

PROM="${PROM:-http://127.0.0.1:9090}"
NODE_METRICS="${NODE_METRICS:-http://127.0.0.1:9100/metrics}"
F="/etc/prometheus/alerts/void-devnet-manifest.yml"
ALERT="VoidDevnetManifestExpiringSoon"
NEW_EXPR='last_over_time(void_update_manifest_devnet_days_left{chain="devnet",chainId="2050"}[10m]) < 7'

echo "=== [0] precheck: current node_exporter metric ==="
curl -fsS "$NODE_METRICS" | rg -n "void_update_manifest_devnet_days_left\{chain=\"devnet\",chainId=\"2050\"\}" || true

echo
echo "=== [1] show current prom value (source of truth) ==="
curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=void_update_manifest_devnet_days_left{chain="devnet",chainId="2050"}' \
  | (command -v jq >/dev/null 2>&1 && jq -c '.data.result' || head -c 2000; echo)

echo
echo "=== [2] patch $F (backup + edit) ==="
sudo test -f "$F"
ts="$(date +%Y%m%d-%H%M%S)"
sudo cp -a "$F" "$F.bak.$ts"
echo "[bak] $F.bak.$ts"

sudo python3 - <<PY
import re, pathlib

path = pathlib.Path("$F")
alert = "$ALERT"
new_expr = "$NEW_EXPR"

s = path.read_text()
lines = s.splitlines(True)

# Locate "- alert: <name>"
pat = re.compile(r'^(\s*)-\s*alert:\s*' + re.escape(alert) + r'\s*$', re.M)
m = pat.search(s)
if not m:
    raise SystemExit(f"[ERR] alert not found: {alert}")

base_indent = m.group(1)
start_line = s[:m.start()].count("\n")
i = start_line

# Find block end: next "- alert:" at same indent
j = i + 1
next_pat = re.compile(r'^' + re.escape(base_indent) + r'-\s*alert:\s*\S+', re.M)
while j < len(lines):
    if next_pat.match(lines[j]):
        break
    j += 1

block = lines[i:j]

# Replace expr stanza inside block (supports expr: <one-liner> and expr: | multiline)
out = []
k = 0
replaced = False
while k < len(block):
    ln = block[k]
    mexpr = re.match(r'^(\s*)expr:\s*(.*)\s*$', ln)
    if mexpr and not replaced:
        indent = mexpr.group(1)
        rest = mexpr.group(2)
        # If multiline (expr: |), skip following indented lines
        if rest.strip() == "|" or rest.strip() == "|-":
            k += 1
            while k < len(block) and (block[k].startswith(indent + "  ") or block[k].strip() == ""):
                k += 1
        else:
            k += 1
        out.append(f"{indent}expr: {new_expr}\n")
        replaced = True
        continue
    out.append(ln)
    k += 1

if not replaced:
    # Insert expr right after alert line if none existed (shouldn't happen, but safe)
    out2 = []
    inserted = False
    for ln in block:
        out2.append(ln)
        if re.match(r'^' + re.escape(base_indent) + r'-\s*alert:\s*' + re.escape(alert) + r'\s*$', ln.strip("\n")) and not inserted:
            out2.append(base_indent + "  " + f"expr: {new_expr}\n")
            inserted = True
    out = out2

new_block = out
new_lines = lines[:i] + new_block + lines[j:]
path.write_text("".join(new_lines))
print("[ok] patched", path)
print("[new expr]", new_expr)
PY

echo
echo "=== [3] promtool check + reload ==="
sudo promtool check rules "$F"
sudo promtool check config /etc/prometheus/prometheus.yml

if [ -x /usr/local/bin/prom-safe-reload.sh ]; then
  sudo /usr/local/bin/prom-safe-reload.sh
else
  sudo systemctl reload prometheus
fi

echo
echo "=== [4] verify: alert not present + expr value sane ==="
curl -fsS "$PROM/api/v1/alerts" \
  | (command -v jq >/dev/null 2>&1 && jq -r '.data.alerts[]? | select(.labels.alertname=="'"$ALERT"'") | .state' || cat)

curl -fsS --get "$PROM/api/v1/query" \
  --data-urlencode 'query=last_over_time(void_update_manifest_devnet_days_left{chain="devnet",chainId="2050"}[10m])' \
  | (command -v jq >/dev/null 2>&1 && jq -c '.data.result' || head -c 2000; echo)

echo "=== DONE ==="
