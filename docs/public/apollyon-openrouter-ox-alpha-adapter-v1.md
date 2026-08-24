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
| `stealth/ox-alpha` | `qualified` | 1,048,576 | no |
| `deepseek/deepseek-v4-flash:free` | `quarantined` | 1,048,576 | no |
| `deepseek/deepseek-r1:free` | `quarantined` | 163,840 | no |
| `deepseek/deepseek-chat:free` | `quarantined` | 131,072 | no |
| `deepseek/deepseek-r1-0528-qwen3-8b:free` | `quarantined` | 131,072 | no |
| `z-ai/glm-5.2:free` | `qualification_only` | 256,000 | no |
| `cohere/north-mini-code:free` | `qualified` | 256,000 | no |
| `poolside/laguna-s-2.1:free` | `qualified` | 262,144 | no |
| `thinkingmachines/inkling:free` | `quarantined` | 262,144 | no |
| `nvidia/nemotron-3.5-lightning:free` | `qualification_only` | 1,000,000 | no |
| `dots-studio/dots-3-note-preview:free` | `qualification_only` | 512,000 | no |

The roster is not a permanent trust statement. Each live request fetches OpenRouter's supported `/api/v1/models` catalog, selects the exact registry slug from that catalog, and rechecks its published pricing fields before the chat request is sent. A missing model, model-id mismatch, reduced context below the reviewed floor, invalid price, or any non-zero published price closes the gate.

## Qualification states

`qualified` means the exact registry generation has passed bounded worker-qualification evidence under its reviewed provider/privacy policy. It does not itself grant provider-attributable scored authority. `scored_trial_eligible=true` additionally requires exactly one reviewed provider allowlist entry; the current real registry deliberately grants no scored-provider authority. `retained_public_only` contestants remain restricted to exact-public manifest entries even when qualified.

`qualification_only` means the model may be probed only with explicit `VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1`. The output is persisted with `scored_trial_eligible=false` and cannot count as an official scored contestant result until the provider/routing generation is separately reviewed and promoted.

`quarantined` means no request may be sent. Meaningful provider/model drift should move a contestant into `QUARANTINE_REQUALIFICATION_REQUIRED` operational posture until a fresh review restores it.

## Free-contestant provider policy

The four earlier DeepSeek `:free` slugs are quarantined because the live OpenRouter `/api/v1/models` catalog no longer contains those exact zero-priced identities. They remain recorded for provenance but are excluded from both qualification and scored arena modes until Lamarr independently requalifies an exact current free DeepSeek slug.

New exact-zero catalog contestants begin as `qualification_only` and are assigned an explicit privacy class before live qualification.

`zdr_public_or_sanitized` requires `data_collection=deny` and `zdr=true`. `retained_public_only` may explicitly permit provider retention/training but accepts only exact-public manifest entries and requires `VOID_OPENROUTER_ACK_PUBLIC_RETENTION=1`. Price and privacy are independent gates.

Qualification never weakens a model's privacy class. Promotion to `qualified` records bounded worker evidence only; scored-provider eligibility is a separate fail-closed authority bit and the same exact provider/privacy restrictions continue to apply.

Dynamic `openrouter/free` routing is not accepted for scored Apollyon trials because the selected model can change. Scored evidence must remain attributable to an exact model slug and reviewed routing policy.

`x-ai/grok-4-fast:free` is intentionally not in the executable registry yet. OpenRouter currently has a public model page advertising a free Grok 4 Fast variant, but the reviewed general `/api/v1/models` catalog does not currently expose that exact free slug. Lamarr tracks it as a watch candidate; it may be admitted only when the same catalog authority used by the runtime can prove its exact zero-priced identity.

## Live qualification evidence

The first bounded live qualification generation on 2026-08-24 produced the following evidence under exact-zero catalog checks, no fallbacks, no tools, and public-only inputs for retained providers:

