# Mainnet-0 Public Node Self-Check Snapshot Contract v1

Marker: `VOID_MAINNET0_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_CONTRACT_V1`

This proof verifies that `/public-node/self-check-snapshot.json` is remotely reachable, machine-readable, read-only, and aligned with the public discovery contracts.

Required public remote path:

- `/public-node/self-check-snapshot.json`

The snapshot must use marker:

- `VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1`

The snapshot must include the core public discovery routes:

- `/public-node`
- `/public-node/route-index.json`
- `/public-node/route-manifest.json`
- `/public-node/self-check-snapshot.json`
- `/public-node/share-link.json`
- `/public-node/tester-bundle.json`
- `/public-node/outside-tester-smoke.json`
- `/proofs`

The snapshot must not advertise sensitive namespaces:

- `/__void/diag/`
- `/__void/dev/`
- `/__void/operator/`
- `/__void/admin/`
- `/__debug/`
- `/dev/`
- `/__void/participant/wallet/export`

The snapshot policy must explicitly expose:

- `public_post_endpoint: false`

Nested proofs:

- public node route manifest contract v1
- public node route index contract v1
- public route contract v1
- public live boundary v1
- canonical tx hotpath v1
