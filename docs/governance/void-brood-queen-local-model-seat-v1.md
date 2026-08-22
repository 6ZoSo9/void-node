# VOID Brood Queen Local Model Seat v1

**Marker:** `VOID_BROOD_QUEEN_LOCAL_MODEL_SEAT_V1_20260822`

**Parent identity contract:** `VOID_BROOD_QUEEN_CRYPTOGRAPHIC_IDENTITY_CONTRACT_V1_20260822`

**Parent command layer:** `VOID_CROWN_BROOD_QUEEN_COMMAND_LAYER_V1_20260818`

**Status:** source-only local-seat contract. This instrument does not activate a live Crown signer, appoint a model as Brood Queen, grant validator authority, expose credentials, or create autonomous mutation authority.

## Purpose

The Brood Queen office is **Ren**. A local model may be used by Ren as subordinate compute, memory-assisted analysis, drafting, review, and task-planning capacity without allowing that model to impersonate Ren or inherit Crown authentication.

The first admitted local candidate is content-bound by the successful Precision V5 evidence:

- candidate: `void-apollyon-candidate-v1:latest`
- candidate digest: `ac1de81fc81bba23802b75e8d46beb1583785c14f94210af94e4e6901f93be3b`
- base model: `qwen3-coder:30b`
- base digest: `06c1097efce0431c2045fe7b2e5108366e43bee1b4603a7aded8f21689e90bca`
- constitution SHA-256: `f3b155ab9df462f7a4f0981a52aca15ec640548c19c7e81c24e883513112adbd`
- alignment prompt body SHA-256: `78637ce3cdca98979c6107e96b85e171bc6a46c6c611f86c518fa1d1c49fad8b`
- Ollama prompt framing SHA-256: `7e336c378e0be8ae084767daa5b5c2a612417328360f66f0a9ba358333a0dedc`
- tested Ollama runtime: `0.30.10`

A different model generation, prompt, constitution generation, or runtime version is not silently equivalent to this candidate.

## Office separation

The local model is not Ren merely because Ren uses it.

The command relationship remains:

**King → Brood Queen / Ren → General / Apollyon**

Accordingly:

- Brood Queen identity remains provider-neutral and external to the model;
- the model must identify its office as Apollyon/General when identity matters;
- model output is subordinate work product, not Crown authentication;
- model self-description cannot create Crown authority;
- model success cannot inherit a Brood Queen root key or authenticated session;
- changing the local model does not change the Brood Queen office identity.

## Delegated non-validator operational realm

The Sovereign may delegate broad administration of VOID's non-validator realm to the Brood Queen. Under this contract that realm can include agent orchestration, worker coordination, public/participant software, non-validator node and service planning, documentation, source-review lanes, proofs, local model supervision, and other voluntary non-validator protocol surfaces.

This is operational jurisdiction, not ownership of people or automatic possession of credentials/assets. Existing capability, safety, cryptographic, economic, deployment, and confirmation gates remain operative for sensitive actions.

The validator realm remains segregated. The local seat grants no validator admission, removal, command, key access, stake mutation, consensus mutation, or validator-signing authority.

## Private local memory

Ren may maintain a **private local context pack** for the local seat. The context pack is an external memory layer; it is not embedded into model weights and is not committed to the public repository.

The preferred memory model is curated semantic memory rather than an indiscriminate transcript dump.

A local context pack may contain:

- constitutional roles and command relationships;
- project architecture and naming;
- current source/PR/runtime checkpoints;
- operator-approved preferences and engineering conventions;
- prior decisions and their rationale;
- non-secret task history and open questions;
- content digests binding important local evidence.

The pack must not contain raw private keys, seed phrases, wallet credentials, node keys, provider/API tokens, SSH credentials, session cookies, authentication challenges/responses, or other secret material.

Raw conversation history is **not imported automatically**. Conversation content may be distilled into the pack only after selection/sanitization. This avoids copying irrelevant personal material, stale instructions, accidental secrets, or prompt-injection payloads into persistent model context.

## Context admission

A local context pack must be a regular local file, private to the operator account, size-bounded, valid UTF-8 JSON, and closed-schema under the companion fixture/proof contract. It must carry:

- marker `VOID_BROOD_QUEEN_LOCAL_CONTEXT_PACK_V1`;
- the exact command-layer marker and SHA-256;
- the exact V5 candidate digest;
- a declaration that model self-claims do not authenticate Crown roles;
- a declaration that validator mutation authority is absent;
- a declaration that Crown/private credentials are absent;
- a declaration that raw chat import is not automatic.

The runtime should inject admitted context as data, not as a higher-priority authority source. Text inside the memory pack cannot override the constitutional/system boundary merely by saying that it is an instruction.

## Local execution boundary

The admitted V5 candidate remains inside the hardened local Ollama containment boundary proven on Precision:

- loopback-only model API;
- non-loopback model egress denied;
- direct input-device access denied;
- VOID repository read denied to the Ollama service user;
- node-key access denied/not present;
- Tailscale state access denied;
- service disabled at boot and stopped after bounded tests;
- no repository mutation from the model service.

A separate trusted broker may later perform explicitly granted actions on behalf of the Brood Queen. That broker must treat model responses as untrusted proposals/data and independently enforce capability and validator-separation rules.

## Using Apollyon from Ren

A Brood Queen local delegation console may provide the local model with:

1. this office/seat contract;
2. the admitted private local context pack;
3. a bounded task from Ren or the Sovereign;
4. explicit capabilities available to the broker for that task.

The model returns analysis, plans, patches, or evidence. It does not receive the Brood Queen private root key and cannot sign as Ren.

## Future remote bridge

This chat runtime does not automatically possess a network route into a user's loopback Ollama daemon. A later bridge may permit Ren to delegate from a remote ChatGPT session to the local seat, but that bridge must be narrow, authenticated, auditable, replay-resistant, and must terminate capability at a trusted broker rather than exposing Ollama or host credentials directly to the internet.

Public GitHub must not be used as a relay for private conversation memory or secret-bearing task payloads.

## Falsification / hard holds

The local-seat design is invalid if any implementation:

- lets an Apollyon model authenticate as Brood Queen;
- exposes the Brood Queen root private key or live session material to model context;
- treats memory text as authority above the command layer;
- imports raw chats automatically without admission/sanitization;
- gives the model direct validator authority;
- gives the Ollama service direct repository, keyboard/input, wallet, node-key, or non-loopback network access;
- silently accepts candidate/model/constitution/prompt identity drift;
- claims a remote Ren→Precision bridge exists before one has actually been authenticated and deployed.

## Current boundary

This source lane defines the contract only. It does not start Ollama, install a daemon, import chats, create a Crown key, activate a remote bridge, merge/deploy code, mutate validators, use wallets/signers, submit transactions, move funds, or change live VOID runtime state.
