#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

WHO="${WHO:-public-wc-proof-demo-$(date -u +%Y%m%d-%H%M%S)}"
DELTA="${DELTA:-10}"
TASK_CLASS="${TASK_CLASS:-public_wc_proof_demo}"
NOW_MS="$(node -e 'console.log(Date.now())')"
NONCE="$(node -e 'console.log(require("crypto").randomBytes(8).toString("hex"))')"
DATASET_ID="ds_${NOW_MS}_${NONCE}"
DIR="data_a/datanet_v1/local_jobs"
FILE="$DIR/$DATASET_ID.txt"

mkdir -p "$DIR"

node - "$FILE" "$DATASET_ID" "$WHO" "$DELTA" "$TASK_CLASS" "$NOW_MS" <<'NODE'
const fs = require("fs");
const crypto = require("crypto");

const [file, dataset_id, who, deltaRaw, task_class, nowRaw] = process.argv.slice(2);
const delta = Number(deltaRaw || 10);
const created_at_ms = Number(nowRaw || Date.now());

const record = {
  schema: "void.datanet.local_job.v1",
  marker: "VOID_WC_PUBLIC_PROOF_GENERATE_DEMO_V1",
  dataset_id,
  who,
  account: who,
  task_class,
  delta,
  wc_delta: delta,
  credit_delta: delta,
  wc_credit_delta: delta,
  status: "generated_public_wc_proof_demo",
  latest_sort_compat: true,
  source: "ops/mainnet0/public-wc-proof-generate-demo.sh",
  sizeBytes: 0,
  created_at_ms,
  mtime_ms: created_at_ms,
  ts_ms: created_at_ms,
  updated_at_ms: created_at_ms,
  completed_at_ms: created_at_ms,
  money_movement: false,
  wallet_send: false,
  wc_to_void_swap: false,
  buy_void_fulfillment: false,
  validator_mutation: false,
  proof: {
    kind: "wc_public_demo_proof",
    statement: "This node generated a local Work Credit proof demo record backed by DataNet local-job JSON.",
    verifier_route: "/wc-proof-viewer",
    public_route: `/proof/${dataset_id}?who=${encodeURIComponent(who)}&delta=${encodeURIComponent(String(delta))}`,
    raw_route: `/datanet/v1/local-job/${dataset_id}?who=${encodeURIComponent(who)}`
  }
};

const canonical = JSON.stringify(record, null, 2) + "\n";
record.sha256 = crypto.createHash("sha256").update(canonical).digest("hex");
fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n");
NODE

SHARE_PATH="/proof/$DATASET_ID?who=$WHO&delta=$DELTA"
VIEWER_PATH="/wc-proof-viewer?dataset=$DATASET_ID&who=$WHO&delta=$DELTA"
RAW_PATH="/datanet/v1/local-job/$DATASET_ID?who=$WHO"

echo "VOID_WC_PUBLIC_PROOF_GENERATE_DEMO_V1"
echo "dataset_id=$DATASET_ID"
echo "who=$WHO"
echo "delta=$DELTA"
echo "task_class=$TASK_CLASS"
echo "file=$FILE"
echo "share_path=$SHARE_PATH"
echo "viewer_path=$VIEWER_PATH"
echo "raw_path=$RAW_PATH"
echo "money_movement=false"
echo "wallet_send=false"
echo "wc_to_void_swap=false"
echo "buy_void_fulfillment=false"
echo "validator_mutation=false"
