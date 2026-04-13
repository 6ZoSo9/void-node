#!/usr/bin/env bash
set -euo pipefail

# root PATH differs; use zoso foundry without installing as root
export PATH="/home/zoso/.foundry/bin:/root/.foundry/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
FORGE="/home/zoso/.foundry/bin/forge"
[[ -x "$FORGE" ]] || { echo "[ERR] forge not executable at $FORGE"; exit 127; }

# === VOID mainnet PLAN -> artifact + textfile metrics (no broadcast) ===
# Writes:
#   /root/void-mainnet-plan/plan.<ts>.txt
#   /root/void-mainnet-plan/plan.latest.txt
#   /var/lib/node_exporter/textfile_collector/void_mainnet_bootstrap_plan_artifact.prom

[[ "${EUID}" -eq 0 ]] || { echo "[ERR] run as root (sudo)"; exit 1; }

TS="$(date +%Y%m%d-%H%M%S)"
UHOME="$(getent passwd zoso | cut -d: -f6)"
REPO="${UHOME}/dev/void-node"
PROM_DIR="/var/lib/node_exporter/textfile_collector"
OUTDIR="/root/void-mainnet-plan"

LIVE_JSON_DEFAULT="${REPO}/ops/mainnet/void-mainnet.live.json"
LIVE_JSON="${LIVE_JSON:-$LIVE_JSON_DEFAULT}"

mkdir -p "$OUTDIR" "$PROM_DIR"

echo "=== [0] repo + inputs ==="
echo "REPO     = $REPO"
echo "LIVE_JSON= $LIVE_JSON"
[[ -d "$REPO" ]] || { echo "[ERR] repo missing: $REPO"; exit 2; }
[[ -f "$LIVE_JSON" ]] || { echo "[ERR] live json missing: $LIVE_JSON"; exit 3; }

CHAIN_ID="$(python3 - "$LIVE_JSON" <<'PY'
import json,sys
path=sys.argv[1]
j=json.load(open(path,"r"))
print(j.get("chainId",""))
PY
)"
[[ -n "$CHAIN_ID" ]] || { echo "[ERR] LIVE_JSON missing .chainId"; exit 3; }
echo "CHAIN_ID = $CHAIN_ID"

MODE="$(python3 - "$LIVE_JSON" <<'PY'
import json,sys
j=json.load(open(sys.argv[1],"r"))
print(j.get("mode",""))
PY
)"
STATUS="$(python3 - "$LIVE_JSON" <<'PY'
import json,sys
j=json.load(open(sys.argv[1],"r"))
print(j.get("status",""))
PY
)"
echo "MODE     = $MODE"
echo "STATUS   = $STATUS"

if [[ "$MODE" == "mainnet_plan_stub" && "$STATUS" == "stub_only_not_live" ]]; then
  echo "[info] pinned live json is an intentional stub-only mainnet plan"
fi

echo
echo "=== [0.1] validate live json invariants before forge ==="
python3 - "$LIVE_JSON" <<'PY'
import json, sys

path = sys.argv[1]
j = json.load(open(path, "r"))

errs = []

chain_id = str(j.get("chainId", "")).strip()
mode = j.get("mode", "")
status = j.get("status", "")

if chain_id != "2050":
    errs.append(f"chainId must be 2050, got {chain_id!r}")
if mode != "mainnet_plan_stub":
    errs.append(f"mode must be 'mainnet_plan_stub', got {mode!r}")
if status != "stub_only_not_live":
    errs.append(f"status must be 'stub_only_not_live', got {status!r}")

if j.get("roles") is None:
    errs.append("missing .roles object")
if j.get("treasury") is None:
    errs.append("missing .treasury object")
if j.get("validators") is None:
    errs.append("missing .validators field")

if errs:
    print("[ERR] live json invariant failure(s):")
    for e in errs:
        print(" - " + e)
    raise SystemExit(9)

print("[ok] live json invariants passed")
PY

