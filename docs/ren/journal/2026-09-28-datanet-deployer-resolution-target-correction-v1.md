# DataNet deployer-resolution target correction v1

Marker: `VOID_DATANET_REGISTRY_DEPLOYER_RESOLUTION_TARGET_CORRECTION_JOURNAL_V1`

On 2026-09-28, the first live Precision deployer-resolution pass HOLDed after
exactly one RPC method, `eth_chainId`, with zero mutation.

The review found an architectural mismatch in the new source runner: it still
defaulted to `http://127.0.0.1:8545/`, while current epoch-2 migration truth
classifies that surface as the historical/private epoch-1 execution archive and
does not establish an active production epoch-2 Besu RPC.

The correction is fail-closed:

- no default Chain-2050 RPC target;
- the historical `8545` archive is forbidden as production resolution evidence;
- isolated successor/Besu proof ports are forbidden as production resolution evidence;
- a production epoch-2 RPC target must be explicitly source-bound;
- an environment override must exactly equal that source-bound target;
- missing or mismatched target HOLDs before any RPC call; and
- deployment, funding, signing, broadcast, and Chain-2050 mutation remain false.

The next gate is not “try another port.” It is to review and bind the exact
production epoch-2 loopback RPC target after the runtime/genesis/validator
authority prerequisites are satisfied.

Memory for context. Repo for truth. Brood journal for continuity.
