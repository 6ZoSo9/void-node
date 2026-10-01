# Reviewed Node package runtime v1

Marker: `VOID_REVIEWED_NODE_PACKAGE_RUNTIME_V1`

Issue: #2289.

## Problem

A reviewed Git-object module tree is not a complete JavaScript execution
environment when the modules contain bare package imports such as:

```js
import { TypedDataEncoder } from "ethers";
```

Without another boundary, Node resolves that import through ambient
`node_modules`. The repository can pin `package.json` and
`package-lock.json`, but those metadata files are not the package bytes Node
actually executes.

This contract creates a separate reviewed package-runtime identity and a private
dependency materialization. Authority-bearing reviewed modules can then resolve
bare imports only from those exact reviewed bytes.

## Initial package scope

V1 starts with the root package:

```text
ethers
```

The lockfile closure is derived recursively from lockfile v3 package records,
including required dependencies and installed optional dependencies. Required
peer dependencies must resolve. Optional peers may remain explicitly absent.

The current closure is expected to include:

- `ethers`;
- `@adraffy/ens-normalize`;
- `@noble/curves`;
- `@noble/hashes`;
- `@types/node`;
- `aes-js`;
- `tslib`;
- `undici-types`; and
- `ws`.

The exact closure is still derived from the reviewed lockfile rather than
trusted from this documentation.

## Reviewed repository metadata

Collection requires a clean repository and binds exact current HEAD blobs for:

- `package.json`; and
- `package-lock.json`.

Git inspection uses the absolute system Git binary with replacement-object
semantics disabled and global/system Git configuration excluded from source
authority. Repository status explicitly disables local `core.fsmonitor`,
untracked-cache, index-preload, hooks, attributes-file, and submodule recursion
execution seams. Ambient Git environment variables are not inherited by the
reviewed subprocess.

The working-tree metadata bytes must equal those exact HEAD blobs.

## Installed byte inventory

For every package in the lock-derived closure, collection verifies:

- every lock key is a normalized npm `node_modules/... ` package path with no
  empty, `.`, `..`, backslash, or path-escape component;
- every resolved package base remains strictly inside the reviewed repository or
  private materialization root;
- installed package directory exists as a direct directory;
- installed `package.json` name/version equal the lock record;
- lockfile package version and SHA-512 integrity string are retained;
- every package entry is a stable regular file;
- package symlinks are rejected in v1;
- hard-linked files are rejected;
- per-file and aggregate size/count ceilings are enforced; and
- each file is SHA-256 hashed after a stable bounded read.

A package aggregate is:

```text
sha256(canonical_json(sorted package member records))
```

The full package-runtime aggregate is:

```text
sha256(canonical_json(sorted package summaries))
```

The compact profile therefore binds the exact installed package bytes without
needing to embed every file name/hash in downstream artifacts.

## Private dependency materialization

`materializeReviewedNodePackageRuntimeV1(...)` first recomputes the current
environment and requires it to equal a reviewed profile.

It then copies every verified package file into a caller-selected new private
directory outside the repository, using create-only files. Every source file is
re-read stably and must still equal the collected member hash.

The exported private-tree verifier first validates the profile's complete
self-identity and lock-key path grammar before it traverses any caller-selected
path. It also requires the verified destination root to be strictly outside the
declared repository root, so the ambient repository `node_modules` tree cannot
receive a `PRIVATE_REVIEWED_NODE_PACKAGE_RUNTIME_VERIFIED` result. Custom
`repoRoot` materializations carry that same boundary into post-copy
verification. The copied dependency tree is then inventoried again and must
equal the reviewed profile before the tree is made read-only. If materialization fails and
cleanup also fails, both failures are surfaced as
`reviewed_node_runtime_cleanup_failed`; partial cleanup failure is never
silently swallowed.

A reviewed module materialization can place its source tree beside this private
`node_modules`.

Private materialization **by itself is not execution authority**. Normal Node
package resolution walks ancestor directories and could otherwise fall back to
an unreviewed parent `node_modules` for an optional or missing dependency.

Authority-bearing execution must therefore use:

`runReviewedNodePackageRuntimeV1(...)`

The wrapper:

- re-verifies the private package tree against the reviewed profile immediately
  before execution;
- requires the entry module to be a direct regular file strictly inside the
  private materialization root;
- constructs a minimal explicit child environment instead of copying ambient
  process variables; `LD_PRELOAD`, `LD_LIBRARY_PATH`, `NODE_PATH`,
  `NODE_OPTIONS`, npm prefix overrides, and unrelated tool-option variables
  therefore do not cross the execution boundary;
- launches the current Node executable with the Node permission model enabled;
- grants filesystem-read permission only to the private materialization root;
  and
- denies ancestor package fallback, including optional-peer lookup outside the
  reviewed tree.

The permanent proof demonstrates the boundary with an unreviewed
`bufferutil` package placed in the parent `node_modules`: ordinary unfenced
Node resolves and executes that fixture, while the reviewed wrapper fails
closed with filesystem-read denial before the parent package can execute.

Downstream authority lanes must use the reviewed execution wrapper (or an
equivalently strong confinement primitive) rather than directly invoking
`node <entry>` against the materialized directory.

## Reviewed profile and enforcement

The bootstrap matrix completed successfully on Node 22, 24, and 26 after:

```bash
npm ci --ignore-scripts --no-audit --no-fund
```

All three supported Node majors produced byte-identical profile payloads with:

```text
packages_aggregate_sha256=5ac562a4396ef1d7ec302ef3af4eba7de7f2e62d478ee83fc30814d13d8d3b73
```

The reviewed source profile is now:

```text
ops/security/reviewed-node-package-runtime-ethers-v1.json
```

and, with the final authority boundary that also excludes ambient dynamic-loader
variables, has content ID:

```text
voidrnpr1_1492f01cb202c23ad68260655fa111544d3cc6d6c17a4aa07540e2665c7c9e6d
```

Focused CI is no longer observational. Each Node 22/24/26 job:

1. performs the exact locked install with package scripts disabled;
2. loads the reviewed profile from its exact HEAD Git blob;
3. recomputes the complete installed-byte profile;
4. requires byte-semantic equality with the reviewed profile;
5. materializes and re-verifies the private dependency tree;
6. proves the permission-fenced `ethers` execution path;
7. proves an unreviewed ancestor package is reachable without confinement but
   blocked under the reviewed execution wrapper; and
8. proves ambient Node and dynamic-loader environment overrides do not cross
   the reviewed child-process boundary.

Any supported-major package-byte drift now fails closed instead of creating a
new accepted profile.

## What this does not prove

This contract binds the package bytes executed after a reviewed locked
installation. It does not claim that:

- npm registry publisher identity is inferred from a content hash;
- the currently running Node binary is itself authenticated by this profile;
- package install scripts are trusted or required; or
- an arbitrary existing ambient `node_modules` tree is acceptable.

Install scripts are disabled in the reviewed bootstrap/install command.

## Authority

```text
source_only_dependency_binding=true
exact_head_package_metadata_required=true
lockfile_closure_required=true
installed_package_byte_inventory_required=true
private_dependency_materialization=true
post_copy_inventory_reverification=true
permission_fenced_execution=true
ancestor_package_resolution_forbidden=true
ambient_node_resolution_overrides_ignored=true
ambient_dynamic_loader_overrides_ignored=true

network_access=false
npm_install_performed=false
package_script_execution=false
runtime_service_mutation=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
rpc_call=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
chain2050_write=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

The tool itself performs no package installation or network access. CI is
responsible for the explicit locked installation before collection.
