# First public earning and validator-registry recovery v1

Marker: `VOID_FIRST_PUBLIC_EARN_VALIDATOR_REGISTRY_RECOVERY_V1`

## Purpose

The first outside-node participant needs two independent capabilities:

1. one bounded, server-selected Work Credit task that can be fetched without an inbound executor; and
2. one verified live validator-candidate registry on chain ID `2050` with the locked minimum of **10,000 VOID**.

The August 5, 2026 activation survey found that the private coordinator itself was healthy and fixed at 3 WC, but public claims had `enabled=false`, `available=false`, and `work_available=false`. It also found that the current local registry artifact named an address with no deployed code. This lane closes the source and runbook gaps without pretending either stale condition is already live.

## Deterministic first work packet

The exact server-selected packet is:

```text
fixtures/public-earning/void-public-earn-first-work-v1.json
```

Dataset ID:

```text
void-public-earn-first-work-v1
```

Exact SHA-256:

```text
c12a7a4aec535398d3cb9b3dd7a19894f52daf8a2bf1c11019f81a1f0a0c38ea
```

The packet states that:

- the task class is `datanet_fetch_verify`;
- the network is VOID Mainnet-0, chain ID `2050`;
- the fixed award is exactly `3 WC`;
- the coordinator selects the packet and expected hash;
- the participant cannot select the dataset, input hash, or award;
- no wallet or signer is required; and
- there is no money movement.

## Loopback topology

The guarded local topology is:

```text
127.0.0.1:4100 → 127.0.0.1:4110 → 127.0.0.1:4111
```

- `4100`: existing private VOID node and Work Credit coordinator.
- `4110`: `public-earn-coordinator-composition-v1.mjs`, which serves only the exact work packet and forwards only the public health, status, claim, and result routes.
- `4111`: existing Public Earn gateway adapter, bound only to loopback for the local proof stage.

The composition service does not expose the private operator issue route, local claim-sign route, generic job submission, wallet routes, validator mutation, Buy VOID fulfillment, WC settlement, or administrative routes. It rejects redirects, credentials in upstream origins, unsupported methods, unknown datasets, unbounded bodies, and malformed capability authorization.

## Guarded runtime preparation

Read-only planning:

```bash
VOID_NODE_ROOT="$HOME/dev/void-node" \
APPLY=0 \
bash ops/mainnet0/install-first-public-earn-runtime-v1.sh
```

This checks:

- exact clean `main` checkout;
- Node.js 22;
- strict node health, readiness, latest-block alignment, and peer visibility;
- private coordinator enabled with executor role disabled;
- fixed award exactly 3 WC;
- server-selected work and no participant-selected award; and
- the deterministic work-packet SHA-256.

A live application is a separate explicit operation and requires:

```text
activate-first-public-earn-runtime-v1
```

The apply path writes mode-600 systemd configuration, enables public claims for the exact dataset and hash, keeps the executor role disabled, starts the loopback composition service, activates the loopback Public Earn gateway, and runs the maintained readiness gate. It backs up the prior unit/drop-in state and rolls back if any required postcondition fails.

The activation command does not issue a ticket. It does not execute participant work, write WC, settle WC to VOID, access a wallet or signer, register or activate a validator, broadcast a transaction, or move funds.

External HTTPS publication remains a later, separately reviewed network operation. A loopback-green gateway is not an internet publication claim.

## Validator-registry recovery

The prior `validator-candidate-registry.local.current.json` file is treated as a stale artifact until its address is proven against the currently running chain-2050 RPC.

Run the read-only resolver:

```bash
node tools/void-validator-candidate-registry-live-resolver-v1.mjs scan \
  --rpc http://127.0.0.1:8545 \
  --artifact-dir "$HOME/dev/void-node/.runtime/mainnet0" \
  --output "$HOME/.local/state/void/validator-candidate-registry-live-resolver-v1/scan.json"
```

The resolver:

- scans bounded, regular, non-symlink validator-registry JSON artifacts;
- extracts only contract-address fields;
- checks each candidate address with read-only JSON-RPC;
- requires deployed bytecode;
- requires `minValidatorStake()` to equal exactly 10,000 VOID;
- requires positive `maxActiveValidators()` and `activationChurnLimit()`;
- reads owner, Candidate, Waiting, and Active counts; and
- distinguishes stale, unreadable, policy-mismatched, and exact-live contracts.

Decision rules:

- exactly one live exact-policy registry: `READY_EXISTING_LIVE_EXACT_REGISTRY`;
- multiple live exact-policy registries: fail closed;
- no live exact-policy registry: fail closed;
- no candidate addresses: fail closed.

An optional mode-600 live-selection file can be written only with the exact confirmation printed by the resolver. It is separate from the historical artifacts and does not overwrite the stale artifact.

The resolver does not deploy a contract. It does not read a deployer key, wallet, seed phrase, mnemonic, or signer. It does not sign or broadcast a transaction, move a candidate to Waiting or Active, or move funds.

## When no live registry exists

A `HOLD_NO_LIVE_EXACT_REGISTRY` result is not a failure of the resolver. It proves that a fresh registry deployment is still required. Deployment must be a separate reviewed lane because it creates a new contract, establishes an owner, consumes gas, and publishes a canonical public address.

No candidate should be asked to stake 10,000 VOID until a reviewed registry deployment receipt, code hash, immutable values, chain ID, owner boundary, and public address publication have all been verified.

## Proof

```bash
node scripts/prove_first_public_earn_validator_registry_recovery_v1.mjs
npm run typecheck
```

The focused proof covers deterministic work identity, exact route containment, capability forwarding, hidden operator paths, strict node peer parsing, disabled-by-default activation, rollback and authority boundaries, stale-current-artifact recovery, exact chain-2050 registry classification, and fail-closed selection.