CAST="/home/zoso/.foundry/bin/cast"
RPC_DEFAULT="http://127.0.0.1:8545"
RPC_URL="${RPC_URL:-$RPC_DEFAULT}"
RPC_CHAIN=""
RPC_ARGS=()
if [[ -x "$CAST" ]] && "$CAST" chain-id --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  RPC_CHAIN="$("$CAST" chain-id --rpc-url "$RPC_URL" 2>/dev/null | tr -d '\r\n' || true)"
  echo "RPC_URL = $RPC_URL (chainId=$RPC_CHAIN)"
  if [[ "$RPC_CHAIN" == "$CHAIN_ID" ]]; then
    RPC_ARGS+=(--rpc-url "$RPC_URL")
  else
    echo "[warn] RPC chainId != LIVE chainId; running without --rpc-url"
  fi
else
  echo "RPC_URL = $RPC_URL (unreachable) -- running without --rpc-url"
fi

cd "$REPO"

echo
echo "=== [1] locate foundry project + mainnet PLAN script ==="
FOUND_FOUNDRY="0"
if [[ -f foundry.toml ]]; then
  FOUND_FOUNDRY="1"
  FOUNDRY_ROOT="$REPO"
elif [[ -f contracts/foundry.toml ]]; then
  FOUND_FOUNDRY="1"
  FOUNDRY_ROOT="$REPO/contracts"
elif [[ -d "$REPO/script" || -d "$REPO/script/mainnet_rebuild" ]]; then
  FOUND_FOUNDRY="1"
  FOUNDRY_ROOT="$REPO"
else
  FOUNDRY_ROOT="$REPO"
fi
[[ "$FOUND_FOUNDRY" == "1" ]] || { echo "[ERR] could not determine foundry root or script tree under repo"; exit 4; }
echo "FOUNDRY_ROOT = $FOUNDRY_ROOT"

SCRIPT_PATH=""
for cand in \
  "$FOUNDRY_ROOT/script/VoidMainnetBootstrapMainnetStub.s.sol" \
  "$FOUNDRY_ROOT/script/VoidMainnetBootstrapMainnet.s.sol" \
  "$FOUNDRY_ROOT/script/VoidMainnetBootstrapMainnetPlan.s.sol" \
  "$FOUNDRY_ROOT/script/VoidMainnetBootstrapMainnetPLAN.s.sol" \
  "$FOUNDRY_ROOT/script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol"
do
  if [[ -f "$cand" ]]; then
    SCRIPT_PATH="$cand"
    break
  fi
done

if [[ -z "$SCRIPT_PATH" ]]; then
  if rg -n "VoidMainnetBootstrap(Mainnet|Dev|Plan|FromJson|vaults-rebuild)" "$FOUNDRY_ROOT/script" "$FOUNDRY_ROOT/scripts" >/dev/null 2>&1; then
    SCRIPT_PATH="$(rg -n "VoidMainnetBootstrap(Mainnet|Dev|Plan|FromJson|vaults-rebuild)" "$FOUNDRY_ROOT/script" "$FOUNDRY_ROOT/scripts" 2>/dev/null | head -n 1 | cut -d: -f1 || true)"
  fi
fi

if [[ -z "$SCRIPT_PATH" ]]; then
  SCRIPT_PATH="$(find "$FOUNDRY_ROOT/script" -type f -name '*.s.sol' 2>/dev/null | rg "(Bootstrap|Mainnet|mainnet_rebuild).*\.s\.sol$" | head -n 1 || true)"
fi

[[ -n "$SCRIPT_PATH" ]] || { echo "[ERR] could not find a mainnet bootstrap PLAN script under $FOUNDRY_ROOT/script"; exit 5; }

echo "SCRIPT_PATH = $SCRIPT_PATH"

CONTRACT_NAME="$(rg -n "contract\s+([A-Za-z0-9_]+)" "$SCRIPT_PATH" | head -n 1 | awk '{print $2}' | tr -d '{' || true)"
[[ -n "${CONTRACT_NAME}" ]] || CONTRACT_NAME="(unknown)"
echo "CONTRACT_NAME(best-effort) = $CONTRACT_NAME"

