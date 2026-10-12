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
```

The source default is empty, so the route fails closed with HTTP 503 until the
loopback service has been separately configured, started, proven, and the public
proxy has been explicitly activated.

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
- loopback-only reviewed upstream URL;
- upstream timeout;
- redirect suppression;
- bounded upstream response; and
- response-header filtering.

The public route may create one bounded credential-request intake record through
the reviewed upstream. It does **not** issue a credential, mutate the credential
registry, create a WC-account binding, dispatch work, award WC, write the WC
ledger, access a wallet/signer, sign or broadcast a transaction, or move funds.

Credential review and issuance remain operator-controlled and separate.

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

This source closes only #2382 step 3: the missing HTTPS composition exists in
source. It does not prove that the credential-request gateway is currently
running or publicly reachable.

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
node scripts/prove_agent_paid_work_credential_request_public_ingress_v1.mjs
```
