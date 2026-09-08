# Buy VOID packaged compiled artifact attestation v1

## Outcome

Bind the accepted #1475 compiled source-finality artifact generation to the **normal production Docker image package** without starting that image or granting deployment/runtime authority.

Accepted upstream generation:

- #1475 exact accepted head: `d4f6517968a0aaf8fd1fa0fe03aed9916dc553fd`
- #1475 merge on `main`: `14036bdfd73cf439f492168c7fa0d67ed31cadf8`
- locked manifest Git blob: `24ea833fbfacab1f38311e4e6d5f401625291882`
- compiled artifact-set SHA-256: `98aaf70a7aa4e45a38e38ab5679a163f58be4211cb4fa81284e1596666ff00d3`

## What this proves

The focused workflow builds the repository's ordinary production `Dockerfile`, creates a stopped container from that image, and copies `/app/dist/economic` out of the stopped container. It never starts or executes the container.

The verifier then requires the six #1475 runtime-closure artifacts in the extracted package to have the exact byte lengths and SHA-256 identities locked by the merged #1475 manifest and re-derives the same aggregate compiled artifact-set digest.

A green result may state:

```text
compiled_artifact_generation_verified=true
packaged_compiled_artifact_generation_verified=true
container_started=false
```

## What this does not prove

A built image package is not a deployed or executing runtime generation. This lane deliberately remains false at:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
live_rpc_activation_authority=false
production_source_finality_authority_ready=false
chain2050_mutation_authority=false
inventory_mutation_authority=false
transaction_authority=false
money_movement_authority=false
```

It does not prove which image, filesystem, process, service unit, host, or runtime is deployed. It does not contact live Base/Ethereum RPC, access credentials, mount a route, restart a service, mutate Chain-2050, reserve inventory, sign/broadcast a transaction, activate the presale, or move funds.

## Exact packaged artifact set

1. `dist/economic/buy_void_source_finality_generation_provenance_v4.js`
2. `dist/economic/buy_void_source_finality_authenticated_composition_v3.js`
3. `dist/economic/buy_void_source_finality_authority_v2.js`
4. `dist/economic/buy_void_source_chain_finality_rpc_adapter_v1.js`
5. `dist/economic/buy_void_payment_rpc_observer_v1.js`
6. `dist/economic/buy_void_verified_payment_v2.js`

The verifier consumes the merged #1475 manifest as the authority for individual byte identities and independently pins that manifest's Git blob and aggregate digest.

## CI contract

The focused workflow has two jobs.

The first rebuilds and re-verifies the locked #1475 compiled generation on Node 22, 24, and 26.

The second uses the normal production Dockerfile on Ubuntu 24.04, verifies that the container remains in Docker's `created` state before and after extraction, and runs the package verifier against copied bytes. The workflow contains an explicit guard rejecting `docker run`, `docker start`, or `docker exec` in this proof.

The workflow triggers on the Dockerfile, Docker context policy, all source/build inputs bound by #1475, the upstream manifest/proof, and every file in this attestation lane.

## Next boundary

After this lane is green and independently reviewed, the next source-finality provenance gap is **deployed/runtime identity**: proving that a designated deployed image/filesystem/process actually corresponds to an accepted packaged generation. That is a separate operator/runtime lane and is not authorized by this PR.
