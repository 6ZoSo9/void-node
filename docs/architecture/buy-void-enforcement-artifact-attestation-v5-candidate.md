# Buy VOID enforcement V5 source-only derivation candidate

## Purpose and current lineage

This Draft derives an **unaccepted enforcement V5 candidate** from current
runtime V6 bridge #2638 at exact stabilized source parent
`eeef850affd912a0d1e019bfac2d681b38ea24ed`.

The predecessor V6 source parent
`3533626d7167c98ba8d65d2c423b460b1a3199fc` remains historical evidence. The successor rebind is
required because the integration Dockerfile moved from package-manager fallback
to deterministic `RUN npm ci`; the three authority-bearing source fingerprints
listed below are byte-identical across that transition.

Historical enforcement V1/V4 and source-finality V3/V5 attestations remain
immutable. They are predecessor evidence, not values to repin.

Current source identities bound by the candidate:

- execution preflight:
  `b61615c8b928a95c33100878ca70aa147abad103`;
- V6 source-finality:
  `e7ac4c296930587e7b7ec415e57bb18190c88962`;
- finalized V2 verifier:
  `c77bb6144b27eb8fdaff168200cea24d9c0ee9ac`;
- current locked compiled V4 manifest:
  `a07f2e9b03958a58280c4d940fe49097a9413af5`;
- locked compiled generation:
  `7e767d9e8977052220c60ab1e0e4c6411259aa3cfeadb7f073270ce4d2d7af06`.

The old enforcement V4 set
`854fa637d25f0931c37d5d35fda641adb38ad1f55ca23b2662fb97d42a262a7b`
remains historical and is expected to reject the changed runtime closure.

## Static closure and dynamic tool boundary

The candidate walks the statically reachable compiled
`dist/economic` graph from
`buy_void_delivery_runtime_integration_v1.js` using TypeScript AST.

Static relative imports must stay inside the reviewed economic graph; package
externals are allowlisted. Historical source-finality V4/V5 compiled modules
must not remain reachable and V6 must be reachable.

The actual runtime also contains the reviewed code-generated form:

`new Function("specifier", "return import(specifier)")`

paired with a literal Buy VOID tool target. This edge is recorded only as
**unqualified dynamic-tool census evidence**. It does not make the executable
closure complete. Therefore the candidate requires:

`dynamic_tool_execution_identity_verified=false`
`dynamic_tool_transitive_closure_verified=false`
`complete_executable_closure_verified=false`
`no_dynamic_unknown_imports=false`.

## Dynamic-loader alias repair

The scanner fails closed on direct, assigned, destructured, computed and
aliased references to `require`, `createRequire`, `eval` and
`Function`, except for the one exact reviewed Function-constructor form
above.

The reviewed runtime root legitimately uses only two direct global-state
entry shapes:

- `globalThis[GLOBAL_DEPENDENCIES]`;
- `const globalState = globalThis`, followed only by
  `globalState.__void_http_app` or `globalState.app`.

Those shapes are admitted only in the exact reviewed entry artifact. Other
direct or aliased `globalThis/global/window/self` references remain HOLD.
Synthetic negatives cover computed eval/Function aliases, direct aliases,
assignment aliases, `.bind`, destructuring and misuse of the reviewed
`globalState` alias.

## Ancestor-safe source reads

The earlier reader checked ancestor pathnames and later reopened a full path;
leaf-only `O_NOFOLLOW` could not stop a swapped symlink ancestor.

The candidate now uses the separately qualified Linux descriptor-relative
reader from #2643. It:

- opens the trusted root using `O_DIRECTORY|O_NOFOLLOW`;
- retains each directory fd;
- opens every child through
  `/proc/self/fd/<retained-parent-fd>/<component>`;
- opens the leaf relative to the retained final directory fd;
- binds visible path and fd identity before/after;
- reads at most preflight size + one sentinel byte.

Disposable tests cover ancestor replacement before directory open, ancestor
replacement before leaf open, concurrent multi-megabyte growth and restored
positive reads. This is a Linux/procfs CI trust model, not authority for an
arbitrary hostile operator host.

## Reviewed Git execution

Source ancestry/diff checks no longer invoke ambient `git` through caller
`PATH`. The candidate uses the reviewed helper from #2648:

- absolute `/usr/bin/git`;
- root-owned, executable, nonsymlink, non-group/world-writable binary check;
- fixed child environment excluding caller Git/loader configuration;
- disabled hooks, fsmonitor and external diff.

Synthetic tests install a hostile PATH Git shim and hostile Git/loader
variables and require the real Git binary, valid ancestry, invalid ancestry
HOLD and changed-source diff HOLD.

## Three-node evidence contract

Node 22, 24 and 26 each:

1. syntax-check the candidate and trust helpers;
2. run descriptor-relative reader adversaries;
3. run reviewed-Git adversaries;
4. install locked dependencies and build;
5. run the enforcement candidate self-test;
6. prove the V6 signer/broadcast preflight remains fail-closed;
7. derive an authority-false JSON candidate.

The cross-node job requires complete byte equality.

## Authority boundary

This is still a diagnostic/derive-only candidate. It must keep:

`candidate_identity_accepted=false`
`dynamic_tool_execution_identity_verified=false`
`dynamic_tool_transitive_closure_verified=false`
`complete_executable_closure_verified=false`
`deployed_artifact_generation_verified=false`
`runtime_mount_authority=false`
`production_source_finality_authority_ready=false`
`presale_activation=false`
`funds_movement=false`.

The actually reachable dynamic saga tool, its transitive execution graph,
final-image packaging, deployment identity, authenticated original buyer and
payment, protected custody high-water and exactly-once allocation recovery
remain later gates.

No live RPC, customer record, credential, wallet/signer, service deployment,
transaction, Chain-2050/WC mutation, inventory/treasury/liquidity, presale
activation or funds movement is performed here.

**PROTECT THE CORE.**


## Current V6 source-anchor successor

The enforcement V5 candidate now binds current stabilized integration commit
`eeef850affd912a0d1e019bfac2d681b38ea24ed` and V6 source blob
`e7ac4c296930587e7b7ec415e57bb18190c88962`. That V6 source advances its
reviewed payment-observer identity after bounded total-response deadline
hardening. This does **not** rewrite the historical locked compiled-V4 manifest
or its generation `7e767d9e8977052220c60ab1e0e4c6411259aa3cfeadb7f073270ce4d2d7af06`;
those remain immutable predecessor evidence. The candidate still derives a new,
unaccepted enforcement V5 closure from the current reviewed source stack.
