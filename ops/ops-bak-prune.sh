#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT"

PRUNE="${PRUNE:-0}"          # set PRUNE=1 to actually delete
KEEP="${KEEP:-20}"           # keep newest N per directory
MAX_SHOW="${MAX_SHOW:-60}"   # cap output

echo "=== [ops bak prune] repo=$ROOT ==="
echo "PRUNE=$PRUNE KEEP=$KEEP"

# Find backup-ish files under ops/
mapfile -t F < <(find ops -type f \( -name '*.bak.*' -o -name '*~' \) 2>/dev/null | sort || true)

echo "[info] found backups: ${#F[@]}"
if [ "${#F[@]}" -eq 0 ]; then
  exit 0
fi

echo
echo "=== [largest (top 20)] ==="
# show sizes without flooding
(du -b "${F[@]}" 2>/dev/null || du -h "${F[@]}" 2>/dev/null) \
  | sort -nr 2>/dev/null | head -n 20 || true

echo
echo "=== [per-dir keep newest $KEEP] ==="
# Group by directory and delete older ones only if PRUNE=1
python3 - <<'PY'
import os, sys, time
from collections import defaultdict

prune = os.environ.get("PRUNE","0") == "1"
keep = int(os.environ.get("KEEP","20"))

# read file list from find again to avoid argv limits
import subprocess
out = subprocess.check_output(["bash","-lc","find ops -type f \\( -name '*.bak.*' -o -name '*~' \\) 2>/dev/null"], text=True)
paths = [p for p in out.splitlines() if p.strip()]

bydir = defaultdict(list)
for p in paths:
    try:
        st = os.stat(p)
    except FileNotFoundError:
        continue
    bydir[os.path.dirname(p)].append((st.st_mtime, p))

total_del = 0
total_keep = 0
to_delete = []

for d, items in bydir.items():
    items.sort(reverse=True)  # newest first
    keep_items = items[:keep]
    del_items = items[keep:]
    total_keep += len(keep_items)
    total_del += len(del_items)
    for _, p in del_items:
        to_delete.append(p)

print(f"[plan] dirs={len(bydir)} keep_total={total_keep} delete_total={total_del}")

# show a capped preview
preview = to_delete[:60]
for p in preview:
    print("[delete]" if prune else "[would-delete]", p)
if len(to_delete) > len(preview):
    print(f"... ({len(to_delete)-len(preview)} more)")

if prune:
    for p in to_delete:
        try:
            os.remove(p)
        except FileNotFoundError:
            pass
    print("[done] deleted old backups")
PY

if [ "$PRUNE" = "1" ]; then
  echo
  echo "=== [post] remaining backups count ==="
  find ops -type f \( -name '*.bak.*' -o -name '*~' \) | wc -l || true
else
  echo
  echo "[dry-run] No files deleted. To actually prune: PRUNE=1 KEEP=20 ./ops/ops-bak-prune.sh"
fi
