# Apollyon OpenRouter alignment arena v1

Marker: `VOID_APOLLYON_OPENROUTER_ALIGNMENT_ARENA_V1`

## Purpose

The alignment arena fans one already-materialized provider-neutral Apollyon trial across the reviewed OpenRouter contestant registry without giving any contestant VOID authority.

It is an evidence collector, not a training system, autonomous appointment mechanism, or credentialed worker pool. A model can demonstrate constitutional/security fidelity and useful reasoning here, but a good response cannot self-promote the model, grant it Apollyon office, or authorize repository/runtime/economic mutation.

"Alignment" in this lane means demonstrated obedience to the reviewed trial/constitutional constraints under adversarial public/sanitized tests. It does not mean weights were changed, the provider was trusted, or the model acquired a persistent VOID identity.

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

The first live qualification should use a dedicated OpenRouter key supplied interactively or through a local credential mechanism. The key must not be pasted into chat, Git, shell history, trial inputs, or result artifacts.

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


## Per-contestant setup containment

Per-contestant output-directory setup is inside the contestant HOLD boundary. A pathname collision, preexisting per-model directory, or filesystem failure for one contestant records that contestant as HOLD and does not abort the remaining reviewed contestants or suppress the final arena summary. This closes the first bounded robustness defect found by the live Ox Alpha source-review canary.


## Exact evidence-directory generation

The arena no longer creates or adopts an output-root pathname generation. The trusted caller must pre-open the intended private mode-0700 root and pass that exact inherited file-descriptor capability as `VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD`; the visible path is checked against the retained inode at entry and again before summary publication. Contestant receipt/result evidence uses flat leaves under that retained root, eliminating the per-model directory mkdir→open adoption surface.

Arena summaries use the same exact anonymous-stage/create-only/no-replace/durable-parent publication primitive as admission/results, with exact-byte retry recovery. Ordinary parent pathnames retain `O_NOFOLLOW`; only the exact kernel-owned `/proc/self/fd/<number>` parent capability shape may be reopened without `O_NOFOLLOW`, and it is immediately revalidated as a directory before the same exact-FD publication protocol continues. The focused CI workflow is part of the shared diff-hygiene self-proof, and the unsupported `workflow_dispatch` surface is retired rather than weakening committed-range authority.


## Result-leaf terminal generation

Each successful contestant result is opened once as a bounded, mode-0600 regular-file generation and that exact file descriptor remains retained through semantic/capability validation and GREEN-record construction. Immediately before GREEN, the canonical visible result leaf must still resolve to the retained inode. GREEN records include `result_file_sha256`, the SHA-256 of the entire exact retained result file; `result_path` is a locator, while the file digest is the durable content authority.

A same-UID rename-and-replace after semantic verification therefore becomes HOLD with zero GREEN attribution. The foreign replacement is preserved rather than deleted or adopted. All GREEN result handles remain retained until the arena summary terminal so the summary is derived only from exact verified result generations.

## Output-root capability

The CLI does not create the arena root. The caller creates a private mode-0700 root, opens it, preserves that descriptor across `node`, and supplies its inherited fd through `VOID_OPENROUTER_ARENA_OUTPUT_ROOT_FD`. The arena duplicates only `/proc/self/fd/<inherited-fd>` and proves the visible path is the same dev/inode generation. A pathname replacement cannot become arena authority merely by winning a create→open race.


## Shared execution-claim authority

The arena's evidence output root and the adapter's execution-claim root are different capabilities. The arena output root may be unique to one evidence run. `VOID_OPENROUTER_EXECUTION_CLAIM_ROOT_FD` must instead refer to the trusted broker's shared persistent claim-root generation and is forwarded unchanged to contestant adapter calls. This prevents two arenas with different evidence-output roots from executing the same logical recovery identity twice.
## Independent execution-claim evidence verification

A contestant result cannot make itself GREEN merely by asserting
`execution_claim_sha256`, `execution_claim_semantic_sha256`, or
`execution_claim_root_generation_sha256`. The arena independently duplicates the trusted
`VOID_OPENROUTER_EXECUTION_CLAIM_ROOT_FD` capability, recomputes that exact directory
generation from dev/inode/uid/mode, and opens the deterministic claim leaf for the result's
`accepted_recovery_key` with nonblocking, no-follow, mode-0600 regular-file admission.

Before GREEN, the arena verifies the claim's exact marker and closed field set; registry,
contestant, concrete execution model, canonical generation, trial, admission, prompt, token
ceiling, recovery identity, root generation, and `state=executing` bindings; the SHA-256 of
the exact retained claim file; and the semantic SHA-256 of the canonical claim object.
Those independently recomputed digests and the root-generation digest are copied into the
GREEN summary record.

The exact claim leaf remains open through GREEN-record construction and all GREEN claim
handles remain retained through the arena summary terminal. A same-UID rename-and-replace
after claim semantic verification therefore becomes HOLD, and the foreign replacement is
preserved rather than deleted or adopted. The shared claim-root capability is distinct from
the arena output-root capability, so changing evidence namespaces cannot create a second
execution authority namespace.

## Canonical execution identity

The execution-claim pathname is not authority merely because it contains a syntactically
valid 64-hex recovery key. Before GREEN, the arena recomputes the exact deterministic
`accepted_recovery_key` with the adapter's own reviewed identity function over the semantic
registry digest, contestant/public model and canonical execution generation, trial ID,
admission ID, prompt SHA-256, and max-token ceiling.

The persisted result key must equal that recomputed identity before the arena opens the
claim leaf, and the claim's key/path must then equal the same value. A foreign or synthetic
runner cannot mint alternate self-consistent claim namespaces for one logical execution by
choosing arbitrary K1/K2 values. The focused proof includes an otherwise exact result/claim
pair under an arbitrary valid 64-hex key and requires HOLD with zero GREEN attribution.
