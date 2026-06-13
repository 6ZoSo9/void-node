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

## First external receipt packet status UI guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_RECEIPT_PACKET_STATUS_UI_DOC_V1 -->

The live status rollup checks the public node HTML page for the first external receipt packet status card.

Expected rollup lines:

    first_external_receipt_packet_status_ui_green=true
    first_external_receipt_packet_status_ui_link_green=true
    first_external_receipt_packet_status_ui_public_archive_download=false
    first_external_receipt_packet_status_ui_operator_local_export_only=true
    first_external_receipt_packet_status_ui_trusted_as_network_truth=false

## Receipt dry-run state preservation guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_RECEIPT_DRYRUN_STATE_DOC_V1 -->

The live status rollup runs the safe receipt import in dry-run mode and verifies the receipt state is preserved.

Valid preserved states:

    waiting_for_external_receipt
    external_receipt_imported

Expected rollup lines after a real external receipt has been imported:

    receipt_state_before_dryrun=external_receipt_imported
    receipt_state_after_dryrun=external_receipt_imported
    dryrun_preserved_receipt_state=true
    dryrun_preserved_waiting_state=false
    dryrun_preserved_imported_state=true

Expected rollup lines before a real external receipt is imported:

    receipt_state_before_dryrun=waiting_for_external_receipt
    receipt_state_after_dryrun=waiting_for_external_receipt
    dryrun_preserved_receipt_state=true
    dryrun_preserved_waiting_state=true
    dryrun_preserved_imported_state=false

## First external receipt imported closeout proof status guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_IMPORTED_CLOSEOUT_PROOF_STATUS_DOC_V1 -->

The live status rollup checks the public imported-closeout proof status route.

Expected rollup lines:

    first_external_receipt_imported_closeout_proof_status_green=true
    first_external_receipt_imported_closeout_proof_status_receipt_state=external_receipt_imported
    first_external_receipt_imported_closeout_proof_status_latest_imported=true
    first_external_receipt_imported_closeout_proof_status_trusted_as_network_truth=false
    first_external_receipt_imported_closeout_proof_status_discovery_green=true
    first_external_receipt_imported_closeout_proof_status_ui_green=true

## First external tester closed top-line card guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_CLOSED_TOPLINE_DOC_V1 -->

The live status rollup checks that `/public-node` visibly surfaces the first closed external tester loop.

Expected rollup line:

    first_external_tester_closed_topline_card_ui_green=true

## First external tester earned readiness guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_EARNED_READINESS_DOC_V1 -->

The live status rollup checks the first external tester useful-work evidence readiness route.

Expected rollup lines:

    first_external_tester_earned_readiness_green=true
    first_external_tester_earned_readiness_eligible_evidence=true
    first_external_tester_earned_readiness_award_created_now=false
    first_external_tester_earned_readiness_wc_ledger_mutated_now=false
    first_external_tester_earned_readiness_wc_credit_delta_now=0
    first_external_tester_earned_readiness_wc_to_void_swap=false
    first_external_tester_earned_readiness_discovery_green=true
