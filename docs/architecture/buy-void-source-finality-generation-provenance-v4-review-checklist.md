# V4 source-generation provenance review checklist

Review the exact stacked delta only.

- Base must equal #1473 exact head `d72569a749e47243eeed1a9b61a5e9caa06dcc3f`.
- Delta must remain additive and source/proof/docs/CI only.
- V4 operation input must not accept caller source-generation, commit, blob, artifact, or verification claims.
- Reviewed source-file verification must execute before dynamic V3 runtime entry.
- The five reviewed runtime files must match their exact pinned Git blob identities.
- Source paths must be module-derived, regular, non-symlink, read-only and bounded.
- Byte mismatch, unavailable source, identity drift or verification error must HOLD before RPC.
- `reviewed_source_files_verified=true` may mean only the pinned source files matched their reviewed blob identities.
- `source_generation_verified` must remain false until the actual executing artifact is independently bound.
- `deployed_artifact_generation_verified` must remain false.
- `remote_provider_identity_verified`, `ancestry_verified`, `provider_quorum_verified` and `production_source_finality_authority_ready` must remain false.
- No runtime route, wallet, signer, transaction, inventory, Chain-2050, presale activation or funds authority may be introduced.
- Focused V4 proof and preserved V3/#1472/#1471 proofs must pass on Node 22, 24 and 26.
- Repository build and committed-range diff hygiene must pass.

A PASS on this checklist is source-level evidence only. It does not authorize Ready,
merge, deployment, live RPC, signing, inventory funding, public-presale activation,
or funds movement.
