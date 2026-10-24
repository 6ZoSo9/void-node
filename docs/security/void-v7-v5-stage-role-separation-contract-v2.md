# VOID V7 V5 staging role separation contract V2 — current #3715 generation

**Status: source-only contract candidate. No stage-verifier identity is selected, provisioned, or authorized.**

## Exact current source generation

This V2 contract is derived **directly** from current Draft #3715 at exact head `ea2193709dab86ea3eb3c2235d08e8a6858a23c6`. It does not inherit the closed historical #3748 branch.

Current #3715 exact identities:

- source-stage installer: `ops/precision/void_buy_void_v7_v5_source_stage_install_v1.py`, Git blob `d88a9548ea34b8209ed7dcd53732fd25dd1371bf`;
- receipt-stage installer: `ops/precision/void_buy_void_v7_v5_receipt_stage_install_v1.py`, Git blob `b462696826b4f90fdf5f4938cd5467e5711addab`;
- source proof: `5b8e98eec6712efd4846a564f689161fb054338f`;
- receipt proof: `7d968740c9e0c787c57bd493e5c51f5ed385eed1`;
- operator document: `02fa010cd66a50c5e2858b6cced9a7e08ee295af`;
- focused workflow: `af1a9afad2a39b96ee4022ba1b36ebf7534c818b`.

The role-contract machine source is `ops/security/void_v7_v5_stage_role_separation_contract_v2.json`, Git blob `4801caaca496baeb85c7842b5b8b4b47122582ab`. The exact source proof is `scripts/prove_void_v7_v5_stage_role_separation_contract_v2.py`, Git blob `d640a6b6ad67562f57489807d0bf86eff80bad1d`.

## Current defect and required split

The current source installer still uses one `RUNTIME_UID=1000` / `RUNTIME_GID=1000` pair across **13 exact source lines**:

`57, 58, 148, 1644, 1645, 1650, 1877, 1878, 1880, 1881, 2576, 2577, 2925`.

Those references currently conflate three independent roles:

1. **Candidate owner — UID/GID 1000/1000.** The operator-owned private 0700 source tree remains authenticated as UID/GID 1000/1000. `collect_plan` and candidate verification use this role.
2. **Root protected-stage orchestrator — UID/GID 0/0.** `apply()` must retain the existing `_require_privileged_source_custody()` root gate before protected copy. Root performs the protected copy, temporary ACL mutation/removal and create-only/no-replace publication; UID 1000 source ownership is metadata to authenticate, not permission to execute those mutations.
3. **Private-stage verifier — distinct dedicated identity.** It is **UNSELECTED**. It may eventually receive only exact named-user read/search ACLs on a root-owned private stage after the copied digest has already been verified. It gets no stage write permission, operator-home access or custody IPC membership.

The final public-stage `verify_stage` identity also remains an explicit review decision. It must not silently inherit whichever UID happens to verify the private stage.

## Ordering and privilege invariants

A future versioned installer must preserve all of these:

- root-custodied source/ancestor validation before protected mutation;
- exact candidate-owner UID/GID and generation checks on retained source descriptors;
- bounded root-owned copy before any private-stage verifier ACL;
- private copied-tree content digest before any verifier ACL;
- named verifier UID read/search only, with group/other private-stage access forbidden;
- `setgroups([])`, exact real/effective/saved UID/GID checks, `NoNewPrivs=1`, and zero inheritable/permitted/effective/ambient capabilities in every unprivileged child;
- private-stage Git/content verification before ACL removal;
- every temporary verifier ACL removed and reverified before final public-readonly modes;
- final-stage verification under an explicitly reviewed identity;
- create-only no-replace publication and parent fsync under root custody.

Current #3715 still contains dynamic `ctypes.CDLL(None)` native-operation calls. Those remain a separate static-runtime/native-bridge migration gate. The role contract does not authorize replacing or running them.

## Historical account plan is not portable

Historical PR #3754 ended at source head `843759e6bdccc77f722eb0a365d93e1213e4a5cf` on the closed #3748 branch. It selected **no numeric UID/GID** and created no account, but it is **not reusable** as a current #3715 account-selection proof.

Among other reasons, its future identity-selection policy assumed local-files-only NSS. The operator later reported Precision `passwd` and `group` routes containing `files systemd sss`. That is an **operator-reported historical observation, not authenticated current host evidence**, but it is enough to keep the old files-only plan from being promoted as a current-generation acceptance.

A future current-generation account plan must be provider-aware, freshness-bound, and independently reviewed. Until then:

- stage-verifier account name: **null / unselected**;
- stage-verifier UID: **null / unselected**;
- stage-verifier GID: **null / unselected**;
- account provisioned: **false**;
- host apply: **HOLD**.

## Exact source-only proof

Run under a nonroot user on this exact branch:

```sh
python3 -I -B scripts/prove_void_v7_v5_stage_role_separation_contract_v2.py
```

The proof:

- binds all six exact current #3715 installer/proof/doc/workflow Git objects plus the V2 contract and authenticates every pinned worktree input from one retained `O_NOFOLLOW|O_NONBLOCK` descriptor read, with before/open/terminal/visible generation equality, explicit per-path byte caps, exact EOF, and in-process Git-blob recomputation; committed-tree identity remains separately pinned with `git rev-parse`, and no worktree `git hash-object <path>` reopen remains;
- binds the new V2 machine contract;
- parses the current source installer and requires the full 13-line shared-identity inventory;
- verifies root custody before protected copy and confirms the protected copy is not dispatched inside the unprivileged child;
- verifies private digest → verifier ACL → private verification → ACL removal/seal → final verification → no-replace publication ordering, and directly binds `RENAME_NOREPLACE` plus parent-directory `fsync` in the current publication helper;
- requires the current three-operation shared child dispatch to remain visible so a future split cannot be falsely claimed as already implemented;
- requires the current dynamic native ABI to remain visible as a separate HOLD;
- exercises descriptor-bound FIFO/symlink substitution regressions and evaluates **27 synthetic role-policy failures**.

The synthetic verifier UID/GID `123456789/123456790` are intentionally absurd proof-only values. They are not host candidates, production suggestions, system-range values, or account selection. Even the synthetic positive shape returns only `SYNTHETIC_ROLE_SHAPE_ONLY_NOT_HOST_ATTESTED`.

Expected marker:

`VOID_V7_V5_STAGE_ROLE_SEPARATION_CONTRACT_V2_PROOF_GREEN`.

## Authority boundary

This generation changes **no existing installer** and creates no account, group, ACL, stage, receipt, launcher, manifest or runtime. It does not authorize root execution, account selection/provisioning, protected source staging, service mutation, credentials/keys, signing, payments, presale/WC activation, treasury or funds movement.

The next source gate after independent V2 review is a **versioned installer implementation** based on current #3715 that actually separates candidate-owner and private-stage verifier child credentials. Separately, a current provider-aware account-selection/provisioning contract must be accepted before any verifier UID/GID can appear in executable installer source.

**PROTECT THE CORE.**
