# VOID Mainnet-0 FAQ

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260524-105500

current_public_status_checkpoint: eb01fe8e / ckpt-root-readme-current-public-status-green-20260524-104733
whitepaper_checkpoint: 9067695b / ckpt-mainnet0-whitepaper-v1-green-20260524-102511
public_release_bundle_checkpoint: 2865819a / ckpt-public-release-bundle-whitepaper-green-20260524-103149

## What is VOID Network?

VOID Network is a verifiable data, compute, and participant network.

It is built around local nodes, participant wallets, proof-backed operations, DataNet storage, Work Credits, validator runtime truth, and public release hygiene.

## Is VOID Mainnet-0 live?

Yes.

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

That means the public launch status, docs, whitepaper, release bundle, and onboarding path are live and proof-backed.

## Is everything fully open?

No.

Mainnet-0 is intentionally conservative.

The public status is live, but some high-risk lanes remain guarded:

- Public active validator admission remains disabled.
- Public validator registration remains candidate/waiting only.
- Vault126 onboarding has not been executed.
- Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
- Future treasury spend remains separately guarded.
- No additional authority transfer is authorized by public launch status.

## Where should I start?

Start here:

    docs/public/README.md

For the current public status:

    docs/public/mainnet0-current-public-status.md

For technical details:

    docs/public/void-network-whitepaper.md

To run a node:

    docs/public/run-a-node.md

For participant onboarding:

    docs/public/participant-onboarding.md

## How do I run a node?

Read:

    docs/public/run-a-node.md

The basic path is:

    git clone https://github.com/6ZoSo9/void-node.git
    cd void-node
    npm install
    npm run build

Then verify readiness:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

A healthy node should report:

- ready = true
- gap = 0
- txroot_live = 1

## Where is the participant page?

From a running local node:

    http://127.0.0.1:4100/participant

## Can I become a validator right now?

You can follow the public candidate/waiting posture, but public active validator admission remains disabled.

Public registration does not instantly make you an active validator.

The current guarded operator selector remains:

    vault126 / epoch128 / expectedValidatorCount=127

That selector has not been live-executed.

## Why is public active validator admission disabled?

Because Mainnet-0 is a real public launch state, but still early.

Validator active admission affects consensus and safety. It must be opened through a separate proof-backed lane, not casually through public launch docs.

## Can I buy VOID?

Buy VOID is guarded.

Use only the supported participant flow. Do not send blind deposits. Do not send from unsupported exchange or custodial paths where the participant page warns against them.

Payment confirmation does not equal VOID sent.

VOID fulfillment requires explicit payment verification and a recorded VOID transaction reference.

## Is the treasury open for spending?

No.

OpsTreasury was seeded with 1,000,000 VOID for Mainnet-0 operations.

Future treasury spend remains separately guarded and requires its own proof lane: dry-run, signer check, broadcast, transaction record, balance proof, and closeout artifact.

## What are Work Credits?

Work Credits are intended for accepted, useful, verifiable work.

They are not awarded for button clicks alone. They are not awarded for nonsense tasks. They require accepted receipts.

The long-term plan is for Work Credits to support useful network work, DataNet operations, and future wallet-integrated economics.

## What is DataNet?

DataNet is the off-chain data layer.

The intended model is:

- store bulk data off-chain,
- encrypt data by default,
- index or commit compact proofs on-chain,
- allow public data when the user chooses,
- use receipts and commitments for verifiable operations.

Large raw files should not be stored directly on-chain.

## What is VPod?

VPod is the longer-term storage behavior concept for DataNet.

Data should shift like water based on demand, availability, redundancy, and policy. More useful or demanded data should become more available; stale or over-replicated data can be reduced.

## What is Obelisk Agent?

Obelisk Agent is the planned wallet-operated oracle/agent concept.

The wallet can eventually compress data, encrypt data, upload data off-chain, commit roots on-chain, sign actions, and return proofs/results to VOID contracts.

## Is VOID an AI project?

VOID is AI-ready infrastructure, not just an AI chatbot.

The goal is to give AI systems and human users verifiable data, receipts, commitments, Work Credit flows, wallet-operated agents, and DataNet storage.

## Is this financial advice?

No.

VOID documentation is technical and informational. It is not financial advice, not a promise of profit, and not an offer to sell securities.

## What are the biggest risks?

VOID is early.

Risks include:

- solo/bootstrap operator risk,
- bugs,
- validator centralization during Mainnet-0,
- user wallet mistakes,
- Buy VOID payment mistakes,
- infrastructure outages,
- security vulnerabilities,
- regulatory uncertainty,
- insufficient adoption.

Mainnet-0 keeps high-risk lanes guarded while public onboarding begins.

## What is the correct public summary?

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

Public onboarding is open.

Public active validator admission, vault126 execution, Buy VOID fulfillment, and future treasury spend remain guarded by separate proof lanes.
