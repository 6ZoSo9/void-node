# Buy VOID final protected V7/V2 enforcement acceptance lock V5

Marker: `VOID_BUY_VOID_ENFORCEMENT_FINAL_PROTECTED_V7_V2_LOCK_V5`.

Status: **source/CI acceptance of one exact combined range + receipt-custody enforcement identity only**.

## Exact selected candidate

This lock accepts only #3396 candidate head:

`a884c8b69d19523e99da02899ff5fa8ab18e7100`

with exact tree:

`d619ec2bde6076f59f35340cd94fa1c0b190e042`.

Hosted run `38981095232` produced byte-identical Node 22/24/26 V5 candidate
JSON and an independent Node 24 rederivation:

- Node 22 artifact: `12081296713`;
- Node 24 artifact: `12081326032`;
- Node 26 artifact: `12081610318`;
- compare job: `117242335606`;
- full candidate bytes: `25406`;
- full candidate SHA-256:
  `c712aaeeb6ca4b1d7547542f6542c9e58c37291e73662bf4822f9df7a55af50b`;
- full candidate Git blob:
  `b625034452da860b3b6419dd317e642edaa35991`;
- enforcement set:
  `1e31da2afad65e3d1417a4c0f1c8fd9fee903fc3c75af1b93d1db6e2b31f80bf`.

No preview or duplicate V5 candidate is accepted.

## Tracked planner projection

The V7 deployment-receipt verifier requires the lock's
`candidate_evidence.path` to be an exact tracked repository file. The full
25-KiB candidate remains immutable hosted evidence; the tracked bounded
projection is:

`ops/security/buy-void-enforcement-final-protected-v7-v2-candidate-v5-lock-projection-v1.json`

Exact projection identity:

- bytes: `8157`;
- SHA-256:
  `fd0caed2df8b5e727f9f5f24b97f3d353e8267c6cfab70d70d5acafa48846fd0`;
- Git blob:
  `dd849928bc945478a1a8fcf687f374cfca59f4e4`.

The projection contains only the acceptance-bearing fields consumed by the
existing planner plus immutable full-candidate identity:

- candidate head and enforcement set;
- exact 49-row current protected-source inventory;
- complete executable closure verified;
- candidate itself still unaccepted;
- all deployment/runtime/finality/presale/funds authority false;
- exact hosted full-candidate bytes/SHA-256/Git-blob/workflow run.

## Independent full-candidate rederivation

The lock proof never accepts the projection by itself.

For every hosted lock-proof lane it creates a detached worktree at exact
candidate head `a884c8b...`, installs the frozen package lock, typechecks,
builds, and re-executes the exact candidate V5 derivation proof blob:

`80f076711b9c955c494cc70effafc3737b9c9c57`.

The independently rederived full candidate must equal all of:

- 25,406 bytes;
- SHA-256 `c712aaee...af50b`;
- Git blob `b6250344...35991`;
- enforcement set `1e31da2a...f80bf`;
- protected inventory `e7e0625f...b38e3`;
- V7 census identity;
- exact 49-row protected inventory;
- three protected-source deltas with semantic requalification;
- complete executable closure verified;
- candidate identity still unaccepted;
- all runtime/finality/presale/funds authority false.

Every projected protected row and every projected authority field must then
equal the independently rederived full candidate.

## V7 protected census

The accepted V5 identity is rooted in hosted V7 census:

- census ID:
  `voidbefv7c7_1a85dcb768ab6d5348024cec816d82b7f3ac5cc53e738ec2169e78d4021a73a8`;
- JSON SHA-256:
  `326b81bf51fa4efa449b01b6b53e244b1d08dd7ea0d859cafd04954f6f4aa1fb`;
- JSON Git blob:
  `92ca40eb9b7bb79f6b56ad87807dc3586a3ce6ec`;
- protected inventory:
  `e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3`;
- 49 protected paths;
- exactly 3 changed protected identities;
- 46 unchanged protected identities;
- Node 22/24/26 byte identity plus independent Node 24 rederivation.

## Accepted predecessor

Accepted V3 remains immutable historical predecessor:

- lock:
  `ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v3.json`;
- lock Git blob:
  `92054f19fed9e8c243eb23321dbcf53fc9227a99`;
- accepted enforcement set:
  `bf158923831b21dd1e907c91cd4889afbe9fd8bce221e12b0fa1a2bb0896943d`.

V5 records a successor identity; it does not rewrite V3 or historical V4.

## Planner consumption

Hosted CI must prove the existing V7 deployment-receipt installer can consume
the V5 lock through its normal `--plan` path and report the V5 accepted set.

That planner test remains non-mutating:

```text
filesystem_mutation=false
source_mutation=false
service_mutation=false
credential_access=false
wallet_access=false
signing=false
transaction_broadcast=false
chain2050_mutation=false
presale_activation=false
funds_movement=false
```

## Acceptance boundary

Only these facts are promoted by this source lock:

```text
complete_executable_closure_verified=true
current_enforcement_tracked_source_inventory_verified=true
candidate_enforcement_identity_accepted=true
```

These remain false:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

This lock grants no Precision install/apply, service/runtime mutation, RPC,
credential/private-key/wallet/signer access, transaction construction/signing/
broadcast, payment acceptance, presale/WC activation, treasury/liquidity action,
or funds movement.

**PROTECT THE CORE.**
