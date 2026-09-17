# Packaged compiled artifact attestation v1 review checklist

Review only the additive packaged-artifact proof lane.

- The PR must be based on the post-#1475 `main` generation `14036bdfd73cf439f492168c7fa0d67ed31cadf8`, unless a later current-main synchronization is separately reviewed.
- The merged #1475 manifest must remain Git blob `24ea833fbfacab1f38311e4e6d5f401625291882`.
- The accepted #1475 compiled artifact-set SHA-256 must remain `98aaf70a7aa4e45a38e38ab5679a163f58be4211cb4fa81284e1596666ff00d3`.
- The verifier must require exactly the six #1475 source-finality compiled artifact paths, in the locked order.
- Every extracted artifact must be a regular non-symlink file with exact byte length and SHA-256 identity matching the merged #1475 manifest.
- The verifier must independently re-derive the same #1475 aggregate digest using the same canonical payload.
- The ordinary production `Dockerfile` must be built; this lane must not introduce a special proof-only production image.
- The container used for extraction must remain stopped (`State.Status=created`, `State.Running=false`) before and after `docker cp`.
- The focused workflow must not use `docker run`, `docker start`, or `docker exec`.
- The Node 22/24/26 job must preserve the merged #1475 compiled-generation proof.
- The workflow must trigger on `Dockerfile`, `.dockerignore`, all #1475 source/build inputs, the #1475 manifest/proof, and this lane's files.
- Committed-range diff hygiene must pass.
- `packaged_compiled_artifact_generation_verified=true` must not be relabeled as deployed/runtime identity.
- `deployed_artifact_generation_verified`, `runtime_mount_authority`, `live_rpc_activation_authority`, and `production_source_finality_authority_ready` must remain false.
- No external RPC, deployment/restart, service mutation, credential/key/wallet/signer access, transaction, Chain-2050 mutation, inventory/presale mutation, treasury/liquidity action, or funds movement may be introduced.

A PASS establishes package membership/byte identity for the ordinary production image only. It does not establish which artifact is deployed or executing.
