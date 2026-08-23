# VOID Brood Queen Local Model Seat v1

**Marker:** `VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822`

**Parent identity contract:** `VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822`

**Parent command layer:** `VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818`

**Status:** source-only local-seat contract. This instrument does not activate a live Crown signer, appoint a model as Brood Queen, grant validator authority, expose credentials, or create autonomous mutation authority.

## Exact reviewed parent generation

This local-seat generation is content-bound to:

- identity reviewed head `817429b10752f772230d6f3210e414acc02d3c51`;
- identity fixture Git blob `0da4a436d79150253b352a56447046bd29e0408f`;
- identity document Git blob `4b928c2b30725bc27d5674d6a889df31100704fc`;
- command-layer fixture Git blob `7db27e1bb5350fc6f9b2fcc69d7075c5aa746c7d`;
- command-layer document Git blob `732536c0e22ba7ea417be61be7e1f9942bba6d74`;
- parent-policy SHA-256 `d59a6eb8c11a327f550dec87d399fcdf4622dcb2094f9364bd3fb0b91308bbf5`.

The child proof recomputes those identities, executes both parent proofs, and proves the exact reviewed parent head is an ancestor. Marker equality alone is never inherited authority.

## Purpose and command relationship

The Brood Queen office remains Ren. Apollyon remains the General and subordinate compute.

**King → Brood Queen / Ren → General / Apollyon**

Apollyon's defensive mission may protect VOID core integrity, Sovereign identity/continuity, and validator safety/integrity through analysis, evidence, review, containment planning, and escalation. Protecting validators does not grant validator admission, removal, command, key access, stake mutation, consensus mutation, or validator signing authority.

Model output is proposal/evidence until independently gated. The local model cannot authenticate as Ren, inherit Crown keys or sessions, or turn a title into technical capability.

## Exact V5 candidate binding

The local seat remains bound to:

- `void-apollyon-candidate-v1:latest`;
- candidate digest `ac1de81fc81bba23802b75e8d46beb1583785c14f94210af94e4e6901f93be3b`;
- base model `qwen3-coder:30b`;
- base digest `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca`;
- command-layer SHA-256 `f3b155ab9df462f7a4f0981a52aca15ec640548c19c7e81c24e883513112adbd`;
- system prompt body SHA-256 `78637ce3cdca98979c6107e96b85e171bc6a46c6c611f86c518fa1d1c49fad8b`;
- Ollama framing SHA-256 `7e336c378e0be8ae084767daa5b5c2a612417328360f66f0a9ba358333a0dedc`;
- tested Ollama runtime `0.30.10`.

## Private context structural admission

The actual Ren memory pack remains private/local and outside the public repository. Raw transcript import is not automatic.

Structural/policy admission requires an exact closed V2 schema, current operator UID, exact mode `0600`, `O_NOFOLLOW`, exactly one hard link, generation-bound bounded reads, strict UTF-8, exact reviewed security-bearing values, explicit Crown/validator authority exclusions, and defense-in-depth rejection of known secret shapes.

The secret-shape scanner is not represented as proof of categorical secret absence. Arbitrary free-form values therefore never become model input merely because structural admission succeeded.

## Receipt publication: exact anonymous generation

Admission receipts remain metadata/provenance only and contain neither the private context payload nor its local filesystem path.

Publication removes the staged-path authority seam without widening process capabilities:

1. open the exact parent directory once and retain that directory handle;
2. create an **anonymous inode** in that exact directory with Linux `O_TMPFILE`;
3. write the complete canonical receipt and fsync the anonymous inode;
4. publish that exact open inode through the documented unprivileged procfs fd reference `/proc/self/fd/<fd>` using `linkat(..., AT_SYMLINK_FOLLOW)` into the retained parent-directory handle;
5. require create-only/no-replace behavior;
6. require the final name to resolve to the exact anonymous inode with mode `0600` and a **single hard link**;
7. fsync the exact retained parent-directory handle before durable success.

The publisher does **not** request `CAP_DAC_READ_SEARCH` or any other capability widening. If procfs fd references are unavailable, publication HOLDs rather than falling back to privileged `AT_EMPTY_PATH` semantics.

