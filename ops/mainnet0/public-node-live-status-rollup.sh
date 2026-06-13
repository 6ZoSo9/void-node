#!/usr/bin/env bash
set -euo pipefail

LOCAL_BASE="${LOCAL_BASE:-http://127.0.0.1:4100}"
OUT="${OUT:-/tmp/public-node-live-status-rollup-$(date -u +%Y%m%d-%H%M%S)}"

mkdir -p "$OUT"

echo "VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1"
echo "checked_at_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "head=$(git rev-parse --short HEAD)"
echo "tag=$(git tag --points-at HEAD | head -1)"
echo "local_base=$LOCAL_BASE"
echo "out=$OUT"

test "$(systemctl --user is-active void-node-live.service)" = "active"
echo "service_active=true"

curl -fsS "$LOCAL_BASE/public-node/external-base-url.json" > "$OUT/external-base-url.json"
curl -fsS "$LOCAL_BASE/public-node/first-tester-request-copy-pack.json" > "$OUT/first-tester-request-copy-pack.json"
curl -fsS "$LOCAL_BASE/public-node/tester-result-intake.json" > "$OUT/tester-result-intake.json"

python3 - "$OUT" <<'PY'
import json, sys
from pathlib import Path

out = Path(sys.argv[1])

external = json.loads((out / "external-base-url.json").read_text())
pack = json.loads((out / "first-tester-request-copy-pack.json").read_text())
intake = json.loads((out / "tester-result-intake.json").read_text())

