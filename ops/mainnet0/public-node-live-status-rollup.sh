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


LEDGER_WRITE_RUNBOOK_DESIGN_LOG="$OUT/first-external-tester-wc-ledger-write-runbook-design-proof.log"

LOCAL_BASE="$LOCAL_BASE" \
ops/mainnet0/public-node-first-external-tester-wc-ledger-write-runbook-design-proof.sh > "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_RUNBOOK_DESIGN_PROOF_V1_GREEN" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "ledger_write_runbook_absent=true" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "design_doc_marker_green=true" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "ledger_write_boundary_still_locked_green=true" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "operator_ledger_write_runbook_design_green=true" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "ledger_write_runbook_design_only=true" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "ledger_write_runbook_created_now=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "ledger_write_allowed_now=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "ledger_record_created_now=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "ledger_entry_preview_created_now=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "award_record_created_now=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "award_created_now=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "award_write_allowed_now=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "wc_credit_delta_now=0" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "wc_ledger_write=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "wc_credit_award=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "wc_to_void_swap=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "automatic_ledger_write_allowed=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "money_movement=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "wallet_send=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "buy_void_fulfillment=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"
grep -Fq "validator_mutation=false" "$LEDGER_WRITE_RUNBOOK_DESIGN_LOG"

echo "first_external_tester_wc_ledger_write_runbook_design_green=true"
echo "first_external_tester_wc_ledger_write_runbook_design_only=true"
echo "first_external_tester_wc_ledger_write_runbook_absent=true"
echo "first_external_tester_wc_ledger_write_runbook_created_now=false"
echo "first_external_tester_wc_ledger_write_boundary_still_locked_green=true"
echo "first_external_tester_wc_ledger_write_allowed_now=false"
echo "first_external_tester_wc_ledger_record_created_now=false"
echo "first_external_tester_wc_ledger_entry_preview_created_now=false"
echo "first_external_tester_wc_award_record_created_now=false"
echo "first_external_tester_wc_award_created_now=false"
echo "first_external_tester_wc_award_write_allowed_now=false"
echo "first_external_tester_wc_ledger_write_runbook_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_ledger_write_runbook_wc_credit_delta_now=0"
echo "first_external_tester_wc_ledger_write_runbook_wc_ledger_write=false"
echo "first_external_tester_wc_ledger_write_runbook_wc_credit_award=false"
echo "first_external_tester_wc_ledger_write_runbook_wc_to_void_swap=false"
echo "first_external_tester_wc_ledger_write_runbook_automatic_ledger_write_allowed=false"
echo "first_external_tester_wc_ledger_write_runbook_money_movement=false"
echo "first_external_tester_wc_ledger_write_runbook_wallet_send=false"
echo "first_external_tester_wc_ledger_write_runbook_buy_void_fulfillment=false"
echo "first_external_tester_wc_ledger_write_runbook_validator_mutation=false"


LEDGER_WRITE_READINESS_STATUS_LOG="$OUT/first-external-tester-wc-ledger-write-readiness-status-proof.log"

LOCAL_BASE="$LOCAL_BASE" \
ops/mainnet0/public-node-first-external-tester-wc-ledger-write-readiness-status-proof.sh > "$LEDGER_WRITE_READINESS_STATUS_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_LEDGER_WRITE_READINESS_STATUS_PROOF_V1_GREEN" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "route_index_contains_readiness_status=true" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "self_check_contains_readiness_status=true" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "route_manifest_contains_readiness_status=true" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "readiness_state=blocked_not_ready_for_ledger_write" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "ready_for_ledger_write=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "ready_for_credit_award=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "operator_review_record_approved=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "operator_decision_record_approved=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "operator_award_intent_packet_approved=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "operator_award_record_approved=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "operator_ledger_entry_preview_reviewed=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "positive_nonzero_wc_delta_selected_by_operator=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "duplicate_ledger_entry_check_green=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "source_hash_chain_green=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "explicit_operator_ledger_write_confirmation_present=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "ledger_write_runbook_exists=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "ledger_write_runbook_proof_green=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "ledger_write_allowed_now=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "ledger_record_created_now=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "wc_ledger_mutated_now=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "wc_credit_delta_now=0" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "wc_ledger_write=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "wc_credit_award=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "wc_to_void_swap=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "automatic_ledger_write_allowed=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "money_movement=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "wallet_send=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "buy_void_fulfillment=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"
grep -Fq "validator_mutation=false" "$LEDGER_WRITE_READINESS_STATUS_LOG"

echo "first_external_tester_wc_ledger_write_readiness_status_green=true"
echo "first_external_tester_wc_ledger_write_readiness_status_state=blocked_not_ready_for_ledger_write"
echo "first_external_tester_wc_ledger_write_readiness_ready_for_ledger_write=false"
echo "first_external_tester_wc_ledger_write_readiness_ready_for_credit_award=false"
echo "first_external_tester_wc_ledger_write_readiness_operator_review_record_approved=false"
echo "first_external_tester_wc_ledger_write_readiness_operator_decision_record_approved=false"
echo "first_external_tester_wc_ledger_write_readiness_operator_award_intent_packet_approved=false"
echo "first_external_tester_wc_ledger_write_readiness_operator_award_record_approved=false"
echo "first_external_tester_wc_ledger_write_readiness_operator_ledger_entry_preview_reviewed=false"
echo "first_external_tester_wc_ledger_write_readiness_positive_nonzero_wc_delta_selected_by_operator=false"
echo "first_external_tester_wc_ledger_write_readiness_duplicate_ledger_entry_check_green=false"

SOURCE_HASH_CHAIN_DESIGN_LOG="$OUT/first-external-tester-wc-source-hash-chain-design-proof.log"

LOCAL_BASE="$LOCAL_BASE" \
ops/mainnet0/public-node-first-external-tester-wc-source-hash-chain-design-proof.sh > "$SOURCE_HASH_CHAIN_DESIGN_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_DESIGN_PROOF_V1_GREEN" "$SOURCE_HASH_CHAIN_DESIGN_LOG"
grep -Fq "source_hash_chain_design_green=true" "$SOURCE_HASH_CHAIN_DESIGN_LOG"
grep -Fq "source_hash_chain_design_only=true" "$SOURCE_HASH_CHAIN_DESIGN_LOG"
grep -Fq "source_hash_chain_green=false" "$SOURCE_HASH_CHAIN_DESIGN_LOG"
grep -Fq "ready_for_ledger_write=false" "$SOURCE_HASH_CHAIN_DESIGN_LOG"
grep -Fq "wc_ledger_write=false" "$SOURCE_HASH_CHAIN_DESIGN_LOG"
grep -Fq "wc_credit_award=false" "$SOURCE_HASH_CHAIN_DESIGN_LOG"
grep -Fq "wc_to_void_swap=false" "$SOURCE_HASH_CHAIN_DESIGN_LOG"

echo "first_external_tester_wc_source_hash_chain_design_green=true"
echo "first_external_tester_wc_source_hash_chain_design_only=true"
echo "first_external_tester_wc_source_hash_chain_green=false"
echo "first_external_tester_wc_source_hash_chain_ready_for_ledger_write=false"
echo "first_external_tester_wc_source_hash_chain_wc_ledger_write=false"
echo "first_external_tester_wc_source_hash_chain_wc_credit_award=false"
echo "first_external_tester_wc_source_hash_chain_wc_to_void_swap=false"

SOURCE_HASH_CHAIN_FIXTURE_LOG="$OUT/first-external-tester-wc-source-hash-chain-fixture-proof.log"

LOCAL_BASE="$LOCAL_BASE" \
ops/mainnet0/public-node-first-external-tester-wc-source-hash-chain-fixture-proof.sh > "$SOURCE_HASH_CHAIN_FIXTURE_LOG"

grep -Fq "VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_SOURCE_HASH_CHAIN_FIXTURE_PROOF_V1_GREEN" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "source_hash_chain_fixture_green=true" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "source_hash_chain_fixture_only=true" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "source_hash_chain_fixture_preview_only=true" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "source_hash_chain_fixture_preview_length=8" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "source_hash_chain_fixture_required_length=8" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "source_hash_chain_green=false" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "ready_for_ledger_write=false" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "wc_ledger_write=false" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "wc_credit_award=false" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"
grep -Fq "wc_to_void_swap=false" "$SOURCE_HASH_CHAIN_FIXTURE_LOG"

echo "first_external_tester_wc_source_hash_chain_fixture_green=true"
echo "first_external_tester_wc_source_hash_chain_fixture_only=true"
echo "first_external_tester_wc_source_hash_chain_fixture_preview_only=true"
echo "first_external_tester_wc_source_hash_chain_fixture_preview_length=8"
echo "first_external_tester_wc_source_hash_chain_fixture_required_length=8"
echo "first_external_tester_wc_source_hash_chain_fixture_source_hash_chain_green=false"
echo "first_external_tester_wc_source_hash_chain_fixture_ready_for_ledger_write=false"
echo "first_external_tester_wc_source_hash_chain_fixture_wc_ledger_write=false"
echo "first_external_tester_wc_source_hash_chain_fixture_wc_credit_award=false"
echo "first_external_tester_wc_source_hash_chain_fixture_wc_to_void_swap=false"

echo "first_external_tester_wc_ledger_write_readiness_source_hash_chain_green=false"
echo "first_external_tester_wc_ledger_write_readiness_explicit_operator_ledger_write_confirmation_present=false"
echo "first_external_tester_wc_ledger_write_readiness_ledger_write_runbook_exists=false"
echo "first_external_tester_wc_ledger_write_readiness_ledger_write_runbook_proof_green=false"
echo "first_external_tester_wc_ledger_write_readiness_ledger_write_allowed_now=false"
echo "first_external_tester_wc_ledger_write_readiness_ledger_record_created_now=false"
echo "first_external_tester_wc_ledger_write_readiness_wc_ledger_mutated_now=false"
echo "first_external_tester_wc_ledger_write_readiness_wc_credit_delta_now=0"
echo "first_external_tester_wc_ledger_write_readiness_wc_ledger_write=false"
echo "first_external_tester_wc_ledger_write_readiness_wc_credit_award=false"
echo "first_external_tester_wc_ledger_write_readiness_wc_to_void_swap=false"
echo "first_external_tester_wc_ledger_write_readiness_automatic_ledger_write_allowed=false"
echo "first_external_tester_wc_ledger_write_readiness_money_movement=false"
echo "first_external_tester_wc_ledger_write_readiness_wallet_send=false"
echo "first_external_tester_wc_ledger_write_readiness_buy_void_fulfillment=false"
echo "first_external_tester_wc_ledger_write_readiness_validator_mutation=false"

curl -fsS "$LOCAL_BASE/public-node/risk-register.json" > "$OUT/risk-register.json"
jq -e '.marker=="VOID_PUBLIC_NODE_RISK_REGISTER_V1"' "$OUT/risk-register.json" >/dev/null
jq -e '.risk_register_version=="v1"' "$OUT/risk-register.json" >/dev/null
jq -e '.risk_count==8' "$OUT/risk-register.json" >/dev/null
jq -e '.policy.public_mutation==false' "$OUT/risk-register.json" >/dev/null
jq -e '.policy.wc_credit_award==false' "$OUT/risk-register.json" >/dev/null
jq -e '.policy.wc_to_void_swap==false' "$OUT/risk-register.json" >/dev/null
echo "risk_register_live_status_rollup_green=true"
echo "risk_register_live_status_rollup_public_mutation=false"
echo "risk_register_live_status_rollup_wc_credit_award=false"
echo "risk_register_live_status_rollup_wc_to_void_swap=false"


echo "=== Runtime Gate Lock v1 rollup guard ==="
bash ops/mainnet0/public-node-runtime-gate-lock-proof.sh > "$OUT/runtime-gate-lock-proof.log"
grep -Fq "VOID_RUNTIME_GATE_LOCK_V1_GREEN" "$OUT/runtime-gate-lock-proof.log"
grep -Fq "runtime_gate_lock_green=true" "$OUT/runtime-gate-lock-proof.log"
grep -Fq "mutation_probes_checked=44" "$OUT/runtime-gate-lock-proof.log"
grep -Fq "fail_closed_count=44" "$OUT/runtime-gate-lock-proof.log"
echo "runtime_gate_lock_live_status_rollup_green=true"


