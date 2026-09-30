# Participant post-purchase production runtime binding v1

Marker: `VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_BINDING_V1`

Status: source-only read-only production-runtime evidence collector. It does not
submit a transaction, expose raw RPC, access a wallet/signer/private key, move
tokens, update the coupled candidate, activate WC/VOID, or open the presale.

## Purpose

The existing participant post-purchase chain already provides:

1. a source-only ownership/control contract;
2. exact raw-transaction submission semantics;
3. delivery/control receipt finality verification; and
4. a strict finality importer.

The finality importer deliberately retains:

```text
participant_post_purchase_voidtoken_control_ready=false
production_runtime_binding_required=true
```

because the imported finality receipt by itself does not prove that its read
transport was the intended production Chain-2050 runtime.

This collector closes that missing **source mechanism** without granting launch
authority.

## Production binding

The production CLI first reruns
`importVoidParticipantPostpurchaseFinalityV1` on the original
`{ expected, evidence }` finality input. It does not trust a caller-supplied
import summary.

It then performs read-only HTTPS GETs against the fixed public origin:

```text
https://seed.nullfeed.org
```

for exactly:

```text
/public-node/economic/epoch2/read-status-v1.json
/public-node/economic/epoch2/receipt-v1?tx=<delivery-tx>
/public-node/economic/epoch2/receipt-v1?tx=<control-tx>
```

The caller cannot override the origin, paths, transaction hashes, or runtime
identity.

## Status identity

The status response must prove:

- Chain ID 2050;
- execution epoch 2;
- the reviewed production genesis block/hash/state root;
- receipt lookup support;
- the bounded public read runtime is active;
- the production successor endpoint is selected;
- the exact production-genesis read replica identity;
- raw public RPC remains disabled; and
- every wallet/key/signing/submission/broadcast/write/token/funds authority flag
  remains false.

## Receipt revalidation

Both delivery and participant-control receipts must:

- return HTTP 200 from the exact fixed public URL;
- use `VOID_ECONOMIC_EPOCH2_PUBLIC_READ_RUNTIME_V1`;
- report `LIVE_SUCCESSOR_RECEIPT_VERIFIED`;
- bind the exact transaction hash from the finality import;
- bind the exact imported receipt block number and block hash;
- report successful receipt status `0x1`;
- require the delivery transaction sender to equal the imported fulfillment
  wallet and the control transaction sender to equal the imported participant;
- require both transaction recipients to equal canonical `VoidToken`;
- include content-addressed public-read source evidence;
- prove exact receipt identity and block identity were revalidated; and
- retain the same read-only runtime authority boundary.

The collector therefore does not trust a transaction hash match alone. It
requires the receipt to land in the same block identity already admitted by the
finality importer.

## Transport

The live collector uses a fresh HTTPS connection for each request and separates:

- connection deadline;
- socket-inactivity deadline; and
- absolute total deadline.

Redirects are not followed. Bodies are byte-bounded, content length is checked,
aborted/incomplete responses are owned, and strict UTF-8 JSON is required.

CI does not perform external network access; the proof injects deterministic
transport results and verifies the exact requested paths.

## Output

Successful collection writes one create-only mode-0600 JSON receipt containing:

- the original finality import ID and binding ID;
- delivery/control imported identities;
- exact public-origin status evidence;
- exact public delivery/control receipt evidence;
- content hashes for all three external responses;
- one content-addressed runtime binding ID;
- `production_runtime_binding_verified=true`; and
- `participant_postpurchase_voidtoken_control_runtime_binding_source_ready=true`.

It deliberately retains:

```text
participant_post_purchase_voidtoken_control_ready=false
coupled_candidate_updated=false
candidate_promotion_required=true
```

A later promotion/admission step must bind a **real** production receipt from
this collector before the coupled candidate can turn the participant-control
gate true.

## Command

```bash
node tools/void-participant-postpurchase-production-runtime-binding-v1.mjs collect \
  --finality-input /absolute/finality-input.json \
  --output /absolute/runtime-binding.json
```

Optional timing-only controls:

```text
--connect-timeout-ms
--inactivity-timeout-ms
--total-timeout-ms
```

## Authority boundary

This lane performs only external read verification plus create-only evidence
output. It does not:

- construct, sign, submit, or broadcast a transaction;
- expose raw JSON-RPC;
- access a wallet, signer, private key, or credential content;
- mutate Chain-2050;
- move VoidToken or other funds;
- mutate Work Credits or validators;
- update the coupled launch candidate;
- activate WC/VOID or the presale.

## Proof

```bash
node --check tools/void-participant-postpurchase-production-runtime-binding-v1.mjs
node --check scripts/prove_void_participant_postpurchase_production_runtime_binding_v1.mjs
node scripts/prove_void_participant_postpurchase_finality_import_v1.mjs
node scripts/prove_void_participant_postpurchase_production_runtime_binding_v1.mjs
```

A source-green proof closes only the missing runtime-binding mechanism. Real
runtime evidence and candidate promotion remain later launch gates.
