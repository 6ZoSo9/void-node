# Buy VOID witness runtime-bundle V2 candidate — original V1 preserved

## Why the old CI HOLDS

Source-only [integration Draft #2675](https://github.com/6ZoSo9/void-node/pull/2675)
currently contains a compiled Nimo forced-command witness runtime with
a changed auto-fulfillment module. Its old
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1`
contract pins a historical eight-file runtime source/artifact generation.
The old fixed `voidwfb1_2a7292...` manifest MUST remain immutable: the
historical V1 attestation cannot validate the new compiled bytes.

Independently compared the EIGHT *original source files* between reviewed
historical commit `e390424c1d31cd87dcf3551cc0d2d610a24e12f8`
and current #2675 frozen source commit
`884edc6e82bd505a83e51a44b38f7e318431f314`:
**seven are identical Git blobs**, and only
`src/economic/buy_void_auto_fulfillment_v1.ts` changed, from
`1ac1ad6213be83f1aa8261a554caa91544fe5e09` to
`b7c963b1d55f000d82ad82289b31107b432503de`.
This is a genuine reviewed runtime-code change, not a cosmetic SHA drift.

The source/test/workflow here **does not edit** old V1 constants, prior
manifests, runtime wiring, Nimo, or allocation custody.

## Candidate generation, not acceptance

`scripts/prove_buy_void_witness_runtime_bundle_v2_candidate.mjs`
pins all eight original source Git blobs and all seven original build
inputs and compiler identity. It uses a Linux descriptor-relative bounded
no-follow reader for all source and compiled evidence; every component
is opened relative to a retained parent fd with before/after identity
and a pre-size + 1 read bound.

A separate TypeScript AST inspection starts from
`tools/void-buy-allocation-custody-witness-forced-command-v2.mjs`,
requires **exactly eight** closed runtime files and **eleven** explicit
relative import edges, allows only reviewed Node builtins externally,
and rejects dynamic `import()`, `require()`, `eval()`,
`new Function()`, unexpected compiled entrypaths and unknown external
packages. Source and emitted compiled SHA-256/length records are
independently derived from a locked `npm ci --ignore-scripts` build.

The resulting `voidwfb2_` candidate ID is computed from canonical JSON
over all reviewed inputs, compiled file/edge records, and the immutable
historical manifest ID/SHA. It is NOT precommitted or accepted by the
deriver; three new Node 22/24/26 independent outputs must be byte-identical
before a security reviewer can even consider a separately locked successor.

## Scope and remaining launch requirements

Source/CI candidate only. The JSON explicitly declares
`runtime_bundle_identity_accepted=false`,
`historical_v1_qualified_for_current_source=false`,
`deployed_bundle_verified=false`,
`installed_nimo_witness_verified=false`,
`external_transport_authenticated=false`,
`production_payment_authority_ready=false`,
`production_allocation_mutation_ready=false`,
`presale_activation=false` and `funds_movement=false`.

This is **not** an installer authorization for Nimo, nor a witness-append,
keys/custody move or activated paid checkout. A separately reviewed V2
manifest, installed root-owned 0444 executable bundle with complete
parent-chain and current machine witness lineage, privileged Nimo
deployment/canary, and cross-UID secured custody provenance must follow.

There remain other 11 historical source-generation/CI failures on #2675,
as well as real original-buyer native-USDC/payment finality, append-only
`payment_verified→allocation_reserved`, high-water locks/fencing,
exactly-once reserve/recovery and the coupled WC/VOID market. No successful
synthetic proof removes those launch HOLDs.

No merge/Ready, runtime/service, wallet/key/signer, real customer payment
or ledger, Chain2050/WC, presale/market, treasury/liquidity or funds action.
**PROTECT THE CORE.**
