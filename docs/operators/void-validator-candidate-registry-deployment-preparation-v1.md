# VOID validator candidate registry deployment preparation v1

Marker: `VOID_VALIDATOR_CANDIDATE_REGISTRY_DEPLOYMENT_PREPARATION_V1`

## Purpose

This lane converts a fresh, read-only chain-2050 registry resolver report into a
content-addressed deployment **review packet**. It closes the source gap between
"the known registry artifacts are stale" and "review the exact contract and
constructor policy that could be compiled in a later lane."

The packet does not compile creation bytecode. It does not construct, sign, or
broadcast a transaction. It does not deploy a contract, write a live-selection
pointer, register a validator, move a candidate to Waiting or Active, restart a
service, access credentials or a wallet, or move funds.

The source baseline for v1 is main commit:

```text
7dc10098a87dee5e27a558ef73a5ea3c52479f99
```

## Required resolver state

Input must be a fresh report from:

```text
VOID_VALIDATOR_CANDIDATE_REGISTRY_LIVE_RESOLVER_V1
```

The report must establish all of the following:

- exact chain ID `2050`;
- decision `HOLD_NO_LIVE_EXACT_REGISTRY`;
- `ready=false` and no selected address;
- at least one scanned artifact and one candidate address;
- zero rejected artifact files;
- every candidate address classified exactly `stale_no_code`;
- the complete artifact-address set exactly matches the resolver-result set;
- every result source names the exact artifact that contained its address and
  supplies the matching artifact SHA-256;
- the raw report bytes parse to the exact object being evaluated;
- the RPC origin is HTTPS or private/loopback/Tailscale HTTP; and
- the resolver's read-only authority boundary remains intact.

Duplicate artifact names, duplicate addresses, incomplete source lists, source
hash mismatches, source-address mismatches, public cleartext HTTP, RPC errors,
unreadable live code, policy mismatches, or an exact live registry all fail
closed.

The default freshness window is 15 minutes. A report that is stale or more than
five minutes future-dated is rejected.

This evidence proves only that addresses in the reviewed artifact inventory had
no bytecode at the queried chain-2050 RPC when the resolver ran. It is not a
global enumeration of every contract that could exist. That limitation keeps
the output at HOLD rather than granting deployment authority.

## Bound source and policy

The packet binds the exact bytes and SHA-256 of:

```text
contracts/mainnet0/VoidValidatorCandidateRegistry.sol
```

It also binds the locked constructor policy:

- minimum candidate stake: exactly 10,000 VOID
  (`10000000000000000000000` wei);
- maximum active validators: `256`;
- activation churn limit: `4`; and
- constructor signature: `constructor(uint256,uint256,uint256)`.

The constructor arguments are ABI-encoded without compiling the contract. The
registry constructor makes the future deployer the resulting owner, so deployer
and owner remain explicitly unresolved.

The proposed compiler profile is recorded but not executed:

```text
solc 0.8.20
optimizer=true
optimizer_runs=200
```

## Usage

First create a new mode-600 report with the maintained read-only resolver. Then,
from an exact, clean `main` checkout:

```bash
node tools/void-validator-candidate-registry-deployment-preparation-v1.mjs \
  --resolver-report "$HOME/.local/state/void/validator-candidate-registry-live-resolver-v1/scan.json" \
  --output "$HOME/.local/state/void/validator-candidate-registry-deployment-preparation-v1/review.json"
```

The tool uses the current system clock for freshness and does not accept a caller-supplied preparation timestamp. This prevents an old resolver report from
being replayed with an old timestamp so it appears fresh. The only optional
freshness control is a bounded maximum age:

```bash
--max-report-age-ms 900000
```

The tool reads only the supplied resolver report, the fixed public Solidity
source, and clean Git metadata. It rejects unknown and duplicate command-line
options and writes only the requested local mode-600 review packet.

## Output decision

Every valid packet ends with:

```text
HOLD_PENDING_REVIEWED_CREATION_BYTECODE_DEPLOYER_OWNER_BINDING_AND_SEPARATE_BROADCAST_AUTHORIZATION
```

The next gate is:

```text
compile_and_independently_review_exact_creation_bytecode_without_signing_or_broadcast
```

A separate future lane must independently compile the exact bound source,
review creation and runtime bytecode hashes, bind the deployer to the resulting
owner, construct an unsigned transaction without signing, and obtain separate
ZoSo deployment and broadcast authorization. After a successful receipt, the
read-only resolver must prove exactly one live policy-matching registry before
any selection pointer is written.

## Legacy deploy proof boundary

The legacy deploy proof at
`ops/mainnet0/validator-candidate-registry-local-deploy-proof.sh` reads private
key material, changes local account balances, broadcasts deployment and
registration transactions, and performs a Waiting transition. This lane does
not run or authorize that legacy deploy proof.

## Authority boundary

Creating, reviewing, committing, or merging this source does not authorize:

- credential-file or private-key access;
- wallet or signer access;
- creation-bytecode acceptance;
- transaction construction, signing, or broadcast;
- contract deployment or live pointer writes;
- candidate registration, Waiting transitions, or validator activation;
- service restart; or
- fund movement.

All fourteen packet authority fields are explicitly false.

## Verification

```bash
python3 -m json.tool \
  schemas/void-validator-candidate-registry-deployment-preparation-v1.schema.json \
  >/dev/null
node --check \
  tools/void-validator-candidate-registry-deployment-preparation-v1.mjs
node --check \
  scripts/prove_void_validator_candidate_registry_deployment_preparation_v1.mjs
node scripts/prove_void_validator_candidate_registry_deployment_preparation_v1.mjs
npm run typecheck
```

Expected marker:

```text
VOID_VALIDATOR_CANDIDATE_REGISTRY_DEPLOYMENT_PREPARATION_V1_PROOF_GREEN
```
