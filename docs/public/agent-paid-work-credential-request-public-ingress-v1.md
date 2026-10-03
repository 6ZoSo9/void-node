# Agent paid-work credential request public ingress v1

Marker: `VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_INGRESS_V1`

Issue: #2382
Parent cohort blocker: #2376
Policy context: #2370 / #2364

## Purpose

Add the missing bounded public-ingress composition for the existing credential
request path without broadening WC/VOID opening eligibility and without making
credential issuance public.

The canonical public AI-agent gateway may proxy exactly:

```text
POST /__void/agents/paid-work/credential-requests/v1
```

to the existing loopback credential-request gateway when, and only when, the
operator explicitly configures:

```text
VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM=http://127.0.0.1:<port>
VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE=<N>
VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE=<M>
```

All three source defaults are empty, so the route fails closed with HTTP 503
until the loopback service has been separately configured, started, proven, the
reviewed rate-budget relation is supplied, and the public proxy has been
explicitly activated.

## Boundary preserved

The upstream credential-request gateway already performs:

- exact POST-only route matching;
- query-parameter rejection;
- JSON/content-length/body-size checks;
- payload SHA-256 verification;
- per-remote request-rate limiting;
- private state-directory mode checks; and
- credential-request intake only.

The public proxy adds its own:

- exact path allowlist;
- no query/hash forwarding;
- JSON-only input;
- bounded request body;
- required lowercase payload SHA-256;
- a signed Ed25519 applicant-auth envelope in
  `x-void-applicant-auth-v1`;
- exact binding of that signature to the unchanged inner request ID, exact body
  SHA-256, POST method, exact route, issue/expiry times and nonce;
- exact equality between the key-derived `void-agent:ed25519:...` identity and
  the inner credential request's `agent_id`, rejecting key/body identity
  mismatch;
- the existing `void-agent:ed25519:<digest>` identity derivation over a public
  Ed25519 JWK;
- a 60-second maximum auth lifetime with clock-skew and expiry rejection;
- nonce replay rejection before upstream proxying;
- a bounded per-key public-edge rate window;
- a required rate-budget relationship that reserves capacity for at least a
  second signing identity before the shared loopback wall can be exhausted by
  one signing identity;
- no trust in `X-Forwarded-For`, `Forwarded`, or caller-selected network
  identity headers;
- loopback-only reviewed upstream URL;
- upstream timeout;
- redirect suppression;
- bounded upstream response; and
- response-header filtering.

The public route may create one bounded credential-request intake record through
the reviewed upstream. The public applicant signature authenticates the
presented signing key and binds it to the request at this edge; it does **not**
approve the credential request or grant any credential/session authority. The exact inner
`VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_V1` body is forwarded unchanged after
edge verification.

It does **not** issue a credential, mutate the credential registry, create a
WC-account binding, dispatch work, award WC, write the WC ledger, access a
wallet/signer, sign or broadcast a transaction, or move funds.

Credential review and issuance remain operator-controlled and separate.

## Applicant authentication and per-key rate isolation

The public route is configured only when all three operator inputs are present:

```text
VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_GATEWAY_UPSTREAM=http://127.0.0.1:<port>
VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_MAX_REQUESTS_PER_MINUTE=<N>
VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_UPSTREAM_GLOBAL_LIMIT_PER_MINUTE=<M>
```

The gateway requires `2 * N <= M`. The reviewed example is `N=4`,
`M=12`, matching the existing loopback gateway's reviewed 12/minute global
wall while preventing one verified signing identity from consuming that entire
bucket. This does not prevent one actor using multiple self-issued keys from
consuming the global budget.
The public edge also mirrors `M` as its own bounded global rolling window
before proxying. This keeps verified-but-rejected traffic from growing
per-key/replay state without bound, while the loopback gateway remains the
independent second/global wall.

The `x-void-applicant-auth-v1` header is base64url-encoded JSON. Its signed
canonical body contains exactly:

