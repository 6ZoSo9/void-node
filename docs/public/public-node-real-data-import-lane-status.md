# VOID Public Node Real Data Import Lane Status v1

Marker: VOID_PUBLIC_NODE_REAL_DATA_IMPORT_LANE_STATUS_V1

Status: live and proven.

The Public Node can now import real operator-local user data into the live storage lane, expose it through public read-only routes, attach receipt-backed metadata, surface it in the weighted local data drop view, and verify local bytes while preserving canonical public hrefs.

Current live weighted object count:

object_count=5

Imported real-data objects:

- void-real-user-note-v1.txt
  - sha256: ea2fc1377408b245001eb43133988d968c7949b40b58aa6d11fb30744a75ff8b
  - verification_state: verified
  - storage_tier: hot
  - ai_visibility: high
  - promotion_eligible: true

- void-real-user-note-v2.txt
  - sha256: f172a41ad8e1731ec3cb887954049122821dfe17fe4c3b474137f26f6393ee95
  - verification_state: verified
  - storage_tier: hot
  - ai_visibility: high
  - promotion_eligible: true

Operator command:

ops/mainnet0/public-node-real-data-import-lane.sh /path/to/source-folder

Plan-only default:

CONFIRM_LIVE_IMPORT=false

Live import:

CONFIRM_LIVE_IMPORT=true ops/mainnet0/public-node-real-data-import-lane.sh /path/to/source-folder

Proof model:

- plan checks source files and object-id collisions before mutation
- live import uses the runtime DATA_DIR detected from the public node process
- imported bytes are fetched locally by object id and by sha256
- canonical public hrefs are validated against the effective public base URL
- weighted records must be verified, hot, high visibility, and promotion eligible
- receipts remain trusted_as_network_truth=false

Safety boundary:

This lane has no public upload endpoint. It is operator-local import only and public-read-only fetch. It does not move funds, execute swaps, fulfill Buy VOID, mutate validators, or treat imported data as network truth.
