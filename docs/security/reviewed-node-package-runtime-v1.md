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

Git inspection uses the system Git binary with replacement-object semantics
disabled and global/system Git configuration excluded from source authority.

The working-tree metadata bytes must equal those exact HEAD blobs.

## Installed byte inventory

For every package in the lock-derived closure, collection verifies:

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

The copied dependency tree is inventoried again and must equal the reviewed
profile before the tree is made read-only.

A reviewed module materialization can place its source tree beside this private
`node_modules`. Bare imports then resolve from the private reviewed package
runtime rather than the repository's ambient ignored dependency tree.

## Bootstrap and profile pinning

The first Draft generation intentionally runs a bootstrap matrix after:

```bash
npm ci --ignore-scripts --no-audit --no-fund
```

on Node 22, 24, and 26.

The proof prints:

```text
packages_aggregate_sha256=...
profile_id=voidrnpr1_...
PROFILE_BASE64=...
```

No aggregate becomes source authority merely because one runner printed it.

The reviewed profile
`ops/security/reviewed-node-package-runtime-ethers-v1.json` is added only
after the three supported Node majors produce the same Linux-x64 package
profile. If legitimate environments differ, the profile format must enumerate
the accepted variants explicitly instead of accepting arbitrary installed
bytes.

Once the profile is pinned, CI switches from bootstrap observation to
fail-closed verification/materialization against that exact profile.

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
