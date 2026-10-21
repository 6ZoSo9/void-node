# Buy VOID verified-payment capacity: FIFO-safe retained leaf opens V2

**Status:** source-only, no installed-host or economic authority. This is a narrow
availability/TOCTOU hardening successor for the immutable V1 writer, not a new
payment admission or allocation policy.

## Reviewed cause

The current-main `src/economic/buy_void_verified_payment_capacity_admission_v1.ts`
historical Git blob `ac8bf352979e0e24d2cab45c3b23949e1bd2b026`
uses retained `/proc/self/fd/<directory-fd>/<leaf>` paths:

- `openPinnedLedgerV1` opens ordinary request/operator JSONL history with
  `O_RDONLY|O_NOFOLLOW` (or writable `O_RDWR|O_APPEND|O_NOFOLLOW`).
  A read-only open of a substituted FIFO waits for a writer before
  `fstat().isFile()` can reject it.
- `openPinnedPrivateSidecarV1` opens private terminal-event sidecars with
  `O_RDONLY|O_NOFOLLOW`, then verifies regular-file identity. Its open has the
  same FIFO blocking exposure.

This is a fail-closed completion/availability concern requiring a writer with
appropriate pathname mutation authority; it is not evidence of unauthorized
wallet access or a production payment. Directory descriptor custody, ownership,
mode/link-count, size, exact byte, path and open-file-generation requirements
remain unchanged.

## Narrow implementation

The existing capacity descriptor-safety gate now requires
`fs.constants.O_NONBLOCK` to exist (no numeric fallback). The two retained
regular-file opens append `O_NONBLOCK`, preserving existing read/write
selection and `O_NOFOLLOW`. Create-exclusive opens and directory behavior are
unchanged.

New source blob: `d1320be22fe55af24017b84f0655fbcde82dbee9`.
Historical source bytes can be reconstructed by removing exactly the added
nonblocking constant/availability check and reversing the two open flags; the
proof asserts exact historical Git-blob identity. The additional exported
`testOnlyReadPrivateCapacitySidecarBytesV1` wrapper invokes the *existing*
production private-sidecar reader using only its current process UID and a
provided pathname. It performs no write, publication, or operator event and
has no HTTP mount. Its sole purpose is to test the actual sidecar path with
disposable files.

## Inert regression

The focused Node.js 22/24/26 proof imports the **production V1
`testOnlyReadStrictCapacityLedgerFileV1`** helper. It validates a normal
synthetic JSONL file, then inserts a real mode-0600 FIFO **at the actual
production open boundary** after replacing the initial regular leaf. An
instrumented open asserts `O_NONBLOCK|O_NOFOLLOW` before creating the FIFO, so
regressing the flags fails immediately instead of hanging CI. The real helper
must reach its existing regular-file type check and reject; the test does not
rewrite or unlink the displaced regular file. The proof also tests a normal
private sidecar read through the new test-only wrapper, then performs an
identical **regular-to-FIFO swap at the production sidecar open boundary**.
The actual sidecar helper must reject the FIFO before reading bytes, with the
original sidecar retained under its displaced test name. Both nonblocking open
sites remain source-checked, and all five source edits (including the test-only
wrapper) are inverted to authenticate the original source blob.

The proof's only filesystem changes are its own temporary test directory.
No root privileges, protected installed paths, network, credentials, signer,
RPC, service mutation, ledger/payment admission, or funds are used.

## Release gates

**The existing V7 protected 49-source inventory, accepted candidates, locks,
and historical tests are not repinned.** They may correctly reject this new
production economic-source Git blob. Such refusals require a separately
reviewed versioned-source successor and are not authority to weaken a frozen
candidate or accepted lock.

`mounted_verified_allocation_dispatch=false` remains the latest reviewed
source-level status unless current independent host evidence establishes
otherwise. This patch does not mount the dispatcher, authorize verified-payment
allocation, prove installed private-root custody, or enable public intake,
fulfillment, WC/VOID trading, signing, transaction broadcast, treasury or funds
movement.

No merge/Ready, deployment, host execution or economic activation is
authorized here.

**PROTECT THE CORE.**
