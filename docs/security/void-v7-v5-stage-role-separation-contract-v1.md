# VOID V7 V5 staging: split candidate-owner and verifier identities

**Status: source-only contract candidate. No account or verifier identity is selected.**

Canonical upstream: Draft #3726 at exact head `555db189091321a727b98d5177c7428430fd23a1`. Its V5 source-stage installer `ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py` has Git blob `b8b52649730cd1b1cf23ffc8c68878cef8ecfc5b`. This branch does not modify that installer or any staging launcher.

## Verified original issue

V5 uses the *same* `RUNTIME_UID=1000` and `RUNTIME_GID=1000` in 13 exact source locations, serving three distinct functions:

1. **Candidate owner:** current operator `zoso` UID/GID 1000/1000 owns and authenticates the source candidate and its history, expected root mode `0700`.
2. **Stage reader:** root-owned temporary private-stage directories and files receive POSIX named-user read/search ACLs for *that same* UID 1000.
3. **Privileged child:** one dispatch function runs `collect_plan`, `verify_stage_private`, and `verify_stage` under the same dropped UID/GID 1000.

Prior operator-reported Precision observations, **not authenticated by this source-only PR**, were used only as planning inputs: `/opt` and the fixed source root were reported root:root; the V5 staging directories and expected full-history candidate were reported absent; `void-buy-custody` (994/981) and `void-buy-runtime` (995/982) were reported reserved for other Buy VOID custody/IPC duties; login UID 1000 was reported with broad supplementary groups and an unconfined shell; and Yama `ptrace_scope=1` was reported. These observations require a fresh, separately reviewed host attestation before any account selection, ACL change, or implementation. Reusing UID 995 is not independently approved.

## Proposed successor behavior — not implemented

Keep **candidate owner UID/GID 1000/1000** for `collect_plan`, source ownership, history verification and descriptor-bound source copying. Require a **distinct, dedicated non-login stage-verification UID/GID** for `verify_stage_private`. It must have no supplementary groups, custody IPC authority, shell access, or login-GID overlap; neither UID 994/995 nor their reserved groups can be reused. No stage-verifier UID or account name is selected in this contract. There must be a reviewed provision-and-attestation operation before changing the source installer.

The root-custodied copy sequence must preserve: exact source-generation and tree digest verified before any temporary ACL; explicit named read/search ACL for the stage verifier only; private-stage authentication through the separately dropped verifier child; removal/reverification of every temporary ACL before final public-readonly publication; no-replace atomic publication with parent fsync. The `verify_stage` child also needs an explicitly reviewed identity assignment, not a shared implicit default.

Every child must retain `setgroups([])`, exact real/effective/saved UID/GID verification, no-new-privileges, effective/permitted/inheritable/ambient capability checks, an explicit CapBnd policy, and independent post-exec process protection. Existing dynamic `ctypes.CDLL(None)` operations also require their separately reviewed static native bridge migration. No step grants payment/presale or custody access.

## Reproducible, executable source checks

Under a nonroot user, with this candidate branch checked out:

```bash
python3 -I -B scripts/prove_void_v7_v5_stage_role_separation_contract_v1.py
```

The proof verifies exact upstream Git source blob `b8b52649730cd1b1cf23ffc8c68878cef8ecfc5b`, exact machine-contract blob `9fc65073c54d7fe70283439ef3ea107dd3f856f6`, the complete 13-site `RUNTIME_UID/GID` inventory, the existing group/ACL constraints, operation dispatch, private-digest/ACL/publication ordering and unchanged legacy native ABI requirement. It executes **19 fail-closed synthetic policy mutations** (unselected IDs, login/custody aliasing, old IPC groups, nonempty supplementary groups, unexpected stage access, incorrect owner, unverified copy, early publication and residual ACL). A synthetic reader of UID 65000/GID 65001 is used only to test schema shape, *never* selected as a host account or authorized to run.

Expected marker: `VOID_V7_V5_STAGE_ROLE_SEPARATION_CONTRACT_V1_PROOF_GREEN`.

## Authority boundary and next reviewed gate

The contract is input to a **future versioned source-stage installer** and trust-manifest review. It does not implement an installer successor, migrate identities, install runtime bytes, stage source or receipt, create an account, modify ACLs, access keys, change services, run root, accept payments, open presale/WC, or move funds.

The current canonical PR chain must be reconciled independently. This plan grants no permission to merge a privileged code path or act on Precision. The dedicated account and production runtime first-entry remain HOLD.

**PROTECT THE CORE.**
