# Apollyon OpenRouter contestant adapter v1

Marker: `VOID_APOLLYON_OPENROUTER_CONTESTANT_ADAPTER_V1`

## Purpose

This is the registry-driven OpenRouter contestant boundary for provider-neutral Apollyon trials. External models remain untrusted contestants only; qualification or a successful response grants no VOID office, credential, wallet/signer/validator authority, deployment authority, repository authority, live mutation authority, or economic authority.

## Registry and policy

The reviewed registry is `public/apollyon-openrouter-contestants-v1.json`. Each request binds the exact semantic registry generation.

`qualified` records bounded worker evidence only. `qualification_only` additionally requires `VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1`. `quarantined` is not executable. A future `scored_trial_eligible=true` entry must also bind exactly one reviewed provider.

`zdr_public_or_sanitized` requires `data_collection=deny` and `zdr=true`. `retained_public_only` accepts only exact-public manifest entries and requires explicit public-retention and exact-trial acknowledgements.

Every executable contestant requires exact-zero pricing. The chat body preserves `provider.max_price.prompt=0`, `provider.max_price.completion=0`, disables fallbacks, requires supported parameters, and exposes no tools.

## Provider-credentialless adapter

The adapter is **provider-credentialless and provider-networkless**. It never receives or reads `OPENROUTER_API_KEY`, calls `https://openrouter.ai`, calls `fetch`, owns a provider retry loop, or owns an execution-claim directory. It does read exactly one local per-unit admission credential, `apollyon_openrouter_admission_mac_v1`, from systemd `$CREDENTIALS_DIRECTORY` after the reviewed admission/prompt wall; that MAC authenticates exact logical work only and is not a provider credential.

The adapter sends one secretless bounded IPC request to:

`/run/void-apollyon-openrouter-broker-v1.sock`

Before that IPC request, the reviewed adapter loads the exact 32-byte `apollyon_openrouter_admission_mac_v1` from its per-unit systemd `$CREDENTIALS_DIRECTORY` **after** constitutional/sanitization admission, staged-input verification, registry binding, and final prompt construction. From that one credential read it derives two domain-separated HMAC capabilities over the same complete operation/work/request/registry plus trial/admission-receipt/prompt/canonical-model provenance: an exact-work admission capability for fresh execution and an `accepted_result_read_only` replay capability for disclosure of an already committed result. The replay capability is never provider-send authority. Both are carried inline in the bounded broker IPC request; no shared writable admission directory exists. The broker receives its own read-only copy of the same admission credential through a separate systemd unit identity. It requires the admission capability before fresh namespace creation/provider access and requires the replay capability before disclosing durable `ACCEPTED` result bytes. Ordinary IPC clients receive neither credential copy nor provider credentials.

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

The broker first performs a read-only, no-create lookup for an existing operation. If the exact ledger/capsule binding is already durably `ACCEPTED`, result disclosure requires the exact full-provenance `accepted_result_read_only` replay capability and then returns the same committed result with zero catalog/chat. The fresh-execution admission capability is not required for this historical read, and the replay capability cannot create a namespace, prepare work, or grant provider-send authority. For any new or non-`ACCEPTED` operation, before namespace creation, preparation, or provider-network access, the broker independently loads the reviewed checked-in contestant registry generation and verifies the HMAC-authenticated fresh-execution admission capability against the exact request's stable intent/work binding. Missing/forged capability, random registry digest, unreviewed contestant, or changed request work HOLDs before namespace creation/catalog/chat. Provider-send authority remains solely in the durable exact-once ledger.

The authenticated model-catalog GET is read-only and runs after durable prepare but before irreversible chat-provider admission. A catalog failure may be retried because no chat authority has been consumed.

Immediately before chat POST, provider execution is durably admitted and transitions to `UNCERTAIN`. Crash, timeout, malformed/oversize provider output, or another ambiguous outcome after that point never grants automatic resend authority. After a validated provider response, the broker writes one private mode-0600 staged capsule, file-fsyncs it, directory-fsyncs the staged generation, and create-only hard-links the **same retained staged inode** to the canonical final name through an fd-bound Linux primitive before directory-fsyncing the final publication and rereading that exact final generation **before** publishing `PROVIDER_RESULT`. The stage alias is intentionally retained as a second hard link to the same inode; the broker does not pathname-unlink it after publication because Linux provides no unprivileged atomic "unlink this name only if it still denotes this inode" primitive, and a check-then-unlink cleanup would reintroduce the generation race. If the stage pathname is replaced, the foreign generation is never adopted or deleted by this publication path. If a complete broker-private staged/final capsule survives while the ledger is `UNCERTAIN`, an exact retry independently opens and pins its own surviving candidate generation and may finalize/verify that same retained generation and append `PROVIDER_RESULT` under the operation flock with **zero provider-send callback**; partial, noncanonical, mismatched, symlinked, or foreign generations HOLD and never restore send authority. Durable `ACCEPTED` disclosure then requires the read-only replay capability and performs no catalog/chat. Once durable `ACCEPTED` has been proven, later flock-release/resource cleanup failure is resource-terminal only and cannot replace or hide the committed operation result.

