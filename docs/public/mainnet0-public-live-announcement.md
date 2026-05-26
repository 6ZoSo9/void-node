# VOID Mainnet-0 Public Live Announcement

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260525-132000

current_public_status_checkpoint: e5f6a8a4 / ckpt-current-public-status-public-live-closeout-green-20260525-130102
public_live_closeout_checkpoint: 4180224d / ckpt-mainnet0-public-live-closeout-green-20260525-110841

## Summary

VOID Mainnet-0 is public-live.

This means the public participant surface, node readiness path, public documentation stack, developer reference, support runbook, quick-start guides, and public live closeout proof are available and cross-box proven.

Mainnet-0 is intentionally early. It is real network infrastructure, but it keeps dangerous or money-moving actions guarded.

## What is live

The current public Mainnet-0 baseline includes:

- public participant page
- local node readiness endpoint
- validator-truth status endpoint
- public documentation stack
- start-here guide
- Linux quick-start guide
- Windows WSL2 quick-start guide
- developer reference
- support runbook
- FAQ
- whitepaper
- public live closeout proof
- cross-box Precision and Alienware runtime proof

## What remains guarded

The following are not open public actions:

- public active validator admission
- operator validator admission mutation
- vault126 onboarding execution
- treasury spend
- Buy VOID fulfillment
- authority transfer
- private key generation for users
- collecting secrets from users

Public validator registration remains candidate/waiting only for Mainnet-0.

## Public routes

Served:

- /participant
- /__void/ready.json
- /__void/runtime/validator-truth/status

Not public:

- /
- /__void/status
- GET /__void/participant/stake/next-onboard

## Proof

The current public status is proven by:

    make mainnet0-current-public-status-proof

The public live closeout is proven by:

    make mainnet0-public-live-closeout-proof

The public docs stack is proven by:

    make mainnet0-public-docs-stack-proof

The public served surface is proven by:

    make mainnet0-public-surface-proof

Cross-box runtime truth is proven by:

    make mainnet0-crossbox-status-smoke

## Public wording

Safe short wording:

VOID Mainnet-0 is public-live. The participant surface, docs stack, quick-start guides, developer reference, support runbook, readiness endpoint, and validator-truth status endpoint are live and cross-box proven. Public active validator admission, treasury spend, Buy VOID fulfillment, and authority transfer remain guarded.
