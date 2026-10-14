# Buy VOID final V7 V2 enforcement lock V1

This source/CI-only lock accepts the exact current 28-member enforcement
candidate derived byte-identically on Node 22, 24 and 26 by #2978.

Exact candidate:
- head: `fc8fe175852fa57af72617d91347133463c3b88c`
- bytes: `6133`
- SHA-256: `257ea83b8abbbe7cfd7e486317c55c3522b6e2015b91371aac923bb9db5e1e78`
- Git blob SHA-1: `67d1f64dd569cf081cd947ddc94105f932f4ddab`
- enforcement set:
  `bfb2412a3b349c2d6e83a78c81db98f8fff74b62e2cf9657249bac4e35dc26a4`
- census ID:
  `voidbefv7c2_2dddb68128ce0baff4a848568fac7651c025cc97956cdf1b3d6faff6a9ae075a`
- six-module V7 generation:
  `cfac0b510932203623a4b9a0c09ad9c6639efdb04b0e5f1ff9feba15175f9311`.

The repaired candidate binds the actual hosted #2974 JSON.stringify inventory
digests `e7fe07c5...` / `ceaaf5cd...` and separately retains the canonical
sorted-key inventory digests `8d186c88...` / `9036b38b...`. The committed
candidate evidence and lock proof require both contracts.

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
