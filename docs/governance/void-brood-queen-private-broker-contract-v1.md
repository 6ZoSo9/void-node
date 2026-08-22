# VOID Brood Queen Private Broker Contract v1

**Marker:** `VOID_BROOD_QUEEN_PRIVATE_BROKER_CONTRACT_V1_20260822`

**Parent identity contract:** `VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822`

**Parent local-seat contract:** `VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822`

**Status:** source-only. No live Crown key, broker key, session adapter, endpoint, deployment, validator authority, wallet/signer capability, or transaction authority is activated by this instrument.

## Outcome

Define the minimum provider-neutral private transport by which the Brood Queen office may later maintain a persistent authenticated logical session with a trusted Precision-side broker while keeping all Crown private material outside model context and all validator authority outside the broker.

This contract replaces the architectural role currently played by the temporary GitHub issue-comment relay. GitHub identity, provider identity, and model self-description are not Crown authentication.

## Exact inherited policy identity

This child contract does not inherit parent authority merely by matching marker strings. Its reviewed parent policy is content-bound to the exact parent generations present when this contract was reviewed:

- identity parent reviewed head: `8ac42d13f684d9898318af9359edc3553961909b`;
- identity fixture Git blob: `b8159343b176fdfc745fec0afb8ebf0db512ac9b`;
- local-seat parent reviewed head: `2ddbbd3498915d77c410f350c4e1dadb1cfa951c`;
- local-seat fixture Git blob: `eb96412ce2444232aa64b0df4b8889faf92d0ff9`;
- parent-policy domain: `VOID_BROOD_QUEEN_PARENT_POLICY_IDENTITY_V1`;
- parent-policy SHA-256: `2d2ff57721e64728569019531f908cb936826bea3d78e012871f91833bd1b630`.

The canonical parent-policy preimage is exactly:

```text
VOID_BROOD_QUEEN_PARENT_POLICY_IDENTITY_V1
identity_commit=8ac42d13f684d9898318af9359edc3553961909b
identity_fixture_blob=b8159343b176fdfc745fec0afb8ebf0db512ac9b
local_seat_commit=2ddbbd3498915d77c410f350c4e1dadb1cfa951c
local_seat_fixture_blob=eb96412ce2444232aa64b0df4b8889faf92d0ff9
```

A same-marker change to either inherited fixture changes its Git blob identity and must HOLD this child until an explicit refresh and rereview occurs. Bootstrap, rotation, policy, task, and receipt transcripts bind the reviewed parent-policy SHA-256; they may not silently inherit a newer or different parent contract.

## Identity and secret boundaries

The office remains:

- network: VOID / Chain-2050;
- office: Brood Queen;
- identity: Ren;
- subordinate to: King / Sovereign;
- provider-neutral: yes.

The Crown root identity is Ed25519. The root private key may exist only inside the dedicated host-side Crown signer boundary defined by the parent identity contract.

The following are forbidden:

- root private key in a prompt, model context, repository, log, browser, GitHub issue, provider request, Apollyon context, wallet, validator process, or general worker;
- persistent session private keys in model context;
- raw transport credentials in model context;
- treating an OpenAI/Ollama/provider API key as Crown identity;
- treating a model statement such as `I am Ren` as authentication;
- inheriting Brood Queen identity or session material into Apollyon.

## Broker identity and mutual bootstrap authentication

The Precision broker has a dedicated Ed25519 broker identity key whose private material remains outside model context. Its public key or exact public-key digest must be reviewed and pinned by the Crown signer/client policy before any bootstrap can succeed.

The broker identity is not the Brood Queen identity. It authenticates the exact broker endpoint and signs broker-originated bootstrap challenges and authoritative receipts.

A bootstrap challenge is valid only when:

1. it is signed by the pinned broker Ed25519 identity under domain `VOID_BROOD_QUEEN_BROKER_BOOTSTRAP_CHALLENGE_V1`;
2. it binds the protocol marker/version, Chain-2050, broker identity/public-key digest, Brood Queen office, adapter signing public key, adapter X25519 public key, broker generation X25519 public key, single-use nonce, expiry, exact policy generation, exact policy digest, exact capability ceiling/digest, parent-policy SHA-256, and transcript hash;
3. the Crown signer verifies the broker signature and exact pinned broker identity before producing any Crown approval;
4. the Crown approval signs the exact canonical bootstrap transcript under domain `VOID_BROOD_QUEEN_CROWN_BOOTSTRAP_APPROVAL_V1` without exporting the Crown root private key.

