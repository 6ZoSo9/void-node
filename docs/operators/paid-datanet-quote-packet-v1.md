# Paid DataNet Quote Packet V1

Marker: `VOID_PAID_DATANET_QUOTE_PACKET_V1`

## Purpose

This offline tool converts a deterministic Paid DataNet quote into a customer-facing packet with two synchronized representations:

- a machine-readable JSON envelope;
- a rendered Markdown quote suitable for review or customer communication.

The packet is generated directly from the merged Paid DataNet Service Catalog V1. It does not depend on the unmerged Request Admission or Quote CLI branches.

## Generate JSON

```bash
npx --no-install tsx \\
  scripts/paid_datanet_quote_packet_v1.ts \\
  --issuer-name "VOID Network" \\
  --customer-name "Example Customer" \\
  --customer-reference customer-ref-001 \\
  --request-id request-packet-001 \\
  --requester-id customer-account-001 \\
  --service-code datanet.object-integrity-check.v1 \\
  --object-count 2 \\
  --total-bytes 1048577 \\
  --operator-cost-basis-cents 200 \\
  --requested-at-ms 1800000000000 \\
  --format json
```

JSON is the default output format and includes the complete Markdown packet in the `markdown` field.

## Generate Markdown

```bash
npx --no-install tsx \\
  scripts/paid_datanet_quote_packet_v1.ts \\
  --issuer-name "VOID Network" \\
  --customer-name "Example Customer" \\
  --customer-reference customer-ref-001 \\
  --request-id request-packet-001 \\
  --requester-id customer-account-001 \\
  --service-code datanet.object-integrity-check.v1 \\
  --object-count 2 \\
  --total-bytes 1048577 \\
  --operator-cost-basis-cents 200 \\
  --requested-at-ms 1800000000000 \\
  --format markdown
```

## Determinism

The generator does not read the system clock. The caller supplies `--requested-at-ms`, and the merged catalog computes the quote validity window. Identical inputs produce the same quote ID, Markdown, and packet SHA-256.

The packet binds:

- issuer display name;
- customer display name and reference;
- quote identity and exact price;
- bounded service scope;
- required completion evidence;
- exclusions;
- validity timestamps;
- disabled payment, execution, WC, and treasury controls.

## Verification

`verifyPaidDatanetQuotePacketV1` reconstructs the catalog quote, service metadata, Markdown, and packet hash. A recomputed hash alone is insufficient when any required binding or control has changed.

## Commercial boundary

A packet is a quote only. It is not:

- an invoice;
- proof of payment;
- a work-admission decision;
- execution authorization;
- a completion receipt;
- tax calculation;
- Work Credit issuance or settlement.

Operator approval and customer payment remain required before work. Payment collection, execution, automatic execution, WC mutation, and treasury access remain disabled.

## Proof

```bash
npx --no-install tsx \\
  scripts/prove_paid_datanet_quote_packet_v1.ts
```

The proof covers deterministic generation, JSON and Markdown output, price formatting, catalog consistency, all three service definitions, Markdown escaping, error handling, disabled controls, and tamper rejection.
