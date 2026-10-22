# Buy VOID custody allocation-root observed read V1

Marker: `VOID_BUY_VOID_CUSTODY_ALLOCATION_OBSERVED_READ_V1`.

Status: **source-only read capability / production HOLD**.

Exact source Git blob: `0bfc2e09ee26cbaefb18d3be1a5a65a4afa9dbcb`.

Focused proof Git blob: `4374e121f5f6ed347c5fa376e3ce6a36d8aabecd`.

## FIFO-safe retained leaf opens

The allocation-root observer retains the existing descriptor-relative Linux
custody model and now opens the fixed allocation journal and high-water leaves
with `O_RDONLY|O_NOFOLLOW|O_NONBLOCK`.

The nonblocking flag does not make FIFO/device bytes acceptable. It only prevents
a regular-file lstat→open FIFO substitution from blocking before the existing
`fstat().isFile()`, single-link, owner, mode, size and generation checks reject
that replacement.

The focused proof uses disposable current-UID mode-0700 roots, exercises a
positive read, then substitutes a real FIFO between the high-water lstat and
production open. The open hook first requires the actual production flags to
contain `O_NONBLOCK`; only then is the FIFO installed and the real kernel open
performed. The production observer must HOLD on descriptor type/identity rather
than hang.

## Preserved authority

All mutation and production authority stays false:

- cross-root atomic snapshot proven: false;
- allocation writer lock held: false;
- installed service UID verified: false;
- cross-UID IPC authenticated: false;
- allocation reserve enabled: false;
- custody recover enabled: false;
- filesystem write: false;
- production allocation mutation ready: false;
- funds moved: false.

This repair changes reader availability/fail-closed behavior only. Bundle,
archive, acceptance-lock and installed-runtime identities remain separate
versioned successors.

**PROTECT THE CORE.**
