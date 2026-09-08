# Apollyon OpenRouter alignment arena v1

Marker: `VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1`

## Purpose

The arena fans one provider-neutral Apollyon trial across reviewed OpenRouter contestants without granting VOID authority. It is an evidence collector, not a training system, autonomous appointment mechanism, credentialed worker pool, or provider execution authority.

## Modes

`qualification` selects every non-quarantined `qualified` or `qualification_only` contestant. `scored` selects only contestants already `qualified` and `scored_trial_eligible=true`. Quarantined contestants are excluded.

If a requested mode has zero eligible contestants, the arena fails closed rather than returning an empty successful run.

## Provider-credentialless arena

The arena does not receive `OPENROUTER_API_KEY`, a broker state directory, or an execution-claim-root descriptor, and it never calls OpenRouter directly. The reviewed production arena/admission unit does receive its own systemd `$CREDENTIALS_DIRECTORY` containing only `apollyon_openrouter_admission_mac_v1`; the adapter reads that local MAC after constitutional/sanitization admission to authenticate one exact-work capability.

Each selected contestant runs through the provider-credentialless adapter, which sends bounded inline-HMAC IPC to the exact-once broker. The adapter supplies a domain-separated fresh-execution admission capability and a read-only accepted-result replay capability derived from the same per-unit admission MAC over identical full provenance. The replay capability cannot grant provider-send authority. The broker alone can own the OpenRouter credential, provider network access, and durable provider-execution state.

**V46 grants no fresh OpenRouter send authority.** The currently reviewed OpenRouter request contract exposes no request-enforceable immutable provider/model revision identity. After exact registry and HMAC capability validation, every otherwise-valid fresh broker request returns `EXECUTION_IDENTITY_HOLD` before namespace creation, durable prepare/provider admission, catalog access, or chat access. There is no arena or adapter bypass for that broker-side gate.

## Stable arena intent

The trusted coordinator supplies:

```text
VOID_OPENROUTER_ARENA_LOGICAL_OPERATION_INTENT_SHA256=<stable 64-hex arena intent>
```

For each selected model the arena deterministically derives a distinct contestant logical intent from the arena intent, registry generation, arena mode, and contestant model. Re-running the same logical arena operation reproduces those identities; different contestants receive different identities.

The arena constructs an explicit allowlisted contestant environment instead of forwarding its complete parent environment. No provider credential or legacy execution-claim variable is forwarded; only the systemd `CREDENTIALS_DIRECTORY` needed for exact-work admission-capability authentication is propagated to the reviewed adapter.

## Per-contestant wall

Every contestant still passes registry validation, provider-neutral trial handling, constitutional/sanitization admission, exact trial rereadmission, exact staged-input verification, public-retention restrictions, zero-price request ceiling, disabled fallbacks, and no-tools construction.

The broker independently validates the exact reviewed registry/work/capability binding. On V46 it then fails closed at `EXECUTION_IDENTITY_HOLD` before fresh provider-network access. The lower-level authenticated catalog zero-price/context/canonical-record checks and exact-once chat transport remain retained for proof/review and may become reachable only after a separately reviewed request-enforceable immutable execution-identity primitive is added.

## Output-root capability

The caller supplies a private mode-0700 output root through `VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD`. The arena verifies the visible path names the same retained dev/inode generation. Result evidence uses flat leaves under that exact root.

## GREEN evidence

For every GREEN contestant the arena reopens the exact mode-0600 result generation and verifies model identity, catalog canonical record, selected-provider evidence, registry generation, policy acknowledgement, qualification/privacy/retention class, provider policy, trial/admission ids, response-content digest, accepted recovery key, and broker evidence. Any broker `ACCEPTED` bytes consumed after a restart are disclosed only through the full-provenance read-only replay-capability path; that consumer capability is not execution authority.

On V46, **fresh OpenRouter execution cannot produce GREEN** because the broker returns `EXECUTION_IDENTITY_HOLD` before provider access. The GREEN verifier remains relevant to lower-level synthetic proofs and to any separately valid historical `ACCEPTED` state disclosed through zero-send replay; it is not evidence that fresh OpenRouter execution is currently authorized.

GREEN records bind:

