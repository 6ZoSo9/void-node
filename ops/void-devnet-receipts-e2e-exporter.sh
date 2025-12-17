#!/usr/bin/env bash
set -euo pipefail

OUT="${OUT:-/var/lib/node_exporter/textfile_collector/void_devnet_receipts_e2e.prom}"
RPC="${RPC:-http://127.0.0.1:8545}"
JOBID="${JOBID:-}"
RID="${RID:-}"

if [ -z "$JOBID" ]; then
  echo "[ERR] JOBID required (export JOBID=0x...)" >&2
  exit 2
fi

tmp="$(mktemp)"
ok=0

# run proof as current user (so PATH/cast works)
if RPC="$RPC" JOBID="$JOBID" RID="$RID" ops/void-devnet-receipts-e2e-proof.sh >/dev/null 2>&1; then
  ok=1
fi

ts="$(date +%s)"
cat > "$tmp" <<EOF
# HELP void_devnet_receipts_e2e_ok 1 if devnet receipts e2e proof passes
# TYPE void_devnet_receipts_e2e_ok gauge
void_devnet_receipts_e2e_ok $ok
# HELP void_devnet_receipts_e2e_last_run_seconds unix time of last run
# TYPE void_devnet_receipts_e2e_last_run_seconds gauge
void_devnet_receipts_e2e_last_run_seconds $ts
EOF

sudo install -m 0644 "$tmp" "$OUT"
rm -f "$tmp"