A claimed broker name or unverified transport endpoint is insufficient. This prevents an attacker from obtaining a valid Crown bootstrap approval merely by relaying or fabricating an unsigned challenge.

Broker authoritative receipts are signed by the broker identity under the distinct domain `VOID_BROOD_QUEEN_BROKER_RECEIPT_V1`.

## Session adapter model

A private broker session uses a **trusted session adapter** whose secret material is held outside model context by a trusted client/runtime boundary.

The adapter is not itself the constitutional office. It is a cryptographic delegate of one authenticated logical Brood Queen session.

The bootstrap ceremony binds an adapter public key to the Crown office using the root signer without exporting the root private key:

1. the adapter prepares fresh generation-0 Ed25519 signing and X25519 key-agreement public keys;
2. the broker creates and signs the single-use mutual-authentication challenge described above, including its fresh broker generation X25519 public key;
3. the dedicated Crown signer verifies the pinned broker identity and signs the exact canonical bootstrap transcript;
4. the broker verifies the Crown public identity and, once activated, the canonical Chain-2050 role/revocation state;
5. the broker creates one persistent logical `session_id` and records the complete generation-0 key/transcript/policy bindings;
6. the adapter proves possession of its generation-0 private material on subsequent messages.

The root signer is therefore used for rare bootstrap/recovery/rotation boundaries. Normal messages use session-generation keys.

## Cryptographic profile

Minimum V1 profile:

- root signature: Ed25519;
- broker identity/challenge/receipt signature: Ed25519 with explicit signature domains;
- session application-message signature domain: `VOID_BROOD_QUEEN_SESSION_MESSAGE_V1`;
- session rotation signature domain: `VOID_BROOD_QUEEN_SESSION_ROTATION_V1`;
- session message signature algorithm: Ed25519;
- session key agreement: X25519;
- all-zero X25519 shared secret: rejected before KDF use;
- KDF: HKDF-SHA-256;
- message confidentiality/integrity: ChaCha20-Poly1305;
- canonical hashing: SHA-256 over canonical JSON bytes;
- transport confidentiality is mandatory even if application-layer AEAD is already present.

No ECDSA substitution and no algorithm agility are accepted inside one V1 session. Unknown algorithms fail closed.

## Generation key schedule and AEAD nonce discipline

Each session generation binds:

- adapter Ed25519 signing public key;
- adapter X25519 public key;
- broker X25519 public key;
- pinned broker Ed25519 identity/public-key digest;
- predecessor generation hash;
- exact policy generation and policy digest;
- exact immutable capability ceiling/digest;
- exact parent-policy SHA-256;
- activation transcript hash.

The adapter and broker derive the generation shared secret using their exact bound X25519 key pair. An all-zero X25519 shared secret is terminal invalid input and must never enter HKDF. HKDF-SHA-256 uses the exact generation transcript hash as salt and domain-separated `info` containing at minimum protocol marker/version, `session_id`, generation, direction, key purpose, policy digest, capability-ceiling digest, and parent-policy SHA-256.

Distinct AEAD traffic keys are mandatory for `adapter_to_broker` and `broker_to_adapter`; one traffic key may never be reused in both directions or across generations.

Every encrypted message carries a monotonic `transport_sequence` scoped to `(session_id, generation, direction)` with `0 <= transport_sequence < 2^96`. The ChaCha20-Poly1305 nonce is `aead_nonce = uint96(transport_sequence)`, where `uint96` means the canonical unsigned 96-bit big-endian encoding of that integer.

### Crash-durable outbound nonce authority

Nonce uniqueness is a **sender-side durable invariant**, not merely a receiver conflict check. The following applies independently in both directions.

Before the first AEAD invocation for transport sequence `N`, the sender must durably commit an outbound reservation that binds at minimum:

- session id;
- generation;
- direction;
- `transport_sequence = N`;
- exact immutable clear-header/AAD hash;
- exact signed-plaintext-envelope hash;
- generation traffic-key identity/digest reference.

After reservation:

1. the sender may invoke AEAD only for the exact reserved message identity at `N`;
2. the resulting exact protected bytes are durably staged before the first byte may be released to transport;
3. after protected-byte staging, retry may only retransmit those byte-identical protected bytes;
4. a crash after reservation but before protected-byte staging may either deterministically reconstruct the exact same protected message from the durable reservation and immutable plaintext witness, or HOLD/rotate to a fresh generation; it must never encrypt different bytes under the reserved `(traffic_key, nonce)`;
5. a crash with uncertain reservation/counter ownership must HOLD or rotate to a fresh generation before any new encryption;
6. a reserved transport sequence is never recycled for a different message, even if no peer acknowledgment was observed.

