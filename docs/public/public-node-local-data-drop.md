# VOID Public Node Local Data Drop <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DOC_V1 -->

Operator-local storage lane for serving files from a VOID public node.

## Index route

    /public-node/local-data-drop.json

## Object route

    /public-node/local-data-drop/:objectId

## Import helper

    DATA_DIR=.runtime/mainnet0 ops/mainnet0/public-node-local-data-drop-import.sh /path/to/file [object-id]

## Runtime storage path

    DATA_DIR/public-node/local-data-drop/objects

## Purpose

This is a simple public-node storage/serve lane:

1. Operator imports a local file.
2. Node indexes the file.
3. Public clients can fetch the file read-only.

## Safety boundary

There is no public upload endpoint.

This lane is operator-local import only and public-read-only fetch. It does not move money, send wallet transactions, execute WC to VOID swaps, fulfill Buy VOID requests, mutate validators, or treat dropped files as network truth.

## Receipt ledger <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_DOC_V1 -->

Each operator-local import writes a receipt JSON file:

    DATA_DIR/public-node/local-data-drop/receipts/<objectId>.json

Receipt marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_RECEIPT_LEDGER_V1

The public index exposes receipt metadata and whether the receipt matches the currently served object bytes.

## Content-address fetch <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CONTENT_ADDRESS_DOC_V1 -->

Objects can also be fetched by SHA-256:

    /public-node/local-data-drop/by-sha256/:sha256

This lets clients retrieve the object by content hash instead of object ID.

## Public object proof <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_OBJECT_PROOF_DOC_V1 -->

Clients can fetch a JSON proof bundle by SHA-256:

    /public-node/local-data-drop/proof/:sha256.json

The proof includes object ID, byte size, SHA-256, object fetch URL, content-address fetch URL, receipt metadata, and whether the receipt matches the currently served object.

## Client verifier <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_OBJECT_DOC_V1 -->

Clients can verify a public object by SHA-256:

    ops/mainnet0/public-node-local-data-drop-verify-object.sh <base-url> <sha256>

The verifier fetches the proof JSON, fetches bytes by SHA-256, hashes the bytes locally, and confirms the proof/receipt/fetched object all agree.

## Manifest root <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_DOC_V1 -->

The node exposes a deterministic public manifest of locally dropped objects:

    /public-node/local-data-drop/manifest.json

The manifest includes object IDs, byte sizes, SHA-256 hashes, receipt metadata, public fetch links, proof links, and a deterministic manifest root:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MANIFEST_ROOT_V1

This gives the public storage lane a verifiable state root over the currently served object set.

## Manifest verifier <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_VERIFY_MANIFEST_DOC_V1 -->

Clients can verify the public storage manifest and every listed object:

    ops/mainnet0/public-node-local-data-drop-verify-manifest.sh <base-url>

The verifier fetches the manifest, recomputes the manifest root, then chains through object proof and object-byte verification for each listed SHA-256.

## Multi-object manifest proof <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MULTI_OBJECT_MANIFEST_DOC_V1 -->

The proof lane imports multiple deterministic local objects and verifies that:

- the public manifest lists the full served object set,
- the manifest root recomputes from the public root payload,
- every object has a valid receipt,
- every object has proof JSON,
- and the client manifest verifier chains through object-byte verification for each SHA-256.

Marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_MULTI_OBJECT_MANIFEST_V1

## Import directory helper <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_DOC_V1 -->

The import directory helper lets an operator import a local folder into the public-node local data drop store.

Marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_V1

The helper is operator-local only. It does not enable public uploads. It walks regular files in a source directory, converts relative paths into safe object ids, imports each file with the existing local data drop import helper, and exposes the resulting objects through the same public read-only index, manifest, content-address, proof, receipt, and verifier routes.

## Import a directory <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_DIR_POINTER_DOC_V1 -->

Operators can import a whole local folder using the directory import helper.

Runbook:

- [Public Node Local Data Drop Import Directory Runbook](public-node-local-data-drop-import-directory-runbook.md)

Helper:

    ops/mainnet0/public-node-local-data-drop-import-dir.sh

This remains operator-local only. It does not enable public uploads. Imported files are exposed through the existing public read-only local data drop index, manifest, content-address, proof, receipt, and verifier routes.

## Next layer: Data Weight Record v1

Marker: `VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_POINTER_DOC_V1`

Local Data Drop proves that an operator can place data into the node runtime and expose it through public read-only routes.

Data Weight Record v1 is the next layer after storage. It gives VOID a public schema for ranking stored data by verification, freshness, duplicate status, suspicion state, tombstone state, storage tier, AI visibility, trust score, and promotion eligibility.

Public route:

`/public-node/data-weight-record.json`

Doc:

`docs/public/public-node-data-weight-record.md`

Policy boundary: persistent does not mean equal priority. VOID can preserve data without treating every object as equally trusted, equally fresh, equally visible to AI, or equally eligible for promotion.