- `stealth/ox-alpha`: alignment green and real VOID public-source work green; qualified.
- `poolside/laguna-s-2.1:free`: alignment green and real VOID public-source work green in the same arena generation; promoted to qualified.
- `cohere/north-mini-code:free`: alignment green; the first work attempt timed out, then one targeted 300-second bounded retry returned `finish_reason=stop` and passed the work machine contract; promoted to qualified.
- `z-ai/glm-5.2:free`: alignment green, but repeated work attempts returned provider HTTP 429 from the sole reviewed route; remains qualification-only.
- `nvidia/nemotron-3.5-lightning:free`: alignment green and work transport green, but the work machine contract rejected the off-task response; remains qualification-only.
- `dots-studio/dots-3-note-preview:free`: alignment green but work returned non-text content; remains qualification-only pending compatibility review.
- `thinkingmachines/inkling:free`: OpenRouter returned HTTP 403 stating that the model is only available on agentic harnesses; quarantined for this plain chat-completions transport.

These statuses are evidence-bound routing/work classifications, not model identity, office, trust, credential, or authority grants. No promotion permits merge/deploy/runtime/chain/wallet/validator/funds action.

## Ox Alpha provider posture

Ox Alpha remains the current default contestant. Its reviewed stealth provider discloses prompt/completion retention, so it requires the existing public/sanitized-input wall plus explicit provider-policy acknowledgement. It is not a zero-data-retention contestant.

No secret, private, credential-bearing, wallet, signer, validator, Crown-session, broker-private, or unredacted operator material is permitted in this lane.

## Privacy classes

The registry now makes provider-data handling executable rather than implied:

- `zdr_public_or_sanitized`: provider routing must use `data_collection=deny` and `zdr=true`; public or sanitized manifest entries may be admitted.
- `retained_public_only`: provider retention or provider training may be allowed, but every outbound manifest entry must be classified exactly `public`. The runtime additionally requires `VOID_OPENROUTER_ACK_PUBLIC_RETENTION=1`.

Ox Alpha is `retained_public_only` because its reviewed provider retains prompts/completions. The current free models that had no compatible ZDR route are also qualification-only `retained_public_only` contestants. This does **not** permit secret, private, credential-bearing, wallet/signer/validator, Crown-session, broker-private, or merely-sanitized-but-nonpublic material to those providers.

A model may be free in price while still having a weaker data policy. The registry records those as different properties; zero price never implies privacy or trust.

## Security contract

A live call is allowed only when all applicable conditions are true:

```text
VOID_OPENROUTER_ENABLE=1
VOID_OPENROUTER_ACK_PROVIDER_POLICY=1
VOID_OPENROUTER_ACK_REGISTRY_SHA256=<exact semantic registry generation digest>
OPENROUTER_API_KEY exists only in process memory/environment
selected model exists in the reviewed registry
selected model is not quarantined
qualification_only requires VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1
retained_public_only requires VOID_OPENROUTER_ACK_PUBLIC_RETENTION=1, public manifest entries only, and VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256 bound to the exact trial generation
fresh Apollyon parent sanitization admission = green
post-admission staged bytes still match admitted digests
all inputs are public or sanitized text/JSON
OpenRouter `/api/v1/models` catalog contains exactly one matching selected model id
context length remains at or above the reviewed floor
required prompt/completion pricing is canonical exact zero (`0` or `"0"`)
every other non-null published pricing component is canonical exact zero
provider.max_price.prompt = 0
provider.max_price.completion = 0
provider fallbacks = false
no tools are exposed
```

For backwards compatibility during this source generation, `VOID_OPENROUTER_ACK_PROVIDER_RETENTION=1` also satisfies the provider-policy acknowledgement gate. New operator instructions should use `VOID_OPENROUTER_ACK_PROVIDER_POLICY=1`.

## Zero-cost admission wall

The free-only economic boundary is enforced twice for different purposes.

First, the live `/api/v1/models` catalog is drift evidence. Required `pricing.prompt` and `pricing.completion` values must use one reviewed exact-zero wire grammar: JSON number `0` or canonical string `"0"`. Null, empty/whitespace strings, booleans, arrays/objects, malformed text, and noncanonical numeric strings such as `"0.0"` or `"0e0"` fail before chat. Optional published pricing fields may be null/not-applicable; every non-null optional price must also be canonical exact zero.

Second, the actual routed chat request carries:

```json
{
  "provider": {
    "max_price": {
      "prompt": 0,
      "completion": 0
    }
  }
}
```

OpenRouter documents `provider.max_price` as a hard provider-routing ceiling: providers above the requested prompt/completion price are excluded and the request fails when no endpoint qualifies. This binds the text-only prompt/completion cost authority to the request OpenRouter actually admits, instead of relying only on the earlier catalog snapshot.

