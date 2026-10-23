# VOID V7 stage-verifier account: create-only planning gate V1

**Status: SOURCE-ONLY. Identity not selected; no account/group is provisioned.**

## Scope and authoritative source

This planning contract is stacked on the separately reviewed two-role staging draft **#3748** at exact head `eca1b2313f7c384b619151998613d9374fde1bc2`. It does not change that role-separation contract (Git blob `1dccc0f7fd1c74005b519113b0728ebd25477ad5`), the canonical V5 installer (blob `b8b52649730cd1b1cf23ffc8c68878cef8ecfc5b`), the existing custody services, launcher, manifest or host.

Machine-readable source: `ops/security/void_v7_stage_verifier_create_only_account_plan_v1.json`, Git blob `e2e052fa0fa1858e842063f994ddd3e611772949`. Exact-source read-only proof: `scripts/prove_void_v7_stage_verifier_create_only_account_plan_v1.py`, Git blob `060c9842a760d4df11677d7e8dab1e04ccc6b2b7`.

### Proposed name, **not** approved identity

- Proposed user **and** primary group: `void-v7-stage-verifier`.
- Numeric UID: **null / UNSELECTED**.
- Numeric primary GID: **null / UNSELECTED**.
- System-only non-login account: `/usr/sbin/nologin`; locked password; no home created.
- No supplementary group memberships, particularly no `void-buy-custody-ipc` (GID 980), and no sudo, Polkit, SSH, private operator home or keys.
- Future stage access only as **temporary named UID read/search ACL** on the exact root-custodied, already-authenticated private stage; no stage write.
- Existing `void-buy-custody` (994/981) and `void-buy-runtime` (995/982) are **reserved** and cannot be reassigned for this role. Candidate source remains owned by UID/GID 1000/1000; the protected copier remains root (0/0).

The operator's Precision `getent`/`id` output at `2026-10-23T15:14:09Z` reported both proposed names absent. **That is an operator-supplied historical observation, not an independently authenticated/current host attestation.** The proof does not read host `/etc`, `/proc`, NSS, keys or any service.

## Guarded future create-only sequence — **NOT executable here**

1. A separately reviewed, authenticated root first entry confirms the designated host, initial user and PID namespaces, exact source and accepted plan generation.
2. Descriptor-bind and verify stable root-custodied local `passwd`, `group`, `shadow`, `gshadow`, `nsswitch.conf` and `login.defs`. Require fully local `passwd: files` and `group: files`; unresolved/remote/ambiguous NSS policies HOLD.
3. Prove the proposed user/group names are absent in the effective NSS view, independently select unused numeric UID/GID within the observed system ranges, exclude **all** currently reserved economic identities and groups, plus systemd/DynamicUser reservations.
4. Prove host-wide credential noncollision: authenticate host PID and user-namespace leases, procfs without `hidepid`, collect all four UID and GID process slots **and supplementary Groups**, including stale processes whose passwd/group entries were deleted. Unreadable/malformed live PIDs and inconstant generations HOLD. Repeat immediately before **each** create-only operation.
5. Future operation **A** would create only the exact primary group with approved explicit GID if absent. Future operation **B** would create only the exact system user with approved explicit UID and primary group, locked password, nologin and no home or supplementary groups. Existing entries must never be modified or reused. **Neither command nor its execution is provided in this generation.**
6. Re-bind the account and group records and confirm the exact effective UID/GID, locked state, no home, no additional groups, no GID 980, no running process, no custody IPC privilege, no protected-stage ACL, and no unexpected host or service mutation.

**Crash/failure behavior:** Any partial group/user creation is `HOLD`. Keep the exact root-owned create-only receipt and account-generation evidence for explicit operator review. **Never blindly remove a group or account.** A later separately authorized rollback must prove the exact created generation has no processes, files, ACLs, group members, or other dependents and must never delete any preexisting entry. Successful user creation is **not** staging or installer acceptance.

## Independent source proof

Run without root in a checkout of this exact branch:

```sh
python3 -I -B scripts/prove_void_v7_stage_verifier_create_only_account_plan_v1.py
```

The source proof binds the exact role contract, original V5 source and planned account-source blob to the current Git generation, requires all **22** future host/pre-provision checks, source-only authority denials, create-only group→user ordering and safe recovery, and evaluates **33 synthetic negative cases**. The artificial numeric values 65000/65001 in the proof are fake *test-only* slots, not selections or recommendations. Even a fully valid synthetic shape produces only `SHAPE_ONLY_PENDING_SEPARATELY_REVIEWED_PROVISIONER`, never runtime, provisioning or presale authority.

Expected successful source-only marker: `VOID_V7_STAGE_VERIFIER_CREATE_ONLY_ACCOUNT_PLAN_V1_PROOF_GREEN`.

## No host or economic authority

This PR cannot create an account or group, select numeric IDs, access credentials, change ACLs, copy any source into `/opt`, run privileged verification, install a launcher, change systemd services, sign or submit a transaction, accept payment, activate presale or Work Credit markets, or move funds. It also does not turn the unimplemented two-identity V5 successor into a deployable installer. These require **separate** explicit approval and independent review after fresh authenticated host evidence.

**PROTECT THE CORE.**