assert external.get("marker") == "VOID_PUBLIC_NODE_EXTERNAL_BASE_URL_V1"
assert pack.get("marker") == "VOID_PUBLIC_NODE_FIRST_TESTER_REQUEST_COPY_PACK_V1"
assert intake.get("marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_INTAKE_V1"

base = external.get("effective_base_url")
assert base and base != "http://127.0.0.1:4100"
assert pack.get("effective_base_url") == base
assert pack.get("tester_links", {}).get("tester_share_page", "").startswith(base)
assert pack.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert pack.get("expected_receipt_file") == "tester-receipt.json"

intake_obj = intake.get("intake", {})
assert intake_obj.get("mode") == "operator_local_file_import_only"
assert intake_obj.get("public_post_endpoint") is False

print("json_rollup_checks=green")
print(f"effective_base_url={base}")
print(f"tester_share_page={pack['tester_links']['tester_share_page']}")
print(f"intake_status={intake.get('status')}")
print(f"latest_imported={intake_obj.get('latest_imported')}")

sample = {
  "marker": "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1",
  "tester_label": "rollup-dryrun-sample",
  "tested_base_url": base,
  "observed_green_marker": "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN",
  "standalone_smoke_marker": "VOID_PUBLIC_NODE_STANDALONE_OUTSIDE_TESTER_SMOKE_SCRIPT_V1",
  "demo003_folder_checked": True,
  "demo003_folder_manifest": base + "/public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json",
  "result": "green",
  "trusted_as_network_truth": False
}
(out / "rollup-sample-receipt.json").write_text(json.dumps(sample, indent=2) + "\n")
(out / "effective-base.txt").write_text(base + "\n")
PY

for p in \
  /version \
  /public-node \
  /public-node/tester-share \
  /public-node/tester-lane-summary.json \
  /.well-known/void-public-node.json \
  /public-node/route-manifest.json \
  /public-node/self-check-snapshot.json \
  /public-node/local-data-drop/folder/demo003-folder-fixture-v1/manifest.json \
  /public-node/local-data-drop/folder/demo003-folder-fixture-v1/files/index.html \
  /proofs
do
  printf "%-95s" "$p"
  curl -fsS --max-time 8 -o /dev/null "$LOCAL_BASE$p"
  echo " OK"
done

ops/mainnet0/public-node-first-tester-ask-export.sh > "$OUT/ask-export.log"
grep -Fq "VOID_PUBLIC_NODE_FIRST_TESTER_ASK_EXPORT_V1_GREEN" "$OUT/ask-export.log"
echo "ask_export_green=true"

ops/mainnet0/public-node-first-external-receipt-watch.sh > "$OUT/receipt-watch-before.log"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_WATCH_V1_GREEN" "$OUT/receipt-watch-before.log"
echo "receipt_watch_green=true"

if grep -Fq "receipt_state=waiting_for_external_receipt" "$OUT/receipt-watch-before.log"; then
  echo "receipt_state=waiting_for_external_receipt"
else
  grep -F "receipt_state=" "$OUT/receipt-watch-before.log" || true
fi

EFFECTIVE_BASE="$(cat "$OUT/effective-base.txt")"
EXPECTED_BASE="$EFFECTIVE_BASE" ops/mainnet0/public-node-tester-receipt-safe-import.sh "$OUT/rollup-sample-receipt.json" > "$OUT/safe-import-dryrun.log"
grep -Fq "VOID_PUBLIC_NODE_TESTER_RECEIPT_SAFE_IMPORT_V1_PREFLIGHT_GREEN" "$OUT/safe-import-dryrun.log"
grep -Fq "import_skipped=true" "$OUT/safe-import-dryrun.log"
echo "safe_import_dryrun_green=true"
echo "safe_import_dryrun_import_skipped=true"

LOCAL_BASE="$LOCAL_BASE" ops/mainnet0/public-node-real-data-import-lane-status-proof.sh > "$OUT/real-data-status-proof.log"
grep -Fq "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_PROOF_V1_GREEN" "$OUT/real-data-status-proof.log"
grep -Fq "weighted_object_count=5" "$OUT/real-data-status-proof.log"
echo "real_data_lane_green=true"
grep -F "weighted_object_count=" "$OUT/real-data-status-proof.log" | sed "s/^weighted_/real_data_/"
for line in \
  real_data_status_route_green=true \
  real_data_status_route_index_green=true \
  real_data_client_work_pack_discovery_green=true \
  real_data_well_known_discovery_green=true \
  real_data_self_check_discovery_green=true \
  real_data_route_manifest_discovery_green=true; do
  grep -Fq "$line" "$OUT/real-data-status-proof.log"
  echo "$line"
done

ops/mainnet0/public-node-first-external-receipt-watch.sh > "$OUT/receipt-watch-after-dryrun.log"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_WATCH_V1_GREEN" "$OUT/receipt-watch-after-dryrun.log"

if grep -Fq "receipt_state=waiting_for_external_receipt" "$OUT/receipt-watch-after-dryrun.log"; then
  echo "dryrun_preserved_waiting_state=true"
else
  echo "dryrun_preserved_waiting_state=false"
  cat "$OUT/receipt-watch-after-dryrun.log"
  exit 1
fi


curl -fsS "$LOCAL_BASE/public-node/tester-lane-summary.json" > "$OUT/tester-lane-summary-real-data-link.json"
node - "$OUT/tester-lane-summary-real-data-link.json" <<'NODE'
const fs = require("fs");
const summary = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}
ok(summary.tester_lane && summary.tester_lane.real_data_status_ready === true, "tester lane real data status ready");
ok(summary.links && typeof summary.links.real_data_import_lane_status === "string", "tester lane real data status link");
ok(summary.links.real_data_import_lane_status.endsWith("/public-node/real-data-import-lane-status.json"), "tester lane real data status route");
ok(summary.route_markers && summary.route_markers.real_data_import_lane_status === "VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1", "tester lane real data marker");
NODE
echo "real_data_tester_lane_summary_link_green=true"
curl -fsS "$LOCAL_BASE/public-node/external-tester-receipt-closeout-status.json" > "$OUT/external-tester-receipt-closeout-status.json"

python3 - "$OUT/external-tester-receipt-closeout-status.json" "$OUT/tester-result-intake.json" <<'NODEPY'
import json
import sys

closeout = json.loads(open(sys.argv[1], "r", encoding="utf-8").read())
intake = json.loads(open(sys.argv[2], "r", encoding="utf-8").read())

assert closeout.get("marker") == "VOID_PUBLIC_NODE_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_STATUS_V1"
assert closeout.get("purpose") == "public_node_external_tester_receipt_closeout_status"
assert closeout.get("links", {}).get("tester_result_intake", "").endswith("/public-node/tester-result-intake.json")
assert closeout.get("links", {}).get("real_data_import_lane_status", "").endswith("/public-node/real-data-import-lane-status.json")

