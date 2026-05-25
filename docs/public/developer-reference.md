# VOID Mainnet-0 Developer Reference

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260525-022500

current_public_status_checkpoint: 9bf3ca86 / ckpt-current-public-status-public-docs-stack-green-20260524-211134
public_docs_stack_checkpoint: 791d6f4a / ckpt-mainnet0-public-docs-stack-green-20260524-175137

## Purpose

This document is a public technical reference for developers, node operators, and builders who want to understand the Mainnet-0 public surface.

It documents public/local routes, readiness checks, proof targets, docs entry points, and guarded operational boundaries.

It does not authorize validator admission, treasury spend, Buy VOID fulfillment, authority transfer, or any live mutation.

## Public status

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

The canonical public docs stack is proven by:

    make mainnet0-public-docs-stack-proof

The current public status is proven by:

    make mainnet0-current-public-status-proof

## Local node base URL

Default local node URL:

    http://127.0.0.1:4100

Participant page:

    http://127.0.0.1:4100/participant

## Readiness endpoint

Readiness endpoint:

    /__void/ready.json

Full local URL:

    http://127.0.0.1:4100/__void/ready.json

Healthy Mainnet-0 readiness should show:

    ready=true
    gap=0
    txroot_live=1

Example check:

    curl -fsS http://127.0.0.1:4100/__void/ready.json

## Public docs entry points

Start here:

    docs/public/start-here.md

Current public status:

    docs/public/mainnet0-current-public-status.md

Quick-start:

    docs/public/quick-start.md

Windows WSL2 quick-start:

    docs/public/windows-wsl2-quick-start.md

FAQ:

    docs/public/mainnet0-faq.md

Whitepaper:

    docs/public/void-network-whitepaper.md

Support runbook:

    docs/public/support-runbook.md

Run-a-node guide:

    docs/public/run-a-node.md

Participant onboarding:

    docs/public/participant-onboarding.md

## Important proof targets

Full public docs stack:

    make mainnet0-public-docs-stack-proof

Current public status:

    make mainnet0-current-public-status-proof

Start-here page:

    make mainnet0-start-here-proof

Public FAQ:

    make mainnet0-public-faq-proof

Whitepaper:

    make mainnet0-whitepaper-proof

Quick-start:

    make mainnet0-quick-start-proof

Windows WSL2 quick-start:

    make mainnet0-windows-wsl2-quick-start-proof

Support runbook:

    make mainnet0-support-runbook-proof

Status smoke:

    make mainnet0-status-smoke

Cross-box status smoke:

    make mainnet0-crossbox-status-smoke

## Runtime truth and validator posture

Mainnet-0 validator posture remains conservative.

Public active validator admission remains disabled.

Public validator registration remains candidate/waiting only.

Public registration does not instantly make a validator active.

Vault126 onboarding has not been executed.

The guarded operator selector remains:

    vault126 / epoch128 / expectedValidatorCount=127

This selector is not public active admission and has not been live-executed.

## Buy VOID posture

Buy VOID remains guarded.

Payment confirmation does not equal VOID sent.

VOID fulfillment requires explicit payment verification and a recorded VOID transaction reference.

Do not send blind deposits.

Do not use unsupported exchange/custodial send paths where the participant flow warns against them.

## Treasury posture

OpsTreasury has been seeded with 1,000,000 VOID.

Future treasury spend remains separately guarded.

Public launch status does not authorize additional treasury spend.

Future treasury movement requires its own proof lane, dry-run, signer check, broadcast transaction, transaction record, balance proof, and closeout artifact.

## DataNet posture

DataNet is the off-chain data layer.

The intended model is:

- store bulk data off-chain
- encrypt data by default
- index or commit compact proofs on-chain
- allow public data when the user chooses
- use receipts and commitments for verifiable operations

Large raw files should not be stored directly on-chain.

## Work Credits posture

Work Credits are intended for accepted, useful, verifiable work.

They are not awarded for button clicks alone.

They are not awarded for nonsense tasks.

They require accepted receipts.

## Security and support boundary

Do not ask users for secrets.

Do not ask users to share:

- wallet secrets
- private keys
- seed phrases
- mnemonic phrases
- passphrases
- keystore files
- wallet files
- .env files
- screenshots containing secret material

Use the public support runbook for troubleshooting:

    docs/public/support-runbook.md

## Developer expectations

Developers should assume Mainnet-0 is early.

Safe developer work should focus on:

- reading public docs
- running a local node
- checking readiness
- opening the participant page
- building against documented local/public surfaces
- using proof targets before claiming status
- preserving guarded mutation boundaries

Developers should not assume:

- public active validator admission is open
- Buy VOID payment confirmation automatically sends VOID
- treasury spend is authorized
- authority transfer is authorized
- public docs authorize live mutation

## Current public summary

VOID Mainnet-0 is live.

Public onboarding is open.

Public active validator admission, vault126 execution, Buy VOID fulfillment, and future treasury spend remain guarded by separate proof lanes.
