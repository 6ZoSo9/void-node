# Buy VOID exact compiled saga loader — inert resolution evidence V1

## Review objective

This disjoint source-only Draft stacks on [#2652](https://github.com/6ZoSo9/void-node/pull/2652)
at exact source commit `dcefd8d7e8d89ce891aec7f0c3ff893699c761be`.
The original saga source initialization AST is already reviewed there; the
parent [#2647](https://github.com/6ZoSo9/void-node/pull/2647) staged the
exact reviewed saga file into a STOPPED candidate Docker image.

Neither prior check establishes what the **real emitted compiled**
`defaultSagaModule()` function does when it uses:
`new Function("specifier","return import(specifier)")`.

This is one small additional falsifiable test of THAT EXACT compiled
factory shape/resolution, never of the actual saga's behavior.

## Fixed source and compiled identities

- Emitted loader: `dist/economic/buy_void_erc20_execution_composition_v1.js`,
  86,455 bytes, SHA-256
  `b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1`.
- Original loader source Git blob:
  `acf2f88b513bbe50e192531f9fc8d261b69bd0f1`.
- Original saga source Git blob: `d6a2d1cd82e5e255f435c1e21d1783774a44b2b1`,
  58,023 bytes. The real saga is ONLY read and hashed, NOT imported.
- Original positive stopped-image Dockerfile Git blob:
  `eb078d25a588e6ba46d46a93326fe20572d9b7fa`.
- TypeScript 5.9.3, locked package inputs and exact parent ancestry required.

The verifier uses the already-reviewed Linux descriptor-relative bounded
file reader to inspect only these source/compiler/compiled inputs. Its
TypeScript AST parser extracts precisely ONE async
`defaultSagaModule()` declaration from the **original compiled output**,
requiring exactly two statements: the canonical literal `new Function`
constructor and a single literal `dynamicImport` return pointing to
`../../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs`.
Changed constructor body, changed import target, changed argument count,
injected statement or nonasync declaration must HOLD.

## Disposable execution of original COMPILED function body

The test writes only the **verbatim AST-extracted function body** into a
disposable `os.tmpdir()/.../dist/economic/compiled_factory_only.mjs`.
It also creates `os.tmpdir()/.../tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs`
as a completely inert synthetic ESM module exporting only a constant marker.
The real reviewed saga file, package executable entrypoint, signer, wallet,
network and installed node are NOT executed or loaded.

Running the synthetic caller under two different working directories must
resolve to the same inert target and return the expected benign marker.
Removing the inert file must fail. Replacing it with a DIFFERENT inert marker
must change the next subprocess's imported value. Restoring the original
marker must pass again. Those tests deliberately show that the generated
function has an out-of-static-closure execution target and that literal
source-path review alone cannot freeze mutable execution-time bytes.

The child Node process runs with an explicitly small environment excluding
parent `NODE_OPTIONS`/preload hooks. A Node 22/24/26 exact-head workflow
builds the actual compiled importer afresh, verifies hash/AST/negative tests,
emits three independent strictly nonaccepted receipts and requires all JSON
bytes to match. No Docker image is started, no live runtime or CLI services
are invoked and no external saga/ethers package is imported by this proof.

## Trust and production authority

This is **candidate-only inert resolution evidence**. The deliberately
TRUE fields `extracted_compiled_factory_shape_verified` and
`exact_compiled_factory_executed_with_inert_tool` refer only to the
*isolated test fixture*, not to execution of the real saga or a deployed
program. All receipt flags for real saga import, invoked exports,
actual stopped-image loader execution, accepted enforcement generation,
packaged/deployed authority, source finality and presale remain FALSE.

A separate review must authenticate actual *stopped/installed image*
resolution under real Node loader context, runtime package dependencies
and execution side-effects, and then integrate the verified V5 enforcement
closure. Original buyer/payment provenance, independent provider quorum,
protected custody high-water, exactly-once allocation and operator principal
authentication remain launch gates.

No Ready, merge, deployment, customer record, real RPC, wallet/key/signer,
transaction, Chain-2050/WC, presale/market, treasury/liquidity or funds action.

**PROTECT THE CORE.**
