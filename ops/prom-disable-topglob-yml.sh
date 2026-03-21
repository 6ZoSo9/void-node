#!/usr/bin/env bash
set -euo pipefail

echo "=== [0] require root ==="
if [[ "$(id -u)" != "0" ]]; then echo "[ERR] run as root"; exit 2; fi

SCRIPT="$(readlink -f "${BASH_SOURCE[0]}")"
REPO_DIR="$(cd "$(dirname "$SCRIPT")/.." && pwd)"
cd "$REPO_DIR" || { echo "[ERR] cannot cd repo dir"; exit 3; }

PROMYML="/etc/prometheus/prometheus.yml"
ACTIVE_RE='^\s*-\s*/etc/prometheus/\*\.yml\s*$'
DISABLED_TXT='DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml'

echo "=== [1] repo_dir ==="
echo "[repo] $REPO_DIR"

echo
echo "=== [2] snapshot (your convention, if present) ==="
if [[ -x "$REPO_DIR/ops/prom-snap.sh" ]]; then
  "$REPO_DIR/ops/prom-snap.sh"
else
  echo "[warn] missing $REPO_DIR/ops/prom-snap.sh (skipping snapshot)"
fi

echo
echo "=== [3] patch prometheus.yml (idempotent) ==="
python3 - <<'PY'
from pathlib import Path
import re, sys

p = Path("/etc/prometheus/prometheus.yml")
s = p.read_text(encoding="utf-8").splitlines(True)

active_re = re.compile(r'^\s*-\s*/etc/prometheus/\*\.yml\s*$')
disabled_txt = "DISABLED (caused duplicate alert/record names): - /etc/prometheus/*.yml"

# 1) If active glob exists, comment it out (replace line)
changed = False
out = []
for ln in s:
    if active_re.match(ln) and not ln.lstrip().startswith("#"):
        out.append("# " + disabled_txt + "\n")
        changed = True
    else:
        out.append(ln)
s = out

# 2) Ensure the disabled comment exists under rule_files: even if glob already removed
if not any(disabled_txt in ln for ln in s):
    # find rule_files: block start
    i_rule = None
    for i, ln in enumerate(s):
        if re.match(r'^\s*rule_files\s*:\s*$', ln):
            i_rule = i
            break

    if i_rule is not None:
        # insert right after rule_files: line
        indent = re.match(r'^(\s*)', s[i_rule]).group(1)
        insert_line = indent + "  # " + disabled_txt + "\n"
        s.insert(i_rule + 1, insert_line)
        changed = True
    else:
        # if no rule_files: found, just append at end (still OK)
        s.append("\n# " + disabled_txt + "\n")
        changed = True

if changed:
    p.write_text("".join(s), encoding="utf-8")
    print("[ok] patched prometheus.yml (disabled glob and/or inserted proof comment)")
else:
    print("[ok] no changes needed")

PY

echo
echo "=== [4] proof (active glob should be empty; disabled comment should exist) ==="
echo "--- active matches (should be empty) ---"
rg -n "^[[:space:]]*-[[:space:]]*/etc/prometheus/\\*\\.yml[[:space:]]*$" "$PROMYML" || true
echo "--- disabled matches (should exist) ---"
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
