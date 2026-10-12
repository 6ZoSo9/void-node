# Mainnet-0 Public Route Contract v1

Marker: `VOID_MAINNET0_PUBLIC_ROUTE_CONTRACT_V1`

This contract records the post-canonical-tx-hotpath public boundary.

Public remote routes must remain reachable:
- `/health`
- `/__void/ready.json`
- `/mempool/count`
- `/participant`
- `/blocks/latest/number`

Remote-sensitive paths must remain hidden as `404`:
- `/__void/diag/storage-repair-readiness-v1.json`
- `/__void/dev/inspect/sealBlockOnce`
- `/__void/operator/nope`
- `/__void/admin/nope`
- `/__void/participant/wallet/export`
- `/__debug/nope`
- `/dev/routes.json`

Local operator diagnostics remain available over loopback only:
- `/__void/diag/storage-repair-readiness-v1.json`
- `/__void/diag/txsubmit_canonical.json`
- `/__void/diag/txsubmit_canonical_cleanup.json`

Proof command:

```bash
HTTP_HOST=0.0.0.0 HTTP_PORT=4100 P2P_PORT=4700 DATA_DIR=data_a NODE_PRIVKEY_PATH="$HOME/.secrets/nodeA.key" ops/mainnet0/run-public-safe-local.sh

Then, from a second terminal:

HTTP_PORT=4100 ops/mainnet0/public-route-contract-v1-proof.sh

