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
- clean observed loader environment;
- exact root-owned custody service unit generation
  `359488ba482f87f9015e85c1f9f5026edd4dcbee`;
- fixed systemd fragment path `/etc/systemd/system/void-apollyon-authorization-custody-v1.service` with no drop-ins;
- systemd pre-exec environment sanitization that removes
  `NODE_OPTIONS`, `NODE_PATH`, `LD_PRELOAD`, and `LD_LIBRARY_PATH`
  before Node is executed;
- one exact systemd InvocationID bound to the observed MainPID environment;
- exact current-stack custody launcher blob
  `d23ff045d8c355401fed499c6bcffd503ba4c7fd`;
- authorization ID;
- custody generation ID;
- custody record SHA-256; and
- operator public-key fingerprint.

The authorization/custody identities must exactly equal those already carried by
the current-V2 claim contract.

A post-start clean `/proc/<pid>/environ` observation is **not sufficient by
itself**. The live runner must also bind the exact service-manager exec boundary:
the root-owned unit blob above, fixed fragment path, no drop-ins, and matching
systemd InvocationID. This prevents a caller-supplied
`loader_environment_clean:true` from being promoted without evidence that the
service manager removed loader/Node injection variables before `execve`.

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
