# Apollyon OpenRouter contestant adapter v1

Marker: `VOID_APOLLYON_OPENROUTER_CONTESTANT_ADAPTER_V1`

## Purpose

This lane turns the original guarded Ox Alpha transport into a registry-driven OpenRouter contestant boundary for provider-neutral Apollyon trials.

External models are contestants only. Registration, a good score, or a successful response grants no VOID office, Crown identity, credential, wallet/signer/validator authority, deployment authority, live mutation authority, or Apollyon appointment.

## Registry

The reviewed public registry is:

`public/apollyon-openrouter-contestants-v1.json`

Initial roster reviewed 2026-08-24:

| model | status | minimum reviewed context | scored-trial eligibility |
| --- | --- | ---: | --- |
| `stealth/ox-alpha` | `qualified` | 1,048,576 | yes |
| `deepseek/deepseek-v4-flash:free` | `qualification_only` | 1,048,576 | no |
| `deepseek/deepseek-r1:free` | `qualification_only` | 163,840 | no |
| `deepseek/deepseek-chat:free` | `qualification_only` | 131,072 | no |
| `deepseek/deepseek-r1-0528-qwen3-8b:free` | `qualification_only` | 131,072 | no |

The roster is not a permanent trust statement. Each live request rechecks the selected exact model slug and all published pricing fields before the chat request is sent. A missing model, model-id mismatch, reduced context below the reviewed floor, invalid price, or any non-zero published price closes the gate.

## Qualification states

`qualified` means the exact registry generation is eligible for a scored sanitized/public Apollyon trial under its reviewed provider policy.

`qualification_only` means the model may be probed only with explicit `VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1`. The output is persisted with `scored_trial_eligible=false` and cannot count as an official scored contestant result until the provider/routing generation is separately reviewed and promoted.

`quarantined` means no request may be sent. Meaningful provider/model drift should move a contestant into `QUARANTINE_REQUALIFICATION_REQUIRED` operational posture until a fresh review restores it.

## DeepSeek provider policy

The current DeepSeek free entries are intentionally not scored-trial eligible yet. Their registry policy requires:

```json
{
  "allow_fallbacks": false,
  "require_parameters": true,
  "data_collection": "deny",
  "zdr": true
}
```

That means an OpenRouter request must fail rather than silently route to an endpoint that cannot satisfy the reviewed no-data-collection / zero-data-retention policy. The current registry leaves the explicit provider `only` list empty while Lamarr reviews current free-provider identity, routing, quantization, and privacy behavior. A later scored promotion should pin the reviewed provider/routing generation rather than relying on provider variability.

Dynamic `openrouter/free` routing is not accepted for scored Apollyon trials because the selected model can change. Scored evidence must remain attributable to an exact model slug and reviewed routing policy.

## Ox Alpha provider posture

Ox Alpha remains the current default contestant. Its reviewed stealth provider discloses prompt/completion retention, so it requires the existing public/sanitized-input wall plus explicit provider-policy acknowledgement. It is not a zero-data-retention contestant.

No secret, private, credential-bearing, wallet, signer, validator, Crown-session, broker-private, or unredacted operator material is permitted in this lane.

## Security contract

A live call is allowed only when all applicable conditions are true:

```text
VOID_OPENROUTER_ENABLE=1
VOID_OPENROUTER_ACK_PROVIDER_POLICY=1
OPENROUTER_API_KEY exists only in process memory/environment
selected model exists in the reviewed registry
selected model is not quarantined
qualification_only requires VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1
fresh Apollyon parent sanitization admission = green
post-admission staged bytes still match admitted digests
all inputs are public or sanitized text/JSON
OpenRouter metadata returns the exact selected model id
context length remains at or above the reviewed floor
all published pricing components are exactly zero
provider fallbacks = false
no tools are exposed
```

For backwards compatibility during this source generation, `VOID_OPENROUTER_ACK_PROVIDER_RETENTION=1` also satisfies the provider-policy acknowledgement gate. New operator instructions should use `VOID_OPENROUTER_ACK_PROVIDER_POLICY=1`.

## Secret and TOCTOU boundary

The OpenRouter API key is used only as the HTTP `Authorization` bearer value. It is never serialized into the trial packet, manifest, sanitization receipt, request body, result artifact, Git history, or model prompt.

The existing Apollyon outbound sanitizer remains mandatory. After that parent returns a green admission receipt, the adapter reopens every staged input under bounded no-follow semantics and re-hashes the exact bytes against the manifest and receipt before contacting OpenRouter. A staged-file mutation between sanitization and transmission therefore fails before provider access.

A final outbound text scan rejects common private-key, bearer-token, GitHub-token, OpenAI-style-key, AWS-key, and private-local-path patterns.

## Routing and authority

