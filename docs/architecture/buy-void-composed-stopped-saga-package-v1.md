# Buy VOID composed V6 saga stopped-image package candidate

## Purpose

This Draft rederives the positive saga package evidence from the current
composed enforcement lineage instead of inheriting historical #2647.

Exact parent: `3fcfc169ffa2e5eee0f9542ea5b761cb32ef7117` (#2660).
That parent is cross-Node green for the composed dynamic-tool source census
and still records the saga target as execution-unverified.

## Exact source change

The final production Docker stage adds exactly one reviewed tool copy:

```Dockerfile
COPY --from=build /app/tools/buy-void-crash-consistent-fulfillment-saga-v1.mjs ./tools/
```

Current Dockerfile Git blob: `15375dfb34bc457ac57865ae07642b5602f9e958`.
No broadcaster/custodian service tool and no blanket `/app/tools` copy is added.

Reviewed saga identity:
- Git blob `d6a2d1cd82e5e255f435c1e21d1783774a44b2b1`
- 58,023 bytes
- SHA-256 `e94b2c5c2da0a4849acab936d0d7f8710f2d2229909d73bc679a83c63f777e01`

Reviewed compiled importer identity:
- `dist/economic/buy_void_erc20_execution_composition_v1.js`
- 86,455 bytes
- SHA-256 `b243a1611bceff0a7d758aeaaebf4e74c2bad6b762595ff0e13804e11b5c2af1`
- source Git blob `acf2f88b513bbe50e192531f9fc8d261b69bd0f1`

These identities are taken from the exact composed V5 enforcement candidate
and #2660 source census, not from a historical package PR.

## Source-read and ancestry boundary

The proof reuses the parent reviewed descriptor-relative Linux reader and
sanitized absolute `/usr/bin/git` helper. It retains directory descriptors,
uses `O_NOFOLLOW`, bounds leaf reads, rechecks path/descriptor identity,
requires #2660 to remain an ancestor, and rejects drift in the importer,
saga source, package/lock, and TypeScript build inputs.

## STOPPED image proof

Node 22/24/26 run the source candidate and substitution/missing-file negatives.
A separate Node 24 job builds the exact PR head and uses `docker create` only.
It never calls `docker run` or `docker start`. It verifies the container stays
`created`, non-running and mount-free before and after extracting `/app/tools`
and the compiled importer.

The stopped image must contain the exact reviewed saga bytes and exact compiled
importer while the broadcaster and custodian service tools remain absent.
The real saga is never imported or executed.

## Authority boundary

Even a green result keeps these false:

```text
real_saga_module_imported=false
real_saga_module_executed=false
real_saga_exports_invoked=false
executed_saga_loader_qualified=false
dynamic_tool_transitive_closure_verified=false
complete_executable_closure_verified=false
tool_runtime_side_effects_reviewed=false
image_generation_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
presale_activation=false
funds_movement=false
```

Historical #2652 AST and #2655 inert-loader evidence remains useful but was
not derived from this exact composed parent. It must be requalified before
any executable-closure or enforcement acceptance claim.

No service is started or installed; no operator credential/customer ledger is
read; no wallet/key/signer, payment, transaction, Chain-2050/WC, inventory,
treasury/liquidity, presale/market or funds action occurs.

**PROTECT THE CORE.**
