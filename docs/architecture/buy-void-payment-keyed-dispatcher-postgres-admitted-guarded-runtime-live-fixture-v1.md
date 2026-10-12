# Buy VOID admitted PostgreSQL guarded runtime live fixture v1

Marker:
`VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_LIVE_FIXTURE_V1_GREEN`

Status: CI-only positive composition qualification. This gate does not mount a
runtime route, mutate a production service, read a production wallet credential,
contact Chain-2050, broadcast a transaction, or move funds.

## Purpose

The merged admitted PostgreSQL guarded-runtime boundary already proves its
fail-closed pre-credential paths and statically binds the canonical production
connection factory, exact read-only schema admission, and bounded
guarded-broadcast worker.

This gate closes the deferred positive fixture requirement with real local
dependencies:

1. PostgreSQL 16;
2. a local CA and CA-signed PostgreSQL server certificate;
3. the exact production `verify-full` client policy with TLS server name
   `localhost`;
4. systemd-style mode-`0400` password and CA credential files below
   `/run/credentials`;
5. the exact least-privilege dispatcher database, roles, schema, constraints,
   indexes, ACLs, and owner relationship; and
6. the merged production composition entrypoint.

## Positive boundary

The proof requires all of the following to be observed from the real
composition call:

- full-runtime server policy is configured;
- PostgreSQL credentials were read;
- live TLS PostgreSQL schema admission completed;
- schema admission remained read-only;
- the guarded worker was entered;
- the factory close path completed;
- no broadcast was attempted or accepted; and
- no money movement occurred or may have occurred.

The worker intentionally stops on missing local preparation custody. The fixture
does not create that custody because this gate is proving connection/admission
composition, not signing or execution. The merged production source already
binds the same admitted factory Pool into the worker call; its focused proof
continues to guard that structural identity.

## Defense in depth

The workflow deliberately does not create
`buy-void-native-fulfillment-wallet-v1` in the credential directory.

The configured Chain-2050 RPC URL points at an unserved loopback port. The
expected worker hold occurs before dependency bootstrap, signer access, RPC,
submission guard, or broadcaster access. The proof explicitly requires
`dependency_bootstrap_performed=false`.

The PostgreSQL password and CA are disposable CI fixtures. No production
credential content enters the workflow.

## Non-authority

This qualification does not authorize or perform:

- runtime route/startup/timer/service mounting;
- production database provisioning;
- production credential access;
- wallet or signer access;
- raw signed transaction persistence;
- Chain-2050 RPC activity;
- submission-guard claim;
- transaction broadcast;
- inventory or Work Credit mutation;
- public fulfillment closeout;
- deployment or service restart; or
- funds movement.

A later runtime-mount proposal remains a separate operator-authorized gate.
