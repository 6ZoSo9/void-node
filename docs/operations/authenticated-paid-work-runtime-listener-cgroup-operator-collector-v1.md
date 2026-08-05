# Authenticated paid-work runtime listener cgroup operator collector v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_OPERATOR_COLLECTOR_V1`

## Purpose

The merged listener/cgroup binding contract validates a supplied sanitized
receipt, but it intentionally does not inspect a host. This collector supplies
the missing operator-side read-only evidence path for Precision.

It addresses the concrete failure seen during runtime revalidation: systemd's
`MainPID` may be a wrapper while the TCP listener belongs to another process in
the same user-service cgroup. The collector therefore verifies the complete
service cgroup and binds the listener to its actual owning process rather than
requiring the listener to belong directly to `MainPID`.

## Fixed target

The collector accepts no caller-selected service or port. It fixes:

```text
host=zoso-Precision-Tower-7810
manager_scope=systemd_user
service=void-agent-paid-work-submission-receiver-v1.service
protocol=tcp
listener=127.0.0.1:4187
```

A later operator run requires the exact confirmation:

```text
collect-authenticated-paid-work-runtime-listener-cgroup-evidence-v1
```

## Read-only evidence sources

The real adapter reads only bounded metadata from:

- `systemctl --user show` for `ActiveState`, `MainPID`, and `ControlGroup`;
- the service's cgroup-v2 `cgroup.procs` file;
- `/proc/<pid>/stat` for process start-time ticks;
- `/proc/<pid>/cgroup` for service membership;
- `/proc/<main-pid>/net/tcp` and `tcp6` for target-port listeners;
- `/proc/<pid>/fd` symbolic links for same-UID socket ownership; and
- `/proc/<pid>/ns/net` inode metadata for network-namespace binding.

The control-group path is never included in the receipt. Only its SHA-256 is
retained.

The collector does not read a service environment, process environment,
command line, executable bytes, token, credential registry, binding registry,
private bundle, wallet, signer, or authorization header. It does not contact the
receiver or any network endpoint.

## Stable snapshot requirements

The collector fails closed unless all of the following remain stable across two
reads:

- systemd active state, main PID, and control group;
- complete cgroup PID membership;
- every cgroup member's process start time and cgroup membership;
- the exact target listener socket;
- the same-UID socket-owner set; and
- service and listener network-namespace inodes.

It requires exactly one TCP/IPv4 listener on port `4187`, exact loopback address
`127.0.0.1`, no TCP/IPv6 listener on that port, socket ownership by the operator
UID, and exactly one same-UID owner process. That owner must be one of the stable
service-cgroup members. A wrapper `MainPID` is valid when a stable child process
inside the same cgroup owns the listener.

The same-UID ownership scan is complete for processes visible to the operator.
The receipt remains unsigned and reports
`producer_authentication_established=false`; it does not convert OS metadata
into cryptographic host or wall-clock authentication.

## Output

The collector passes the sanitized input into the merged
`buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(...)` builder and
reruns the merged validator. The result is the existing content-addressed
`voidapwrlcb1_...` receipt.

An optional output is created exclusively as a direct owner-controlled mode-600
file beneath a direct mode-700 directory. Existing output is never overwritten.
The collector does not print or place the private output path in the receipt.

The only valid decision remains:

```text
HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION
```

A valid listener/cgroup receipt does not establish replacement-credential
validity, trusted context, replay state, producer authentication, complete
runtime revalidation, or execution authority.

## Source-only boundary

This pull request does not run the collector. It performs no host inspection,
service mutation, restart, network request, credential access, token read,
registry write, binding retirement or creation, authentication, paid-work
submission, quote acceptance, payment, work dispatch, Work Credit write, wallet
or signer access, signing, transaction construction or broadcast, deployment,
or fund movement.

Running the collector on Precision, merging its evidence into composed runtime
revalidation, materializing a canonical issuance request, generating private
credential material on Nimo, and every later live action remain separate gates.
