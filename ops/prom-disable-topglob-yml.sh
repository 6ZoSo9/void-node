#!/usr/bin/env bash
set -euo pipefail

echo "=== [0] require root ==="
if [[ "$(id -u)" != "0" ]]; then echo "[ERR] run as root"; exit 2; fi

PROMYML="/etc/prometheus/prometheus.yml"
LINE='- /etc/prometheus/*.yml'
MARK='# DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml'

echo "=== [1] snapshot (your convention) ==="
cd "$HOME/dev/void-node" || exit 1
./ops/prom-snap.sh

echo
echo "=== [2] patch prometheus.yml (idempotent) ==="
if rg -n --fixed-strings "$MARK" "$PROMYML" >/dev/null 2>&1; then
  echo "[ok] already disabled"
else
  # only disable the exact rule_files entry (not other contexts)
  # replace a line that is exactly '  - /etc/prometheus/*.yml' or '\t- ...' with the marked comment
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
        out.append(re.sub(target, mark.rstrip("\n"), ln).rstrip("\n") + "\n")
        changed = True
    else:
        out.append(ln)

if not changed:
    raise SystemExit("[ERR] did not find an active line to disable: - /etc/prometheus/*.yml")

p.write_text("".join(out), encoding="utf-8")
print("[ok] disabled:", "/etc/prometheus/*.yml")
PY
fi

echo
echo "=== [3] proof line present ==="
rg -n --fixed-strings "DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml" "$PROMYML" || true

echo
echo "=== [4] promtool check ==="
promtool check config "$PROMYML"

echo
echo "=== [5] optional dupe-name guard ==="
if [[ -x /usr/local/bin/prom-guard-no-duplicate-rule-names.sh ]]; then
  /usr/local/bin/prom-guard-no-duplicate-rule-names.sh >/dev/null
  echo "[ok] guard pass"
else
  echo "[info] guard missing: /usr/local/bin/prom-guard-no-duplicate-rule-names.sh"
fi

echo
echo "=== [6] reload prometheus (safe) ==="
if [[ -x /usr/local/bin/prom-safe-reload.sh ]]; then
  /usr/local/bin/prom-safe-reload.sh
else
  systemctl reload prometheus
fi

echo
echo "=== [7] ready ==="
curl -fsS http://127.0.0.1:9090/-/ready >/dev/null && echo "[ok] prom ready"

echo "=== DONE ==="
