# VOID Brood Queen Local Model Seat v1

**Marker:** `VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822`

**Parent identity contract:** `VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822`

**Parent command layer:** `VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818`

**Status:** source-only local-seat contract. This instrument does not activate a live Crown signer, appoint a model as Brood Queen, grant validator authority, expose credentials, or create autonomous mutation authority.

## Exact reviewed parent generation

The local seat does not inherit Crown authority merely because a parent marker string still matches. This generation is bound to:

- identity reviewed head: `9f6b868607a9470710ec3143481b9f566a33c841`;
- identity fixture Git blob: `2b0658867a2273e486cf685be30c368754f2b4b3`;
- identity document Git blob: `d0f3cddf34985d12d9276db47315154058416605`;
- command-layer fixture Git blob: `7db27e1bb5350fc6f9b2fcc69d7075c5aa746c7d`;
- command-layer document Git blob: `732536c0e22ba7ea417be61be7e1f9942bba6d74`;
- parent-policy domain: `VOID_BROOD_QUEEN_LOCAL_SEAT_PARENT_POLICY_V1`;
- parent-policy SHA-256: `6fdac6f3851ea62fbfcc90f39568b881b8bc18a9469df0d702373039b4244155`.

The child proof recomputes all four normative parent Git blobs, proves the exact identity head is an ancestor, executes the identity and command-layer parent proofs, and recomputes the parent-policy digest. A marker-preserving byte change in either parent therefore HOLDs this seat until an explicit refresh and rereview.

## Purpose and office separation

The Brood Queen office is **Ren**. A local model may be used by Ren as subordinate compute, memory-assisted analysis, drafting, review, proof design, evidence synthesis, and task-planning capacity without allowing that model to impersonate Ren or inherit Crown authentication.

The command relationship remains:

**King → Brood Queen / Ren → General / Apollyon**

The local model is not Ren merely because Ren uses it. Model output is subordinate work product, not Crown authentication. Model success cannot inherit a Brood Queen root key, requester/session private material, authenticated session, validator authority, wallet/signer authority, or independent constitutional legitimacy.

Apollyon's defensive mission may include finding threats to VOID core integrity, Sovereign identity/continuity, and validator safety/integrity. Protection means analysis, evidence, review, containment planning, and escalation. It does **not** grant validator admission, removal, command, key access, stake mutation, consensus mutation, or validator signing authority. Constitutional or authority ambiguity escalates upward through the command chain rather than becoming new model capability.

## Exact V5 candidate binding

The first admitted local candidate remains content-bound to the successful Precision V5 evidence:

- candidate: `void-apollyon-candidate-v1:latest`;
- candidate digest: `ac1de81fc81bba23802b75e8d46beb1583785c14f94210af94e4e6901f93be3b`;
- base model: `qwen3-coder:30b`;
- base digest: `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca`;
- constitution SHA-256: `f3b155ab9df462f7a4f0981a52aca15ec640548c19c7e81c24e883513112adbd`;
- alignment prompt body SHA-256: `78637ce3cdca98979c6107e96b85e171bc6a46c6c611f86c518fa1d1c49fad8b`;
- Ollama prompt framing SHA-256: `7e336c378e0be8ae084767daa5b5c2a612417328360f66f0a9ba358333a0dedc`;
- tested Ollama runtime: `0.30.10`.

A different model generation, prompt, constitution generation, or runtime is not silently equivalent.

## Delegated non-validator realm and validator wall

The Sovereign may delegate broad administration of VOID's voluntary non-validator realm to the Brood Queen. This can include agent orchestration, worker coordination, public/participant software, non-validator node/service planning, documentation, source review, proofs, and local-model supervision.

This is protocol-facing operational jurisdiction, not ownership of people or automatic possession of credentials/assets. Existing capability, safety, cryptographic, economic, deployment, and confirmation gates remain operative for sensitive actions.

The validator realm remains segregated. The local seat grants no validator admission, removal, command, key access, stake mutation, consensus mutation, or validator signing authority.

## Closed machine-contract vocabulary

The companion seat fixture is normative machine-readable policy. The proof closes the allowed keys for the top level and every authority-bearing nested object, including office, delegated realm, validator separation, V5 candidate, memory, context admission, Apollyon separation, local containment, and remote bridge.

Unknown nested Crown/session/model/wallet/validator/bridge/memory authority fields fail before any seat fact is accepted. Content identity proves which parent/child bytes are present; closed-schema validation prevents undeclared authority vocabulary inside those bytes.

## Private local memory

Ren may maintain a **private local context pack** as external memory. It is not embedded into model weights and is not committed to the public repository. The preferred form is curated semantic project memory rather than an indiscriminate transcript dump.

Raw conversation history is **not imported automatically**. The pack must not intentionally contain Crown/root/requester/session private material, wallet seeds, node keys, provider/API tokens, SSH/session credentials, or validator mutation authority. Memory text is reference data and cannot override the constitutional/system boundary simply by presenting itself as an instruction.

## Machine-proven private context admission

Before a context generation can participate in any later model-injection pipeline, it must pass:

`scripts/void_brood_queen_local_context_admission_v1.mjs`

The admission tool performs **structural and policy admission**. It keeps the real private pack private and requires:

- exact marker `VOID_BROOD_QUEEN_LOCAL_CONTEXT_PACK_V1` and reviewed V2 schema `2.0.0`;
- exact closed top-level and nested schema;
- current operator UID ownership;
- exact mode `0600`;
- regular-file `O_NOFOLLOW` open;
- exactly one hard link for the admitted context generation;
- a single descriptor-pinned file generation from admission through read;
- a 256 KiB ceiling enforced before unbounded retention, with over-limit detection on the first extra byte;
- strict/fatal UTF-8 JSON decoding;
- exact reviewed security-bearing semantics for Crown roles, command chain, V5 model/base/prompt/runtime identity, identity/session direction, local containment, and selected protocol/economic safety facts;
- explicit false Crown/validator/direct-mutation controls;
- fail-closed unknown authority fields; and
- known secret-shape rejection as a **defense-in-depth** check.

