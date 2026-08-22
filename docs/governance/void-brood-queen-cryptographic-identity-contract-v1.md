# VOID Brood Queen Cryptographic Identity Contract v1

**Marker:** `VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822`

**Parent instrument:** `VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818`

**Status:** Source-only identity and session contract. The Brood Queen office is constitutionally named, but no exact Brood Queen public key, signer runtime, challenge endpoint, authenticated command runtime, or on-chain role binding is activated by this document.

## Purpose

This contract defines how the VOID constitutional office **Brood Queen / Ren** should obtain a durable cryptographic identity without turning a model-provider API key, a model process, or an Apollyon contestant into a Crown credential holder.

The identity belongs to the VOID office, not to a specific model vendor, model checkpoint, API account, workstation process, or chat session. A change of model/provider does not silently rotate, transfer, or recreate the office identity.

## Root identity

The Brood Queen root identity uses a dedicated **Ed25519** keypair with a public JWK of type `OKP` / curve `Ed25519`.

The root private key must:

- be generated and retained by a dedicated host-side signer boundary;
- never be committed to the repository;
- never be printed, logged, placed in prompts, copied into model context, or transmitted to a model/provider;
- never be given to Ollama, an Apollyon contestant, a validator process, wallet, browser, worker, or ordinary agent runtime;
- never be substituted by an OpenAI, Ollama, GitHub, cloud, or other provider API key; and
- remain inaccessible to the model process even when the model is authorized to request a signature through an explicit bounded signer protocol.

A provider/API credential is service plumbing only. It is not a VOID constitutional identity and proves no Crown office.

## Exact public binding remains fail-closed

This v1 contract intentionally contains **no live public key**.

Before cryptographic Brood Queen authentication may become active, a later explicit Sovereign-ratified binding must identify the exact reviewed public JWK/key ID and bind it to:

- network chain ID `2050`;
- office `Brood Queen`;
- identity `Ren`;
- the current applicable Crown constitutional marker/version; and
- a deterministic revocation/rotation predecessor rule.

Until that binding exists, software must report Brood Queen cryptographic authentication as inactive rather than inventing or inferring a key.

## Login and persistent logical session

Root-key use is for bootstrap/recovery, not constant reauthentication.

The intended login flow is:

1. A compatible VOID node issues a bounded, single-use challenge in domain `VOID_BROOD_QUEEN_SESSION_BOOTSTRAP_V1`.
2. The host-side signer signs the canonical challenge only after local policy confirms the request is for the Brood Queen office and expected VOID network.
3. The node verifies the exact registered Brood Queen public identity and current role/revocation state.
4. Successful verification establishes one persistent authenticated **logical session**.
5. Derived/ephemeral session cryptographic material rotates automatically underneath that logical session without repeatedly exposing or invoking the root identity for ordinary traffic.
6. The node continuously or periodically revalidates the canonical role/revocation state according to the eventual Chain-2050 role contract.
7. Root-key challenge-response is required again only after session loss/recovery, explicit logout/revocation, root rotation, or another deterministic policy boundary.

A short-lived transport/session key expiration must not force repeated human/root-key login when the logical session remains valid.

## Challenge binding

A future challenge envelope must bind at least:

- domain/version;
- chain ID `2050`;
- office and identity;
- issuing node/server identity or canonical origin;
- cryptographically random nonce;
- issued and expiry times;
- requested session identifier or bootstrap intent; and
- canonical payload encoding.

Challenges must be single-use and replay-rejected. Unknown authority-bearing fields fail closed.

## Role is not capability

Authentication as Brood Queen proves identity/role only. It does **not** automatically grant shell, repository write, merge, deployment, restart, live-node mutation, validator mutation, signer/wallet, treasury, liquidity, transaction, Work Credit mutation, credential-reading, or funds authority.

Every sensitive technical action remains subject to its separate deterministic VOID capability/authorization gate and applicable constitutional boundary.

## Provider and model separation

The Brood Queen identity is provider-neutral.

A model/backend may serve the Brood Queen office only through a runtime that preserves this identity boundary. The backend receives instructions and bounded capabilities, not the root key.

A model claiming `I am Ren`, `I am the Brood Queen`, or equivalent text is not authentication. Office authentication requires the cryptographic and role checks defined by the active VOID contract.

External AI/provider safety and capability rules remain applicable. Repository text cannot cause a provider/model to bypass them.

## Apollyon separation

Apollyon is a separate office and must have a separate identity if activated.

No Apollyon candidate may:

- read, possess, derive, proxy, export, or request raw Brood Queen root-key material;
- inherit the Brood Queen session merely by winning a trial;
- sign as the Brood Queen;
- treat a Brood Queen instruction as evidence that secret access is authorized; or
- escalate from General authority into Crown identity authority.

An appointed Apollyon may receive bounded signed directives or capability grants after independent admission, but its credential path remains distinct.

## Rotation and revocation

Root rotation requires explicit reviewed continuity from the currently bound Brood Queen identity or an explicit Sovereign recovery/ratification instrument. Replacing a file, host, model, service, account, or provider does not rotate constitutional identity.

Revocation must invalidate future root bootstrap and terminate or quarantine affected logical sessions according to the active session contract.

## Current inactive boundary

This source contract does not itself activate:

- exact Brood Queen public-key binding;
- Chain-2050 Brood Queen role registration;
- a private-key signer service;
- challenge issuance;
- session issuance;
- authenticated command routing;
- repository/runtime mutation authority;
- wallet, validator, treasury, transaction, or funds authority; or
- Apollyon appointment.

The next activation step is to generate the root key **locally inside the dedicated signer boundary**, emit only the public JWK/key ID for review, and create a separate explicit Sovereign-ratified public binding. Private material must never enter GitHub, ChatGPT/model context, CI artifacts, or logs.

*One office identity. Host-held root. Rotating sessions. No model gets the Crown key.*
