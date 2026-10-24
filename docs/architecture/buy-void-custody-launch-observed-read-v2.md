# Buy VOID custody launch observed read V2

Status: **source-only current-generation successor; no deployed custody authority**.

Historical V1 remains immutable and pinned to coupled-launch gate blob
`e0402744ae51bb7bda2dc1e2038aae217d868ed9`. Current V2 binds the repaired
launch gate and the FIFO-nonblocking descriptor reader generation. Retained
leaf opens use `O_RDONLY|O_NOFOLLOW|O_NONBLOCK`; a regular-to-FIFO
lstat→open substitution therefore reaches descriptor type rejection instead
of blocking the custody process.

Current source identities:
- custody observer V1 current blob: `4b6ae905766d5bec3ecae3166e8d3de67a62b713`;
- custody authority V2: `223ebdb8317009228094b8ebecef19dc37d87a91`;
- coupled-launch gate: `b2ea864a26016877063b4e3067f4fec54282d820`.

The repaired gate rereads the full live launch gate on every under-lock request
authority assertion. Receipt deletion/replacement, source-gate withdrawal,
lease expiry, and coherent receipt renewal are therefore observed before a
request or payment mutation proceeds.

The disposable V2 proof performs a real regular-to-FIFO substitution on the
private high-water leaf after production lstat and before production open. The
hook first requires the actual production flags to contain `O_NONBLOCK`, then
requires `mkfifo` to create a real FIFO and requires the real kernel open to
return before accepting the expected production HOLD. Fixture-setup or kernel-
open errors are rethrown outside the observer's fail-closed catch boundary, so
a failed adversary cannot be misreported as GREEN.

This successor does not read deployed custody evidence, provision credentials,
enable a writer, activate Buy VOID/WC-VOID, sign or broadcast a transaction, or
move funds.

```bash
node --check scripts/prove_buy_void_custody_launch_observed_read_v2.mjs
node scripts/prove_buy_void_custody_launch_observed_read_v2.mjs
```

Historical V1 is preserved rather than repinned to force GREEN.

**PROTECT THE CORE.**
