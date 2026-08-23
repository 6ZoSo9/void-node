# VOID Brood Queen Private Broker Contract v1

**Marker:** `VOID_BROOD_QUEEN_PRIVATE_BROKER_CONTRACT_V1_20260822`

**Parent identity contract:** `VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822`

**Parent local-seat contract:** `VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822`

**Status:** source-only. No live Crown key, broker key, adapter key, session, endpoint, daemon, TLS material, on-chain binding, validator authority, wallet/signer capability, transaction authority, deployment, restart, Work Credit mutation, treasury/liquidity action, or funds movement is activated by this instrument.

## Outcome

Define the minimum provider-neutral private transport by which the Brood Queen office may later maintain a persistent authenticated logical session with a trusted Precision-side broker while keeping all Crown private material outside model context and all validator authority outside the broker.

GitHub identity, provider identity, and model self-description are not Crown authentication.

## Exact inherited policy identity

This child contract inherits parent authority only from exact reviewed parent content:

- identity parent reviewed head: `e0014daaad939aec7b220da654d48ca3f6f9b758`;
- identity fixture Git blob: `2b0658867a2273e486cf685be30c368754f2b4b3`;
- local-seat parent reviewed head: `377aafd943fb4cc6811711f83566e40e9d15e533`;
- local-seat fixture Git blob: `de3833097efc7e04a102c48dff0370ebc35cb222`;
- parent-policy domain: `VOID_BROOD_QUEEN_PARENT_POLICY_IDENTITY_V1`;
- parent-policy SHA-256: `52746cf1013706db4b35ae627f1d78b08932c6a4a0581737a0ced1aa5a5ca332`.

The canonical parent-policy preimage is exactly:

```text
VOID_BROOD_QUEEN_PARENT_POLICY_IDENTITY_V1
identity_commit=e0014daaad939aec7b220da654d48ca3f6f9b758
identity_fixture_blob=2b0658867a2273e486cf685be30c368754f2b4b3
local_seat_commit=377aafd943fb4cc6811711f83566e40e9d15e533
local_seat_fixture_blob=de3833097efc7e04a102c48dff0370ebc35cb222
```

A same-marker change to either inherited fixture changes its Git blob and must HOLD this child until explicit refresh and rereview. Bootstrap, rotation, policy, task, and receipt transcripts bind the reviewed parent-policy SHA-256.

## Identity and secret boundaries

The Crown office remains Chain-2050 / Brood Queen / Ren, provider-neutral and subordinate to the Sovereign. The Crown root identity is Ed25519 and its private key may exist only inside the dedicated host-side Crown signer boundary defined by the parent identity contract.

Forbidden locations for Crown, broker, adapter, or session private material include model prompts/context, provider requests, repository, logs, GitHub, browser state, Apollyon, validators, wallets, or ordinary workers. Provider API keys are service plumbing, not Crown identity. Model text such as `I am Ren` is data, not authentication.

## Broker identity and mutual bootstrap

The Precision broker has a dedicated Ed25519 broker identity outside model context. Its exact public identity or digest must be reviewed and pinned before bootstrap.

Distinct signature domains are mandatory:

- broker challenge: `VOID_BROOD_QUEEN_BROKER_BOOTSTRAP_CHALLENGE_V1`;
- Crown approval: `VOID_BROOD_QUEEN_CROWN_BOOTSTRAP_APPROVAL_V1`;
- broker receipt: `VOID_BROOD_QUEEN_BROKER_RECEIPT_V1`;
- session application message: `VOID_BROOD_QUEEN_SESSION_MESSAGE_V1`;
- session rotation: `VOID_BROOD_QUEEN_SESSION_ROTATION_V1`.

A broker challenge binds the protocol/version, chain, broker identity digest, Brood Queen office, fresh adapter Ed25519 and X25519 public keys, fresh broker-generation X25519 public key, a cryptographically random single-use nonce, one proposed `session_id`, expiry, exact policy generation/digest, exact capability ceiling/digest, exact parent-policy digest, and transcript hash. The proposed session id uses exactly 32 lowercase hexadecimal characters representing 16 bytes.