echo
echo "=== [2] run forge script (PLAN-only; should NOT broadcast) ==="
PLAN_TXT="$OUTDIR/plan.${TS}.txt"
PLAN_LATEST="$OUTDIR/plan.latest.txt"

cd "$FOUNDRY_ROOT"

set +e
"$FORGE" script "$SCRIPT_PATH:${CONTRACT_NAME}" --chain-id "$CHAIN_ID" "${RPC_ARGS[@]}" --sig "run(string)" "$LIVE_JSON" -vvv >"$PLAN_TXT" 2>&1
RC=$?
set -e

STUB_OK=0
if grep -q "RUN_STUB_ONLY" "$PLAN_TXT" 2>/dev/null || grep -q "STUB_ONLY" "$PLAN_TXT" 2>/dev/null || grep -q "stub_only" "$PLAN_TXT" 2>/dev/null; then
  STUB_OK=1
fi

PLAN_FACTS_OK=1
for needle in \
  "PLAN_KIND" \
  "PLAN_MODE" \
  "PLAN_VERSION" \
  "CHAIN_ID_EXPECTED" \
  "DEPLOY_01" \
  "INVARIANT_01" \
  "MARKER"
do
  if ! grep -q "$needle" "$PLAN_TXT" 2>/dev/null; then
    echo "[ERR] missing expected stub plan fact: $needle"
    PLAN_FACTS_OK=0
  fi
done

if [[ "$RC" -ne 0 && "$STUB_OK" -ne 1 ]]; then
  echo "[ERR] forge script failed rc=$RC (see $PLAN_TXT)"
fi

rm -f "$PLAN_LATEST"
cp -a "$PLAN_TXT" "$PLAN_LATEST" || true

HASH="$(sha256sum "$PLAN_TXT" | awk '{print $1}')"
LIVE_HASH="$(sha256sum "$LIVE_JSON" | awk '{print $1}')"

echo
echo "=== [3] write textfile metrics (atomic) ==="
TMP_PROM="$(mktemp)"
trap 'rm -f "$TMP_PROM"' EXIT

OK=1
if [[ "$RC" -ne 0 && "$STUB_OK" -ne 1 ]]; then
  OK=0
fi
if [[ "$PLAN_FACTS_OK" -ne 1 ]]; then
  OK=0
fi

cat >"$TMP_PROM" <<PROM
# HELP void_mainnet_bootstrap_plan_artifact_ok 1 if PLAN artifact generation succeeded.
# TYPE void_mainnet_bootstrap_plan_artifact_ok gauge
void_mainnet_bootstrap_plan_artifact_ok ${OK}

# HELP void_mainnet_bootstrap_plan_artifact_hash_info Hash label for latest PLAN artifact.
# TYPE void_mainnet_bootstrap_plan_artifact_hash_info gauge
void_mainnet_bootstrap_plan_artifact_hash_info{hash="${HASH}",live_hash="${LIVE_HASH}"} 1

# HELP void_mainnet_bootstrap_plan_artifact_mtime_seconds Unix mtime of latest PLAN artifact.
# TYPE void_mainnet_bootstrap_plan_artifact_mtime_seconds gauge
void_mainnet_bootstrap_plan_artifact_mtime_seconds $(stat -c %Y "$PLAN_TXT")
PROM

DEST_PROM="$PROM_DIR/void_mainnet_bootstrap_plan_artifact.prom"
mv -f "$TMP_PROM" "$DEST_PROM"
chmod 0644 "$DEST_PROM"

echo "[ok] plan_txt   = $PLAN_TXT"
echo "[ok] plan_hash  = $HASH"
echo "[ok] live_hash  = $LIVE_HASH"
echo "[ok] prom_file  = $DEST_PROM"
echo "[ok] ok=${OK}"

if [[ "$RC" -ne 0 && "$STUB_OK" -eq 1 && "$PLAN_FACTS_OK" -eq 1 ]]; then
  echo "[ok] stub marker detected with structured plan facts; treating stub-only plan run as success"
  exit 0
fi

if [[ "$PLAN_FACTS_OK" -ne 1 ]]; then
  echo "[ERR] stub output missing required structured plan facts"
  exit 10
fi

exit "$RC"
