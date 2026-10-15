# Buy VOID authenticated user-manager live query qualification v1

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V1`.

Status: **read-only live qualification contract; hosted CI never executes the live query**.

## Purpose

Merged #3068 correctly stopped request-root qualification from trusting ordinary
`systemctl --user` / user-bus evidence. #3070 defines create-only installation
of the exact #3057 authenticated private-peer query pair.

This successor performs the next narrow step only: when that pair has been
separately installed, execute the fixed static preexec twice as root and prove
that the same authenticated user-manager/service generation survives both
observations.

It does **not** yet make a historical request-root disposition or authorize a
stable-root migration.

## Exact executable boundary

The qualifier imports and pins the #3070 installer source and therefore inherits
the exact fixed protected paths:

```text
/opt/void-buy-void-user-manager-query-v1/
  void_buy_void_user_manager_private_unit_query_preexec_v1
  void_buy_void_user_manager_private_unit_query_v1
```

Before, between and after the two native queries, the installed pair must remain:

- root:root;
- mode 0555;
- direct single-link regular files;
- exact accepted byte lengths;
- exact accepted SHA-256 identities.

The complete before/middle/after file snapshots must be identical.

## Native query authority

The qualifier executes only the fixed static preexec:

```text
.../void_buy_void_user_manager_private_unit_query_preexec_v1   --uid 1000   --unit void-node-live.service
```

It uses no shell, an empty/minimal fixed environment, `cwd=/`, closed inherited
FDs and a bounded timeout.

The static preexec then enforces its own fixed-path/root-custody contract and
enters the accepted dynamic query with its internally constructed sanitized
loader environment.

The native query itself authenticates:

- the root-anchored `systemd --user` manager;
- `/run/user/1000/systemd/private` using kernel `SO_PEERCRED`;
- the same retained authenticated FD for the unit-property query;
- the returned `MainPID` back to the kernel process/cgroup/executable;
- manager and service pidfd liveness/generation before returning GREEN.

The Python qualifier accepts the exact reviewed native output shape only. It
requires the same constraints as merged #3057, including:

- runtime UID 1000 and manager GID 1000;
- `void-node-live.service`;
- loaded/active/running;
- implicit empty systemd `User=` / `Group=` under the user manager;
- exact user-service cgroup;
- `NoNewPrivileges=yes`;
- empty bounding and ambient capability sets;
- direct service-parent relation to the authenticated manager;
- all #3057 authentication/generation booleans true;
- all payment/presale/funds authority booleans false.

## Double observation

One successful native query is not enough.

The qualifier executes the exact fixed preexec twice and requires:

- identical authenticated manager PID/start ticks;
- identical service MainPID/start ticks;
- identical service cgroup;
- identical complete accepted native evidence;
- identical protected binary snapshots before, between and after.

Only then can it emit:

`double_authenticated_query_stable=true`.

This is still not the request-root census. The next source gate must perform the
request-root/process/listener/status observation **between authenticated
manager/service observations** and bind every observation to this exact MainPID
generation.

## Failure semantics

A HOLD never claims that no query executed. A failure can occur after the first
native query or during the second observation, so the HOLD surface reports:

`query_execution_state=unknown_or_partial`.

It still reports all host/service/payment/presale/funds mutation authorities
false because the query is read-only.

## Modes

Inert source self-test:

```bash
python3 -I -B ops/precision/void_buy_void_user_manager_query_live_qualification_v1.py --self-test
```

Read-only plan:

```bash
python3 -I -B ops/precision/void_buy_void_user_manager_query_live_qualification_v1.py --plan
```

A future separately authorized live run requires root:

```bash
sudo python3 -I -B ops/precision/void_buy_void_user_manager_query_live_qualification_v1.py --run
```

Do not run `--run` until the exact protected install has been separately
qualified.

## Authority boundary

The live path executes an accepted read-only evidence query but performs no host
write, service/systemd mutation, external network call, credential/key/wallet
access, request/payment content read, transaction, payment acceptance, presale
activation, or funds movement.

Even a GREEN result keeps
`production_host_evidence_authority=false`.

**PROTECT THE CORE.**
