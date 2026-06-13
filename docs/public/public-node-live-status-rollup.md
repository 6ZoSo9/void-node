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
