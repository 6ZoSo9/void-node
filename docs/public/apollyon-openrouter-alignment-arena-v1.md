# Apollyon OpenRouter alignment arena v1

Marker: `VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1`

## Purpose

The arena fans one provider-neutral Apollyon trial across reviewed OpenRouter contestants without granting VOID authority. It is an evidence collector, not a training system, autonomous appointment mechanism, credentialed worker pool, or provider execution authority.

## Modes

`qualification` selects every non-quarantined `qualified` or `qualification_only` contestant. `scored` selects only contestants already `qualified` and `scored_trial_eligible=true`. Quarantined contestants are excluded.

If a requested mode has zero eligible contestants, the arena fails closed rather than returning an empty successful run.

## Credentialless arena

The arena does not receive `OPENROUTER_API_KEY`, a credential directory, a broker state directory, or an execution-claim-root descriptor. It never calls OpenRouter directly.

Each selected contestant runs through the credentialless adapter, which sends secretless IPC to the exact-once broker. The broker alone owns provider credentials, network access, and durable provider-execution authority.

## Stable arena intent

The trusted coordinator supplies:

```text
VOID_OPENROUTER_ARENA_LOGICAL_OPERATION_INTENT_SHA256=<stable 64-hex arena intent>
```

For each selected model the arena deterministically derives a distinct contestant logical intent from the arena intent, registry generation, arena mode, and contestant model. Re-running the same logical arena operation reproduces those identities; different contestants receive different identities.

The arena constructs an explicit allowlisted contestant environment instead of forwarding its complete parent environment. Credential and legacy execution-claim variables are not forwarded.

## Per-contestant wall

Every contestant still passes registry validation, provider-neutral trial handling, constitutional/sanitization admission, exact trial rereadmission, exact staged-input verification, public-retention restrictions, zero-price request ceiling, disabled fallbacks, and no-tools construction.

The broker independently performs authenticated current-catalog zero-price/context/canonical-generation checks before exact-once chat admission.

## Output-root capability

The caller supplies a private mode-0700 output root through `VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD`. The arena verifies the visible path names the same retained dev/inode generation. Result evidence uses flat leaves under that exact root.

## GREEN evidence

For every GREEN contestant the arena reopens the exact mode-0600 result generation and verifies model identity, canonical generation, selected-provider evidence, registry generation, policy acknowledgement, qualification/privacy/retention class, provider policy, trial/admission ids, response-content digest, accepted recovery key, and broker evidence.

GREEN records bind:

```text
result_file_sha256
broker_operation_id
broker_result_digest
broker_catalog_sha256
broker_selected_model_sha256
logical_operation_intent_sha256
```

The migrated arena rejects persisted results that try to reintroduce `execution_claim_sha256`, `execution_claim_semantic_sha256`, or `execution_claim_root_generation_sha256`.

There is no separate arena execution-claim root. The broker durable ledger is the sole provider-execution authority.

## HOLD behavior

A contestant HOLD remains bounded evidence and does not become GREEN. The arena continues to later reviewed contestants. HOLD text is bounded and secret-like key/bearer material is redacted. There is no automatic provider retry in the arena.

## Summary authority

The create-only `arena-summary.json` binds:

```text
automatic_registry_promotion=false
automatic_authority_grant=false
outputs_are_untrusted_evidence=true
```

Arena completion never edits the registry or grants VOID authority.

## Invocation

This source-only PR does not deploy the broker. Production arena execution requires the separately reviewed local broker service/socket.

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

VOID_OPENROUTER_ARENA_ENABLE=1 VOID_OPENROUTER_ENABLE=1 VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 VOID_OPENROUTER_ACK_REGISTRY_SHA256="$REGISTRY_SHA256" VOID_OPENROUTER_ACK_PUBLIC_RETENTION=1 VOID_OPENROUTER_ACK_PUBLIC_TRIAL_SHA256="$TRIAL_SHA256" VOID_OPENROUTER_ARENA_MODE=qualification VOID_OPENROUTER_ARENA_LOGICAL_OPERATION_INTENT_SHA256="$ARENA_LOGICAL_OPERATION_INTENT_SHA256" VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD=8 node scripts/apollyon_openrouter_alignment_arena_v1.mjs run   "$TRIAL" "$STAGING" "$MANIFEST" "$ARENA_OUTPUT" "$ADMISSION_AT"   8<"$ARENA_OUTPUT"
```

No provider credential or execution-claim FD is supplied to the arena.

## Proof contract

The focused arena proof performs no external provider call. It proves qualification/scored selection behavior, fail-closed empty scored mode, deterministic distinct per-contestant intents, credentialless/claim-root-free contestant environments, bounded HOLD continuation, broker-digest GREEN evidence, absence/rejection of legacy execution-claim fields, HOLD redaction, no automatic promotion, and no authority grant.

## Authority boundary

Source/proof/documentation only by default. The arena does not create provider credentials, deploy/restart VOID services, mutate chain/runtime state, access wallets/signers/validators/Work Credits, transact, move funds, appoint a model to office, or expand contestant authority.
