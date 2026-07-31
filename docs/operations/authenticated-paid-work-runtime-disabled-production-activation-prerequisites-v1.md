# Authenticated paid-work disabled production runtime activation prerequisites v1

This lane validates the already-installed disabled production release and emits a private activation-prerequisite plan plus an operator **hold** decision.

It does not activate the runtime.

## Terminal decision

Even when every prerequisite in this contract is satisfied, the result is:

`prerequisites_satisfied_activation_forbidden_separate_execution_lane_required`

and the operator decision is:

`hold_activation_separate_execution_lane_required`

## Bound evidence

The contract verifies:

- exact current `main` and PR #894 merge identities;
- exact installation and install-mechanism checkpoint tags;
- owner-private install root and exact `current` release pointer;
- immutable release modes and every hash in `SHA256SUMS.txt`;
- disabled configuration with no persistence configuration;
- installer, execution, and final-seal receipt SHA-256 values;
- receipt markers, statuses, and `ready_for_activation=false`;
- absence of activation persistence, enabled configuration, and materialized service design.

## Required future artifacts

A later lane must separately define and review:

- activation configuration schema and instance;
- trusted-context reference metadata;
- credential reference metadata;
- bounded replay snapshot;
- service unit design;
- rollback plan;
- activation-execution confirmation;
- live-canary scope.

None of those future artifacts grants authority by itself.

## Authority boundary

The prerequisite contract never reads a credential or token, calls a trusted-context provider, materializes an authorization header, creates a service, restarts a service, creates a listener, mounts the runtime, accepts a quote, authorizes or executes payment, constructs or broadcasts a transaction, dispatches work, issues a ticket, writes Work Credits, accesses a wallet or signer, settles VOID, or moves funds.

The only optional writes are mode-600 private plan and hold-decision files beneath a newly created mode-700 output directory, guarded by the exact confirmation:

`reviewAuthenticatedPaidWorkDisabledRuntimeActivationPrerequisitesV1`