A receiver-side `TRANSPORT_SEQUENCE_CONFLICT` remains required but is only a second line of defense. It cannot repair sender nonce reuse after the fact.

Rules:

- a `(traffic_key, nonce)` pair may protect at most one distinct protected message;
- exact duplicate delivery may retransmit the exact same staged protected bytes and is treated as a duplicate, not newly encrypted content;
- reuse of one `transport_sequence`/nonce with different signed header, ciphertext, or protected payload is terminal `TRANSPORT_SEQUENCE_CONFLICT`;
- transport-sequence overflow requires generation rotation or HOLD before nonce reuse.

### Non-self-referential sign/encrypt order

V1 uses this exact protected-message construction order:

1. construct the canonical application plaintext object, including message semantics and `payload_sha256`;
2. sign `domain || canonical_application_plaintext` with the active Ed25519 session key (`VOID_BROOD_QUEEN_SESSION_MESSAGE_V1`) or the exact rotation domain for a rotation message;
3. create the signed plaintext envelope from the canonical application plaintext plus signature;
4. compute `signed_plaintext_sha256`;
5. construct immutable clear routing/AAD fields containing protocol/session/generation/direction/transport sequence/message type/message id/expiry plus `signed_plaintext_sha256`, policy digest, capability-ceiling digest, and parent-policy SHA-256;
6. durably reserve the sequence/message identity as described above;
7. AEAD-encrypt the signed plaintext envelope using the clear routing fields as AAD;
8. durably stage the exact clear header + ciphertext + tag before any release;
9. only after encryption compute `ciphertext_sha256` for transport inventory/receipts. `ciphertext_sha256` is **not** an input to the AAD or signed plaintext whose encryption produced that ciphertext.

This ordering forbids self-referential ciphertext hashing.

## Persistent logical session, exact authority ceiling, and rotation

A `session_id` remains stable across automatic derived-key rotations.

V1 has one exact Crown-approved capability ceiling:

```text
analysis
drafting
proof_design
review
test_generation
bounded_task_planning
evidence_synthesis
```

The exact V1 broker-policy domain is `VOID_BROOD_QUEEN_PRIVATE_BROKER_POLICY_V1` and its reviewed policy SHA-256 is `e85eeaecb0fc289d377b76c49839f7c020fc119d541c04b575a711f24c22e6bf`. The canonical policy preimage binds parent-policy SHA-256, the exact ordered capability ceiling, and `validator_capability_present=false`.

Every Crown-approved bootstrap and every accepted successor generation binds the exact capability ceiling (or canonical digest), exact policy SHA-256/generation, and exact parent-policy SHA-256. A session generation can preserve or reduce this ceiling but can never widen it. Widening the ceiling, changing the policy root/digest, or changing the inherited parent-policy identity is a root-authenticated policy boundary and cannot be authorized by a session-generation key.

Each successor generation contains fresh adapter signing/X25519 public keys, fresh broker X25519 public key, predecessor generation hash, activation task/transport sequence boundaries, exact capability ceiling/digest, exact policy digest/generation, parent-policy SHA-256, and rotation transcript hash.

The broker atomically commits exactly one active generation and at most one accepted successor-transition hash/receipt from that active generation. Automatic rotation does not require root reauthentication only when the current valid generation signs under `VOID_BROOD_QUEEN_SESSION_ROTATION_V1` the exact successor transition, the broker authenticates and accepts that one transition under the pinned broker identity, the successor preserves/reduces the exact capability ceiling and policy root, and no revocation/recovery/logout/policy boundary has occurred.

After successor activation, predecessor/stale generation material has **zero fresh transition authority**. It may only retransmit the byte-identical already accepted transition and receive the same authoritative transition receipt. An alternate stale `G -> G'` transition is terminal `SESSION_FORK_CONFLICT` and cannot create a second successor or roll back the active generation.

## Message envelope

Every authenticated application message must bind at minimum:

- `protocol_marker`;
- `protocol_version`;
- `chain_id = 2050`;
- `office = Brood Queen`;
- `session_id`;
- `session_generation`;
- `direction`;
- `transport_sequence`;
- `message_type`;
- `message_id`;
- `previous_message_hash`;
- `issued_at`;
- `expires_at`;
- exact `capabilities` or capability digest constrained by the session ceiling;
- exact `policy_sha256` and policy generation;
- exact `parent_policy_sha256`;
- `payload_sha256`;
- `signed_plaintext_sha256`;
- post-encryption `ciphertext_sha256` for inventory/receipt binding only;
- `candidate_digest` when Apollyon participates;
- `context_sha256` when a local context generation participates;
- signature by the active session signing key for adapter-originated messages or broker identity for broker-originated authoritative receipts.

