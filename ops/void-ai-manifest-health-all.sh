#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

MANIFEST="${MANIFEST_PATH:-config/void-ai-manifest.live.json}"

echo "=== [ai-manifest-health] VOID AI manifest structural health ==="
echo "[cfg] MANIFEST = $MANIFEST"
echo

if [ ! -f "$MANIFEST" ]; then
  echo "[fatal] manifest file not found: $MANIFEST"
  exit 1
fi

status=0

step() {
  local name="$1"
  shift
  echo
  echo "=== [$name] ==="
  if "$@"; then
    echo "[$name] OK"
  else
    rc=$?
    echo "[$name] FAILED (rc=$rc)"
    status=1
  fi
}

step "version-and-chain" bash -c '
  ver="$(jq -r ".version" "'"$MANIFEST"'")"
  cid="$(jq -r ".chain.chainId" "'"$MANIFEST"'")"

  echo "[version] version  = $ver"
  echo "[version] chainId  = $cid"

  test "$ver" = "void-ai-manifest-v1" || { echo "[version] bad version"; exit 1; }
  test "$cid" = "2050" || { echo "[version] bad chainId"; exit 1; }
'

step "system-contracts" bash -c '
  keys="$(jq -r ".systemContracts | keys | join(\",\")" "'"$MANIFEST"'")"
  count="$(jq -r ".systemContracts | length" "'"$MANIFEST"'")"

  echo "[sys] keys   = $keys"
  echo "[sys] count  = $count"

  # We just require a non-zero set and a few expected names.
  echo "$keys" | grep -q "VoidToken"      || { echo "[sys] missing VoidToken"; exit 1; }
  echo "$keys" | grep -q "VoidTreasury"   || { echo "[sys] missing VoidTreasury"; exit 1; }
  echo "$keys" | grep -q "RewardEngine"   || { echo "[sys] missing RewardEngine"; exit 1; }
  echo "$keys" | grep -q "ValidatorSet"   || { echo "[sys] missing ValidatorSet"; exit 1; }
  echo "$keys" | grep -q "JobQueue"       || { echo "[sys] missing JobQueue"; exit 1; }

  # It is fine if addresses are still zero; that is a PLAN/mainnet concern.
'

step "ai-endpoints-http" bash -c '
  method="$(jq -r ".aiEndpoints.http.jobSubmit.method" "'"$MANIFEST"'")"
  path="$(jq -r ".aiEndpoints.http.jobSubmit.path" "'"$MANIFEST"'")"

  echo "[http] jobSubmit.method = $method"
  echo "[http] jobSubmit.path   = $path"

  test "$method" = "POST" || { echo "[http] jobSubmit wrong method"; exit 1; }
  test "$path"   = "/agent/v0/jobs" || { echo "[http] jobSubmit wrong path"; exit 1; }

  # Make sure there is a receipt path too (shape-only check).
  r_method="$(jq -r ".aiEndpoints.http.receiptSubmit.method // \"POST\"" "'"$MANIFEST"'")"
  r_path="$(jq -r ".aiEndpoints.http.receiptSubmit.path" "'"$MANIFEST"'")"

  echo "[http] receiptSubmit.method = $r_method"
  echo "[http] receiptSubmit.path   = $r_path"

  test "$r_path" = "/agent/v0/receipt" || { echo "[http] receiptSubmit wrong path"; exit 1; }
'

step "metrics-section" bash -c '
  baseUrl="$(jq -r ".metrics.prometheus.baseUrl" "'"$MANIFEST"'")"
  series="$(jq -r ".metrics.prometheus.keySeries | join(\",\")" "'"$MANIFEST"'")"

  echo "[metrics] baseUrl  = $baseUrl"
  echo "[metrics] keySeries= $series"

  # Only require that the field exists and is non-empty.
  test -n "$baseUrl" || { echo "[metrics] empty baseUrl"; exit 1; }
'

echo
echo "=== [ai-manifest-health] summary ==="
if [ "$status" -eq 0 ]; then
  echo "[summary] RESULT: OK (AI manifest JSON shape looks healthy)"
else
  echo "[summary] RESULT: FAILED (manifest JSON failed one or more checks)"
fi

exit "$status"