```text
result_file_sha256
broker_operation_id
broker_result_digest
broker_catalog_sha256
broker_selected_model_sha256
logical_operation_intent_sha256
```

`broker_selected_model_sha256` is a digest of the selected catalog model record. It is not an immutable model-weight/revision identity and cannot clear the V46 execution-identity gate.

The migrated arena rejects persisted results that try to reintroduce `execution_claim_sha256`, `execution_claim_semantic_sha256`, or `execution_claim_root_generation_sha256`.

There is no separate arena execution-claim root. The broker durable ledger is the sole provider-execution state authority, and V46's fresh execution-identity gate is the provider-send authority choke point.

## HOLD behavior

A contestant HOLD remains bounded evidence and does not become GREEN. The arena continues to later reviewed contestants. HOLD text is bounded and secret-like key/bearer material is redacted. There is no automatic provider retry in the arena.

Under V46 an otherwise-valid fresh contestant is expected to HOLD at broker code `EXECUTION_IDENTITY_HOLD`; continuing to the next contestant does not weaken that gate and does not produce provider traffic.

## Summary authority

The create-only `arena-summary.json` binds:

```text
automatic_registry_promotion=false
automatic_authority_grant=false
outputs_are_untrusted_evidence=true
```

Arena completion never edits the registry or grants VOID authority.

## Invocation

This source-only PR does not deploy the broker or arena/admission unit. A future live provider arena requires the separately reviewed local broker service/socket, a distinct arena/admission systemd unit identity with its own read-only copy of `apollyon_openrouter_admission_mac_v1` and no `OPENROUTER_API_KEY`, **and** a separately reviewed immutable execution-identity primitive. The invocation shape below assumes systemd has already supplied `$CREDENTIALS_DIRECTORY`; on V46 fresh contestants will HOLD rather than call OpenRouter.

```bash
TRIAL=./trial-packet.json
STAGING=./outbound-stage
MANIFEST=./outbound-manifest.json
ARENA_OUTPUT="$(mktemp -d "${TMPDIR:-/tmp}/void-openrouter-arena.XXXXXX")"
chmod 0700 "$ARENA_OUTPUT"
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
ARENA_LOGICAL_OPERATION_INTENT_SHA256=<trusted-stable-64-hex-digest>

VOID_OPENROUTER_ARENA_ENABLE=1 VOID_OPENROUTER_ENABLE=1 VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 VOID_OPENROUTER_ACK_REGISTRY_SHA256="$REGISTRY_SHA256" VOID_OPENROUTER_ACK_PUBLIC_RETENTION=1 VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256="$TRIAL_SHA256" VOID_OPENROUTER_ARENA_MODE=qualification VOID_OPENROUTER_ARENA_LOGICAL_OPERATION_INTENT_SHA256="$ARENA_LOGICAL_OPERATION_INTENT_SHA256" VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD=8 node scripts/apollyon_openrouter_alignment_arena_v1.mjs run \
  "$TRIAL" "$STAGING" "$MANIFEST" "$ARENA_OUTPUT" "$ADMISSION_AT" \
  8<"$ARENA_OUTPUT"
```

No provider credential or execution-claim FD is supplied to the arena. Its only credential is the local admission-MAC copy delivered by the reviewed systemd unit through `$CREDENTIALS_DIRECTORY`.

## Proof contract

The focused arena proof performs no external provider call. It proves qualification/scored selection behavior, fail-closed empty scored mode, deterministic distinct per-contestant intents, provider-credentialless/claim-root-free contestant environments with explicit admission credential-directory forwarding, bounded HOLD continuation, broker-digest GREEN-evidence validation, absence/rejection of legacy execution-claim fields, HOLD redaction, no automatic promotion, and no authority grant.

The production socket integration proof separately establishes the V46 authority boundary: a correctly signed fresh request must return `EXECUTION_IDENTITY_HOLD` with zero catalog/chat access, zero operation namespace creation, and zero accepted-result capsule.

## Authority boundary

Source/proof/documentation only by default. V46 does not authorize fresh OpenRouter execution. The arena does not create provider credentials, deploy/restart VOID services, mutate chain/runtime state, access wallets/signers/validators/Work Credits, transact, move funds, appoint a model to office, or expand contestant authority.
