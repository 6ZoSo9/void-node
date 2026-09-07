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

Invalid control text fails before output-directory creation or source I/O.

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

Create-only mode bits on `object.txt` and `receipt.json` are not sufficient if
an intermediate output directory can redirect publication. The puller
therefore acquires the complete evidence namespace before source I/O.

The namespace is:

```text
<working-directory>/
  .void-field-trial/
    datanet-field-object-pull/
      <timestamp>-<pid>-<128-bit-random-generation>/
        object.txt
        receipt.json
```

The output contract is:

- the working directory is opened and retained as a directory descriptor;
- it must be current-UID-owned and not group/other writable;
- each fixed child component is looked up through the retained parent
  descriptor using `/proc/self/fd`;
- every child is opened with `O_DIRECTORY | O_NOFOLLOW`;
- fixed and run directories must be current-UID-owned mode `0700`;
- lexical and pinned device/inode identities must match;
- the run directory has a 128-bit random generation suffix;
- all directory descriptors remain open through publication;
- each leaf is opened through the retained run-directory descriptor with
  `O_CREAT | O_EXCL | O_NOFOLLOW`;
- each leaf is current-UID-owned, mode `0600`, single-link, exact-size, fsynced,
  and byte-for-byte read back from the same descriptor;
- the run and containing family directories are fsynced;
- every retained directory and both lexical leaf names are revalidated before
  success.

A pre-existing output-root or output-family symlink fails before source I/O. A
group/other-writable evidence parent also fails before source I/O.

If an acquired run directory is renamed and replaced while a source request is
in flight, the operation reports `VOID_DATANET_FIELD_OBJECT_PULL_V1_HOLD` with
`OUTPUT_NAMESPACE_CHANGED`. It publishes neither object nor receipt into the
replacement generation.

Only after this authority wall passes may the receipt state:

```json
{
  "dangerous_paths_touched": false,
  "output_namespace_bound": true
}
```

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

A transport failure still produces a private zero-byte `object.txt` and a
private failure receipt when the output namespace itself remains safe. An
unsafe or changed output namespace produces a process-level HOLD and no receipt
path.

## Executable proof

`scripts/prove_datanet_field_object_pull_bounds_v1.mjs` drives the real CLI in
disposable directories against local files and a loopback HTTP server.

The 24 cases cover:

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
23. unsafe output-parent mode rejection before source I/O; and
24. in-flight run-directory replacement with zero replacement-tree writes.

The proof creates and removes only disposable local state and contacts no
production peer.

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
