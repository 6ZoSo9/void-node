# VOID V7 stage-verifier provider-aware account plan V2

**Status: SOURCE-ONLY. No provider profile, UID/GID, account, group, ACL, or host mutation is selected or authorized.**

## Current source generation

This V2 plan is stacked on Draft #3804 at exact head `c90f2e89ef0b90a8a8852b72ffb9bf6ba9f22a22`, which re-derives role separation directly from current #3715 installer bytes.

Current exact role/stager identities:

- role contract: `ops/security/void_v7_v5_stage_role_separation_contract_v2.json`, Git blob `4801caaca496baeb85c7842b5b8b4b47122582ab`;
- source-stage installer: Git blob `d88a9548ea34b8209ed7dcd53732fd25dd1371bf`;
- receipt-stage installer: Git blob `b462696826b4f90fdf5f4938cd5467e5711addab`.

This plan's exact machine source is `ops/security/void_v7_stage_verifier_provider_aware_account_plan_v2.json`, Git blob `5881490da054360903e8ac9e9859ee58495830bb`. The exact source proof is `scripts/prove_void_v7_stage_verifier_provider_aware_account_plan_v2.py`, Git blob `66ebac8b57abdcefb38af5d14a0ca001ac3eea02`.

## Why historical #3754 is not enough

Historical #3754 created a source-only account plan on the closed #3748 branch. Its final generation correctly added stale filesystem ownership and POSIX ACL collision checks, but its identity-selection policy required local-files-only NSS.

The operator later reported Precision identity routes containing `files`, `systemd`, and `sss`. That report is historical operator input, **not authenticated current host evidence**, but it proves the old files-only assumption cannot be promoted as current authority.

V2 therefore binds no current `passwd` or `group` route and selects no numeric IDs. A future authenticated host planner must first identify the exact effective provider order and action policy and prove provider-specific absence across every configured provider.

`passwd` and `group` routes may legitimately differ; V2 binds them separately. Because the future identity is created in local account files, `files` must be present in both effective routes or the plan HOLDs.

## Proposed identity — name only

Proposed user and primary-group name: `void-v7-stage-verifier`.

Still false/unselected:

- numeric UID: null;
- numeric GID: null;
- account provisioned;
- group provisioned;
- private-stage ACL;
- installer binding;
- service/process authority.

Future properties remain: locked password, `/usr/sbin/nologin`, no home, no supplementary groups, no custody IPC GID 980, no sudo/Polkit/SSH admin authority, no operator-home or key/wallet/signer access.

## Provider-aware negative identity proof

The provider policy supports only three **provider families** as a source-design surface:

- `files`;
- `systemd`;
- `sss`.

This does **not** assert that those providers are currently configured, healthy, ordered, or exhaustive on Precision. A future authenticated host planner must bind the exact `passwd` and `group` routes, including provider order and action clauses. Unknown providers, duplicate providers, provider/action-policy drift, unavailability, timeout, degraded state, or ambiguous lookup results are HOLD.

For every configured provider, both the proposed **name** and candidate **numeric UID/GID** require direct negative evidence. Enumeration alone is insufficient.

### files

Future evidence must descriptor-bind stable root-owned, non-group/world-writable `nsswitch.conf`, `passwd`, `group`, `shadow`, `gshadow`, and `login.defs`; parse local passwd-name/UID and group-name/GID collisions; bind the exact system-account UID/GID ranges from that `login.defs` generation; require the selected numeric IDs to fall inside those reviewed system ranges; bind all existing subordinate-ID delegations; reject any candidate UID/GID that falls inside an existing `/etc/subuid` or `/etc/subgid` range; and recheck the exact local-file/subordinate-ID generation immediately before each create-only operation.

### systemd

Future evidence must bind the running system manager generation, `nss-systemd` availability, and the complete systemd userdb-service inventory reachable by that provider; census DynamicUser/transient allocations and reservations; bind the future DynamicUser allocation range; require the candidate numeric IDs to stay outside that recyclable pool unless a separately reviewed static-reservation policy proves noncollision; perform namespace-appropriate direct negative lookups; and HOLD if allocator, provider, userdb-service inventory, or manager generation changes.