The Crown signer verifies the exact pinned broker signature and signs the exact canonical bootstrap transcript. The broker verifies the Crown identity and, once activated, current canonical Chain-2050 role/revocation state.

### Crash-durable single-use bootstrap authority

The single-use challenge is not merely an in-memory replay cache. Before any bootstrap success or authoritative receipt can escape, the broker performs one durable create-once/CAS transaction that atomically:

1. consumes the exact challenge nonce + canonical challenge hash + Crown approval hash;
2. binds those exact identities to the Crown-approved proposed `session_id`;
3. creates generation 0 with the exact key, policy, capability, and parent-policy transcript;
4. records the authoritative bootstrap receipt identity.

Crash before that atomic commit creates zero session authority. Crash after commit but before receipt release returns the same session and receipt on retry. Byte-identical replay after commit returns the same session/receipt and creates no second session. Reuse of the challenge nonce with different transcript, approval, or proposed session id is terminal `BOOTSTRAP_CONFLICT`.

One Crown approval can create at most one logical session authority.

## Exact V1 policy identity

The policy domain is `VOID_BROOD_QUEEN_PRIVATE_BROKER_POLICY_V1`.

`policy_generation` is a canonical unsigned decimal string, never a JSON number. V1 accepts exactly `"1"`. Future values must match `^(0|[1-9][0-9]*)$`, parse directly to unsigned integer semantics without binary64 coercion, and remain below `2^64`.

The exact V1 capability ceiling is:

```text
analysis
drafting
proof_design
review
test_generation
bounded_task_planning
evidence_synthesis
```

The canonical V1 policy preimage is exactly:

```text
VOID_BROOD_QUEEN_PRIVATE_BROKER_POLICY_V1
parent_policy_sha256=52746cf1013706db4b35ae627f1d78b08932c6a4a0581737a0ced1aa5a5ca332
policy_generation=1
capability_ceiling=analysis,drafting,proof_design,review,test_generation,bounded_task_planning,evidence_synthesis
validator_capability_present=false
```

Its SHA-256 is `1035f19d0f2312fc43725d3d3185f6769f7f6d91fc98543142875c3315ae0f3a`.

Authentication proves identity only. Every task carries a closed capability list that must be a subset of this Crown-approved ceiling and the current broker policy. Session keys cannot widen the ceiling or change the policy root. A widening or policy-root change is a root-authenticated policy boundary.

Validator capability is structurally absent from this broker contract.

## Cryptographic profile

V1 fixes one profile:

- root signature: Ed25519;
- broker identity/challenge/receipt signature: Ed25519;
- session signature: Ed25519;
- key agreement: X25519;
- all-zero X25519 shared secret: rejected before KDF use;
- KDF: HKDF-SHA-256;
- AEAD: ChaCha20-Poly1305;
- canonical hashing: SHA-256 over canonical JSON bytes;
- transport confidentiality: mandatory.

ECDSA substitution and algorithm agility inside one V1 session are rejected.

## Exact authority-bearing wire encodings

Authority-bearing counters are strings with closed encodings. JSON numeric coercion is forbidden.

### Transport sequence

`transport_sequence` is exactly 24 lowercase hexadecimal characters matching `^[0-9a-f]{24}$`. It is the exact 12-byte unsigned big-endian value and the ChaCha20-Poly1305 nonce is:

`aead_nonce = hex_decode_12_bytes(transport_sequence)`

The full domain `0 .. 2^96-1` is representable without conversion through JavaScript `Number`, IEEE-754 binary64, exponent notation, signs, fractions, or alternative lexical forms. Monotonic comparison uses the exact 96-bit value/bytes.

Adjacent legal values at `2^53` and `2^53+1` must remain distinct. `ffffffffffffffffffffffff` is admissible; any value requiring more than 24 hex characters is inadmissible.

### Task sequence and generation

