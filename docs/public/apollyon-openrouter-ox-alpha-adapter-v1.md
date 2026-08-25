# Apollyon OpenRouter contestant adapter v1

Marker: `VOID_APOLLYON_OPENROUTER_CONTESTANT_ADAPTER_V1`

## Purpose

This is the registry-driven OpenRouter contestant boundary for provider-neutral Apollyon trials. External models remain untrusted contestants only; qualification or a successful response grants no VOID office, credential, wallet/signer/validator authority, deployment authority, repository authority, live mutation authority, or economic authority.

## Registry and policy

The reviewed registry is `public/apollyon-openrouter-contestants-v1.json`. Each request binds the exact semantic registry generation.

`qualified` records bounded worker evidence only. `qualification_only` additionally requires `VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1`. `quarantined` is not executable. A future `scored_trial_eligible=true` entry must also bind exactly one reviewed provider.

`zdr_public_or_sanitized` requires `data_collection=deny` and `zdr=true`. `retained_public_only` accepts only exact-public manifest entries and requires explicit public-retention and exact-trial acknowledgements.

Every executable contestant requires exact-zero pricing. The chat body preserves `provider.max_price.prompt=0`, `provider.max_price.completion=0`, disables fallbacks, requires supported parameters, and exposes no tools.

## Credentialless adapter

The adapter is **credentialless and provider-networkless**. It does not read `OPENROUTER_API_KEY`, read systemd credentials, call `https://openrouter.ai`, call `fetch`, own a provider retry loop, or own an execution-claim directory.

The adapter sends one secretless bounded IPC request to:

`/run/void-apollyon-openrouter-broker-v1.sock`

The broker is the sole owner of the OpenRouter credential, authenticated model-catalog access, authenticated chat access, private durable exact-once ledger, provider-admission state, and retry/reconciliation authority.

## Stable logical intent

The trusted coordinator supplies:

```text
VOID_OPENROUTER_LOGICAL_OPERATION_INTENT_SHA256=<stable 64-lowercase-hex logical intent>
```

That digest identifies the logical operation and must be persisted/reused by the trusted coordinator. It must not be regenerated to escape timeout, process death, provider capacity, or another transient condition.

The adapter derives request correlation from this stable intent. The broker separately binds registry generation, request body, and contestant policy into the durable work identity. Same intent plus changed logical work fails closed.

## Broker lifecycle

The broker's durable states include `ABSENT`, `RESERVED`, `UNCERTAIN`, `ACCEPTED`, `RECONCILED_BLOCKED`, and `CONFLICT`.

The authenticated model-catalog GET is read-only and runs after durable prepare but before irreversible chat-provider admission. A catalog failure may be retried because no chat authority has been consumed.

Immediately before chat POST, provider execution is durably admitted and transitions to `UNCERTAIN`. Crash, timeout, or ambiguous outcome after that point never grants automatic resend authority. An accepted result is durably bound; later calls for the same terminal operation HOLD instead of reexecuting.

There is no TTL reclaim, stale-claim reclaim, process-death reclaim, or transient-parameter escape hatch.

## Admission and evidence

Before IPC, the adapter still performs the provider-neutral trial wall, constitutional/sanitization admission, exact trial rereadmission, staged-input digest verification, public-retention checks, bounded prompt construction, no-tools construction, and outbound secret/private-path scanning.

Only broker `ACCEPTED` may become contestant GREEN evidence. Results bind `broker_operation_id`, `broker_result_digest`, `broker_catalog_sha256`, `broker_selected_model_sha256`, registry/trial/admission/prompt generation, provider policy, selected model/provider evidence, and response-content digest.

Broker catalog evidence additionally binds the exact model, canonical slug, reviewed context floor, `pricing_zero=true`, the exact catalog digest exposed as `broker_catalog_sha256`, and the selected model-generation digest exposed as `broker_selected_model_sha256`.

Legacy `execution_claim_sha256`, `execution_claim_semantic_sha256`, and `execution_claim_root_generation_sha256` are no longer execution authority and must not reappear in migrated results.

The create-only accepted-result recovery journal remains evidence only. Provider reexecution authority comes solely from the broker ledger.

## Runtime contract

This PR is source/proof/documentation only and does not install or start the broker. Production execution requires the separately reviewed broker service/socket.

The adapter process does not receive the OpenRouter credential:

```bash
TRIAL=./trial-packet.json
STAGING=./outbound-stage
MANIFEST=./outbound-manifest.json
RECEIPT=./outbound-admission-receipt.json
OUTPUT=./openrouter-contestant-result.json
ADMISSION_AT=2026-08-24T06:00:00.000Z

REGISTRY_SHA256="$(
  node --input-type=module -e '
    import { readFile } from "node:fs/promises";
    import { contestantRegistryDigestV1 } from "./scripts/apollyon_openrouter_ox_alpha_adapter_v1.mjs";
    const registry = JSON.parse(await readFile("./public/apollyon-openrouter-contestants-v1.json", "utf8"));
    process.stdout.write(contestantRegistryDigestV1(registry));
  '
)"

TRIAL_SHA256="$(sha256sum "$TRIAL" | awk '{print $1}')"
LOGICAL_OPERATION_INTENT_SHA256=<trusted-stable-64-hex-digest>

VOID_OPENROUTER_ENABLE=1 VOID_OPENROUTER_MODEL=stealth/ox-alpha VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 VOID_OPENROUTER_ACK_REGISTRY_SHA256="$REGISTRY_SHA256" VOID_OPENROUTER_ACK_PUBLIC_RETENTION=1 VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256="$TRIAL_SHA256" VOID_OPENROUTER_LOGICAL_OPERATION_INTENT_SHA256="$LOGICAL_OPERATION_INTENT_SHA256" node scripts/apollyon_openrouter_ox_alpha_adapter_v1.mjs run   "$TRIAL" "$STAGING" "$MANIFEST" "$RECEIPT" "$OUTPUT" "$ADMISSION_AT"
```

If the fixed broker socket is absent, the adapter HOLDs; it never falls back to direct provider access.

## Deployment separation

The reviewed production deployment contract uses a dedicated static broker identity, private persistent `StateDirectory`, systemd socket activation, restrictive socket permissions, and systemd `LoadCredential=` so only the broker receives the secret.

No deployment, restart, live VOID mutation, chain action, wallet/signer action, validator/Work Credit action, transaction, treasury/liquidity action, or funds movement is authorized by this source generation.
