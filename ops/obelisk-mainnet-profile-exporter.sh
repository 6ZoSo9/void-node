#!/usr/bin/env bash
set -euo pipefail

# VOID Obelisk mainnet profile Prometheus exporter
#
# Purpose:
#   - Read config/obelisk-mainnet-profile.dev.json
#   - Probe main + safeboot RPCs for /head.txt and /health/txroot3
#   - Emit a Prometheus textfile with a single health gauge + a few diagnostics.
#
# This is PLAN-agnostic and wallet-focused: "is this profile safe to ship to Obelisk?"

REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
cd "$REPO_ROOT"

PROFILE_PATH="${PROFILE_PATH:-config/obelisk-mainnet-profile.dev.json}"
OUT_PATH="${OUT_PATH:-/var/lib/node_exporter/textfile_collector/void_obelisk_profile.prom}"

EXPECTED_CHAINID="${EXPECTED_CHAINID:-2050}"
NODE_EXPORTER_USER="${NODE_EXPORTER_USER:-node_exporter}"

fix_perms() {
  local path="$1"
  if id "$NODE_EXPORTER_USER" >/dev/null 2>&1; then
    sudo chown "$NODE_EXPORTER_USER":"$NODE_EXPORTER_USER" "$path" || true
  fi
  sudo chmod 0644 "$path" || true
}

echo "[obelisk-exporter] repo root: $REPO_ROOT"
echo "[obelisk-exporter] profile   : $PROFILE_PATH"
echo "[obelisk-exporter] out path  : $OUT_PATH"

if ! command -v jq >/dev/null 2>&1; then
  echo "[obelisk-exporter] FATAL: jq not found" >&2
  exit 1
fi

if [ ! -f "$PROFILE_PATH" ]; then
  echo "[obelisk-exporter] WARN: profile not found, writing health=0 stub"
  TMP=$(mktemp)
  cat >"$TMP" <<EOF
# HELP void_obelisk_profile_health Overall health of the Obelisk mainnet profile (1=ok,0=bad)
# TYPE void_obelisk_profile_health gauge
void_obelisk_profile_health 0
# HELP void_obelisk_profile_chainid ChainId from Obelisk profile (0 if missing)
# TYPE void_obelisk_profile_chainid gauge
void_obelisk_profile_chainid 0
# HELP void_obelisk_profile_expected_chainid Expected chainId for VOID mainnet
# TYPE void_obelisk_profile_expected_chainid gauge
void_obelisk_profile_expected_chainid $EXPECTED_CHAINID
# HELP void_obelisk_profile_head_main Latest head.txt from main RPC (0 if unreachable)
# TYPE void_obelisk_profile_head_main gauge
void_obelisk_profile_head_main 0
# HELP void_obelisk_profile_head_safeboot Latest head.txt from safeboot RPC (0 if unreachable)
# TYPE void_obelisk_profile_head_safeboot gauge
void_obelisk_profile_head_safeboot 0
# HELP void_obelisk_profile_txroot_main_ok Is main txroot3 health == 1 (1=yes,0=no/unknown)
# TYPE void_obelisk_profile_txroot_main_ok gauge
void_obelisk_profile_txroot_main_ok 0
# HELP void_obelisk_profile_txroot_safeboot_ok Is safeboot txroot3 health == 1 (1=yes,0=no/unknown)
# TYPE void_obelisk_profile_txroot_safeboot_ok gauge
void_obelisk_profile_txroot_safeboot_ok 0
EOF
  sudo mv "$TMP" "$OUT_PATH"
  fix_perms "$OUT_PATH"
  exit 0
fi

PROFILE_JSON=$(cat "$PROFILE_PATH")

profile_name=$(printf '%s\n' "$PROFILE_JSON" | jq -r '.name // "unknown"')
profile_network=$(printf '%s\n' "$PROFILE_JSON" | jq -r '.network // "unknown"')
profile_chainid=$(printf '%s\n' "$PROFILE_JSON" | jq -r '.chainId // 0')

echo "[obelisk-exporter] profile name    : $profile_name"
echo "[obelisk-exporter] profile network : $profile_network"
echo "[obelisk-exporter] profile chainId : $profile_chainid"

# Extract RPC URLs by role
main_url=$(printf '%s\n' "$PROFILE_JSON" | jq -r '.rpcs[]? | select(.role=="main") | .url // empty' | head -n1)
safe_url=$(printf '%s\n' "$PROFILE_JSON" | jq -r '.rpcs[]? | select(.role=="safeboot") | .url // empty' | head -n1)

