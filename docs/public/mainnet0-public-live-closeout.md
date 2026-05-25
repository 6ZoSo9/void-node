# VOID Mainnet-0 Public Live Closeout

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260525-103500

current_public_status_checkpoint: ae513217 / ckpt-current-public-status-public-surface-green-20260525-102802

## Purpose

This document records the current public live baseline for VOID Mainnet-0.

It is a closeout marker for the public-facing Mainnet-0 surface, documentation stack, served participant surface, and readiness gates.

It does not authorize validator admission, treasury spend, Buy VOID fulfillment, authority transfer, or any additional live mutation.

## Public live baseline

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

The public baseline includes:

- current public status
- public docs stack
- public served surface
- developer reference
- start-here guide
- quick-start guide
- Windows WSL2 quick-start guide
- public FAQ
- support runbook
- whitepaper
- participant page
- readiness endpoint
- validator-truth status endpoint

## Served public surface

The public served surface is intentionally narrow.

Served:

- /participant
- /__void/ready.json
- /__void/runtime/validator-truth/status

Not public:

- /
- /__void/status
- GET /__void/participant/stake/next-onboard

## Guarded boundaries

The following remain guarded and are not authorized by this closeout:

- public active validator admission
- operator validator admission mutation
- vault126 onboarding execution
- treasury spend
- Buy VOID fulfillment
- authority transfer
- private key generation
- seed phrase handling
- secret collection from users

Public validator registration remains candidate/waiting only for Mainnet-0.

## Proof targets

The public live closeout is proven by:

    make mainnet0-public-live-closeout-proof

The proof chains through:

    make mainnet0-current-public-status-proof
    make mainnet0-public-docs-stack-proof
    make mainnet0-public-surface-proof
    make mainnet0-status-smoke

Cross-box closeout should additionally run:

    make mainnet0-crossbox-status-smoke

## Expected readiness

A healthy local node returns:

    ready=true
    gap=0
    txroot_live=1

from:

    http://127.0.0.1:4100/__void/ready.json
