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
- Precision update-safety Prometheus timer is enabled and active.
- Update-safety metric is durable on Precision.
- Alienware is a follower/status-smoke box, not a Prometheus/node_exporter box.
- Validator runtime truth is green through epoch127.
- Next guarded operator onboarding candidate is vault126 for epoch128 / expectedValidatorCount=127.
- Public validator registration remains candidate/waiting only.
- Public validator promotion/admission remains blocked.
- Buy VOID first real fulfillment is closeout-proven.
- Future Buy VOID claim/send remains blocked unless explicitly verified and recorded.
- Ready signals are not launch approval.

## Remaining blockers before public Mainnet-0 launch

### 1. Public validator admission/promotion path

Public validator registration must not be described as active validator admission.

Before launch approval, the public validator path must prove:

- public registration creates candidate/waiting state only, or
- an intentional public promotion/admission lane is implemented, gated, and proven,
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
