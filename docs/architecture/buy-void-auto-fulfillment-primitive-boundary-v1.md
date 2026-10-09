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

Primitive-only repair source blob:
`7c2ca19bde43b13df36bd06c946ad96130fe5d05`.

Initial generic plain-data snapshot blob:
`3f10035412f6a52eebe4c4855b8f18072d452f47`.

Current selected-field snapshot blob:
`0784bd1a2a05c2ccb92b29ad425ad43a1cff2b3d`.

## Repair

Authority-bearing chain/hash/address/request/status values must be primitive
strings before trimming or case normalization.

Integer-like receipt/verifier values accept only reviewed primitive `bigint | number | string` forms. `min_confirmations_by_chain` is stricter: the policy type is `Record<string, number>`, so it requires a positive safe integer number and rejects string/bigint aliases. USDC/VOID decimal quantities accept primitive strings or finite numbers.

Before those semantic checks, the decision now snapshots only the reviewed
authority surface: request fields, verified-event/verifier fields, policy fields
and maps for normalized allowlisted chains, plus bounded prior-claim fields and
their unsigned instructions. Unknown caller properties are never enumerated.
The snapshot rejects Proxy objects before traps, accessor/hidden properties
before getter execution, custom object/array prototypes, symbols, sparse arrays,
oversized allowlists/prior-claim arrays and oversized reviewed text. Only the
detached frozen selected data is used afterward.

The decision additionally:

- requires the request and verified-event request IDs to be primitive strings;
- requires verified-event operator status to be a primitive string;
- requires the payment verifier to be a non-array object;
- requires the chain allowlist to actually be an array;
- requires confirmation/USDC/receive policy maps to be non-array record containers;
- rejects a supplied non-array `prior_claims` value instead of silently treating it as an empty claim history;
- treats a verifier transaction hash as fallback-eligible only when truly
  absent (`null`/`undefined`), not merely falsy;
- parses minimum confirmations without `Number(object)` coercion; and
- requires prior-claim canonical identity, request ID and decision fingerprint
  fields to be primitive strings before a durable claim can suppress work as a
  duplicate.

## Focused proof

The proof starts from one approved synthetic Base/USDC fulfillment decision and
requires 37 malformed structural/container-type cases to HOLD. It separately requires
array-wrapped canonical-payment-identity inputs to throw and malformed prior
claims to HOLD.

A primitive-variant control confirms the reviewed numeric/string forms still
produce the exact same canonical approved decision and instruction.

The proof also requires top-level/request/payment-verifier Proxy inputs,
request/policy-map/prior-claim accessors, a revoked array Proxy and a custom
request prototype to HOLD with caller getters/traps unexecuted. It further
proves irrelevant top-level/request/policy-map getters are ignored without
enumeration, oversized allowlists/prior-claim arrays HOLD before descriptor
allocation, and oversized reviewed text HOLDs at snapshot admission.

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
