# VOID Network Mainnet-0 public share posts

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
base_checkpoint: da55e010 / ckpt-current-status-public-launch-share-checklist-pointer-green-20260603-135414
base_closeout: /tmp/current-status-public-launch-share-checklist-pointer-crossbox-closeout-20260603-140310.log
checklist_doc: docs/public/mainnet0-public-launch-share-checklist.md
summary_doc: docs/public/mainnet0-public-release-status-summary.md
participant_entry: /participant

## Purpose

Use these templates for Reddit, X/Twitter, Discord, GitHub announcements, and public onboarding replies.

Every public post should point users through the safe path:

README -> public release status summary -> participant page -> guided actions only

## Required footer

Safe path: start from the README, read the public release status summary, then use the participant page. Guided actions only. No blind deposits. Payment confirmation is not VOID fulfillment. Public validator registration is candidate/waiting only.

## Reddit post template

VOID Network Mainnet-0 is public-live.

The public surface is open for people who want to run a node, open the participant page, create or unlock an Account Wallet, earn WC through approved useful work, use DataNet publish/read/verify flows, create a guided Buy VOID request, and preview validator candidate/waiting status.

The important part: we are keeping the first-user path guarded instead of pretending everything is automatic.

Safe now:
- Run a VOID node.
- Set up or unlock an Account Wallet.
- Earn WC through approved useful work.
- Use DataNet publish/read/verify flows.
- Create a guided Buy VOID request from the participant page.
- Preview staking and validator candidate/waiting status.

Guarded:
- Buy VOID payment confirmation is not VOID fulfillment.
- VOID delivery requires operator verification and an explicit recorded VOID tx ref.
- Wallet sends and WC-to-VOID swaps require explicit unlock/sign confirmation.
- Public validator registration is candidate/waiting only.
- Active validator admission remains capped, proof-backed, and operator-governed.
- Blind deposits, exchange sends, and custodial sends are not supported.

The public trust-boundary stack is green, and the public launch/share checklist is now part of current public status.

Safe path: start from the README, read the public release status summary, then use the participant page. Guided actions only. No blind deposits. Payment confirmation is not VOID fulfillment. Public validator registration is candidate/waiting only.

## X/Twitter short post

VOID Network Mainnet-0 is public-live.

Run a node, open the participant page, set up Wallet, earn WC, use DataNet, create guided Buy VOID requests, and preview validator candidate/waiting status.

Guided actions only. No blind deposits. Payment confirmation is not VOID fulfillment.

## X/Twitter thread template

1/ VOID Network Mainnet-0 is public-live.

The public path is open for node running, participant page access, Account Wallet setup, WC earning, DataNet, guided Buy VOID request creation, and validator candidate/waiting previews.

2/ We are keeping the first-user path explicit and guarded.

Start from the README, read the public release status summary, then use the participant page. Guided actions only.

3/ Safe now:
Wallet setup, Earn WC, DataNet, guided Buy VOID request creation, and staking preview.

Guarded:
VOID delivery, wallet sends, WC-to-VOID swaps, and active validator admission.

4/ No blind deposits.

Buy VOID payment confirmation is not VOID fulfillment. VOID delivery requires operator verification and an explicit recorded VOID tx ref.

5/ Public validator registration is candidate/waiting only.

Active validator admission remains capped, proof-backed, and operator-governed.

## Discord / community reply template

VOID Network Mainnet-0 is public-live.

Start with the README, then read the public release status summary, then open the participant page. The safe path is guided actions only.

You can run a node, set up Wallet, earn WC, use DataNet, create a guided Buy VOID request, and preview staking/candidate status.

Do not send blind deposits. Do not use exchange or custodial sends. Payment confirmation is not VOID fulfillment. Public validator registration is candidate/waiting only.

## GitHub announcement template

VOID Network Mainnet-0 public-live status is now documented through the public release status summary and public launch/share checklist.

Current safe path:

README -> docs/public/README.md -> docs/public/mainnet0-public-release-status-summary.md -> /participant

The public trust-boundary stack remains green. Public posts and onboarding replies should keep users on guided actions only, with no blind deposits and no claim that payment confirmation equals VOID fulfillment.

## Do not include in public posts

- Profit promises.
- Price predictions.
- Claims that unsupported exchange/custodial sending paths are allowed.
- Claims that payment confirmation itself completes fulfillment.
- Claims that public validator registration makes someone an active validator.
- Requests for blind deposits.
- Private keys, seed phrases, secrets, operator-only routes, or authority material.

## Proof-backed safety line

public_launch_share_checklist: green
public_release_summary_discoverability: green
public_trust_boundary_stack: green
safe_path: README_to_summary_to_participant_to_guided_actions_only
required_warnings: true
do_not_say_guardrails: true
buy_void_fulfillment: false
validator_mutation: false
public_active_validator_admission: disabled
public_validator_registration: candidate_waiting_only
runtime_ready: true
runtime_gap: 0
txroot_live: 1
