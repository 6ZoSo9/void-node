# Buy VOID final V7 V2 enforcement lock V1

This source/CI-only lock accepts the exact current 28-member enforcement
candidate derived byte-identically on Node 22, 24 and 26 by #2978.

Exact candidate:
- head: `d5a8e8914d830ed210cf6483590490632ac76454`
- bytes: `5651`
- SHA-256: `929bdd377d64de242387a6db4d37e333333cdaaa4a31cece3126c352e2dcd085`
- Git blob SHA-1: `c331e2dbef9fa4f82f3dfcc205a6564e836ad1df`
- enforcement set:
  `d62a87d8c6adeccc3a25cc8e9fe3d7199dddee3ea8ac9706d15862adfd446697`
- census ID:
  `voidbefv7c2_2dddb68128ce0baff4a848568fac7651c025cc97956cdf1b3d6faff6a9ae075a`
- six-module V7 generation:
  `cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311`.

The lock promotes only:

`candidate_enforcement_identity_accepted=false -> true`.

It keeps deployment, runtime-mount, production source-finality, public presale,
and funds authority false.

Focused CI rederives the candidate on Node 22/24/26, compares those exact
same-run bytes to the committed candidate evidence, derives the lock on all
three Node majors, and requires exact lock-byte equality.

Protected selector installation, V2 collector/receipt publication, current
deployment/provider receipts, live external provider qualification, coupled
WC/VOID launch evidence and the real payment canary remain separate gates.

No live service/config/RPC, credentials, key/wallet/signer, payment/transaction,
Chain-2050/WC, inventory/treasury/liquidity, presale or funds action occurs.

**PROTECT THE CORE.**