echo "=== Capability Envelope v1 rollup guard ==="
bash ops/mainnet0/public-node-capability-envelope-v1-proof.sh > "$OUT/capability-envelope-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_CAPABILITY_ENVELOPE_PROOF_V1_GREEN" "$OUT/capability-envelope-v1-proof.log"
grep -Fq "capability_envelope_green=true" "$OUT/capability-envelope-v1-proof.log"
grep -Fq "capability_envelope_design_only=true" "$OUT/capability-envelope-v1-proof.log"
grep -Fq "capability_envelope_mutation_unlocked=false" "$OUT/capability-envelope-v1-proof.log"
grep -Fq "capability_envelope_mutation_probes_checked=8" "$OUT/capability-envelope-v1-proof.log"
grep -Fq "capability_envelope_fail_closed_count=8" "$OUT/capability-envelope-v1-proof.log"
echo "capability_envelope_live_status_rollup_green=true"


echo "=== Nonce Replay Protection Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-nonce-replay-protection-fixture-v1-proof.sh > "$OUT/nonce-replay-protection-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_NONCE_REPLAY_PROTECTION_FIXTURE_PROOF_V1_GREEN" "$OUT/nonce-replay-protection-fixture-v1-proof.log"
grep -Fq "nonce_replay_fixture_green=true" "$OUT/nonce-replay-protection-fixture-v1-proof.log"
grep -Fq "nonce_replay_fixture_design_only=true" "$OUT/nonce-replay-protection-fixture-v1-proof.log"
grep -Fq "nonce_replay_fixture_mutation_unlocked=false" "$OUT/nonce-replay-protection-fixture-v1-proof.log"
grep -Fq "nonce_replay_fixture_mutation_probes_checked=8" "$OUT/nonce-replay-protection-fixture-v1-proof.log"
grep -Fq "nonce_replay_fixture_fail_closed_count=8" "$OUT/nonce-replay-protection-fixture-v1-proof.log"
echo "nonce_replay_fixture_live_status_rollup_green=true"


echo "=== Controlled Earning Simulation Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-controlled-earning-simulation-fixture-v1-proof.sh > "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_CONTROLLED_EARNING_SIMULATION_FIXTURE_PROOF_V1_GREEN" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_green=true" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_simulation_only=true" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_mutation_unlocked=false" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_wc_ledger_write=false" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_wc_credit_award=false" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_wc_credit_delta_now=0" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_wc_to_void_swap=false" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_mutation_probes_checked=8" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
grep -Fq "controlled_earning_simulation_fixture_fail_closed_count=8" "$OUT/controlled-earning-simulation-fixture-v1-proof.log"
echo "controlled_earning_simulation_live_status_rollup_green=true"


echo "=== Resource Isolation Policy Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-resource-isolation-policy-fixture-v1-proof.sh > "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_RESOURCE_ISOLATION_POLICY_FIXTURE_PROOF_V1_GREEN" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_green=true" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_design_only=true" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_work_execution_open=false" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_mutation_unlocked=false" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_wc_ledger_write=false" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_wc_credit_award=false" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_wc_credit_delta_now=0" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_wc_to_void_swap=false" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_mutation_probes_checked=8" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
grep -Fq "resource_isolation_policy_fixture_fail_closed_count=8" "$OUT/resource-isolation-policy-fixture-v1-proof.log"
echo "resource_isolation_policy_live_status_rollup_green=true"


echo "=== Operator Controlled Earning Dry Run Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-controlled-earning-dry-run-fixture-v1-proof.sh > "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_CONTROLLED_EARNING_DRY_RUN_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_green=true" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_dry_run_only=true" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_work_execution_open=false" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_mutation_unlocked=false" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_operator_confirmation_present=false" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_dry_run_record_created_now=false" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_wc_ledger_write=false" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_wc_credit_award=false" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_wc_credit_delta_now=0" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_wc_to_void_swap=false" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_mutation_probes_checked=8" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
grep -Fq "operator_controlled_earning_dry_run_fixture_fail_closed_count=8" "$OUT/operator-controlled-earning-dry-run-fixture-v1-proof.log"
echo "operator_controlled_earning_dry_run_live_status_rollup_green=true"


echo "=== Operator Award Intent Packet Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-award-intent-packet-fixture-v1-proof.sh > "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_AWARD_INTENT_PACKET_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_green=true" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_intent_packet_only=true" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_work_execution_open=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_mutation_unlocked=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_operator_confirmation_present=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_award_intent_packet_created_now=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_award_record_created_now=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_ledger_entry_created_now=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_wc_ledger_write=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_wc_credit_award=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_wc_credit_delta_now=0" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_wc_to_void_swap=false" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_mutation_probes_checked=8" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
grep -Fq "operator_award_intent_packet_fixture_fail_closed_count=8" "$OUT/operator-award-intent-packet-fixture-v1-proof.log"
echo "operator_award_intent_packet_live_status_rollup_green=true"


echo "=== Operator Award Record Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-award-record-fixture-v1-proof.sh > "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_AWARD_RECORD_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_green=true" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_award_record_fixture_only=true" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_work_execution_open=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_mutation_unlocked=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_operator_confirmation_present=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_award_record_created_now=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_award_created_now=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_ledger_entry_created_now=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_ledger_record_created_now=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_wc_ledger_write=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_wc_credit_award=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_wc_credit_delta_now=0" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_wc_to_void_swap=false" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_mutation_probes_checked=8" "$OUT/operator-award-record-fixture-v1-proof.log"
grep -Fq "operator_award_record_fixture_fail_closed_count=8" "$OUT/operator-award-record-fixture-v1-proof.log"
echo "operator_award_record_live_status_rollup_green=true"


echo "=== Operator Ledger Entry Preview Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-entry-preview-fixture-v1-proof.sh > "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_ENTRY_PREVIEW_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_green=true" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_preview_only=true" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_work_execution_open=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_mutation_unlocked=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_operator_confirmation_present=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_ledger_entry_preview_created_now=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_ledger_entry_created_now=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_ledger_record_created_now=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_award_record_created_now=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_award_created_now=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_wc_ledger_write=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_wc_credit_award=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_wc_credit_delta_now=0" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_wc_to_void_swap=false" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_mutation_probes_checked=8" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
grep -Fq "operator_ledger_entry_preview_fixture_fail_closed_count=8" "$OUT/operator-ledger-entry-preview-fixture-v1-proof.log"
echo "operator_ledger_entry_preview_live_status_rollup_green=true"


echo "=== Operator Ledger Write Readiness Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-readiness-fixture-v1-proof.sh > "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_READINESS_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_green=true" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_readiness_only=true" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_state=blocked_not_ready_for_ledger_write" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_ready_for_ledger_write=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_source_hash_chain_green=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_explicit_confirmation_present=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_ledger_write_runbook_exists=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_ledger_write_runbook_proof_green=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_ledger_record_created_now=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_wc_ledger_write=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_wc_credit_award=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_wc_credit_delta_now=0" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_wc_to_void_swap=false" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_mutation_probes_checked=8" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_readiness_fixture_fail_closed_count=8" "$OUT/operator-ledger-write-readiness-fixture-v1-proof.log"
echo "operator_ledger_write_readiness_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Design v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-design-v1-proof.sh > "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DESIGN_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_green=true" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_only=true" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_state=runbook_not_executable" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_executable=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_runbook_exists=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_runbook_created_now=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_source_hash_chain_green=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_duplicate_ledger_entry_check_green=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_positive_nonzero_wc_delta_selected=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_cases=5" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_mutation_probes_checked=10" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_fail_closed_count=10" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_design_next_gate=operator_ledger_write_runbook_scratch_fixture_v1" "$OUT/operator-ledger-write-runbook-design-v1-proof.log"
echo "operator_ledger_write_runbook_design_live_status_rollup_green=true"



echo "=== Operator Ledger Write Runbook Scratch Fixture v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-scratch-fixture-v1-proof.sh > "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_FIXTURE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_green=true" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_only=true" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_state=scratch_only_no_live_ledger_write" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_scratch_candidate_created_now=true" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_tmp_only=true" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_wallet_send=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_validator_mutation=false" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_checks=8" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_mutation_probes_checked=11" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_fail_closed_count=11" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_fixture_next_gate=operator_ledger_write_runbook_scratch_receipt_v1" "$OUT/operator-ledger-write-runbook-scratch-fixture-v1-proof.log"
echo "operator_ledger_write_runbook_scratch_fixture_live_status_rollup_green=true"

