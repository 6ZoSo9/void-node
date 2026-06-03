# VOID Network Mainnet-0 public release status summary

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
current_checkpoint: 569789bb / ckpt-current-status-public-trust-boundary-stack-pointer-green-20260603-123811
public_trust_boundary_stack_checkpoint: ckpt-public-trust-boundary-stack-proof-green-20260603-123044
public_trust_boundary_stack_closeout: /tmp/public-trust-boundary-stack-proof-crossbox-closeout-20260603-123437.log
current_status_stack_pointer_closeout: /tmp/current-status-public-trust-boundary-stack-pointer-crossbox-closeout-20260603-124052.log

## What is safe now

- Run a VOID node.
- Open the participant page.
- Set up or unlock an Account Wallet.
- Earn WC through approved useful work.
- Use DataNet publish/read/verify flows.
- Create a guided Buy VOID request from the participant page.
- Preview staking and validator candidate/waiting status.
- Read public docs, launch notes, whitepaper, and onboarding guides.

## What is guarded

- Buy VOID payment confirmation is not VOID fulfillment.
- VOID delivery requires operator verification and an explicit recorded VOID tx ref.
- Wallet sends and WC-to-VOID swaps require explicit unlock/sign confirmation.
- Public validator registration is candidate/waiting only.
- Active validator admission remains capped, proof-backed, and operator-governed.
- Treasury spend and authority changes remain separately guarded.
- Blind deposits, exchange sends, and custodial sends are not supported.

## Proof stack green

The current public status now points to the reusable public trust-boundary stack proof. That stack verifies:

- current public status pointer
- public first-60 user journey trust-boundary requirement
- participant first-screen trust-boundary marker and copy
- public onboarding docs trust-boundary copy
- public onboarding pack
- status smoke
- no Buy VOID fulfillment
- no validator mutation

## Participant trust boundary

Safe now: Wallet setup, Earn WC, DataNet, and guided Buy VOID request creation.

Guarded: VOID delivery, wallet swaps, sends, and active validator admission require explicit unlock/sign, operator verification, or proof-backed gates.

No blind deposits.

## Current safety line

buy_void_fulfillment: false
validator_mutation: false
public_active_validator_admission: disabled
public_validator_registration: candidate_waiting_only
runtime_ready: true
runtime_gap: 0
txroot_live: 1

## User-facing summary

VOID Network Mainnet-0 is public-live. The participant surface is open for wallet setup, earning WC, DataNet, guided Buy VOID request creation, and staking previews. The money-moving and validator-active paths remain guarded by explicit proof gates. Users should start from the participant page, use self-custody wallets, avoid blind deposits, and verify every guided step before taking action.