closeout_obj = closeout.get("closeout", {})
policy = closeout.get("policy", {})
intake_obj = intake.get("intake", {})

latest_imported = bool(closeout_obj.get("latest_imported"))
waiting = bool(closeout_obj.get("waiting_for_external_receipt"))
intake_latest_imported = bool(intake_obj.get("latest_imported"))

assert closeout_obj.get("tester_lane_ready") is True
assert closeout_obj.get("receipt_required") is True
assert closeout_obj.get("safe_import_guard_ready") is True
assert closeout_obj.get("expected_receipt_file") == "tester-receipt.json"
assert closeout_obj.get("expected_receipt_marker") == "VOID_PUBLIC_NODE_TESTER_RESULT_RECEIPT_V1"
assert closeout_obj.get("expected_green_marker") == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert latest_imported == intake_latest_imported
assert waiting == (not latest_imported)

assert policy.get("public_routes_only") is True
assert policy.get("private_api") is False
assert policy.get("public_post_endpoint") is False
assert policy.get("operator_local_import_only") is True
assert policy.get("mutation") is False
assert policy.get("read_only") is True
assert policy.get("money_movement") is False
assert policy.get("wallet_send") is False
assert policy.get("wc_to_void_swap") is False
assert policy.get("buy_void_fulfillment") is False
assert policy.get("validator_mutation") is False
assert policy.get("trusted_as_network_truth") is False

print("external_tester_receipt_closeout_status_green=true")
print(f"external_tester_receipt_closeout_waiting={str(waiting).lower()}")
print(f"external_tester_receipt_closeout_latest_imported={str(latest_imported).lower()}")
print("external_tester_receipt_closeout_public_upload=false")
print("external_tester_receipt_closeout_operator_local_import_only=true")
print("external_tester_receipt_closeout_trusted_as_network_truth=false")
NODEPY

ASK_EXPORT_OUT="$OUT/first-external-receipt-ask-export"
LOCAL_BASE="$LOCAL_BASE" OUT="$ASK_EXPORT_OUT" ops/mainnet0/public-node-first-external-receipt-ask-export.sh > "$OUT/first-external-receipt-ask-export.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_ASK_EXPORT_V1_GREEN" "$OUT/first-external-receipt-ask-export.log"
grep -Fq "first_external_receipt_ask_ready" "$OUT/first-external-receipt-ask-export.log"
grep -Fq "closeout_status=$EFFECTIVE_BASE/public-node/external-tester-receipt-closeout-status.json" "$OUT/first-external-receipt-ask-export.log"
grep -Fq "$EFFECTIVE_BASE/public-node/external-tester-receipt-closeout-status.json" "$ASK_EXPORT_OUT/first-external-receipt-ask.txt"

if grep -Fq "$LOCAL_BASE/public-node/external-tester-receipt-closeout-status.json" "$ASK_EXPORT_OUT/first-external-receipt-ask.txt"; then
  echo "first_external_receipt_ask_closeout_url_localhost=true"
  exit 1
fi

echo "first_external_receipt_ask_public_closeout_url_green=true"
echo "first_external_receipt_ask_closeout_url_public=true"
echo "first_external_receipt_ask_closeout_url_localhost=false"

PACKET_EXPORT_OUT="$OUT/first-external-receipt-packet-export"
LOCAL_BASE="$LOCAL_BASE" OUT="$PACKET_EXPORT_OUT" ops/mainnet0/public-node-first-external-receipt-packet-export.sh > "$OUT/first-external-receipt-packet-export.log"

PACKET_DIR="$PACKET_EXPORT_OUT/first-external-receipt-packet"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1_GREEN" "$OUT/first-external-receipt-packet-export.log"
grep -Fq "first_external_receipt_packet_ready" "$OUT/first-external-receipt-packet-export.log"
grep -Fq "closeout_status=$EFFECTIVE_BASE/public-node/external-tester-receipt-closeout-status.json" "$OUT/first-external-receipt-packet-export.log"
grep -Fq "real_data_import_lane_status=$EFFECTIVE_BASE/public-node/real-data-import-lane-status.json" "$OUT/first-external-receipt-packet-export.log"

