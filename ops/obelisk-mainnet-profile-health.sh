#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

PROFILE_PATH="${PROFILE_PATH:-config/obelisk-mainnet-profile.dev.json}"

echo "=== [obelisk-profile-health] VOID Obelisk mainnet profile health ==="
echo "[cfg] PROFILE_PATH = $PROFILE_PATH"
echo

if [[ ! -f "$PROFILE_PATH" ]]; then
  echo "[ERROR] Profile file not found: $PROFILE_PATH" >&2
  exit 1
fi

CHAIN_ID=$(jq -r '.chainId // "null"' "$PROFILE_PATH" 2>/dev/null || echo "null")
NAME=$(jq -r '.name // "unknown"' "$PROFILE_PATH" 2>/dev/null || echo "unknown")
NETWORK=$(jq -r '.network // "unknown"' "$PROFILE_PATH" 2>/dev/null || echo "unknown")

echo "=== [0] profile summary ==="
echo "name      : $NAME"
echo "network   : $NETWORK"
echo "chainId   : $CHAIN_ID"
echo

echo "=== [1] RPC head.txt checks ==="
jq -r '.rpcs[] | [.role, (.label // ""), .url] | @tsv' "$PROFILE_PATH" \
  | while IFS=$'\t' read -r ROLE LABEL URL; do
      LABEL_STR="${LABEL:-}"
      [[ -n "$LABEL_STR" ]] && LABEL_STR=" ($LABEL_STR)"
      echo
      echo "[rpc:$ROLE] url=$URL$LABEL_STR"
      if ! curl -fsS --max-time 2 "$URL/head.txt" >/tmp/obelisk-profile-head.txt 2>/dev/null; then
        echo "  head.txt : ERROR (no response or non-200)"
        continue
      fi
      HEAD_VAL=$(tr -d '\r' </tmp/obelisk-profile-head.txt)
      if [[ "$HEAD_VAL" =~ ^[0-9]+$ ]]; then
        echo "  head.txt : OK (head=$HEAD_VAL)"
      else
        echo "  head.txt : WARN (non-numeric response: '$HEAD_VAL')"
      fi
    done

echo
echo "=== [2] txroot3 health checks (if endpoints defined) ==="
TX_MAIN=$(jq -r '.endpoints.health.txroot3_main // empty' "$PROFILE_PATH" 2>/dev/null || echo "")
TX_SAFE=$(jq -r '.endpoints.health.txroot3_safeboot // empty' "$PROFILE_PATH" 2>/dev/null || echo "")

if [[ -n "$TX_MAIN" ]]; then
  echo
  echo "[health:txroot3_main] $TX_MAIN"
  if curl -fsS --max-time 2 "$TX_MAIN" >/tmp/obelisk-profile-txroot-main.prom 2>/dev/null; then
    echo "  status   : OK (200)"
    grep -E '^void_txroot_health ' /tmp/obelisk-profile-txroot-main.prom || echo "  note     : void_txroot_health not found in response"
  else
    echo "  status   : ERROR (no response or non-200)"
  fi
else
  echo "[health:txroot3_main] not defined in profile"
fi

if [[ -n "$TX_SAFE" ]]; then
  echo
  echo "[health:txroot3_safeboot] $TX_SAFE"
  if curl -fsS --max-time 2 "$TX_SAFE" >/tmp/obelisk-profile-txroot-safe.prom 2>/dev/null; then
    echo "  status   : OK (200)"
    grep -E '^void_txroot_health ' /tmp/obelisk-profile-txroot-safe.prom || echo "  note     : void_txroot_health not found in response"
  else
    echo "  status   : ERROR (no response or non-200)"
  fi
else
  echo "[health:txroot3_safeboot] not defined in profile"
fi

echo
echo "=== [done] obelisk profile health ==="
