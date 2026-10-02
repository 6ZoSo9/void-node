# Production Epoch-2 RPC host observer v1

Marker: `VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1`

Tracks #2316 after merged #2317.

## Purpose

This is the independent, read-only Precision observation gate for the existing
reviewed Epoch-2 QBFT runtime. It does not start the runtime and it does not
promote the canonical production-RPC target descriptor.

The only accepted candidate is the source-bound runtime from merged #2317:

- host: `zoso-Precision-Tower-7810`;
- service: `void-economic-epoch2-qbft-validator-v1.service`;
- RPC: `http://127.0.0.1:18553/`;
- Chain ID: 2050;
- execution epoch: 2;
- consensus: QBFT;
- exact three-validator production roster.

The historical 8545 surface and isolated/read 18550/18551/18552 surfaces are
not accepted.

## Required activation lineage

The observer consumes exact external bytes plus independently supplied SHA-256
values for:

1. the reviewed private-QBFT activation plan;
2. the activation receipt produced by the reviewed activation controller.

The activation plan is validated by the existing activation contract. The
activation receipt is not trusted by ID alone: the observer rebuilds the exact
receipt from the plan plus its recorded activation observations and requires
semantic equality with the supplied receipt.

## Fresh host observation

A green live run additionally requires:

- clean local `main` equal to live GitHub `refs/heads/main`;
- exact canonical origin;
- no systemd drop-ins on the validator unit;
- unit fragment path and SHA-256 equal the Precision install row in the
  activation plan;
- service `active/running` with a nonzero MainPID and InvocationID;
- loopback `127.0.0.1:18553` listener present;
- `eth_chainId = 0x802`;
- exact genesis block hash and state root from the reviewed successor identity;
- exact current QBFT validator set;
- at least two peers;
- live head at or above the activation receipt's post-Xiphos block floor;
- one exact head block hash/state root observation.

The RPC method set is read-only:

```text
eth_chainId
eth_blockNumber
eth_getBlockByNumber
net_peerCount
qbft_getValidatorsByBlockNumber
```

## Output

The observer writes one create-only mode-0600 JSON receipt outside the
repository and fsyncs the file and parent directory.

A green observation has:

```text
status=PRODUCTION_EPOCH2_RPC_HOST_OBSERVATION_ACCEPTED
observation_id=voidpe2rpcobs1_<64hex>
independent_host_acceptance=true
write_capability_classification=write_capable_not_authorized
target_descriptor_promotion_authorized=false
```

This receipt is evidence for a later, separately reviewed evidence-aware target
promotion. It is not itself production-target selection.

## Live usage

Run only after the reviewed three-host activation has completed and the exact
activation plan/receipt files are available:

```bash
node tools/void-production-epoch2-rpc-host-observer-v1.mjs \
  --activation-plan /absolute/activation-plan.json \
  --activation-plan-sha256 <64hex> \
  --activation-receipt /absolute/activation-receipt.json \
  --activation-receipt-sha256 <64hex> \
  --output /absolute/production-epoch2-rpc-host-observation.json
```

The observer performs one fixed canonical GitHub main identity read and
loopback-only read RPC calls. It performs no service action.

## Authority boundary

```text
observer_read_only=true
service_action=false
daemon_reload=false
credential_access=false
wallet_or_signer_access=false
private_key_access=false
transaction_construction=false
transaction_signing=false
transaction_submission=false
transaction_broadcast=false
authoritative_chain2050_write=false
validator_mutation=false
migration_authorized=false
market_activation=false
public_presale_activation=false
token_movement=false
inventory_funding=false
liquidity_movement=false
funds_movement=false
target_descriptor_promotion=false
```
