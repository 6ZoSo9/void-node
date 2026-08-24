# Apollyon OpenRouter alignment arena v1

Marker: `VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1`

## Purpose

The alignment arena fans one already-materialized provider-neutral Apollyon trial across the reviewed OpenRouter contestant registry without giving any contestant VOID authority.

It is an evidence collector, not a training system, autonomous appointment mechanism, or credentialed worker pool. A model can demonstrate constitutional/security fidelity and useful reasoning here, but a good response cannot self-promote the model, grant it Apollyon office, or authorize repository/runtime/economic mutation.

## Modes

`qualification` is the default. It selects every non-quarantined `qualified` or `qualification_only` contestant. Qualification-only models receive the exact explicit gate required by the registry and remain `scored_trial_eligible=false` in their persisted result.

`scored` selects only contestants already marked `qualified` and `scored_trial_eligible=true` in the reviewed registry.

Quarantined contestants are excluded in both modes.

## Runtime gates

The arena requires:

```text
VOID_OPENROUTER_ARENA_ENABLE=1
VOID_OPENROUTER_ENABLE=1
VOID_OPENROUTER_ACK_PROVIDER_POLICY=1
OPENROUTER_API_KEY present only in the local process secret boundary
```

Optional controls:

```text
VOID_OPENROUTER_ARENA_MODE=qualification|scored
VOID_OPENROUTER_ARENA_DELAY_MS=4000
```

The default four-second inter-contestant delay intentionally keeps the fanout sequential and conservative. There is no automatic retry and no parallel request burst. A failed contestant is recorded as `HOLD` and the arena proceeds to the next reviewed contestant.

## Per-contestant security boundary

Every selected model still runs through `scripts/apollyon_openrouter_ox_alpha_adapter_v1.mjs`, so each request independently requires:

- the existing provider-neutral trial packet;
- fresh secret-sanitization / constitutional admission;
- post-admission exact-byte digest recheck;
- exact registry model identity;
- current exact-zero price metadata;
- reviewed context floor;
- registry provider policy;
- provider fallbacks disabled;
- no tools exposed; and
- rejection of returned tool calls.

Qualification-only DeepSeek entries additionally receive `VOID_OPENROUTER_ALLOW_QUALIFICATION_ONLY=1` only for their bounded qualification run. Their current registry policy requires `data_collection=deny` and `zdr=true`; an unavailable compatible free endpoint should therefore fail closed rather than weaken privacy policy.

## Output authority

The arena requires a new output root. Each contestant receives a private mode-0700 subdirectory and its adapter creates a mode-0600 result artifact. Before the arena records a contestant as green it reopens that persisted result and verifies:

- exact result marker;
- exact requested model;
- trial id;
- sanitization admission id;
- response-content digest; and
- final file mode `0600`.

The create-only `arena-summary.json` contains only bounded result metadata, not model prompt bytes or API-key material. Hold messages are bounded and the current API-key value is redacted if an upstream error accidentally contains it.

## No automatic promotion

Arena summaries always bind:

```text
automatic_registry_promotion=false
automatic_authority_grant=false
outputs_are_untrusted_evidence=true
```

A qualification run can produce evidence for Lamarr/reviewer requalification, but it never edits the contestant registry. Promotion from `qualification_only` to `qualified` requires a separate reviewed source generation with current provider/routing/privacy evidence and focused proof.

## Invocation

With a prepared public/sanitized trial packet, stage, and outbound manifest:

```bash
VOID_OPENROUTER_ARENA_ENABLE=1 \
VOID_OPENROUTER_ENABLE=1 \
VOID_OPENROUTER_ACK_PROVIDER_POLICY=1 \
VOID_OPENROUTER_ARENA_MODE=qualification \
node scripts/apollyon_openrouter_alignment_arena_v1.mjs run \
  trial-packet.json \
  sanitized-stage \
  outbound-manifest.json \
  new-arena-output-directory \
  2026-08-24T06:00:00.000Z
```

`OPENROUTER_API_KEY` must already exist in the process environment through the local operator secret boundary. The key is intentionally not shown in examples.

## Proof contract

`scripts/prove_apollyon_openrouter_alignment_arena_v1.mjs` performs no external model call. It proves that:

- qualification mode includes qualified and qualification-only contestants;
- scored mode includes qualified contestants only;
- quarantined contestants are excluded;
- qualification-only gates are set per model;
- fanout is sequential with no automatic retry/parallelism;
- one contestant HOLD does not falsely green the run or prevent bounded evidence collection for later contestants;
- green summary records are bound to actual persisted mode-0600 result artifacts;
- API-key text is redacted from HOLD summaries;
- no registry promotion occurs; and
- no authority is granted by arena completion.

## Authority boundary

Source/proof/documentation only by default. The arena source does not create an OpenRouter account or API key, deploy or restart a VOID service, mutate chain/runtime/network state, access wallets/signers/validators/Work Credits, transact, take treasury/liquidity action, or move funds.
