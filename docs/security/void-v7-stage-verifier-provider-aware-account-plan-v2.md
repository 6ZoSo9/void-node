# VOID V7 stage-verifier provider-aware account plan V2

**Status: SOURCE-ONLY. No provider profile, UID/GID, account, group, ACL, or host mutation is selected or authorized.**

## Current source generation

This V2 plan is stacked on Draft #3804 at exact head `c90f2e89ef0b90a8a8852b72ffb9bf6ba9f22a22`, which re-derives role separation directly from current #3715 installer bytes.

Current exact role/stager identities:

- role contract: `ops/security/void_v7_v5_stage_role_separation_contract_v2.json`, Git blob `4801caaca496baeb85c7842b5b8b4b47122582ab`;
- source-stage installer: Git blob `d88a9548ea34b8209ed7dcd53732fd25dd1371bf`;
- receipt-stage installer: Git blob `b462696826b4f90fdf5f4938cd5467e5711addab`.

This plan's exact machine source is `ops/security/void_v7_stage_verifier_provider_aware_account_plan_v2.json`, Git blob `6b8057f000b85876aa986dd58dc324b5377dd568`. The exact source proof is `scripts/prove_void_v7_stage_verifier_provider_aware_account_plan_v2.py`, Git blob `6c4292deb8436ba5eda67a35240ae9d3ae9a5171`.

## Why historical #3754 is not enough

Historical #3754 created a source-only account plan on the closed #3748 branch. Its final generation correctly added stale filesystem ownership and POSIX ACL collision checks, but its identity-selection policy required local-files-only NSS.

The operator later reported Precision identity routes containing `files`, `systemd`, and `sss`. That report is historical operator input, **not authenticated current host evidence**, but it proves the old files-only assumption cannot be promoted as current authority.

V2 therefore binds no current `passwd` or `group` route and selects no numeric IDs. A future authenticated host planner must first identify the exact effective provider order and action policy and prove provider-specific absence across every configured provider.

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

Future evidence must descriptor-bind stable root-owned, non-group/world-writable `nsswitch.conf`, `passwd`, `group`, `shadow`, `gshadow`, and `login.defs`; parse all local collisions; bind system UID/GID ranges; and recheck the exact file generation immediately before each create-only operation.

### systemd

Future evidence must bind the running system manager generation and `nss-systemd` availability, census DynamicUser/transient allocations and reservations, perform exact name/UID/GID negative lookups, and HOLD if allocator or manager generation changes.

### sss

Future evidence must bind SSSD configuration/domain/cache generation and provider health. Direct exact name/UID/GID negative lookup is mandatory. Enumeration-only evidence is invalid; offline, degraded, unreachable, timed-out or ambiguous provider state is HOLD.

This source generation performs **none** of those live queries.

## Numeric authority beyond NSS

A future candidate numeric UID/GID also requires:

1. authenticated initial host PID and user namespace leases;
2. complete procfs census over all live PIDs, including every real/effective/saved/filesystem UID and GID plus supplementary groups;
3. explicit exclusion of deleted-account credentials retained by running processes;
4. complete authenticated mounted-filesystem authority scope and mount generation;
5. inclusion of tmpfs, bind, remote, and other mounts wherever numeric ownership or POSIX ACLs can confer authority;
6. HOLD on any unreadable, unsupported or unclassifiable relevant mount;
7. absence of existing ownership by the candidate UID/GID;
8. absence of numeric POSIX access/default ACL references to the candidate UID/GID;
9. absence from systemd DynamicUser/reservation state;
10. repetition of provider, process, mount, ownership and ACL evidence immediately before group creation;
11. the same complete repetition immediately before user creation.

A matching source-plan digest is never host attestation.

## Future create-only sequence — not implemented

A separately reviewed provisioner may eventually:

1. create exactly the approved primary group with an explicitly reviewed GID, only if the name and number remain absent;
2. create exactly the approved system user with explicitly reviewed UID, that primary group, locked password, nologin shell, no home and no supplementary groups.

No existing identity may be modified or reused.

Partial creation is HOLD. No automatic `usermod`, `userdel`, or `groupdel` is allowed. Rollback requires separate authorization and exact proof that the created generation owns no files/ACLs, has no live processes, group members, services, or other dependents, and was not preexisting.

After provisioning, effective NSS must resolve a unique name↔UID/GID mapping across the entire configured provider stack. Account creation alone still does **not** authorize V5 staging.

## Source-only proof

Run under a nonroot account on this exact branch:

```sh
python3 -I -B scripts/prove_void_v7_stage_verifier_provider_aware_account_plan_v2.py
```

The proof pins this plan, current #3804 role contract, and both current #3715 installers. It verifies all authority fields remain false and evaluates **41 synthetic fail-closed cases**, including provider-profile/order errors, unknown providers, provider health/collision ambiguity, SSS enumeration-only evidence, systemd DynamicUser gaps, live-process collisions, mount/ownership/ACL reuse, stale recensus, login/group/admin authority, and recovery errors.

The fake `123456789/123456790` values are deliberately absurd proof-only numbers. Even the synthetic fully satisfied case returns only `SHAPE_ONLY_PROVIDER_AWARE_NOT_HOST_ATTESTED`.

Expected marker:

`VOID_V7_STAGE_VERIFIER_PROVIDER_AWARE_ACCOUNT_PLAN_V2_PROOF_GREEN`.

## Separate integration failures

At current #3804 head, its dedicated Python 3.12/3.13 role-separation workflow is GREEN and exact-head Codex review reports no findings. Two broader V7/V2 enforcement workflows fail on a separate protected-source-finality deployment-receipt Git-blob drift (`3de6e4bd...` expected vs `f2d5288d...` current). This account plan does not repair or reinterpret that separate integration lane.

## Authority

Source/test/CI only. No live provider query, account/group creation, numeric selection, root execution, ACL mutation, /opt stage, launcher/runtime/manifest acceptance, service action, credential/key access, transaction/signing, payment acceptance, public presale/WC activation, treasury or funds movement.

**PROTECT THE CORE.**
