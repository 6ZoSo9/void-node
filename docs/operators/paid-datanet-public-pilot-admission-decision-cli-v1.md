# Paid DataNet Public Pilot Admission Decision CLI V1

Marker: `VOID_PAID_DATANET_PUBLIC_PILOT_ADMISSION_DECISION_CLI_V1`

## Purpose

This CLI is the explicit operator boundary between a verified Paid DataNet payment and admission of the paid request into the work queue.

It consumes:

- One real Payment Confirmation packet with disposition `PAYMENT_CONFIRMED_PACKET`.
- One local JSON array containing the existing admission-receipt chain. Use `[]` for the first decision.
- A bounded operator identifier.
- An explicit `APPROVE` or `REJECT` decision.
- A canonical reason code.
- A canonical UTC decision timestamp.
- The exact confirmation token:

```text
decidePaidDataNetPublicPilotAdmissionV1
```

A valid decision emits:

```text
ADMISSION_DECISION_RECEIPT
```

Malformed, tampered, duplicate, secret-shaped, unconfirmed, or contract-incompatible input emits:

```text
HOLD_FOR_ADMISSION_REVIEW
```

## Usage

Approve a verified request when payment and bounded capacity are available:

```bash
npx --no-install tsx \
  scripts/paid_datanet_public_pilot_admission_decision_cli_v1.ts \
  --payment-confirmation /path/to/payment-confirmed-packet.json \
  --receipts /path/to/admission-receipts.json \
  --operator zoso.operator \
  --decision APPROVE \
  --reason PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE \
  --decided-at "2026-05-28T20:35:40.000Z" \
  --confirm decidePaidDataNetPublicPilotAdmissionV1
```

Reject a request:

```bash
npx --no-install tsx \
  scripts/paid_datanet_public_pilot_admission_decision_cli_v1.ts \
  --payment-confirmation /path/to/payment-confirmed-packet.json \
  --receipts /path/to/admission-receipts.json \
  --operator zoso.operator \
  --decision REJECT \
  --reason CAPACITY_UNAVAILABLE \
  --decided-at "2026-05-28T20:35:40.000Z" \
  --confirm decidePaidDataNetPublicPilotAdmissionV1
```

The CLI reads local JSON and writes one JSON decision packet to stdout. It performs no filesystem writes. Redirect stdout only when an operator intentionally wants to persist the receipt or updated chain.

## Payment Confirmation verification

The CLI consumes the actual merged Payment Confirmation V1 contract. It verifies:

- Schema, marker, and `PAYMENT_CONFIRMED_PACKET` disposition.
- The exact `payment_confirmation_id` calculation.
- Approval, Bridge, Triage, Quote Packet, and payment-evidence hash bindings.
- The canonical `admission_request_input`.
- The nested `PAYMENT_CONFIRMED_AWAITING_OPERATOR_ADMISSION` packet.
- Exact quote ID, service code, requester, amount, and `USD_CENTS` currency continuity.
- Confirmation, payment, quote, source-chain, and admission-compatibility flags.
- Every payment collection, money movement, wallet, admission, execution, network, filesystem, Work Credit, and treasury boundary remains disabled before the operator decision.

Any inconsistency produces `HOLD_FOR_ADMISSION_REVIEW`.

## Canonical admission request

The CLI reconstructs the request through:

```text
createPaidDatanetAdmissionRequestV1
```

It then verifies the deterministic request ID through:

```text
verifyPaidDatanetAdmissionRequestV1
```

The request remains `PENDING_OPERATOR_DECISION` until the explicit operator decision is appended.

## Existing receipt chain

The `--receipts` JSON must be an array of canonical admission receipts.

The CLI requires:

- Exact sequence continuity starting at `1`.
- Exact `previous_receipt_sha256` continuity.
- Valid deterministic receipt hashes.
- No duplicate decision for an admission request.
- No secret-shaped values.
- Full verification through `verifyPaidDatanetAdmissionReceiptChainV1`.

Use an empty array for the first receipt:

```json
[]
```

The successful output includes the complete updated chain and the newly appended receipt.

## Decision semantics

`APPROVE` requires exactly:

```text
PAYMENT_VERIFIED_AND_CAPACITY_AVAILABLE
```

The resulting receipt status is:

```text
ADMITTED_AWAITING_SEPARATE_EXECUTION
```

`REJECT` requires one of:

```text
CAPACITY_UNAVAILABLE
PAYMENT_EVIDENCE_REJECTED
POLICY_REJECTED
REQUESTER_CANCELLED
```

The resulting receipt status is:

```text
REJECTED
```

A second decision for the same `admission_request_id` is rejected.

## Execution boundary

An approved receipt authorizes admission only. It does not authorize or start service execution.

Every successful receipt preserves:

```text
automatic_admission_enabled=false
execution_authorized=false
automatic_execution_enabled=false
payment_collection_enabled=false
payment_movement_enabled=false
network_access_enabled=false
filesystem_write_enabled=false
wc_mutation_enabled=false
treasury_access_enabled=false
```

A separate execution boundary must consume the admitted receipt later.

## Proof

Run:

```bash
npx --no-install tsx \
  scripts/prove_paid_datanet_public_pilot_admission_decision_cli_v1.ts
```

The 479-assertion proof constructs the real public issue → Triage → Quote Bridge → Quote Approval → Payment Confirmation → Admission Decision chain. It verifies all three paid service classes, deterministic approval and rejection receipts, request and receipt-chain integrity, append-only sequence continuity, prior-chain extension, duplicate-decision rejection, explicit confirmation, canonical reason semantics, secret rejection, local-only CLI behavior, and tamper holds across payment, admission, receipt, amount, currency, time, identity, and safety-control bindings.
