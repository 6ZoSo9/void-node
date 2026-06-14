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

## First external tester earned readiness card guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_EARNED_READINESS_CARD_DOC_V1 -->

The live status rollup checks that `/public-node` visibly surfaces the first external tester earned-readiness card.

Expected rollup line:

    first_external_tester_earned_readiness_card_ui_green=true

## First external tester WC candidate guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_DOC_V1 -->

The live status rollup checks the first external tester WC candidate packet.

Expected rollup lines:

    first_external_tester_wc_candidate_green=true
    first_external_tester_wc_candidate_status=pending_operator_review
    first_external_tester_wc_candidate_review_required_before_award=true
    first_external_tester_wc_candidate_award_created_now=false
    first_external_tester_wc_candidate_wc_ledger_mutated_now=false
    first_external_tester_wc_candidate_wc_credit_delta_now=0
    first_external_tester_wc_candidate_wc_to_void_swap=false
    first_external_tester_wc_candidate_discovery_green=true

## First external tester WC candidate card guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_WC_CANDIDATE_CARD_DOC_V1 -->

The live status rollup checks that `/public-node` visibly surfaces the first external tester WC candidate card.

Expected rollup line:

    first_external_tester_wc_candidate_card_ui_green=true

## First external tester WC review checklist guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_DOC_V1 -->

The live status rollup checks the first external tester WC review checklist.

Expected rollup lines:

    first_external_tester_wc_review_checklist_green=true
    first_external_tester_wc_review_checklist_state=pending_operator_review
    first_external_tester_wc_review_checklist_status=open
    first_external_tester_wc_review_checklist_review_required_before_award=true
    first_external_tester_wc_review_checklist_award_decision=not_decided
    first_external_tester_wc_review_checklist_ledger_write_allowed_now=false
    first_external_tester_wc_review_checklist_award_created_now=false
    first_external_tester_wc_review_checklist_wc_ledger_mutated_now=false
    first_external_tester_wc_review_checklist_wc_credit_delta_now=0
    first_external_tester_wc_review_checklist_wc_to_void_swap=false
    first_external_tester_wc_review_checklist_discovery_green=true

## First external tester WC review checklist card guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_WC_REVIEW_CHECKLIST_CARD_DOC_V1 -->

The live status rollup checks that `/public-node` visibly surfaces the first external tester WC review checklist card.

Expected rollup line:

    first_external_tester_wc_review_checklist_card_ui_green=true

## First external tester WC award policy guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_DOC_V1 -->

The live status rollup checks the first external tester WC award policy stub.

Expected rollup lines:

    first_external_tester_wc_award_policy_green=true
    first_external_tester_wc_award_policy_state=draft_public_read_only
    first_external_tester_wc_award_policy_review_record_created_now=false
    first_external_tester_wc_award_policy_award_created_now=false
    first_external_tester_wc_award_policy_wc_review_record_write=false
    first_external_tester_wc_award_policy_wc_ledger_write=false
    first_external_tester_wc_award_policy_wc_credit_award=false
    first_external_tester_wc_award_policy_wc_to_void_swap=false
    first_external_tester_wc_award_policy_discovery_green=true

## First external tester WC award policy card guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_WC_AWARD_POLICY_CARD_DOC_V1 -->

The live status rollup checks that `/public-node` visibly surfaces the first external tester WC award policy card.

Expected rollup line:

    first_external_tester_wc_award_policy_card_ui_green=true

## First external tester WC lane closeout guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_WC_LANE_CLOSEOUT_DOC_V1 -->

The live status rollup checks the first external tester Work Credit lane closeout route and visible `/public-node` card.

Expected rollup lines:

    first_external_tester_wc_lane_closeout_green=true
    first_external_tester_wc_lane_closeout_state=work_credit_lane_closed_read_only
    first_external_tester_wc_lane_closeout_review_record_created_now=false
    first_external_tester_wc_lane_closeout_award_created_now=false
    first_external_tester_wc_lane_closeout_wc_ledger_write=false
    first_external_tester_wc_lane_closeout_wc_credit_award=false
    first_external_tester_wc_lane_closeout_wc_to_void_swap=false
    first_external_tester_wc_lane_closeout_card_ui_green=true
    first_external_tester_wc_lane_closeout_discovery_green=true

## First external tester WC review record stub guard <!-- VOID_PUBLIC_NODE_LIVE_STATUS_ROLLUP_FIRST_EXTERNAL_TESTER_WC_REVIEW_RECORD_STUB_DOC_V1 -->

