# DataNet field-object pull bounded transport v1

Marker: `VOID_DATANET_FIELD_OBJECT_PULL_BOUNDS_V1`

Status: source/proof only; no deployment or runtime activation.

## Purpose

The field-object puller retrieves one operator-selected DataNet object from a
local pathname, `file:` URL, HTTP URL, or HTTPS URL and accepts the bytes only
when they match an exact expected SHA-256 digest.

This repair closes memory, lifetime, evidence-disclosure, and output-namespace
gaps before any retrieved bytes are treated as usable local evidence.

## Input and work bounds

The puller enforces three independent limits:

- `VOID_PULL_MAX_BYTES`
  - default: 64 MiB
  - accepted range: 1 byte through 256 MiB
- `VOID_PULL_TIMEOUT_MS`
  - socket inactivity deadline
  - default: 10 seconds
  - accepted range: 100 ms through 60 seconds
- `VOID_PULL_TOTAL_TIMEOUT_MS`
  - complete acquisition deadline
  - default: 30 seconds
  - accepted range: 100 ms through 120 seconds

Invalid control text fails before output acquisition or source I/O.

The expected digest must be exactly 64 lowercase or uppercase hexadecimal
characters, optionally prefixed by `sha256:`. It is normalized to lowercase
before comparison.

## URI admission and evidence identity

Every URI-form input passes through one common URL parser before protocol
dispatch.

### `file:` URLs

A `file:` URL is accepted only when all of the following are true:

- it has no username or password;
- it has no query string;
- it has no fragment;
- its host is empty or `localhost`; and
- Node's canonical `fileURLToPath()` conversion succeeds.

A rejected file URL is represented in evidence only as
`file://<rejected-local-path>`. An accepted file URL is represented as
`file://<operator-local-path>`. The operator's local pathname is not copied from
the raw URL into stdout or the receipt.

This prevents a suffix such as `?token=...` or `#token=...` from being ignored
by pathname conversion while still being copied into evidence.

### HTTP and HTTPS URLs

HTTP and HTTPS URLs:

- reject username/password material;
- reject fragments;
- preserve the query only for the outbound request;
- omit the query from stdout and receipt source identity;
- reject redirects;
- reject non-2xx status;
- reject malformed `Content-Length`;
- reject an advertised oversize response before retaining body bytes; and
- stop a streamed response at the first byte beyond the admitted ceiling.

A failed network pull retains zero response-body bytes.

### Ordinary local pathnames

An input without a URI scheme remains an operator-selected local pathname.
It is not reinterpreted as a URL.

## Local object acquisition

Local pathname and accepted `file:` reads:

1. open the leaf with `O_NOFOLLOW`;
2. require a regular file;
3. reject an admitted size above the byte ceiling;
4. read exactly the admitted size from the retained descriptor;
5. probe for unexpected growth;
6. re-stat the retained descriptor; and
7. require the exact file generation to remain unchanged.

The generation comparison binds device, inode, UID, GID, mode, size, link
count, modification time, and change time. A symlink leaf is never followed.

## Output namespace authority

The puller admits **existing** private output directories before source I/O.
It never creates, deletes, or changes permissions on directories. This removes
the `mkdir -> open` interval in which a newly created directory could be
replaced and the replacement mistakenly adopted as the created generation.

Before invoking the puller, an operator must provision and admit both
`.void-field-trial` and `.void-field-trial/datanet-field-object-pull` beneath
the selected working directory. Both must be real, current-UID-owned mode
`0700` directories. Provisioning must occur in a trusted setup context; it is
not performed or attested by this CLI. An absent component produces
`OUTPUT_DIRECTORY_REQUIRED` before source I/O and without creating anything.
Existing unsafe components are rejected; the CLI never repairs their modes.

Successful invocations publish two files directly in the admitted family:

- `.void-field-trial/datanet-field-object-pull/<128-bit-random>.object.txt`
- `.void-field-trial/datanet-field-object-pull/<128-bit-random>.receipt.json`

This deliberately replaces the previous per-run directory layout. Consumers
must use the `receipt=` stdout value and the receipt's `object_path` rather
than assume a fixed `object.txt` name or enumerate run directories. The CLI
arguments and transport limits are unchanged.

The output contract is:

- retain a current-UID-owned, non-group/other-writable working-directory fd;
- admit each existing child through its retained parent via `/proc/self/fd`,
  using `O_DIRECTORY | O_NOFOLLOW` and lstat/open device/inode equality;
