# Buy VOID post-#2933 enforcement artifact census v1

Marker: `VOID_BUY_VOID_ENFORCEMENT_POST2933_ARTIFACT_CENSUS_V1`.

Status: **source/CI-only artifact census; no enforcement identity acceptance**.

## Purpose

The accepted post-#2865 enforcement lock from #2931 was derived before the V7
same-live-process / provider-observation / checkout integration in #2933.

Exact #2933 source now changes reviewed executable bytes. Re-running the frozen
#2928 candidate proof correctly fails at the first stale artifact
(`buy_void_source_finality_execution_preflight_v1.js`), so a new exact
generation must be derived rather than repinning the historical lock.

This census is the first deliberately non-authoritative step. It records the
current compiled byte identities needed to build a new enforcement candidate.

## Exact parent

The census branch is stacked on:

```text
c8ce2b67b72cd59111a62d9638035a46c6120afa
```

The proof requires that no `src/economic/**`, `package.json`,
`package-lock.json`, or `tsconfig.build.json` bytes differ from that parent.
Only the additive census proof/workflow/docs may differ.

## Reviewed artifact surface

The census includes the historical 23 enforcement artifacts from #2928 plus
four current V7/checkout members:

- `buy_void_source_finality_generation_provenance_v7.js`
- `buy_void_source_finality_live_process_binding_v1.js`
- `buy_void_source_finality_provider_pair_binding_v1.js`
- `buy_void_ethereum_public_checkout_finality_gate_v1.js`

For each of the 27 compiled artifacts it records exact byte length and SHA-256.
For the corresponding TypeScript source files it records byte length, SHA-256
and Git blob identity and requires worktree bytes to equal `HEAD:<path>`.

The workflow compiles with the exact locked TypeScript compiler directly:

```bash
node ./node_modules/typescript/bin/tsc -p tsconfig.build.json
```

It does not execute unrelated post-build helpers.

Node 22, 24 and 26 must emit byte-identical census JSON.

## Reused reviewed inputs

The census verifies that:

- the audited `ethers + express` package profile remains accepted;
- the post-#2865 provider-closure evidence remains the reviewed provider
  generation; and
- #2931's enforcement set remains the *prior* accepted identity.

The provider closure must be semantically requalified again by the later
candidate/lock step because #2933 changes descendant source-finality behavior.

## Deliberate non-claims

A green census explicitly remains:

```text
census_only=true
complete_executable_closure_verified=false
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

The next step after a byte-identical hosted census is a **versioned candidate
derivation** that recomposes package identity, provider semantics, delivery
runtime, dynamic saga edge and the current V7 artifact set. A separate lock is
required after that.

No runtime/service/config mutation, RPC, credentials, keys, wallets, payments,
transactions, Chain-2050/WC mutation, inventory/treasury/liquidity action,
presale activation or funds movement occurs.

**PROTECT THE CORE.**
