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
values for the same activation lineage used by the reviewed activation runner:

1. private QBFT runtime plan;
2. bundle-set receipt;
3. Precision install receipt;
4. Nimo install receipt;
5. Xiphos install receipt;
6. start-admission receipt;
7. compiled activation plan;
8. activation receipt produced by the reviewed activation controller.

The observer re-executes
`compileVoidEconomicEpoch2QbftPrivateRuntimeActivationPlanV1(...)` from the
first six artifacts using the compiled timestamp recorded in the supplied
activation plan, then requires exact semantic equality with that plan. A
caller-created self-consistent activation-plan ID is therefore insufficient.

The activation receipt is likewise not trusted by ID alone: the observer
rebuilds the exact receipt from the rederived plan plus its recorded activation
observations and requires semantic equality with the supplied receipt.

Every install-receipt repository generation plus the start-admission observed
repository generation must be an ancestor of the current canonical main used
for the observation. A valid historical activation lineage may therefore remain
usable across later source-only commits, but an unrelated/noncanonical source
generation cannot become production-host evidence.

## Fresh host observation

A green live run additionally requires:

- clean local `main` equal to live GitHub `refs/heads/main`;
- exact canonical origin;
- no systemd drop-ins on the validator unit;
- unit fragment path and SHA-256 equal the Precision install row in the
  activation plan;
- service `active/running` with a nonzero MainPID and InvocationID;
- the active MainPID command line exactly equals the reviewed unit fragment's deterministic `ExecStart=` argv;
- the active MainPID cgroup is bound to `void-economic-epoch2-qbft-validator-v1.service`;
- the exact ExecStart/MainPID argv SHA-256 and cgroup binding are recorded in the observation lineage;
- the same systemd unit/MainPID/InvocationID/argv generation remains stable across the RPC observation window;
- exact rootless Docker socket `unix:///run/user/<uid>/docker.sock`, owned by the current operator UID;
- Docker daemon `/info` security options explicitly report rootless mode;
- exact running container name `void-e2-qbft-precision-v1`;
- exact reviewed Besu image reference plus a concrete `sha256:<image-id>`;
- exact container user `0:0`, Besu entrypoint/arguments, reviewed bind mounts, `BESU_OPTS`, `--cap-drop=ALL`, and `no-new-privileges`;
- exact configured **and live host-published** Docker mappings, including `127.0.0.1:18553 -> 8545/tcp` and the reviewed Precision P2P mapping; unbound image-exposed ports may remain `null`, but any additional host-published port HOLDs;
- the same normalized container ID/image/start generation remains stable across the RPC observation window;
- loopback `127.0.0.1:18553` listener is present before and after the RPC observation;
- local clean `main` and live GitHub `refs/heads/main` remain unchanged across the observation window;
- `eth_chainId = 0x802`;
- exact genesis block hash and state root from the reviewed successor identity;
- exact current QBFT validator set at the captured head block;
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

## Source-authority boundary

The exported pure builder is intentionally non-authoritative. Caller-supplied
synthetic source/service/container/RPC facts can produce only:

```text
marker=VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_PREVIEW_V1
status=PRODUCTION_EPOCH2_RPC_HOST_OBSERVATION_PREVIEW_NOT_SOURCE_VERIFIED
independent_host_acceptance=false
```

Only the direct live CLI holds the module-private verified-source capability.
After canonical-main binding, reviewed semantic reexecution, systemd observation,
rootless-Docker observation, listener/RPC reads, and generation-stability
rechecks, that path may mint the authoritative
`VOID_PRODUCTION_EPOCH2_RPC_HOST_OBSERVER_V1` object. Persistence additionally
requires the exact in-process object to be present in the module-private verified
observation WeakSet.

## Output

The observer writes one create-only mode-0600 JSON receipt outside the
repository. The output parent is retained with
`O_DIRECTORY|O_NOFOLLOW`; creation occurs through the retained
`/proc/self/fd/<parent-fd>/<basename>` generation, then the exact file and
directory are fsynced and the public parent/file identities are rechecked.
A same-UID parent rename/replacement therefore HOLDs and is cleaned up instead
of redirecting an authority-bearing observation receipt.

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
  --private-runtime-plan /absolute/private-runtime-plan.json \
  --private-runtime-plan-sha256 <64hex> \
  --bundle-set /absolute/bundle-set-receipt.json \
  --bundle-set-sha256 <64hex> \
  --install-precision /absolute/install-precision.json \
  --install-precision-sha256 <64hex> \
  --install-nimo /absolute/install-nimo.json \
  --install-nimo-sha256 <64hex> \
  --install-xiphos /absolute/install-xiphos.json \
  --install-xiphos-sha256 <64hex> \
  --start-admission /absolute/start-admission.json \
  --start-admission-sha256 <64hex> \
  --activation-plan /absolute/activation-plan.json \
  --activation-plan-sha256 <64hex> \
  --activation-receipt /absolute/activation-receipt.json \
  --activation-receipt-sha256 <64hex> \
  --output /absolute/production-epoch2-rpc-host-observation.json
```

The observer performs one fixed canonical GitHub main identity read,
read-only HTTP `GET /info` and
`GET /containers/void-e2-qbft-precision-v1/json` calls over the reviewed
rootless Docker Unix socket, and loopback-only read RPC calls. It does
not invoke a Docker mutation endpoint or perform any service action.

## Authority boundary

```text
observer_read_only=true
activation_plan_upstream_reexecution_required=true
exact_upstream_activation_artifacts_required=true
activation_source_ancestry_required=true
rootless_docker_read_only=true
container_inspection_read_only=true
service_container_listener_binding_required=true
container_generation_stable_required=true
private_output_parent_fd_bound=true
private_output_exact_directory_fsync=true
private_output_redirect_forbidden=true
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
