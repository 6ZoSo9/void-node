# Participant post-purchase production-runtime finality v1

Marker: `VOID_PARTICIPANT_POSTPURCHASE_PRODUCTION_RUNTIME_FINALITY_V1`

Status: **source wrapper ready; canonical production Epoch-2 RPC target HOLD**.

## Purpose

The existing participant post-purchase finality verifier proves delivery and a
participant-signed `VoidToken.transfer` through an injected read-only transport.
The importer binds that receipt to the exact reviewed purchase/control event but
deliberately leaves:

```text
participant_post_purchase_voidtoken_control_ready=false
production_runtime_binding_required=true
```

This package adds the missing production-runtime wrapper. It may move that one
participant-control gate only after the exact canonical target identifies an
active production Epoch-2 Chain-2050 loopback RPC that is bound to the reviewed
genesis and production validator set.

## Canonical runtime target

The source-controlled target is:

```text
ops/mainnet0/participant-postpurchase-production-runtime-target-v1.json
```

It currently remains:

```text
status=HOLD_PRODUCTION_EPOCH2_RPC_TARGET_NOT_SELECTED
production_rpc_target_selected=false
runtime_active_verified=false
exact_genesis_bound=false
production_validator_set_bound=false
migration_authorized=false
```

The wrapper therefore fails closed on the canonical target today. The target
must not be pointed at the historical Epoch-1 archive RPC or an isolated proof
replica merely because either returns Chain ID 2050.

A future reviewed active target must be on
`zoso-Precision-Tower-7810`, use exact loopback HTTP
`http://127.0.0.1:<port>/`, carry a SHA-256 fingerprint of that URL, and prove:

- production RPC target selected;
- production runtime active;
- exact Epoch-2 genesis bound;
- production validator set bound; and
- migration authorized.

Selecting that runtime does not authorize the presale or any market.

## Runtime verification

With an active canonical target, the wrapper runs the existing finality verifier
through its own bounded loopback transport. The only allowed JSON-RPC methods
are:

```text
eth_chainId
eth_getTransactionReceipt
eth_blockNumber
```

It then runs the existing finality importer against exact reviewed expectations.
A green result therefore preserves all prior checks for:

- Chain ID 2050;
- exact delivery transaction, block identity, fulfillment wallet, participant,
  amount, Transfer-log index, and delivery fingerprint;
- exact participant-control transaction, block identity, recipient, amount, and
  Transfer-log index;
- stable second-read delivery and control receipts; and
- reviewed minimum confirmation counts.

The wrapper content-addresses both the reviewed runtime target and its final
runtime-bound evidence.

## Gate meaning

Only a real green production-runtime invocation may emit:

```text
participant_control_finality_evidence_imported=true
participant_post_purchase_voidtoken_control_ready=true
production_runtime_binding_required=false
```

It deliberately retains:

```text
coupled_candidate_updated=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

The coupled economic candidate remains a separate reviewed transition.

## Authority boundary

The wrapper reads input/evidence files and performs read-only loopback RPC. It
may create one private receipt file with create-only semantics.

It has no credential, wallet/signer, private-key, transaction construction,
transaction signing, transaction submission, transaction broadcast,
authoritative Chain-2050 write, token movement, funds movement, market
activation, or presale-activation authority.

## Source verification

```bash
node scripts/prove_void_participant_postpurchase_production_runtime_finality_v1.mjs
```

The proof uses only a local ephemeral HTTP fixture. It does not contact the live
Chain-2050 runtime.

## Future live invocation

After the canonical target is independently selected and reviewed, a live
operator can run:

```bash
node tools/void-participant-postpurchase-production-runtime-finality-v1.mjs \
  --submission /absolute/path/participant-control-submission.json \
  --expected /absolute/path/reviewed-finality-binding.json \
  --min-confirmations 6 \
  --output /absolute/path/production-runtime-finality.json
```

Without an active canonical target, that command must fail before any RPC call.
