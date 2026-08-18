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
pending past that deadline. One unresolved acquisition for the same exact
method/URL is quarantined until it actually settles; if it later yields a live
response after the caller-visible deadline, that response receives one bounded
cleanup attempt before the quarantine is released. This prevents repeated
retries from accumulating unowned acquisition generations.

Body-reader acquisition is also inside the owned rejection boundary. A locked
or throwing body reader aborts the request and receives the same bounded
best-effort response cleanup as other terminal rejections. Once a body read
reaches the request deadline, the primary `request deadline exceeded` result is
preserved while cancellation receives a separate explicit 250 ms teardown
terminal; it does not inherit a zero-length slice of the already-expired request
budget. Cleanup rejection or non-settlement cannot replace the primary HOLD.
HEAD responses retain no body bytes. These bounds change evidence collection
only; they grant no browser, signing, deployment, payment, credential, or
runtime authority.

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
