# Authenticated paid-work runtime listener/cgroup evidence v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_BINDING_V1`

## Purpose

This contract binds the fixed Precision paid-work receiver listener to a stable
systemd user-service cgroup snapshot. It distinguishes two evidence classes
instead of treating an unprivileged same-UID scan as proof of global descriptor
ownership.

The fixed target remains:

```text
host=zoso-Precision-Tower-7810
manager_scope=systemd_user
service=void-agent-paid-work-submission-receiver-v1.service
listener=tcp/ipv4/127.0.0.1:4187
```

Both evidence classes are content-addressed with the existing
`voidapwrlcb1_...` prefix. The original strong receipt shape and committed
fixture remain valid and retain their prior receipt ID.

## Strong all-visible-process binding

`buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1(...)` remains the
strong builder. It accepts the original ownership shape only when the supplied
snapshot proves:

- one exact loopback TCP/IPv4 listener;
- no wildcard, non-loopback, or IPv6 target listener;
- complete target-port socket-table accounting;
- complete descriptor-owner accounting across every visible process;
- one stable owning process;
- stable owner PID and process start-time identity;
- owner membership in the exact service cgroup;
- matching service and listener network namespaces; and
- exclusivity of the listener to the expected service cgroup.

A strong receipt requires:

```text
socket_owner_scan_complete=true
listener_exclusive_to_expected_service_cgroup=true
listener_cgroup_binding_verified=true
decision=HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION
```

The contract does not define how an operator obtains all-UID visibility. A
collector must fail closed when any visible process FD namespace is unreadable.

## Bounded same-UID observation

`buildAuthenticatedPaidWorkRuntimeListenerCgroupBoundedObservationV1(...)`
creates a separately typed bounded receipt. It can prove that one stable
same-UID owner holds the socket and belongs to the service cgroup, while
explicitly declining global completeness and exclusivity.

A bounded receipt requires:

```text
status=sanitized_same_uid_listener_binding_incomplete_cross_uid_authority
visibility_scope=same_uid_only
same_uid_socket_owner_scan_complete=true
cross_uid_socket_owner_scan_complete=false
socket_owner_scan_complete=false
listener_owner_within_service_cgroup=true
listener_exclusive_to_expected_service_cgroup=false
listener_cgroup_binding_verified=false
decision=HOLD_PENDING_PRIVILEGED_CROSS_UID_OWNER_VERIFICATION_AND_COMPOSED_RUNTIME_REVALIDATION
```

It also records visible, same-UID, cross-UID, and deliberately uninspected
cross-UID process counts. The complete visible-process count must partition
exactly into same-UID and cross-UID counts, and every cross-UID FD namespace
must remain represented as uninspected.

A bounded receipt is useful diagnostic evidence, but it cannot satisfy the
strong listener/cgroup gate or be relabeled into strong evidence.

## Shared safety boundary

Both modes require all safety fields false, including:

- service mutation;
- credential or raw-token access;
- private-path disclosure;
- network requests or live authentication;
- paid-work submission;
- quote, payment, dispatch, or Work Credit activity;
- wallet or signer access;
- signing or transaction activity; and
- fund movement.

Both modes also require these decision fields false:

```text
producer_authentication_established=false
current_runtime_state_established=false
complete_runtime_revalidation_established=false
replacement_credential_validity_established=false
trusted_context_binding_established=false
execution_authorized=false
```

Only the strong receipt may set
`listener_cgroup_binding_verified=true`.

## Validation APIs

The compatibility-preserving strong APIs remain:

```text
buildAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1
validateAuthenticatedPaidWorkRuntimeListenerCgroupBindingV1
```

The bounded APIs are:

```text
buildAuthenticatedPaidWorkRuntimeListenerCgroupBoundedObservationV1
validateAuthenticatedPaidWorkRuntimeListenerCgroupBoundedObservationV1
```

`validateAuthenticatedPaidWorkRuntimeListenerCgroupEvidenceV1(...)` dispatches
only between the two exact status values and rejects unknown receipt classes.

## Adversarial requirement

A process under another UID may inherit or receive the same listening socket
descriptor. A same-UID enumerator cannot see that holder. Therefore:

- a bounded collector must not inspect or fabricate the hidden holder and must
  emit only the incomplete bounded class; and
- a strong collector must HOLD if the other-UID FD namespace is unreadable and
  must reject the snapshot if a readable other-UID holder is discovered.

Synthetic tests that return a "foreign" process through a same-UID enumerator
are insufficient and do not satisfy this requirement.

## Operational boundary

This source contract does not inspect a host, use sudo, alter procfs or ptrace
settings, restart a service, access credentials, write a registry or binding,
authenticate, submit paid work, accept or execute payment, write Work Credits,
access a wallet or signer, broadcast a transaction, deploy, or move funds.