echo "=== Operator Ledger Write Runbook Scratch Receipt v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-scratch-receipt-v1-proof.sh > "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SCRATCH_RECEIPT_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_green=true" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_only=true" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_state=scratch_receipt_no_live_ledger_write" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_created_now=true" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_tmp_only=true" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_candidate_sha256_green=true" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_wallet_send=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_validator_mutation=false" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_checks=11" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_mutation_probes_checked=12" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_fail_closed_count=12" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_scratch_receipt_next_gate=operator_ledger_write_runbook_live_refusal_guard_v1" "$OUT/operator-ledger-write-runbook-scratch-receipt-v1-proof.log"
echo "operator_ledger_write_runbook_scratch_receipt_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Live Refusal Guard v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-live-refusal-guard-v1-proof.sh > "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_REFUSAL_GUARD_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_green=true" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_only=true" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_state=live_ledger_write_refused_by_default" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_refusal_artifact_created_now=true" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_tmp_only=true" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_default_refuse_live_write=true" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_live_runtime_write_attempted_now=true" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_live_runtime_write_refused_now=true" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_wallet_send=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_validator_mutation=false" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_refusal_cases=7" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_refused_cases=7" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_mutation_probes_checked=13" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_fail_closed_count=13" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_refusal_guard_next_gate=operator_ledger_write_runbook_confirmation_boundary_v1" "$OUT/operator-ledger-write-runbook-live-refusal-guard-v1-proof.log"
echo "operator_ledger_write_runbook_live_refusal_guard_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Confirmation Boundary v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-confirmation-boundary-v1-proof.sh > "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_CONFIRMATION_BOUNDARY_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_green=true" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_only=true" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_state=confirmation_absent_live_write_locked" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_artifact_created_now=true" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_tmp_only=true" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_explicit_operator_confirmation_present=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_exact_operator_intent_present=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_exact_confirmation_phrase_present=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_confirmation_record_created_now=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_confirmation_unlock_created_now=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_wallet_send=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_validator_mutation=false" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_confirmation_cases=9" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_refused_cases=9" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_mutation_probes_checked=15" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_fail_closed_count=15" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_confirmation_boundary_next_gate=operator_ledger_write_runbook_exact_intent_packet_v1" "$OUT/operator-ledger-write-runbook-confirmation-boundary-v1-proof.log"
echo "operator_ledger_write_runbook_confirmation_boundary_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Exact Intent Packet v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-exact-intent-packet-v1-proof.sh > "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXACT_INTENT_PACKET_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_green=true" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_only=true" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_state=exact_intent_absent_live_write_locked" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_template_created_now=true" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_template_tmp_only=true" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_sha256_green=true" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_exact_operator_intent_present=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_exact_operator_intent_accepted_now=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_intent_unlock_created_now=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_confirmation_record_created_now=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_confirmation_unlock_created_now=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_wallet_send=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_validator_mutation=false" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_intent_cases=10" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_refused_cases=10" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_mutation_probes_checked=18" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_fail_closed_count=18" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_intent_packet_next_gate=operator_ledger_write_runbook_exact_confirmation_phrase_v1" "$OUT/operator-ledger-write-runbook-exact-intent-packet-v1-proof.log"
echo "operator_ledger_write_runbook_exact_intent_packet_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Exact Confirmation Phrase v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.sh > "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXACT_CONFIRMATION_PHRASE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_green=true" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_only=true" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_state=exact_confirmation_phrase_absent_live_write_locked" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_template_created_now=true" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_template_tmp_only=true" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_sha256_green=true" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_exact_phrase_present=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_exact_phrase_accepted_now=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_phrase_unlock_created_now=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_exact_operator_intent_present=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_intent_unlock_created_now=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_confirmation_record_created_now=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_confirmation_unlock_created_now=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_wallet_send=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_validator_mutation=false" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_phrase_cases=10" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_refused_cases=10" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_mutation_probes_checked=21" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_fail_closed_count=21" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_confirmation_phrase_next_gate=operator_ledger_write_runbook_live_unlock_boundary_v1" "$OUT/operator-ledger-write-runbook-exact-confirmation-phrase-v1-proof.log"
echo "operator_ledger_write_runbook_exact_confirmation_phrase_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Live Unlock Boundary v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-live-unlock-boundary-v1-proof.sh > "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_UNLOCK_BOUNDARY_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_green=true" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_only=true" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_state=live_unlock_absent_ledger_write_locked" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_template_created_now=true" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_template_tmp_only=true" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_sha256_green=true" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_explicit_live_write_unlock_present=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_live_write_unlock_created_now=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_live_write_unlock_accepted_now=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_unlock_record_created_now=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_exact_phrase_present=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_exact_operator_intent_present=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_confirmation_record_created_now=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_confirmation_unlock_created_now=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_wallet_send=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_validator_mutation=false" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_unlock_cases=11" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_refused_cases=11" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_mutation_probes_checked=24" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_fail_closed_count=24" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_unlock_boundary_next_gate=operator_ledger_write_runbook_final_prewrite_readiness_matrix_v1" "$OUT/operator-ledger-write-runbook-live-unlock-boundary-v1-proof.log"
echo "operator_ledger_write_runbook_live_unlock_boundary_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Final Prewrite Readiness Matrix v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.sh > "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_PREWRITE_READINESS_MATRIX_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_green=true" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_only=true" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_state=final_prewrite_matrix_blocked_not_ready" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_result=blocked_not_ready_for_live_ledger_write" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_artifact_created_now=true" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_tmp_only=true" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_sha256_green=true" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_allowed_to_apply_live_write_now=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_all_required_gates_green=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_gates=9" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_blocking_gates=4" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_source_hash_chain_green=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_duplicate_ledger_entry_check_green=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_positive_nonzero_wc_delta_selected_by_operator=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_ledger_entry_preview_reviewed=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_final_operator_apply_present=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_wallet_send=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_validator_mutation=false" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_readiness_cases=9" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_refused_cases=9" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_mutation_probes_checked=19" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_fail_closed_count=19" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_prewrite_readiness_matrix_next_gate=operator_ledger_write_runbook_source_hash_chain_green_v1" "$OUT/operator-ledger-write-runbook-final-prewrite-readiness-matrix-v1-proof.log"
echo "operator_ledger_write_runbook_final_prewrite_readiness_matrix_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Source Hash Chain Green v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-source-hash-chain-green-v1-proof.sh > "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SOURCE_HASH_CHAIN_GREEN_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green=true" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_only=true" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_state=source_hash_chain_green_no_live_write" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_artifact_created_now=true" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_tmp_only=true" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_sha256_green=true" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_length=8" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_required_length=8" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_duplicate_ledger_entry_check_green=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_positive_nonzero_wc_delta_selected_by_operator=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_ledger_entry_preview_reviewed=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_final_operator_apply_present=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_ledger_record_created_now=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_wc_ledger_mutated_now=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_wc_credit_award=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_wc_to_void_swap=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_wallet_send=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_validator_mutation=false" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_hash_chain_cases=5" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_mutation_probes_checked=17" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_fail_closed_count=17" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_source_hash_chain_green_next_gate=operator_ledger_write_runbook_duplicate_ledger_entry_check_green_v1" "$OUT/operator-ledger-write-runbook-source-hash-chain-green-v1-proof.log"
echo "operator_ledger_write_runbook_source_hash_chain_green_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Duplicate Ledger Entry Check Green v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.sh > "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_LEDGER_ENTRY_CHECK_GREEN_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green=true" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_only=true" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_duplicate_found=false" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_duplicate_count=0" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_source_hash_chain_green=true" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_positive_nonzero_wc_delta_selected_by_operator=false" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_ledger_entry_preview_reviewed=false" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_next_gate=operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_v1" "$OUT/operator-ledger-write-runbook-duplicate-ledger-entry-check-green-v1-proof.log"
echo "operator_ledger_write_runbook_duplicate_ledger_entry_check_green_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Positive Nonzero WC Delta Selected v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.sh > "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_POSITIVE_NONZERO_WC_DELTA_SELECTED_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected=true" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_only=true" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_delta=1" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_delta_unit=WC" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_duplicate_ledger_entry_check_green=true" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_ledger_entry_preview_reviewed=false" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_final_operator_apply_present=false" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_next_gate=operator_ledger_write_runbook_ledger_entry_preview_reviewed_v1" "$OUT/operator-ledger-write-runbook-positive-nonzero-wc-delta-selected-v1-proof.log"
echo "operator_ledger_write_runbook_positive_nonzero_wc_delta_selected_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Ledger Entry Preview Reviewed v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.sh > "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_ENTRY_PREVIEW_REVIEWED_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed=true" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_only=true" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_delta=1" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_delta_unit=WC" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_positive_nonzero_wc_delta_selected=true" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_final_operator_apply_present=false" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_entry_preview_reviewed_next_gate=operator_ledger_write_runbook_final_operator_apply_present_v1" "$OUT/operator-ledger-write-runbook-ledger-entry-preview-reviewed-v1-proof.log"
echo "operator_ledger_write_runbook_ledger_entry_preview_reviewed_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Final Operator Apply Present v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-final-operator-apply-present-v1-proof.sh > "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_APPLY_PRESENT_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_apply_present=true" "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_apply_present_ledger_entry_preview_reviewed=true" "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_apply_present_all_required_gates_green=false" "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_apply_present_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_apply_present_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_apply_present_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_apply_present_next_gate=operator_ledger_write_runbook_all_required_gates_green_v1" "$OUT/operator-ledger-write-runbook-final-operator-apply-present-v1-proof.log"
echo "operator_ledger_write_runbook_final_operator_apply_present_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook All Required Gates Green v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-all-required-gates-green-v1-proof.sh > "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_ALL_REQUIRED_GATES_GREEN_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_all_required_gates_green=true" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_all_required_gates_green_delta=1" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_all_required_gates_green_delta_unit=WC" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_all_required_gates_green_ready_for_ledger_write=false" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_all_required_gates_green_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_all_required_gates_green_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_all_required_gates_green_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_all_required_gates_green_next_gate=operator_ledger_write_runbook_ready_for_ledger_write_v1" "$OUT/operator-ledger-write-runbook-all-required-gates-green-v1-proof.log"
echo "operator_ledger_write_runbook_all_required_gates_green_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Ready For Ledger Write v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.sh > "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_READY_FOR_LEDGER_WRITE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ready_for_ledger_write=true" "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ready_for_ledger_write_delta=1" "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ready_for_ledger_write_delta_unit=WC" "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ready_for_ledger_write_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ready_for_ledger_write_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ready_for_ledger_write_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ready_for_ledger_write_next_gate=operator_ledger_write_runbook_ledger_write_allowed_boundary_v1" "$OUT/operator-ledger-write-runbook-ready-for-ledger-write-v1-proof.log"
echo "operator_ledger_write_runbook_ready_for_ledger_write_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Ledger Write Allowed Boundary v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.sh > "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LEDGER_WRITE_ALLOWED_BOUNDARY_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_write_allowed_boundary_reviewed=true" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_write_allowed_boundary_delta=1" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_write_allowed_boundary_delta_unit=WC" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_write_allowed_boundary_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_write_allowed_boundary_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_write_allowed_boundary_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_write_allowed_boundary_operator_must_confirm_write_after_this_gate=true" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_ledger_write_allowed_boundary_next_gate=operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_v1" "$OUT/operator-ledger-write-runbook-ledger-write-allowed-boundary-v1-proof.log"
echo "operator_ledger_write_runbook_ledger_write_allowed_boundary_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Explicit Operator Ledger Write Allowance v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.sh > "$OUT/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXPLICIT_OPERATOR_LEDGER_WRITE_ALLOWANCE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_reviewed=true" "$OUT/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_ledger_write_allowed_now=false" "$OUT/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_next_gate=operator_ledger_write_runbook_final_live_write_preflight_v1" "$OUT/operator-ledger-write-runbook-explicit-operator-ledger-write-allowance-v1-proof.log"
echo "operator_ledger_write_runbook_explicit_operator_ledger_write_allowance_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Final Live Write Preflight v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-final-live-write-preflight-v1-proof.sh > "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_LIVE_WRITE_PREFLIGHT_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_write_preflight_reviewed=true" "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_write_preflight_manual_terminal_execution_required=true" "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_write_preflight_final_live_write_unlock=false" "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_write_preflight_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_write_preflight_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_write_preflight_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_write_preflight_next_gate=operator_ledger_write_runbook_manual_live_write_execute_v1" "$OUT/operator-ledger-write-runbook-final-live-write-preflight-v1-proof.log"
echo "operator_ledger_write_runbook_final_live_write_preflight_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Manual Live Write Execute v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-manual-live-write-execute-v1-proof.sh > "$OUT/operator-ledger-write-runbook-manual-live-write-execute-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_MANUAL_LIVE_WRITE_EXECUTE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-manual-live-write-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_manual_live_write_execute_packet_reviewed=true" "$OUT/operator-ledger-write-runbook-manual-live-write-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_manual_live_write_execute_exact_operator_execute_command_present_now=false" "$OUT/operator-ledger-write-runbook-manual-live-write-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_manual_live_write_execute_requested_now=false" "$OUT/operator-ledger-write-runbook-manual-live-write-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_manual_live_write_execute_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-manual-live-write-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_manual_live_write_execute_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-manual-live-write-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_manual_live_write_execute_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-manual-live-write-execute-v1-proof.log"
echo "operator_ledger_write_runbook_manual_live_write_execute_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Exact Operator Execute Command v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.sh > "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_EXACT_OPERATOR_EXECUTE_COMMAND_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_operator_execute_command_packet_reviewed=true" "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_operator_execute_command_present_now=true" "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_operator_execute_command_requested_now=false" "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_operator_execute_command_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_operator_execute_command_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_operator_execute_command_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_exact_operator_execute_command_next_gate=operator_ledger_write_runbook_operator_requested_write_v1" "$OUT/operator-ledger-write-runbook-exact-operator-execute-command-v1-proof.log"
echo "operator_ledger_write_runbook_exact_operator_execute_command_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Operator Requested Write v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-operator-requested-write-v1-proof.sh > "$OUT/operator-ledger-write-runbook-operator-requested-write-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_OPERATOR_REQUESTED_WRITE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-operator-requested-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_requested_write_reviewed=true" "$OUT/operator-ledger-write-runbook-operator-requested-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_requested_write_requested_now=true" "$OUT/operator-ledger-write-runbook-operator-requested-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_requested_write_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-operator-requested-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_requested_write_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-operator-requested-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_requested_write_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-operator-requested-write-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_requested_write_next_gate=operator_ledger_write_runbook_live_write_unlock_v1" "$OUT/operator-ledger-write-runbook-operator-requested-write-v1-proof.log"
echo "operator_ledger_write_runbook_operator_requested_write_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Live Write Unlock v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-live-write-unlock-v1-proof.sh > "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_LIVE_WRITE_UNLOCK_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_write_unlock_reviewed=true" "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_write_unlock_requested_now=true" "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_write_unlock_unlocked_for_final_apply=true" "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_write_unlock_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_write_unlock_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_write_unlock_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_live_write_unlock_next_gate=operator_ledger_write_runbook_final_apply_v1" "$OUT/operator-ledger-write-runbook-live-write-unlock-v1-proof.log"
echo "operator_ledger_write_runbook_live_write_unlock_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Final Apply v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-final-apply-v1-proof.sh > "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_APPLY_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_apply_reviewed=true" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_apply_requested_now=true" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_apply_unlocked_for_final_apply=true" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_apply_review_passed=true" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_apply_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_apply_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_apply_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_apply_next_gate=operator_ledger_write_runbook_separate_live_mutation_v1" "$OUT/operator-ledger-write-runbook-final-apply-v1-proof.log"
echo "operator_ledger_write_runbook_final_apply_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Separate Live Mutation v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-separate-live-mutation-v1-proof.sh > "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_SEPARATE_LIVE_MUTATION_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_separate_live_mutation_reviewed=true" "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_separate_live_mutation_path_identified=true" "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_separate_live_mutation_requested_now=true" "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_separate_live_mutation_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_separate_live_mutation_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_separate_live_mutation_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_separate_live_mutation_next_gate=operator_ledger_write_runbook_dry_mutation_plan_v1" "$OUT/operator-ledger-write-runbook-separate-live-mutation-v1-proof.log"
echo "operator_ledger_write_runbook_separate_live_mutation_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Dry Mutation Plan v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-dry-mutation-plan-v1-proof.sh > "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DRY_MUTATION_PLAN_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_dry_mutation_plan_reviewed=true" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_dry_mutation_plan_dry_run_only=true" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_dry_mutation_plan_planned_wc_delta=1" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_dry_mutation_plan_actual_write_path_selected=false" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_dry_mutation_plan_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_dry_mutation_plan_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_dry_mutation_plan_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_dry_mutation_plan_next_gate=operator_ledger_write_runbook_pre_mutation_backup_v1" "$OUT/operator-ledger-write-runbook-dry-mutation-plan-v1-proof.log"
echo "operator_ledger_write_runbook_dry_mutation_plan_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Pre-Mutation Backup v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-pre-mutation-backup-v1-proof.sh > "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_reviewed=true" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_required=true" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execution_deferred=true" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_created_now=false" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_next_gate=operator_ledger_write_runbook_pre_mutation_backup_execute_v1" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-v1-proof.log"
echo "operator_ledger_write_runbook_pre_mutation_backup_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Pre-Mutation Backup Execute v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.sh > "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_backup_created_now=true" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_backup_file_created_now=true" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_ledger_snapshot_created_now=true" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_pre_mutation_backup_execute_next_gate=operator_ledger_write_runbook_duplicate_guard_recheck_v1" "$OUT/operator-ledger-write-runbook-pre-mutation-backup-execute-v1-proof.log"
echo "operator_ledger_write_runbook_pre_mutation_backup_execute_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Duplicate Guard Recheck v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.sh > "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_duplicate_found=false" "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_blocked=false" "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_read_only_scan=true" "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_duplicate_guard_recheck_next_gate=operator_ledger_write_runbook_final_mutation_command_hold_v1" "$OUT/operator-ledger-write-runbook-duplicate-guard-recheck-v1-proof.log"
echo "operator_ledger_write_runbook_duplicate_guard_recheck_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Final Mutation Command Hold v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.sh > "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_MUTATION_COMMAND_HOLD_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_command_withheld=true" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_command_printed_now=false" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_command_executed_now=false" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_execution_allowed_now=false" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_duplicate_found=false" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_mutation_command_hold_next_gate=operator_ledger_write_runbook_final_live_mutation_execute_packet_v1" "$OUT/operator-ledger-write-runbook-final-mutation-command-hold-v1-proof.log"
echo "operator_ledger_write_runbook_final_mutation_command_hold_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Final Live Mutation Execute Packet v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.sh > "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_LIVE_MUTATION_EXECUTE_PACKET_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_metadata_only=true" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_present=true" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_public_safe=true" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_contains_live_command=false" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_contains_private_command=false" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_command_printed_now=false" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_command_executed_now=false" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_execution_allowed_now=false" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_duplicate_found=false" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_live_mutation_execute_packet_next_gate=operator_ledger_write_runbook_private_live_mutation_command_request_v1" "$OUT/operator-ledger-write-runbook-final-live-mutation-execute-packet-v1-proof.log"
echo "operator_ledger_write_runbook_final_live_mutation_execute_packet_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Private Live Mutation Command Request v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.sh > "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRIVATE_LIVE_MUTATION_COMMAND_REQUEST_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_private_command_publicly_withheld=true" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_private_command_revealed_publicly=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_private_command_printed_now=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_private_command_executed_now=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_execution_allowed_now=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_public_route_contains_secret=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_public_route_contains_private_command=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_request_next_gate=operator_ledger_write_runbook_private_live_mutation_command_hold_v1" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-request-v1-proof.log"
echo "operator_ledger_write_runbook_private_live_mutation_command_request_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Private Live Mutation Command Hold v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.sh > "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRIVATE_LIVE_MUTATION_COMMAND_HOLD_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_private_command_held_outside_public_route=true" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_private_command_publicly_withheld=true" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_private_command_revealed_publicly=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_private_command_printed_now=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_private_command_executed_now=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_execution_allowed_now=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_public_route_contains_secret=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_public_route_contains_private_command=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_private_live_mutation_command_hold_next_gate=operator_ledger_write_runbook_final_operator_private_execute_v1" "$OUT/operator-ledger-write-runbook-private-live-mutation-command-hold-v1-proof.log"
echo "operator_ledger_write_runbook_private_live_mutation_command_hold_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Final Operator Private Execute v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-final-operator-private-execute-v1-proof.sh > "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_FINAL_OPERATOR_PRIVATE_EXECUTE_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_private_command_held_outside_public_route=true" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_private_command_publicly_withheld=true" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_private_command_revealed_publicly=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_private_command_printed_now=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_private_command_executed_now=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_execution_performed_now=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_execution_allowed_now=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_automatic_execute_allowed=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_public_route_contains_secret=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_public_route_contains_private_command=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_final_operator_private_execute_next_gate=operator_ledger_write_runbook_operator_terminal_execute_review_v1" "$OUT/operator-ledger-write-runbook-final-operator-private-execute-v1-proof.log"
echo "operator_ledger_write_runbook_final_operator_private_execute_live_status_rollup_green=true"


