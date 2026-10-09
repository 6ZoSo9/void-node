# Buy VOID auto-fulfillment primitive authority boundary V1

## Purpose

This Draft repairs the structural-coercion boundary documented by negative
witness PR #2705 while retaining #2702's canonical-RPC and caller-snapshot
hardening.

The pure fulfillment decision has multiple direct consumers (including the
fulfillment journal and pipeline coordinator), so primitive-type authority must
be enforced in `buy_void_auto_fulfillment_v1.ts` itself.

Predecessor source blob:
`1ac1ad6213be83f1aa8261a554caa91544fe5e09`.

Repaired source blob:
`916528049e74546f06ae0f734b0a178bb556119a`.

## Repair

Authority-bearing chain/hash/address/request/status values must be primitive
strings before trimming or case normalization.

Integer-like values accept only reviewed primitive `bigint | number | string`
forms. USDC/VOID decimal quantities accept primitive strings or finite numbers.

The decision additionally:

- requires the request and verified-event request IDs to be primitive strings;
- requires verified-event operator status to be a primitive string;
- requires the payment verifier to be a non-array object;
- requires the chain allowlist to actually be an array;
- treats a verifier transaction hash as fallback-eligible only when truly
  absent (`null`/`undefined`), not merely falsy;
- parses minimum confirmations without `Number(object)` coercion; and
- requires prior-claim canonical identity, request ID and decision fingerprint
  fields to be primitive strings before a durable claim can suppress work as a
  duplicate.

## Focused proof

The proof starts from one approved synthetic Base/USDC fulfillment decision and
requires 30 malformed structural-type cases to HOLD. It separately requires
array-wrapped canonical-payment-identity inputs to throw and malformed prior
claims to HOLD.

A primitive-variant control confirms the reviewed numeric/string forms still
produce the exact same canonical approved decision and instruction.

Node 22/24/26 must emit byte-identical proof receipts.

## Authority boundary

This repair does not call RPC, write a fulfillment journal, mount a runtime
route, access customer data, wallet/key/signer material, construct/sign/broadcast
a transaction, mutate Chain-2050/WC, activate presale/market, or move inventory,
treasury, liquidity, or funds.

The worker remains disabled/dry under its existing policy. This source change is
not production activation authority.

Keep Draft until exact-head focused proof and interaction CI are green.

**PROTECT THE CORE.**
