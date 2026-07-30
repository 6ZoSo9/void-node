# VOID DataNet Paid Read Quote V1

Marker: `VOID_DATANET_PAID_READ_QUOTE_V1`

## Purpose

This additive command-line tool generates one deterministic, machine-readable
quote for the existing Paid DataNet service
`datanet.public-retrieval-evidence.v1`.

It specializes the merged catalog to one public DataNet read and binds the
commercial quote to:

- caller-selected request and requester identifiers;
- one exact DataNet dataset identifier;
- one exact `who` identity;
- one public HTTP or HTTPS source origin;
- one canonical `/datanet/v1/fetch/<dataset>?who=<identity>` URL;
- the expected object byte count;
- the operator's direct cost basis in integer USD cents;
- an explicit caller-supplied Unix timestamp.

The tool does not contact the source, perform a DataNet fetch, collect or confirm
payment, authorize work, execute work, access a wallet or signer, submit a
transaction, modify Work Credits, settle VOID, or access treasury funds.

## Catalog contract

The adapter is fail-closed against:

```text
src/paid_services/datanet_service_catalog_v1.ts
```

Expected SHA-256:

```text
452c777bd21f22cfb596276e1a75b923fc1cfb45371f2fbec6a5cde020eabdff
```

The exact V1 service terms are:

| Field | Value |
|---|---:|
| Service code | `datanet.public-retrieval-evidence.v1` |
| Base price | 400 cents |
| Per object | 50 cents |
| Per billable MiB | 3 cents |
| Minimum operator margin | 3000 bps |
| Maximum total bytes | 134,217,728 |
| Quote validity | 900,000 ms |
| Object count | exactly 1 |

If the catalog source changes, this V1 adapter stops rather than silently quote
against stale terms.

## Generate a quote

```bash
node tools/void-datanet-paid-read-quote-v1.mjs   --request-id request-read-001   --requester-id customer-read-001   --dataset-id ds_public_read_001   --who customer-read-001   --source-base https://public-node.example   --total-bytes 42   --operator-cost-basis-cents 0   --requested-at-ms 1800000000000   --format pretty
```

The default format is compact JSON. `--format pretty` changes presentation only.

For the example above, the catalog subtotal and quoted total are both 453 USD
cents:

```text
400 base + 50 one-object charge + 3 one-MiB charge = 453
```

## Public-source boundary

`--source-base` must contain only an HTTP or HTTPS scheme and authority. User
credentials, paths, queries, and fragments are rejected.

Literal loopback, link-local, private IPv4, carrier-grade NAT/Tailscale-range
IPv4, private IPv6, and `.local`/`localhost` names are rejected. This is an
offline syntactic boundary; the tool does not perform DNS resolution or network
access.

## Determinism

Identical inputs and an unchanged catalog source produce identical:

- catalog `quote_id`;
- specialized `read_quote_id`;
- fetch URL;
- price and validity window;
- compact JSON output.

The caller supplies `--requested-at-ms`; the tool never reads the system clock.

## Output

Success writes exactly one JSON object to standard output and returns `0`.

Important fields include:

- `schema`: `void-datanet-paid-read-quote-v1`;
- `marker`: `VOID_DATANET_PAID_READ_QUOTE_V1`;
- `status`: `QUOTE_GREEN`;
- `read_quote_id`;
- `catalog_contract`;
- `binding.fetch_url`;
- the complete existing catalog `quote`;
- explicit disabled controls.

Validation failures write exactly one compact JSON error object to standard error
and return `2`.

## Commercial boundary

A generated payload is a quote only. It is not:

- an invoice;
- proof or confirmation of payment;
- admission of customer work;
- authorization to fetch or execute;
- a completion receipt;
- a tax calculation;
- a Work Credit issuance or settlement record.

Operator approval and customer payment remain required before work. Payment
collection, automatic execution, DataNet mutation, wallet/signer access,
transaction submission, Work Credit writes, VOID settlement, and treasury access
remain disabled.

## Proof

```bash
node scripts/prove_void_datanet_paid_read_quote_v1.mjs
```

The proof covers the exact catalog SHA and terms, deterministic catalog and
specialized quote identifiers, the 453-cent one-read example, cost-floor
protection, maximum byte pricing, public-source restrictions, argument
validation, pretty/compact equivalence, disabled-control guarantees, and a static
no-network/no-child-process boundary.
