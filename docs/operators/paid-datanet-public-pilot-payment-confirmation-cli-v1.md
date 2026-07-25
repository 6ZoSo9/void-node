# Paid DataNet Public Pilot Payment Confirmation CLI V1

Marker: `VOID_PAID_DATANET_PUBLIC_PILOT_PAYMENT_CONFIRMATION_CLI_V1`

## Purpose

This CLI is the explicit operator boundary between an approved Paid DataNet customer quote and a payment-confirmed packet that is compatible with the existing request-admission contract.

It consumes:

- One real Quote Approval packet with disposition `APPROVED_QUOTE_PACKET`.
- One local, non-secret payment-evidence packet.
- The customer acceptance timestamp.
- The confirming operator display name.
- A canonical UTC confirmation timestamp.
- The exact confirmation token:

```text
confirmPaidDataNetPublicPilotPaymentV1
```

A valid confirmation emits:

```text
PAYMENT_CONFIRMED_PACKET
```

Any missing, malformed, inconsistent, expired, tampered, underpaid, overpaid, secret-shaped, or unconfirmed input emits:

```text
HOLD_FOR_PAYMENT_REVIEW
```

## Usage

```bash
npx --no-install tsx \
  scripts/paid_datanet_public_pilot_payment_confirmation_cli_v1.ts \
  --approval /path/to/approved-quote-packet.json \
  --payment-evidence /path/to/non-secret-payment-evidence.json \
  --customer-accepted-at-ms 1780000360000 \
  --confirmer "ZoSo Payment Verifier" \
  --confirmed-at "2026-05-28T20:34:40.000Z" \
  --confirm confirmPaidDataNetPublicPilotPaymentV1
```

The CLI reads two local JSON files and writes one JSON packet to stdout. Redirect stdout only when an operator intentionally wants to persist the confirmation packet.

## Payment evidence contract

The local payment-evidence packet must use:

```text
void-paid-datanet-public-pilot-payment-evidence-v1
```

Required fields:

- `settlement_rail`: bounded public identifier such as `USDC_BASE`.
- `settlement_reference`: bounded, non-secret public settlement reference.
- `settlement_evidence_sha256`: SHA-256 of the externally retained settlement evidence.
- `verifier_id`: bounded operator or verifier identifier.
- `verification_status`: exactly `VERIFIED`.
- `amount_cents`: exact quoted total in cents.
- `currency`: exactly `USD_CENTS`.
- `observed_at_ms`: payment observation time within the quote window.

The packet must not contain private keys, seed phrases, payment credentials, API keys, confidential data, or other secret-shaped values. It carries an opaque evidence hash and bounded public reference, not payment credentials.

## Approval verification

The CLI consumes the actual merged Quote Approval contract. It verifies:

- Approval schema, marker, and `APPROVED_QUOTE_PACKET` disposition.
- The exact approval ID calculation.
- Bridge, triage, draft-input, and quote-packet hash continuity.
- The nested `APPROVED_AWAITING_CUSTOMER_PAYMENT` wrapper.
- The canonical quote packet with `verifyPaidDatanetQuotePacketV1`.
- Customer-payment-required controls.
- Every admission, execution, network, filesystem, Work Credit, and treasury boundary remains disabled.

## Amount and time binding

Payment confirmation requires:

- Payment amount equal to the canonical quoted total.
- Currency equal to `USD_CENTS`.
- Customer acceptance no earlier than quote approval.
- Customer acceptance no later than payment observation.
- Payment observation no later than quote expiry.
- Confirmation no earlier than payment observation.
- Confirmation no later than quote expiry.

Mismatches produce `HOLD_FOR_PAYMENT_REVIEW`.

## Admission compatibility

A successful packet carries a deterministic `admission_request_input` containing:

- The canonical quote.
- Customer acceptance bound to the quote ID, requester, amount, and currency.
- Opaque verified payment evidence.
- The confirmation timestamp as the proposed submission time.

The CLI validates this input with the existing request-admission contract. This proves compatibility only. It does not admit the request.

A successful confirmation is marked:

```text
PAYMENT_CONFIRMED_AWAITING_OPERATOR_ADMISSION
```

An operator decision remains required before admission, and execution remains a separate boundary.

## Safety boundary

The CLI:

- Does not collect or move payment.
- Does not access a wallet or private key.
- Has no GitHub API access.
- Has no network access.
- Performs no filesystem writes.
- Does not authorize admission.
- Does not authorize execution.
- Does not enable automatic execution.
- Does not mutate Work Credits.
- Does not access treasury.

## Proof

Run:

```bash
npx --no-install tsx \
  scripts/prove_paid_datanet_public_pilot_payment_confirmation_cli_v1.ts
```

The 700-assertion proof constructs the real public issue → triage → Quote Bridge → Quote Approval → Payment Confirmation chain. It verifies all three service classes, canonical quote and source-hash continuity, exact amount and currency binding, non-secret opaque evidence, explicit confirmation, deterministic output, request-admission compatibility, local-only CLI behavior, and hold behavior for tampering and unsafe inputs.
