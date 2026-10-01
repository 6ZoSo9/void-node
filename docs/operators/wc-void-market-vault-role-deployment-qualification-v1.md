# WC/VOID market-vault role and deployment qualification v1

## Purpose

This source-only qualification consumes a fresh reviewed launch-controller
control artifact from merged #2241 and derives the exact current WC/VOID
market-vault role set plus exact constructor/deployment data.

It does **not** select a deployer, observe nonce or fees, build a transaction
envelope, sign, broadcast, deploy, fund inventory, or activate the market.

A green result is:

```text
QUALIFIED_DEPLOYMENT_PREPARATION_READY_NOT_AUTHORIZED
```

## Required live evidence

The launch-controller input must be exact serialized
`VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_EVIDENCE_V1` bytes produced by the
reviewed #2241 contract.

The caller supplies:

- exact evidence bytes;
- independent SHA-256 of those bytes; and
- an explicit Unix evaluation time.

The qualification reruns
`reverifyVoidWcVoidLaunchControllerControlEvidenceV1(...)` at that evaluation
time. Therefore expired, forged, source-drifted, wrong-signer, or wrong-launch
evidence cannot qualify a role.

The qualification itself never accesses a private key and never signs.

## Canonical source binding

Before loading the #2241 verifier, the tool:

- rejects ambient Git repository/config overrides;
- requires the ambient `git` executable to resolve to the reviewed
  `/usr/bin/git` identity;
- requires a clean repository worktree;
- requires reviewed main anchor
  `2dcf6544f373f828347434fd0c6d434334af1658` to be an ancestor of the
  evaluated HEAD;
- requires canonical `6ZoSo9/void-node` origin identity;
- verifies exact `HEAD:<path>` blobs for every reviewed dependency; and
- computes Git blob identities over the actual worktree bytes and requires them
  to match those reviewed blobs.

The exact evaluated HEAD/tree, tool blob/file hash, dependency Git blobs, and
dependency file hashes are recorded in the qualification receipt and rechecked
after qualification.

## Re-derived role identities

### Launch controller

The launch controller is the recovered candidate address from fresh #2241
evidence.

Required #2241 result:

```text
status=CANDIDATE_CONTROL_VERIFIED_ROLE_NOT_AUTHORIZED
control_verified=true
role_binding_authorized=false
deployment_authorized=false
inventory_funding_authorized=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

It must bind the current coupled launch, current accepted compiled vault
identity, and canonical Epoch-2 VOID token.

### Settlement executor

The settlement executor is independently rederived from current canonical Buy
VOID fulfillment-wallet public binding source:

```text
0xc884f631c3881b8b672bfcbf019c856146cd7f73
```

No credential contents or private key are read.

### Closeout controller

The closeout controller is independently rederived from current Sovereign
genesis-append public authorization:

```text
0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b
```

## Role separation

The qualification requires these four addresses to be nonzero and pairwise
distinct:

1. canonical VOID token;
2. launch controller;
3. settlement executor;
4. closeout controller.

A collision fails closed.

## Vault identity and constructor data

The tool revalidates the accepted current `WCVoidMarketVaultV2` identity:

- accepted compiled identity ID;
- contract-source SHA-256;
- exact creation bytecode SHA-256 + keccak256;
- runtime-template SHA-256 + keccak256;
- immutable-layout SHA-256; and
- constructor signature/order.

The reviewed constructor is:

```text
constructor(
  address voidToken,
  address launchController,
  address settlementExecutor,
  address closeoutController,
  bytes32 coupledLaunchId
)
```

The exact accepted creation bytecode is concatenated with ABI-encoded reviewed
constructor arguments. The qualification records:

- constructor values;
- encoded argument hex;
- constructor material SHA-256;
- full deployment-data hex;
- deployment-data byte count;
- deployment-data SHA-256; and
- deployment-data keccak256.

This is deterministic deployment **data identity**, not a transaction.

## Next gate

A green qualification ends at:

```text
separately_authorized_exact_market_vault_deployment_and_inventory_lock
```

A later explicitly reviewed live lane still must select the deployer, establish
nonce/fee truth, construct/sign/broadcast the exact deployment, attest the
deployed runtime/roles, fund exactly the reviewed 10,000,000 VOID inventory,
and prove the preactivation inventory lock.

None of those authorities are granted here.

## Authority boundary

```text
source_qualification_only=true
canonical_git_source_binding_required=true
actual_worktree_blob_binding_required=true
launch_controller_control_reverification=true
settlement_executor_public_identity_rederivation=true
closeout_controller_public_identity_rederivation=true
role_separation_verification=true
constructor_data_derivation=true
reviewed_git_executable_required=true
ambient_git_overrides_rejected=true

credential_content_access=false
private_key_access=false
wallet_or_signer_access=false
rpc_call=false
network_call=false
transaction_envelope_construction=false
transaction_signing=false
transaction_broadcast=false
chain2050_write=false
deployer_selection=false
nonce_observation=false
fee_observation=false
deployment=false
inventory_funding=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

## CLI

The CLI reads a fresh #2241 evidence file from an absolute path outside the
repository and writes one create-only private JSON qualification outside the
repository.

```bash
node tools/void-wc-void-market-vault-role-deployment-qualification-v1.mjs \
  --control-evidence /absolute/control-evidence.json \
  --expected-evidence-sha256 <64hex> \
  --evaluation-time-unix <unix-seconds> \
  --output /absolute/qualification.json
```

## Verification

```bash
node scripts/prove_void_wc_void_market_vault_role_deployment_qualification_v1.mjs
```

The focused proof uses only an ephemeral random test wallet. It does not
exercise or read any production key.
