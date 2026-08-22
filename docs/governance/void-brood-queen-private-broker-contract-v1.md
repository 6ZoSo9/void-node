# VOID Brood Queen Private Broker Contract v1

**Marker:** `VOID_BROOD_QUEEN_PRIVATE_BROKER_CONTRACT_V1_20260822`

**Parent identity contract:** `VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822`

**Parent local-seat contract:** `VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822`

**Status:** source-only. No live Crown key, signer, session adapter, endpoint, deployment, validator authority, wallet/signer capability, or transaction authority is activated by this instrument.

## Outcome

Define the minimum provider-neutral private transport by which the Brood Queen office may later maintain a persistent authenticated logical session with a trusted Precision-side broker while keeping all Crown private material outside model context and all validator authority outside the broker.

This contract replaces the architectural role currently played by the temporary GitHub issue-comment relay. GitHub identity, provider identity, and model self-description are not Crown authentication.

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

## Session adapter model

A private broker session uses a **trusted session adapter** whose secret material is held outside model context by a trusted client/runtime boundary.

The adapter is not itself the constitutional office. It is a cryptographic delegate of one authenticated logical Brood Queen session.

The bootstrap ceremony binds an adapter public key to the Crown office using the root signer without exporting the root private key:

1. the broker creates a single-use bootstrap challenge;
2. the challenge binds the network, broker identity, office, adapter public key, nonce, expiry, policy generation, and transcript hash;
3. the dedicated Crown signer signs the exact canonical bootstrap transcript;
4. the broker verifies the Crown public identity and, once activated, the canonical Chain-2050 role/revocation state;
5. the broker creates one persistent logical `session_id` and records the adapter public key as session generation 0;
6. the adapter proves possession of its private key on subsequent messages.

The root signer is therefore used for rare bootstrap/recovery/rotation boundaries. Normal messages use session-generation keys.

## Cryptographic profile

Minimum V1 profile:

- root signature: Ed25519;
- session message signature: Ed25519;
- session key agreement: X25519;
- KDF: HKDF-SHA-256;
- message confidentiality/integrity: ChaCha20-Poly1305;
- canonical hashing: SHA-256 over canonical JSON bytes;
- transport confidentiality is mandatory even if application-layer AEAD is already present.

No algorithm agility is accepted inside one V1 session. Unknown algorithms fail closed.

## Persistent logical session and rotation

A `session_id` remains stable across automatic derived-key rotations.

Each generation contains:

- monotonic `generation`;
- current signing public key;
- current key-agreement public key;
- predecessor generation hash;
- activation sequence;
- rotation transcript hash.

Automatic rotation does not require root reauthentication when the current valid session generation signs the exact successor transition and the broker has not observed revocation, recovery, logout, policy-generation change, or another explicit root boundary.

A stale generation can authenticate only the exact rotation transition allowed by policy; it cannot continue issuing ordinary tasks after its successor is active.

## Message envelope

Every authenticated application message must bind at minimum:

- `protocol_marker`;
- `protocol_version`;
- `chain_id = 2050`;
- `office = Brood Queen`;
- `session_id`;
- `session_generation`;
- `direction`;
- `sequence`;
- `message_type`;
- `message_id`;
- `previous_message_hash`;
- `issued_at`;
- `expires_at`;
- `capabilities`;
- `payload_sha256`;
- `ciphertext_sha256`;
- `candidate_digest` when Apollyon participates;
- `context_sha256` when a local context generation participates;
- signature by the active session signing key.

Unknown authority-bearing fields fail closed.

## Task identity and ordering

A task is content-addressed:

`task_id = voidbqt1_ + sha256(canonical_task_without_task_id)`

The canonical task binds the exact logical session, generation, sequence, capabilities, payload digest, expiry, and policy generation.

V1 uses a single ordered task stream per session. Accepted task sequence must equal the next expected sequence. Duplicate delivery of an already accepted identical task returns the prior authoritative receipt/result. Reuse of a sequence number with different bytes is terminal conflict.

The broker must never silently reorder tasks.

## Authentication is not capability

Successful Crown session authentication proves only the authenticated Brood Queen session identity.

Every task carries an exact closed capability list. The broker independently intersects that list with the current broker policy before admission.

V1 activation begins with proposal/evidence capabilities only. Source writes, merges, deployment/restart, live runtime mutation, wallet/signer action, transactions, treasury/liquidity, Work Credit mutation, credential reading, and validator authority are not implicitly granted.