`task_sequence` is a canonical unsigned decimal string below `2^64`; `session_generation` is a canonical unsigned decimal string below `2^32`; `policy_generation` is a canonical unsigned decimal string below `2^64`. Canonical decimal means `0` or a non-zero digit followed only by digits. Leading zeros, signs, fractions, exponent notation, JSON numbers, and overflow fail closed.

The same exact lexical value is used for canonical hashing, signatures, durable state, receipts, duplicate/conflict checks, and ordering.

## Generation key schedule and AEAD nonce discipline

Each generation binds the adapter Ed25519/X25519 public keys, broker X25519 public key, pinned broker identity digest, predecessor-generation hash, exact policy generation/digest, exact capability ceiling/digest, exact parent-policy digest, activation task/transport boundaries, and activation transcript hash.

The exact generation transcript hash is the HKDF salt. Domain-separated HKDF `info` binds protocol/version, session id, generation, direction, key purpose, policy digest, capability-ceiling digest, and parent-policy digest. `adapter_to_broker` and `broker_to_adapter` always use different traffic keys and traffic keys are never reused across generations.

### Crash-durable outbound nonce authority

Nonce uniqueness is a sender-side durable invariant in both directions.

Before the first AEAD invocation for a transport sequence, the sender durably reserves the exact session, generation, direction, transport-sequence wire bytes, clear-header/AAD hash, signed-plaintext-envelope hash, and traffic-key identity. AEAD may then operate only on that exact reserved message. The resulting exact protected bytes are durably staged before the first byte is released. Retry retransmits only those byte-identical protected bytes.

A reserved `(traffic_key, nonce)` is never recycled for a different message even if no peer acknowledgment exists.

### Uncertain or exhausted old-generation nonce authority

If durable state cannot prove whether an old-generation nonce was consumed, or if the old generation has exhausted its nonce domain, that old generation has **zero authority to create fresh protected bytes**, including a new in-band rotation message.

Allowed recovery is only:

- retransmission of byte-identical rotation bytes that were already durably reserved and staged under a known-safe nonce before uncertainty/exhaustion; or
- HOLD; or
- a separately root-authenticated/out-of-band recovery/bootstrap boundary that does not require a new AEAD invocation under the uncertain/exhausted traffic key.

A fresh successor key does not retroactively make an unsafe old-generation rotation message safe.

Receiver-side `TRANSPORT_SEQUENCE_CONFLICT` remains mandatory but cannot repair sender nonce reuse after the fact.

## Non-self-referential protected-message construction

V1 uses this exact order:

1. build canonical application plaintext, including `payload_sha256`;
2. sign `domain || canonical_application_plaintext` with the active Ed25519 key;
3. build the signed plaintext envelope;
4. compute `signed_plaintext_sha256`;
5. build immutable clear routing/AAD fields containing exact wire values and policy/capability/parent-policy identities;
6. durably reserve sequence/message identity;
7. AEAD-encrypt the signed plaintext using the clear routing fields as AAD;
8. durably stage clear header + ciphertext + tag;
9. release only after staging;
10. compute post-encryption `ciphertext_sha256` for inventory/receipt binding.

`ciphertext_sha256` is not an input to the AAD or plaintext whose encryption produced it.

## Persistent logical session and successor authority

A `session_id` remains stable across automatic derived-key rotation.

The broker maintains one durable **session authority record** containing at minimum:

- record/version identity used for compare-and-swap;
- active generation;
- next expected task sequence;
- at most one accepted successor transition hash/receipt;
- exact policy/capability/parent-policy identities;
- exact generation activation boundaries.

Both ordinary task admission and session rotation mutate this same authority record through compare-and-swap. They cannot independently commit against stale snapshots.

A successor preserves or reduces the exact capability ceiling and policy root. The broker atomically binds exactly one active generation and at most one accepted successor transition from it. After successor activation stale generation material has zero fresh-transition authority and may only retransmit the byte-identical already accepted transition. An alternate stale successor is terminal `SESSION_FORK_CONFLICT`.

