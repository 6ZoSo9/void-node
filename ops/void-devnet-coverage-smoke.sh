# SCHEMAFIX_v1: state entries may be string OR {address}
#!/usr/bin/env bash
set -euo pipefail

# --- COVERAGE_ADDRS_V2: prefer docs state contracts.*.address ---
void_state_addr_v2() {
  local name="$1"
  local st="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"
  jq -r --arg k "$name" '
    (
      .contracts[$k].address //
      .contracts[$k] //
      .[$k].address //
      .[$k] //
      empty
    ) | tostring
  ' "$st" 2>/dev/null | head -n1
}
# --- end COVERAGE_ADDRS_V2 ---


# --- devnet-state-shim-v2: supports docs/VOID-DEVNET-PROTOCOL-STATE.json contracts.*.address ---
STATE="${STATE:-docs/VOID-DEVNET-PROTOCOL-STATE.json}"

# --- COVERAGE_ADDRS_V2 shim ---
if [ -z "${JOBQ:-}" ] || [ "${JOBQ:-}" = "null" ] || [[ "${JOBQ:-}" =~ ^0x0+$ ]]; then
  JOBQ="$(void_state_addr_v2 JobQueue | tr -d '[:space:]')"
fi
if [ -z "${RR:-}" ] || [ "${RR:-}" = "null" ] || [[ "${RR:-}" =~ ^0x0+$ ]]; then
  RR="$(void_state_addr_v2 ReceiptRegistry | tr -d '[:space:]')"
fi
# --- end shim ---


