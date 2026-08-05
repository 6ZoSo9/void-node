# VOID validator candidate registry deployment preparation v1

Marker: `VOID_VALIDATOR_CANDIDATE_REGISTRY_DEPLOYMENT_PREPARATION_V1`

## Purpose

This lane converts a fresh, read-only chain-2050 registry resolver report into a
content-addressed deployment **review packet**. It closes the gap between
"all known registry artifacts are stale" and "review the exact contract and
constructor policy that would be compiled later."

The packet does not compile creation bytecode. It does not construct, sign, or
broadcast a transaction. It does not deploy a contract, write a live-selection
pointer, register a validator, move a candidate to Waiting or Active, restart a
service, access a credential or wallet, or move funds.

The source baseline for this v1 lane is main commit:

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
- at least one scanned local artifact and at least one candidate address;
- every candidate address classified exactly `stale_no_code`;
- no RPC error, unreadable live contract, policy mismatch, or live exact
  registry; and
- the resolver's read-only authority boundary remains intact.

The default freshness window is 15 minutes. A report that is stale, materially
future-dated, uncertain, or live is rejected.

This proves only that the addresses found in the reviewed artifact inventory
have no code on the queried chain. It is not a global enumeration of every
contract that could exist on chain 2050. That limitation is why the output
remains a hold rather than deployment authority.

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
registry constructor makes the future deployer the resulting owner, so the
review packet deliberately leaves both deployer and owner unresolved.

The proposed compiler profile is recorded but not executed:

```text
solc 0.8.20
optimizer=true
optimizer_runs=200
```

## Usage

First create a new mode-600 resolver report with the maintained read-only
resolver. Then, from an exact clean `main` checkout:

```bash
node tools/void-validator-candidate-registry-deployment-preparation-v1.mjs \
  --resolver-report "$HOME/.local/state/void/validator-candidate-registry-live-resolver-v1/scan.json" \
  --output "$HOME/.local/state/void/validator-candidate-registry-deployment-preparation-v1/review.json"
```

The tool accepts an optional explicit preparation timestamp for reproducible
review and an optional bounded resolver-age override:

```bash
--prepared-at 2026-08-05T09:01:00.000Z
--max-report-age-ms 900000
```

It reads only the supplied resolver report, the fixed public Solidity source,
and clean Git metadata. It writes only the requested local mode-600 review
packet.

## Output decision

Every valid packet ends with:

```text
HOLD_PENDING_REVIEWED_CREATION_BYTECODE_DEPLOYER_OWNER_BINDING_AND_SEPARATE_BROADCAST_AUTHORIZATION
```

The next gate is:

```text
compile_and_independently_review_exact_creation_bytecode_without_signing_or_broadcast
```

A later lane must independently compile the exact bound source, review creation
and runtime bytecode hashes, bind the deployer to the resulting owner, construct
an unsigned transaction without signing, and obtain separate ZoSo deployment
and broadcast authorization. After a successful receipt, the read-only resolver
must prove exactly one live policy-matching registry before any selection file
is written.

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