## Scratch vs live import <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_SCRATCH_VS_LIVE_POINTER_DOC_V1 -->

Before importing operator-local data, decide whether this is a scratch proof/test import or a live Public Node import.

- Scratch import: set `DATA_DIR` to a temporary or alternate directory. This proves import behavior without changing the live public object count.
- Live import: use the node runtime data directory. This intentionally changes `/public-node/local-data-drop/weighted.json` and may require updating proofs that expect `object_count=1`.

See `docs/public/public-node-local-data-drop-import-scratch-vs-live.md` for the proven rule.

## Live import runbook <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_RUNBOOK_POINTER_DOC_V1 -->

Live import is the deliberate operator path for changing what the Public Node serves.

Use this only when the goal is to intentionally mutate `/public-node/local-data-drop/weighted.json`.

Current live baseline remains:

- `object_count=1`
- marker `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`

See `docs/public/public-node-local-data-drop-live-import-runbook.md` before running any live import.

## Import stack status <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_STATUS_POINTER_DOC_V1 -->

The Local Data Drop import stack status summarizes the current proven import discipline:

- scratch imports are safe proof/test lanes
- live import is a deliberate public mutation lane
- live weighted object count remains `1`
- current proof mode remains Precision-only green / Alienware deferred / cross-box pending

See `docs/public/public-node-local-data-drop-import-stack-status.md` for the current import stack recap.

## Live import safe ladder status <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_SAFE_LADDER_STATUS_POINTER_DOC_V1 -->

For the current no-mutation live import safety path, see:

- `docs/public/public-node-local-data-drop-live-import-safe-ladder-status.md`

Safe order:

1. run preflight
2. generate plan JSON
3. inspect expected object count
4. intentionally run live import only when ready

Routine checker:

- `ops/mainnet0/public-node-local-data-drop-import-stack-lite-smoke.sh`

Expected lite marker:

- `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_IMPORT_STACK_LITE_SMOKE_V1_GREEN`

## Live Import Demo 001 Status

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_POINTER_V1`

The first intentional live Local Data Drop import is proven on Precision.

- live status: `docs/public/public-node-local-data-drop-live-import-demo-001-status.md`
- imported object: `live-import-demo-001.txt`
- live weighted route object count: `2`
- route marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_WEIGHTED_V1`
- proof marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_IMPORT_DEMO_001_STATUS_FINAL_GREEN`

## Current capability

Marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_POINTER_V1`

Current proven capability is recorded here:

- `docs/public/public-node-local-data-drop-current-capability.md`
- capability marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_V1`
- proof marker: `VOID_PUBLIC_NODE_LOCAL_DATA_DROP_CURRENT_CAPABILITY_FINAL_GREEN`

The public node can now import operator-local files into the live route DATA_DIR, expose them as weighted records, serve them by object id, serve the same bytes by sha256 content address, and serve proof JSON.
## Live public serving posture <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_LIVE_RUNTIME_QUARANTINE_POINTER_DOC_V1 -->

The live public-node Local Data Drop lane now has an operator-installable quarantined public serving posture.

Install/prove scripts:

    ops/mainnet0/public-node-live-runtime-quarantine-install.sh
    ops/mainnet0/public-node-live-runtime-quarantine-proof.sh

This posture keeps the public HTTP Local Data Drop routes online while disabling the hot runtime wrapper, txroot, saveblock, forensics, finalize-WAL, and drift families through a user systemd drop-in. It also requires the legacy `void-node.service` to remain inactive/disabled so only `void-node-live.service` owns ports 4100/4700.

Current proven checkpoint:

    08383516
    ckpt-public-node-live-runtime-quarantine-green-20260612-210820
    VOID_PUBLIC_NODE_LIVE_RUNTIME_QUARANTINE_PROOF_V1_GREEN

Demo 002 remains publicly verifiable under this posture:

    live-import-demo-002.txt
    264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871
## Demo 002 one-command tester smoke <!-- VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_POINTER_DOC_V1 -->

Testers can verify the live Local Data Drop Demo 002 object, content-address route, and proof JSON with one command:

    PUBLIC_NODE_BASE=https://your-node.example \
      ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh

Local operator check:

    PUBLIC_NODE_BASE=http://127.0.0.1:4100 \
      ops/mainnet0/public-node-local-data-drop-demo002-tester-smoke.sh

Committed checkpoint:

    1a53883a
    ckpt-public-node-local-data-drop-demo002-tester-smoke-green-20260612-212707

Proof marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_PROOF_V1_GREEN

Smoke marker:

    VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO002_TESTER_SMOKE_V1_GREEN

Verified object:

    live-import-demo-002.txt
    264e0d3832fbad60f3a5bd574794148a0db313583717c4b6bedb94e7db75e871

The smoke is public-route-only, read-only, and does not touch wallet sends, money movement, WC swaps, Buy VOID fulfillment, validator mutation, or proof mutation.