Validator capability is structurally absent from this broker contract. Unknown validator-like authority requests fail closed and require a separate Sovereign-governed instrument.

## Apollyon boundary

Apollyon is subordinate compute under Ren, not the authenticated Crown endpoint.

The broker may provide an admitted task plus selected local context to Apollyon only after the broker has validated the Crown session and capability envelope.

Apollyon receives no:

- root key;
- adapter/session private key;
- challenge-response secret;
- validator key or authority;
- wallet/signer credential;
- provider credential;
- raw private context beyond the admitted local context material needed for the task.

Apollyon output is data. The broker, not the model, constructs the authoritative result receipt.

## Private local context

The Ren semantic context pack remains local on Precision. It is not sent as a blob to a remote provider.

A result may bind the exact `context_sha256` used for local inference, but the receipt must not expose the private context bytes or local filesystem path.

## Durable task/result state machine

The minimum durable states are:

`RECEIVED -> ADMITTED -> EXECUTING -> RESULT_STAGED -> RESULT_PUBLISHED -> COMPLETE`

with fail-closed terminals:

`REJECTED`, `EXPIRED`, `REVOKED`, `SEQUENCE_CONFLICT`, `SESSION_STALE`, `POLICY_MISMATCH`, `RESULT_CONFLICT`.

Rules:

1. `RECEIVED` is not authority; signature/session/sequence/capability/expiry checks must pass before `ADMITTED`.
2. `ADMITTED` must be durably committed before inference begins.
3. V1 model inference is side-effect-free proposal/evidence work. `EXECUTING` may be retried after a crash only for the same immutable `task_id`.
4. The broker must durably write the exact result bytes/hash and provenance in `RESULT_STAGED` before any external publication.
5. Publication retry reuses the staged result; it does not re-run inference.
6. `COMPLETE` binds one authoritative result hash to one task id. A different result for the same completed task is `RESULT_CONFLICT`.
7. Durable state must distinguish an interrupted owned generation from a foreign/replacement state object before cleanup or recovery.

## Receipts

Every accepted task and result receives a content-addressed receipt binding:

- protocol marker/version;
- session id/generation;
- task id;
- message/sequence identity;
- exact capability list;
- policy generation;
- task payload digest;
- candidate digest if used;
- local context digest if used;
- result digest;
- terminal state;
- predecessor receipt hash;
- broker signature/public identity.

Receipts contain no secret key material and no private local path.

## Revocation and role revalidation

When Chain-2050 role/revocation binding is activated, the broker must revalidate canonical office state according to the active policy generation.

Explicit revocation, logout, root rotation, recovery, or policy-generation change invalidates all ordinary messages from prior session material. A session cannot use cached role truth to survive canonical revocation.

## Threat model and required behavior

### Compromised GitHub

GitHub is irrelevant to private-broker authentication. GitHub comments cannot authenticate a Crown session or generate a valid private-broker message.

### Replay / duplicate / delayed delivery

Exact duplicate task bytes return the prior receipt/result. Same sequence with different bytes fails terminally. Expired messages fail closed. Delayed messages cannot roll back generation or sequence state.

### Task/result substitution

Payload/result digests, task id, sequence, provenance, and signatures bind exact bytes. A substituted payload/result cannot retain the same authoritative identity.

### Stale session material

A stale generation cannot issue ordinary tasks after rotation or revocation.

### Model impersonation

Model text claiming to be Ren, the Sovereign, or an authenticated session is data only and does not satisfy broker authentication.

### Broker restart between execute/publication/state commit

The broker resumes from durable state. Once `RESULT_STAGED` exists, restart republishes the same bytes/hash and must not re-run inference to create a second authoritative result.

## Strongest V1 invariant

Before live activation, the implementation must prove:

> For any accepted `task_id`, across duplicate delivery, replay, session rotation, delayed delivery, broker crash/restart, result-publication retry, provider/model output, and hostile transport input, the broker can produce at most one authoritative completed result hash for that exact task identity; no accepted message can expand beyond its exact capability list; and no path grants validator authority or exposes Crown private material to model context.

Any counterexample is a release blocker.

## Current inactive boundary

This contract does not generate or activate a Crown key, adapter key, session, endpoint, daemon, firewall rule, TLS certificate, on-chain role binding, model authority, validator authority, wallet/signer action, deployment, restart, transaction, Work Credit mutation, treasury/liquidity action, or funds movement.
