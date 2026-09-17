# V4 source-generation provenance review checklist

Review the exact repaired delta only.

- Current PR base must be current `main` after #1473 merge: `505364d42cf34e59c2ecca6865bc640d4f6323d3`.
- The reviewed V3 source generation must be pinned to semantic source commit `3ab4b2ace3f3cf5a8d6f33ef9a0b21926be46962` and Git blob `a3dbe4d0fed3034d3ca2c0b3704a758d7c776090`.
- The reviewed V2 authority generation must be pinned to semantic source commit `70a12eeb30c5beb2f05e789bab9e75b57cc50e4d` and Git blob `64953050d74bc0bc6d1e6948ae992d6143edca99`.
- V4 operation input must not accept caller source-generation, commit, blob, artifact, or verification claims.
- The total operation deadline must start before reviewed-source verification and dynamic V3 import.
- V4 must pass only the remaining original budget into V3; it must not restart the original timeout after preflight.
- V4 must recheck the original deadline after V3 returns before successful projection.
- The dedicated preflight-deadline regression must consume the source-verification budget and HOLD with `source_finality_total_deadline_exceeded` before V3/RPC entry.
- Reviewed source-file verification must execute before dynamic V3 runtime entry.
- The five reviewed runtime files must match their exact pinned Git blob identities.
- Source paths must be module-derived, regular, non-symlink, read-only, single-link, stable across the read, and bounded.
- Both source execution and normal compiled `dist/economic` execution must resolve the same reviewed `src/economic` file set.
- Byte mismatch, unavailable source, module-layout drift, identity drift, or verification error must HOLD before RPC.
- The final production Docker image must contain exactly the five reviewed source files required by compiled V4 under `/app/src/economic`.
- The Node 24 dedicated job must build the production image and run the compiled V4 source verifier inside that final image; packaged verification must succeed for all five reviewed files.
- The V4 pull-request workflow must trigger on V4 source/proofs/docs/workflow, `Dockerfile`, and every one of the five pinned runtime-source paths.
- The V4 workflow must preserve both repaired V3 proofs: ordinary composition and truncated-response fail-closed regression.
- The V4 workflow must also preserve repaired #1472 authority behavior and #1471 finalized-source observation behavior.
- `reviewed_source_files_verified=true` may mean only that the pinned source files matched their reviewed blob identities.
- `source_generation_verified` must remain false until the actual executing compiled/deployed artifact is independently bound.
- `deployed_artifact_generation_verified` must remain false.
- `remote_provider_identity_verified`, `ancestry_verified`, `provider_quorum_verified`, and `production_source_finality_authority_ready` must remain false.
- No runtime route, live external RPC, wallet, signer, transaction, inventory, Chain-2050, presale activation, treasury/liquidity, or funds authority may be introduced.
- Focused V4 proof, preflight-deadline proof, preserved V3 proofs, repaired #1472 proof, and #1471 proof must pass on Node 22, 24, and 26.
- Each Node 22/24/26 dedicated job must build the repository and prove the compiled V4 module can verify the reviewed source files from the normal checkout layout.
- Repository `CI` must pass on the same exact PR head.
- Committed-range diff hygiene must pass.

A PASS on this checklist is source/package-level evidence only. It does not establish deployed JavaScript identity or authorize deployment, runtime mount, live external RPC, signing, inventory funding, public-presale activation, or funds movement.
