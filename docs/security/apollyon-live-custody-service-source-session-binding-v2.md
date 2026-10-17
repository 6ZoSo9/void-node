# Apollyon live custody service source/session binding v2

Marker: `VOID_APOLLYON_LIVE_CUSTODY_SERVICE_SOURCE_SESSION_BINDING_V2`

Status: **pure source-only finalizer; no live observation by this module**.

## Purpose

This contract defines the exact output boundary the later installed live-session
runner must satisfy.

It accepts:

1. one exact current-V2 claim contract from #3043; and
2. one stable live custody-session evidence record produced while observing the
   exact same authorization/custody record through the reviewed current-stack
   custody launcher.

## Required session evidence

The live runner must bind and keep stable:

- retained state-root identity;
- retained `consumed/` directory identity;
- AF_UNIX socket inode identity;
- custody-service MainPID/start-time/source identity;
- clean loader environment;
- exact current-stack custody launcher blob
  `d23ff045d8c355401fed499c6bcffd503ba4c7fd`;
- authorization ID;
- custody generation ID;
- custody record SHA-256; and
- operator public-key fingerprint.

The authorization/custody identities must exactly equal those already carried by
the current-V2 claim contract.

## Result

Only after all bindings match may the finalizer report:

```text
live_service_source_identity_proven=true
same_live_custody_session_binding_proven=true
```

It still reports:

```text
durable_attempt_claim_performed=false
attempt_claimed=false
training_execution_authorized=false
training_execution_performed=false
candidate_weight_mutation_performed=false
```

The next gate is versioned:

`durable_candidate_training_attempt_claim_executor_v2`

This module performs no filesystem, network, service, key, wallet, signing,
transaction, trainer or funds action. The later installed runner must produce
the evidence; this contract only validates/finalizes it.