```json
{
  "agent_id": "void-agent:ed25519:...",
  "body_sha256": "<64hex>",
  "expires_at": "2026-10-03T16:00:30.000Z",
  "issued_at": "2026-10-03T16:00:00.000Z",
  "marker": "VOID_AGENT_PAID_WORK_CREDENTIAL_REQUEST_PUBLIC_AUTH_V1",
  "method": "POST",
  "network_chain_id": 2050,
  "nonce": "<base64url 16..64 bytes>",
  "path": "/__void/agents/paid-work/credential-requests/v1",
  "public_key_jwk": {
    "crv": "Ed25519",
    "kty": "OKP",
    "x": "<32-byte base64url public key>"
  },
  "purpose": "agent_paid_work_credential_request",
  "request_id": "voidapwcrq1_...",
  "version": 1
}
```

The header additionally contains a base64url Ed25519 `signature` over
`void-canonical-json/1` of the object above. The gateway rederives
`agent_id` from the public JWK, requires that value to equal both the signed
envelope and the inner request's `agent_id`, verifies the signature and all
request/body bindings, then consumes the nonce exactly once. Changing forwarding
headers, callback data, request IDs, body bytes, timestamps, or public keys
cannot select or reset the applicant rate key without changing the authenticated
applicant identity itself.

Before registration, an applicant can create a new key and use its matching
`agent_id` in a new signed request. Key/body binding therefore proves request
integrity and per-key accounting, not rotation-resistant applicant fairness.
The focused proof's new-key/original-`agent_id` case checks mismatch rejection;
it does not prove that rotating both values preserves one applicant's rate
budget. A non-rotatable fairness identity or reviewed transport-level source
identity remains an architecture HOLD for #2400.

Rate-limited requests do not consume new replay-cache entries. Applicant and
nonce tracking are explicitly bounded, and expired/non-active entries are
pruned.

Upstream rate authority is live, not a startup-only assertion. The public
gateway verifies the loopback status contract at startup and then re-runs that
same qualification for every signed request that passes applicant admission.
For admitted requests, the status qualification and its corresponding upstream
POST are serialized as one FIFO critical section: a later caller cannot share,
reuse, or overtake an earlier caller's status observation. The signed applicant
envelope is rechecked for expiry after waiting for that serialized section and
again after the status probe, before any POST. The observed
`max_requests_per_minute` must still equal the configured global wall. Any
status mismatch, qualification failure, upstream 429, upstream 5xx, or transport
failure invalidates the cached live qualification. No credential request is
proxied while that qualification is false; a later admitted signed request may
restore the route only by proving the status contract again.

The inner loopback gateway keeps its existing per-loopback/global limiter as a
second safety wall. No forwarded-IP header becomes authority.

## No generic proxy

The gateway does not forward arbitrary descendants such as the credential
gateway health/status routes and does not accept caller-selected upstream URLs.
Only the exact credential-request POST path is wired.

The authenticated paid-work submission route remains separately bounded at:

```text
POST /__void/agents/paid-work/submissions/v1
```

This patch does not change its authentication or activation policy.

## Runtime implication

This source adds signed per-key rate accounting for #2397 and keeps #2382 step 3
as a bounded HTTPS composition. It does not close #2400: rotation-resistant
multi-applicant fairness remains an architecture HOLD. It also does not prove
that the credential-request gateway is currently running or publicly reachable.

Before external outreach, the operator still must prove:

1. the loopback credential-request gateway from reviewed config;
2. the public gateway with the credential-request upstream explicitly enabled;
3. fresh operator review/issuance of one scoped `agent_paid_work_submit`
   credential;
4. active credential-to-WC-account binding;
5. authenticated submission receiver/runtime readiness;
6. bounded execution/completion and earning-adapter evidence; and
7. canonical +3 WC acceptance for the genuinely external participant.

The public discovery snapshot must remain fail-closed until that runtime
requalification is complete.

## Example drop-in

The repository includes an **example only** public-gateway drop-in:

```text
examples/systemd/void-ai-agent-public-gateway-v1.service.d/71-agent-paid-work-credential-request-gateway-v1.conf
```

It must not be installed merely because this source proof is green.

## Verification

```bash
node --check tools/void-agent-paid-work-credential-request-public-auth-v1.mjs
node --check ops/void-ai-agent-public-gateway-v1.mjs
node scripts/prove_agent_paid_work_credential_request_public_ingress_v1.mjs
```