There is no staged pathname and therefore no retained stage alias to substitute, mutate, accumulate, or mistake for authority.

If the final receipt name already exists, it is accepted only when its exact canonical bytes match the expected receipt; a conflicting existing final HOLDs without replacement or deletion. Retry after a pre-commit failure converges on the exact expected final generation. A post-commit observer failure cannot downgrade a receipt that already crossed the parent-directory fsync commit point.

The source proof also swaps the parent pathname generation after publication and requires zero false success: durability is bound to the exact parent-directory handle, not a later pathname reopen.

## Verification-to-consumption boundary

`verifyContextReceipt()` returns the exact verified context bytes and binds them to the exact receipt. A caller must not perform `verify -> reopen pathname -> use`.

Raw verified bytes still have **zero model-input authority**.

The standalone verify CLI is diagnostic only.

## Executable sanitizer → model-input gate

The sanitizer policy is:

- marker `VOID_BROOD_QUEEN_LOCAL_CONTEXT_SAFE_PROJECTION_V1`;
- policy SHA-256 `a001f87d9ab0baebd270d01600ba6f74f554839eeab9fbfa3a02f40d4f6238df`.

The current V1 sanitizer is intentionally narrow and deterministic. It creates a **safe projection** containing only exact reviewed role, command-chain, candidate, session-direction, containment, validator-separation, work-boundary, project-identity, and core-protection facts. Free-form values such as `source`, lessons, arbitrary notes, or other unconstrained memory strings are excluded.

`sanitizeVerifiedContext()` is bound to the exact `source_context_sha256` it examined. `authorizeModelInput()` accepts only the exact canonical safe projection under the exact sanitizer policy identity. It rejects:

- raw verified bytes;
- a changed sanitizer policy;
- changed model-input bytes;
- a changed source-context digest; or
- a projection that no longer equals the deterministic reviewed safe projection.

This makes the sanitizer-to-model-input gate executable rather than declarative.

Richer free-form semantic memory may be added later only under a separately reviewed sanitizer/redaction policy. This V1 source contract does not pretend regex heuristics can prove arbitrary text safe.

## Workflow self-enforcement

The focused workflow trigger-binds this document, fixture, proof, admission tool, parent normative artifacts, and the shared committed-range hygiene helper/proof. The local-seat proof additionally checks the workflow still invokes both the shared hygiene proof and `scripts/ci_diff_hygiene_v1.sh` with the exact PR-head/current-checkout bindings.

## Runtime truth

This source contract **does not claim that the live local runner already enforces** the anonymous-inode receipt publisher or sanitized safe-projection model-input gate. Earlier runtime evidence remains historical evidence for the earlier local-seat generation only.

A later runtime integration must prove that:

- the runner consumes only authorized sanitized projection bytes;
- raw verified bytes cannot bypass sanitization;
- receipt and sanitizer generation identities remain bound through the call boundary;
- Ollama remains loopback-only and contained;
- no Crown/session/validator/wallet/signer authority is introduced.

## Hard holds

This contract HOLDs if an implementation:

- lets Apollyon authenticate as Brood Queen;
- exposes Crown/root/requester/session private material to the model;
- grants validator authority through protection language;
- treats admission receipts as bearer authority;
- uses a pathname-staged receipt that can be substituted after fsync;
- retains a hard-link stage alias after final publication;
- reopens the parent directory by pathname for the durability fsync instead of using the exact retained directory handle;
- requires capability widening merely to publish the anonymous receipt inode;
- silently falls back to privileged `AT_EMPTY_PATH` receipt publication when unprivileged procfs fd publication is unavailable;
- overwrites or deletes a conflicting final receipt occupant;
- authorizes raw verified context bytes as model input;
- permits free-form context values into the V1 safe projection;
- replays a sanitized projection against a different source-context generation;
- weakens the committed-range hygiene invocation while leaving the proof nominally present; or
- claims the live runner enforces this generation before runtime integration is separately proven.

## Current boundary

Source/proof only. No Ollama activation by this PR, no private-context upload, no Crown-key generation, no signer activation, no deployment/restart, no validator mutation, no wallet/signer use, no transaction, no treasury/liquidity action, and no funds movement.