echo "=== Operator Ledger Write Runbook Operator Terminal Execute Review v1 rollup guard ==="
bash ops/mainnet0/public-node-operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.sh > "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_OPERATOR_TERMINAL_EXECUTE_REVIEW_PROOF_V1_GREEN" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_terminal_execute_allowed_now=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_terminal_execute_performed_now=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_private_command_held_outside_public_route=true" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_private_command_publicly_withheld=true" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_private_command_revealed_publicly=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_private_command_printed_now=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_private_command_executed_now=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_execution_allowed_now=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_automatic_execute_allowed=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_public_route_contains_secret=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_public_route_contains_private_command=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_live_runtime_write=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_wc_ledger_write=false" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_wc_credit_delta_now=0" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
grep -Fq "operator_ledger_write_runbook_operator_terminal_execute_review_next_gate=operator_ledger_write_runbook_operator_private_terminal_command_v1" "$OUT/operator-ledger-write-runbook-operator-terminal-execute-review-v1-proof.log"
echo "operator_ledger_write_runbook_operator_terminal_execute_review_live_status_rollup_green=true"


echo "=== DataNet Challenge v1 rollup guard ==="
BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-datanet-challenge-v1-proof.sh \
  > "$OUT/public-node-datanet-challenge-v1-proof.log"

grep -Fq "VOID_DATANET_CHALLENGE_V1_GREEN" "$OUT/public-node-datanet-challenge-v1-proof.log"
grep -Fq "datanet_challenge_success_fixture_green=true" "$OUT/public-node-datanet-challenge-v1-proof.log"
grep -Fq "datanet_challenge_missing_fixture_rejected=true" "$OUT/public-node-datanet-challenge-v1-proof.log"
grep -Fq "datanet_challenge_malformed_dataset_rejected=true" "$OUT/public-node-datanet-challenge-v1-proof.log"
grep -Fq "datanet_challenge_post_rejected=true" "$OUT/public-node-datanet-challenge-v1-proof.log"
grep -Fq "datanet_challenge_path_from_dataset_id=false" "$OUT/public-node-datanet-challenge-v1-proof.log"
grep -Fq "datanet_challenge_wc_credit_award=false" "$OUT/public-node-datanet-challenge-v1-proof.log"

echo "datanet_challenge_live_status_rollup_green=true"


echo "=== DataNet Challenge UI Card v1 rollup guard ==="
PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-datanet-challenge-ui-card-proof.sh \
  > "$OUT/public-node-datanet-challenge-ui-card-proof.log"

grep -Fq "VOID_DATANET_CHALLENGE_UI_PROOF_V1_GREEN" "$OUT/public-node-datanet-challenge-ui-card-proof.log"
grep -Fq "datanet_challenge_ui_card_present=true" "$OUT/public-node-datanet-challenge-ui-card-proof.log"
grep -Fq "datanet_challenge_ui_link_present=true" "$OUT/public-node-datanet-challenge-ui-card-proof.log"
grep -Fq "datanet_challenge_manifest_link_present=true" "$OUT/public-node-datanet-challenge-ui-card-proof.log"
grep -Fq "datanet_challenge_route_index_discovery_green=true" "$OUT/public-node-datanet-challenge-ui-card-proof.log"
grep -Fq "datanet_challenge_ui_path_from_dataset_id=false" "$OUT/public-node-datanet-challenge-ui-card-proof.log"
grep -Fq "datanet_challenge_ui_wc_credit_award=false" "$OUT/public-node-datanet-challenge-ui-card-proof.log"

echo "datanet_challenge_ui_card_live_status_rollup_green=true"


echo "=== DataNet Challenge Tester Copy Pack v1 rollup guard ==="
PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-datanet-challenge-tester-copy-pack-v1-proof.sh \
  > "$OUT/public-node-datanet-challenge-tester-copy-pack-v1-proof.log"

grep -Fq "VOID_DATANET_CHALLENGE_TESTER_COPY_PACK_PROOF_V1_GREEN" "$OUT/public-node-datanet-challenge-tester-copy-pack-v1-proof.log"
grep -Fq "datanet_challenge_tester_copy_pack_route_green=true" "$OUT/public-node-datanet-challenge-tester-copy-pack-v1-proof.log"
grep -Fq "datanet_challenge_tester_copy_pack_smoke_command_green=true" "$OUT/public-node-datanet-challenge-tester-copy-pack-v1-proof.log"
grep -Fq "datanet_challenge_tester_copy_pack_route_index_green=true" "$OUT/public-node-datanet-challenge-tester-copy-pack-v1-proof.log"
grep -Fq "datanet_challenge_tester_copy_pack_path_from_dataset_id=false" "$OUT/public-node-datanet-challenge-tester-copy-pack-v1-proof.log"
grep -Fq "datanet_challenge_tester_copy_pack_wc_credit_award=false" "$OUT/public-node-datanet-challenge-tester-copy-pack-v1-proof.log"

echo "datanet_challenge_tester_copy_pack_live_status_rollup_green=true"


echo "=== DataNet Challenge Offline Verify Pack v1 rollup guard ==="
BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-datanet-challenge-offline-verify-pack-v1-proof.sh \
  > "$OUT/public-node-datanet-challenge-offline-verify-pack-v1-proof.log"

grep -Fq "VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_PROOF_V1_GREEN" "$OUT/public-node-datanet-challenge-offline-verify-pack-v1-proof.log"
grep -Fq "datanet_challenge_offline_verify_pack_route_green=true" "$OUT/public-node-datanet-challenge-offline-verify-pack-v1-proof.log"
grep -Fq "datanet_challenge_offline_verify_pack_embedded_command_green=true" "$OUT/public-node-datanet-challenge-offline-verify-pack-v1-proof.log"
grep -Fq "datanet_challenge_offline_verify_pack_ledger_write=false" "$OUT/public-node-datanet-challenge-offline-verify-pack-v1-proof.log"
grep -Fq "datanet_challenge_offline_verify_pack_wc_credit_award=false" "$OUT/public-node-datanet-challenge-offline-verify-pack-v1-proof.log"

echo "datanet_challenge_offline_verify_pack_live_status_rollup_green=true"

echo "=== Skeptic / Audit Readiness Index v1 rollup guard ==="
PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-skeptic-audit-readiness-proof.sh \
  > "$OUT/public-node-skeptic-audit-readiness-proof.log"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_AUDIT_READINESS_PROOF_V1_GREEN" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_route_green=true" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_route_index_green=true" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_card_ui_green=true" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_doc_green=true" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_production_grade_claim=false" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_third_party_audit_complete=false" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_public_mutation=false" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_wc_consensus_asset=false" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_block_finality_power=false" "$OUT/public-node-skeptic-audit-readiness-proof.log"
grep -Fq "skeptic_audit_readiness_automated_validator_admission=false" "$OUT/public-node-skeptic-audit-readiness-proof.log"

echo "skeptic_audit_readiness_live_status_rollup_green=true"

echo "=== Skeptic Sybil / DDoS Threat Model v1 rollup guard ==="
PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-skeptic-sybil-ddos-threat-model-proof.sh \
  > "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_SYBIL_DDOS_THREAT_MODEL_PROOF_V1_GREEN" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_threat_model_route_green=true" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_threat_model_route_index_green=true" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_threat_model_card_ui_green=true" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_threat_model_doc_green=true" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_mitigation_complete=false" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_sybil_resistance_mature=false" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_rate_limit_claimed=false" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_reverse_proxy_ddos_claimed=false" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_public_private_process_isolation_complete=false" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_public_mutation=false" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_auto_validator_or_wc_award=false" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"
grep -Fq "skeptic_sybil_ddos_wc_block_finality_power=false" "$OUT/public-node-skeptic-sybil-ddos-threat-model-proof.log"

echo "skeptic_sybil_ddos_threat_model_live_status_rollup_green=true"

echo "=== Skeptic DataNet Poisoning Boundary v1 rollup guard ==="
PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-skeptic-datanet-poisoning-boundary-v1-proof.sh \
  > "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_DATANET_POISONING_BOUNDARY_PROOF_V1_GREEN" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_boundary_route_green=true" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_boundary_route_index_green=true" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_boundary_card_ui_green=true" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_boundary_doc_green=true" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_sha256_verifies_bytes_not_truth=true" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_valid_manifest_means_safe_content=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_served_by_public_node_means_trusted=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_public_upload_enabled=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_dataset_id_builds_filesystem_path=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_automatic_trust_promotion=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_automatic_ai_visibility_promotion=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_automatic_wc_award_from_dataset=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_automatic_ledger_write_from_dataset=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"
