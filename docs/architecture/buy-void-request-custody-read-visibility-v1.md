# Buy VOID request custody-read visibility v1

Marker: `VOID_BUY_VOID_REQUEST_CUSTODY_READ_POLICY_V1`.

Status: **source contract only; host not provisioned; public intake remains HOLD**.

## Live-host finding

Precision currently runs `void-node-live.service` under user-systemd as UID
1000. No `VOID_BUY_REQUEST_DIR` is present in the live process environment,
so the mounted request helper resolves its default beneath the immutable release
working directory. That default request root does not exist.

The separately installed custody identity is UID 994 and the dedicated IPC group
is GID 980. Existing request persistence intentionally uses a private
`0700` directory and `0600` leaves, so choosing a stable pathname alone
cannot make durable payment history independently readable by custody.

## Opt-in successor policy

This change does not weaken the default. With
`VOID_BUY_REQUEST_CUSTODY_READ_GID` absent, existing private storage semantics
remain unchanged.

When that variable is present, the process captures one exact positive numeric
GID at module load and requires:

- an **absolute, already-provisioned** request root;
- owner = the runtime UID;
- group = the configured custody IPC GID;
- exact directory mode `0750` (setgid + owner rwx + group r-x);
- both fixed `requests.jsonl` and `operator-events.jsonl` must already exist;
- fixed-journal owner = runtime UID;
- exact fixed-journal mode `0640`;
- fixed-journal GID = the configured IPC GID;
- no group write and no other access.

The runtime does not chmod/chown an existing historical request root into this
trust domain. An absent or incorrectly provisioned shared root fails closed.

Neither mounted writer creates a fixed journal in shared mode. This removes
ambient umask and group-inheritance behavior from the authority boundary.
Both fixed journals are provisioned explicitly, then the request/capacity
writers verify exact owner/GID/mode before every use.

## Sidecars stay private

Customer request sidecars and operator sidecars are **not** promoted to shared
history. Their creation remains `0600`; the new policy grants custody
readability only to the two fixed append-only journals required for independent
payment-provenance observation.

## Host work still required

Source support is not host qualification. Before enabling the new env:

1. choose a stable request root outside immutable release directories;
2. create it with the exact runtime owner, IPC group and `0750` mode;
3. create both fixed journals with runtime owner, IPC group and `0640` mode;
4. harden the live user-systemd runtime (`NoNewPrivileges`, empty capability
   bounding/ambient sets) without breaking existing public-node duties;
5. install/verify the global Polkit deny boundary;
6. install the separately reviewed custody service/socket boundary;
7. run fresh descriptor-bound host evidence and cross-UID read qualification.

This contract grants no custody write authority, no payment acceptance, no
allocation mutation, no presale activation and no funds movement.
