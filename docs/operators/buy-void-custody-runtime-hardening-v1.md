# Buy VOID custody runtime hardening v1

Status: **source-only user-systemd drop-in example; not installed**.

The live Precision census found the running `void-node-live.service` process
has zero current Linux capabilities, but the user-unit configuration still
reports:

```text
NoNewPrivileges=no
CapabilityBoundingSet=<broad default set>
AmbientCapabilities=
```

The allocation-custody host-evidence policy requires the runtime to be
non-privilege-escalating and to have empty bounding/ambient capability sets.
This drop-in selects only those three changes:

```ini
[Service]
NoNewPrivileges=yes
CapabilityBoundingSet=
AmbientCapabilities=
```

It deliberately does **not** change:
- ExecStart or working directory;
- runtime user/group;
- network namespaces or address families;
- environment variables;
- credentials;
- read/write paths;
- public P2P/HTTP configuration;
- Buy VOID enable/apply gates.

The live process already reports zero inheritable/permitted/effective/ambient
capabilities, so this source profile removes future capability acquisition
rather than granting a new capability.

## Apply boundary

A future host plan must:
1. census the existing effective unit and all active drop-ins;
2. prove no later drop-in resets these three properties;
3. stage the exact file create-only;
4. daemon-reload and restart only under separate explicit authorization;
5. verify public readiness and exact source/runtime identity afterward;
6. prove live `NoNewPrivs: 1` and zero kernel capabilities;
7. preserve rollback bytes before mutation.

This PR performs none of those actions.

```text
service_installed=false
service_restarted=false
host_mutation=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```
