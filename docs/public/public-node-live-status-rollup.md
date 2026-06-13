# VOID Public Node Live Status Rollup v1

Marker: VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_DOC_V1

The live status rollup is the operator truth command for the current public-node tester lane.

Command:

ops/mainnet0/public-node-live-status-rollup.sh

It verifies:

- user systemd void-node-live.service is active
- public base URL is configured and not localhost
- tester-share page is exported from the active runtime base
- tester result intake is readable
- core public routes are healthy
- first tester ask export is green
- external receipt watch is green
- tester receipt safe-import dry-run does not import
- waiting receipt state is preserved after dry-run
- real data import lane is live and weighted
- real data status route is registered and green
- void-real-user-note-v1.txt and void-real-user-note-v2.txt are verified/hot/high/promotion eligible

Expected green marker:

VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_V1_GREEN

Current expected first-tester state before a real external receipt:

intake_status=external_tester_result_waiting
latest_imported=False
receipt_state=waiting_for_external_receipt

Current real-data lane state:

real_data_lane_green=true
real_data_object_count=5
real_data_status_route_green=true
real_data_status_route_index_green=true

Machine-readable status route:

/public-node/real-data-import-lane-status.json

Safety boundary:

The rollup does not import a receipt, does not mutate validators, does not move funds, does not fulfill Buy VOID, and does not trust tester receipts as network truth.

Canonical real-data discovery coverage:

The live rollup calls the canonical real-data status proof, which now validates the real-data status route across:

- `/public-node/client-work-pack.json`
- `/.well-known/void-public-node.json`
- `/public-node/self-check-snapshot.json`
- `/public-node/route-manifest.json`

Expected rollup/proof lines:

real_data_status_route_green=true
real_data_status_route_index_green=true
real_data_client_work_pack_discovery_green=true
real_data_well_known_discovery_green=true
real_data_self_check_discovery_green=true
real_data_route_manifest_discovery_green=true

## Real data tester-lane link rollup <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_REAL_DATA_TESTER_LANE_LINK_DOC_V1 -->

The live status rollup now verifies that `/public-node/tester-lane-summary.json` exposes the real-data lane status link and marker.

Expected rollup line:

    real_data_tester_lane_summary_link_green=true

The rollup checks:

- `tester_lane.real_data_status_ready=true`
- `links.real_data_import_lane_status` exists
- the link ends with `/public-node/real-data-import-lane-status.json`
- `route_markers.real_data_import_lane_status=VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_ROUTE_V1`

This catches stale live runtime cases where the source/proof has been updated but the long-running public service has not restarted yet.

## External tester receipt closeout guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_EXTERNAL_TESTER_RECEIPT_CLOSEOUT_DOC_V1 -->

The live status rollup now verifies:

    /public-node/external-tester-receipt-closeout-status.json

Expected rollup lines while waiting for the first outside tester receipt:

    external_tester_receipt_closeout_status_green=true
    external_tester_receipt_closeout_waiting=true
    external_tester_receipt_closeout_latest_imported=false
    external_tester_receipt_closeout_public_upload=false
    external_tester_receipt_closeout_operator_local_import_only=true
    external_tester_receipt_closeout_trusted_as_network_truth=false

This keeps the closeout route tied to the live public-node health proof instead of leaving it as an orphan surface.

## First external receipt ask public closeout URL guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_RECEIPT_ASK_PUBLIC_CLOSEOUT_URL_DOC_V1 -->

The live status rollup runs:

    ops/mainnet0/public-node-first-external-receipt-ask-export.sh

It verifies the generated ask export uses the public/effective closeout URL:

    first_external_receipt_ask_public_closeout_url_green=true
    first_external_receipt_ask_closeout_url_public=true
    first_external_receipt_ask_closeout_url_localhost=false

This prevents outside-tester ask text from regressing to an operator-local `127.0.0.1` closeout URL.

## First external receipt packet export guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_RECEIPT_PACKET_EXPORT_DOC_V1 -->

The live status rollup runs:

    ops/mainnet0/public-node-first-external-receipt-packet-export.sh

It verifies the packet folder exists, contains the expected files, uses the public/effective closeout URL, and does not contain an operator-local localhost closeout URL.

Expected rollup lines:

    first_external_receipt_packet_export_green=true
    first_external_receipt_packet_public_closeout_url_green=true
    first_external_receipt_packet_closeout_url_public=true
    first_external_receipt_packet_closeout_url_localhost=false

## First external receipt packet archive guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_RECEIPT_PACKET_ARCHIVE_DOC_V1 -->

The live status rollup runs:

    ops/mainnet0/public-node-first-external-receipt-packet-archive.sh

It verifies the archive exists, the `.sha256` check passes, the archive unpacks, the packet files are present, the public/effective closeout URL is present, and the operator-local localhost closeout URL is absent.

Expected rollup lines:

    first_external_receipt_packet_archive_green=true
    first_external_receipt_packet_archive_sha256_green=true
    first_external_receipt_packet_archive_public_closeout_url_green=true
    first_external_receipt_packet_archive_closeout_url_public=true
    first_external_receipt_packet_archive_closeout_url_localhost=false

## First external receipt packet status guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_DOC_V1 -->

The live status rollup checks:

    /public-node/first-external-receipt-packet-status.json

It verifies the route marker, purpose, status, public/effective links, packet readiness flags, and safety boundary.

Expected rollup lines:

    first_external_receipt_packet_status_green=true
    first_external_receipt_packet_status_discovery_green=true
    first_external_receipt_packet_status_public_archive_download=false
    first_external_receipt_packet_status_operator_local_export_only=true
    first_external_receipt_packet_status_public_upload=false
    first_external_receipt_packet_status_trusted_as_network_truth=false
