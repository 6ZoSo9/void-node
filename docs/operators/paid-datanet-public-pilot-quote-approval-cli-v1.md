# Paid DataNet Public Pilot Quote Approval CLI V1

Marker: `VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_APPROVAL_CLI_V1`

## Purpose

This CLI is the explicit operator approval boundary between the actual Paid DataNet Quote Bridge output and an approved customer-facing quote packet.

It consumes one local Quote Bridge packet with disposition:

```text
DRAFT_QUOTE_INPUT
```

The bridge packet must contain its real nested `source`, `target`, `operator_input`, `draft_quote_input`, `quote_packet_cli_argv`, `checks`, `hold_reasons`, and `controls` contract. The CLI no longer accepts the former stand-alone generic fixture shape.

The operator must also provide a display name, a canonical UTC approval timestamp, and the exact confirmation token:

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
npx --no-install tsx   scripts/paid_datanet_public_pilot_quote_approval_cli_v1.ts   --bridge /path/to/quote-bridge-packet.json   --approver "ZoSo Operator"   --approved-at "2026-05-28T20:31:40.000Z"   --confirm approvePaidDataNetPublicPilotQuoteV1
```

The CLI uses local file input and writes one JSON packet to stdout. Redirect stdout only when an operator intentionally wants to persist the approved packet.

## Actual Bridge contract requirements

The Quote Bridge packet must:

- Use schema `void-paid-datanet-public-pilot-quote-bridge-v1`.
- Use marker `VOID_PAID_DATANET_PUBLIC_PILOT_QUOTE_BRIDGE_CLI_V1`.
- Have disposition `DRAFT_QUOTE_INPUT`.
- Carry a `bridge_id` that exactly hashes the packet body without `bridge_id`.
- Carry valid nested `source.triage_packet_sha256` and `source.triage_id` bindings.
- Carry valid issue-export and issue-body hashes, issue number, and issue URL.
- Target the canonical quote-packet schema and marker.
- Carry matching operator issuer, currency, cost basis, and request time.
- Carry one canonical `PaidDatanetQuotePacketRequestV1`.
- Carry CLI arguments that deterministically match that draft request.
- Report every Bridge check as true, no hold reasons, and the required safe controls.
- Contain no secret-shaped values.

## canonical quote packet generation

Approval invokes the merged canonical quote-packet logic:

```text
createPaidDatanetQuotePacketV1
verifyPaidDatanetQuotePacketV1
```

The generated quote packet must verify exactly. The approval timestamp must be no earlier than packet creation and no later than quote expiry.

The approved customer wrapper binds:

- The complete Bridge packet hash.
- `bridge_id`.
- Nested triage packet hash and `triage_id`.
- Draft quote input hash.
- Canonical quote packet hash.
- Approver identity and approval time.
- The exact approval confirmation.

The approved customer packet is marked:

```text
APPROVED_AWAITING_CUSTOMER_PAYMENT
```

Customer payment is still required. Quote approval does not collect payment and does not authorize admission or execution.

## Safety boundary

The CLI:

- Has no GitHub API access.
- Has no network access.
- Performs no filesystem writes.
- Does not collect or move payment.
- Does not authorize admission.
- Does not authorize execution.
- Does not enable automatic execution.
- Does not mutate Work Credits.
- Does not access treasury.

## Proofs

Run the focused approval proof:

```bash
npx --no-install tsx   scripts/prove_paid_datanet_public_pilot_quote_approval_cli_v1.ts
```

Run the end-to-end integration proof:

```bash
npx --no-install tsx   scripts/prove_paid_datanet_quote_bridge_approval_integration_v1.ts
```

The focused proof covers deterministic hashing, actual Quote Bridge contract validation, canonical quote-packet creation and verification, confirmation enforcement, approval-window checks, secret-shaped input rejection, all three service classes, local-only CLI behavior, and hold behavior.

The integration proof constructs a real public issue export, produces a triage packet, produces the actual Quote Bridge packet, approves it, and verifies every source, draft, bridge, approval, and quote-packet hash through the complete chain.