The broker owns one closed accepted-result capacity domain: provider success bodies are bounded below the durable accepted-result ceiling, the canonical accepted result is bounded below the capsule ceiling, and the complete broker response remains below the IPC wire ceiling. A response outside the provider-read domain can consume at most one provider execution and remains durable `UNCERTAIN`/no-resend; it cannot become a partial `ACCEPTED` terminal.

Before decode, each broker socket also has a finite idle and total acquisition lifetime plus concurrent-incomplete and aggregate retained-byte ceilings. A peer that withholds the terminating LF or fans out partial requests is torn down without catalog/chat work.

There is no TTL reclaim, stale-claim reclaim, process-death reclaim, or transient-parameter escape hatch.

## Admission and evidence

Before IPC, the adapter still performs the provider-neutral trial wall, constitutional/sanitization admission, exact trial rereadmission, staged-input digest verification, public-retention checks, bounded prompt construction, no-tools construction, and outbound secret/private-path scanning.

Only broker `ACCEPTED` may become contestant GREEN evidence. The broker-owned accepted payload binds both the full-provenance fresh-execution admission-capability ID and the domain-separated read-only replay-capability ID. Results additionally bind `broker_operation_id`, `broker_result_digest`, `broker_catalog_sha256`, `broker_selected_model_sha256`, registry/trial/admission/prompt generation, provider policy, selected model/provider evidence, and response-content digest.

Broker catalog evidence additionally binds the exact model, canonical slug, reviewed context floor, `pricing_zero=true`, the exact catalog digest exposed as `broker_catalog_sha256`, and the selected model-generation digest exposed as `broker_selected_model_sha256`.

Legacy `execution_claim_sha256`, `execution_claim_semantic_sha256`, and `execution_claim_root_generation_sha256` are no longer execution authority and must not reappear in migrated results.

The adapter's separate create-only accepted-result recovery journal remains evidence only. The broker's private accepted-result capsule is likewise consumer evidence, not execution authority; provider reexecution authority comes solely from the broker ledger.

## Runtime contract

This PR is source/proof/documentation only and does not install or start the broker. Production execution requires the separately reviewed broker service/socket and admission/arena unit.

The adapter process does not receive the OpenRouter credential. The invocation shape below is valid only inside the reviewed admission unit where systemd has already supplied `$CREDENTIALS_DIRECTORY`; an arbitrary operator-supplied credential directory is outside the reviewed production contract:

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
# CREDENTIALS_DIRECTORY is supplied by the reviewed systemd unit and contains:
#   apollyon_openrouter_admission_mac_v1  (exactly 32 binary bytes)

VOID_OPENROUTER_ENABLE=1 VOID_OPENROUTER_MODEL=stealth/ox-alpha VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 VOID_OPENROUTER_ACK_REGISTRY_SHA256="$REGISTRY_SHA256" VOID_OPENROUTER_ACK_PUBLIC_RETENTION=1 VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256="$TRIAL_SHA256" VOID_OPENROUTER_LOGICAL_OPERATION_INTENT_SHA256="$LOGICAL_OPERATION_INTENT_SHA256" node scripts/apollyon_openrouter_ox_alpha_adapter_v1.mjs run   "$TRIAL" "$STAGING" "$MANIFEST" "$RECEIPT" "$OUTPUT" "$ADMISSION_AT"
```

If the fixed broker socket is absent, the adapter HOLDs; it never falls back to direct provider access.

## Deployment separation

The reviewed production deployment contract requires **separate system services with distinct `DynamicUser=yes` identities** for broker and admission/arena execution. Both receive separate read-only copies of `apollyon_openrouter_admission_mac_v1` using `LoadCredentialEncrypted=` (or an equivalently protected `LoadCredential=` source); only the broker unit additionally receives `openrouter_api_key`. `$CREDENTIALS_DIRECTORY` is the application interface. The broker keeps private persistent `StateDirectory`, systemd socket activation, and restrictive socket permissions. Running these key-bearing paths as the ordinary operator UID is outside the reviewed production contract, because same-UID processes can reopen one another's ordinary `/proc/<pid>/fd` descriptors.

No deployment, restart, live VOID mutation, chain action, wallet/signer action, validator/Work Credit action, transaction, treasury/liquidity action, or funds movement is authorized by this source generation.