void_addr_v2() {
  local name="$1"
  local st="${STATE}"
  if [ ! -f "$st" ]; then
    echo ""
    return 0
  fi

  local v
  v="$(jq -r --arg k "$name" '
    (
      .contracts[$k].address //
      .contracts[$k] //
      .[$k].address //
      .[$k] //
      empty
    ) | tostring
  ' "$st" 2>/dev/null || true)"

  if [ -z "$v" ] || [ "$v" = "null" ] || [ "$v" = "NULL" ]; then
    echo ""
    return 0
  fi
  if ! [[ "$v" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo ""
    return 0
  fi
  if [[ "$v" =~ ^0x0+$ ]]; then
    echo ""
    return 0
  fi
  echo "$v"
}
# --- end devnet-state-shim-v2 ---


echo "[coverage-smoke] repo=$(pwd)"

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
STATE="${STATE:-$(pwd)/docs/VOID-DEVNET-PROTOCOL-STATE.json}"

echo "[coverage-smoke] rpc_url=$RPC_URL"
echo "[coverage-smoke] state=$STATE"

if [[ ! -f "$STATE" ]]; then
  echo "[coverage-smoke] ERROR: state file not found: $STATE" >&2
  exit 1
fi

JOBQUEUE=$(jq -r '(.JobQueue | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
RECEIPTS=$(jq -r '(.ReceiptRegistry | (if type=="object" then (.address // empty) elif type=="string" then . else empty end))' "$STATE")
# --- COVERAGE_EFFECTIVE_ADDRS_V4B: normalize legacy vars to effective vars ---
# Prefer effective vars if present (JOBQ/RR), otherwise fall back to state JSON (contracts.*.address).
if [ -z "${STATE:-}" ]; then STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"; fi

# Prefer JOBQ/RR if already computed by newer shims.
if [ -n "${JOBQ:-}" ] && [ "${JOBQ:-}" != "null" ] && ! [[ "${JOBQ:-}" =~ ^0x0+$ ]]; then
  JOBQUEUE="$JOBQ"
fi
if [ -n "${RR:-}" ] && [ "${RR:-}" != "null" ] && ! [[ "${RR:-}" =~ ^0x0+$ ]]; then
  RECEIPTS="$RR"
fi

# If still empty, pull from .contracts.*
if [ -z "${JOBQUEUE:-}" ] || [ "${JOBQUEUE:-}" = "null" ] || [[ "${JOBQUEUE:-}" =~ ^0x0+$ ]]; then
  JOBQUEUE="$(jq -r '(.contracts.JobQueue.address // empty) | tostring' "$STATE" 2>/dev/null | head -n1 | tr -d "[:space:]")"
fi
if [ -z "${RECEIPTS:-}" ] || [ "${RECEIPTS:-}" = "null" ] || [[ "${RECEIPTS:-}" =~ ^0x0+$ ]]; then
  RECEIPTS="$(jq -r '(.contracts.ReceiptRegistry.address // empty) | tostring' "$STATE" 2>/dev/null | head -n1 | tr -d "[:space:]")"
fi
# --- end COVERAGE_EFFECTIVE_ADDRS_V4B ---
# --- COVERAGE_ADDRS_V3 shim (post-assign override) ---
if [ -z "${STATE:-}" ]; then STATE="docs/VOID-DEVNET-PROTOCOL-STATE.json"; fi

if [ -z "${JOBQ:-}" ] || [ "${JOBQ:-}" = "null" ] || [[ "${JOBQ:-}" =~ ^0x0+$ ]]; then
  JOBQ="$(jq -r '
    (.contracts.JobQueue.address // .contracts.JobQueue // empty) | tostring
  ' "$STATE" 2>/dev/null | head -n1 | tr -d '[:space:]' || true)"
fi

if [ -z "${RR:-}" ] || [ "${RR:-}" = "null" ] || [[ "${RR:-}" =~ ^0x0+$ ]]; then
  RR="$(jq -r '
    (.contracts.ReceiptRegistry.address // .contracts.ReceiptRegistry // empty) | tostring
  ' "$STATE" 2>/dev/null | head -n1 | tr -d '[:space:]' || true)"
fi
# --- end COVERAGE_ADDRS_V3 shim ---


echo "[coverage-smoke] JobQueue=${JOBQ:-$JOBQUEUE}"  # COVERAGE_PRINT_V1
echo "[coverage-smoke] ReceiptRegistry=${RR:-$RECEIPTS}"  # COVERAGE_PRINT_V1
if [[ "$JOBQUEUE" == "null" || -z "$JOBQUEUE" ]]; then
  # --- COVERAGE_EFFECTIVE_V4: prefer JOBQ/RR (new contracts.*.address) but keep legacy vars for downstream checks/calls ---
if [ -z "${JOBQUEUE:-}" ] || [ "${JOBQUEUE:-}" = "null" ] || [[ "${JOBQUEUE:-}" =~ ^0x0+$ ]]; then
  JOBQUEUE="${JOBQ:-$JOBQUEUE}"
fi
if [ -z "${RECEIPTS:-}" ] || [ "${RECEIPTS:-}" = "null" ] || [[ "${RECEIPTS:-}" =~ ^0x0+$ ]]; then
  RECEIPTS="${RR:-$RECEIPTS}"
fi
# --- end COVERAGE_EFFECTIVE_V4 ---  exit 1
fi

if [[ "$RECEIPTS" == "null" || -z "$RECEIPTS" ]]; then
  echo "[coverage-smoke] ERROR: ReceiptRegistry.address missing in state JSON" >&2
  exit 1
fi

caller="$(id -un || echo unknown)"
home="${HOME:-/tmp}"
echo "[coverage-smoke] caller=$caller home=$home"

cache_dir="$home/.cache/node-exporter-textfile"
mkdir -p "$cache_dir"

src="$cache_dir/void_devnet_coverage.prom"
dst="/var/lib/node_exporter/textfile_collector/void_devnet_coverage.prom"

echo "[coverage-smoke] src=$src"
echo "[coverage-smoke] dst=$dst"
echo "[coverage-smoke] PATH=$PATH"

# --- 1) Get totals from chain via cast ---

jobs_raw=$(cast call "$JOBQUEUE" 'totalJobs()(uint256)' --rpc-url "$RPC_URL")
receipts_raw=$(cast call "$RECEIPTS" 'totalReceipts()(uint256)' --rpc-url "$RPC_URL")

# Strip whitespace
jobs=$(echo "$jobs_raw" | tr -d '[:space:]')
receipts=$(echo "$receipts_raw" | tr -d '[:space:]')

echo "# jobs=$jobs receipts=$receipts"

# --- 2) Compute coverage gauges in bash ---

if [[ "$jobs" == "0" ]]; then
  coverage="1.000000"
else
  # coverage = min(receipts/jobs, 1.0)
  # Use awk for safe float division
  ratio=$(awk -v j="$jobs" -v r="$receipts" 'BEGIN { if (j == 0) { print 1.0 } else { print r / j } }')
  # Clamp to 1.0
  coverage=$(awk -v x="$ratio" 'BEGIN { if (x > 1.0) { print "1.000000" } else { printf "%.6f\n", x } }')
fi

# coverage_health = 1 if coverage == 1, else 0
coverage_health=$(awk -v c="$coverage" 'BEGIN { if (c+0 >= 1.0) { print 1 } else { print 0 } }')

# receipts_cov_v2 = receipts/jobs (raw ratio, 0 if jobs==0)
if [[ "$jobs" == "0" ]]; then
  receipts_cov_v2="0.000000"
else
  receipts_cov_v2=$(awk -v j="$jobs" -v r="$receipts" 'BEGIN { if (j == 0) { print 0.0 } else { printf "%.6f\n", r / j } }')
fi

# receipts_health_v2 = 1 if receipts >= jobs, else 0
receipts_health_v2=$(awk -v j="$jobs" -v r="$receipts" 'BEGIN { if (r+0 >= j+0) { print 1 } else { print 0 } }')

echo "# coverage=$coverage coverage_health=$coverage_health"
echo "# receipts_cov_v2=$receipts_cov_v2 receipts_health_v2=$receipts_health_v2"

# --- 3) Write textfile snapshot to ~/.cache ---

cat > "$src" <<EOF
# HELP void_devnet_coverage Job coverage on VOID devnet (0..1)
# TYPE void_devnet_coverage gauge
void_devnet_coverage{chain="devnet"} $coverage
# HELP void_devnet_coverage_health coverage health (1=ok,0=bad)
# TYPE void_devnet_coverage_health gauge
void_devnet_coverage_health{chain="devnet"} $coverage_health
# HELP void_devnet_receipts_coverage_v2 receipts/job ratio on VOID devnet
# TYPE void_devnet_receipts_coverage_v2 gauge
void_devnet_receipts_coverage_v2{chain="devnet"} $receipts_cov_v2
# HELP void_devnet_receipts_health_v2 receipts vs jobs health (1=ok,0=bad)
# TYPE void_devnet_receipts_health_v2 gauge
void_devnet_receipts_health_v2{chain="devnet"} $receipts_health_v2
EOF

echo "[coverage-smoke] wrote $src"
echo "[coverage-smoke] snapshot (first 20 lines):"
sed -n '1,20p' "$src"

# --- 4) Copy into node-exporter textfile dir ---

if [[ ! -d "$(dirname "$dst")" ]]; then
  echo "[coverage-smoke] WARNING: textfile_collector dir missing: $(dirname "$dst")" >&2
  echo "[coverage-smoke] SKIPPING install to $dst"
  exit 0
fi

uid="$(id -u 2>/dev/null || echo 99999)"

# We don't actually need special behavior for root vs non-root on your dev box
# (you've already set perms), but keep the check sane and harmless.
if [[ "$uid" -eq 0 ]]; then
  echo "[coverage-smoke] running as root (uid=0), installing directly to $dst"
else
  echo "[coverage-smoke] running as uid=$uid, installing directly to $dst (assuming perms ok)"
fi

cp "$src" "$dst"
echo "[coverage-smoke] installed into $dst"

# --- devnet-state-shim-v2 usage: prefer contracts.*.address if vars are empty ---
if [ -z "${JOBQ:-}" ] || [ "${JOBQ:-}" = "null" ] || [[ "${JOBQ:-}" =~ ^0x0+$ ]]; then
  JOBQ="$(void_addr_v2 JobQueue)"
fi
if [ -z "${RR:-}" ] || [ "${RR:-}" = "null" ] || [[ "${RR:-}" =~ ^0x0+$ ]]; then
  RR="$(void_addr_v2 ReceiptRegistry)"
fi
# --- end shim ---

