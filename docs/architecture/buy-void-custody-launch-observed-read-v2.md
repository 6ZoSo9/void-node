# Buy VOID custody launch observed read V2

Status: **source-only current-generation successor; no deployed custody authority**.

Historical V1 remains immutable and pinned to coupled-launch gate blob
`e0402744ae51bb7bda2dc1e2038aae217d868ed9`. V2 reuses the unchanged
descriptor-bound custody observer and binds the repaired current launch gate.

Current source identities:
- custody observer V1: `d0dd148d6701e5e47cc8301d71a0777876560834`;
- custody authority V2: `223ebdb8317009228094b8ebecef19dc37d87a91`;
- coupled-launch gate: `b2ea864a26016877063b4e3067f4fec54282d820`.

The repaired gate rereads the full live launch gate on every under-lock request
authority assertion. Receipt deletion/replacement, source-gate withdrawal,
lease expiry, and coherent receipt renewal are therefore observed before a
request or payment mutation proceeds.

This successor does not read deployed custody evidence, provision credentials,
enable a writer, activate Buy VOID/WC-VOID, sign or broadcast a transaction, or
move funds.

```bash
node --check scripts/prove_buy_void_custody_launch_observed_read_v2.mjs
node scripts/prove_buy_void_custody_launch_observed_read_v2.mjs
```

Historical V1 is preserved rather than repinned to force GREEN.

**PROTECT THE CORE.**