The live status rollup checks the first external tester Work Credit review record stub route and visible `/public-node` card.

Expected rollup lines:

    first_external_tester_wc_review_record_stub_green=true
    first_external_tester_wc_review_record_stub_state=template_only_no_review_record_created
    first_external_tester_wc_review_record_stub_review_record_created_now=false
    first_external_tester_wc_review_record_stub_award_created_now=false
    first_external_tester_wc_review_record_stub_wc_ledger_write=false
    first_external_tester_wc_review_record_stub_wc_credit_award=false
    first_external_tester_wc_review_record_stub_wc_to_void_swap=false
    first_external_tester_wc_review_record_stub_automatic_ledger_write_allowed=false
    first_external_tester_wc_review_record_stub_card_ui_green=true
    first_external_tester_wc_review_record_stub_discovery_green=true

## First External Tester WC Review Decision Boundary Rollup Guard

Marker: `VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_REVIEW_DECISION_BOUNDARY_ROLLUP_GUARD_V1`

The live status rollup now guards `/public-node/first-external-tester-wc-review-decision-boundary.json` and its public-node UI card.

The guard asserts:

- boundary state is `allowed_states_only_no_decision_record_created`
- allowed decision states are `accepted`, `rejected`, and `deferred`
- current decision state is `not_decided`
- no decision record was created
- no review record was created
- no award was created
- no WC decision/review record write is allowed
- no WC ledger write is allowed
- no WC credit award is allowed
- no WC→VOID swap is allowed
- automatic ledger write is absent-or-false and never true
- route-index, self-check, route-manifest, and UI discovery stay green


## First External Tester WC Operator Decision Packet Rollup Guard

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_PACKET_ROLLUP_GUARD_DOC_V1

The live status rollup now guards the first external tester Work Credit operator decision packet.

Expected live rollup lines:

- first_external_tester_wc_operator_decision_packet_green=true
- first_external_tester_wc_operator_decision_packet_packet_state=template_only_no_operator_decision_created
- first_external_tester_wc_operator_decision_packet_operator_decision_created_now=false
- first_external_tester_wc_operator_decision_packet_review_record_created_now=false
- first_external_tester_wc_operator_decision_packet_award_created_now=false
- first_external_tester_wc_operator_decision_packet_wc_ledger_mutated_now=false
- first_external_tester_wc_operator_decision_packet_wc_credit_delta_now=0
- first_external_tester_wc_operator_decision_packet_wc_ledger_write=false
- first_external_tester_wc_operator_decision_packet_wc_credit_award=false
- first_external_tester_wc_operator_decision_packet_wc_to_void_swap=false
- first_external_tester_wc_operator_decision_packet_automatic_ledger_write_allowed=false
- first_external_tester_wc_operator_decision_packet_card_ui_green=true
- first_external_tester_wc_operator_decision_packet_discovery_green=true

This guard is read-only. It does not create an operator decision, review record, award, Work Credit ledger write, Work Credit credit award, WC to VOID swap, token movement, wallet send, buy fulfillment, or validator mutation.


## First External Tester WC Operator Decision Draft Rollup Guard

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_ROLLUP_GUARD_DOC_V1

The live status rollup now guards the local-only operator decision draft generator.

Expected live rollup lines:

- first_external_tester_wc_operator_decision_draft_green=true
- first_external_tester_wc_operator_decision_draft_only=true
- first_external_tester_wc_operator_decision_draft_runtime_draft_written=false
- first_external_tester_wc_operator_decision_draft_operator_decision_created_now=false
- first_external_tester_wc_operator_decision_draft_review_record_created_now=false
- first_external_tester_wc_operator_decision_draft_decision_record_created_now=false
- first_external_tester_wc_operator_decision_draft_award_created_now=false
- first_external_tester_wc_operator_decision_draft_wc_ledger_mutated_now=false
- first_external_tester_wc_operator_decision_draft_wc_credit_delta_now=0
- first_external_tester_wc_operator_decision_draft_wc_ledger_write=false
- first_external_tester_wc_operator_decision_draft_wc_credit_award=false
- first_external_tester_wc_operator_decision_draft_wc_to_void_swap=false
- first_external_tester_wc_operator_decision_draft_automatic_ledger_write_allowed=false
- first_external_tester_wc_operator_decision_draft_public_upload=false
- first_external_tester_wc_operator_decision_draft_trusted_as_network_truth=false
- first_external_tester_wc_operator_decision_draft_write_runtime_default=false

