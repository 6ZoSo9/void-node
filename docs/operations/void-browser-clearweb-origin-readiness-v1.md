# VOID Browser Clearweb Origin Readiness V1

Marker: `VOID_BROWSER_CLEARWEB_ORIGIN_READINESS_V1`

This lane provides a read-only, fail-closed survey between the merged clearweb
origin-binding contract and any offline signing ceremony. A `READY` result
means **READY for offline signing only**. It is not browser activation approval.

The survey does not select an origin. The operator must supply one exact,
reviewed, canonical default-port HTTPS origin. There is deliberately no default
for `voidchain.io` or any other domain.

## Readiness requirements

The live survey requires all of the following:

- execution on the physical host `zoso-Precision-Tower-7810`;
- a clean canonical repository whose `HEAD` and `origin/main` equal the exact
  expected full commit SHA;
- a public lowercase ASCII DNS origin using default-port HTTPS only;
- an authorized TLS 1.2 or 1.3 certificate with at least seven days remaining;
- no redirects, cookies, authentication challenge, credentials, or cross-origin
  resolution;
- exact `GET` and `HEAD` responses for the well-known discovery, canonical
  discovery, and capability-negotiation routes;
- byte identity between each live JSON response and the reviewed canonical
  repository source;
- the complete browser validators remaining read-only and fail-closed;
- the reviewed node ID, Ed25519 fingerprint, onion hostname, onion-binding
  digest, and onion-binding expiry remaining valid for at least seven days; and
- the future clearweb-binding path returning `404` or `410`, proving that no
  unsigned or unreviewed live binding is being presented.

Ambiguous, stale, redirected, divergent, authenticated, expiring, off-origin,
already-published, or elevated-authority evidence produces `HOLD`.

## Bounded response and teardown contract

Every surveyed GET body is streamed through the existing 1 MiB ceiling before
bytes are retained for JSON/source comparison. A present `Content-Length` must
be a canonical nonnegative safe integer and is rejected before body reading
when it exceeds the ceiling. Unknown-length/chunked responses are counted while
they stream and are rejected at the first byte beyond the ceiling.

The per-request deadline owns both response acquisition and body consumption.
A custom fetch implementation that ignores `AbortSignal` cannot keep the caller
pending past that deadline. One lease for each exact `(fetchImpl, method, URL)`
spans acquisition, body access, reads and cleanup. Same-key retries are rejected
while that generation lacks a real terminal; unrelated keys remain usable.

EOF, an asynchronously rejected read, successful cancellation, or a reader's
closed terminal can establish termination. Every read and cancellation already
started must also settle before the lease releases. A cleanup attempt, rejected
cancellation, or the separate 250 ms caller-visible cleanup deadline cannot
release an unresolved generation. Late fetch responses enter that same lease
and cleanup contract. Cleanup failure never replaces the primary HOLD.

Body access is snapshotted once inside the ownership boundary. A throwing body,
getReader or read accessor leaves ownership held unless safely reachable cleanup
or another observed terminal actually settles. A synchronous reader-call failure
alone does not establish termination. Unknown/nonterminal custom transports may
remain quarantined indefinitely; caller completion stays bounded.

Successful HEAD requires the standard Fetch `body === null` contract. A
nonstandard present body is rejected and receives the same bounded cleanup and
retained ownership as GET. These bounds change evidence collection only; they
grant no browser, signing, deployment, payment, credential, or runtime authority.

## Git provenance boundary

Authoritative Git inspection uses the protected system executable `/usr/bin/git`
on the reviewed Ubuntu/Linux profile. A different executable selected by PATH
is rejected without invocation. Every ambient `GIT_*` environment override is
rejected before repository inspection; child Git receives a fixed environment
with global/system configuration, replacement objects and lazy fetching disabled.
The system Git installation and operating system remain trusted; this is not
binary attestation against a compromised host.

Git's resolved worktree must equal the selected physical repository root.
Each required file's captured bytes and executable mode must match its entry in
the independently selected commit tree. Clean status alone is insufficient:
`assume-unchanged` cannot conceal substituted source bytes. HEAD, cleanliness and,
for live surveys, origin/main are checked again after the source snapshot.
Git reads have a ten-second deadline and four-MiB output ceiling.

Twenty synthetic provenance cases cover two repositories, repository/object/
namespace/config/program overrides, PATH shadowing, local worktree redirection,
hidden modified source, and recovery to the exact committed bytes. These tests
create disposable repositories only; they do not run a live network survey.

## CI versus live survey

GitHub Actions runs only deterministic source/adversarial proofs. It intentionally
skips the physical-presence assertion and makes no network request because a
hosted runner cannot prove presence on Precision. The focused matrix runs on
Node.js 22, 24, and 26 and proves declared oversize, streamed overflow,
pre-response acquisition deadline/quarantine/late cleanup, locked-reader
rejection, deadline-triggered body teardown with non-settling cancellation,
rejecting/non-settling cancellation, and preservation of small valid responses.
The original adversarial proof separately proves that live `survey` mode
requires the exact physical hostname while `source` mode records
`not_run_in_ci_source_mode`.

## Operator command

After this lane is merged, fetch `origin/main`, verify the canonical checkout is
clean, replace both placeholders, and run on Precision:

```bash
node ops/mainnet0/survey_void_browser_clearweb_origin_readiness_v1.mjs \
  survey \
  --repo-root "$HOME/dev/void-node" \
  --expected-head <FULL_CURRENT_MAIN_SHA> \
  --origin <EXACT_REVIEWED_HTTPS_ORIGIN>
```

The command prints one schema-bound `READY` or `HOLD` receipt to standard
output. It does not write an artifact, create or sign a binding, broaden the
extension manifest, request browser permission, change DNS or TLS, or expose a
route.

No private key, signer, mnemonic, seed phrase, wallet, treasury, Work Credit
ledger, payment executor, or transaction path is read or invoked. The survey
does not deploy, restart a service, mutate node runtime state, submit a
transaction, grant payment authority, or move funds.

If and only if a reviewed live survey returns `READY`, the next separate lane is
an explicit offline signing-request package. Publishing that signed binding and
activating one exact browser origin remain later, independently reviewed steps.
