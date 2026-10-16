# Buy VOID — combined range and receipt-custody protected candidate V5

Status: **unaccepted source/CI candidate**, not an enforcement lock, not a live release.

## Frozen ancestry and evidence

This successor is stacked on the exact combined protected source census V7 in
draft #3392 (`a1fcc7be0f2f4a6b19f8fa5e199eb81f54615613`), which in turn is
stacked on combined range + custody PR #3388. The protected V7 census source is
pinned by Git blob `de759d8ec37795001865c30aba6f3f9c8ac9fd33`;
its CI workflow is pinned by blob `8910b169e34652bbadacb43cba4af23793653f57`.

Hosted census workflow [38978991081](https://github.com/6ZoSo9/void-node/actions/runs/38978991081)
passed Node 22, 24, 26 and fourth independent Node-24 rederivation:

- Census ID:
  `voidbefv7c7_1a85dcb768ab6d5348024cec816d82b7f3ac5cc53e738ec2169e78d4021a73a8`.
- Hosted canonical JSON: 26,911 bytes, SHA-256
  `326b81bf51fa4efa449b01b6b53e244b1d08dd7ea0d859cafd04954f6f4aa1fb`.
- Protected inventory canonical SHA-256
  `e7e0625ff47dc4b4c7e0f93e4b75be30d04d9538acc233174c0abc18198b38e3`.
- Frozen V2 baseline: exactly **49 source paths**, with **3 reviewed deltas**
  (custody installer, canonical live runner, `src/index.ts`) and **46 unchanged**.

The candidate re-executes V7 census at its own exact HEAD; its current
census ID is therefore a new generation. It binds the hosted accepted
*inventory identities* and revalidates all 49 sources/modes instead of
incorrectly claiming the hosted census head is the candidate head.

The protected V3 acceptance lock (blob
`92054f19fed9e8c243eb23321dbcf53fc9227a99`) remains a historical
predecessor only. Historical V5, V6 and V4 evidence are never rewritten
or silently marked current.

## Receipt-custody change

Source is bound byte-for-byte to reviewed custody-only PR #3386:

- Installer:
  `72dec8920c1a7177d353400c33b71c2de2562aba`.
- Fixture proof:
  `d74aa53bc8ee87581de748d7d0fc57ffa0b13944`.
- Operator documentation:
  `32dbc7a69187a09c5cd7fe27ed5481463a157a8f`.

The current 49-path enforcement list must be identical to the previous
reviewed generation except the exact installer transition
`3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0` →
`72dec8920c1a7177d353400c33b71c2de2562aba`.
The other 48 paths are independently unchanged relative to the previously
reviewed current-enforcement parent. The full three-change transition is
separately verified by the V7 census.

The earlier root fixture hosted workflow and job IDs are recorded as
source-evidence lineage, **not** as live protected host authority. This
candidate does not execute a privileged host mutation or root fixture
again; `hosted_root_fixture_reexecuted=false`.

## Executable closure and hosted derivation

Each hosted Node 22/24/26 run typechecks and builds the reviewed 28-artifact
economic closure, checks 28 source identities against accepted hashes, checks
provider/current semantic closure and historical accepted V3/earlier locks,
and derives the candidate twice, requiring byte identity. The compare job
requires the three hosted receipts to match and performs a fourth independent
Node 24 build and rederivation of the exact candidate JSON.

## Explicit HOLD

Even a GREEN derivation leaves these **false**:

- `candidate_enforcement_identity_accepted`
- `deployed_artifact_generation_verified`
- `runtime_mount_authority`
- `production_source_finality_authority_ready`
- `public_presale_activation`
- `funds_movement`

It authorizes no Precision install, node/service/runtime mutation, RPC
contact, credentials, signing, transaction, customer payment acceptance,
public presale/WC activation, treasury or liquidity action.

Keep draft until focused CI, independent cross-node comparison, exact
source review, and a **separate V5 acceptance-lock proposal**. A future
canonical merge needs its own post-merge source-generation proof. The
historically failing old-generation workflows remain visible fail-closed
evidence; do not pin them forward or weaken their checks.

**PROTECT THE CORE.**
