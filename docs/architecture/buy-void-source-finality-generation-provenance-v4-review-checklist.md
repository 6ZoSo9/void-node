# V4 source-generation provenance review checklist

Review the exact stacked delta only.

- Current PR base must equal #1473 stack-synchronized head `1babf2a78d4f2cef0425135011b51ebf3d3dbeea`.
- The reviewed V3 source generation may remain pinned to `d72569a749e47243eeed1a9b61a5e9caa06dcc3f` only if the current #1473 base still carries the exact pinned V3 Git blob identity.
- Delta must remain additive and source/proof/docs/CI only.
- V4 operation input must not accept caller source-generation, commit, blob, artifact, or verification claims.
- Reviewed source-file verification must execute before dynamic V3 runtime entry.
- The five reviewed runtime files must match their exact pinned Git blob identities.
- Source paths must be module-derived, regular, non-symlink, read-only and bounded.
- Both source execution and the normal compiled `dist/economic` layout must resolve the same reviewed `src/economic` file set.
- Byte mismatch, unavailable source, module-layout drift, identity drift or verification error must HOLD before RPC.
- `reviewed_source_files_verified=true` may mean only the pinned source files matched their reviewed blob identities.
- `source_generation_verified` must remain false until the actual executing artifact is independently bound.
- `deployed_artifact_generation_verified` must remain false.
- `remote_provider_identity_verified`, `ancestry_verified`, `provider_quorum_verified` and `production_source_finality_authority_ready` must remain false.
- No runtime route, wallet, signer, transaction, inventory, Chain-2050, presale activation or funds authority may be introduced.
- Focused V4 proof and preserved V3/#1472/#1471 proofs must pass on Node 22, 24 and 26.
- Each Node 22/24/26 dedicated job must build the repository and prove the compiled V4 module can verify the reviewed source files from the normal `dist/economic` layout.
- Repository build and committed-range diff hygiene must pass.

A PASS on this checklist is source-level evidence only. It does not authorize Ready,
merge, deployment, live RPC, signing, inventory funding, public-presale activation,
or funds movement.
