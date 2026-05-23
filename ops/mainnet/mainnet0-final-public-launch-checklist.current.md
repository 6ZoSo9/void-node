# VOID Mainnet-0 Final Public Launch Checklist

status: not_go_for_public_mainnet0
mutation_allowed: false
launch_approval: false
money_step: last

## Current known-good baseline

- Mainnet-0 NO-GO proof is green.
- Mainnet-0 status proof is green.
- Mainnet-0 status smoke is green.
- Mainnet-0 cross-box status smoke is green.
- Mainnet-0 baseline product-surface refresh is cross-box proven at 21f4357b / ckpt-mainnet0-baseline-product-surface-refresh-green-20260522-082010.
- Final go/no-go map now records product surface/DataNet golden path as the canonical rolling baseline.
- Current baseline pointer now records 5a47a875 / ckpt-current-baseline-candidate-only-posture-green-20260523-085213.
- Final path Wallet doc refresh is cross-box proven at 5d39ab41 / ckpt-final-path-wallet-doc-refresh-green-20260521-114305.
- Final path includes wallet-ui-cleanup-proof.
- Final checklist proof sections restored is cross-box proven at 1b4ad771 / ckpt-final-checklist-proof-sections-restored-green-20260521-193346.
- Launch approval plan now records product surface/DataNet golden path as the current proven baseline.
- Product surface proof, DataNet tab proof, participant DataNet E2E proof, participant golden path proof, and remote product/network regression proof are green.
- fdfa1af5 remains superseded because that checkpoint weakened the embedded checklist proof.
- Final checklist now preserves update-safety Prometheus-or-fallback, launch approval plan proof, and fail-closed go/no-go Prometheus-or-fallback sections.
- Precision update-safety Prometheus timer is enabled and active.
- Update-safety metric is durable on Precision.
- Alienware is a follower/status-smoke box, not a Prometheus/node_exporter box.
- Validator runtime truth is green through epoch127.
- Next guarded operator onboarding candidate is vault126 for epoch128 / expectedValidatorCount=127.
- Public validator registration remains candidate/waiting only.
- Public validator admission decision is locked candidate-only for Mainnet-0.
- Public validator promotion/admission remains blocked.
- Buy VOID first real fulfillment is closeout-proven.
- Future Buy VOID claim/send remains blocked unless explicitly verified and recorded.
- Public release export is gitleaks-clean at 72f536d0 / ckpt-public-release-export-gitleaks-clean-green-20260523-091412 with gitleaks_rc=0 and findings=0.
- Ready signals are not launch approval.
- Launch approval plan is proof-backed and still not approved.

## Remaining blockers before public Mainnet-0 launch

### 1. Public validator candidate-only launch posture

Public validator registration must not be described as active validator admission.

Before launch approval, the public validator path must preserve the candidate-only Mainnet-0 posture:

- public registration creates candidate/waiting state only,
- active public promotion/admission remains disabled for Mainnet-0 unless a later explicit launch-approved lane changes it,
- active validator admission remains capped,
- epoch-controlled admission remains enforced,
- operator/public roles are clearly separated,
- cross-box status remains green after any change.

### 2. Final launch approval

Launch approval must be explicit.

Before changing launch_state away from not_go_for_public_mainnet0:

- rerun mainnet0-gonogo-no-go-proof,
- rerun mainnet0-status-proof,
- rerun mainnet0-blockers-proof,
- rerun mainnet0-final-path-proof,
- rerun public release sanitization,
- rerun cross-box status smoke,
- prove update-safety freshness on Precision,
- write an explicit launch approval artifact,
- only then run the final go/no-go bundle intentionally.

### 3. Money step remains last

No additional Buy VOID claim/send or money-moving step clears launch by itself.

Payment confirmation does not equal VOID sent.
VOID fulfillment must remain an explicit, auditable transition.

## Non-goals of this checkpoint

This checkpoint does not:

- execute vault126 onboarding,
- mutate validator state,
- approve public validator promotion,
- approve public Mainnet-0 launch,
- execute Buy VOID claim/send,
- change launch_state.