If task admission wins the shared CAS before rotation, the task is committed under the old generation and the successor activation task boundary starts from the exact advanced task cursor. If rotation wins first, a paused old-generation admission must return `SESSION_STALE` with zero task-cursor consumption, zero executor handoff, and zero result authority.

## Message envelope

Every authenticated application message binds protocol/version, chain/office, session id, exact session-generation wire value, direction, exact transport-sequence wire value, message type/id, predecessor-message hash, issue/expiry times, exact capability list/digest, exact policy generation/digest, exact parent-policy digest, payload/signed-plaintext digests, and candidate/context digests when applicable. Task messages additionally bind exact `task_sequence`. Broker authoritative receipts bind post-encryption ciphertext identity when applicable.

Unknown authority-bearing fields fail closed.

## Task identity and atomic ordered admission

A task is content-addressed:

`task_id = voidbqt1_ + sha256(canonical_task_without_task_id)`

The canonical task binds the exact session/generation, exact task-sequence wire string, capability list/ceiling, policy generation/digest, parent-policy digest, payload digest, and expiry.

V1 uses one ordered task stream per session. Admission is one atomic create-once/CAS transition over the exact session-authority record version, active generation, predecessor next-task cursor, and canonical task identity. On success that single commit creates durable `ADMITTED(task)` **and** advances the next-task cursor together before any executor handoff.

Crash before this commit leaves the cursor unchanged, creates no admission, and performs zero inference. Crash after commit makes byte-identical redelivery an idempotent duplicate returning the same admission/receipt; same sequence with different canonical task bytes is terminal `SEQUENCE_CONFLICT`. There is no crash ordering in which the cursor advances without the admission or the admission exists without cursor advancement.

The broker never silently reorders or skips tasks.

## Durable task/result state machine

Task states are:

`RECEIVED -> ADMITTED -> EXECUTING -> RESULT_STAGED -> RESULT_PUBLISHED -> COMPLETE`

Fail-closed terminals include:

`REJECTED`, `EXPIRED`, `REVOKED`, `BOOTSTRAP_CONFLICT`, `SEQUENCE_CONFLICT`, `TRANSPORT_SEQUENCE_CONFLICT`, `SESSION_FORK_CONFLICT`, `SESSION_STALE`, `POLICY_MISMATCH`, `EXECUTION_OUTCOME_UNKNOWN`, `RESULT_CONFLICT`, `FOREIGN_STATE_CONFLICT`.

Rules:

1. `RECEIVED` is not authority. All identity/session/sequence/capability/policy/expiry checks must pass before the atomic admission commit.
2. `ADMITTED` is durable before inference begins.
3. `EXECUTING` means the immutable admitted task was handed to the executor. Exactly-once model execution is not claimed.
4. Restart with durable `EXECUTING` but no durable `RESULT_STAGED` becomes `EXECUTION_OUTCOME_UNKNOWN`/HOLD unless a separately reviewed executor-idempotency witness proves a safe retry. Automatic re-inference is absent from V1.
5. `EXECUTING -> RESULT_STAGED` is an atomic insert-if-absent / first-writer-wins transition bound to exact task, admission, executor/candidate, context, and result identity. The first valid result fixes immutable staged bytes/hash/provenance.
6. A byte-identical duplicate completion returns the existing staged result identity. A different valid completion after staging is terminal `RESULT_CONFLICT` before staged bytes or publication authority can change.
7. Publication consumes only the immutable staged generation. The exact broker receipt identity is the publication idempotency key.
8. The publication sink must support idempotence by that exact receipt identity. Crash after external publication but before local `RESULT_PUBLISHED` may retry only the same receipt/result and must converge on the same logical publication.
9. `COMPLETE` binds one authoritative result hash and receipt identity to one task.
10. Recovery/cleanup uses compare-and-swap against exact durable object identity and generation. A replacement/foreign object is never adopted, overwritten, or deleted and yields `FOREIGN_STATE_CONFLICT`.

V1 therefore requires at most one authoritative completed result identity per accepted task and exactly one logical authoritative publication identity, while intentionally making no exactly-once model-execution claim.

## Required deterministic transition adversaries

