# Paid DataNet Read Quote Public Discovery V1

Marker: `VOID_DATANET_PAID_READ_QUOTE_PUBLIC_DISCOVERY_V1`

## Purpose

This lane publishes a static, machine-readable discovery card for the sealed
deterministic quote generator for one bounded public DataNet read.

Public card:

```text
/public-node/datanet/paid-read-quote-v1.json
```

Card schema:

```text
/public-node/datanet/paid-read-quote-v1.schema.json
```

The card is linked from the existing static DataNet discovery index:

```text
/public-node/datanet/index.json
```

No runtime route is added.

## Service

The published service is the existing catalog entry:

```text
datanet.public-retrieval-evidence.v1
```

The V1 one-read terms are:

| Field | Value |
|---|---:|
| Base price | 400 USD cents |
| One-object charge | 50 USD cents |
| Per billable MiB | 3 USD cents |
| Minimum operator margin | 3000 bps |
| Maximum bytes | 134,217,728 |
| Quote validity | 900,000 ms |
| Target completion | 1,800 seconds |
| Object count | exactly 1 |

The static card does not calculate a new price. It publishes the exact contract
already enforced by:

```text
src/paid_services/datanet_service_catalog_v1.ts
tools/void-datanet-paid-read-quote-v1.mjs
```

The catalog source is fail-closed at SHA-256:

```text
452c777bd21f22cfb596276e1a75b923fc1cfb45371f2fbec6a5cde020eabdff
```

## Canonical sample

The card publishes a public-safe deterministic example:

```text
request_id=request-read-001
requester_id=customer-read-001
dataset_id=ds_public_read_001
who=customer-read-001
source_base=https://public-node.example
total_bytes=42
operator_cost_basis_cents=0
requested_at_ms=1800000000000
quoted_total_cents=453
```

Deterministic identifiers:

```text
quote_id=60ac49dcefbf8f1ed7e4956f2ce83f6db09380e712ff41f7b3ad83d28e7c3615
read_quote_id=58ab3b6103eb6e00392cbd6e540d22b07a705e7b2bdea18a233016f9c2b7fab5
```

Pretty canonical sample SHA-256:

```text
d0343ce33cccdfd9f6de239c47d617fe9716570e8d24bb6edae3ffab897f96cf
```

The example is not a live customer request, invoice, payment record, work
authorization, completion receipt, or tax calculation.

## Generate a quote

```bash
node tools/void-datanet-paid-read-quote-v1.mjs \
  --request-id request-read-001 \
  --requester-id customer-read-001 \
  --dataset-id ds_public_read_001 \
  --who customer-read-001 \
  --source-base https://public-node.example \
  --total-bytes 42 \
  --operator-cost-basis-cents 0 \
  --requested-at-ms 1800000000000 \
  --format pretty
```

The tool performs no network request. A caller supplies all inputs, including the
timestamp.

## Commercial boundary

The published surface is quote-only and discovery-only.

Operator approval and customer payment remain required before work. The static
card does not:

- collect or confirm payment;
- admit, authorize, schedule, or execute work;
- perform a DataNet fetch or mutation;
- access a wallet or signer;
- submit a transaction;
- write Work Credits;
- settle VOID;
- access treasury funds;
- move funds.

## Publication boundary

Exactly six repository files implement this discovery surface:

```text
public/public-node/datanet/index.json
public/public-node/datanet/paid-read-quote-v1.json
public/public-node/datanet/paid-read-quote-v1.schema.json
docs/public-node/datanet/datanet-paid-read-quote-public-discovery-v1.md
ops/mainnet0/void-datanet-paid-read-quote-public-discovery-v1-proof.sh
.github/workflows/void-datanet-paid-read-quote-public-discovery-v1.yml
```

No server registration, Express router, runtime mutation source, Buy VOID file,
agent-authentication file, paid-agent-work file, or public Work Credit runtime
file is changed.

## Proof

```bash
bash ops/mainnet0/void-datanet-paid-read-quote-public-discovery-v1-proof.sh
```

The proof verifies the exact index entry, strict card schema, source hashes,
492-assertion sealed quote proof, deterministic sample output, canonical sample
SHA, price and identifier bindings, and all disabled authority fields.
