# Buy VOID custody V2 read-only Unix socket inspect client V1

**Source-only, unmounted; no web/custody production acceptance.**

The V2 custody service already supports an `inspect` request over a framed,
local Unix socket, but there was no reusable, bounded client. This narrowly
scoped client sends **only** the exact V2 `inspect` request with empty request
payload. No caller-selected method, buyer identity, ledger pathname, signer,
status mutation or allocation bytes can cross this client.

The caller must provide four own-data fields: absolute canonical socket path,
expected socket UID, expected socket group GID, and a bounded total timeout.
Proxies, accessors, unknown keys, non-Linux/root callers and malformed fields
HOLD before attempting connection. The client verifies local directory and
socket metadata before and after, rejects symlink ancestors, sends a single
canonical V2 inspect envelope followed by LF and write EOF, and requires a
single bounded, UTF-8-canonical response terminated by LF. It checks the exact
SHA-256 of the *canonical request*, the V2 marker/schema/version and the
immutable `inspected` result. Every mutation/activation/trust flag must be
false. Missing/malformed/forged, oversized, delayed or changed-socket evidence
returns HOLD. No retries or fallback transport.

The Linux socket pathname, owner and group do **not** cryptographically attest
`SO_PEERCRED` or protect against all socket substitution races. This primitive
explicitly returns `socket_peer_credentials_authenticated=false`,
`cross_uid_principal_separation_verified=false` and
`protected_custody_verified=false`, even on successful inspect. A later
installed-host/production acceptance must independently prove two real
principals, durable source identity, socket parent custody, protected
allocation high-water, stable host/mount generations and a verified control
channel. The client is not a release or authorization mechanism.

The original V2 `reserve`/`recover` functions remain HOLD. This client does not
send either method or mount the web writer. It does not enable payment
acceptance, custody mutation, public presale, WC/VOID exchange, transfer,
transaction broadcast, or funds movement.

The existing custody V2 workflow runs the client proof on Node 22, 24 and 26,
including inert fake-socket adversaries and a **real disposable same-UID V2
service** with empty allocation ledger and canonical genesis high-water.
That real socket test verifies the IPC protocol, not real cross-UID
permissions. No production fixture or customer data is read or changed.

Source-positive and synthetic-real-service green are distinct from deployed
production acceptance. **PROTECT THE CORE.**


## Socket response UTF-8 intrinsic boundary

The source client binds the original `TextDecoder.prototype.decode` to its
own fatal decoder instance **during module initialization**, before any socket
bytes arrive. It does not invoke a later mutable global `Reflect.apply` at
parse time. Mutating either `TextDecoder.prototype.decode` or
`Reflect.apply` **after** initialization cannot change decoded socket bytes.
The negative proof poisons both globals, first proves that each replacement
would forge a positive inspection result if invoked, and then sends malformed
and invalid-UTF8 wire frames. Both must HOLD with zero poisoned callbacks.
The proof restores both globals before the real-service protocol test.

This is a same-process mutation defense, not a claim against prototype
compromise before source initialization, changed Unix-socket peer identity,
lost high-water history, malicious installed code, or authenticated custody.
All payment, reserve/recover, release, production and funds flags remain false.