grep -Fq "skeptic_datanet_poisoning_automatic_validator_influence_from_dataset=false" "$OUT/public-node-skeptic-datanet-poisoning-boundary-v1-proof.log"

echo "skeptic_datanet_poisoning_boundary_live_status_rollup_green=true"

echo "=== Skeptic Work Credits Accounting Boundary v1 rollup guard ==="
PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-skeptic-work-credits-accounting-boundary-v1-proof.sh \
  > "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_PROOF_V1_GREEN" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_work_credits_accounting_boundary_route_green=true" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_work_credits_accounting_boundary_route_index_green=true" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_work_credits_accounting_boundary_card_ui_green=true" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_work_credits_accounting_boundary_doc_green=true" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_consensus_security_asset=VOID" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_work_credits_are_consensus_asset=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_work_credits_are_native_currency=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_work_credits_can_influence_block_finality=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_work_credits_can_directly_mutate_validator_set=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_public_wc_award_allowed=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_public_wc_ledger_write_allowed=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_public_wc_to_void_swap_allowed=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_public_money_movement_allowed=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_public_validator_mutation_allowed=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_public_evidence_can_create_automatic_award=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_manual_operator_review_only=true" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"
grep -Fq "skeptic_wc_accounting_public_route_can_execute_private_ledger_write=false" "$OUT/public-node-skeptic-work-credits-accounting-boundary-v1-proof.log"

echo "skeptic_work_credits_accounting_boundary_live_status_rollup_green=true"

echo "=== Skeptic Process Isolation Boundary v1 rollup guard ==="
PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-skeptic-process-isolation-boundary-v1-proof.sh \
  > "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_PROCESS_ISOLATION_BOUNDARY_PROOF_V1_GREEN" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_boundary_route_green=true" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_boundary_route_index_green=true" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_boundary_card_ui_green=true" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_boundary_doc_green=true" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_complete=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_public_routes_read_only=true" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_read_only_means_dos_proof=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_read_only_means_process_isolated=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_public_route_crash_can_affect_availability=true" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_socket_exhaustion_can_affect_availability=true" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_authorized_mutation_path_exists=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_public_core_ledger_mutation=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_public_wallet_key_mutation=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_public_validator_mutation=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_public_wc_award=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_verified_rate_limit=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"
grep -Fq "skeptic_process_isolation_verified_reverse_proxy_ddos=false" "$OUT/public-node-skeptic-process-isolation-boundary-v1-proof.log"

echo "skeptic_process_isolation_boundary_live_status_rollup_green=true"

echo "=== Skeptic External Reachability Boundary v1 rollup guard ==="
PUBLIC_NODE_BASE="${BASE:-http://127.0.0.1:4100}" \
  bash ops/mainnet0/public-node-skeptic-external-reachability-boundary-v1-proof.sh \
  > "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"

grep -Fq "VOID_PUBLIC_NODE_SKEPTIC_EXTERNAL_REACHABILITY_BOUNDARY_PROOF_V1_GREEN" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_boundary_route_green=true" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_boundary_route_index_green=true" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_boundary_card_ui_green=true" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_boundary_doc_green=true" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_loopback_ok_means_internet_reachable=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_public_base_url_means_uptime_guarantee=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_public_base_url_configured=true" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_cellular_manual_smoke_is_production_sla=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_lan_hairpin_timeout_alone_means_external_failure=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_external_tester_smoke_required_for_public_claim=true" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_public_mutation_from_reachability=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_public_wc_award_from_reachability=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_public_ledger_write_from_reachability=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_uptime_sla_claimed=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"
grep -Fq "skeptic_external_reachability_public_dos_resistance_claimed=false" "$OUT/public-node-skeptic-external-reachability-boundary-v1-proof.log"

echo "skeptic_external_reachability_boundary_live_status_rollup_green=true"


echo "=== DataNet Challenge Receipt Intake v1 rollup guard ==="
DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-receipt-intake-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-tester-result-receipt-v1.json" > "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/tester-result-receipt.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-receipt-intake-status-v1.json" > "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/receipt-intake-status.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_V1"' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/tester-result-receipt.json"
grep -Fq '"marker":"VOID_DATANET_CHALLENGE_RECEIPT_INTAKE_STATUS_V1"' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/receipt-intake-status.json"
grep -Fq '"operator_local_intake_only":true' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/tester-result-receipt.json"
grep -Fq '"operator_local_intake_only":true' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/receipt-intake-status.json"
grep -Fq '"public_submit_route_enabled":false' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/receipt-intake-status.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/tester-result-receipt.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/receipt-intake-status.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/tester-result-receipt.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/receipt-intake-status.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/tester-result-receipt.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/receipt-intake-status.json"
grep -Fq 'VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_RETURN_V1' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/tester-result-receipt.json"
grep -Fq '/public-node/datanet/challenge-tester-result-receipt-v1.json' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/route-index.json"
grep -Fq '/public-node/datanet/challenge-receipt-intake-status-v1.json' "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_receipt_intake_live_status_rollup_green=true"
echo "datanet_challenge_receipt_intake_operator_local_only=true"
echo "datanet_challenge_receipt_intake_public_submit_route_enabled=false"
echo "datanet_challenge_receipt_intake_ledger_write=false"
echo "datanet_challenge_receipt_intake_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_RECEIPT_INTAKE_ROLLUP_TMP"


echo "=== DataNet Challenge Imported Tester Receipt Fixture v1 rollup guard ==="
DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-imported-receipt-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-imported-tester-receipt-fixture-v1.json" > "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_IMPORTED_TESTER_RECEIPT_FIXTURE_V1"' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"ok":true' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"fixture_state":"operator_local_fixture_only"' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"receipt_marker":"VOID_DATANET_CHALLENGE_TESTER_RESULT_RECEIPT_RETURN_V1"' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"green_marker_seen":"VOID_DATANET_CHALLENGE_OFFLINE_VERIFY_PACK_SMOKE_V1_GREEN"' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/imported-receipt-fixture.json"
grep -Fq '/public-node/datanet/challenge-imported-tester-receipt-fixture-v1.json' "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_imported_tester_receipt_fixture_live_status_rollup_green=true"
echo "datanet_challenge_imported_tester_receipt_fixture_operator_local_only=true"
echo "datanet_challenge_imported_tester_receipt_fixture_public_submit_route_enabled=false"
echo "datanet_challenge_imported_tester_receipt_fixture_ledger_write=false"
echo "datanet_challenge_imported_tester_receipt_fixture_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_IMPORTED_RECEIPT_ROLLUP_TMP"


echo "=== DataNet Challenge Operator Review Record Fixture v1 rollup guard ==="
DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-operator-review-record-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-operator-review-record-fixture-v1.json" > "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_V1"' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"ok":true' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"fixture_state":"review_record_fixture_only"' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"review_decision_state":"accepted_for_future_wc_review"' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"review_decision_final":false' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"wc_delta_now":0' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/operator-review-record-fixture.json"
grep -Fq '/public-node/datanet/challenge-operator-review-record-fixture-v1.json' "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_operator_review_record_fixture_live_status_rollup_green=true"
echo "datanet_challenge_operator_review_record_fixture_decision_state=accepted_for_future_wc_review"
echo "datanet_challenge_operator_review_record_fixture_wc_delta_now=0"
echo "datanet_challenge_operator_review_record_fixture_public_submit_route_enabled=false"
echo "datanet_challenge_operator_review_record_fixture_ledger_write=false"
echo "datanet_challenge_operator_review_record_fixture_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_OPERATOR_REVIEW_ROLLUP_TMP"


echo "=== DataNet Challenge WC Candidate Fixture v1 rollup guard ==="
DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-wc-candidate-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-wc-candidate-fixture-v1.json" > "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_V1"' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"ok":true' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"fixture_state":"wc_candidate_fixture_only"' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"candidate_status":"candidate_only_not_awarded"' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"review_record_marker":"VOID_DATANET_CHALLENGE_OPERATOR_REVIEW_RECORD_FIXTURE_V1"' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"review_decision_state":"accepted_for_future_wc_review"' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"wc_delta_now":0' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"award_record_created_now":false' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/wc-candidate-fixture.json"
grep -Fq '/public-node/datanet/challenge-wc-candidate-fixture-v1.json' "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_wc_candidate_fixture_live_status_rollup_green=true"
echo "datanet_challenge_wc_candidate_fixture_status=candidate_only_not_awarded"
echo "datanet_challenge_wc_candidate_fixture_wc_delta_now=0"
echo "datanet_challenge_wc_candidate_fixture_award_record_created_now=false"
echo "datanet_challenge_wc_candidate_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_wc_candidate_fixture_ledger_write=false"
echo "datanet_challenge_wc_candidate_fixture_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_WC_CANDIDATE_ROLLUP_TMP"


echo "=== DataNet Challenge Positive WC Delta Selection Fixture v1 rollup guard ==="
DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-positive-wc-delta-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-positive-wc-delta-selection-fixture-v1.json" > "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_V1"' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"ok":true' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"fixture_state":"positive_wc_delta_selection_fixture_only"' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_candidate_marker":"VOID_DATANET_CHALLENGE_WC_CANDIDATE_FIXTURE_V1"' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"candidate_status_seen":"candidate_only_not_awarded"' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"selected_positive_wc_delta_fixture":true' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"proposed_wc_delta_fixture":100' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"proposed_wc_delta_final":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_delta_now":0' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"award_record_created_now":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"duplicate_ledger_check_performed_now":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/positive-wc-delta-selection-fixture.json"
grep -Fq '/public-node/datanet/challenge-positive-wc-delta-selection-fixture-v1.json' "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_positive_wc_delta_selection_fixture_live_status_rollup_green=true"
echo "datanet_challenge_positive_wc_delta_selection_fixture_selected=true"
echo "datanet_challenge_positive_wc_delta_selection_fixture_proposed_wc_delta=100"
echo "datanet_challenge_positive_wc_delta_selection_fixture_wc_delta_now=0"
echo "datanet_challenge_positive_wc_delta_selection_fixture_award_record_created_now=false"
echo "datanet_challenge_positive_wc_delta_selection_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_positive_wc_delta_selection_fixture_ledger_write=false"
echo "datanet_challenge_positive_wc_delta_selection_fixture_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_POSITIVE_WC_DELTA_ROLLUP_TMP"


echo "=== DataNet Challenge Award Intent Packet Fixture v1 rollup guard ==="
DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-award-intent-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-award-intent-packet-fixture-v1.json" > "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_V1"' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"ok":true' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"fixture_state":"award_intent_packet_fixture_only"' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"award_intent_packet_present":true' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"award_intent_packet_state":"intent_only_not_final_not_awarded"' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"positive_wc_delta_selection_marker":"VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_V1"' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"selected_positive_wc_delta_fixture":true' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"proposed_wc_delta_fixture":100' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"proposed_wc_delta_final":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"award_intent_created_now":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"award_intent_signed_now":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"award_intent_operator_approved_now":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"wc_delta_now":0' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"award_record_created_now":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"duplicate_ledger_check_performed_now":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/award-intent-packet-fixture.json"
grep -Fq '/public-node/datanet/challenge-award-intent-packet-fixture-v1.json' "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_award_intent_packet_fixture_live_status_rollup_green=true"
echo "datanet_challenge_award_intent_packet_fixture_present=true"
echo "datanet_challenge_award_intent_packet_fixture_state=intent_only_not_final_not_awarded"
echo "datanet_challenge_award_intent_packet_fixture_proposed_wc_delta=100"
echo "datanet_challenge_award_intent_packet_fixture_wc_delta_now=0"
echo "datanet_challenge_award_intent_packet_fixture_award_record_created_now=false"
echo "datanet_challenge_award_intent_packet_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_award_intent_packet_fixture_ledger_write=false"
echo "datanet_challenge_award_intent_packet_fixture_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_AWARD_INTENT_ROLLUP_TMP"