This guard proves the draft generator remains local-only and dry-run by default. It does not create an operator decision, review record, decision record, Work Credit award, Work Credit ledger write, Work Credit credit award, WC to VOID swap, token movement, wallet send, buy fulfillment, or validator mutation.


## First External Tester WC Operator Decision Draft Runtime Write Rollup Guard

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_RUNTIME_WRITE_ROLLUP_GUARD_DOC_V1

The live status rollup now guards the operator decision draft runtime-write opt-in proof.

Expected live rollup lines:

- first_external_tester_wc_operator_decision_draft_runtime_write_green=true
- first_external_tester_wc_operator_decision_draft_runtime_write_opt_in_required=true
- first_external_tester_wc_operator_decision_draft_runtime_write_default_false_green=true
- first_external_tester_wc_operator_decision_draft_runtime_write_scratch_runtime_write_green=true
- first_external_tester_wc_operator_decision_draft_runtime_write_latest_draft_green=true
- first_external_tester_wc_operator_decision_draft_runtime_write_archive_draft_green=true
- first_external_tester_wc_operator_decision_draft_runtime_write_operator_decision_created_now=false
- first_external_tester_wc_operator_decision_draft_runtime_write_review_record_created_now=false
- first_external_tester_wc_operator_decision_draft_runtime_write_decision_record_created_now=false
- first_external_tester_wc_operator_decision_draft_runtime_write_award_created_now=false
- first_external_tester_wc_operator_decision_draft_runtime_write_wc_ledger_mutated_now=false
- first_external_tester_wc_operator_decision_draft_runtime_write_wc_credit_delta_now=0
- first_external_tester_wc_operator_decision_draft_runtime_write_wc_ledger_write=false
- first_external_tester_wc_operator_decision_draft_runtime_write_wc_credit_award=false
- first_external_tester_wc_operator_decision_draft_runtime_write_wc_to_void_swap=false
- first_external_tester_wc_operator_decision_draft_runtime_write_automatic_ledger_write_allowed=false
- first_external_tester_wc_operator_decision_draft_runtime_write_public_upload=false
- first_external_tester_wc_operator_decision_draft_runtime_write_trusted_as_network_truth=false
- first_external_tester_wc_operator_decision_draft_runtime_write_live_runtime_write=false

This guard proves runtime draft writing is opt-in, scratch-only in proof mode, and still does not create an operator decision, review record, decision record, Work Credit award, Work Credit ledger write, Work Credit credit award, WC to VOID swap, token movement, wallet send, buy fulfillment, or validator mutation.


## First External Tester WC Operator Decision Draft Live Runbook Rollup Guard

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_DRAFT_LIVE_RUNBOOK_ROLLUP_GUARD_DOC_V1

The live status rollup now guards the operator decision draft live runbook proof.

Rollup mode uses a scratch DATA_DIR inside the rollup output directory. This proves the runbook flow without repeatedly mutating the real live runtime during normal status checks.

Expected live rollup lines:

- first_external_tester_wc_operator_decision_draft_live_runbook_green=true
- first_external_tester_wc_operator_decision_draft_live_runbook_refusal_guard_green=true
- first_external_tester_wc_operator_decision_draft_live_runbook_explicit_confirmation_green=true
- first_external_tester_wc_operator_decision_draft_live_runbook_scratch_data_dir_green=true
- first_external_tester_wc_operator_decision_draft_live_runbook_runtime_draft_written=true
- first_external_tester_wc_operator_decision_draft_live_runbook_real_live_runtime_write=false
- first_external_tester_wc_operator_decision_draft_live_runbook_operator_decision_created_now=false
- first_external_tester_wc_operator_decision_draft_live_runbook_review_record_created_now=false
- first_external_tester_wc_operator_decision_draft_live_runbook_decision_record_created_now=false
- first_external_tester_wc_operator_decision_draft_live_runbook_award_created_now=false
- first_external_tester_wc_operator_decision_draft_live_runbook_wc_ledger_mutated_now=false
- first_external_tester_wc_operator_decision_draft_live_runbook_wc_credit_delta_now=0
- first_external_tester_wc_operator_decision_draft_live_runbook_wc_ledger_write=false
- first_external_tester_wc_operator_decision_draft_live_runbook_wc_credit_award=false
- first_external_tester_wc_operator_decision_draft_live_runbook_wc_to_void_swap=false