Before activation the implementation proof must execute, not merely declare, at least these cases:

- transport wire values at `2^53` and `2^53+1` remain distinct and map to distinct 12-byte nonces;
- max transport value `ffffffffffffffffffffffff` is accepted; wrong width/type/case or overflow is rejected;
- crash before bootstrap consumption/session commit creates zero session; exact replay after commit returns the same session/receipt;
- same bootstrap nonce with different transcript/approval/session id is `BOOTSTRAP_CONFLICT`;
- crash before atomic task admission performs zero inference and exact retry can admit once;
- crash after atomic task admission cannot leave task cursor and admission inconsistent;
- duplicate identical task across restart returns one admission/result identity;
- same task sequence with different canonical bytes is `SEQUENCE_CONFLICT` with no accepted-task mutation;
- rotation/admission race has exactly one winner under the shared session-authority CAS;
- uncertain/exhausted old-generation nonce state performs zero fresh old-key AEAD calls;
- crash in `EXECUTING` before `RESULT_STAGED` becomes `EXECUTION_OUTCOME_UNKNOWN` without automatic re-execution;
- concurrent different executor results produce one immutable stage winner and `RESULT_CONFLICT` for the loser;
- crash after `RESULT_STAGED` before publication republishes exact staged bytes/receipt only;
- crash after sink publication before local completion converges to the same logical receipt/result identity;
- stale generation cannot create an alternate successor;
- same-marker parent-content drift changes inherited policy identity and HOLDs;
- owned-vs-foreign recovery state never adopts, overwrites, or deletes the foreign object.

## Receipts

Every accepted task/result/bootstrap/rotation has a content-addressed broker receipt signed under `VOID_BROOD_QUEEN_BROKER_RECEIPT_V1`. Receipts bind the broker identity, exact parent-policy and policy generation/digest, session/generation, exact capability ceiling/list, task identity and task sequence where applicable, transport-sequence identity where applicable, payload/result digests, candidate/context provenance where applicable, staged/publication identity, terminal state, and predecessor receipt hash. Receipts contain no secret key material or private local filesystem paths.

## Revocation and role revalidation

When Chain-2050 role/revocation binding is activated, the broker revalidates canonical office state under a bounded freshness policy before ordinary task admission. Explicit revocation, logout, root rotation, recovery, policy-root/generation change, or parent-policy identity change invalidates ordinary messages from prior session material. Cached role truth cannot survive canonical revocation.

## Apollyon boundary

Apollyon is General/subordinate compute, not the authenticated Crown endpoint. It receives no Crown root, broker identity, adapter/session, validator, wallet, provider, or other private key material. Model output is data. The broker independently enforces authentication/capability/session state and constructs/signs authoritative receipts.

Ren's private semantic context remains local on Precision. Receipts may bind its SHA-256 but expose neither context bytes nor local paths.

## Strongest V1 invariant

Before live activation, the implementation must prove:

> For every accepted task and bootstrap, across hostile transport, duplicate/replay/delay, exact-wire parsing, session rotation, concurrent admission, sender crash, broker crash/restart, concurrent executor completion, result publication retry, and model/provider output: one Crown approval creates at most one logical session; one task sequence can atomically create at most one admitted canonical task; at most one immutable result stage and one authoritative completed result identity exist per task; no two distinct protected messages can share an AEAD traffic-key/nonce pair even across crashes; uncertain/exhausted old-generation nonce state cannot create fresh old-key ciphertext; no stale generation can create a fresh successor fork; no accepted message exceeds the exact Crown-approved capability ceiling/list; inherited parent-policy identity cannot change silently; and no path grants validator authority or exposes Crown, broker, or session private material to model context.

Any counterexample is a release blocker.

## Current inactive boundary

This contract does not generate or activate a Crown key, broker identity key, adapter key, session, endpoint, daemon, firewall rule, TLS certificate, on-chain role binding, model authority, validator authority, wallet/signer action, deployment, restart, transaction, Work Credit mutation, treasury/liquidity action, or funds movement.
