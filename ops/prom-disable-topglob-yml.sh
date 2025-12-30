#!/usr/bin/env bash
set -euo pipefail

echo "=== [0] require root ==="
if [[ "$(id -u)" != "0" ]]; then echo "[ERR] run as root"; exit 2; fi

# Resolve repo root relative to this script (works under sudo where $HOME=/root)
SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
REPO_DIR="$(cd "$(dirname "$SCRIPT")/.." && pwd)"

PROMYML="/etc/prometheus/prometheus.yml"
ACTIVE_RE='^\s*-\s*/etc/prometheus/\*\.yml\s*$'
DISABLED_TXT='DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml'
DISABLED_LINE="# ${DISABLED_TXT}\n"

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
echo "=== [3] patch prometheus.yml (idempotent: disable if active; OK if already disabled/absent) ==="
python3 - <<'PY'
from pathlib import Path
import re, sys

p = Path("/etc/prometheus/prometheus.yml")
s = p.read_text(encoding="utf-8").splitlines(True)

active_re = re.compile(r'^\s*-\s*/etc/prometheus/\*\.yml\s*$')
disabled_txt = "DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml"

# If an active line exists, replace it with the disabled comment.
changed = False
out = []
for ln in s:
    if active_re.match(ln) and not ln.lstrip().startswith("#"):
        out.append("# " + disabled_txt + "\n")
        changed = True
    else:
        out.append(ln)

if changed:
    p.write_text("".join(out), encoding="utf-8")
    print("[ok] disabled active line: - /etc/prometheus/*.yml")
    sys.exit(0)

# No active line: treat as OK if (a) already disabled comment exists, or (b) the line is absent.
already = any(disabled_txt in ln for ln in s)
if already:
    print("[ok] already disabled (comment present)")
    sys.exit(0)

# No active line and no disabled comment: still OK if the target line is simply absent.
# (We don't want to fail; just report.)
print("[ok] target line not present (nothing to disable)")
sys.exit(0)
PY

echo
echo "=== [4] proof (show any active + disabled matches) ==="
echo "--- active matches (should be empty) ---"
rg -n "^[[:space:]]*-[[:space:]]*/etc/prometheus/\\*\\.yml[[:space:]]*$" "$PROMYML" || true
echo "--- disabled matches ---"
rg -n --fixed-strings "$DISABLED_TXT" "$PROMYML" || true

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
