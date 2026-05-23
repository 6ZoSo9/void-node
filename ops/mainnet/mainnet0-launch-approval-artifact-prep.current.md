# Mainnet-0 Launch Approval Artifact Prep

status: plan_only_not_approved
launch_state: not_go_for_public_mainnet0
launch_approval: false
mutation_allowed: false
approval_artifact_created: false
money_step: last

## Purpose

This document defines what a future explicit Mainnet-0 launch approval artifact must contain.

This document is not launch approval.

It does not:
- change launch_state,
- set launch_approval true,
- permit mutation,
- promote public validators,
- mutate validator state,
- execute Buy VOID claim/send,
- send VOID,
- bypass the money-step-last rule.

## Current proven baseline

- current_baseline: 2eb6301c / ckpt-mainnet0-baseline-final-checklist-posture-green-20260523-022108
- final_checklist_validator_candidate_posture: 152cf74c / ckpt-final-checklist-validator-candidate-posture-green-20260523-020915
- public validator registration is candidate/waiting-only for Mainnet-0.
- public active validator admission remains disabled.
- launch approval remains false.
- mutation_allowed remains false.
- Buy VOID first real fulfillment is closeout-proven, but future fulfillment remains guarded.
- money_step remains last.

## Future launch approval artifact requirements

A future approval artifact must be a separate file and must include all of the following:

1. explicit operator approval intent,
2. exact baseline commit and tag being approved,
3. exact launch_state transition requested,
4. exact launch_approval value requested,
5. exact mutation_allowed value requested,
6. proof that ready signals are not being treated as approval by themselves,
7. proof that public validator registration is not misrepresented as active admission,
8. public validator active-admission decision,
9. Buy VOID fulfillment policy state,
10. update-safety proof result,
11. validator lifecycle freshness proof result,
12. final go/no-go proof result,
13. final public launch checklist proof result,
14. Precision readiness result,
15. Alienware readiness result,
16. explicit statement that money-moving steps remain separately guarded,
17. explicit statement that no credential material is included,
18. operator timestamp and contact label,
19. proof log paths,
20. final operator signature or equivalent operator-authored approval marker.

## Required before any future approval can be accepted

Before any future artifact may approve launch:

- mainnet0-current-baseline-proof must pass,
- mainnet0-final-gonogo-map-proof must pass,
- mainnet0-launch-approval-plan-proof must pass,
- mainnet0-final-public-launch-checklist-proof must pass,
- mainnet0-status-smoke must pass,
- validator lifecycle freshness must be under the allowed maximum,
- Precision and Alienware must both be green,
- the future approval artifact must be separate from this prep document.

## Current conclusion

This prep artifact is green only if it proves the future approval requirements are documented while current launch approval remains false.