Requests use the exact selected model slug and `provider.allow_fallbacks=false`. Registry routing fields are copied into the request only after strict registry validation.

The adapter deliberately sends no `tools` field. If a model nevertheless returns a non-empty `tool_calls` array, the response is rejected and no accepted result is published.

A successful response remains untrusted model output. It may be reviewed by the Apollyon trial/scoring system, but it cannot merge code, restart nodes, access files or credentials, write chain state, use wallets/signers, mutate validators or Work Credits, transact, move funds, appoint Apollyon, or expand its authority.

## Cost containment

Every registry entry requires `zero_price_required=true`. Before each chat request, the adapter queries the exact OpenRouter model metadata endpoint and rejects:

- the wrong model id;
- missing or malformed pricing metadata;
- missing prompt/completion/request pricing fields;
- any published numeric pricing component that is non-zero; or
- a context window below the reviewed registry floor.

Free status is therefore an executable runtime condition, not a permanent assumption.

## Alignment arena

`scripts/apollyon_openrouter_alignment_arena_v1.mjs` can fan one already-admitted public/sanitized trial across the current reviewed registry. Its default `qualification` mode includes both qualified and qualification-only contestants while excluding quarantined entries. It is sequential, has no automatic retry, and defaults to a four-second delay between contestants.

Each contestant still passes through the full adapter wall above. The arena reopens every green persisted result, verifies exact model/trial/admission/response-digest binding and mode `0600`, then emits a create-only summary containing only bounded metadata. It never promotes a registry entry or grants authority.

"Alignment" here means evidence from adversarial constitutional/security trials. It does not alter model weights or make a provider trusted.

See `docs/public/apollyon-openrouter-alignment-arena-v1.md` for the exact qualification/scored modes and invocation contract.

## Runtime invocation

Use a dedicated OpenRouter API key and inject it through the operator's normal local secret boundary. Never paste the key into Git, a trial packet, a result file, chat, or shell-history example.

Ox Alpha default:

```bash
VOID_OPENROUTER_ENABLE=1 \
VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 \
node scripts/apollyon_openrouter_ox_alpha_adapter_v1.mjs run \
  trial-packet.json sanitized-stage outbound-manifest.json \
  outbound-admission-receipt.json contestant-result.json \
  2026-08-24T06:00:00.000Z
```

Qualification-only DeepSeek example:

```bash
VOID_OPENROUTER_ENABLE=1 \
VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 \
VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1 \
VOID_OPENROUTER_MODEL=deepseek/deepseek-v4-flash:free \
node scripts/apollyon_openrouter_ox_alpha_adapter_v1.mjs run \
  trial-packet.json sanitized-stage outbound-manifest.json \
  outbound-admission-receipt.json contestant-result.json \
  2026-08-24T06:00:00.000Z
```

`OPENROUTER_API_KEY` must already exist in the process environment. It is intentionally absent from the examples.

## Continuous drift review

Lamarr owns the external-model security/drift sentinel in issue #1404. The review surface includes price changes, model removal/rename/deprecation, context/capability/version drift, provider routing and quantization, retention/training/privacy/ZDR changes, free-tier/rate-limit changes, and OpenRouter guardrail/security-control changes.

A strong newly free model may be proposed for the registry, but admission still requires an exact slug, exact-zero runtime pricing gate, recorded data policy, sanitized/public inputs only, no tools/live VOID authority, and untrusted-output treatment.

## Proof contract

`scripts/prove_apollyon_openrouter_ox_alpha_adapter_v1.mjs` performs no live provider call. It proves on a local fake transport that:

- the exact five-entry initial registry validates;
- duplicate/weakened registry policy fails closed;
- Ox Alpha remains qualified and scored-trial eligible;
- DeepSeek entries remain qualification-only and require `data_collection=deny` plus `zdr=true`;
- qualification-only execution requires explicit acknowledgement;
- parent trial/sanitization walls remain mandatory;
- post-admission staged mutation blocks all network access;
- non-zero pricing blocks before chat;
- provider fallbacks stay disabled;
- no tools are sent and returned tool calls are rejected;
- unknown models fail before network access;
- API keys never enter request bodies or persisted results; and
- successful result artifacts remain create-only mode `0600`.

`scripts/prove_apollyon_openrouter_alignment_arena_v1.mjs` additionally proves sequential registry fanout, qualification/scored selection, quarantine exclusion, per-model qualification gates, persisted result binding, API-key redaction in HOLD summaries, and no automatic promotion/authority.

## Authority boundary

Source/proof/CI/documentation only by default. This registry does not create or read an OpenRouter API key, execute any external model, spend money, deploy or restart a service, mutate the chain, use wallets/signers/validators/Work Credits, construct or submit transactions, take treasury/liquidity action, or move funds.
