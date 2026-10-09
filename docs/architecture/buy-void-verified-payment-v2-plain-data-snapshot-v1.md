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

Plain-data-snapshot V2 blob:

`af8bf48fc43a57fac7032a5a6027d1b03aa37054`

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
- uses only the detached snapshots for the rest of verification.

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
control.

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