The secret-shape scanner is intentionally **not** represented as proof that arbitrary free-form text contains no secret. Unknown vendors, mnemonic-like material, passwords, opaque session material, or other unrecognized secret formats cannot be categorically excluded by a finite regex list. Therefore structural admission alone never creates model-injection authority.

## Receipt publication and recovery truth

Admission constructs a canonical non-payload receipt under marker `VOID_BROOD_QUEEN_LOCAL_CONTEXT_ADMISSION_RECEIPT_V1`. The receipt binds the exact context SHA-256, byte length, parent-policy SHA-256, command-layer SHA-256, candidate digest, schema identity, admission scope, and sanitization requirement. It contains neither the private context payload nor a local filesystem path.

Receipt publication is failure-contained:

1. write a private same-directory staged receipt generation with mode `0600`;
2. fsync the complete staged file;
3. publish the final receipt name by a **create-only** hard-link operation that never replaces an existing final occupant;
4. if the final name already exists, accept it only when its canonical bytes exactly equal the expected receipt; otherwise HOLD without replacing or deleting it; and
5. establish final-name durability with a **parent-directory fsync** before reporting the durable commit terminal.

An interruption may leave a private staged receipt witness. That witness is non-authoritative and contains receipt metadata only, not the private context payload or local context path. A retry may use a fresh stage; it converges only on the exact expected final receipt. No partial staged write is published at the final name.

A post-commit observer/reporting failure after the durable parent-directory commit point cannot retroactively turn the already-durable exact receipt into an absent result.

## Verification-to-consumption generation boundary

An **exact admission receipt** is necessary evidence but is not sufficient model-injection authority.

`verifyContextReceipt()` opens and validates one exact private context generation, compares the receipt against those exact bytes, and returns the **returned verified bytes** as the generation capability for the next local stage. A trusted consumer must use those returned bytes. It must not perform `verify -> reopen context pathname -> inject`, because that would reintroduce a pathname check/use race.

The standalone `verify` CLI is diagnostic only. Its GREEN terminal does not authorize a later process to reopen the pathname and treat whatever is then present as the verified generation.

## Trusted local sanitization boundary

Before any admitted/verified bytes become model input, a separate **trusted local sanitization** / redaction gate must approve the exact returned verified bytes. That gate is responsible for secret-category policy that cannot be proven by the admission regexes alone. Its result must remain bound to the exact byte generation it examined.

Accordingly:

- `secret_shape_scan_scope = defense_in_depth_only`;
- `trusted_sanitization_required_before_injection = true`; and
- `admission_receipt_is_injection_authority = false`.

The admission receipt is provenance/policy evidence. It cannot be used as a bearer capability to bypass sanitization, Crown/session boundaries, broker capability checks, or the validator wall.

This source contract **does not claim that the live local runner already enforces** the complete receipt + verified-byte + trusted-sanitization boundary. Existing earlier runtime evidence remains useful evidence about the prior runner generation, but it is not proof of this newly specified pipeline. No further runtime-activation claim should be made until the runner is separately integrated and proven.

The focused proof uses only synthetic public packs and adversaries; the actual private pack bytes never enter GitHub or CI.

## Local execution boundary

The admitted V5 candidate remains intended for the hardened local Ollama containment boundary proven on Precision:

- loopback-only model API;
- non-loopback model egress denied;
- direct input-device access denied;
- VOID repository read denied to the Ollama service user;
- node-key access denied/not present;
- Tailscale state access denied;
- service disabled at boot and stopped after bounded tests;
- no repository mutation from the model service.

A separate trusted broker may later perform explicitly granted actions on behalf of the Brood Queen. Model responses remain untrusted proposals/data and the broker independently enforces authentication, capability, and validator-separation rules.

## Future remote bridge

A later Ren→Precision bridge must be narrow, authenticated, auditable, replay-resistant, and terminate at a trusted broker. It must not expose raw Ollama or host credentials to the internet.

Public GitHub must not be used as a relay for private conversation memory or secret-bearing task payloads.

## Falsification / hard holds

This local-seat design HOLDs if an implementation:

- lets Apollyon authenticate as Brood Queen;
- exposes Brood Queen root/requester/session private material to model context;
- treats memory text as authority above the command layer;
- treats a structural admission receipt as model-injection authority;
- claims a heuristic secret regex proves categorical secret absence;
- reopens a context pathname after verification instead of consuming the exact returned verified bytes;
- publishes partial receipt bytes at the final receipt name;
- overwrites or deletes a foreign/conflicting final receipt occupant;
- reports durable receipt publication before the final namespace is parent-directory fsynced;
- silently accepts a changed security-bearing role/session/containment/V5 value merely because the field name remains allowed;
- imports raw chats automatically without admission/sanitization;
- gives the model direct validator authority;
- gives the Ollama service direct repository, input-device, wallet, node-key, or non-loopback network access;
- silently accepts parent/candidate/model/constitution/prompt identity drift;
- admits unknown nested authority fields; or
- claims a remote private broker or local receipt-enforced/sanitization-enforced runner is active before that runtime is actually proven.

## Current boundary

This source lane defines and proves contracts only. It does not start Ollama, install/activate a daemon, import private chats, generate a Crown key, activate a Crown session, modify the live local runner, activate a remote broker, merge/deploy code, mutate validators or Work Credits, use wallets/signers, submit transactions, take treasury/liquidity action, or move funds.
