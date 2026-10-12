# VOID Mainnet-0 Validator Registration / Waiting Pool v1

Status: locked design direction
Scope: minimal safe pre-Mainnet-0 implementation

## Problem

The current validator runtime truth path proves that active validators can be onboarded and published into verified epoch manifests, but the path gets heavier as the active validator count rises. Mainnet-0 must not let public registration instantly expand the live active validator set or runtime manifests.

## Locked rule

Public validator registration does not equal active validator admission.

Users may register as validator candidates / waiting validators, but only a bounded active set participates in live runtime truth, epoch manifests, proposer schedules, and consensus duties.

## Mainnet-0 launch posture

- Initial active validators are primarily the bootstrap/operator validator set.
- Public users can register from day one.
- Registered public validators enter candidate/waiting/eligible state.
- Active validator set remains capped.
- Activation is epoch-based and churn-limited.
- Waiting validators must not bloat or brick active validator manifests.
- Waiting validators may later participate as workers/builders/watchers before active validator admission.

## Required states

- CANDIDATE: registered but not yet eligible/accepted for active admission.
- WAITING: eligible and queued for active validator admission.
- ACTIVE: included in active validator runtime truth for a specific epoch.
- EXITING: scheduled to leave active/waiting status.
- JAILED: penalized or blocked due to bad behavior/downtime.
- UNBONDED: no longer participating.

## Minimal Mainnet-0 feature set

1. Register validator candidate.
2. Lock/stake minimum validator amount.
3. Record validator metadata:
   - owner address
   - reward address
   - consensus pubkey or validator identity
   - optional worker endpoint / metadata URI
   - stake amount
   - state
   - registered epoch/block timestamp
4. Maintain active validator cap.
5. Maintain activation churn limit.
6. Prove public registration does not alter current active runtime truth.
7. Add participant-page UI entry point for stake/register/status.
8. Add proof script showing:
   - candidate registration works
   - candidate count can increase
   - active validator count does not increase automatically
   - runtime truth latest epoch remains unchanged until explicit activation
   - activation moves only a bounded number from waiting to active

## Deferred until after Mainnet-0

- Full worker/builder registry
- Rotating validator committees
- Temporary aggregators/leads
- Worker challenge/slashing
- Data availability sampling
- Large Merkle-rooted validator queue proofs
- Fully automated public active-set selection

## Non-negotiable safety invariant

For any public registration transaction:

activeValidatorCountAfter == activeValidatorCountBefore

unless the transaction is an explicit governance/operator/epoch activation step that respects the active cap and churn limit.
