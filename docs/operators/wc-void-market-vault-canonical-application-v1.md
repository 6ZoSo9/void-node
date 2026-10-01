# WC/VOID market-vault canonical application v1

Marker: `VOID_WC_VOID_MARKET_VAULT_CANONICAL_APPLICATION_PLAN_V1`

Status: source-only canonical application preparation. This contract does not
deploy or fund the vault and does not write the canonical production candidate.

## Purpose

A real WC/VOID market vault can be deployed, funded and independently verified
while the canonical production candidate still correctly remains:

```text
market_vault_address=null
market_vault_runtime_code_sha256=null
market_vault_independently_verified=false
inventory_funded=false
inventory_lock_proven=false
```

Issue #2283 defines the explicit source boundary that may prepare those five
canonical fields from exact reviewed live evidence.

This boundary is separate from:

- #2225 role/deployment qualification and the separately authorized live
  deployment/funding operation;
- #2227 fresh read-only at-use verification;
- the other canonical gate applications; and
- #2200 final `coupled_activation_ready` promotion.

## Evidence input

Prepare accepts only:

- exact serialized
  `VOID_WC_VOID_MARKET_VAULT_AT_USE_REVALIDATION_V1` bytes; and
- the SHA-256 of those exact bytes.

The at-use artifact is reverified at its own
`collection_completed_at_utc`. The application therefore proves:

```text
evidence_fresh_at_reviewed_collection=true
application_time_authority=false
```

It does **not** allow a caller to supply a new timestamp and does not claim the
artifact remains fresh at a later launch ceremony. Final launch still requires
its own current preflight.

The reviewed at-use evidence must independently prove:

- current coupled launch identity;
- accepted compiled vault identity;
- reconstructed immutable-patched deployed runtime;
- exact vault address/runtime;
- exact role bindings;
- canonical VoidToken runtime;
- exact 10,000,000 VOID inventory balance;
- inventory lock;
- preactivation state;
- stable Chain-2050 head/timestamp/finality; and
- no deployment/funding/activation/funds authority from the verifier itself.

## Reviewed execution source

This application does not statically import the authority-bearing at-use
verifier or production-readiness classifier.

Before either executes, the tool requires a clean repository and binds exact
`HEAD:<path>` Git blobs for the reviewed execution closure:

- market-vault at-use revalidation;
- runtime attestation;
- runtime-attestation import;
- compiled-identity acceptance;
- compiler identity;
- production readiness;
- opening settlement-adapter review;
- coupled opening;
- `package.json`; and
- `package-lock.json`.

Git replacement objects and Git configuration injection are disabled for the
source reads. Authority-bearing repository Git commands run with a minimal fixed
environment, null global/system config, and explicit command-line overrides for
`core.fsmonitor=false`, hooks, ambient attributes, untracked cache, preload
index and submodule recursion. Canonical origin is read from repository-local
config with includes disabled.

The reviewed market-vault module closure contains two bare `ethers` imports.
Pinning `package.json` / `package-lock.json` proves dependency metadata but
does not prove the package bytes Node executes.

The application therefore also binds the exact reviewed package-runtime tool
and reviewed `ethers` profile from current HEAD:

```text
tools/void-reviewed-node-package-runtime-v1.mjs
ops/security/reviewed-node-package-runtime-ethers-v1.json
```

It re-verifies the reviewed profile against the current locked installation,
materializes the verified 9-package `ethers` closure into a new private tree
outside the repository, then copies the same reviewed market-vault module blobs
plus the reviewed bridge:

```text
tools/void-wc-void-market-vault-reviewed-runtime-bridge-v1.mjs
```

under that same private execution root.

Only the bridge is executed. It exposes two operations:

- `verify_at_use`: invoke the reviewed market-vault at-use verifier;
- `classify_readiness`: invoke the reviewed production-readiness classifier.

Execution uses `runReviewedNodePackageRuntimeV1(...)`, which re-verifies the
private package tree immediately before every child run, enables the Node
permission model, grants filesystem-read permission only to the private
materialization root, removes ambient Node and dynamic-loader overrides, and
prevents ancestor `node_modules` fallback.

The parent application retains all five-field candidate-delta logic. The child
returns JSON-safe verifier/classifier results only.

Every private source/input file is create-only and read-only. The complete
temporary reviewed runtime is removed after execution.

Accordingly the authority contract reports:

