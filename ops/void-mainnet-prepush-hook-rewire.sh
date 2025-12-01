#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

HOOK=".git/hooks/pre-push"
BACKUP=".git/hooks/pre-push.bak-$(date +%Y%m%d-%H%M%S)"

echo "=== [pre-push-hook-rewire] ensuring .git/hooks/pre-push delegates to ops/pre-push.sh ==="

mkdir -p .git/hooks

if [ -f "$HOOK" ]; then
  if grep -q 'ops/pre-push.sh' "$HOOK"; then
    echo "[pre-push-hook-rewire] existing hook already delegates to ops/pre-push.sh; nothing to do."
  else
    echo "[pre-push-hook-rewire] backing up existing hook to: $BACKUP"
    cp "$HOOK" "$BACKUP"
    echo "[pre-push-hook-rewire] overwriting hook with delegator."
    cat > "$HOOK" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"
exec ./ops/pre-push.sh "$@"
SH
    chmod +x "$HOOK"
  fi
else
  echo "[pre-push-hook-rewire] no existing hook; creating delegator."
  cat > "$HOOK" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"
exec ./ops/pre-push.sh "$@"
SH
  chmod +x "$HOOK"
fi

echo
echo "=== [pre-push-hook-rewire] smoke: running ops/pre-push.sh directly ==="
./ops/pre-push.sh || {
  echo "[pre-push-hook-rewire] ERROR: ops/pre-push.sh failed; see logs above."
  exit 1
}

echo
echo "=== [pre-push-hook-rewire] ops/pre-push.sh exit status: 0 ==="
echo "[pre-push-hook-rewire] gate OK; git push will now be hard-gated."
echo "=== [pre-push-hook-rewire] done ==="
