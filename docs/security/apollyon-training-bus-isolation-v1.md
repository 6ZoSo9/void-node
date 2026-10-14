# Apollyon training system-bus isolation v1

Marker: `VOID_APOLLYON_TRAINING_BUS_ISOLATION_V1`

Status: **source-only launch/runtime isolation primitive; not installed and not live**.

## Purpose

Current Apollyon V2 custody policy intentionally HOLDs because process and D-Bus
endpoint observations cannot prove that a training process did not inherit, or
later receive, a pre-authenticated system-bus descriptor.

This lane defines the missing execution boundary without weakening that HOLD.

It is authored as a stacked successor to the current V2 service-control lane.
It does not modify the V2 collector or classifier. A later composition must
consume live evidence from this boundary before V2 may set:

```text
inherited_system_bus_descriptor_absence_proven=true
absolute_runtime_service_control_denial_proven=true
```

## Reviewed source generation

The boundary consists of two security-critical source artifacts:

```text
ops/xiphos/void-apollyon-training-bus-isolation-v1.service
  Git blob bafdd73dea00a516b6d9fd186898ad6aa7be7bce

ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c
  Git blob 9503d19c8bc0b4f073ba117f6a547d339b7623d0
```

The service is not installed by this PR.

## Launch-time descriptor boundary

The reviewed service starts only:

```text
/opt/void-apollyon-training-bus-isolation-v1/
apollyon_training_bus_isolation_preentry_v1
```

as dedicated non-root user/group `voidapollyontrain`.

The native pre-entry:

1. rejects root/set-id execution and identity transitions;
2. requires the fixed future training entrypoint and its retained ancestors to
   be root-owned and non-group/world-writable;
3. sets and rechecks `PR_SET_NO_NEW_PRIVS`;
4. executes Linux `close_range(3, UINT_MAX, CLOSE_RANGE_UNSHARE)`;
5. proves no descriptor >= 3 survived except its temporary census descriptor;
6. executes exactly the fixed training entrypoint with `execve()`, without a
   shell, PATH lookup, caller-selected executable, or caller-selected argv.

This is designed to erase socket-activation, fd-store, or other inherited
descriptors immediately before the training executable begins.

## Lifetime acquisition boundary

The exact service source then applies the same policy to the entire service
cgroup:

```text
PrivateNetwork=yes
RestrictAddressFamilies=none
SystemCallArchitectures=native
SystemCallFilter=@system-service
SystemCallFilter=~socket socketpair connect accept accept4 bind listen
                 sendto recvfrom sendmsg recvmsg sendmmsg recvmmsg
                 pidfd_getfd io_uring_setup io_uring_enter io_uring_register
SystemCallErrorNumber=EPERM
```

The source additionally requires:

- empty capability bounding and ambient sets;
- `NoNewPrivileges=yes`;
- `StandardInput=null`;
- journal-only stdout/stderr;
- `FileDescriptorStoreMax=0`;
- no `Sockets=`, `OpenFile=`, `PAMName=`, `PassEnvironment=`, or
  `EnvironmentFile=` directive;
- `RestrictNamespaces=yes`;
- `RestrictSUIDSGID=yes`;
- `ProtectProc=invisible` and `ProcSubset=pid`;
- strict system/kernel/cgroup filesystem protections; and
- only the declared training output directory writable.

The explicit syscall deny set complements `RestrictAddressFamilies=none` by
also denying `socketpair`, descriptor passing via send/recv message syscalls,
`pidfd_getfd`, and io_uring entry points.

## Deliberate non-claims

Source proof does **not** establish that Xiphos has this unit installed, that
the future training executable exists, that the installed native binary matches
this reviewed C source, or that systemd actually enforced this policy during a
training process.

A source-green result therefore remains:

```text
unit_install_performed=false
service_start_performed=false
training_execution=false
attempt_claim=false
live_systemd_enforcement_proven=false
installed_preentry_binary_identity_proven=false
inherited_system_bus_descriptor_absence_proven=false
```

The existing V2 fail-closed service-control result must remain unchanged until
a separate installed/live qualification proves those missing facts.

## Focused proof

```bash
python3 -m py_compile scripts/prove_apollyon_training_bus_isolation_v1.py
python3 scripts/prove_apollyon_training_bus_isolation_v1.py
```

The proof:

- pins both exact Git blobs;
- parses and closes the service directive set;
- rejects AF_UNIX, fd-store, and alternate-ABI weakenings;
- forbids socket/fd ambient-input directives;
- compiles the native pre-entry with strict warnings;
- runs its disposable `--self-test`;
- proves `close_range(..., CLOSE_RANGE_UNSHARE)`, no-new-privileges, and
  setuid/setgid rejection.

## Next gate

`installed_apollyon_training_bus_isolation_qualification_v1`

That later gate must be separately authorized because it requires host
installation/observation. It must bind the installed unit and pre-entry binary
to reviewed bytes, prove PID 1 is running the reviewed systemd generation,
observe the dedicated training cgroup and process descriptors, and only then
produce evidence eligible for V2 composition.

No host installation, service start, training execution, attempt claim,
private-key access, signing, transaction, wallet, activation, or funds movement
occurs in this lane.