- require child UID and exact private mode, plus lexical/pinned identity equality;
- retain all admitted directory descriptors through publication;
- publish random leaves relative to the family fd with
  `O_CREAT | O_EXCL | O_NOFOLLOW`, with no replacement or collision retry;
- require mode `0600`, current UID, one link, exact size, file fsync, and exact
  same-descriptor readback, then fsync the family directory;
- revalidate directory generations and published lexical leaf identity.

A replaced acquired directory produces `OUTPUT_NAMESPACE_CHANGED`; descriptor
relative writes cannot be redirected into its replacement. A random leaf
collision produces HOLD without deleting, chmodding, or overwriting that
foreign leaf. If the second publication fails, the invocation's own object
file can remain without a receipt; consumers must require the successful
receipt terminal. This is not atomic publication of a pair of files.

Only this admitted publication path can emit `dangerous_paths_touched=false`
and `output_namespace_bound=true`. These assertions concern this invocation's
output operations, not exclusive custody against an arbitrary same-UID process
or external directory provisioning.

## Receipt

A completed pull writes:

- exact expected and observed SHA-256 values;
- whether the hashes match;
- admitted byte count;
- bounded transport limits;
- sanitized source identity and source type;
- bounded transport status/error information;
- the relative object evidence pathname; and
- the closed output-namespace policy.

A transport failure still produces a private zero-byte `<generation>.object.txt` and a
private failure receipt when the output namespace itself remains safe. An
unsafe or changed output namespace produces a process-level HOLD and no receipt
path.

## Executable proof

`scripts/prove_datanet_field_object_pull_bounds_v1.mjs` drives the real CLI in
disposable directories against local files and a loopback HTTP server.

The 29 cases cover:

1. valid local pathname pull;
2. valid `file:` URL pull;
3. `file:` query rejection without disclosure;
4. `file:` fragment rejection without disclosure;
5. remote-host `file:` URL rejection;
6. local oversize rejection with zero retained payload bytes;
7. local symlink rejection;
8. valid HTTP pull;
9. HTTP query use with sanitized evidence;
10. HTTP fragment rejection without disclosure;
11. HTTP credential rejection without disclosure;
12. redirect rejection;
13. non-2xx rejection;
14. advertised oversize rejection;
15. streamed oversize rejection;
16. malformed `Content-Length` rejection;
17. inactivity deadline;
18. total-operation deadline against a continuously trickling peer;
19. hash mismatch;
20. invalid limit rejection before output/source I/O;
21. output-root symlink rejection before source I/O;
22. output-family symlink rejection before source I/O;
23. unsafe output-parent mode rejection before source I/O;
24. in-flight admitted-family replacement with zero replacement-tree writes;
25–26. missing root/family HOLD, with a preload poised to replace any runtime
       created directory immediately after mkdir and before open;
27. repeated successful pulls create only distinct file pairs, with the same
    mkdir replacement interposer proving no runtime run-directory creation;
28–29. deterministic object/receipt name collisions preserve foreign bytes,
       inode, mode, links and timestamps without a success receipt.

The test-only preloads interpose Node builtins in child processes; the CLI has
no production attack hook. Since directory creation is eliminated, the missing
component tests require HOLD and prove the replacement hook is never reached.
The existing-directory control proves successful operation without any mkdir.

The proof creates and removes only disposable local state and contacts no
production peer. The existing `tools/check_datanet_field_object_exchange_v1.sh`
smoke test now provisions its private fixture explicitly and runs both create
and pull there; it no longer writes fixture objects into the checkout or uses
a shared `/tmp` shell environment file. The focused workflow runs both proofs
on Node 22/24/26 and verifies that checkout matches the exact PR head.

## DataNet and Chain-2050 boundary

This tool proves only bounded acquisition and exact digest equality for one
object. A matching digest does not prove:

- that Chain-2050 finalized the expected digest;
- that the object is durably replicated;
- that another peer can retrieve it;
- that repair has completed;
- that the object remains available after this local receipt; or
- that a local receipt overrides finalized chain state.

Under `VOID_COORDINATION_CONTROL_PLANE_V510`, Chain-2050 remains the canonical
source of finalized commitments where current source actually records them.
DataNet remains responsible for the referenced bytes, replicas, retrieval, and
repair. This puller is one bounded byte-acquisition primitive inside that
availability plane.

## Authority boundary

This change does not:

- contact a production DataNet peer in CI;
- alter Chain-2050 state;
- deploy or restart a service;
- mutate production configuration or networking;
- access credentials, keys, wallets, or signers;
- dispatch paid work;
- mutate Work Credits or validators;
- construct, sign, or broadcast a transaction;
- fund presale inventory;
- enable the public presale; or
- move funds.
