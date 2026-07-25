# Paid DataNet Public Pilot Quote Approval CLI V1

Marker: `VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1`

## Purpose

This CLI is the explicit human approval boundary between a reviewed Paid DataNet `DRAFT_QUOTE_INPUT` and an approved customer-facing quote packet.

It accepts one local Quote Bridge JSON packet, an approver display name, a canonical UTC approval timestamp, and the exact confirmation token:

```text
approvePaidDataNetPublicPilotQuoteV1
```

A valid approval emits:

```text
APPROVED_QUOTE_PACKET
```

Any missing, malformed, inconsistent, expired, tampered, or unconfirmed input emits:

```text
HOLD_FOR_OPERATOR_APPROVAL
```

## Usage

```bash
npx --no-install tsx \
  scripts/paid_datanet_public_pilot_quote_approval_cli_v1.ts \
  --bridge /path/to/draft-quote-input.json \
  --approver "ZoSo Operator" \
  --approved-at "2026-07-25T12:30:00.000Z" \
  --confirm approvePaidDataNetPublicPilotQuoteV1
```

The CLI uses local file input and writes one JSON packet to stdout. Redirect stdout only when an operator intentionally wants to persist the approved packet.

## Approval requirements

The bridge packet must:

- Use schema `void-paid-datanet-public-pilot-quote-bridge-v1`.
- Have disposition `DRAFT_QUOTE_INPUT`.
- Carry valid SHA-256 bridge, triage-packet, and triage identifiers.
- Contain one canonical draft quote input.
- Match any declared draft quote input hash.
- Contain a valid service ID, customer ID, request ID, currency, and positive total amount.
- Contain no secret-shaped values.

The operator must provide:

- A display name rather than an email address or credential.
- A canonical ISO-8601 UTC approval timestamp.
- The exact confirmation token.

## Approved packet semantics

`APPROVED_QUOTE_PACKET` means the operator approved the quote terms for customer presentation. The embedded customer packet is marked:

```text
APPROVED_AWAITING_CUSTOMER_PAYMENT
```

Customer payment is still required. Quote approval does not authorize admission or execution. It does not collect payment, move funds, access treasury, mutate Work Credits, or start work.

## Safety boundary

The CLI:

- Has no GitHub API access.
- Has no network access.
- Performs no filesystem writes.
- Does not collect payment.
- Does not authorize admission.
- Does not authorize execution.
- Does not enable automatic execution.
- Does not mutate Work Credits.
- Does not access treasury.

## Proof

Run:

```bash
npx --no-install tsx \
  scripts/prove_paid_datanet_public_pilot_quote_approval_cli_v1.ts
```

The proof covers deterministic hashing, bridge and triage binding, confirmation enforcement, approver and timestamp validation, quote expiry rules, secret-shaped input rejection, local-only CLI behavior, all three service classes, hold behavior, and the no-payment/no-execution boundary.
