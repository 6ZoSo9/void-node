# Buy VOID bakery lock ambient toJSON isolation — current successor V1

## Purpose

Current integration retained later async/existing-queue bakery-lock functionality
but regressed the earlier claim-serialization hardening from #2683. A hostile
ambient `Object.prototype.toJSON` could execute while internal lock claims were
serialized and could rewrite authority bytes.

This successor applies only the two reviewed semantic repairs to the current
integration source:

- detach internal object claims onto a null-prototype root before JSON encoding;
- compare the exact sorted claim-key set directly instead of serializing the key
  arrays through ambient JSON hooks.

All later current-head bakery-lock APIs and queue behavior remain in place.

## Focused proof

The existing async bakery proof is extended with an adversarial ambient
`Object.prototype.toJSON`. Sync lock acquisition must succeed, the inherited
hook execution count must remain zero, and all temporary claim files must be
cleaned up.

The workflow runs the full existing proof on Node 22, 24 and 26 and requires
byte-identical receipts across all three majors.

## Authority boundary

Source/proof/CI/docs only. No live service, custody directory, customer record,
wallet/key/signer, transaction, Chain-2050/WC, presale/market, inventory,
treasury/liquidity or funds mutation.

This repair changes bakery-lock source identity, so older downstream bakery
candidate/attestation identities remain historical until separately re-derived
against this current source.

**PROTECT THE CORE.**
