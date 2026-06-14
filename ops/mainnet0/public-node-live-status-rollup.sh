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

RECEIPT_STATE_BEFORE_DRYRUN="$(grep -m1 '^receipt_state=' "$OUT/receipt-watch-before.log" | cut -d= -f2-)"
if [ -z "$RECEIPT_STATE_BEFORE_DRYRUN" ]; then
  echo "ERROR: receipt_state missing before dryrun"
  cat "$OUT/receipt-watch-before.log"
  exit 1
fi

case "$RECEIPT_STATE_BEFORE_DRYRUN" in
  waiting_for_external_receipt|external_receipt_imported) ;;
  *)
    echo "ERROR: unexpected receipt state before dryrun: $RECEIPT_STATE_BEFORE_DRYRUN"
    cat "$OUT/receipt-watch-before.log"
    exit 1
    ;;
esac

echo "receipt_state=$RECEIPT_STATE_BEFORE_DRYRUN"
echo "receipt_state_before_dryrun=$RECEIPT_STATE_BEFORE_DRYRUN"

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

RECEIPT_STATE_AFTER_DRYRUN="$(grep -m1 '^receipt_state=' "$OUT/receipt-watch-after-dryrun.log" | cut -d= -f2-)"
if [ -z "$RECEIPT_STATE_AFTER_DRYRUN" ]; then
  echo "ERROR: receipt_state missing after dryrun"
  cat "$OUT/receipt-watch-after-dryrun.log"
  exit 1
fi

case "$RECEIPT_STATE_AFTER_DRYRUN" in
  waiting_for_external_receipt|external_receipt_imported) ;;
  *)
    echo "ERROR: unexpected receipt state after dryrun: $RECEIPT_STATE_AFTER_DRYRUN"
    cat "$OUT/receipt-watch-after-dryrun.log"
    exit 1
    ;;
esac

echo "receipt_state_after_dryrun=$RECEIPT_STATE_AFTER_DRYRUN"

if [ "$RECEIPT_STATE_BEFORE_DRYRUN" = "$RECEIPT_STATE_AFTER_DRYRUN" ]; then
  echo "dryrun_preserved_receipt_state=true"
else
  echo "dryrun_preserved_receipt_state=false"
  cat "$OUT/receipt-watch-before.log"
  cat "$OUT/receipt-watch-after-dryrun.log"
  exit 1
fi

if [ "$RECEIPT_STATE_AFTER_DRYRUN" = "waiting_for_external_receipt" ]; then
  echo "dryrun_preserved_waiting_state=true"
else
  echo "dryrun_preserved_waiting_state=false"
fi

if [ "$RECEIPT_STATE_AFTER_DRYRUN" = "external_receipt_imported" ]; then
  echo "dryrun_preserved_imported_state=true"
else
  echo "dryrun_preserved_imported_state=false"
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

PACKET_STATUS_JSON="$OUT/first-external-receipt-packet-status.json"
curl -fsS "$LOCAL_BASE/public-node/first-external-receipt-packet-status.json" > "$PACKET_STATUS_JSON"

python3 - "$PACKET_STATUS_JSON" "$EFFECTIVE_BASE" <<'ROLLUPPY'
import json
import sys
from pathlib import Path

status = json.loads(Path(sys.argv[1]).read_text())
effective_base = sys.argv[2].rstrip("/")

