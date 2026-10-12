# Authenticated paid-work production activation execution confirmation v1

This lane defines the reviewed **source-only confirmation protocol** required before any future authenticated paid-work production activation execution.

Artifact: `ops/mainnet0/authenticated-paid-work-production-activation-execution-confirmation-v1.json`

Artifact SHA-256: `e2f6cecc52047931ce78445ef00c8eeba990a7f552a9b20efc93d6638f5809f6`

## Readiness effect

This source artifact closes only `activation_execution_confirmation`.

Production activation remains **HOLD**. The sole remaining source-readiness blocker is:

1. `live_canary_scope`

Publication does **not** issue or verify a live confirmation and does not authorize an activation attempt.

## Fresh operation-bound confirmation

A future execution lane must first produce a canonical execution plan and SHA-256 digest. Only then may ZoSo provide a fresh, interactive confirmation using this exact template:

`confirm-void-authenticated-paid-work-production-activation-v1:<operation_id>:<execution_plan_sha256>`

The confirmation:

- is case-sensitive UTF-8 with no trailing newline;
- is valid for a maximum 600 seconds;
- is bound to one operation, plan digest, main commit, target host, runtime user, reviewed artifacts, canary scope, and rollback destination;
- permits at most one attempt;
- cannot be inherited from an environment variable, passed on a command line, wildcarded, replayed, automated, or reused;
- must be invalidated by any drift, failure, rollback, or ambiguous outcome.

The template is public and is not itself authority. A fully substituted value must be supplied freshly by ZoSo after all preflight gates pass.

## Future execution boundary

A separately authored and separately authorized execution lane may perform only the ordered mutation allowlist in the artifact:

1. acquire the one-shot execution lease;
2. atomically replace the exact disabled configuration with the reviewed enabled instance;
3. create the exact owner-private empty activation root;
4. write the owner-private reference environment file;
5. write the reviewed static user service unit;
6. reload the user service manager;
7. start the service exactly once;
8. write a non-secret execution receipt.

Service enablement, automatic start, automatic restart, a second start, extra mutations, and automatic retry are forbidden.

The activation confirmation does not authorize quote acceptance, payment, dispatch, Work Credit writes, wallet or signer access, signing, settlement, transaction broadcast, or fund movement.

## Pre-confirmation gates

Before a live confirmation can be requested, the future execution lane must revalidate:

- exact current `main` and all reviewed artifact digests;
- the disabled runtime installation and exact disabled configuration preimage;
- an absent activation persistence root;
- absent service-unit and environment files;
- an inactive service and absent runtime listener;
- an absolute regular Node.js 22 executable;
- private trusted-context and credential references without printing them;
- the fresh-store bounded replay snapshot;
- the separately merged exact `live_canary_scope`;
- an owner-private non-symlink rollback receipt destination;
- no existing execution lease;
- no in-flight paid-work or economic state.

Any failure aborts before mutation.

## Rollback

Once the first mutation occurs, any drift, partial materialization, service-start failure, or ambiguous outcome enters the separately reviewed rollback plan. New paid-work ingress remains denied, automatic retry and reactivation remain forbidden, and a fresh plan plus fresh confirmation are required before any later attempt.

## Authority boundary

This publication creates source text only. It does not materialize an execution plan, issue or verify a live confirmation, write a lease, modify configuration, create the persistence root, write reference files or a service unit, reload systemd, start a service, read a trusted-context bundle, read credentials or tokens, deploy, activate, execute payment, dispatch work, write Work Credits, access a wallet or signer, sign, settle, broadcast a transaction, or move funds.

## Reviewed source provenance and dynamic execution-main binding

This repaired source contract is reviewed from source commit `03dd7f1966cc659b37cba7725ce284700030eed3`. Each of
the six dependencies retains its exact Git blob SHA-1 and SHA-256 digest.

The source artifact does **not** pin the future execution `main` commit. The
future execution plan must capture `origin/main` after all read-only preflight
gates, include that Git object ID in the canonical plan digest and operator
confirmation, revalidate it after confirmation, and revalidate it immediately
before the first mutation. Any change invalidates the confirmation and aborts
before mutation.