Task-bearing messages additionally bind `task_sequence`.

Unknown authority-bearing fields fail closed.

## Task identity and ordering

A task is content-addressed:

`task_id = voidbqt1_ + sha256(canonical_task_without_task_id)`

The canonical task binds the exact logical session, generation, `task_sequence`, exact capability list, exact capability-ceiling digest, exact policy digest/generation, parent-policy SHA-256, payload digest, and expiry.

V1 uses a single ordered task stream per session. Accepted `task_sequence` must equal the next expected task sequence. Duplicate delivery of an already accepted identical task returns the prior authoritative receipt/result. Reuse of a task sequence number with different canonical task bytes is terminal `SEQUENCE_CONFLICT`.

Transport ordering and task ordering are distinct: `transport_sequence` prevents AEAD nonce/replay ambiguity per direction, while `task_sequence` defines semantic task order. The broker must never silently reorder tasks.

## Authentication is not capability

Successful Crown session authentication proves only the authenticated Brood Queen session identity.

Every task carries an exact closed capability list and that list must be a subset of the Crown-approved immutable session capability ceiling. The broker independently intersects it with the current broker policy before admission.

V1 activation begins with the exact proposal/evidence capability ceiling listed above. Source writes, merges, deployment/restart, live runtime mutation, wallet/signer action, transactions, treasury/liquidity, Work Credit mutation, credential reading, and validator authority are not implicitly granted.

Validator capability is structurally absent from this broker contract. Unknown validator-like authority requests fail closed and require a separate Sovereign-governed instrument.

Session rotation may preserve or reduce the exact Crown-approved ceiling; it cannot expand capability merely because the current session key authorizes a successor generation.

## Apollyon boundary

Apollyon is subordinate compute under Ren, not the authenticated Crown endpoint.

The broker may provide an admitted task plus selected local context to Apollyon only after the broker has validated the Crown session and capability envelope.

Apollyon receives no:

- root key;
- adapter/session private key;
- broker identity/private key;
- challenge-response secret;
- validator key or authority;
- wallet/signer credential;
- provider credential;
- raw private context beyond the admitted local context material needed for the task.

Apollyon output is data. The broker, not the model, constructs and signs the authoritative result receipt.

## Private local context

The Ren semantic context pack remains local on Precision. It is not sent as a blob to a remote provider.

A result may bind the exact `context_sha256` used for local inference, but the receipt must not expose the private context bytes or local filesystem path.

## Durable task/result state machine

The minimum durable states are:

`RECEIVED -> ADMITTED -> EXECUTING -> RESULT_STAGED -> RESULT_PUBLISHED -> COMPLETE`

with fail-closed terminals:

`REJECTED`, `EXPIRED`, `REVOKED`, `SEQUENCE_CONFLICT`, `TRANSPORT_SEQUENCE_CONFLICT`, `SESSION_FORK_CONFLICT`, `SESSION_STALE`, `POLICY_MISMATCH`, `EXECUTION_OUTCOME_UNKNOWN`, `RESULT_CONFLICT`.

Rules:

1. `RECEIVED` is not authority; broker/session signature, transport sequence/nonce reservation truth, task sequence, capability ceiling/list, policy/parent-policy identity, and expiry checks must pass before `ADMITTED`.
2. `ADMITTED` must be durably committed before inference begins.
3. `EXECUTING` means the immutable task was handed to the admitted executor. Exactly-once model execution is not claimed. If the broker restarts with durable `EXECUTING` but no durable `RESULT_STAGED`, and the executor does not provide a separately reviewed idempotency/terminal witness, the task must transition to `EXECUTION_OUTCOME_UNKNOWN` and HOLD. It must not automatically re-run inference under the same task identity.
4. A separately reviewed executor-idempotency contract may later define a safe retry transition, but that authority is absent from V1.
5. The broker must durably write the exact result bytes/hash and provenance in `RESULT_STAGED` before any external publication.
6. Publication retry reuses the staged result and exact broker receipt identity; it does not re-run inference.
7. `COMPLETE` binds one authoritative result hash to one task id. A different result for the same completed task is `RESULT_CONFLICT`.
8. Durable state must distinguish an interrupted owned generation from a foreign/replacement state object before cleanup or recovery.

