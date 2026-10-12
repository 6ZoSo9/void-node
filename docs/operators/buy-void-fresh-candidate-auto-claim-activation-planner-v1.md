# Buy VOID fresh-candidate auto-claim activation planner V1

## Purpose

This lane converts the disabled production deployment, the current readiness
report, and the candidate-watch alert into a deterministic one-shot activation
plan.

It does not execute the plan.

## Waiting state

When readiness reports no eligible candidate, the planner returns
`status=waiting` and `reason=no_eligible_candidate`.

## Exact-one plan

A plan is emitted only when:

- readiness is currently `exact_one`;
- the recommended request is the only eligible request;
- the plan fingerprint is valid;
- the candidate-watch alert matches the current request and plan;
- the production config remains disabled at all three gates;
- disabled runtime health shows no apply, network, or runtime-write authority.

The plan allows at most one claim and requires
`buyVoidArmFreshCandidateAutoClaimOneShot`.

## Authority boundary

The planner has no authority to:

- rewrite the config;
- edit systemd units;
- start or restart services;
- supply `--apply`;
- make RPC calls;
- write the fulfillment claim;
- reserve or decrement inventory;
- access a wallet;
- sign or broadcast;
- move VOID.

The future activation executor must restore every temporary authority gate to
disabled after the single attempt, regardless of result.
