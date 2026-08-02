# Authenticated paid-work production activation service-unit design v1

This lane defines and proves the `service_unit_design` activation prerequisite.
It closes only that blocker. Readiness remains **HOLD** with four blockers.

Artifact: `ops/mainnet0/authenticated-paid-work-production-activation-service-unit-design-v1.json`

Artifact SHA-256: `f37bcf3931579e13a76e7ab2d03e9d961260fa0e9ec95ca4507bd06e3df38b07`

## Service model

The reviewed unit is a **systemd user oneshot** named `void-authenticated-paid-work-runtime-v1.service`. It processes
one prepared command per explicit start and exits. It has no `[Install]`
section, no socket/timer/path companions, `Restart=no`, and
`RemainAfterExit=no`. This source lane creates no `.service` file.

## Runtime binding

The design binds the immutable release at `/home/zoso/.local/share/void-authenticated-paid-work-runtime-disabled-v1` and compiled entry
`/home/zoso/.local/share/void-authenticated-paid-work-runtime-disabled-v1/current/dist/scripts/authenticated_paid_work_quote_acceptance_payment_authority_activation_persistence_runtime_binding_v1.js`. `ExecStart` is rendered only after a separate activation
preflight resolves an absolute Node.js 22 executable. The private command and
trusted-context paths come from `VOID_AUTHENTICATED_PAID_WORK_RUNTIME_COMMAND_PATH` and `VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_TRUSTED_CONTEXT_PROVIDER_BINDING_BUNDLE_PATH`.
No private path or credential value is committed here.

## Rollback compatibility

Rollback denies ingress first, stops the unit, prevents automatic restart,
verifies `inactive/dead`, detaches private references without printing them,
and retains HOLD. Automatic reactivation remains forbidden.

## Remaining blockers

1. `credential_reference_metadata`
2. `bounded_replay_snapshot`
3. `activation_execution_confirmation`
4. `live_canary_scope`

## Verification

```bash
node --check scripts/prove_authenticated_paid_work_production_activation_service_unit_design_v1.mjs
node scripts/prove_authenticated_paid_work_production_activation_service_unit_design_v1.mjs
```

## Authority boundary

This source design does not create/install a unit or environment file, reload
systemd, enable/start/restart a service, create a listener, write activation
configuration, read trusted-context or credential material, execute payment,
dispatch work, write WC, access a wallet/signer, or move funds.
