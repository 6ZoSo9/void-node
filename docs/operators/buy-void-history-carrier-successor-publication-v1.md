# Buy VOID history-carrier successor publication gate v1

Marker: `VOID_BUY_VOID_HISTORY_CARRIER_SUCCESSOR_PUBLICATION_GATE_V1`

Issue: #1783

Status: source-only publication gate. This gate does **not** mount successor
production into reservation, obligation, or terminal-closeout runtime paths and
does not make the payment-keyed runtime activation-ready.

## Purpose

The durable carrier authority already verifies and publishes a complete successor
when given an exact verified carrier root, transaction intent, and page set.
What was missing was a narrow lifecycle-facing contract that:

- pins the exact current carrier predecessor;
- distinguishes reservation, paid-unreservable-obligation, and history-refresh
  transitions;
- re-runs the full carrier-successor verifier;
- re-runs transaction-intent/root binding;
- binds the exact new page digest set;
- emits a deterministic dry-run publication fingerprint;
- requires an exact apply confirmation and fingerprint; and
- delegates the actual create-only publication to the existing durable carrier
  authority.

That contract is now
`runBuyVoidHistoryCarrierSuccessorPublicationV1`.

## Supported transition kinds

The gate accepts exactly:

```text
reservation
paid_unreservable_obligation
history_refresh
```

The selected transition must equal the successor root's
`committing_record_kind`.

The existing carrier verifier remains authoritative for generation progression,
predecessor binding, committed VOID accounting, reservation count, obligation
count, segmented durable-root progression, and zero-unit history refresh.

## Dry-run / apply contract

Dry-run validates all authority and successor bindings and returns:

```text
required_confirmation=publishBuyVoidHistoryCarrierSuccessorV1
publication_fingerprint_sha256=<sha256>
```

Dry-run performs no publication.

Apply requires both the exact confirmation token and exact publication
fingerprint from the same validated plan. A stale predecessor, altered transition,
changed page set, or modified carrier/intent changes or invalidates the apply
contract.

## Publication authority

Apply delegates only to:

`publishBuyVoidHistoryCarrierRootSuccessorV1`

The returned durable receipt must bind the expected successor generation/root and
must still report:

```text
runtime_activation_authorized=false
apply_activation_authorized=false
public_activation_authorized=false
transaction_broadcast=false
chain2050_write=false
funds_movement=false
```

Exact duplicate publication remains idempotent through the existing carrier
authority.

## Deliberate remaining hold

This PR does **not** manufacture the segmented successor or append-only witness.

The segmented checkpoint contract explicitly separates the expensive append-only
witness producer from bounded online consumers. Therefore this gate does not
silently introduce a lifetime-history prefix scan into the purchase path.

Source truth remains:

```text
segmented_successor_witness_producer_mounted=false
reservation_lifecycle_mount=false
paid_unreservable_obligation_lifecycle_mount=false
terminal_closeout_refresh_mount=false
runtime_activation_ready=false
```

The next #1783 gate must provide a separately reviewed, crash-safe segmented
successor/witness producer and then mount this publication contract after the
corresponding durable payment-history mutation.

## Required mount ordering

Future lifecycle integration must preserve:

1. durable reservation / obligation / terminal history mutation first;
2. exact successor plan and witness production second;
3. this publication gate third;
4. runtime stage completion only after publication is created or exact-duplicate.

A crash between steps 1 and 3 must be recoverable without repeating inventory
consumption, signing, broadcast, or funds movement.

## Authority boundary

This source gate adds no:

- runtime enablement;
- apply enablement;
- public Buy VOID activation;
- systemd or service mutation;
- credential content read;
- wallet or signer access;
- Chain-2050 RPC;
- transaction signing or broadcast;
- inventory mutation of its own;
- treasury/liquidity action; or
- funds movement.