```text
verified_modules_loaded_from_exact_git_objects=true
ephemeral_verified_module_materialization=true
reviewed_package_runtime_required=true
reviewed_package_bytes_verified=true
private_reviewed_package_materialization=true
permission_fenced_reviewed_execution=true
ancestor_package_resolution_forbidden=true
ambient_node_resolution_overrides_ignored=true
ambient_dynamic_loader_overrides_ignored=true

execution_network_isolation_provided=false

filesystem_read=true
filesystem_write=true
persistent_artifact_write=false
repository_source_write=false
```

The filesystem write permission here refers only to temporary reviewed module
materialization under Git metadata. It is not a production candidate write,
runtime write, deployment artifact, credential write, or persistent evidence
output.

## Canonical source prestate

The WC/VOID production candidate is read directly from exact clean
`HEAD:ops/mainnet0/wc-void-production-candidate-v1.json` bytes.

The contract is generation-flexible: unrelated canonical gate applications may
land before #2283 as long as the five market-vault live-evidence fields remain
unset and production is still HOLD.

The required prestate is:

```text
status=hold
market_vault_address=null
market_vault_runtime_code_sha256=null
market_vault_independently_verified=false
inventory_funded=false
inventory_lock_proven=false
coupled_activation_ready=false
```

The pre-classifier missing-gate list must contain all five:

```text
market_vault_address_required
market_vault_runtime_code_sha256_required
market_vault_independent_verification_required
inventory_funding_required
inventory_lock_proof_required
```

## Exact five-field delta

The prepared deep-frozen candidate changes exactly:

```text
market_vault_address:
  null -> <verified deployed vault>

market_vault_runtime_code_sha256:
  null -> <verified deployed runtime SHA-256>

market_vault_independently_verified:
  false -> true

inventory_funded:
  false -> true

inventory_lock_proven:
  false -> true
```

Resetting those five values must reproduce the exact input candidate.

No other source field may move.

In particular, the nested
`market_vault_compiled_identity_acceptance` object is intentionally unchanged.
That object is the immutable reviewed **compiled-identity acceptance packet**;
the current production-readiness classifier expects its deployment/funding
booleans to remain the pre-deployment acceptance values:

```text
deployment_attested=false
final_role_bindings_attested=false
deployed_runtime_code_observed=false
inventory_funding_verified=false
inventory_lock_verified=false
```

Live deployment truth belongs in the five top-level fields promoted by this
contract.

## Classifier transition

`classifyVoidWcVoidProductionReadinessV1` is executed from the reviewed Git
object generation both before and after the candidate copy is prepared.

Poststate must remain HOLD.

Its missing-gate list must equal the prestate list with exactly the five
market-vault gates removed, preserving every other missing gate and its order.

Therefore this application cannot silently promote bounded canary, ledger
custody, opening durability, participant control, or final coupled activation.

## Application plan

The content-addressed plan binds:

- exact base HEAD/tree;
- exact application-tool Git blob;
- exact reviewed execution dependency blobs;
- reviewed package-runtime tool/profile Git blobs;
- reviewed package profile ID + package aggregate SHA-256;
- reviewed bridge Git blob and permission-fenced execution boundary;
- exact at-use artifact SHA-256 / revalidation identity;
- evidence collection and validity times;
- source candidate Git blob/SHA-256;
- target candidate Git blob/SHA-256;
- before/after production classifier summaries; and
- the exact five promoted fields.

The tool does not write the candidate.

A later reviewed source commit may apply the prepared candidate bytes.

## Verify applied

`verifyVoidWcVoidMarketVaultCanonicalApplicationV1(...)` requires:

- clean repository, checked without executing repository-local fsmonitor/hooks;
- branch exactly `main`;
- canonical GitHub origin read from local config with includes disabled;
- fixed-URL remote `refs/heads/main` equal to local HEAD;
- application base commit still an ancestor;
- application base tree unchanged;
- reviewed execution-source blobs unchanged;
- application tool blob unchanged;
- current canonical production candidate exactly equal to the planned target
  bytes/blob; and
- the reviewed production classifier to reproduce the planned poststate.

A successful applied-state verification still reports:

```text
coupled_activation_ready=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

## Authority

No RPC is made by this source-application tool. The RPC observations are inside
the already-collected #2227 artifact.

The reviewed Node package runtime is an execution-byte / package-resolution
boundary, not a cross-version network sandbox. Its child execution explicitly
records `execution_network_isolation_provided=false`; this application does
not upgrade that claim.

No deployment, role grant, credential/private-key access, wallet/signer use,
transaction construction/signing/submission/broadcast, Chain-2050 write,
inventory funding/movement, automatic candidate write, market activation,
presale activation, or funds movement is authorized.

Focused proof:

```bash
node scripts/prove_void_wc_void_market_vault_canonical_application_v1.mjs
```
