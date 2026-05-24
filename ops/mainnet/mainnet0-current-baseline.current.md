# VOID Mainnet-0 Current Baseline Pointer

status: current_baseline_cross_box_proven
launch_state: public_mainnet0_live
mutation_allowed: true
mutation_allowed_scope: launch_state_public_surface_status_only
launch_approval: true
money_step: ops_seed_complete_future_spend_guarded

## Current canonical checkpoint

commit: 4c3aa800
tag: ckpt-mainnet0-public-launch-promotion-proof-green-20260524-071500
cross_box_proven: true

## Proven state

- Precision status smoke passed.
- Alienware status smoke passed.
- Precision cross-box status smoke passed.
- Mainnet-0 status proof passed.
- Mainnet-0 blockers proof passed.
- Mainnet-0 final path proof passed.
- Final path Wallet doc refresh is cross-box proven.
- Final path includes wallet-ui-cleanup-proof.
- Wallet setup path and advanced send-action cleanup are proof-guarded.
- Mainnet-0 launch approval plan proof passed.
- Mainnet-0 final public launch checklist proof passed.
- Final checklist sections closeout doc is cross-box proven.
- Final public launch checklist records restored proof sections and supersedes the weakened fdfa1af5 checkpoint.
- Final checklist preserves update-safety Prometheus-or-fallback, launch approval plan proof, and fail-closed go/no-go Prometheus-or-fallback sections.
- Mainnet-0 public validator admission decision proof passed.
- Product surface proof is cross-box proven.
- Settings drawer/top Settings/Escape-close UI checkpoint is cross-box proven.
- Public validator candidate-only posture is cross-box proven.
- Candidate-only validator posture clarity checkpoint is current at 1cd3e15a / ckpt-candidate-only-validator-posture-clarity-green-20260523-083458.
- Final public launch checklist validator candidate posture is cross-box proven.
- Launch approval artifact prep is cross-box proven and plan-only/not-approved.
- DataNet tab proof is green.
- Participant DataNet E2E proof is green.
- Participant golden path proof is green.
- Remote product/network regression proof is green.
- WC trade remains non-mutating in product surface and is covered by separate WC stack proofs.
- WC devnet local-state runtime is cross-box proven at e0637a17 / ckpt-wc-devnet-local-state-runtime-green-20260523-081804; per-machine WC deploy addresses live under .runtime/mainnet0/wc-devnet-local/current and tracked WC state files stay clean.

## Locked public launch posture

- Mainnet-0 is public_mainnet0_live.
- Launch approval is true.
- Mutation allowed is limited to launch-state/public-surface status promotion.
- Public validator admission remains candidate_only_for_mainnet0.
- Public active validator admission remains disabled.
- Public registration remains candidate_or_waiting_only.
- Public registration does not mutate the active validator set.
- Next operator candidate remains vault126 / epoch128 / expectedValidatorCount=127.
- Wallet setup, Send Local WC, and Send VOID cleanup remain proof-guarded.
- OpsTreasury seed money step is complete; future treasury spend remains separately guarded.

## Historical references

Older baseline refs in status, blockers, final path, and launch approval docs are lineage references unless this file says otherwise.

This file is the canonical rolling pointer for the current proven Mainnet-0 baseline.