echo "=== DataNet Challenge Award Record Preview Fixture v1 rollup guard ==="
DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-award-record-preview-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-award-record-preview-fixture-v1.json" > "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_FIXTURE_V1"' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"ok":true' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"fixture_state":"award_record_preview_fixture_only"' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"award_record_preview_present":true' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"award_record_preview_state":"preview_only_not_created_not_awarded"' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"award_intent_packet_marker":"VOID_DATANET_CHALLENGE_AWARD_INTENT_PACKET_FIXTURE_V1"' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"positive_wc_delta_selection_marker":"VOID_DATANET_CHALLENGE_POSITIVE_WC_DELTA_SELECTION_FIXTURE_V1"' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"selected_positive_wc_delta_fixture":true' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"proposed_wc_delta_fixture":100' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"proposed_wc_delta_final":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"award_intent_packet_state_seen":"intent_only_not_final_not_awarded"' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"proposed_wc_delta":100' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"final_award_decision":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"wc_delta_now":0' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"award_record_created_now":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"duplicate_ledger_check_performed_now":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"operator_local_intake_only":true' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"public_submit_route_enabled":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/award-record-preview-fixture.json"
grep -Fq '/public-node/datanet/challenge-award-record-preview-fixture-v1.json' "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_award_record_preview_fixture_live_status_rollup_green=true"
echo "datanet_challenge_award_record_preview_fixture_present=true"
echo "datanet_challenge_award_record_preview_fixture_state=preview_only_not_created_not_awarded"
echo "datanet_challenge_award_record_preview_fixture_proposed_wc_delta=100"
echo "datanet_challenge_award_record_preview_fixture_wc_delta_now=0"
echo "datanet_challenge_award_record_preview_fixture_award_record_created_now=false"
echo "datanet_challenge_award_record_preview_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_award_record_preview_fixture_ledger_write=false"
echo "datanet_challenge_award_record_preview_fixture_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_ROLLUP_TMP"


echo "=== DataNet Challenge Duplicate Ledger Guard Recheck Fixture v1 rollup guard ==="
DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-duplicate-ledger-guard-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-duplicate-ledger-guard-recheck-fixture-v1.json" > "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_V1"' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"ok":true' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"fixture_state":"duplicate_ledger_guard_recheck_fixture_only"' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"duplicate_ledger_check_performed_now":true' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"duplicate_ledger_entry_found":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"duplicate_policy_state":"no_duplicate_found_fixture"' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"award_record_preview_marker":"VOID_DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_FIXTURE_V1"' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"award_record_preview_state_seen":"preview_only_not_created_not_awarded"' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"selected_positive_wc_delta_fixture":true' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"proposed_wc_delta_fixture":100' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"proposed_wc_delta_final":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"duplicate_found":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"existing_ledger_entry_id":null' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"safe_to_continue_to_future_ledger_entry_preview":true' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"wc_delta_now":0' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"award_record_created_now":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/duplicate-ledger-guard-recheck-fixture.json"
grep -Fq '/public-node/datanet/challenge-duplicate-ledger-guard-recheck-fixture-v1.json' "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_live_status_rollup_green=true"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_performed_now=true"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_duplicate_found=false"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_proposed_wc_delta=100"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_wc_delta_now=0"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_award_record_created_now=false"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_ledger_write=false"
echo "datanet_challenge_duplicate_ledger_guard_recheck_fixture_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_ROLLUP_TMP"


echo "=== DataNet Challenge Ledger Entry Preview Fixture v1 rollup guard ==="
DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-challenge-ledger-entry-preview-live-rollup-$$"
mkdir -p "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/challenge-ledger-entry-preview-fixture-v1.json" > "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/route-index.json"

grep -Fq '"marker":"VOID_DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_FIXTURE_V1"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"ok":true' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"dataset_id":"demo003-folder-fixture-v1"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"fixture_state":"ledger_entry_preview_fixture_only"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"ledger_entry_preview_present":true' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"ledger_entry_preview_state":"preview_only_not_created_not_written"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"duplicate_ledger_guard_recheck_marker":"VOID_DATANET_CHALLENGE_DUPLICATE_LEDGER_GUARD_RECHECK_FIXTURE_V1"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"duplicate_ledger_guard_recheck_seen":true' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"duplicate_ledger_entry_found":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"award_record_preview_marker":"VOID_DATANET_CHALLENGE_AWARD_RECORD_PREVIEW_FIXTURE_V1"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"award_record_preview_state_seen":"preview_only_not_created_not_awarded"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"selected_positive_wc_delta_fixture":true' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"proposed_wc_delta_fixture":100' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"proposed_wc_delta_final":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"ledger_entry_preview_delta":100' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"ledger_entry_preview_delta_units":"WC"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"ledger_entry_type":"datanet_challenge_wc_award_preview"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"source_duplicate_guard_state":"no_duplicate_found_fixture"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"delta":100' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"delta_units":"WC"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"direction":"credit"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"final_ledger_entry":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"wc_award_decision_now":"not_decided"' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"wc_award_decision_final":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"wc_delta_now":0' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"award_record_created_now":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"ledger_entry_created_now":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"ledger_write":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"wc_credit_award":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '"mutation":false' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/ledger-entry-preview-fixture.json"
grep -Fq '/public-node/datanet/challenge-ledger-entry-preview-fixture-v1.json' "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP/route-index.json"

echo "datanet_challenge_ledger_entry_preview_fixture_live_status_rollup_green=true"
echo "datanet_challenge_ledger_entry_preview_fixture_present=true"
echo "datanet_challenge_ledger_entry_preview_fixture_state=preview_only_not_created_not_written"
echo "datanet_challenge_ledger_entry_preview_fixture_duplicate_found=false"
echo "datanet_challenge_ledger_entry_preview_fixture_preview_delta=100"
echo "datanet_challenge_ledger_entry_preview_fixture_wc_delta_now=0"
echo "datanet_challenge_ledger_entry_preview_fixture_award_record_created_now=false"
echo "datanet_challenge_ledger_entry_preview_fixture_ledger_entry_created_now=false"
echo "datanet_challenge_ledger_entry_preview_fixture_ledger_write=false"
echo "datanet_challenge_ledger_entry_preview_fixture_wc_credit_award=false"

rm -rf "$DATANET_CHALLENGE_LEDGER_ENTRY_PREVIEW_ROLLUP_TMP"


echo "=== Data Plane / Settlement Plane Boundary v1 rollup guard ==="
DATANET_DATA_PLANE_SETTLEMENT_BOUNDARY_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-data-plane-settlement-boundary-live-rollup-$$"
mkdir -p "$DATANET_DATA_PLANE_SETTLEMENT_BOUNDARY_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/data-plane-settlement-plane-boundary-v1.json" > "$DATANET_DATA_PLANE_SETTLEMENT_BOUNDARY_ROLLUP_TMP/boundary.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_DATA_PLANE_SETTLEMENT_BOUNDARY_ROLLUP_TMP/route-index.json"

node - "$DATANET_DATA_PLANE_SETTLEMENT_BOUNDARY_ROLLUP_TMP/boundary.json" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const res = JSON.parse(fs.readFileSync(file, "utf8"));
const checks = [
  ["marker", res.marker === "VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_V1"],
  ["ok", res.ok === true],
  ["raw_datanet_payload_written_to_ledger", res.invariants?.raw_datanet_payload_written_to_ledger === false],
  ["public_route_can_mutate_ledger", res.invariants?.public_route_can_mutate_ledger === false],
  ["public_route_can_execute_shell", res.invariants?.public_route_can_execute_shell === false],
  ["current_mainnet0_financial_execution_claim", res.claims_and_boundaries?.current_mainnet0_financial_execution_claim === false],
  ["production_consensus_claim", res.claims_and_boundaries?.production_consensus_claim === false],
  ["future_hardening_required", res.claims_and_boundaries?.future_hardening_required === true],
  ["public_read_only", res.public_safety?.public_read_only === true],
  ["ledger_write", res.public_safety?.ledger_write === false],
  ["wc_credit_award", res.public_safety?.wc_credit_award === false],
  ["shell_execution", res.public_safety?.shell_execution === false],
  ["raw_payload_disclosure", res.public_safety?.raw_payload_disclosure === false],
  ["private_path_disclosure", res.public_safety?.private_path_disclosure === false],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error("boundary rollup invariant failed:", failed.join(", "));
  process.exit(1);
}
NODE

grep -Fq '/public-node/datanet/data-plane-settlement-plane-boundary-v1.json' "$DATANET_DATA_PLANE_SETTLEMENT_BOUNDARY_ROLLUP_TMP/route-index.json"
grep -Fq 'VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_DOC_V1' docs/public/public-node-datanet-data-plane-settlement-plane-boundary-v1.md
grep -Fq 'VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_UI_V1' src/index.ts
BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-data-plane-settlement-plane-boundary-v1-proof.sh | grep -Fq 'VOID_DATANET_DATA_PLANE_SETTLEMENT_PLANE_BOUNDARY_PROOF_V1_GREEN'

echo "datanet_data_plane_settlement_plane_boundary_live_status_rollup_green=true"
echo "datanet_data_plane_settlement_plane_boundary_raw_payload_written_to_ledger=false"
echo "datanet_data_plane_settlement_plane_boundary_public_route_can_mutate_ledger=false"
echo "datanet_data_plane_settlement_plane_boundary_public_route_can_execute_shell=false"
echo "datanet_data_plane_settlement_plane_boundary_current_mainnet0_financial_execution_claim=false"
echo "datanet_data_plane_settlement_plane_boundary_production_consensus_claim=false"
echo "datanet_data_plane_settlement_plane_boundary_future_hardening_required=true"

rm -rf "$DATANET_DATA_PLANE_SETTLEMENT_BOUNDARY_ROLLUP_TMP"


echo "=== DataNet Local Storage Path Isolation Boundary v1 rollup guard ==="
DATANET_LOCAL_STORAGE_PATH_ISOLATION_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-local-storage-path-isolation-live-rollup-$$"
mkdir -p "$DATANET_LOCAL_STORAGE_PATH_ISOLATION_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/local-storage-path-isolation-boundary-v1.json" > "$DATANET_LOCAL_STORAGE_PATH_ISOLATION_ROLLUP_TMP/boundary.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_LOCAL_STORAGE_PATH_ISOLATION_ROLLUP_TMP/route-index.json"

node - "$DATANET_LOCAL_STORAGE_PATH_ISOLATION_ROLLUP_TMP/boundary.json" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const res = JSON.parse(fs.readFileSync(file, "utf8"));
const checks = [
  ["marker", res.marker === "VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_V1"],
  ["ok", res.ok === true],
  ["dataset_ids_are_public_identifiers", res.public_identifier_policy?.dataset_ids_are_public_identifiers === true],
  ["dataset_ids_are_filesystem_paths", res.public_identifier_policy?.dataset_ids_are_filesystem_paths === false],
  ["request_dataset_id_used_to_build_filesystem_path", res.public_identifier_policy?.request_dataset_id_used_to_build_filesystem_path === false],
  ["public_routes_may_emit_operator_local_storage_root", res.public_identifier_policy?.public_routes_may_emit_operator_local_storage_root === false],
  ["public_routes_may_emit_absolute_filesystem_path", res.public_identifier_policy?.public_routes_may_emit_absolute_filesystem_path === false],
  ["local_storage_root_publicly_disclosed", res.isolation_invariants?.local_storage_root_publicly_disclosed === false],
  ["absolute_filesystem_path_publicly_disclosed", res.isolation_invariants?.absolute_filesystem_path_publicly_disclosed === false],
  ["private_home_path_publicly_disclosed", res.isolation_invariants?.private_home_path_publicly_disclosed === false],
  ["operator_env_publicly_disclosed", res.isolation_invariants?.operator_env_publicly_disclosed === false],
  ["shell_command_publicly_disclosed", res.isolation_invariants?.shell_command_publicly_disclosed === false],
  ["public_read_only", res.public_safety?.public_read_only === true],
  ["ledger_write", res.public_safety?.ledger_write === false],
  ["wc_credit_award", res.public_safety?.wc_credit_award === false],
  ["shell_execution", res.public_safety?.shell_execution === false],
  ["private_path_disclosure", res.public_safety?.private_path_disclosure === false],
  ["storage_root_disclosure", res.public_safety?.storage_root_disclosure === false],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error("local storage path isolation rollup invariant failed:", failed.join(", "));
  process.exit(1);
}
NODE

grep -Fq '/public-node/datanet/local-storage-path-isolation-boundary-v1.json' "$DATANET_LOCAL_STORAGE_PATH_ISOLATION_ROLLUP_TMP/route-index.json"
grep -Fq 'VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_DOC_V1' docs/public/public-node-datanet-local-storage-path-isolation-boundary-v1.md
grep -Fq 'VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_UI_V1' src/index.ts
BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-local-storage-path-isolation-boundary-v1-proof.sh | grep -Fq 'VOID_DATANET_LOCAL_STORAGE_PATH_ISOLATION_BOUNDARY_PROOF_V1_GREEN'