echo "[obelisk-exporter] main RPC    : ${main_url:-<none>}"
echo "[obelisk-exporter] safeboot RPC: ${safe_url:-<none>}"

/usr/bin/test -n "${main_url:-}" || echo "[obelisk-exporter] WARN: main RPC missing from profile"

health=1

if [ "$profile_chainid" -ne "$EXPECTED_CHAINID" ]; then
  echo "[obelisk-exporter] WARN: chainId mismatch (profile=$profile_chainid, expected=$EXPECTED_CHAINID)"
  health=0
fi

probe_head() {
  local url="$1"
  if [ -z "$url" ]; then
    echo 0
    return 1
  fi
  if ! out=$(curl -fsS "$url/head.txt" 2>/dev/null); then
    echo 0
    return 1
  fi
  local n
  n=$(printf '%s\n' "$out" | tr -d '\r\n ' || true)
  if [[ "$n" =~ ^[0-9]+$ ]]; then
    echo "$n"
    return 0
  else
    echo 0
    return 1
  fi
}

probe_txroot_ok() {
  local url="$1"
  if [ -z "$url" ]; then
    echo 0
    return 1
  fi
  if ! out=$(curl -fsS "$url/health/txroot3?format=prom" 2>/dev/null); then
    echo 0
    return 1
  fi
  local v
  v=$(printf '%s\n' "$out" | awk '/^void_txroot_health /{print $2}' | head -n1)
  if [ "$v" = "1" ]; then
    echo 1
    return 0
  fi
  echo 0
  return 1
}

head_main=$(probe_head "$main_url" || true)
head_safe=$(probe_head "$safe_url" || true)

if [ "${head_main:-0}" -eq 0 ]; then
  echo "[obelisk-exporter] WARN: main RPC head.txt not healthy"
  health=0
fi

if [ "${head_safe:-0}" -eq 0 ]; then
  echo "[obelisk-exporter] INFO: safeboot RPC head.txt not healthy or not configured"
fi

txroot_main_ok=$(probe_txroot_ok "$main_url" || true)
txroot_safe_ok=$(probe_txroot_ok "$safe_url" || true)

if [ "${txroot_main_ok:-0}" -ne 1 ]; then
  echo "[obelisk-exporter] WARN: main txroot3 health != 1"
  health=0
fi

if [ -n "${safe_url:-}" ] && [ "${txroot_safe_ok:-0}" -ne 1 ]; then
  echo "[obelisk-exporter] WARN: safeboot txroot3 health != 1"
  health=0
fi

TMP=$(mktemp)

cat >"$TMP" <<EOF
# HELP void_obelisk_profile_health Overall health of the Obelisk mainnet profile (1=ok,0=bad)
# TYPE void_obelisk_profile_health gauge
void_obelisk_profile_health $health
# HELP void_obelisk_profile_chainid ChainId from Obelisk profile (0 if missing)
# TYPE void_obelisk_profile_chainid gauge
void_obelisk_profile_chainid $profile_chainid
# HELP void_obelisk_profile_expected_chainid Expected chainId for VOID mainnet
# TYPE void_obelisk_profile_expected_chainid gauge
void_obelisk_profile_expected_chainid $EXPECTED_CHAINID
# HELP void_obelisk_profile_head_main Latest head.txt from main RPC (0 if unreachable)
# TYPE void_obelisk_profile_head_main gauge
void_obelisk_profile_head_main ${head_main:-0}
# HELP void_obelisk_profile_head_safeboot Latest head.txt from safeboot RPC (0 if unreachable)
# TYPE void_obelisk_profile_head_safeboot gauge
void_obelisk_profile_head_safeboot ${head_safe:-0}
# HELP void_obelisk_profile_txroot_main_ok Is main txroot3 health == 1 (1=yes,0=no/unknown)
# TYPE void_obelisk_profile_txroot_main_ok gauge
void_obelisk_profile_txroot_main_ok ${txroot_main_ok:-0}
# HELP void_obelisk_profile_txroot_safeboot_ok Is safeboot txroot3 health == 1 (1=yes,0=no/unknown)
# TYPE void_obelisk_profile_txroot_safeboot_ok gauge
void_obelisk_profile_txroot_safeboot_ok ${txroot_safe_ok:-0}
EOF

echo "[obelisk-exporter] writing Prometheus textfile to $OUT_PATH (sudo mv + chown/chmod)"
sudo mv "$TMP" "$OUT_PATH"
fix_perms "$OUT_PATH"

echo "[obelisk-exporter] done (health=$health)"
