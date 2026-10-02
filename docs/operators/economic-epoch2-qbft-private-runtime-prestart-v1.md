# Epoch-2 private QBFT pre-start admission v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PRESTART_V1`

Aggregate marker:
`VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_START_ADMISSION_V1`

Status: read-only pre-start admission. Validator start remains separately
authorized.

## Purpose

Immediately before any validator start, re-check the installed private runtime
and live host identity instead of relying on older preparation/install evidence.

Each host observer requires:

- clean `main`, descended from the plan and install receipt;
- exact current tailnet IPv4 and enode from the private plan;
- exact installed genesis, static-peer file, and systemd unit hashes;
- empty Besu data directory;
- inactive validator service;
- exact observed unit-file state `static`, stable across the observation
  window;
- no direct `*.wants` or `*.requires` enablement link;
- symlinked `.wants` / `.requires` directories fail closed;
- `indirect_activation_absence_proven=false` (this gate does not claim that
  every possible dependency/activation path is absent);
- exact plugin hash;
- pinned Besu image still present;
- rootless Docker still bound to the operator user socket;
- candidate P2P port 30313 vacant;
- Precision loopback RPC port 18553 vacant;
- canonical private node-key path, regular file, one hard link, mode 0400/0600;
- validator private key re-derived locally to the exact public key and validator
  address in the plan.

## Private-key boundary

This is the first gate in this lifecycle that must read the validator key bytes,
because the reviewed plan explicitly requires exact private-key/public-identity
revalidation immediately before start.

The observer:

- reads the key locally only;
- derives the public key and validator address in memory;
- emits neither private-key bytes nor a private-key digest;
- does not copy or stage the key;
- does not sign any message or transaction; and
- writes only boolean identity-match facts plus the already-public validator
  identity.

A host pre-start receipt is valid for at most ten minutes; the current runner
uses a five-minute validity window.

## Three-host common admission

Precision combines exactly one fresh receipt for each of Precision, Nimo, and
Xiphos.

A green aggregate requires:

- exactly three roles;
- one common plan ID;
- one common bundle-set ID;
- one exact repository head;
- three unique install receipts;
- every receipt fresh at the same evaluation instant;
- no more than 120 seconds between the earliest and latest host observations;
- all three validator private identities locally revalidated;
- all three services inactive;
- all three unit-file states observed as exactly `static` and carried into
  start admission;
- all direct enablement links absent;
- no claim that indirect activation absence is proven;
- all candidate listener ports still vacant.

The aggregate result is:

`THREE_HOST_PRESTART_GREEN_VALIDATOR_START_CONFIRMATION_REQUIRED`

It explicitly records:

- `start_authorized=false`;
- `service_start=false`;
- `authoritative_chain2050_write=false`;
- `transaction_submission=false`; and
- `funds_movement=false`.

## No activation in this lane

Neither the host observer nor the Precision aggregator may:

- run `systemctl daemon-reload`;
- enable or start a service;
- run/start/pull/stop a Docker container;
- create a P2P or RPC listener;
- sign or submit a transaction;
- create Chain-2050 blocks;
- mutate validators;
- move tokens or funds;
- authorize migration; or
- authorize public activation.

## Next gate

A green three-host start-admission receipt permits only the next decision point:
a separate explicit operator confirmation named

`startPrivateEpoch2QbftSuccessorV1`.

The activation ceremony must still fail closed if admission expires or any
installed/runtime fact changes before the actual start action. Immediately
before the explicit start it rechecks that direct enablement links remain
absent, the unit-file state is still `static`, and the service is still
inactive. It performs `daemon-reload`, then rechecks all three conditions
again before issuing `systemctl start`.