echo "datanet_local_storage_path_isolation_boundary_live_status_rollup_green=true"
echo "datanet_local_storage_path_isolation_boundary_dataset_ids_are_filesystem_paths=false"
echo "datanet_local_storage_path_isolation_boundary_request_dataset_id_used_to_build_filesystem_path=false"
echo "datanet_local_storage_path_isolation_boundary_local_storage_root_publicly_disclosed=false"
echo "datanet_local_storage_path_isolation_boundary_absolute_filesystem_path_publicly_disclosed=false"
echo "datanet_local_storage_path_isolation_boundary_private_home_path_publicly_disclosed=false"
echo "datanet_local_storage_path_isolation_boundary_ledger_write=false"
echo "datanet_local_storage_path_isolation_boundary_wc_credit_award=false"

rm -rf "$DATANET_LOCAL_STORAGE_PATH_ISOLATION_ROLLUP_TMP"


echo "=== DataNet Public Surface Path Leak Audit v1 rollup guard ==="
DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-public-surface-path-leak-audit-live-rollup-$$"
mkdir -p "$DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/public-surface-path-leak-audit-v1.json" > "$DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_ROLLUP_TMP/audit.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_ROLLUP_TMP/route-index.json"

node - "$DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_ROLLUP_TMP/audit.json" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const res = JSON.parse(fs.readFileSync(file, "utf8"));
const checks = [
  ["marker", res.marker === "VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_V1"],
  ["ok", res.ok === true],
  ["public_surface_only", res.audit_scope?.public_surface_only === true],
  ["operator_local_filesystem_scan", res.audit_scope?.operator_local_filesystem_scan === false],
  ["public_route_runtime_scan_required", res.audit_scope?.public_route_runtime_scan_required === true],
  ["routes_to_scan", Array.isArray(res.routes_to_scan) && res.routes_to_scan.length >= 10],
  ["concrete_private_path_leak_found", res.audit_assertions?.concrete_private_path_leak_found === false],
  ["concrete_command_hook_leak_found", res.audit_assertions?.concrete_command_hook_leak_found === false],
  ["concrete_key_material_leak_found", res.audit_assertions?.concrete_key_material_leak_found === false],
  ["concrete_token_like_value_leak_found", res.audit_assertions?.concrete_token_like_value_leak_found === false],
  ["public_routes_mutate_state", res.audit_assertions?.public_routes_mutate_state === false],
  ["public_routes_write_ledger", res.audit_assertions?.public_routes_write_ledger === false],
  ["public_routes_award_wc", res.audit_assertions?.public_routes_award_wc === false],
  ["public_read_only", res.public_safety?.public_read_only === true],
  ["ledger_write", res.public_safety?.ledger_write === false],
  ["wc_credit_award", res.public_safety?.wc_credit_award === false],
  ["shell_execution", res.public_safety?.shell_execution === false],
  ["private_path_disclosure", res.public_safety?.private_path_disclosure === false],
  ["storage_root_disclosure", res.public_safety?.storage_root_disclosure === false],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error("public surface path leak audit rollup invariant failed:", failed.join(", "));
  process.exit(1);
}
NODE

grep -Fq '/public-node/datanet/public-surface-path-leak-audit-v1.json' "$DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_ROLLUP_TMP/route-index.json"
grep -Fq 'VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_DOC_V1' docs/public/public-node-datanet-public-surface-path-leak-audit-v1.md
grep -Fq 'VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_UI_V1' src/index.ts
BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-public-surface-path-leak-audit-v1-proof.sh | grep -Fq 'VOID_DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_PROOF_V1_GREEN'

echo "datanet_public_surface_path_leak_audit_live_status_rollup_green=true"
echo "datanet_public_surface_path_leak_audit_routes_scanned=11"
echo "datanet_public_surface_path_leak_audit_concrete_private_path_leak_found=false"
echo "datanet_public_surface_path_leak_audit_concrete_command_hook_leak_found=false"
echo "datanet_public_surface_path_leak_audit_concrete_key_material_leak_found=false"
echo "datanet_public_surface_path_leak_audit_concrete_token_like_value_leak_found=false"
echo "datanet_public_surface_path_leak_audit_ledger_write=false"
echo "datanet_public_surface_path_leak_audit_wc_credit_award=false"

rm -rf "$DATANET_PUBLIC_SURFACE_PATH_LEAK_AUDIT_ROLLUP_TMP"


echo "=== DataNet Public Surface Mutation Method Audit v1 rollup guard ==="
DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-public-surface-mutation-method-audit-live-rollup-$$"
mkdir -p "$DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/public-surface-mutation-method-audit-v1.json" > "$DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_ROLLUP_TMP/audit.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_ROLLUP_TMP/route-index.json"

node - "$DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_ROLLUP_TMP/audit.json" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const res = JSON.parse(fs.readFileSync(file, "utf8"));
const checks = [
  ["marker", res.marker === "VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_V1"],
  ["ok", res.ok === true],
  ["public_surface_only", res.audit_scope?.public_surface_only === true],
  ["operator_local_mutation_scan", res.audit_scope?.operator_local_mutation_scan === false],
  ["public_route_runtime_scan_required", res.audit_scope?.public_route_runtime_scan_required === true],
  ["routes_to_audit", Array.isArray(res.routes_to_audit) && res.routes_to_audit.length >= 12],
  ["post_rejected", res.audit_assertions?.post_rejected === true],
  ["put_rejected", res.audit_assertions?.put_rejected === true],
  ["patch_rejected", res.audit_assertions?.patch_rejected === true],
  ["delete_rejected", res.audit_assertions?.delete_rejected === true],
  ["public_routes_mutate_state", res.audit_assertions?.public_routes_mutate_state === false],
  ["public_routes_write_ledger", res.audit_assertions?.public_routes_write_ledger === false],
  ["public_routes_award_wc", res.audit_assertions?.public_routes_award_wc === false],
  ["public_routes_execute_shell", res.audit_assertions?.public_routes_execute_shell === false],
  ["public_read_only", res.public_safety?.public_read_only === true],
  ["mutation", res.public_safety?.mutation === false],
  ["ledger_write", res.public_safety?.ledger_write === false],
  ["wc_credit_award", res.public_safety?.wc_credit_award === false],
  ["shell_execution", res.public_safety?.shell_execution === false],
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error("public surface mutation method audit rollup invariant failed:", failed.join(", "));
  process.exit(1);
}
NODE

grep -Fq '/public-node/datanet/public-surface-mutation-method-audit-v1.json' "$DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_ROLLUP_TMP/route-index.json"
grep -Fq 'VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_DOC_V1' docs/public/public-node-datanet-public-surface-mutation-method-audit-v1.md
grep -Fq 'VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_UI_V1' src/index.ts
BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-public-surface-mutation-method-audit-v1-proof.sh | grep -Fq 'VOID_DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_PROOF_V1_GREEN'

echo "datanet_public_surface_mutation_method_audit_live_status_rollup_green=true"
echo "datanet_public_surface_mutation_method_audit_routes_scanned=12"
echo "datanet_public_surface_mutation_method_audit_mutation_method_checks=48"
echo "datanet_public_surface_mutation_method_audit_post_rejected=true"
echo "datanet_public_surface_mutation_method_audit_put_rejected=true"
echo "datanet_public_surface_mutation_method_audit_patch_rejected=true"
echo "datanet_public_surface_mutation_method_audit_delete_rejected=true"
echo "datanet_public_surface_mutation_method_audit_mutation=false"
echo "datanet_public_surface_mutation_method_audit_ledger_write=false"
echo "datanet_public_surface_mutation_method_audit_wc_credit_award=false"
echo "datanet_public_surface_mutation_method_audit_shell_execution=false"

rm -rf "$DATANET_PUBLIC_SURFACE_MUTATION_METHOD_AUDIT_ROLLUP_TMP"


echo "=== DataNet Operator Local Publish Pack v1 rollup guard ==="
DATANET_OPERATOR_LOCAL_PUBLISH_PACK_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-operator-local-publish-pack-live-rollup-$$"
mkdir -p "$DATANET_OPERATOR_LOCAL_PUBLISH_PACK_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/operator-local-publish-pack-v1.json" > "$DATANET_OPERATOR_LOCAL_PUBLISH_PACK_ROLLUP_TMP/pack.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_OPERATOR_LOCAL_PUBLISH_PACK_ROLLUP_TMP/route-index.json"

node - "$DATANET_OPERATOR_LOCAL_PUBLISH_PACK_ROLLUP_TMP/pack.json" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const res = JSON.parse(fs.readFileSync(file, "utf8"));
const checks = [
  ["marker", res.marker === "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1"],
  ["ok", res.ok === true],
  ["script_path", res.operator_script?.path === "ops/mainnet0/datanet-operator-local-publish-v1.sh"],
  ["operator_terminal_only", res.operator_script?.mode === "operator_terminal_only"],
  ["accepts_public_http_mutation", res.operator_script?.accepts_public_http_mutation === false],
  ["manifest_marker", res.output_manifest?.marker === "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_MANIFEST_V1"],
  ["includes_absolute_source_path", res.output_manifest?.includes_absolute_source_path === false],
  ["includes_operator_home_path", res.output_manifest?.includes_operator_home_path === false],
  ["includes_local_storage_root", res.output_manifest?.includes_local_storage_root === false],
  ["terminal_only", res.safety?.terminal_only === true],
  ["public_post_upload", res.safety?.public_post_upload === false],
  ["public_mutation", res.safety?.public_mutation === false],
  ["source_path_disclosed", res.safety?.source_path_disclosed === false],
  ["local_storage_root_disclosed", res.safety?.local_storage_root_disclosed === false],
  ["ledger_write", res.safety?.ledger_write === false],
  ["wc_credit_award", res.safety?.wc_credit_award === false],
];
const failed = checks.filter((pair) => pair[1] === false).map((pair) => pair[0]);
if (failed.length > 0) {
  console.error("operator local publish pack rollup invariant failed:", failed.join(", "));
  process.exit(1);
}
NODE

test -x ops/mainnet0/datanet-operator-local-publish-v1.sh
grep -Fq '/public-node/datanet/operator-local-publish-pack-v1.json' "$DATANET_OPERATOR_LOCAL_PUBLISH_PACK_ROLLUP_TMP/route-index.json"
grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_DOC_V1' docs/public/public-node-datanet-operator-local-publish-pack-v1.md
grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_UI_V1' src/index.ts
BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-operator-local-publish-pack-v1-proof.sh | grep -Fq 'VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_PROOF_V1_GREEN'

echo "datanet_operator_local_publish_pack_live_status_rollup_green=true"
echo "datanet_operator_local_publish_pack_script_present=true"
echo "datanet_operator_local_publish_pack_generated_manifest_green=true"
echo "datanet_operator_local_publish_pack_public_safe_manifest_written=true"
echo "datanet_operator_local_publish_pack_absolute_paths_in_manifest=false"
echo "datanet_operator_local_publish_pack_operator_home_path_in_manifest=false"
echo "datanet_operator_local_publish_pack_local_storage_root_in_manifest=false"
echo "datanet_operator_local_publish_pack_public_mutation=false"
echo "datanet_operator_local_publish_pack_ledger_write=false"
echo "datanet_operator_local_publish_pack_wc_credit_award=false"

rm -rf "$DATANET_OPERATOR_LOCAL_PUBLISH_PACK_ROLLUP_TMP"


echo "=== DataNet Published Dataset Registry v1 rollup guard ==="
DATANET_PUBLISHED_DATASET_REGISTRY_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-published-dataset-registry-live-rollup-$$"
mkdir -p "$DATANET_PUBLISHED_DATASET_REGISTRY_ROLLUP_TMP"

curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/datanet/published-dataset-registry-v1.json" > "$DATANET_PUBLISHED_DATASET_REGISTRY_ROLLUP_TMP/registry.json"
curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json" > "$DATANET_PUBLISHED_DATASET_REGISTRY_ROLLUP_TMP/route-index.json"

