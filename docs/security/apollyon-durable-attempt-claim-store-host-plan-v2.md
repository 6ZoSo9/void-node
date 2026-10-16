# Apollyon durable attempt-claim store Xiphos preinstall plan v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2`

Status: **read-only designated-host planning source; no installation and no claim authority**.

## Purpose

Accepted #3233 defines the protected attempt-claim store requirements, but deliberately does not choose a UID/GID, account name, socket path, state root or systemd unit. Those choices must be fixed before any installation can be reviewed.

This phase binds the Xiphos preinstall choices without creating them. It is not the final installed-host qualification and does not claim that a claim service, publisher, protected root, socket or durable claim exists.

Exact parent:

`#3233@fe7e1ad9b78a24b77a1657067e4d08f7c56a7731`

Parent contract Git blob:

`6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe`

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

## Local identity authority and numeric slot selection

The plan does **not** call libc NSS. Before any identity lookup or candidate selection it descriptor-binds direct root-owned, non-group/world-writable copies of:

- `/etc/nsswitch.conf`;
- `/etc/passwd`;
- `/etc/group`;
- `/etc/login.defs`.

It accepts exactly `passwd: files` and `group: files`; SSS, LDAP, NIS, compat, systemd or action-clause profiles HOLD. Passwd/group data are parsed directly from the bound local files, so the declared `network_access=false` boundary does not depend on an external NSS provider. The four file identities/hashes are revalidated before the plan is emitted.

The live read-only plan parses the exact `SYS_UID_MIN/MAX` and `SYS_GID_MIN/MAX` values from the bound `/etc/login.defs`, inventories only the bound local passwd/group files, and selects:

- two unused system UID candidates;
- three unused system GID candidates.

Selection is deterministic from the highest available values downward. For conservative separation, the five selected numbers must be globally distinct and cannot collide with any currently used UID/GID or any observed protected identity.

The result binds candidate numbers into the content-addressed plan. They are only candidates until a separately reviewed create-only account/bootstrap gate provisions them. That later provisioning gate must repeat the local-files authority census and prove the selected numeric slots are still free immediately before create-only mutation.

## Host binding

A future `--run` requires hostname `Xiphos`, exact parent head, and records SHA-256 plus stable file identity for the current `/etc/machine-id`. It performs only direct read-only filesystem observations; libc NSS lookup and remote NSS providers are not used.

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