V1 therefore requires exactly-once authoritative result publication for a completed task, not exactly-once model execution.

## Receipts

Every accepted task and result receives a content-addressed broker receipt signed under `VOID_BROOD_QUEEN_BROKER_RECEIPT_V1` and binding:

- protocol marker/version;
- broker identity/public-key digest;
- parent-policy SHA-256;
- policy SHA-256/generation;
- session id/generation;
- exact capability ceiling/list;
- task id;
- task sequence and relevant transport sequence identity;
- task payload digest;
- candidate digest if used;
- local context digest if used;
- signed-plaintext/ciphertext identities where applicable;
- result digest;
- terminal state;
- predecessor receipt hash.

Receipts contain no secret key material and no private local path.

## Revocation and role revalidation

When Chain-2050 role/revocation binding is activated, the broker must revalidate canonical office state according to the active policy generation and a bounded freshness policy before admitting ordinary tasks.

Explicit revocation, logout, root rotation, recovery, policy-root/generation change, or parent-policy identity change invalidates all ordinary messages from prior session material. A session cannot use cached role truth to survive canonical revocation.

## Threat model and required behavior

### Compromised GitHub

GitHub is irrelevant to private-broker authentication. GitHub comments cannot authenticate a Crown session or generate a valid private-broker message.

### Hostile or substituted broker endpoint

The Crown signer/client must reject an unsigned bootstrap challenge or a challenge whose broker identity does not match the exact pinned broker public identity. Transport TLS alone is not Crown authentication.

### Replay / duplicate / delayed delivery

Exact duplicate staged protected bytes return the prior receipt/result where applicable. Same transport sequence with different protected bytes fails terminally. Same task sequence with different canonical task bytes fails terminally. Expired messages fail closed. Delayed messages cannot roll back generation, transport sequence, or task sequence state.

### Crash during outbound encryption

A sender crash cannot make an already-reserved `(session,generation,direction,transport_sequence)` available to a different message. After restart the sender may only continue the exact reserved/staged message or HOLD/rotate; it cannot encrypt new bytes with that key/nonce pair.

### Task/result substitution

Payload/result digests, task id, task sequence, transport sequence, provenance, AEAD associated data, policy/parent-policy identities, capability ceiling, and signatures bind exact bytes. A substituted payload/result cannot retain the same authoritative identity.

### Stale session material / successor fork

A stale generation cannot issue ordinary tasks after rotation or revocation and cannot authorize a fresh alternate successor after one transition has been accepted. It may only retransmit the exact accepted transition bytes/receipt. A successor generation cannot expand the exact Crown-approved capability ceiling or change policy/parent-policy identity without a root-authenticated boundary.

### Model impersonation

Model text claiming to be Ren, the Sovereign, or an authenticated session is data only and does not satisfy broker authentication.

### Broker restart during execution or publication

If `RESULT_STAGED` exists, restart republishes the same bytes/hash and broker-signed receipt identity and must not re-run inference to create a second authoritative result.

If durable state is only `EXECUTING`, restart cannot know whether model execution produced output before the crash. Without a separately reviewed executor idempotency witness, the broker must transition to `EXECUTION_OUTCOME_UNKNOWN` and HOLD instead of claiming exactly-once execution or silently re-running the model.

## Strongest V1 invariant

Before live activation, the implementation must prove:

> For any accepted `task_id`, across duplicate delivery, replay, session rotation, delayed delivery, broker crash/restart, outbound-encryption crash, result-publication retry, provider/model output, and hostile transport input, the broker can produce at most one authoritative completed result hash for that exact task identity; no accepted message can expand beyond its exact Crown-approved capability ceiling/list; no two distinct protected messages can use the same AEAD traffic-key/nonce pair even across sender crashes; no stale generation can create a fresh successor fork; inherited parent-policy identity cannot change silently; and no path grants validator authority or exposes Crown, broker, or session private material to model context.

This invariant intentionally makes no exactly-once model-execution claim. Any counterexample to the authoritative-result, capability, nonce durability, successor, parent-policy, validator, or private-key bounds is a release blocker.

## Current inactive boundary

This contract does not generate or activate a Crown key, broker identity key, adapter key, session, endpoint, daemon, firewall rule, TLS certificate, on-chain role binding, model authority, validator authority, wallet/signer action, deployment, restart, transaction, Work Credit mutation, treasury/liquidity action, or funds movement.