for f in \
  README.txt \
  first-external-receipt-ask.txt \
  first-external-receipt-ask.json \
  closeout-status.json \
  tester-lane-summary.json \
  real-data-import-lane-status.json \
  packet-manifest.json
do
  test -s "$PACKET_DIR/$f"
done

grep -Fq "$EFFECTIVE_BASE/public-node/external-tester-receipt-closeout-status.json" "$PACKET_DIR/README.txt"
grep -Fq "$EFFECTIVE_BASE/public-node/external-tester-receipt-closeout-status.json" "$PACKET_DIR/packet-manifest.json"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_V1" "$PACKET_DIR/packet-manifest.json"

if grep -R "$LOCAL_BASE/public-node/external-tester-receipt-closeout-status.json" "$PACKET_DIR" >/dev/null; then
  echo "first_external_receipt_packet_closeout_url_localhost=true"
  exit 1
fi

echo "first_external_receipt_packet_export_green=true"
echo "first_external_receipt_packet_public_closeout_url_green=true"
echo "first_external_receipt_packet_closeout_url_public=true"
echo "first_external_receipt_packet_closeout_url_localhost=false"

ARCHIVE_EXPORT_OUT="$OUT/first-external-receipt-packet-archive"
LOCAL_BASE="$LOCAL_BASE" OUT="$ARCHIVE_EXPORT_OUT" ops/mainnet0/public-node-first-external-receipt-packet-archive.sh > "$OUT/first-external-receipt-packet-archive.log"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_V1_GREEN" "$OUT/first-external-receipt-packet-archive.log"
grep -Fq "first_external_receipt_packet_archive_ready" "$OUT/first-external-receipt-packet-archive.log"
grep -Fq "closeout_status=$EFFECTIVE_BASE/public-node/external-tester-receipt-closeout-status.json" "$OUT/first-external-receipt-packet-archive.log"
grep -Fq "expected_receipt_file=tester-receipt.json" "$OUT/first-external-receipt-packet-archive.log"

test -s "$ARCHIVE_EXPORT_OUT/first-external-receipt-packet.tar.gz"
test -s "$ARCHIVE_EXPORT_OUT/first-external-receipt-packet.tar.gz.sha256"

(
  cd "$ARCHIVE_EXPORT_OUT"
  sha256sum -c first-external-receipt-packet.tar.gz.sha256
) > "$OUT/first-external-receipt-packet-archive-sha256.log"

ARCHIVE_UNPACK="$OUT/first-external-receipt-packet-archive-unpack"
rm -rf "$ARCHIVE_UNPACK"
mkdir -p "$ARCHIVE_UNPACK"
tar -xzf "$ARCHIVE_EXPORT_OUT/first-external-receipt-packet.tar.gz" -C "$ARCHIVE_UNPACK"

ARCHIVE_PACKET_DIR="$ARCHIVE_UNPACK/first-external-receipt-packet"

for f in \
  README.txt \
  first-external-receipt-ask.txt \
  first-external-receipt-ask.json \
  closeout-status.json \
  tester-lane-summary.json \
  real-data-import-lane-status.json \
  packet-manifest.json
do
  test -s "$ARCHIVE_PACKET_DIR/$f"
done

grep -Fq "$EFFECTIVE_BASE/public-node/external-tester-receipt-closeout-status.json" "$ARCHIVE_PACKET_DIR/README.txt"
grep -Fq "$EFFECTIVE_BASE/public-node/external-tester-receipt-closeout-status.json" "$ARCHIVE_PACKET_DIR/packet-manifest.json"

if grep -R "$LOCAL_BASE/public-node/external-tester-receipt-closeout-status.json" "$ARCHIVE_PACKET_DIR" >/dev/null; then
  echo "first_external_receipt_packet_archive_closeout_url_localhost=true"
  exit 1
fi

echo "first_external_receipt_packet_archive_green=true"
echo "first_external_receipt_packet_archive_sha256_green=true"
echo "first_external_receipt_packet_archive_public_closeout_url_green=true"
echo "first_external_receipt_packet_archive_closeout_url_public=true"
echo "first_external_receipt_packet_archive_closeout_url_localhost=false"

echo "VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1_GREEN"