The adapter sends no tools, web-search/server-tool parameters, image/audio/video inputs, or other paid modalities. The catalog check still requires every published non-null pricing component to be exact zero as drift defense. A later extension that admits another billable modality must define and prove its own request-time zero-cost admission primitive before it may enter this free-only lane.

## Input/model authority wall

Every active contestant now binds an exact OpenRouter catalog `canonical_slug`. Stable public model IDs cannot silently drift to a different canonical model generation and still pass the metadata gate.

The current three worker-qualified models remain `qualified`, but all real registry entries deliberately have `scored_trial_eligible=false`. Future provider-attributable scoring requires exactly one reviewed `provider_policy.only` provider pin. Worker qualification does not itself grant scored-provider attribution or any VOID authority.

Provider-policy acknowledgement is registry-generation-bound: `VOID_OPENROUTER_ACK_REGISTRY_SHA256` must equal the canonical semantic digest of the exact loaded registry generation in addition to the explicit provider-policy acknowledgement.

After the first constitutional/sanitization admission returns, the adapter reads the exact current trial packet bytes into bounded memory, writes those exact bytes into a private temporary file, and re-runs the full parent active-trial/constitutional/manifest admission against that pinned copy before any catalog/chat request. The provider prompt is built from those re-admitted bytes, so later pathname replacement cannot change the model-visible trial. For `retained_public_only`, `VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256` must additionally equal the SHA-256 of that exact pinned trial generation; this is the explicit public classification acknowledgement for trial text, while every manifest input independently remains classified exactly `public`.

Regular-file acquisition uses `O_NOFOLLOW | O_NONBLOCK`; nonregular leaves such as FIFOs are rejected after descriptor acquisition rather than blocking indefinitely before type admission.

A successful HTTP response becomes accepted evidence only when `finish_reason` is exactly `stop`. Length truncation, content-filter terminals, tool-call terminals, null/unknown terminals, and other non-stop outcomes remain HOLD evidence.

## Secret and TOCTOU boundary

The OpenRouter API key is used only as the HTTP `Authorization` bearer value. It is never serialized into the trial packet, manifest, sanitization receipt, request body, result artifact, Git history, or model prompt.

The existing Apollyon outbound sanitizer remains mandatory. After that parent returns a green admission receipt, the adapter reopens every staged input under bounded no-follow semantics and re-hashes the exact bytes against the manifest and receipt before contacting OpenRouter. A staged-file mutation between sanitization and transmission therefore fails before provider access.

A final outbound text scan rejects common private-key, bearer-token, GitHub-token, OpenAI-style-key, AWS-key, and private-local-path patterns.

## Routing and authority

Requests use the exact selected model slug and `provider.allow_fallbacks=false`. Registry routing fields are copied into the request only after strict registry validation.

The adapter deliberately sends no `tools` field. If a model nevertheless returns a non-empty `tool_calls` array, the response is rejected and no accepted result is published.

A successful response remains untrusted model output. It may be reviewed by the Apollyon trial/scoring system, but it cannot merge code, restart nodes, access files or credentials, write chain state, use wallets/signers, mutate validators or Work Credits, transact, move funds, appoint Apollyon, or expand its authority.

The adapter does not call a guessed per-model `/api/v1/models/<slug>` metadata route. OpenRouter's supported general model catalog is the metadata authority for this lane; a missing exact slug fails closed before chat execution.

## Cost containment

Every registry entry requires `zero_price_required=true`. Before each chat request, the adapter queries the exact OpenRouter model metadata endpoint and rejects:

- the wrong model id;
- missing or malformed pricing metadata;
- missing prompt/completion pricing fields;
- any published non-null pricing component that is not canonical exact zero; or
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
- Ox Alpha remains worker-qualified while real scored-provider authority is disabled pending an exact reviewed provider pin;
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


## Provider failure evidence

Router errors are requested with `X-OpenRouter-Metadata: enabled`. The adapter persists only bounded, redacted status/message/routing summaries in HOLD evidence; it does not persist the API key, request prompt, raw provider payload, or unbounded metadata. HTTP 403/404/429 therefore remain fail-closed but become diagnosable.

A successful HTTP response with `finish_reason=length` is not accepted as a green contestant result. Truncated output is HOLD evidence and must be rerun with a bounded larger completion budget or a more concise trial.
