# Authenticated paid-work runtime listener cgroup binding v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_BINDING_V1`

## Problem

The existing authenticated paid-work runtime-revalidation receipt requires the
receiver to be active and loopback-only, but a port-level observation alone does
not establish that the process owning `127.0.0.1:4187` belongs to the reviewed
systemd user service. A stale, unrelated, or substituted process could own the
same port while a superficial health and listener check still looked plausible.

This contract closes the source-side relationship between:

- the exact systemd user service and its reported main process;
- the complete sanitized service cgroup membership snapshot;
- the listener owner process identity, including process start time;
- the target socket inode;
- the service and listener network namespace inode; and
- the absence of wildcard, non-loopback, or foreign listeners on target port
  `4187`.

It is designed as a future companion for replacement-credential runtime
revalidation. It does not replace the runtime-revalidation receipt, trusted
context binding, credential validity/revocation checks, replay-state checks, or
producer authentication.

## Exact target

The verifier fixes the expected target to:

```text
host=zoso-Precision-Tower-7810
manager_scope=systemd_user
service=void-agent-paid-work-submission-receiver-v1.service
protocol=tcp
address_family=ipv4
listener=127.0.0.1:4187
```

No arbitrary host, service, address, port, protocol, or manager scope is
accepted.

## Sanitized evidence model

The builder accepts only a descriptor-only JSON-domain input snapshot. The
merged PR #972 closed-input guard rejects proxies, accessors, custom prototypes,
symbols, hidden fields, sparse arrays, cycles, shared references, non-JSON
values, and resource-bound violations before semantic validation.

The service evidence requires:

- an active service;
- a positive main PID and process start-time tick value;
- one SHA-256 fingerprint for the manager-reported control-group path;
- a complete, bounded, strictly PID-sorted cgroup process list;
- every member bound to the same cgroup-path fingerprint; and
- the exact main PID and start time present in that member list.

The listener evidence requires exactly one target-port listener with:

- local address `127.0.0.1`;
- port `4187`;
- TCP/IPv4 state `LISTEN`;
- a positive socket inode;
- an owner PID present in the service cgroup;
- an owner start-time tick matching the cgroup process record;
- the same cgroup-path fingerprint; and
- the same network namespace inode as the service.

The accompanying ownership summary must state that target-port and socket-owner
scans were complete, all target listeners were accounted for, and no wildcard,
non-loopback, or foreign listener was detected.

## Content address

The complete sanitized receipt is content-addressed as:

```text
voidapwrlcb1_<sha256(canonical JSON without receipt_id)>
```

Canonical object keys use explicit code-unit ordering through the existing
canonical JSON function. The content address detects byte-level substitution,
but is not a signature and does not authenticate the evidence producer.

## Decision boundary

A valid receipt reports:

```text
sanitized_listener_snapshot_contract_validated=true
listener_cgroup_binding_verified=true
producer_authentication_established=false
current_runtime_state_established=false
complete_runtime_revalidation_established=false
replacement_credential_validity_established=false
trusted_context_binding_established=false
execution_authorized=false
status=HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION
```

This distinction is mandatory. A structurally and relationally valid sanitized
snapshot does not independently prove that it came from Precision, that its
clock is authentic, that it is current beyond the supplied relative-time
window, or that the future replacement credential is valid and loaded.

## Adversarial verification

The focused proof rejects:

- target service substitution;
- a main PID absent from the cgroup snapshot;
- a listener owner outside the service cgroup;
- PID reuse or owner process-start substitution;
- wildcard and non-loopback listener addresses;
- more than one target-port listener;
- service/listener network namespace mismatch;
- listener cgroup fingerprint substitution;
- member cgroup fingerprint substitution;
- unsorted or duplicate cgroup PIDs;
- a foreign-listener claim;
- a false target-port count;
- stale relative-time evidence;
- any credential-access claim;
- unknown input fields;
- root proxies before any proxy trap executes;
- accessor-backed input before any getter executes; and
- receipt-ID tampering.

Expected proof marker:

```text
VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_BINDING_V1_PROOF_GREEN
```

## Operational truth

This package validates supplied sanitized evidence only. It does not inspect a
host, read `/proc`, query systemd, enumerate sockets, contact the receiver,
access a credential or private path, mutate a service, restart anything,
authenticate, submit paid work, accept a quote, execute payment, dispatch work,
write Work Credits, access a wallet or signer, sign, construct or broadcast a
transaction, deploy, or move funds.

A separately reviewed operator survey must collect the actual evidence. A later
composed runtime-revalidation lane must authenticate or otherwise trust the
evidence source, bind the replacement credential and registry, verify trusted
context and replay state, and preserve fresh ZoSo confirmation before any live
paid-work action.