This guard proves the runbook remains explicit-confirmation-only and draft-only. It does not create an operator decision, review record, decision record, Work Credit award, Work Credit ledger write, Work Credit credit award, WC to VOID swap, token movement, wallet send, buy fulfillment, or validator mutation.


## First External Tester WC Operator Review Record Runbook Rollup Guard

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_REVIEW_RECORD_RUNBOOK_ROLLUP_GUARD_DOC_V1

The live status rollup now guards the operator review record runbook proof.

Rollup mode uses a scratch DATA_DIR inside the rollup output directory. This proves the review-record flow without repeatedly mutating the real live runtime during normal status checks.

Expected live rollup lines:

- first_external_tester_wc_operator_review_record_runbook_green=true
- first_external_tester_wc_operator_review_record_runbook_refusal_guard_green=true
- first_external_tester_wc_operator_review_record_runbook_source_draft_green=true
- first_external_tester_wc_operator_review_record_runbook_explicit_confirmation_green=true
- first_external_tester_wc_operator_review_record_runbook_scratch_data_dir_green=true
- first_external_tester_wc_operator_review_record_runbook_local_review_record_written=true
- first_external_tester_wc_operator_review_record_runbook_real_live_runtime_write=false
- first_external_tester_wc_operator_review_record_runbook_review_record_created_now=true
- first_external_tester_wc_operator_review_record_runbook_operator_decision_created_now=false
- first_external_tester_wc_operator_review_record_runbook_decision_record_created_now=false
- first_external_tester_wc_operator_review_record_runbook_award_created_now=false
- first_external_tester_wc_operator_review_record_runbook_wc_ledger_mutated_now=false
- first_external_tester_wc_operator_review_record_runbook_wc_credit_delta_now=0
- first_external_tester_wc_operator_review_record_runbook_wc_ledger_write=false
- first_external_tester_wc_operator_review_record_runbook_wc_credit_award=false
- first_external_tester_wc_operator_review_record_runbook_wc_to_void_swap=false

This guard proves the review-record runbook remains explicit-confirmation-only and review-record-only. It does not create an operator decision, decision record, Work Credit award, Work Credit ledger write, Work Credit credit award, WC to VOID swap, token movement, wallet send, buy fulfillment, or validator mutation.


## First External Tester WC Operator Decision Record Runbook Rollup Guard

Marker: VOID_PUBLIC_NODE_FIRST_EXTERNAL_TESTER_WC_OPERATOR_DECISION_RECORD_RUNBOOK_ROLLUP_GUARD_DOC_V1

The live status rollup now guards the operator decision record runbook proof.

Rollup mode uses a scratch DATA_DIR inside the rollup output directory. This proves the decision-record flow without repeatedly mutating the real live runtime during normal status checks.

Expected live rollup lines:

- first_external_tester_wc_operator_decision_record_runbook_green=true
- first_external_tester_wc_operator_decision_record_runbook_refusal_guard_green=true
- first_external_tester_wc_operator_decision_record_runbook_source_draft_green=true
- first_external_tester_wc_operator_decision_record_runbook_source_review_record_green=true
- first_external_tester_wc_operator_decision_record_runbook_explicit_confirmation_green=true
- first_external_tester_wc_operator_decision_record_runbook_scratch_data_dir_green=true
- first_external_tester_wc_operator_decision_record_runbook_local_decision_record_written=true
- first_external_tester_wc_operator_decision_record_runbook_real_live_runtime_write=false
- first_external_tester_wc_operator_decision_record_runbook_decision_record_created_now=true
- first_external_tester_wc_operator_decision_record_runbook_operator_decision_created_now=false
- first_external_tester_wc_operator_decision_record_runbook_review_record_created_now=false
- first_external_tester_wc_operator_decision_record_runbook_award_created_now=false
- first_external_tester_wc_operator_decision_record_runbook_award_write_allowed_now=false
- first_external_tester_wc_operator_decision_record_runbook_wc_ledger_mutated_now=false
- first_external_tester_wc_operator_decision_record_runbook_wc_credit_delta_now=0
- first_external_tester_wc_operator_decision_record_runbook_wc_ledger_write=false
- first_external_tester_wc_operator_decision_record_runbook_wc_credit_award=false
- first_external_tester_wc_operator_decision_record_runbook_wc_to_void_swap=false

This guard proves the decision-record runbook remains explicit-confirmation-only and decision-record-only. It does not create a Work Credit award, Work Credit ledger write, Work Credit credit award, WC to VOID swap, token movement, wallet send, buy fulfillment, or validator mutation.
