# Paid DataNet Service Catalog V1

Marker: `VOID_PAID_DATANET_SERVICE_CATALOG_V1`

## Purpose

This lane creates an immediately usable commercial contract for bounded DataNet work without adding a payment rail or activating autonomous execution.

V1 converts existing DataNet verification capabilities into three explicit customer-facing SKUs:

1. `datanet.object-integrity-check.v1`
2. `datanet.public-retrieval-evidence.v1`
3. `datanet.dataset-replication-audit.v1`

Each quote is deterministic, denominated in integer USD cents, bound to a request identifier and requester identifier, protected by an operator-cost margin floor, and valid for a fixed fifteen-minute window.

## Commercial boundary

A V1 quote is an offer calculation, not acceptance, payment collection, work execution, settlement, or fulfillment.

Every quote states:

- operator approval is required;
- customer payment is required before work;
- automatic execution is disabled;
- automatic payment collection is disabled;
- treasury access is disabled;
- tax is not calculated by this module.

The caller must handle identity review, customer communications, applicable tax treatment, invoice or payment collection, job admission, execution, receipt signing, and delivery.

## Pricing model

All arithmetic uses safe integers. Floating-point currency is forbidden.

```text
billable_mib = ceil(total_bytes / 1,048,576)

catalog_subtotal =
  base_cents
  + object_count * per_object_cents
  + billable_mib * per_billable_mib_cents

cost_protected_subtotal =
  ceil(operator_cost_basis_cents * 10,000
       / (10,000 - minimum_operator_margin_bps))

quoted_total =
  max(catalog_subtotal, cost_protected_subtotal)
```

This prevents the deterministic catalog from quoting below its configured catalog floor or below the declared direct-cost margin floor.

## V1 prices

| Service | Base | Per object | Per billable MiB | Minimum margin |
|---|---:|---:|---:|---:|
| Object Integrity Check | $2.50 | $0.25 | $0.02 | 25% |
| Public Retrieval Evidence | $4.00 | $0.50 | $0.03 | 30% |
| Dataset Replication Audit | $12.00 | $0.10 | $0.01 | 35% |

These are operator-controlled V1 floor prices, not promises about market demand or profitability. The cost basis supplied to the quote must include expected labor, compute, bandwidth, storage, third-party fees, and a reasonable reserve for failed attempts.

## Evidence rule

Payment alone never proves completion. A paid job is complete only when the service-specific evidence packet and operator-signed completion receipt exist.

This catalog does not award Work Credits. Any later WC award must continue to require accepted, verifiable receipts and must use the existing bounded WC policy.

## Explicit exclusions

This lane does not:

- modify `src/index.ts`;
- add or mount HTTP routes;
- change the public UI;
- access wallets, signers, private keys, or treasury funds;
- issue invoices or collect payments;
- award, debit, or settle Work Credits;
- submit transactions;
- deploy or restart services;
- contact remote networks;
- automatically execute customer work.

## Next bounded integration

After this catalog is independently reviewed and merged, the next non-colliding layer should be a request-envelope and operator-admission module. That later layer should consume a V1 quote, require proof of payment from the approved payment rail, and emit an append-only admission receipt. It should not be built inside this catalog lane.
