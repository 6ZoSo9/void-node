#!/usr/bin/env bash
set -euo pipefail

echo "=== [0] require root ==="
if [[ "$(id -u)" != "0" ]]; then echo "[ERR] run as root"; exit 2; fi

# Resolve repo root relative to this script (works under sudo where $HOME=/root)
SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
REPO_DIR="$(cd "$(dirname "$SCRIPT")/.." && pwd)"

PROMYML="/etc/prometheus/prometheus.yml"
LINE='- /etc/prometheus/*.yml'
MARK='# DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml'

echo "=== [1] repo_dir ==="
echo "[repo] $REPO_DIR"
cd "$REPO_DIR" || { echo "[ERR] cannot cd repo dir"; exit 3; }

echo
echo "=== [2] snapshot (your convention, if present) ==="
if [[ -x "$REPO_DIR/ops/prom-snap.sh" ]]; then
  "$REPO_DIR/ops/prom-snap.sh"
else
  echo "[warn] missing $REPO_DIR/ops/prom-snap.sh (skipping snapshot)"
fi

echo
echo "=== [3] patch prometheus.yml (idempotent) ==="
if rg -n --fixed-strings "$MARK" "$PROMYML" >/dev/null 2>&1; then
  echo "[ok] already disabled"
else
  python3 - <<'PY'
from pathlib import Path
import re

p = Path("/etc/prometheus/prometheus.yml")
s = p.read_text(encoding="utf-8").splitlines(True)

target = r'^\s*-\s*/etc/prometheus/\*\.yml\s*$'
mark   = '# DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml\n'

out = []
changed = False
for ln in s:
    if re.match(target, ln) and not ln.lstrip().startswith("#"):
        out.append(mark)
        changed = True
    else:
        out.append(ln)

if not changed:
    raise SystemExit("[ERR] did not find an active line to disable: - /etc/prometheus/*.yml")

p.write_text("".join(out), encoding="utf-8")
print("[ok] disabled: /etc/prometheus/*.yml")
PY
fi

echo
echo "=== [4] proof line present ==="
rg -n --fixed-strings "DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml" "$PROMYML" || true

echo
echo "=== [5] promtool check ==="
promtool check config "$PROMYML"

echo
echo "=== [6] optional dupe-name guard ==="
if [[ -x /usr/local/bin/prom-guard-no-duplicate-rule-names.sh ]]; then
  /usr/local/bin/prom-guard-no-duplicate-rule-names.sh >/dev/null
  echo "[ok] guard pass"
else
  echo "[info] guard missing: /usr/local/bin/prom-guard-no-duplicate-rule-names.sh"
fi

echo
echo "=== [7] reload prometheus (safe) ==="
if [[ -x /usr/local/bin/prom-safe-reload.sh ]]; then
  /usr/local/bin/prom-safe-reload.sh
else
  systemctl reload prometheus
fi

echo
echo "=== [8] ready ==="
curl -fsS http://127.0.0.1:9090/-/ready >/dev/null && echo "[ok] prom ready"

echo "=== DONE ==="
