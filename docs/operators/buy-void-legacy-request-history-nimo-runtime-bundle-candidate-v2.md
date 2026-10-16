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

The candidate builder does not trust a workflow build followed by a later
compiler hash as one atomic provenance statement.

For every V2 candidate creation it:

1. derives the exact four-file TypeScript compiler identity and loader graph;
2. removes only the generated `dist/` build output;
3. invokes the current Node process executable with the exact
   `node_modules/typescript/bin/tsc -p tsconfig.build.json` entry under the
   closed environment:
   `PATH=/usr/bin:/bin`, `LANG=C`, `LC_ALL=C`, `TZ=UTC`,
   `NODE_DISABLE_COMPILE_CACHE=1`;
4. re-derives the complete compiler identity after the build and requires exact
   canonical equality with the pre-build identity;
5. only then derives the 14-file runtime closure from the newly built output.

Therefore the compiler identity in the candidate brackets the actual build that
produced the runtime bytes. A compiler entry/loader/body generation change
during compilation HOLDs rather than becoming an accepted post-build hash.

The candidate builder truthfully declares its generated-build filesystem
mutation; that authority is confined to source/test candidate construction and
does not grant protected Nimo installation.

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
