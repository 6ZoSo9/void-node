# Buy VOID legacy-history Nimo runtime-bundle candidate v2

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_NIMO_RUNTIME_BUNDLE_CANDIDATE_V2`.

Status: **source/test/CI candidate only; candidate identity unaccepted**.

## Purpose

V2 closes post-merge tracker #3248 without rewriting merged V1 history.

Historical evidence remains immutable:

- merged V1 candidate: #3244 / merge `357a406c5a5a6075937d8801ebd76d47205e48d8`;
- merged V1 lock: #3246 / merge `be7693b93152c9674d0ab585ca915678e3ddc82b`.

Those generations proved the 14-file package-free runtime closure and
cross-Node candidate determinism, but their compiler record omitted bytes that
are executed before the already-bound compiler bodies. They are retained as
historical evidence only and must not be silently repinned as current install
authority.

V2 preserves the accepted #3239 installation-plan boundary and the exact
14-file runtime closure. It changes only the runtime-bundle evidence generation
needed to bind the compiler CLI entry chain.

## Exact compiler execution boundary

Hosted compilation remains exactly:

```text
node node_modules/typescript/bin/tsc -p tsconfig.build.json
```

The installed and lockfile TypeScript version must remain exactly `5.9.3`.

V2 requires the compiler identity to contain this exact ordered file set:

1. `node_modules/typescript/bin/tsc`;
2. `node_modules/typescript/lib/tsc.js`;
3. `node_modules/typescript/lib/_tsc.js`;
4. `node_modules/typescript/lib/typescript.js`.

Each record binds exact byte length plus SHA-256. The first three are the
reviewed CLI entry/loader/compiler execution lineage; the historical
`lib/typescript.js` identity remains bound as an additional compiler-body
dependency rather than being silently dropped.

The CLI loader graph is closed:

```text
bin/tsc --require("../lib/tsc.js")--> lib/tsc.js
lib/tsc.js --require("node:module")--> Node builtin compile-cache API
lib/tsc.js --require("./_tsc.js")--> lib/_tsc.js
```

The `node:module` edge is intentional: current TypeScript enables Node's
compile-cache API before loading the real compiler. It is a reviewed builtin
loader dependency, not a repository file.

For the two loader files, every syntactic `require(` call must be a static
string literal. Their complete ordered static require-specifier lists must equal
those three reviewed edges exactly. Dynamic or additional loader targets HOLD.

## Candidate-owned compiler execution

The candidate builder does not execute the compiler by reopening mutable
checkout paths after an endpoint hash.

For every V2 candidate creation it:

1. derives the exact four-file TypeScript compiler identity and loader graph
   from the checkout;
2. inventories the complete installed `node_modules/typescript` package tree,
   binds the lockfile `sha512` integrity plus deterministic path/size/SHA-256
   tree digest/count/bytes, and copies the complete package into a fresh private
   temporary snapshot; the four executable JS files retain their independent
   hardcoded byte identities;
3. creates the snapshot under fixed root-owned sticky `/tmp`, finalizes all
   snapshot directories mode `0555` and files mode `0444`, then uses fixed
   passwordless-sudo + `/usr/bin/chown` to transfer the complete snapshot to
   `root:root`; the unprivileged candidate-builder UID must have no direct
   chmod/write/unlink authority over that generation;
4. re-derives the exact root-custodied snapshot identity before execution;
5. removes only the generated `dist/` build output;
6. invokes the current Node process executable against the **snapshot**
   `bin/tsc`, not the checkout `bin/tsc`, under the closed environment
   `PATH=/usr/bin:/bin`, `LANG=C`, `LC_ALL=C`, `TZ=UTC`,
   `NODE_DISABLE_COMPILE_CACHE=1`;
7. rechecks exact root UID/GID custody, `0555/0444` modes, single-link files,
   complete package identity, and the exact four-file snapshot identity;
8. re-derives the checkout compiler identity and requires exact canonical
   equality with the pre-snapshot generation;
9. only then derives the 14-file runtime closure from the newly built output;
10. removes the root-owned proof snapshot through fixed passwordless-sudo +
    `/usr/bin/rm`.

The candidate records a deterministic content-addressed
`compiler_snapshot.snapshot_id` over the exact compiler identity, package-lock
integrity, complete TypeScript package-tree digest/count/bytes, and reviewed
snapshot policy. The random temporary path is never candidate
material, so Node 22/24/26 can still produce byte-identical candidate JSON.

The complete package snapshot is required because `tsconfig.build.json` uses
`lib: ["ES2022", "DOM"]`; TypeScript resolves those standard-library inputs
relative to its own `lib/` directory. Executing a four-JS-file snapshot while
reopening `.d.ts` files from the checkout would leave a second mutable compiler
input path.

The focused proof includes two coupled ABA adversaries. After root custody is
established, the original unprivileged builder attempts to chmod, append to, and
unlink the exact snapshot compiler entry; every direct mutation must fail. It
then replaces the mutable checkout `bin/tsc` with a deliberately failing
compiler for the complete build interval, restores the reviewed checkout bytes
before final source revalidation, and requires the build to succeed from the
unchanged root-custodied snapshot. This closes both mutable-path reopening and
same-UID chmod/substitute/restore schedules inside the reviewed proof threat
model. Separate root authority remains trusted proof infrastructure.

The root-custodied snapshot is source/test execution infrastructure only.
Production Nimo installation remains separately unauthorized.


## Candidate verification

Candidate self-consistency is not authority.

The verifier re-reads the current checkout and independently rebuilds:

- the exact #3239 parent plan/source-root identity;
- the exact 14-file package-free runtime import graph;
- all runtime byte hashes;
- the exact ordered four-file TypeScript compiler identity;
- the exact three loader edges.

A resealed candidate with a changed CLI-entry hash, changed loader hash, or
changed loader edge is rejected even when its candidate ID is recomputed.

The V2 candidate ID is content-addressed as `voidblrhnrb2_<sha256>`.

## Hosted qualification

Node 22, 24 and 26 each perform the locked dependency install and an
external build smoke check, then the V2 proof/candidate path independently
performs its own compiler-bracketed rebuild before deriving runtime bytes.

The workflow requires byte-identical candidate JSON across all three Node
majors. A separate V2 lock is required after exact hosted evidence and review.

## Preserved runtime boundary

The runtime bundle remains exactly fourteen files:

- five tracked legacy-history `.mjs` modules;
- seven compiled `dist/economic/*.js` modules;
- two compiled `dist/security/*.js` modules.

Runtime imports remain restricted to relative paths inside that closure or
explicit `node:` builtins. Dynamic import, `require()` runtime loading,
third-party runtime packages, and node_modules runtime files remain forbidden.

The parent authorized-key plan remains unchanged: a future materialized entry
must use exactly `restrict,<exact forced command>` with no additional,
reordered, duplicated, or capability-reenabling options.

## Authority boundary

Even exact-head GREEN keeps all of the following false:

- `runtime_bundle_candidate_accepted`;
- `runtime_bundle_lock_created`;
- `protected_runtime_install_authorized`;
- `live_nimo_installed`;
- `authorized_keys_mutation_authorized`;
- `public_key_selected`;
- `external_transport_authenticated`;
- `witness_read_performed`;
- `witness_append_performed`;
- `sovereign_signing`;
- `payment_acceptance`;
- `public_presale_activation`;
- `wc_void_market_activation`;
- `funds_movement`.

No Nimo/SSH/filesystem/authorized_keys mutation, runtime installation, witness
read/append, private-key access, signing, payment, transaction, presale/WC
activation, treasury/liquidity action, or funds movement is authorized.

Next gate after accepted V2 hosted derivation:

`void_buy_void_legacy_history_nimo_runtime_bundle_lock_v2`.

PROTECT THE CORE.


## Immutable build-input provenance

Candidate-owned compilation now executes against a second private snapshot in
addition to the root-custodied TypeScript compiler snapshot.

The build-input snapshot binds the 15-file transitive TypeScript program used by
the nine compiled runtime files, plus reviewed `package.json`,
`package-lock.json`, and `tsconfig.build.json`. The only compiler type
packages admitted into the snapshot are the exact locked
`@types/node@22.18.12` and `undici-types@6.21.0` trees.

A deterministic derived tsconfig extends the reviewed build config, fixes the
program to those 15 files, and fixes the type set to `node`. Project source,
config, and type-package bytes are copied into a private `/tmp` snapshot,
then finalized root:root with 0555 directories and 0444 files before TypeScript
executes. The ordinary candidate-builder UID cannot chmod, replace, unlink, or
rewrite those inputs during the build.

Compilation uses the root-custodied compiler snapshot and the root-custodied
build-input snapshot simultaneously. Both immutable snapshots and the mutable
checkout source/package endpoints are revalidated after execution.

The focused proof now substitutes and later restores both a source file and
`tsconfig.build.json` after snapshot creation, while also attempting direct
chmod/write/unlink against the snapshot. Emitted JavaScript must remain bound to
the immutable reviewed snapshot generation.

This closes the source/config ABA class without granting Nimo contact,
installation, witness access, signing, payment, transaction, presale/WC, or
funds authority.
