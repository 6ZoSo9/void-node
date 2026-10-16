# Apollyon durable attempt-claim store Xiphos preinstall plan v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2`

Status: **read-only designated-host planning source; no installation and no claim authority**.

## Purpose

Accepted #3233 defines the protected attempt-claim store requirements, but deliberately does not choose a UID/GID, account name, socket path, state root or systemd unit. Those choices must be fixed before any installation can be reviewed.

This phase binds the Xiphos preinstall choices without creating them. It is not the final installed-host qualification and does not claim that a claim service, publisher, protected root, socket or durable claim exists.

Exact parent:

`#3233@30183b8cd5f80d8c51fe069ce3d2a3dc08163ca0`

Parent contract Git blob:

`4bf474b8f282972b4dca4ab79eaf44260ce3ba54`

## Fixed future names

- claim service user/group: `voidapollyonclaim`
- claim publisher user/group: `voidapollyonclaimpub`
- claim IPC group: `voidapollyonclaimipc`

The plan requires all five future user/group namespace entries to be absent. It does not create them.

Existing protected identities are observed read-only from:

- `voidapollyontrain`
- `voidapollyoncustody`
- `voidapollyonipc`
- public runtime/operator account `zoso`

## Fixed future paths

- state root: `/var/lib/void-apollyon-attempt-claim-v2`
- socket parent: `/run/void-apollyon-attempt-claim-v2`
- socket: `/run/void-apollyon-attempt-claim-v2/claim.sock`
- service unit: `/etc/systemd/system/void-apollyon-attempt-claim-v2.service`
- service source root: `/opt/void-apollyon-attempt-claim-v2-reviewed-v1`
- publisher source root: `/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1`

The plan requires the install-target leaves to be absent and the retained system parents `/`, `/var`, `/var/lib`, `/run`, `/opt`, `/etc`, `/etc/systemd`, and `/etc/systemd/system` to be direct, root-owned and non-group/world-writable.

## Numeric slot selection

The live read-only plan parses the host's exact `SYS_UID_MIN/MAX` and `SYS_GID_MIN/MAX` values from `/etc/login.defs`, inventories the existing passwd/group databases, and selects:

- two unused system UID candidates;
- three unused system GID candidates.

Selection is deterministic from the highest available values downward. For conservative separation, the five selected numbers must be globally distinct and cannot collide with any currently used UID/GID or any observed protected identity.

The result binds candidate numbers into the content-addressed plan. They are only candidates until a separately reviewed create-only account/bootstrap gate provisions them.

## Host binding

A future `--run` requires hostname `Xiphos`, exact parent head, and records SHA-256 of the current `/etc/machine-id` value. It performs only read-only NSS/filesystem/login-defs observations.

Hosted CI does **not** perform the Xiphos census. It runs self-tests and an explicit live-run negative that must stop at `HOLD=wrong_host`.

## Non-authority

Even a READY plan keeps all of the following false:

- account/group provisioning;
- directory/file creation;
- systemd unit installation or daemon reload;
- service start/stop;
- claim-service or publisher source installation;
- protected claim-store qualification;
- durable attempt claim;
- training or candidate-weight mutation;
- credential/private-key/signing/wallet/transaction/funds authority.

The next source gate is:

`apollyon_durable_attempt_claim_store_service_source_candidate_v2`

A plan is not installation authority.