### sss

Future evidence must bind SSSD configuration, provider health, domain/cache generation, and every domain's configured or algorithmic numeric ID-mapping ranges. The candidate name and UID/GID must be outside present **and future** SSSD allocation/mapping authority unless a separately reviewed local-identity reservation makes that separation explicit. Direct namespace-specific negative lookup is mandatory. Enumeration-only evidence is invalid; offline, degraded, unreachable, timed-out or ambiguous provider state is HOLD.

This source generation performs **none** of those live queries.

## Numeric authority beyond NSS

A future candidate numeric UID/GID also requires:

1. authenticated initial host PID and user namespace leases;
2. complete procfs census over all live PIDs, including every real/effective/saved/filesystem UID and GID plus supplementary groups;
3. explicit exclusion of deleted-account credentials retained by running processes;
4. census of every live user namespace's UID/GID mapping ranges, excluding any mapping that can translate the candidate host UID/GID into authority inside a live namespace;
5. complete authenticated mounted-filesystem authority scope and mount generation;
6. inclusion of tmpfs, bind, remote, and other mounts wherever numeric ownership or POSIX ACLs can confer authority;
7. HOLD on any unreadable, unsupported or unclassifiable relevant mount;
8. absence of existing ownership by the candidate UID/GID;
9. absence of numeric POSIX access/default ACL references to the candidate UID/GID;
10. absence from systemd DynamicUser/reservation state and future allocation ranges;
11. absence from every existing subordinate-UID delegation;
12. absence from every existing subordinate-GID delegation;
13. absence from every configured SSSD future ID-mapping/allocation range unless separately reserved for the local identity;
14. absence from System V IPC owner/creator UID/GID fields and any other persistent kernel authority object that can be completely censused; unknown or incomplete kernel authority scope is HOLD;
15. identification of every idmapped mount/user-namespace mapping that affects numeric ownership or ACL interpretation, with correct host-ID translation or HOLD;
16. absence of the proposed future **name** from subordinate-ID delegation entries, systemd-sysusers definitions, preexisting systemd credential/unit references, sudoers/Polkit or equivalent privilege policies, SSH login authorization, cron/at or scheduled execution, and tmpfiles/automatic chown/chgrp rules;
17. a generation-bound name-authority census that HOLDs if any relevant name-based authority surface is unreadable, unknown, or unclassifiable;
18. repetition of provider, process, mount, ownership and ACL evidence immediately before group creation;
19. after group creation, re-authentication of the exact expected local group plus continued nonlocal group-provider absence;
20. before user creation, renewed passwd-provider absence and proof that the selected GID acquired no process/file/ACL/service authority outside the expected account database record;
21. the same complete provider/process/mount/ownership/ACL evidence immediately before user creation.

A matching source-plan digest is never host attestation.

## Future create-only sequence — not implemented

A separately reviewed provisioner may eventually:

1. create exactly the approved primary group with an explicitly reviewed GID **inside the bound system-account GID range**, only if the name and number remain absent;
2. create exactly the approved system user with explicitly reviewed UID **inside the bound system-account UID range**, that primary group, locked password, nologin shell, no home, no supplementary groups, and **no subordinate UID/GID delegation creation**.

No existing identity may be modified or reused.

The source proof models two explicit phases. Pre-group negative cases are evaluated only against `BEFORE_GROUP_CREATE`; the post-group/pre-user negatives are evaluated only against `BEFORE_USER_CREATE`, so every expected HOLD corresponds to a reachable phase state. **BEFORE_GROUP_CREATE** requires both user and group absent. **BEFORE_USER_CREATE** requires the group to be present as the exact local-files binding created by the accepted create-only group receipt; the group must not be treated as a collision in that phase. The local group membership must remain empty, every configured non-`files` group provider must still report the name/GID absent, and the user name/UID must remain absent across every configured passwd provider. A preexisting, mismatched, receipt-less, multiply bound, or nonlocal group cannot satisfy this transition.

