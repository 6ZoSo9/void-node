#!/usr/bin/env bash
set -euo pipefail

UNIT="${1:-}"
[ -n "$UNIT" ] || { echo "usage: $0 <unit>"; exit 2; }

if systemctl --user is-active --quiet "$UNIT"; then
  echo "[FAIL] $UNIT is active. Stop it first to avoid EADDRINUSE:"
  echo "  systemctl --user stop $UNIT"
  exit 2
fi

ENVLINE="$(systemctl --user show "$UNIT" -p Environment --value)"

# Convert systemd Environment (space-separated, with quotes) into KEY=VAL lines.
TS="$(date +%Y%m%d-%H%M%S)"
EF="/tmp/${UNIT}.env.$TS"
python3 - "$EF" "$ENVLINE" <<'PY'
import sys, shlex
ef=sys.argv[1]; envline=sys.argv[2]
parts=shlex.split(envline)
with open(ef,"w",encoding="utf-8") as f:
  for p in parts:
    if "=" in p:
      f.write(p+"\n")
print("[ok] wrote", ef, "vars=", len([p for p in parts if "=" in p]))
PY

# Run with env - NOT sourcing - so NODE_OPTIONS is treated as a value, not a command.
cd "$HOME/dev/void-node"
exec env $(tr "\n" " " <"$EF") /usr/bin/env bash -lc 'cd "$HOME/dev/void-node" && exec npx --yes tsx src/index.ts'