node - "$DATANET_PUBLISHED_DATASET_REGISTRY_ROLLUP_TMP/registry.json" <<'NODE'
const fs = require("node:fs");
const file = process.argv[2];
const res = JSON.parse(fs.readFileSync(file, "utf8"));
const checks = [
  ["marker", res.marker === "VOID_DATANET_PUBLISHED_DATASET_REGISTRY_V1"],
  ["ok", res.ok === true],
  ["operator_published_manifests", res.registry_scope?.operator_published_manifests === true],
  ["public_safe_metadata_only", res.registry_scope?.public_safe_metadata_only === true],
  ["fixed_operator_publish_root", res.registry_scope?.fixed_operator_publish_root === true],
  ["request_dataset_id_used_to_build_filesystem_path", res.registry_scope?.request_dataset_id_used_to_build_filesystem_path === false],
  ["route_accepts_dataset_id_parameter", res.registry_scope?.route_accepts_dataset_id_parameter === false],
  ["public_read_only", res.public_safety?.public_read_only === true],
  ["public_mutation", res.public_safety?.public_mutation === false],
  ["public_post_upload", res.public_safety?.public_post_upload === false],
  ["source_path_disclosed", res.public_safety?.source_path_disclosed === false],
  ["absolute_source_path_disclosed", res.public_safety?.absolute_source_path_disclosed === false],
  ["operator_home_path_disclosed", res.public_safety?.operator_home_path_disclosed === false],
  ["local_storage_root_disclosed", res.public_safety?.local_storage_root_disclosed === false],
  ["ledger_write", res.public_safety?.ledger_write === false],
  ["wc_credit_award", res.public_safety?.wc_credit_award === false],
];
const failed = checks.filter((pair) => pair[1] === false).map((pair) => pair[0]);
if (failed.length > 0) {
  console.error("published dataset registry rollup invariant failed:", failed.join(", "));
  process.exit(1);
}
NODE

grep -Fq '/public-node/datanet/published-dataset-registry-v1.json' "$DATANET_PUBLISHED_DATASET_REGISTRY_ROLLUP_TMP/route-index.json"
grep -Fq 'VOID_DATANET_PUBLISHED_DATASET_REGISTRY_DOC_V1' docs/public/public-node-datanet-published-dataset-registry-v1.md
grep -Fq 'VOID_DATANET_PUBLISHED_DATASET_REGISTRY_UI_V1' src/index.ts
BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-published-dataset-registry-v1-proof.sh | grep -Fq 'VOID_DATANET_PUBLISHED_DATASET_REGISTRY_PROOF_V1_GREEN'

echo "datanet_published_dataset_registry_live_status_rollup_green=true"
echo "datanet_published_dataset_registry_fixture_dataset_present=true"
echo "datanet_published_dataset_registry_public_safe_metadata_only=true"
echo "datanet_published_dataset_registry_request_dataset_id_used_to_build_filesystem_path=false"
echo "datanet_published_dataset_registry_route_accepts_dataset_id_parameter=false"
echo "datanet_published_dataset_registry_absolute_source_path_disclosed=false"
echo "datanet_published_dataset_registry_operator_home_path_disclosed=false"
echo "datanet_published_dataset_registry_local_storage_root_disclosed=false"
echo "datanet_published_dataset_registry_public_mutation=false"
echo "datanet_published_dataset_registry_ledger_write=false"
echo "datanet_published_dataset_registry_wc_credit_award=false"

rm -rf "$DATANET_PUBLISHED_DATASET_REGISTRY_ROLLUP_TMP"


echo "=== DataNet Published Dataset Read Route v1 rollup guard ==="
DATANET_PUBLISHED_DATASET_READ_ROUTE_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-published-dataset-read-route-live-rollup-$$"
mkdir -p "$DATANET_PUBLISHED_DATASET_READ_ROUTE_ROLLUP_TMP"

grep -Fq '/public-node/datanet/published/:dataset_id/manifest-v1.json' <(curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json")
grep -Fq 'VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_DOC_V1' docs/public/public-node-datanet-published-dataset-read-route-v1.md
grep -Fq 'VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_UI_V1' src/index.ts
BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-published-dataset-read-route-v1-proof.sh | grep -Fq 'VOID_DATANET_PUBLISHED_DATASET_READ_ROUTE_PROOF_V1_GREEN'

echo "datanet_published_dataset_read_route_live_status_rollup_green=true"
echo "datanet_published_dataset_read_route_fixture_dataset_present=true"
echo "datanet_published_dataset_read_route_public_safe_manifest_returned=true"
echo "datanet_published_dataset_read_route_objects_returned=true"
echo "datanet_published_dataset_read_route_dataset_selected_through_registry=true"
echo "datanet_published_dataset_read_route_raw_request_dataset_id_used_to_build_filesystem_path=false"
echo "datanet_published_dataset_read_route_malformed_dataset_id_rejected=true"
echo "datanet_published_dataset_read_route_missing_dataset_returns_404=true"
echo "datanet_published_dataset_read_route_absolute_source_path_disclosed=false"
echo "datanet_published_dataset_read_route_operator_home_path_disclosed=false"
echo "datanet_published_dataset_read_route_local_storage_root_disclosed=false"
echo "datanet_published_dataset_read_route_public_mutation=false"
echo "datanet_published_dataset_read_route_ledger_write=false"
echo "datanet_published_dataset_read_route_wc_credit_award=false"

rm -rf "$DATANET_PUBLISHED_DATASET_READ_ROUTE_ROLLUP_TMP"


echo "=== DataNet Published Object Fetch v1 rollup guard ==="
grep -Fq '/public-node/datanet/published/:dataset_id/object/:sha256' <(curl -fsS "${BASE:-http://127.0.0.1:4100}/public-node/route-index.json")
grep -Fq 'VOID_DATANET_PUBLISHED_OBJECT_FETCH_DOC_V1' docs/public/public-node-datanet-published-object-fetch-v1.md
grep -Fq 'VOID_DATANET_PUBLISHED_OBJECT_FETCH_UI_V1' src/index.ts
BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-published-object-fetch-v1-proof.sh | grep -Fq 'VOID_DATANET_PUBLISHED_OBJECT_FETCH_PROOF_V1_GREEN'

echo "datanet_published_object_fetch_live_status_rollup_green=true"
echo "datanet_published_object_fetch_fixture_dataset_present=true"
echo "datanet_published_object_fetch_object_selected_from_manifest=true"
echo "datanet_published_object_fetch_object_sha256_verified=true"
echo "datanet_published_object_fetch_bytes_match_source=true"
echo "datanet_published_object_fetch_raw_request_dataset_id_used_to_build_filesystem_path=false"
echo "datanet_published_object_fetch_raw_request_sha256_used_to_build_filesystem_path=false"
echo "datanet_published_object_fetch_malformed_sha_rejected=true"
echo "datanet_published_object_fetch_missing_object_returns_404=true"
echo "datanet_published_object_fetch_absolute_source_path_disclosed=false"
echo "datanet_published_object_fetch_operator_home_path_disclosed=false"
echo "datanet_published_object_fetch_local_storage_root_disclosed=false"
echo "datanet_published_object_fetch_public_mutation=false"
echo "datanet_published_object_fetch_ledger_write=false"
echo "datanet_published_object_fetch_wc_credit_award=false"


echo "=== DataNet Published Retrieval Receipt v1 rollup guard ==="
DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-published-retrieval-receipt-live-rollup-$$"
mkdir -p "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP"

BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-published-retrieval-receipt-v1-proof.sh \
  > "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"

grep -Fq 'VOID_DATANET_PUBLISHED_RETRIEVAL_RECEIPT_PROOF_V1_GREEN' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_registry_has_dataset=true' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_manifest_read_route_green=true' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_object_selected_from_manifest=true' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_object_sha256_verified=true' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_bytes_match_source=true' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_created=true' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_public_safe=true' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_discloses_absolute_path=false' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_discloses_operator_home_path=false' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_discloses_storage_root=false' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_public_mutation=false' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_ledger_write=false' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_receipt_wc_credit_award=false' "$DATANET_PUBLISHED_RETRIEVAL_RECEIPT_ROLLUP_TMP/proof.log"

echo "datanet_published_retrieval_receipt_live_status_rollup_green=true"
echo "datanet_published_retrieval_receipt_registry_has_dataset=true"
echo "datanet_published_retrieval_receipt_manifest_read_route_green=true"
echo "datanet_published_retrieval_receipt_object_selected_from_manifest=true"
echo "datanet_published_retrieval_receipt_object_sha256_verified=true"
echo "datanet_published_retrieval_receipt_bytes_match_source=true"
echo "datanet_published_retrieval_receipt_created=true"
echo "datanet_published_retrieval_receipt_public_safe=true"
echo "datanet_published_retrieval_receipt_public_mutation=false"
echo "datanet_published_retrieval_receipt_ledger_write=false"
echo "datanet_published_retrieval_receipt_wc_credit_award=false"


echo "=== DataNet Published Retrieval WC Candidate Boundary v1 rollup guard ==="
DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-published-retrieval-wc-candidate-boundary-live-rollup-$$"
mkdir -p "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP"

BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-published-retrieval-wc-candidate-boundary-v1-proof.sh \
  > "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"

grep -Fq 'VOID_DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_PROOF_V1_GREEN' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_retrieval_receipt_valid=true' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_useful_work_candidate=true' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_verifiable_work=true' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_operator_review_required=true' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_duplicate_guard_required=true' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_settlement_plane_required=true' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_automatic_award=false' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_award_record_created_now=false' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_wc_delta_now=0' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_ledger_write=false' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_wc_credit_award=false' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_wc_candidate_boundary_public_mutation=false' "$DATANET_PUBLISHED_RETRIEVAL_WC_CANDIDATE_BOUNDARY_ROLLUP_TMP/proof.log"

echo "datanet_published_retrieval_wc_candidate_boundary_live_status_rollup_green=true"
echo "datanet_published_retrieval_wc_candidate_boundary_retrieval_receipt_valid=true"
echo "datanet_published_retrieval_wc_candidate_boundary_useful_work_candidate=true"
echo "datanet_published_retrieval_wc_candidate_boundary_verifiable_work=true"
echo "datanet_published_retrieval_wc_candidate_boundary_operator_review_required=true"
echo "datanet_published_retrieval_wc_candidate_boundary_duplicate_guard_required=true"
echo "datanet_published_retrieval_wc_candidate_boundary_settlement_plane_required=true"
echo "datanet_published_retrieval_wc_candidate_boundary_automatic_award=false"
echo "datanet_published_retrieval_wc_candidate_boundary_award_record_created_now=false"
echo "datanet_published_retrieval_wc_candidate_boundary_wc_delta_now=0"
echo "datanet_published_retrieval_wc_candidate_boundary_ledger_write=false"
echo "datanet_published_retrieval_wc_candidate_boundary_wc_credit_award=false"
echo "datanet_published_retrieval_wc_candidate_boundary_public_mutation=false"


echo "=== DataNet Published Retrieval Operator Review Packet v1 rollup guard ==="
DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP="${TMPDIR:-/tmp}/void-datanet-published-retrieval-operator-review-packet-live-rollup-$$"
mkdir -p "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP"

BASE="${BASE:-http://127.0.0.1:4100}" ops/mainnet0/public-node-datanet-published-retrieval-operator-review-packet-v1-proof.sh \
  > "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"

grep -Fq 'VOID_DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_PROOF_V1_GREEN' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_candidate_valid=true' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_created=true' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_operator_review_required=true' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_operator_approval_recorded_now=false' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_duplicate_guard_required=true' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_duplicate_guard_performed_now=false' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_settlement_plane_required=true' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_settlement_plane_performed_now=false' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_automatic_award=false' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_award_record_created_now=false' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_wc_delta_now=0' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_ledger_write=false' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_wc_credit_award=false' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"
grep -Fq 'datanet_published_retrieval_operator_review_packet_public_mutation=false' "$DATANET_PUBLISHED_RETRIEVAL_OPERATOR_REVIEW_PACKET_ROLLUP_TMP/proof.log"

echo "datanet_published_retrieval_operator_review_packet_live_status_rollup_green=true"
echo "datanet_published_retrieval_operator_review_packet_candidate_valid=true"
echo "datanet_published_retrieval_operator_review_packet_created=true"
echo "datanet_published_retrieval_operator_review_packet_operator_review_required=true"
echo "datanet_published_retrieval_operator_review_packet_operator_approval_recorded_now=false"
echo "datanet_published_retrieval_operator_review_packet_duplicate_guard_required=true"
echo "datanet_published_retrieval_operator_review_packet_duplicate_guard_performed_now=false"
echo "datanet_published_retrieval_operator_review_packet_settlement_plane_required=true"
echo "datanet_published_retrieval_operator_review_packet_settlement_plane_performed_now=false"
echo "datanet_published_retrieval_operator_review_packet_automatic_award=false"
echo "datanet_published_retrieval_operator_review_packet_award_record_created_now=false"
echo "datanet_published_retrieval_operator_review_packet_wc_delta_now=0"
echo "datanet_published_retrieval_operator_review_packet_ledger_write=false"
echo "datanet_published_retrieval_operator_review_packet_wc_credit_award=false"
echo "datanet_published_retrieval_operator_review_packet_public_mutation=false"

echo "VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1_GREEN"
