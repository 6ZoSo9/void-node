# Authenticated paid-work listener/cgroup operator collector v1

Marker: `VOID_AUTHENTICATED_PAID_WORK_RUNTIME_LISTENER_CGROUP_OPERATOR_COLLECTOR_V1`

## Evidence-integrity repair

The original draft enumerated only processes owned by the operator UID but
unconditionally claimed:

```text
socket_owner_scan_complete=true
listener_exclusive_to_expected_service_cgroup=true
```

That was broader than the collector's visibility. A process under another UID
can hold the same socket through inheritance, descriptor passing, or socket
activation and remain invisible to a same-UID FD scan.

The repaired collector requires an explicit mode and never converts bounded
visibility into global evidence.

## Fixed target

The collector accepts no caller-selected host, service, address, or port:

```text
host=zoso-Precision-Tower-7810
manager_scope=systemd_user
service=void-agent-paid-work-submission-receiver-v1.service
listener=tcp/ipv4/127.0.0.1:4187
confirmation=collect-authenticated-paid-work-runtime-listener-cgroup-evidence-v1
```

## Strong mode

Run with:

```bash
node tools/authenticated-paid-work-runtime-listener-cgroup-operator-collector-v1.mjs \
  --confirmation collect-authenticated-paid-work-runtime-listener-cgroup-evidence-v1 \
  --mode strong_all_visible \
  --output /owner-private/path/listener-cgroup-strong.json
```

Strong mode enumerates every numeric process visible in `/proc`, reads its UID,
and attempts to read every visible process FD namespace. It fails closed when
any selected FD namespace is incomplete or unreadable.

Only strong mode may emit the existing strong receipt with:

```text
socket_owner_scan_complete=true
listener_exclusive_to_expected_service_cgroup=true
listener_cgroup_binding_verified=true
decision=HOLD_PENDING_COMPOSED_RUNTIME_REVALIDATION
```

It does not use sudo or change host security policy to gain visibility.

## Bounded mode

Run with:

```bash
node tools/authenticated-paid-work-runtime-listener-cgroup-operator-collector-v1.mjs \
  --confirmation collect-authenticated-paid-work-runtime-listener-cgroup-evidence-v1 \
  --mode bounded_same_uid \
  --output /owner-private/path/listener-cgroup-bounded.json
```

Bounded mode enumerates the visible process universe but opens FD namespaces
only for processes with the operator UID. It requires the same-UID scan to be
complete and requires exactly one same-UID owner inside the service cgroup.

It emits the separately typed bounded receipt with:

```text
same_uid_socket_owner_scan_complete=true
cross_uid_socket_owner_scan_complete=false
socket_owner_scan_complete=false
listener_exclusive_to_expected_service_cgroup=false
listener_cgroup_binding_verified=false
decision=HOLD_PENDING_PRIVILEGED_CROSS_UID_OWNER_VERIFICATION_AND_COMPOSED_RUNTIME_REVALIDATION
```

Every visible cross-UID process is counted as an uninspected FD namespace.
Bounded mode remains incomplete even when no hidden holder was observed.

## Stable observation contract

Both modes require two equal complete snapshots of:

- systemd `ActiveState`, `MainPID`, and `ControlGroup`;
- complete cgroup-v2 `cgroup.procs` membership;
- every cgroup member PID, start-time ticks, and cgroup path;
- the exact TCP/IPv4 listener and socket inode;
- the mode-appropriate descriptor-owner set; and
- service and owner network-namespace inodes.

The collector rejects:

- wrapper or owner PID reuse;
- changed cgroup membership;
- changed listener inode or address;
- multiple owners within the selected visibility scope;
- an owner outside the service cgroup;
- wildcard or non-loopback listeners;
- any TCP/IPv6 listener on port 4187;
- a changed network namespace; and
- stale collection windows.

A systemd wrapper `MainPID` remains valid when a stable child inside the same
cgroup owns the listener.

## Read boundary

The real adapter reads only:

- `systemctl --user show`;
- cgroup-v2 `cgroup.procs`;
- `/proc/<pid>/status` for UID classification;
- `/proc/<pid>/stat`;
- `/proc/<pid>/cgroup`;
- `/proc/<main-pid>/net/tcp` and `tcp6`;
- selected `/proc/<pid>/fd` links; and
- `/proc/<pid>/ns/net` inode metadata.

It does not read process environments, command lines, executable contents,
credentials, raw tokens, registry contents, binding records, wallets, signers,
or authorization headers. It performs no network request.

## Hidden other-UID adversarial case

The focused proof includes a target-socket holder under another UID that is
absent from same-UID FD enumeration:

- bounded mode succeeds only as explicitly incomplete evidence and never opens
  the hidden process FD namespace;
- strong mode HOLDS when that FD namespace is unreadable; and
- strong mode rejects the snapshot when the hidden holder is readable because
  global ownership is not exclusive.

## Output

The output is created exclusively as an owner-controlled mode-0600 file below a
mode-0700 directory. Existing output is never overwritten.

This source PR does not run the collector. Runtime collection, privileged
cross-UID verification, composed runtime revalidation, replacement binding, and
all later live actions remain separate explicit gates.

## Authority boundary

The collector performs no service mutation or restart, sudo operation, procfs
or ptrace change, network request, credential access, registry or Work Credit
binding mutation, authentication, paid-work submission, quote acceptance,
payment, dispatch, Work Credit write, wallet or signer access, signing,
transaction construction or broadcast, deployment, or fund movement.
