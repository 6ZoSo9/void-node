#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROM_YML="/etc/prometheus/prometheus.yml"
DEST_DIR="/etc/prometheus"

RULE_SRC="$ROOT/ops/prometheus/void-header-txroot-hardlock.rules.yml"
ALRT_SRC="$ROOT/ops/prometheus/void-header-txroot-hardlock.alerts.yml"
RULE_DST="$DEST_DIR/void-header-txroot-hardlock.rules.yml"
ALRT_DST="$DEST_DIR/void-header-txroot-hardlock.alerts.yml"

PROM="${PROM:-http://127.0.0.1:9090}"

echo "=== [0] sanity ==="
test -f "$RULE_SRC"
test -f "$ALRT_SRC"
sudo test -f "$PROM_YML"
command -v python3 >/dev/null
command -v jq >/dev/null
command -v curl >/dev/null

echo
echo "=== [1] backup prometheus config (root tgz convention) ==="
ts="$(date +%Y%m%d-%H%M%S)"
sudo bash -lc "tar -czf /root/prometheus-config-OK.${ts}.tgz -C / etc/prometheus/prometheus.yml 2>/dev/null || true"
echo "[ok] /root/prometheus-config-OK.${ts}.tgz"

echo
echo "=== [2] install rule/alert files into /etc/prometheus ==="
sudo install -m 0644 "$RULE_SRC" "$RULE_DST"
sudo install -m 0644 "$ALRT_SRC" "$ALRT_DST"
echo "[ok] installed:"
sudo ls -l "$RULE_DST" "$ALRT_DST"

echo
echo "=== [3] ensure prometheus.yml rule_files includes them (idempotent) ==="
tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
sudo cat "$PROM_YML" > "$tmp"

python3 - <<'PY'
from pathlib import Path
import re, sys

p = Path("/tmp/prom-yml-edit.tmp")
src = Path("/tmp/prom-yml-edit.in")

text = src.read_text()

need = [
  "/etc/prometheus/void-header-txroot-hardlock.rules.yml",
  "/etc/prometheus/void-header-txroot-hardlock.alerts.yml",
]

def has(path: str) -> bool:
  return path in text

if all(has(x) for x in need):
  p.write_text(text)
  sys.exit(0)

lines = text.splitlines(True)

# find rule_files:
rf_i = None
for i, ln in enumerate(lines):
  if re.match(r'^\s*rule_files\s*:\s*$', ln):
    rf_i = i
    break

def indent_of(s: str) -> str:
  return re.match(r'^(\s*)', s).group(1)

out = lines[:]
if rf_i is None:
  out.append("\nrule_files:\n")
  rf_i = len(out) - 1

base_indent = indent_of(out[rf_i])
item_indent = base_indent + "  "

# Insert after rule_files: line, but keep existing list items intact
insert_at = rf_i + 1
to_add = []
for path in need:
  if path not in text:
    to_add.append(f"{item_indent}- {path}\n")

out[insert_at:insert_at] = to_add
p.write_text("".join(out))
PY

cp_in="$tmp"
cp_out="/tmp/prom-yml-edit.tmp"
sudo cp "$cp_in" /tmp/prom-yml-edit.in
sudo python3 -c "import shutil; shutil.copyfile('/tmp/prom-yml-edit.in','/tmp/prom-yml-edit.in')" >/dev/null 2>&1 || true
sudo python3 -c "import shutil; shutil.copyfile('/tmp/prom-yml-edit.in','/tmp/prom-yml-edit.in')" >/dev/null 2>&1 || true

# run the editor again on the real /tmp inputs
sudo python3 - <<'PY'
from pathlib import Path
import re, sys

src = Path("/tmp/prom-yml-edit.in")
dst = Path("/tmp/prom-yml-edit.tmp")

text = src.read_text()
need = [
  "/etc/prometheus/void-header-txroot-hardlock.rules.yml",
  "/etc/prometheus/void-header-txroot-hardlock.alerts.yml",
]

if all(x in text for x in need):
  dst.write_text(text); sys.exit(0)

lines = text.splitlines(True)

rf_i = None
for i, ln in enumerate(lines):
  if re.match(r'^\s*rule_files\s*:\s*$', ln):
    rf_i = i
    break

def indent_of(s: str) -> str:
  return re.match(r'^(\s*)', s).group(1)

out = lines[:]
if rf_i is None:
  out.append("\nrule_files:\n")
  rf_i = len(out) - 1

base_indent = indent_of(out[rf_i])
item_indent = base_indent + "  "
insert_at = rf_i + 1

to_add = []
for path in need:
  if path not in text:
    to_add.append(f"{item_indent}- {path}\n")

out[insert_at:insert_at] = to_add
dst.write_text("".join(out))
PY

sudo install -m 0644 /tmp/prom-yml-edit.tmp "$PROM_YML"

echo "[ok] rule_files entries now:"
sudo rg -n "void-header-txroot-hardlock\.(rules|alerts)\.yml" "$PROM_YML" || true

echo
echo "=== [4] promtool check + safe reload ==="
sudo promtool check config "$PROM_YML"
if [ -x /usr/local/bin/prom-safe-reload.sh ]; then
  sudo /usr/local/bin/prom-safe-reload.sh
else
  sudo systemctl reload prometheus
fi
echo "[ok] reloaded"

echo
echo "=== [5] health query (must all be non-null + ok/mounted=1) ==="
for q in \
  'void:header_txroot_hardlock:ok:last_5m' \
  'void:header_txroot_hardlock:mounted:last_5m' \
  'void:header_txroot_hardlock:version:last_5m' \
  'void:mainnet_lastmile:health_with_header_txroot_hardlock:last_5m'
do
  v="$(curl -fsS --max-time 2 "$PROM/api/v1/query" --data-urlencode "query=$q" \
    | jq -r '.data.result[0].value[1] // "null"' || echo null)"
  echo "$q = $v"
done

ok="$(curl -fsS --max-time 2 "$PROM/api/v1/query" --data-urlencode "query=void:header_txroot_hardlock:ok:last_5m" \
  | jq -r '.data.result[0].value[1] // "0"' || echo 0)"
mounted="$(curl -fsS --max-time 2 "$PROM/api/v1/query" --data-urlencode "query=void:header_txroot_hardlock:mounted:last_5m" \
  | jq -r '.data.result[0].value[1] // "0"' || echo 0)"
composite="$(curl -fsS --max-time 2 "$PROM/api/v1/query" --data-urlencode "query=void:mainnet_lastmile:health_with_header_txroot_hardlock:last_5m" \
  | jq -r '.data.result[0].value[1] // "0"' || echo 0)"

if [ "$ok" != "1" ] || [ "$mounted" != "1" ] || [ "$composite" != "1" ]; then
  echo "[FAIL] hardlock health not green"
  exit 2
fi

echo "[OK] hardlock prom rules loaded + healthy"
