#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$ROOT"

echo "=== [guard] python heredoc compile (in-memory) ==="
echo "[guard] repo=$ROOT"

python3 - <<'PY'
import re, subprocess, sys
from pathlib import Path

def git_ls_files_ops():
    try:
        out = subprocess.check_output(["git", "ls-files", "ops"], text=True)
    except Exception as e:
        print(f"[guard] ERR: git ls-files ops failed: {e}")
        return []
    return [ln.strip() for ln in out.splitlines() if ln.strip()]

files = git_ls_files_ops()
# Only scan shell scripts; skip obvious backups.
sh_files = [f for f in files if f.endswith(".sh") and ".bak." not in f]

print(f"[guard] tracked ops files={len(files)}  sh_files={len(sh_files)}")

# Match lines like:
#   python3 - <<'PY'
#   python3 -u - <<PY
pat = re.compile(r"python3\b.*<<\s*'?([A-Za-z_][A-Za-z0-9_]*)'?\s*$")

total_blocks = 0
bad = 0

for fp in sh_files:
    p = Path(fp)
    try:
        txt = p.read_text(errors="replace")
    except Exception as e:
        bad += 1
        print(f"[FAIL] {fp}: read failed: {e}")
        continue

    lines = txt.splitlines(True)
    i = 0
    while i < len(lines):
        m = pat.search(lines[i])
        if not m:
            i += 1
            continue

        delim = m.group(1)
        start_line_1based = i + 2

        # Find the delimiter line (exact match)
        j = i + 1
        end_idx = None
        while j < len(lines):
            if lines[j].rstrip("\n") == delim:
                end_idx = j
                break
            j += 1

        total_blocks += 1

        if end_idx is None:
            bad += 1
            print(f"[FAIL] {fp}:{i+1}: heredoc start found but end delimiter '{delim}' not found")
            i += 1
            continue

        code = "".join(lines[i+1:end_idx])
        tag = f"{fp}:{start_line_1based}-{end_idx}"

        try:
            compile(code, tag, "exec")
        except SyntaxError as e:
            bad += 1
            print(f"[FAIL] {tag}: SyntaxError: {e.msg} (line {e.lineno}, col {e.offset})")
            src = code.splitlines()
            ln = int(e.lineno or 1)
            lo = max(1, ln - 2)
            hi = min(len(src), ln + 2)
            for k in range(lo, hi + 1):
                prefix = ">>" if k == ln else "  "
                print(f"{prefix} {k:4d}: {src[k-1]}")
        except Exception as e:
            bad += 1
            print(f"[FAIL] {tag}: {type(e).__name__}: {e}")

        i = end_idx + 1

print(f"[guard] python heredoc blocks found = {total_blocks}")
if bad:
    print(f"[guard] FAIL blocks = {bad}")
    raise SystemExit(2)

print("[guard] OK")
PY
