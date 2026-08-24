# Apollyon OpenRouter / Ox Alpha adapter v1

Marker: `VOID_APOLLYON_OPENROUTER_OX_ALPHA_ADAPTER_V1`

## Purpose

This adapter lets the provider-neutral Apollyon trial lane send an already admitted public/sanitized trial to OpenRouter model `stealth/ox-alpha` without granting the model any VOID authority.

The adapter is a contestant transport, not a Crown identity boundary, not an Apollyon appointment, and not a deployment or mutation controller.

## Reviewed provider posture

Reviewed 2026-08-24:

- provider transport: OpenRouter;
- model slug: `stealth/ox-alpha`;
- Ox Alpha is a stealth/anonymous-provider preview model;
- the provider discloses that prompts and completions are retained and are not used for training;
- OpenRouter currently advertises the model at zero input/output price during the preview.

Those facts are not treated as permanent. The adapter re-queries OpenRouter model metadata before every live contestant request and fails closed if any published pricing component is non-zero, missing in the required text/request fields, or non-numeric.

Provider retention is instead treated as a fixed adverse assumption. Every run requires an explicit operator acknowledgement and accepts only inputs that have already passed the existing Apollyon secret-sanitization / constitutional-admission wall.

## Security contract

A live call is allowed only when all of these are true:

```text
VOID_OPENROUTER_ENABLE=1
VOID_OPENROUTER_ACK_PROVIDER_RETENTION=1
OPENROUTER_API_KEY is present only in the process environment
VOID_OPENROUTER_MODEL is absent or exactly stealth/ox-alpha
fresh parent sanitization admission = green
post-admission bytes still match the admitted digests
all entries are public or sanitized text/JSON
OpenRouter model id = stealth/ox-alpha
all published pricing fields are zero
provider fallbacks = false
tools sent = none
```

The API key is used only as the runtime HTTP `Authorization` bearer value. It is never written into the trial packet, sanitization receipt, request body, result artifact, Git history, logs emitted by this adapter, or model prompt.

The adapter performs a last-mile scan of the complete outbound prompt for common private-key, bearer-token, GitHub-token, OpenAI-style-key, AWS-key, and private-local-path patterns even after the parent sanitizer succeeds.

After the parent admission receipt is created, every staged input is opened again under bounded no-follow semantics and its bytes are re-hashed against both the manifest and receipt. Mutation between sanitization and transmission therefore fails before OpenRouter is contacted.

## No tools and no authority

This generation deliberately sends no OpenRouter `tools` field. The system prompt tells the contestant that it has no filesystem, network, shell, credential, wallet, signer, validator, deployment, or live-mutation capability.

If a response nevertheless contains a non-empty `tool_calls` array, the run fails closed and publishes no accepted result.

A successful answer remains untrusted model output. It may be reviewed/scored by the Apollyon trial machinery, but it cannot merge code, restart a node, write chain state, access keys, move funds, appoint Apollyon, or expand its own authority.

## Routing and cost containment

The adapter uses only:

```text
GET  https://openrouter.ai/api/v1/models/stealth/ox-alpha
POST https://openrouter.ai/api/v1/chat/completions
```

Both requests use redirect rejection. Chat requests set:

```json
{
  "model": "stealth/ox-alpha",
  "stream": false,
  "provider": {
    "allow_fallbacks": false,
    "require_parameters": true
  }
}
```

The model-metadata request must prove the preview is still free before the chat request is constructed. If pricing becomes non-zero, the adapter stops before model execution.

Request and response bodies have explicit byte ceilings and bounded timeouts. `VOID_OPENROUTER_MAX_TOKENS` defaults to 8192 and is capped at 32768.

## Runtime invocation

Use a dedicated OpenRouter API key. Do not paste the key into a command line or source file; place it in the process environment using the operator's normal secret-loading boundary.

Once a trial packet, sanitized staging root, outbound manifest, and fresh receipt/output paths are prepared:

```bash
VOID_OPENROUTER_ENABLE=1 \
VOID_OPENROUTER_ACK_PROVIDER_RETENTION=1 \
node scripts/apollyon_openrouter_ox_alpha_adapter_v1.mjs run \
  trial-packet.json \
  sanitized-stage \
  outbound-manifest.json \
  outbound-admission-receipt.json \
  ox-alpha-result.json \
  2026-08-24T06:00:00.000Z
```

`OPENROUTER_API_KEY` must already exist in that process environment. The example intentionally does not show a key value.

## Recommended OpenRouter account controls

Use a dedicated API key for this contestant lane and attach the strongest compatible workspace controls available, including a model/provider allowlist, a very small budget, prompt-injection protection, and DLP/sensitive-info filtering. Ox Alpha's disclosed provider retention means this contestant lane is not a zero-data-retention lane; the VOID sanitizer is the primary confidentiality boundary.

## Proof contract

`scripts/prove_apollyon_openrouter_ox_alpha_adapter_v1.mjs` uses a local fake transport and performs no live provider call. It proves:

- the real provider-neutral trial packet and sanitizer are required;
- a post-admission staged-file mutation is rejected before network access;
- missing enable/retention acknowledgement fails before sanitization/network work;
- only `stealth/ox-alpha` is allowed;
- any non-zero published price blocks the chat request;
- provider fallbacks are disabled;
- no tools are sent;
- returned tool calls are rejected;
- the API key never enters the request body or persisted result; and
- successful results are create-only mode `0600` artifacts.

## Authority boundary

Source/proof/documentation only by default. Adding this adapter does not create an OpenRouter account or API key, spend money, execute Ox Alpha, deploy or restart a service, mutate the chain, access wallets/signers/validators/Work Credits, or appoint an Apollyon.
