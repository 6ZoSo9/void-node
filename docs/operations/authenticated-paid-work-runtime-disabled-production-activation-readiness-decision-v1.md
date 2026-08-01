# Authenticated paid-work disabled production activation readiness decision v1

This lane converts the exact PR #906 prerequisite evidence-composition receipt into a deterministic, read-only activation-readiness decision.

The current decision is **HOLD**.

## Why HOLD is the only valid v1 result

PR #899 explicitly left nine required future artifacts outside its authority. PR #906 independently cross-bound the Git/checkpoint evidence, but it did not create or semantically validate those artifacts. Integrity evidence for the disabled installation is not activation authorization.

The decision therefore lists these blockers exactly:

1. activation configuration schema;
2. activation configuration instance;
3. trusted-context reference metadata;
4. credential reference metadata;
5. bounded replay snapshot;
6. service unit design;
7. rollback plan;
8. activation-execution confirmation;
9. live-canary scope.

Each blocker must be defined and semantically proven by later source lanes. An opaque filename or digest is insufficient.

## Input contract

The CLI accepts one mode-0600, executing-user-owned, regular JSON file:

    node tools/void-authenticated-paid-work-runtime-disabled-production-activation-readiness-decision-v1.mjs \
      --evidence-composition /private/path/evidence-composition.json

It validates the complete PR #906 result shape, production constants, independent-observer provenance, all gates, and the read-only execution boundary. Unknown keys, widened authority, production-binding drift, and symlinked or broadly readable inputs fail closed.

The optional `--evaluated-at-utc` argument exists for deterministic proofs.

## Output contract

The result binds the canonical SHA-256 of the validated composition receipt, its operation ID, observed main commit, PR #899 merge, and PR #902 repair merge. It emits:

- `decision: "HOLD"`;
- `ready: false`;
- the exact nine blockers;
- `ready_for_activation: false`;
- `separate_activation_execution_lane_required: true`.

## Authority boundary

This tool reads one private evidence file and writes only its JSON result to standard output. It does not run Git, make network requests, write inputs, deploy, write activation configuration, read credentials or tokens, create listeners, restart services, dispatch work, execute payment, write Work Credits, access wallets or signers, or move funds.
