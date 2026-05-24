# VOID Mainnet-0 Final Go/No-Go Map

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
launch_approval: true
mutation_allowed: true
mutation_allowed_scope: launch_state_public_surface_status_only
money_step: ops_seed_complete_future_spend_guarded
operator_label: zoso

## Current canonical baseline

- current_baseline_pointer_commit: 1cd3e15a
- current_baseline_pointer_tag: ckpt-candidate-only-validator-posture-clarity-green-20260523-083458
- baseline_pointer_file: ops/mainnet/mainnet0-current-baseline.current.md
- cross_box_proven: true

## What is green

- Precision node readiness is green.
- Alienware node readiness is green.
- Cross-box status smoke is green.
- Mainnet-0 current baseline pointer proof is green.
- Current baseline pointer now records 5a47a875 / ckpt-current-baseline-candidate-only-posture-green-20260523-085213 as the canonical rolling baseline.
- Product surface proof is green.
- DataNet tab proof is green.
- Participant DataNet E2E proof is green.
- Participant golden path proof is green.
- Remote product/network regression proof is green.
- WC trade remains non-mutating in product surface and is covered by separate WC stack proofs.
- Final checklist sections closeout doc preserves restored proof sections and supersedes fdfa1af5.
- Final path includes wallet-ui-cleanup-proof.
- Mainnet-0 status proof is green.
- Mainnet-0 blockers proof is green.
- Mainnet-0 final path proof is green.
- Mainnet-0 launch approval plan proof is green.
- Mainnet-0 final public launch checklist proof is green.
- Mainnet-0 public validator admission decision proof is green.
- Validator runtime truth is green through epoch127.
- Next guarded operator onboarding selector is vault126 / epoch128 / expectedValidatorCount=127.
- Public validator registration is candidate_or_waiting_only.
- Candidate-only validator posture clarity is current at 1cd3e15a / ckpt-candidate-only-validator-posture-clarity-green-20260523-083458.
- Public validator registration does not mutate the active validator set.
- Buy VOID watcher config is present and active config uses the current receiver.
- Historical Buy VOID latest-watch artifacts are lineage only unless the active config changes.

## Why Mainnet-0 is GO for public launch but still guarded

1. launch_approval is true through the committed launch approval artifact.
2. mutation_allowed is true only for launch-state/public-surface status promotion.
3. Public active validator admission remains disabled.
4. Public validator admission remains candidate_only_for_mainnet0.
5. Public validator promotion/admission remains blocked.
6. Next guarded operator onboarding for vault126 has not been live-executed.
7. Any future operator live-admission step requires a fresh guarded proof, exact operator intent, and explicit live-execution enablement.
8. OpsTreasury seed is complete and future treasury spend remains separately guarded.
9. Buy VOID claim/send remains explicit, payment-verified, and tx-ref-recorded.
10. No additional authority transfer is authorized.

Candidate-only public registration is the intended Mainnet-0 posture; the blocked action is public active validator promotion/admission.

## Required after GO

Before this can become GO, all of the following must be true:

1. mainnet0-current-baseline-proof passes on the intended launch commit.
2. mainnet0-status-smoke passes on Precision and Alienware.
3. mainnet0-crossbox-status-smoke passes.
4. mainnet0-status-proof passes.
5. mainnet0-blockers-proof passes.
6. mainnet0-final-path-proof passes.
7. mainnet0-launch-approval-plan-proof passes.
8. mainnet0-final-public-launch-checklist-proof passes.
9. mainnet0-public-validator-admission-decision-proof passes.
10. Any validator live-admission action is separately proof-gated and explicitly approved.
11. Public validator active admission remains disabled unless intentionally launched.
12. Buy VOID claim/send remains blocked unless explicitly verified and recorded.
13. Final public release hygiene remains green.
14. Fresh mainnet key ceremony and secure backups are explicitly confirmed before public launch.
15. A separate explicit launch approval artifact is written and proved.

## Current decision

GO_PUBLIC_MAINNET0.

VOID Mainnet-0 is public_mainnet0_live. Public active validator admission, vault126 onboarding, Buy VOID fulfillment, and additional treasury spend remain separately guarded.
