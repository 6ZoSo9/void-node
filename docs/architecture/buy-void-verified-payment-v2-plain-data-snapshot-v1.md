# Buy VOID verified-payment V2 plain-data snapshot V1

## Purpose

This Draft is a child of PR #2697. The parent closes JSON structural coercion;
this successor closes a separate executable-object boundary.

The parent V2 source still read request, policy, receipt and transfer-log
properties directly. Getter properties and Proxy traps could therefore execute
while the verifier was building payment authority. That behavior is reproduced
separately by negative witness PR #2699.

This successor requires a one-time inert data snapshot before verification.

## Source lineage

Primitive-boundary predecessor V2 blob:

`0df94fb35681f358318416fe6c48f3b794cd6074`

Earlier plain-data-snapshot V2 blob:

`af8bf48fc43a57fac7032a5a6027d1b03aa37054`

Current bounded per-index snapshot V2 blob:

`550ede02fc0b7d6874c324af58b5ef9c5591b311`

The later source keeps the same plain-data authority model while avoiding
whole-array descriptor-table allocation. The inherited primitive regression is
therefore repinned to this exact current blob rather than to the earlier
bounded-snapshot generation `21420412cc9b3cf9d415e179151eb973dda07131`.

## Snapshot rules

The verifier now:

- rejects Proxy objects before property traversal;
- requires ordinary or null-prototype records for reviewed object boundaries;
- reads reviewed fields only through own property descriptors;
- rejects accessor properties without invoking their getters;
- copies arrays only from exact own indexed data properties and rejects sparse,
  accessor-backed, Proxy, subclassed or custom-property arrays;
- snapshots policy maps from own enumerable data properties;
- snapshots checkout payment instructions before consistency checks;
- snapshots receipt logs and their topic arrays before transfer matching; and
- uses only the detached snapshots for the rest of verification;
- caps the reviewed chain allowlist at 32 entries, receipt logs at 4096 and
  per-log topics at 16 **before** allocating array descriptor tables;
- caps reviewed string fields at 1 MiB; and
- reads policy maps only for normalized allowlisted chains through exact own
  data descriptors, so unrelated enumerable properties/getters are neither
  enumerated nor executed.

Unknown top-level/request fields are not traversed merely because they exist;
only fields used by this verifier enter the snapshot boundary.

## Regression evidence

The existing 29-case primitive-boundary proof is repinned to the new V2 blob
and must remain green.

A new focused proof requires nine executable-object cases to HOLD while their
getters/Proxy traps remain completely unexecuted:

- request-ID accessor;
- policy allowlist accessor;
- receipt-logs accessor;
- payment-instructions accessor;
- policy-map entry accessor;
- request Proxy;
- transfer-log Proxy; and
- top-level input Proxy; and
- revoked `allowed_chains` array Proxy, which must HOLD without throwing.

The same proof requires ordinary null-prototype data records to remain accepted
and to produce the exact same canonical verified event as the plain-object
control. It additionally proves oversized allowlist/log arrays HOLD before
descriptor-table allocation, an unrelated policy-map getter is not enumerated,
and oversized reviewed text HOLDs at snapshot admission.

## Downstream boundary

This changes the reviewed V2 source identity again. V6 reviewed-source,
compiled-artifact, enforcement and packaged-image identities that pin earlier
V2 bytes must remain fail-closed until explicitly succeeded by fresh evidence.

No real RPC call, customer record, allocation/custody write, service mount,
wallet/key/signer access, transaction construction/signing/broadcast,
Chain-2050/WC mutation, presale/market activation, or funds movement occurs.

Keep Draft until exact-head semantic proofs and downstream source-finality
successor evidence are green.

**PROTECT THE CORE.**