Before either future create-only step, the proposed user/group name must also be absent from preexisting **name-based authority**: subordinate-ID entries, sysusers definitions, unexpected systemd User=/Group= or credential references, sudo/Polkit/SSH privilege rules, scheduled jobs, tmpfiles ownership rules, and other reviewed automatic privilege/chown surfaces. A preexisting future-facing reference is not made safe merely because NSS currently reports the name as absent.

After the future group-create step, the selected group is expected to exist **exactly once in the bound local-files provider**. Before user creation, that exact local group binding must be re-authenticated, the same group name/GID must remain absent from every configured non-`files` group provider, the user name/UID must remain absent from every configured passwd provider, and complete process/mount/ownership/ACL evidence must be repeated. The expected local group is therefore not misclassified as a collision.

Partial creation is HOLD. No automatic `usermod`, `userdel`, or `groupdel` is allowed. Rollback requires separate authorization and exact proof that the created generation owns no files/ACLs, has no live processes, group members, services, user-namespace mappings, kernel IPC objects, or name-based authority dependents, and was not preexisting.

After provisioning, effective NSS must resolve a unique name↔UID/GID mapping across the entire configured provider stack; no subordinate UID/GID delegation may have been created; and the selected IDs must remain outside provider-controlled future allocation ranges. Account creation alone still does **not** authorize V5 staging.

## Source-only proof

Run under a nonroot account on this exact branch:

```sh
python3 -I -B scripts/prove_void_v7_stage_verifier_provider_aware_account_plan_v2.py
```

The proof pins this plan, current #3804 role contract, and both current #3715 installers. All four worktree inputs (plan, role contract, source installer, and receipt installer) are authenticated from bytes read once through the same retained `O_NOFOLLOW|O_NONBLOCK` descriptor helper with before/open/after generation, exact size/EOF, and Git-blob checks. Disposable FIFO/symlink substitutions exercise that production helper; no `git hash-object <worktree-path>` reopen is used. It verifies all authority fields remain false and evaluates **76 synthetic fail-closed cases**, including provider-profile/order errors, unknown providers, provider health/collision ambiguity, SSS enumeration-only and future-ID-range evidence, systemd userdb/DynamicUser current and future allocation gaps, system-account-range and subordinate-ID delegation collisions, live-process and live-user-namespace mapping collisions, SysV/kernel authority reuse, idmapped-mount ambiguity, stale numeric ownership/ACL reuse, latent name-based sysusers/systemd/sudo/Polkit/SSH/scheduled/tmpfiles authority, invalid provisioning phase/receipt transitions, mismatched post-group local binding or membership, stale recensus, login/group/admin authority, and recovery errors.

The fake `123456789/123456790` values are deliberately absurd proof-only numbers. Even the synthetic fully satisfied case returns only `SHAPE_ONLY_PROVIDER_AWARE_NOT_HOST_ATTESTED`.

Expected marker:

`VOID_V7_STAGE_VERIFIER_PROVIDER_AWARE_ACCOUNT_PLAN_V2_PROOF_GREEN`.

## Separate integration failures

At current #3804 head, its dedicated Python 3.12/3.13 role-separation workflow is GREEN and exact-head Codex review reports no findings. Two broader V7/V2 enforcement workflows fail on a separate protected-source-finality deployment-receipt Git-blob drift (`3de6e4bd...` expected vs `f2d5288d...` current). This account plan does not repair or reinterpret that separate integration lane.

## Authority

Source/test/CI only. No live provider query, account/group creation, numeric selection, root execution, ACL mutation, /opt stage, launcher/runtime/manifest acceptance, service action, credential/key access, transaction/signing, payment acceptance, public presale/WC activation, treasury or funds movement.

**PROTECT THE CORE.**