assert status["marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1"
assert status["route_marker"] == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_ROUTE_V1"
assert status["purpose"] == "public_node_first_external_receipt_packet_status"
assert status["status"] == "first_external_receipt_packet_operator_export_ready"
assert status["effective_base_url"] == effective_base

packet = status["packet_status"]
assert packet["packet_export_ready"] is True
assert packet["packet_archive_ready"] is True
assert packet["packet_archive_sha256_ready"] is True
assert packet["public_archive_download"] is False
assert packet["operator_local_export_only"] is True
assert packet["public_upload"] is False
assert packet["expected_receipt_file"] == "tester-receipt.json"
assert packet["expected_green_marker"] == "VOID_PUBLIC_NODE_OUTSIDE_TESTER_SMOKE_V1_GREEN"
assert packet["trusted_as_network_truth"] is False

policy = status["policy"]
assert policy["public_routes_only"] is True
assert policy["public_archive_download"] is False
assert policy["public_upload"] is False
assert policy["public_post_endpoint"] is False
assert policy["operator_local_export_only"] is True
assert policy["operator_local_import_only"] is True
assert policy["private_api"] is False
assert policy["mutation"] is False
assert policy["read_only"] is True
assert policy["trusted_as_network_truth"] is False

safety = status["safety"]
assert safety["money_movement"] is False
assert safety["wallet_send"] is False
assert safety["wc_to_void_swap"] is False
assert safety["buy_void_fulfillment"] is False
assert safety["validator_mutation"] is False

links = status["links"]
assert links["tester_share_page"] == effective_base + "/public-node/tester-share"
assert links["external_tester_receipt_closeout_status"] == effective_base + "/public-node/external-tester-receipt-closeout-status.json"
assert links["real_data_import_lane_status"] == effective_base + "/public-node/real-data-import-lane-status.json"
assert links["route_manifest"] == effective_base + "/public-node/route-manifest.json"
assert links["self_check_snapshot"] == effective_base + "/public-node/self-check-snapshot.json"
ROLLUPPY

PACKET_STATUS_ROUTE_INDEX_JSON="$OUT/first-external-receipt-packet-status-route-index.json"
PACKET_STATUS_ROUTE_MANIFEST_JSON="$OUT/first-external-receipt-packet-status-route-manifest.json"
PACKET_STATUS_SELF_CHECK_JSON="$OUT/first-external-receipt-packet-status-self-check.json"

curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$PACKET_STATUS_ROUTE_INDEX_JSON"
curl -fsS "$LOCAL_BASE/public-node/route-manifest.json" > "$PACKET_STATUS_ROUTE_MANIFEST_JSON"
curl -fsS "$LOCAL_BASE/public-node/self-check-snapshot.json" > "$PACKET_STATUS_SELF_CHECK_JSON"

grep -Fq "/public-node/first-external-receipt-packet-status.json" "$PACKET_STATUS_ROUTE_INDEX_JSON"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_V1" "$PACKET_STATUS_ROUTE_MANIFEST_JSON"
grep -Fq "first_external_receipt_packet_status" "$PACKET_STATUS_SELF_CHECK_JSON"

echo "first_external_receipt_packet_status_green=true"
echo "first_external_receipt_packet_status_discovery_green=true"
echo "first_external_receipt_packet_status_public_archive_download=false"
echo "first_external_receipt_packet_status_operator_local_export_only=true"
echo "first_external_receipt_packet_status_public_upload=false"
echo "first_external_receipt_packet_status_trusted_as_network_truth=false"

PACKET_STATUS_UI_HTML="$OUT/first-external-receipt-packet-status-ui.html"
curl -fsS "$LOCAL_BASE/public-node" > "$PACKET_STATUS_UI_HTML"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalReceiptPacketStatusCard" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalReceiptPacketStatusLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "Open packet status JSON" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-receipt-packet-status.json" "$PACKET_STATUS_UI_HTML"
grep -Fq "Public archive download:</span> <code>false</code>" "$PACKET_STATUS_UI_HTML"
grep -Fq "Operator-local export only:</span> <code>true</code>" "$PACKET_STATUS_UI_HTML"
grep -Fq "Trusted as network truth:</span> <code>false</code>" "$PACKET_STATUS_UI_HTML"

echo "first_external_receipt_packet_status_ui_green=true"
echo "first_external_receipt_packet_status_ui_link_green=true"
echo "first_external_receipt_packet_status_ui_public_archive_download=false"
echo "first_external_receipt_packet_status_ui_operator_local_export_only=true"
echo "first_external_receipt_packet_status_ui_trusted_as_network_truth=false"

IMPORTED_CLOSEOUT_PROOF_STATUS_JSON="$OUT/first-external-receipt-imported-closeout-proof-status.json"
curl -fsS "$LOCAL_BASE/public-node/first-external-receipt-imported-closeout-proof-status.json" > "$IMPORTED_CLOSEOUT_PROOF_STATUS_JSON"

python3 - "$IMPORTED_CLOSEOUT_PROOF_STATUS_JSON" <<'PYJSON'
import json
import sys
from pathlib import Path

j = json.loads(Path(sys.argv[1]).read_text())

assert j.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_V1"
assert j.get("route_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_ROUTE_V1"
assert j.get("status") == "first_external_receipt_imported_closeout_proof_green"
assert j.get("proof", {}).get("proof_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_V1_GREEN"

closeout = j.get("imported_closeout", {})
assert closeout.get("receipt_state") == "external_receipt_imported"
assert closeout.get("waiting_for_external_receipt") is False
assert closeout.get("latest_imported") is True
assert closeout.get("latest_result_tester") == "standalone-outside-tester"
assert closeout.get("latest_result_status") == "green"
assert closeout.get("operator_local_import_only") is True
assert closeout.get("trusted_as_network_truth") is False

policy = j.get("policy", {})
assert policy.get("public_upload") is False
assert policy.get("public_post_endpoint") is False
assert policy.get("operator_local_import_only") is True
assert policy.get("trusted_as_network_truth") is False

safety = j.get("safety", {})
assert safety.get("money_movement") is False
assert safety.get("wallet_send") is False
assert safety.get("wc_to_void_swap") is False
assert safety.get("buy_void_fulfillment") is False
assert safety.get("validator_mutation") is False

print("first_external_receipt_imported_closeout_proof_status_green=true")
print("first_external_receipt_imported_closeout_proof_status_receipt_state=external_receipt_imported")
print("first_external_receipt_imported_closeout_proof_status_latest_imported=true")
print("first_external_receipt_imported_closeout_proof_status_trusted_as_network_truth=false")
PYJSON

grep -Fq "/public-node/first-external-receipt-imported-closeout-proof-status.json" "$PACKET_STATUS_ROUTE_INDEX_JSON"
grep -Fq "/public-node/first-external-receipt-imported-closeout-proof-status.json" "$PACKET_STATUS_ROUTE_MANIFEST_JSON"
grep -Fq "/public-node/first-external-receipt-imported-closeout-proof-status.json" "$PACKET_STATUS_SELF_CHECK_JSON"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_STATUS_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalReceiptImportedCloseoutProofStatusLink" "$PACKET_STATUS_UI_HTML"

echo "first_external_receipt_imported_closeout_proof_status_discovery_green=true"
echo "first_external_receipt_imported_closeout_proof_status_ui_green=true"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_CLOSED_TOPLINE_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterClosedToplineCard" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterClosedToplineStatusLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterClosedToplineIntakeLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "First External Tester Closed" "$PACKET_STATUS_UI_HTML"
grep -Fq "external_receipt_imported" "$PACKET_STATUS_UI_HTML"
grep -Fq "standalone-outside-tester" "$PACKET_STATUS_UI_HTML"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_RECEIPT_IMPORTED_CLOSEOUT_PROOF_V1_GREEN" "$PACKET_STATUS_UI_HTML"
grep -Fq "first_external_receipt_imported_closeout_proof_status_green=true" "$PACKET_STATUS_UI_HTML"
grep -Fq "trusted_as_network_truth" "$PACKET_STATUS_UI_HTML"

echo "first_external_tester_closed_topline_card_ui_green=true"

EARNED_READINESS_JSON="$OUT/first-external-tester-earned-readiness.json"
curl -fsS "$LOCAL_BASE/public-node/first-external-tester-earned-readiness.json" > "$EARNED_READINESS_JSON"

python3 - "$EARNED_READINESS_JSON" <<'PYJSON'
import json
import sys
from pathlib import Path

j = json.loads(Path(sys.argv[1]).read_text())

assert j.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_V1"
assert j.get("route_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_ROUTE_V1"
assert j.get("status") == "external_tester_useful_work_evidence_ready_for_future_wc_accounting"

e = j.get("evidence", {})
assert e.get("evidence_ready") is True
assert e.get("actor_label") == "standalone-outside-tester"
assert e.get("machine_hint") == "N153B"
assert e.get("result") == "green"
assert e.get("receipt_state") == "external_receipt_imported"
assert e.get("latest_imported") is True
assert e.get("useful_work") is True
assert e.get("verifiable") is True
assert e.get("trusted_as_network_truth") is False

w = j.get("work_credit_readiness", {})
assert w.get("eligible_evidence_for_future_accounting") is True
assert w.get("candidate_record_ready") is True
assert w.get("award_created_now") is False
assert w.get("wc_ledger_mutated_now") is False
assert w.get("wc_credit_delta_now") == 0
assert w.get("payout_created_now") is False
assert w.get("redeemable_now") is False
assert w.get("wc_to_void_swap") is False

safety = j.get("safety", {})
assert safety.get("wc_ledger_write") is False
assert safety.get("wc_credit_award") is False
assert safety.get("wc_to_void_swap") is False
assert safety.get("money_movement") is False
assert safety.get("wallet_send") is False
assert safety.get("buy_void_fulfillment") is False
assert safety.get("validator_mutation") is False

print("first_external_tester_earned_readiness_green=true")
print("first_external_tester_earned_readiness_eligible_evidence=true")
print("first_external_tester_earned_readiness_award_created_now=false")
print("first_external_tester_earned_readiness_wc_ledger_mutated_now=false")
print("first_external_tester_earned_readiness_wc_credit_delta_now=0")
print("first_external_tester_earned_readiness_wc_to_void_swap=false")
PYJSON

grep -Fq "/public-node/first-external-tester-earned-readiness.json" "$PACKET_STATUS_ROUTE_INDEX_JSON"
grep -Fq "/public-node/first-external-tester-earned-readiness.json" "$PACKET_STATUS_ROUTE_MANIFEST_JSON"
grep -Fq "/public-node/first-external-tester-earned-readiness.json" "$PACKET_STATUS_SELF_CHECK_JSON"

echo "first_external_tester_earned_readiness_discovery_green=true"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterEarnedReadinessCard" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterEarnedReadinessLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterEarnedReadinessProofStatusLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "Earned Readiness: First External Tester" "$PACKET_STATUS_UI_HTML"
grep -Fq "Eligible evidence:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC ledger mutated now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC credit delta now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC→VOID swap:" "$PACKET_STATUS_UI_HTML"
grep -Fq "first_external_tester_earned_readiness_green=true" "$PACKET_STATUS_UI_HTML"

echo "first_external_tester_earned_readiness_card_ui_green=true"

WC_CANDIDATE_JSON="$OUT/first-external-tester-wc-candidate.json"
curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-candidate.json" > "$WC_CANDIDATE_JSON"

python3 - "$WC_CANDIDATE_JSON" <<'PYJSON'
import json
import sys
from pathlib import Path

j = json.loads(Path(sys.argv[1]).read_text())

assert j.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_V1"
assert j.get("route_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_ROUTE_V1"
assert j.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert j.get("candidate_status") == "pending_operator_review"
assert j.get("candidate_type") == "work_credit_candidate_evidence"

src = j.get("source_evidence", {})
assert src.get("actor_label") == "standalone-outside-tester"
assert src.get("machine_hint") == "N153B"
assert src.get("work_result") == "green"
assert src.get("receipt_state") == "external_receipt_imported"
assert src.get("useful_work") is True
assert src.get("verifiable") is True
assert src.get("externally_observed") is True
assert src.get("imported_operator_locally") is True
assert src.get("earned_readiness_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_EARNED_READINESS_V1"

b = j.get("accounting_boundary", {})
assert b.get("review_required_before_award") is True
assert b.get("award_created_now") is False
assert b.get("wc_ledger_mutated_now") is False
assert b.get("wc_credit_delta_now") == 0
assert b.get("payout_created_now") is False
assert b.get("redeemable_now") is False
assert b.get("wc_to_void_swap") is False
assert b.get("money_movement") is False
assert b.get("wallet_send") is False

safety = j.get("safety", {})
assert safety.get("wc_ledger_write") is False
assert safety.get("wc_credit_award") is False
assert safety.get("wc_to_void_swap") is False
assert safety.get("money_movement") is False
assert safety.get("wallet_send") is False
assert safety.get("buy_void_fulfillment") is False
assert safety.get("validator_mutation") is False

print("first_external_tester_wc_candidate_green=true")
print("first_external_tester_wc_candidate_status=pending_operator_review")
print("first_external_tester_wc_candidate_review_required_before_award=true")
print("first_external_tester_wc_candidate_award_created_now=false")
print("first_external_tester_wc_candidate_wc_ledger_mutated_now=false")
print("first_external_tester_wc_candidate_wc_credit_delta_now=0")
print("first_external_tester_wc_candidate_wc_to_void_swap=false")
PYJSON

grep -Fq "/public-node/first-external-tester-wc-candidate.json" "$PACKET_STATUS_ROUTE_INDEX_JSON"
grep -Fq "/public-node/first-external-tester-wc-candidate.json" "$PACKET_STATUS_ROUTE_MANIFEST_JSON"
grep -Fq "/public-node/first-external-tester-wc-candidate.json" "$PACKET_STATUS_SELF_CHECK_JSON"

echo "first_external_tester_wc_candidate_discovery_green=true"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcCandidateCard" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcCandidateLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcCandidateEarnedReadinessLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC Candidate: First External Tester" "$PACKET_STATUS_UI_HTML"
grep -Fq "Candidate status:" "$PACKET_STATUS_UI_HTML"
grep -Fq "pending_operator_review" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review required before award:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC ledger mutated now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC credit delta now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC→VOID swap:" "$PACKET_STATUS_UI_HTML"
grep -Fq "first_external_tester_wc_candidate_green=true" "$PACKET_STATUS_UI_HTML"

echo "first_external_tester_wc_candidate_card_ui_green=true"

WC_REVIEW_CHECKLIST_JSON="$OUT/first-external-tester-wc-review-checklist.json"
curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-review-checklist.json" > "$WC_REVIEW_CHECKLIST_JSON"

python3 - "$WC_REVIEW_CHECKLIST_JSON" <<'PYJSON'
import json
import sys
from pathlib import Path

j = json.loads(Path(sys.argv[1]).read_text())

assert j.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_V1"
assert j.get("route_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_ROUTE_V1"
assert j.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert j.get("review_state") == "pending_operator_review"
assert j.get("checklist_status") == "open"
assert j.get("review_required_before_award") is True
assert j.get("award_decision") == "not_decided"

g = j.get("approval_gates", {})
assert g.get("candidate_packet_present") is True
assert g.get("earned_readiness_present") is True
assert g.get("imported_closeout_proof_present") is True
assert g.get("receipt_state_external_imported") is True
assert g.get("useful_work_claim_present") is True
assert g.get("verifiable_claim_present") is True
assert g.get("external_observation_claim_present") is True
assert g.get("operator_local_import_confirmed") is True
assert g.get("manual_operator_acceptance_required") is True
assert g.get("ledger_write_allowed_now") is False
assert g.get("confirm_no_existing_award") is True
assert g.get("confirm_no_money_movement") is True
assert g.get("confirm_no_wallet_send") is True
assert g.get("confirm_no_wc_to_void_swap") is True

b = j.get("accounting_boundary", {})
assert b.get("award_created_now") is False
assert b.get("wc_ledger_mutated_now") is False
assert b.get("wc_credit_delta_now") == 0
assert b.get("proposed_wc_credit_delta") is None
assert b.get("payout_created_now") is False
assert b.get("redeemable_now") is False
assert b.get("wc_to_void_swap") is False
assert b.get("money_movement") is False
assert b.get("wallet_send") is False

safety = j.get("safety", {})
assert safety.get("wc_ledger_write") is False
assert safety.get("wc_credit_award") is False
assert safety.get("wc_to_void_swap") is False
assert safety.get("money_movement") is False
assert safety.get("wallet_send") is False
assert safety.get("buy_void_fulfillment") is False
assert safety.get("validator_mutation") is False

print("first_external_tester_wc_review_checklist_green=true")
print("first_external_tester_wc_review_checklist_state=pending_operator_review")
print("first_external_tester_wc_review_checklist_status=open")
print("first_external_tester_wc_review_checklist_review_required_before_award=true")
print("first_external_tester_wc_review_checklist_award_decision=not_decided")
print("first_external_tester_wc_review_checklist_ledger_write_allowed_now=false")
print("first_external_tester_wc_review_checklist_award_created_now=false")
print("first_external_tester_wc_review_checklist_wc_ledger_mutated_now=false")
print("first_external_tester_wc_review_checklist_wc_credit_delta_now=0")
print("first_external_tester_wc_review_checklist_wc_to_void_swap=false")
PYJSON

grep -Fq "/public-node/first-external-tester-wc-review-checklist.json" "$PACKET_STATUS_ROUTE_INDEX_JSON"
grep -Fq "/public-node/first-external-tester-wc-review-checklist.json" "$PACKET_STATUS_ROUTE_MANIFEST_JSON"
grep -Fq "/public-node/first-external-tester-wc-review-checklist.json" "$PACKET_STATUS_SELF_CHECK_JSON"

echo "first_external_tester_wc_review_checklist_discovery_green=true"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcReviewChecklistCard" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcReviewChecklistLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcReviewChecklistCandidateLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC Review Checklist: First External Tester" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review state:" "$PACKET_STATUS_UI_HTML"
grep -Fq "pending_operator_review" "$PACKET_STATUS_UI_HTML"
grep -Fq "Checklist status:" "$PACKET_STATUS_UI_HTML"
grep -Fq "open" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review required before award:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award decision:" "$PACKET_STATUS_UI_HTML"
grep -Fq "not_decided" "$PACKET_STATUS_UI_HTML"
grep -Fq "Ledger write allowed now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC ledger mutated now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC credit delta now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC→VOID swap:" "$PACKET_STATUS_UI_HTML"
grep -Fq "first_external_tester_wc_review_checklist_green=true" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-review-checklist.json" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-candidate.json" "$PACKET_STATUS_UI_HTML"

echo "first_external_tester_wc_review_checklist_card_ui_green=true"

WC_AWARD_POLICY_JSON="$OUT/first-external-tester-wc-award-policy.json"
curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-award-policy.json" > "$WC_AWARD_POLICY_JSON"

python3 - "$WC_AWARD_POLICY_JSON" <<'PYJSON'
import json
import sys
from pathlib import Path

j = json.loads(Path(sys.argv[1]).read_text())

assert j.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_V1"
assert j.get("route_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_ROUTE_V1"
assert j.get("policy_state") == "draft_public_read_only"
assert j.get("policy_version") == "first-external-tester-wc-award-policy-v1"
assert j.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"

required = j.get("required_review_record_before_any_award", {})
assert required.get("review_record_marker_required") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_V1"
assert required.get("candidate_id_required") is True
assert required.get("reviewer_required") is True
assert required.get("reviewed_at_utc_required") is True
assert required.get("review_outcome_required") is True
assert required.get("evidence_routes_required") is True
assert required.get("award_policy_version_required") is True
assert required.get("decision_reason_required") is True
assert required.get("operator_signature_or_local_attestation_required") is True
assert required.get("explicit_ledger_write_intent_required") is True
assert required.get("explicit_no_wallet_send_confirmation_required") is True
assert required.get("explicit_no_wc_to_void_swap_confirmation_required") is True

accepted = j.get("accepted_award_requirements", {})
assert accepted.get("candidate_status_must_be") == "pending_operator_review"
assert accepted.get("review_outcome_must_be") == "accepted_for_future_award"
assert accepted.get("proposed_wc_credit_delta_required") is True
assert accepted.get("proposed_wc_credit_delta_must_be_positive_integer") is True
assert accepted.get("manual_operator_acceptance_required") is True
assert accepted.get("separate_review_record_required_before_ledger_write") is True
assert accepted.get("ledger_write_allowed_by_this_policy_route_now") is False

state = j.get("current_state", {})
assert state.get("review_record_created_now") is False
assert state.get("review_outcome_now") == "not_decided"
assert state.get("award_decision_now") == "not_decided"
assert state.get("award_created_now") is False
assert state.get("wc_ledger_mutated_now") is False
assert state.get("wc_credit_delta_now") == 0
assert state.get("proposed_wc_credit_delta_now") is None
assert state.get("payout_created_now") is False
assert state.get("redeemable_now") is False
assert state.get("wc_to_void_swap") is False
assert state.get("money_movement") is False
assert state.get("wallet_send") is False

safety = j.get("safety", {})
assert safety.get("wc_review_record_write") is False
assert safety.get("wc_ledger_write") is False
assert safety.get("wc_credit_award") is False
assert safety.get("wc_to_void_swap") is False
assert safety.get("money_movement") is False
assert safety.get("wallet_send") is False
assert safety.get("buy_void_fulfillment") is False
assert safety.get("validator_mutation") is False

print("first_external_tester_wc_award_policy_green=true")
print("first_external_tester_wc_award_policy_state=draft_public_read_only")
print("first_external_tester_wc_award_policy_review_record_created_now=false")
print("first_external_tester_wc_award_policy_review_outcome_now=not_decided")
print("first_external_tester_wc_award_policy_award_decision_now=not_decided")
print("first_external_tester_wc_award_policy_award_created_now=false")
print("first_external_tester_wc_award_policy_wc_ledger_mutated_now=false")
print("first_external_tester_wc_award_policy_wc_credit_delta_now=0")
print("first_external_tester_wc_award_policy_wc_review_record_write=false")
print("first_external_tester_wc_award_policy_wc_ledger_write=false")
print("first_external_tester_wc_award_policy_wc_credit_award=false")
print("first_external_tester_wc_award_policy_wc_to_void_swap=false")
PYJSON

grep -Fq "/public-node/first-external-tester-wc-award-policy.json" "$PACKET_STATUS_ROUTE_INDEX_JSON"
grep -Fq "/public-node/first-external-tester-wc-award-policy.json" "$PACKET_STATUS_ROUTE_MANIFEST_JSON"
grep -Fq "/public-node/first-external-tester-wc-award-policy.json" "$PACKET_STATUS_SELF_CHECK_JSON"

echo "first_external_tester_wc_award_policy_discovery_green=true"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcAwardPolicyCard" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcAwardPolicyLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcAwardPolicyReviewChecklistLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC Award Policy: First External Tester" "$PACKET_STATUS_UI_HTML"
grep -Fq "Policy state:" "$PACKET_STATUS_UI_HTML"
grep -Fq "draft_public_read_only" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review record created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review outcome now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "not_decided" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award decision now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC ledger mutated now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC credit delta now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC review record write:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC ledger write:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC credit award:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC→VOID swap:" "$PACKET_STATUS_UI_HTML"
grep -Fq "first_external_tester_wc_award_policy_green=true" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-award-policy.json" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-review-checklist.json" "$PACKET_STATUS_UI_HTML"

echo "first_external_tester_wc_award_policy_card_ui_green=true"

WC_LANE_CLOSEOUT_JSON="$OUT/first-external-tester-wc-lane-closeout.json"
WC_LANE_CLOSEOUT_ROUTE_INDEX_JSON="$OUT/first-external-tester-wc-lane-closeout-route-index.json"
WC_LANE_CLOSEOUT_SELF_CHECK_JSON="$OUT/first-external-tester-wc-lane-closeout-self-check.json"
WC_LANE_CLOSEOUT_ROUTE_MANIFEST_JSON="$OUT/first-external-tester-wc-lane-closeout-route-manifest.json"

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-lane-closeout.json" > "$WC_LANE_CLOSEOUT_JSON"
curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$WC_LANE_CLOSEOUT_ROUTE_INDEX_JSON"
curl -fsS "$LOCAL_BASE/public-node/self-check-snapshot.json" > "$WC_LANE_CLOSEOUT_SELF_CHECK_JSON"
curl -fsS "$LOCAL_BASE/public-node/route-manifest.json" > "$WC_LANE_CLOSEOUT_ROUTE_MANIFEST_JSON"

python3 - "$WC_LANE_CLOSEOUT_JSON" "$WC_LANE_CLOSEOUT_ROUTE_INDEX_JSON" "$WC_LANE_CLOSEOUT_SELF_CHECK_JSON" "$WC_LANE_CLOSEOUT_ROUTE_MANIFEST_JSON" <<'PYJSON'
import json
import sys
from pathlib import Path

closeout = json.loads(Path(sys.argv[1]).read_text())
route_index = json.loads(Path(sys.argv[2]).read_text())
self_check = json.loads(Path(sys.argv[3]).read_text())
route_manifest = json.loads(Path(sys.argv[4]).read_text())

path = "/public-node/first-external-tester-wc-lane-closeout.json"

assert closeout.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_V1"
assert closeout.get("route_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_ROUTE_V1"
assert closeout.get("closeout_state") == "work_credit_lane_closed_read_only"
assert closeout.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"

chain = closeout.get("chain_summary", {})
assert chain.get("external_receipt_imported") is True
assert chain.get("earned_readiness_green") is True
assert chain.get("earned_readiness_card_ui_green") is True
assert chain.get("wc_candidate_green") is True
assert chain.get("wc_candidate_card_ui_green") is True
assert chain.get("wc_review_checklist_green") is True
assert chain.get("wc_review_checklist_card_ui_green") is True
assert chain.get("wc_award_policy_green") is True
assert chain.get("wc_award_policy_card_ui_green") is True

boundary = closeout.get("closeout_boundary", {})
assert boundary.get("review_record_created_now") is False
assert boundary.get("review_outcome_now") == "not_decided"
assert boundary.get("award_decision_now") == "not_decided"
assert boundary.get("award_created_now") is False
assert boundary.get("wc_ledger_mutated_now") is False
assert boundary.get("wc_credit_delta_now") == 0
assert boundary.get("proposed_wc_credit_delta_now") is None
assert boundary.get("wc_review_record_write") is False
assert boundary.get("wc_ledger_write") is False
assert boundary.get("wc_credit_award") is False
assert boundary.get("payout_created_now") is False
assert boundary.get("redeemable_now") is False
assert boundary.get("wc_to_void_swap") is False
assert boundary.get("money_movement") is False
assert boundary.get("wallet_send") is False

nxt = closeout.get("next_allowed_step", {})
assert nxt.get("name") == "operator_review_record_v1"
assert nxt.get("route_created_now") is False
assert nxt.get("requires_manual_operator_acceptance") is True
assert nxt.get("must_reference_award_policy_version") == "first-external-tester-wc-award-policy-v1"
assert nxt.get("must_not_mutate_ledger_automatically") is True

policy = closeout.get("policy_boundary", {})
assert policy.get("public_status_only") is True
assert policy.get("read_only") is True
assert policy.get("mutation") is False
assert policy.get("private_api") is False
assert policy.get("public_upload") is False
assert policy.get("public_post_endpoint") is False
assert policy.get("trusted_as_network_truth") is False

safety = closeout.get("safety", {})
assert safety.get("wc_review_record_write") is False
assert safety.get("wc_ledger_write") is False
assert safety.get("wc_credit_award") is False
assert safety.get("wc_to_void_swap") is False
assert safety.get("money_movement") is False
assert safety.get("wallet_send") is False
assert safety.get("buy_void_fulfillment") is False
assert safety.get("validator_mutation") is False

route_index_text = Path(sys.argv[2]).read_text()
self_check_text = Path(sys.argv[3]).read_text()
route_manifest_text = Path(sys.argv[4]).read_text()

assert path in route_index_text
assert "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_V1" in route_index_text
assert path in self_check_text
assert "first_external_tester_wc_lane_closeout" in self_check_text
assert "first_external_tester_wc_lane_closeout_present" in self_check_text
assert path in route_manifest_text
assert "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_V1" in route_manifest_text
PYJSON

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcLaneCloseoutCard" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcLaneCloseoutLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcLaneCloseoutAwardPolicyLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "First External Tester WC Lane Closeout" "$PACKET_STATUS_UI_HTML"
grep -Fq "work_credit_lane_closed_read_only" "$PACKET_STATUS_UI_HTML"
grep -Fq "External receipt imported:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Earned readiness:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC candidate:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review checklist:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award policy:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review record created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC ledger write:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC credit award:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC→VOID swap:" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-lane-closeout.json" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-award-policy.json" "$PACKET_STATUS_UI_HTML"

echo "first_external_tester_wc_lane_closeout_green=true"
echo "first_external_tester_wc_lane_closeout_state=work_credit_lane_closed_read_only"
echo "first_external_tester_wc_lane_closeout_review_record_created_now=false"
echo "first_external_tester_wc_lane_closeout_award_created_now=false"
echo "first_external_tester_wc_lane_closeout_wc_ledger_write=false"
echo "first_external_tester_wc_lane_closeout_wc_credit_award=false"
echo "first_external_tester_wc_lane_closeout_wc_to_void_swap=false"
echo "first_external_tester_wc_lane_closeout_card_ui_green=true"
echo "first_external_tester_wc_lane_closeout_discovery_green=true"

WC_REVIEW_RECORD_STUB_JSON="$OUT/first-external-tester-wc-review-record-stub.json"
WC_REVIEW_RECORD_STUB_ROUTE_INDEX_JSON="$OUT/first-external-tester-wc-review-record-stub-route-index.json"
WC_REVIEW_RECORD_STUB_SELF_CHECK_JSON="$OUT/first-external-tester-wc-review-record-stub-self-check.json"
WC_REVIEW_RECORD_STUB_ROUTE_MANIFEST_JSON="$OUT/first-external-tester-wc-review-record-stub-route-manifest.json"

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-review-record-stub.json" > "$WC_REVIEW_RECORD_STUB_JSON"
curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$WC_REVIEW_RECORD_STUB_ROUTE_INDEX_JSON"
curl -fsS "$LOCAL_BASE/public-node/self-check-snapshot.json" > "$WC_REVIEW_RECORD_STUB_SELF_CHECK_JSON"
curl -fsS "$LOCAL_BASE/public-node/route-manifest.json" > "$WC_REVIEW_RECORD_STUB_ROUTE_MANIFEST_JSON"

python3 - "$WC_REVIEW_RECORD_STUB_JSON" "$WC_REVIEW_RECORD_STUB_ROUTE_INDEX_JSON" "$WC_REVIEW_RECORD_STUB_SELF_CHECK_JSON" "$WC_REVIEW_RECORD_STUB_ROUTE_MANIFEST_JSON" <<'PYJSON'
import json
import sys
from pathlib import Path

stub = json.loads(Path(sys.argv[1]).read_text())
route_index_text = Path(sys.argv[2]).read_text()
self_check_text = Path(sys.argv[3]).read_text()
route_manifest_text = Path(sys.argv[4]).read_text()

path = "/public-node/first-external-tester-wc-review-record-stub.json"

assert stub.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_V1"
assert stub.get("route_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_ROUTE_V1"
assert stub.get("stub_state") == "template_only_no_review_record_created"
assert stub.get("candidate_id") == "first-external-tester-n153b-demo003-standalone-smoke-v1"
assert stub.get("review_record_marker_required") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_V1"
assert stub.get("award_policy_version") == "first-external-tester-wc-award-policy-v1"

assert stub.get("review_record_created_now") is False
assert stub.get("review_outcome_now") == "not_decided"
assert stub.get("award_decision_now") == "not_decided"
assert stub.get("award_created_now") is False
assert stub.get("wc_ledger_mutated_now") is False
assert stub.get("wc_credit_delta_now") == 0
assert stub.get("wc_review_record_write") is False
assert stub.get("wc_ledger_write") is False
assert stub.get("wc_credit_award") is False
assert stub.get("wc_to_void_swap") is False
assert stub.get("template_only") is True

fields = stub.get("template_fields", {})
assert fields.get("candidate_id_required") is True
assert fields.get("reviewer_required") is True
assert fields.get("reviewed_at_utc_required") is True
assert fields.get("review_outcome_required") is True
assert fields.get("allowed_review_outcomes") == ["accepted", "rejected", "deferred"]
assert fields.get("evidence_routes_required") is True
assert fields.get("award_policy_version_required") is True
assert fields.get("decision_reason_required") is True
assert fields.get("operator_signature_or_local_attestation_required") is True
assert fields.get("explicit_ledger_write_intent_required") is True
assert fields.get("explicit_no_wallet_send_confirmation_required") is True

req = stub.get("acceptance_requirements", {})
assert req.get("manual_operator_acceptance_required") is True
assert req.get("automatic_award_allowed") is False
assert req.get("automatic_ledger_write_allowed") is False

safety = stub.get("safety", {})
assert safety.get("review_record_created_now") is False
assert safety.get("wc_review_record_write") is False
assert safety.get("wc_ledger_write") is False
assert safety.get("wc_credit_award") is False
assert safety.get("payout_created_now") is False
assert safety.get("redeemable_now") is False
assert safety.get("wc_to_void_swap") is False
assert safety.get("money_movement") is False
assert safety.get("wallet_send") is False
assert safety.get("buy_void_fulfillment") is False
assert safety.get("validator_mutation") is False

assert path in route_index_text
assert "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_V1" in route_index_text
assert path in self_check_text
assert "first_external_tester_wc_review_record_stub" in self_check_text
assert "first_external_tester_wc_review_record_stub_present" in self_check_text
assert path in route_manifest_text
assert "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_V1" in route_manifest_text
PYJSON

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_UI_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcReviewRecordStubCard" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcReviewRecordStubLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcReviewRecordStubCloseoutLink" "$PACKET_STATUS_UI_HTML"
grep -Fq "Operator Review Record Stub" "$PACKET_STATUS_UI_HTML"
grep -Fq "template_only_no_review_record_created" "$PACKET_STATUS_UI_HTML"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_V1" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review record created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Review outcome now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award decision now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "Award created now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC ledger mutated now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC credit delta now:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC review record write:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC ledger write:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC credit award:" "$PACKET_STATUS_UI_HTML"
grep -Fq "WC→VOID swap:" "$PACKET_STATUS_UI_HTML"
grep -Fq "automatic_ledger_write_allowed=false" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-review-record-stub.json" "$PACKET_STATUS_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-lane-closeout.json" "$PACKET_STATUS_UI_HTML"

echo "first_external_tester_wc_review_record_stub_green=true"
echo "first_external_tester_wc_review_record_stub_state=template_only_no_review_record_created"
echo "first_external_tester_wc_review_record_stub_review_record_created_now=false"
echo "first_external_tester_wc_review_record_stub_award_created_now=false"
echo "first_external_tester_wc_review_record_stub_wc_ledger_write=false"
echo "first_external_tester_wc_review_record_stub_wc_credit_award=false"
echo "first_external_tester_wc_review_record_stub_wc_to_void_swap=false"
echo "first_external_tester_wc_review_record_stub_automatic_ledger_write_allowed=false"
echo "first_external_tester_wc_review_record_stub_card_ui_green=true"
echo "first_external_tester_wc_review_record_stub_discovery_green=true"


WC_REVIEW_DECISION_BOUNDARY_JSON="$OUT/first-external-tester-wc-review-decision-boundary.json"
WC_REVIEW_DECISION_BOUNDARY_ROUTE_INDEX_JSON="$OUT/first-external-tester-wc-review-decision-boundary-route-index.json"
WC_REVIEW_DECISION_BOUNDARY_SELF_CHECK_JSON="$OUT/first-external-tester-wc-review-decision-boundary-self-check.json"
WC_REVIEW_DECISION_BOUNDARY_ROUTE_MANIFEST_JSON="$OUT/first-external-tester-wc-review-decision-boundary-route-manifest.json"
WC_REVIEW_DECISION_BOUNDARY_UI_HTML="$OUT/first-external-tester-wc-review-decision-boundary-public-node.html"

curl -fsS "$LOCAL_BASE/public-node/first-external-tester-wc-review-decision-boundary.json" > "$WC_REVIEW_DECISION_BOUNDARY_JSON"
curl -fsS "$LOCAL_BASE/public-node/route-index.json" > "$WC_REVIEW_DECISION_BOUNDARY_ROUTE_INDEX_JSON"
curl -fsS "$LOCAL_BASE/public-node/self-check-snapshot.json" > "$WC_REVIEW_DECISION_BOUNDARY_SELF_CHECK_JSON"
curl -fsS "$LOCAL_BASE/public-node/route-manifest.json" > "$WC_REVIEW_DECISION_BOUNDARY_ROUTE_MANIFEST_JSON"
curl -fsS "$LOCAL_BASE/public-node" > "$WC_REVIEW_DECISION_BOUNDARY_UI_HTML"

python3 - "$WC_REVIEW_DECISION_BOUNDARY_JSON" "$WC_REVIEW_DECISION_BOUNDARY_ROUTE_INDEX_JSON" "$WC_REVIEW_DECISION_BOUNDARY_SELF_CHECK_JSON" "$WC_REVIEW_DECISION_BOUNDARY_ROUTE_MANIFEST_JSON" <<'PYJSON'
import json
import sys
from pathlib import Path

boundary = json.loads(Path(sys.argv[1]).read_text())
route_index = json.loads(Path(sys.argv[2]).read_text())
self_check = json.loads(Path(sys.argv[3]).read_text())
route_manifest = json.loads(Path(sys.argv[4]).read_text())

path = "/public-node/first-external-tester-wc-review-decision-boundary.json"

assert boundary.get("marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_V1"
assert boundary.get("route_marker") == "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_ROUTE_V1"
assert boundary.get("boundary_state") == "allowed_states_only_no_decision_record_created"
assert boundary.get("allowed_decision_states") == ["accepted", "rejected", "deferred"]
assert boundary.get("current_decision_state") == "not_decided"

guard = boundary.get("decision_boundary", boundary)

for key in [
    "decision_record_created_now",
    "review_record_created_now",
    "award_created_now",
    "wc_decision_record_write",
    "wc_review_record_write",
    "wc_ledger_write",
    "wc_credit_award",
    "wc_to_void_swap",
]:
    assert guard.get(key) is False, (key, guard.get(key))

automatic_ledger_write_allowed = guard.get("automatic_ledger_write_allowed")
assert automatic_ledger_write_allowed in (None, False), (
    "automatic_ledger_write_allowed",
    automatic_ledger_write_allowed,
)

blob = "\n".join([
    json.dumps(route_index, sort_keys=True),
    json.dumps(self_check, sort_keys=True),
    json.dumps(route_manifest, sort_keys=True),
])

assert path in blob
assert "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_V1" in blob
PYJSON

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_UI_V1" "$WC_REVIEW_DECISION_BOUNDARY_UI_HTML"
grep -Fq "publicNodeFirstExternalTesterWcReviewDecisionBoundaryCard" "$WC_REVIEW_DECISION_BOUNDARY_UI_HTML"
grep -Fq "Review Decision Boundary" "$WC_REVIEW_DECISION_BOUNDARY_UI_HTML"
grep -Fq "/public-node/first-external-tester-wc-review-decision-boundary.json" "$WC_REVIEW_DECISION_BOUNDARY_UI_HTML"

echo "first_external_tester_wc_review_decision_boundary_green=true"
echo "first_external_tester_wc_review_decision_boundary_state=allowed_states_only_no_decision_record_created"
echo "first_external_tester_wc_review_decision_boundary_current_decision_state=not_decided"
echo "first_external_tester_wc_review_decision_boundary_decision_record_created_now=false"
echo "first_external_tester_wc_review_decision_boundary_review_record_created_now=false"
echo "first_external_tester_wc_review_decision_boundary_award_created_now=false"
echo "first_external_tester_wc_review_decision_boundary_wc_decision_record_write=false"
echo "first_external_tester_wc_review_decision_boundary_wc_review_record_write=false"
echo "first_external_tester_wc_review_decision_boundary_wc_ledger_write=false"
echo "first_external_tester_wc_review_decision_boundary_wc_credit_award=false"
echo "first_external_tester_wc_review_decision_boundary_wc_to_void_swap=false"
echo "first_external_tester_wc_review_decision_boundary_automatic_ledger_write_allowed_not_true=true"
echo "first_external_tester_wc_review_decision_boundary_card_ui_green=true"
echo "first_external_tester_wc_review_decision_boundary_discovery_green=true"



LOCAL_BASE="$LOCAL_BASE" ops/mainnet0/public-node-first-external-tester-wc-operator-decision-packet-proof.sh > "$OUT/first-external-tester-wc-operator-decision-packet-proof.log"
grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_PROOF_V1_GREEN" "$OUT/first-external-tester-wc-operator-decision-packet-proof.log"

for line in \
  "packet_state=template_only_no_operator_decision_created" \
  "operator_decision_created_now=false" \
  "review_record_created_now=false" \
  "award_created_now=false" \
  "wc_ledger_mutated_now=false" \
  "wc_credit_delta_now=0" \
  "wc_ledger_write=false" \
  "wc_credit_award=false" \
  "wc_to_void_swap=false" \
  "automatic_ledger_write_allowed=false"; do
  grep -Fq "$line" "$OUT/first-external-tester-wc-operator-decision-packet-proof.log"
  echo "first_external_tester_wc_operator_decision_packet_$line"
done

grep -Fq "route=/public-node/first-external-tester-wc-operator-decision-packet.json" "$OUT/first-external-tester-wc-operator-decision-packet-proof.log"
grep -Fq "ui_marker=VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_UI_V1" "$OUT/first-external-tester-wc-operator-decision-packet-proof.log"
grep -Fq "card_id=publicNodeFirstExternalTesterWcOperatorDecisionPacketCard" "$OUT/first-external-tester-wc-operator-decision-packet-proof.log"

echo "first_external_tester_wc_operator_decision_packet_card_ui_green=true"
echo "first_external_tester_wc_operator_decision_packet_discovery_green=true"
echo "first_external_tester_wc_operator_decision_packet_green=true"


OPERATOR_DECISION_DRAFT_LOG="$OUT/first-external-tester-wc-operator-decision-draft-proof.log"
LOCAL_BASE="$LOCAL_BASE" ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft-proof.sh > "$OPERATOR_DECISION_DRAFT_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_PROOF_V1_GREEN" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "operator_decision_draft_green=true" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "operator_decision_draft_only=true" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "runtime_draft_written=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "operator_decision_created_now=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "review_record_created_now=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "decision_record_created_now=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "award_created_now=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "wc_credit_delta_now=0" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "wc_ledger_write=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "wc_credit_award=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "wc_to_void_swap=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "automatic_ledger_write_allowed=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "public_upload=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "trusted_as_network_truth=false" "$OPERATOR_DECISION_DRAFT_LOG"
grep -Fq "write_runtime_default=false" "$OPERATOR_DECISION_DRAFT_LOG"

echo "first_external_tester_wc_operator_decision_draft_green=true"
echo "first_external_tester_wc_operator_decision_draft_only=true"
echo "first_external_tester_wc_operator_decision_draft_runtime_draft_written=false"
echo "first_external_tester_wc_operator_decision_draft_operator_decision_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_review_record_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_decision_record_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_award_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_operator_decision_draft_wc_credit_delta_now=0"
echo "first_external_tester_wc_operator_decision_draft_wc_ledger_write=false"
echo "first_external_tester_wc_operator_decision_draft_wc_credit_award=false"
echo "first_external_tester_wc_operator_decision_draft_wc_to_void_swap=false"
echo "first_external_tester_wc_operator_decision_draft_automatic_ledger_write_allowed=false"
echo "first_external_tester_wc_operator_decision_draft_public_upload=false"
echo "first_external_tester_wc_operator_decision_draft_trusted_as_network_truth=false"
echo "first_external_tester_wc_operator_decision_draft_write_runtime_default=false"


OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG="$OUT/first-external-tester-wc-operator-decision-draft-runtime-write-proof.log"
LOCAL_BASE="$LOCAL_BASE" ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft-runtime-write-proof.sh > "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_PROOF_V1_GREEN" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "operator_decision_draft_runtime_write_green=true" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "write_runtime_opt_in_required=true" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "default_write_runtime_false_green=true" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "scratch_runtime_write_green=true" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "runtime_latest_draft_green=true" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "runtime_archive_draft_green=true" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "operator_decision_created_now=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "review_record_created_now=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "decision_record_created_now=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "award_created_now=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "wc_credit_delta_now=0" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "wc_ledger_write=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "wc_credit_award=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "wc_to_void_swap=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "automatic_ledger_write_allowed=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "public_upload=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "trusted_as_network_truth=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"
grep -Fq "live_runtime_write=false" "$OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_LOG"

echo "first_external_tester_wc_operator_decision_draft_runtime_write_green=true"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_opt_in_required=true"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_default_false_green=true"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_scratch_runtime_write_green=true"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_latest_draft_green=true"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_archive_draft_green=true"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_operator_decision_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_review_record_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_decision_record_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_award_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_wc_credit_delta_now=0"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_wc_ledger_write=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_wc_credit_award=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_wc_to_void_swap=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_automatic_ledger_write_allowed=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_public_upload=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_trusted_as_network_truth=false"
echo "first_external_tester_wc_operator_decision_draft_runtime_write_live_runtime_write=false"


OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG="$OUT/first-external-tester-wc-operator-decision-draft-live-runbook-proof.log"
OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_SCRATCH_DATA="$OUT/first-external-tester-wc-operator-decision-draft-live-runbook-runtime"

LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_SCRATCH_DATA" \
ops/mainnet0/public-node-first-external-tester-wc-operator-decision-draft-live-runbook-proof.sh > "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_PROOF_V1_GREEN" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "live_runbook_refuses_without_confirmation_green=true" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "operator_decision_draft_live_runbook_proof_green=true" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "live_runbook_explicit_confirmation_green=true" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "live_runtime_draft_written=true" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "operator_decision_created_now=false" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "review_record_created_now=false" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "decision_record_created_now=false" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "award_created_now=false" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "wc_credit_delta_now=0" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "wc_ledger_write=false" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "wc_credit_award=false" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"
grep -Fq "wc_to_void_swap=false" "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_LOG"

test -f "$OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_SCRATCH_DATA/public-node/first-external-tester-wc-operator-decision-drafts/latest-draft.json"

echo "first_external_tester_wc_operator_decision_draft_live_runbook_green=true"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_refusal_guard_green=true"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_explicit_confirmation_green=true"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_scratch_data_dir_green=true"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_runtime_draft_written=true"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_real_live_runtime_write=false"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_operator_decision_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_review_record_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_decision_record_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_award_created_now=false"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_wc_credit_delta_now=0"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_wc_ledger_write=false"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_wc_credit_award=false"
echo "first_external_tester_wc_operator_decision_draft_live_runbook_wc_to_void_swap=false"


OPERATOR_REVIEW_RECORD_RUNBOOK_LOG="$OUT/first-external-tester-wc-operator-review-record-runbook-proof.log"
OPERATOR_REVIEW_RECORD_RUNBOOK_SCRATCH_DATA="$OUT/first-external-tester-wc-operator-review-record-runbook-runtime"

LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OPERATOR_REVIEW_RECORD_RUNBOOK_SCRATCH_DATA" \
ops/mainnet0/public-node-first-external-tester-wc-operator-review-record-runbook-proof.sh > "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_PROOF_V1_GREEN" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "review_runbook_refuses_without_confirmation_green=true" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "review_runbook_source_draft_green=true" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "operator_review_record_runbook_proof_green=true" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "review_runbook_explicit_confirmation_green=true" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "local_review_record_written=true" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "review_record_created_now=true" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "operator_decision_created_now=false" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "decision_record_created_now=false" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "award_created_now=false" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "wc_credit_delta_now=0" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "wc_ledger_write=false" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "wc_credit_award=false" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"
grep -Fq "wc_to_void_swap=false" "$OPERATOR_REVIEW_RECORD_RUNBOOK_LOG"

test -f "$OPERATOR_REVIEW_RECORD_RUNBOOK_SCRATCH_DATA/public-node/first-external-tester-wc-review-records/latest-review-record.json"

echo "first_external_tester_wc_operator_review_record_runbook_green=true"
echo "first_external_tester_wc_operator_review_record_runbook_refusal_guard_green=true"
echo "first_external_tester_wc_operator_review_record_runbook_source_draft_green=true"
echo "first_external_tester_wc_operator_review_record_runbook_explicit_confirmation_green=true"
echo "first_external_tester_wc_operator_review_record_runbook_scratch_data_dir_green=true"
echo "first_external_tester_wc_operator_review_record_runbook_local_review_record_written=true"
echo "first_external_tester_wc_operator_review_record_runbook_real_live_runtime_write=false"
echo "first_external_tester_wc_operator_review_record_runbook_review_record_created_now=true"
echo "first_external_tester_wc_operator_review_record_runbook_operator_decision_created_now=false"
echo "first_external_tester_wc_operator_review_record_runbook_decision_record_created_now=false"
echo "first_external_tester_wc_operator_review_record_runbook_award_created_now=false"
echo "first_external_tester_wc_operator_review_record_runbook_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_operator_review_record_runbook_wc_credit_delta_now=0"
echo "first_external_tester_wc_operator_review_record_runbook_wc_ledger_write=false"
echo "first_external_tester_wc_operator_review_record_runbook_wc_credit_award=false"
echo "first_external_tester_wc_operator_review_record_runbook_wc_to_void_swap=false"


OPERATOR_DECISION_RECORD_RUNBOOK_LOG="$OUT/first-external-tester-wc-operator-decision-record-runbook-proof.log"
OPERATOR_DECISION_RECORD_RUNBOOK_SCRATCH_DATA="$OUT/first-external-tester-wc-operator-decision-record-runbook-runtime"

LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OPERATOR_DECISION_RECORD_RUNBOOK_SCRATCH_DATA" \
ops/mainnet0/public-node-first-external-tester-wc-operator-decision-record-runbook-proof.sh > "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_PROOF_V1_GREEN" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "decision_runbook_refuses_without_confirmation_green=true" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "decision_runbook_source_draft_green=true" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "decision_runbook_source_review_record_green=true" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "operator_decision_record_runbook_proof_green=true" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "decision_runbook_explicit_confirmation_green=true" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "local_decision_record_written=true" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "decision_record_created_now=true" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "operator_decision_created_now=false" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "review_record_created_now=false" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "award_created_now=false" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "wc_credit_delta_now=0" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "wc_ledger_write=false" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "wc_credit_award=false" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "wc_to_void_swap=false" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"
grep -Fq "award_write_allowed_now=false" "$OPERATOR_DECISION_RECORD_RUNBOOK_LOG"

test -f "$OPERATOR_DECISION_RECORD_RUNBOOK_SCRATCH_DATA/public-node/first-external-tester-wc-decision-records/latest-decision-record.json"

echo "first_external_tester_wc_operator_decision_record_runbook_green=true"
echo "first_external_tester_wc_operator_decision_record_runbook_refusal_guard_green=true"
echo "first_external_tester_wc_operator_decision_record_runbook_source_draft_green=true"
echo "first_external_tester_wc_operator_decision_record_runbook_source_review_record_green=true"
echo "first_external_tester_wc_operator_decision_record_runbook_explicit_confirmation_green=true"
echo "first_external_tester_wc_operator_decision_record_runbook_scratch_data_dir_green=true"
echo "first_external_tester_wc_operator_decision_record_runbook_local_decision_record_written=true"
echo "first_external_tester_wc_operator_decision_record_runbook_real_live_runtime_write=false"
echo "first_external_tester_wc_operator_decision_record_runbook_decision_record_created_now=true"
echo "first_external_tester_wc_operator_decision_record_runbook_operator_decision_created_now=false"
echo "first_external_tester_wc_operator_decision_record_runbook_review_record_created_now=false"
echo "first_external_tester_wc_operator_decision_record_runbook_award_created_now=false"
echo "first_external_tester_wc_operator_decision_record_runbook_award_write_allowed_now=false"
echo "first_external_tester_wc_operator_decision_record_runbook_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_operator_decision_record_runbook_wc_credit_delta_now=0"
echo "first_external_tester_wc_operator_decision_record_runbook_wc_ledger_write=false"
echo "first_external_tester_wc_operator_decision_record_runbook_wc_credit_award=false"
echo "first_external_tester_wc_operator_decision_record_runbook_wc_to_void_swap=false"


OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG="$OUT/first-external-tester-wc-operator-award-intent-packet-runbook-proof.log"
OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_SCRATCH_DATA="$OUT/first-external-tester-wc-operator-award-intent-packet-runbook-runtime"

LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_SCRATCH_DATA" \
ops/mainnet0/public-node-first-external-tester-wc-operator-award-intent-packet-runbook-proof.sh > "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_PROOF_V1_GREEN" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "award_intent_runbook_refuses_without_confirmation_green=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "award_intent_runbook_source_draft_green=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "award_intent_runbook_source_review_record_green=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "award_intent_runbook_source_decision_record_green=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "operator_award_intent_packet_runbook_proof_green=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "award_intent_runbook_explicit_confirmation_green=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "local_award_intent_packet_written=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "award_intent_packet_created_now=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "decision_record_created_now=false" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "award_created_now=false" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "award_write_allowed_now=false" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "wc_credit_delta_now=0" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "wc_ledger_write=false" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "wc_credit_award=false" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "wc_to_void_swap=false" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"
grep -Fq "proposed_wc_delta_only=true" "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_LOG"

test -f "$OPERATOR_AWARD_INTENT_PACKET_RUNBOOK_SCRATCH_DATA/public-node/first-external-tester-wc-award-intent-packets/latest-award-intent-packet.json"

echo "first_external_tester_wc_operator_award_intent_packet_runbook_green=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_refusal_guard_green=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_source_draft_green=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_source_review_record_green=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_source_decision_record_green=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_explicit_confirmation_green=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_scratch_data_dir_green=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_local_award_intent_packet_written=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_real_live_runtime_write=false"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_award_intent_packet_created_now=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_decision_record_created_now=false"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_award_created_now=false"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_award_write_allowed_now=false"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_wc_credit_delta_now=0"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_proposed_wc_delta_only=true"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_wc_ledger_write=false"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_wc_credit_award=false"
echo "first_external_tester_wc_operator_award_intent_packet_runbook_wc_to_void_swap=false"


OPERATOR_AWARD_RECORD_RUNBOOK_LOG="$OUT/first-external-tester-wc-operator-award-record-runbook-proof.log"
OPERATOR_AWARD_RECORD_RUNBOOK_SCRATCH_DATA="$OUT/first-external-tester-wc-operator-award-record-runbook-runtime"

LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OPERATOR_AWARD_RECORD_RUNBOOK_SCRATCH_DATA" \
ops/mainnet0/public-node-first-external-tester-wc-operator-award-record-runbook-proof.sh > "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_AWARD_RECORD_RUNBOOK_PROOF_V1_GREEN" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_record_runbook_refuses_without_confirmation_green=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_record_runbook_source_draft_green=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_record_runbook_source_review_record_green=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_record_runbook_source_decision_record_green=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_record_runbook_source_award_intent_packet_green=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "operator_award_record_runbook_proof_green=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_record_runbook_explicit_confirmation_green=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "local_award_record_written=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_record_created_now=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_created_now=false" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "award_write_allowed_now=false" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "wc_credit_delta_now=0" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "proposed_wc_delta_only=true" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "ledger_record_created_now=false" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "wc_ledger_write=false" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "wc_credit_award=false" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"
grep -Fq "wc_to_void_swap=false" "$OPERATOR_AWARD_RECORD_RUNBOOK_LOG"

test -f "$OPERATOR_AWARD_RECORD_RUNBOOK_SCRATCH_DATA/public-node/first-external-tester-wc-award-records/latest-award-record.json"

echo "first_external_tester_wc_operator_award_record_runbook_green=true"
echo "first_external_tester_wc_operator_award_record_runbook_refusal_guard_green=true"
echo "first_external_tester_wc_operator_award_record_runbook_source_draft_green=true"
echo "first_external_tester_wc_operator_award_record_runbook_source_review_record_green=true"
echo "first_external_tester_wc_operator_award_record_runbook_source_decision_record_green=true"
echo "first_external_tester_wc_operator_award_record_runbook_source_award_intent_packet_green=true"
echo "first_external_tester_wc_operator_award_record_runbook_explicit_confirmation_green=true"
echo "first_external_tester_wc_operator_award_record_runbook_scratch_data_dir_green=true"
echo "first_external_tester_wc_operator_award_record_runbook_local_award_record_written=true"
echo "first_external_tester_wc_operator_award_record_runbook_real_live_runtime_write=false"
echo "first_external_tester_wc_operator_award_record_runbook_award_record_created_now=true"
echo "first_external_tester_wc_operator_award_record_runbook_award_created_now=false"
echo "first_external_tester_wc_operator_award_record_runbook_award_write_allowed_now=false"
echo "first_external_tester_wc_operator_award_record_runbook_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_operator_award_record_runbook_wc_credit_delta_now=0"
echo "first_external_tester_wc_operator_award_record_runbook_proposed_wc_delta_only=true"
echo "first_external_tester_wc_operator_award_record_runbook_ledger_record_created_now=false"
echo "first_external_tester_wc_operator_award_record_runbook_wc_ledger_write=false"
echo "first_external_tester_wc_operator_award_record_runbook_wc_credit_award=false"
echo "first_external_tester_wc_operator_award_record_runbook_wc_to_void_swap=false"


OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG="$OUT/first-external-tester-wc-operator-ledger-entry-preview-runbook-proof.log"
OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_SCRATCH_DATA="$OUT/first-external-tester-wc-operator-ledger-entry-preview-runbook-runtime"

LOCAL_BASE="$LOCAL_BASE" \
DATA_DIR="$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_SCRATCH_DATA" \
ops/mainnet0/public-node-first-external-tester-wc-operator-ledger-entry-preview-runbook-proof.sh > "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_PROOF_V1_GREEN" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_entry_preview_runbook_refuses_without_confirmation_green=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_entry_preview_runbook_source_draft_green=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_entry_preview_runbook_source_review_record_green=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_entry_preview_runbook_source_decision_record_green=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_entry_preview_runbook_source_award_intent_packet_green=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_entry_preview_runbook_source_award_record_green=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "operator_ledger_entry_preview_runbook_proof_green=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_entry_preview_runbook_explicit_confirmation_green=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "local_ledger_entry_preview_written=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_entry_preview_created_now=true" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "award_record_created_now=false" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "award_created_now=false" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "award_write_allowed_now=false" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "ledger_record_created_now=false" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "wc_credit_delta_now=0" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "preview_wc_delta=0" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "wc_ledger_write=false" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "wc_credit_award=false" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"
grep -Fq "wc_to_void_swap=false" "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_LOG"

test -f "$OPERATOR_LEDGER_ENTRY_PREVIEW_RUNBOOK_SCRATCH_DATA/public-node/first-external-tester-wc-ledger-entry-previews/latest-ledger-entry-preview.json"

echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_refusal_guard_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_source_draft_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_source_review_record_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_source_decision_record_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_source_award_intent_packet_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_source_award_record_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_explicit_confirmation_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_scratch_data_dir_green=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_local_ledger_entry_preview_written=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_real_live_runtime_write=false"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_ledger_entry_preview_created_now=true"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_award_record_created_now=false"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_award_created_now=false"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_award_write_allowed_now=false"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_ledger_record_created_now=false"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_wc_credit_delta_now=0"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_preview_wc_delta=0"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_wc_ledger_write=false"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_wc_credit_award=false"
echo "first_external_tester_wc_operator_ledger_entry_preview_runbook_wc_to_void_swap=false"

echo "VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1_GREEN"
