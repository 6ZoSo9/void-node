#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node" || exit 1

TS="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/void-chainlatch-fix-bindloops-v2.$TS.out.txt"
exec > >(tee -a "$OUT") 2>&1
echo "[saved] $OUT"
echo

echo "=== [0] stop services ==="
systemctl --user stop void-proposer.service void-node@bootstrap-1.service void-node.service 2>/dev/null || true
sleep 1
echo "[ok] stopped (best-effort)"
echo

echo "=== [1] backup index.ts ==="
cp -a src/index.ts "src/index.ts.bak.$TS"
echo "[bak] src/index.ts.bak.$TS"
echo

echo "=== [2] patch chain-latch loops robustly (brace-parse, not exact string match) ==="
python3 - <<'PY'
from pathlib import Path
import sys

p = Path("src/index.ts")
s = p.read_text(errors="replace")

def find_after(hay: str, needle: str, start: int) -> int:
    i = hay.find(needle, start)
    if i < 0:
        raise ValueError(f"needle not found: {needle}")
    return i

def find_block_span(hay: str, func_kw: str, start: int = 0) -> tuple[int,int]:
    """
    Find span [i0, i1) for a function block starting at 'function <name>'.
    Uses brace counting from first '{' after the keyword.
    """
    i0 = hay.find(func_kw, start)
    if i0 < 0:
        return (-1, -1)
    lb = hay.find("{", i0)
    if lb < 0:
        return (-1, -1)
    depth = 0
    i = lb
    while i < len(hay):
        c = hay[i]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                # include trailing newline if present
                j = i + 1
                if j < len(hay) and hay[j] == "\n":
                    j += 1
                return (i0, j)
        i += 1
    return (-1, -1)

def already_patched(block: str) -> bool:
    return ("let ok = false" in block) and ("if (!ok) setTimeout" in block)

def replace_in_section(hay: str, section_anchor: str, func_sig: str, new_block: str) -> tuple[str, int, bool]:
    sec = hay.find(section_anchor)
    if sec < 0:
        raise ValueError(f"section anchor not found: {section_anchor}")

    i0, i1 = find_block_span(hay, func_sig, start=sec)
    if i0 < 0:
        raise ValueError(f"function block not found after anchor: {func_sig}")

    old = hay[i0:i1]
    if already_patched(old):
        return (hay, 0, True)

    # Preserve indentation of the original "function ..." line
    line_start = hay.rfind("\n", 0, i0) + 1
    indent = ""
    k = line_start
    while k < len(hay) and hay[k] in (" ", "\t"):
        indent += hay[k]
        k += 1
    nb = "\n".join((indent + ln if ln else ln) for ln in new_block.splitlines()) + "\n"
    out = hay[:i0] + nb + hay[i1:]
    return (out, 1, False)

new_healLoop = """function healLoop(){
  let ok = false;
  try { ok = !!bindOnce(); } catch {}
  if (!ok) setTimeout(healLoop, TICK);
}"""

new_heal = """function heal(){
  let ok = false;
  try { ok = !!bindOuterMost(); } catch {}
  if (!ok) setTimeout(heal, TICK);
}"""

changed = 0

# V1 block: anchor just before it, function name healLoop
s, c1, ap1 = replace_in_section(
    s,
    "SaveBlockChainLatchV1()",
    "function healLoop()",
    new_healLoop
)
changed += c1

# V1.1 block: anchor is the comment line, function name heal
s, c2, ap2 = replace_in_section(
    s,
    "SaveBlockChainLatchV1.1",
    "function heal()",
    new_heal
)
changed += c2

p.write_text(s)
print(f"[ok] chain-latch patch applied: changed={changed} (already_patched: v1={ap1}, v1.1={ap2})")
PY
echo

echo "=== [3] show patched context ==="
# these windows should include both functions even if line numbers drift a bit
rg -n 'SaveBlockChainLatchV1\(\)|function healLoop\(\)|SaveBlockChainLatchV1\.1|function heal\(\)' src/index.ts | tail -n 40 || true
echo
nl -ba src/index.ts | sed -n '23370,23415p' || true
echo
nl -ba src/index.ts | sed -n '23505,23535p' || true
echo

echo "=== [4] restart node ONLY (leave proposer off) ==="
systemctl --user daemon-reload || true
systemctl --user restart void-node.service
sleep 2
systemctl --user status void-node.service --no-pager || true
echo

echo "=== [5] verify chain-latch spam is gone (should be ~2 lines total since restart) ==="
journalctl --user-unit void-node.service --since "2 min ago" --no-pager -o cat \
  | rg -n 'chain-latch' \
  | tail -n 80 || true
echo

echo "=== [6] quick health ==="
curl -fsS --connect-timeout 1 --max-time 2 http://127.0.0.1:4100/api/health || true
echo
curl -fsS --connect-timeout 1 --max-time 2 http://127.0.0.1:4100/head.txt || true
echo

echo "=== [7] start proposer ==="
systemctl --user restart void-proposer.service
sleep 1
systemctl --user status void-proposer.service --no-pager || true
echo

echo "=== [8] confirm no rebind loop after proposer starts ==="
journalctl --user-unit void-node.service --since "2 min ago" --no-pager -o cat \
  | rg -n 'chain-latch' \
  | tail -n 120 || true
echo

echo "=== [done] ==="
