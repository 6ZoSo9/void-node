# External opportunity dual-source quote verification envelope v1

Marker: `VOID_EXTERNAL_OPPORTUNITY_DUAL_SOURCE_QUOTE_VERIFICATION_ENVELOPE_V1`

## Purpose

The conservative reducer receipt is content-addressed, but a content digest alone
proves only internal integrity. It does not prove that the receipt was derived
from the source quotes a caller claims to have supplied.

The input-bound verifier closes that derivation gap by recomputing the complete
receipt from the source input. This envelope makes that stronger verification
result machine-readable for downstream paper-observation components.

## Required verification sequence

A verification envelope may be created only after the implementation:

1. validates the closed reducer receipt;
2. verifies the reducer receipt digest;
3. recomputes the canonical conservative receipt from the supplied source input;
4. requires exact canonical equality between the supplied and recomputed receipt;
5. binds the resulting source-input and reducer-receipt SHA-256 values into the
   verification envelope.

The envelope verifier repeats the same input-bound procedure and requires exact
canonical equality with the recomputed envelope. Verification against a
different input or receipt fails closed.

## Evidence meaning

The following fields may be true only after the full sequence succeeds:

- `receipt_integrity_verified`
- `receipt_derivation_verified`
- `conservative_derivation_recomputed`

They do not authenticate either source provider. The envelope therefore retains:

```text
source_identity_authenticated=false
```

A downstream paper observer can distinguish a receipt that merely parses from a
receipt whose conservative derivation was recomputed against the supplied
source evidence.

## Adversarial boundary

The proof rejects:

- verification against a different source input;
- a modified envelope with a recomputed unkeyed envelope digest;
- a modified reducer receipt with a recomputed unkeyed receipt digest;
- a verification-envelope digest that does not match its contents.

The proof also requires the schema to remain closed and the generated envelope
to preserve every non-execution authority field.

## Operational boundary

This contract is source-only and paper-only. It performs no network request,
credential access, provider authentication, raw-response retention, transaction
payload retention, balance query, approval, transaction construction, signing,
submission, swap, bridge, deployment, restart, Work Credit write, Buy VOID
mutation, wallet access, custody, or fund movement.

A successful verification envelope proves only that the supplied reducer receipt
matches the supplied source input under the reviewed conservative algorithm. It
does not prove live liquidity, fill reliability, market consensus, executable
profit, or authority to trade.
