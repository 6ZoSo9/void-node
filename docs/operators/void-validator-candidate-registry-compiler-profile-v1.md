# VOID validator candidate registry compiler profile v1

Marker: `VOID_VALIDATOR_CANDIDATE_REGISTRY_COMPILER_PROFILE_V1`

Decision:

`HOLD_PENDING_TWO_INDEPENDENT_SOLC_0_8_20_PARIS_OUTPUTS_AND_BYTECODE_REVIEW`

## Purpose

This lane closes the compiler-profile ambiguity left after the source-only
validator candidate-registry deployment preparation.

The preparation packet binds the exact registry source, chain ID `2050`,
10,000-VOID minimum stake, 256-active-validator cap, activation churn limit
`4`, and constructor arguments. It intentionally does not compile or accept
bytecode.

This companion packet validates that exact preparation and emits one
content-addressed Standard JSON compiler input. The input is suitable for two
independent, credential-free compiler environments. It does not itself run
`solc`.

## Why the EVM target is explicit

Solidity 0.8.20 changed its default EVM target to Shanghai. Shanghai-targeted
output may use the `PUSH0` opcode.

The chain-2050 preparation evidence proves the RPC chain ID and that known
registry artifact addresses have no live code. It does not prove that every
runtime intended to consume the new registry supports Shanghai or `PUSH0`.

This lane therefore does not inherit the compiler default and does not assume
Shanghai support. The exact EVM target is `paris`. It explicitly binds:

```text
compiler release: 0.8.20+commit.a1b79de6
EVM target:       paris
optimizer:        enabled
optimizer runs:   200
via IR:           false
revert strings:   default
metadata CBOR:    appended
metadata content: literal
metadata hash:    ipfs
libraries:        none
```

A Paris-targeted contract remains usable on a compatible later EVM while
avoiding an unreviewed dependency on `PUSH0`. This is a compile-time
compatibility choice only. It does not authorize deployment.

## Required preparation packet

The tool accepts exactly the maintained deployment-preparation contract:

`VOID_VALIDATOR_CANDIDATE_REGISTRY_DEPLOYMENT_PREPARATION_V1`

The input must remain content-addressed and bound to:

- repository `6ZoSo9/void-node`;
- a clean exact `main` commit;
- `contracts/mainnet0/VoidValidatorCandidateRegistry.sol`;
- chain ID `2050`;
- resolver decision `HOLD_NO_LIVE_EXACT_REGISTRY`;
- one or more stale candidate addresses;
- policy values `10000000000000000000000`, `256`, and `4`;
- constructor `constructor(uint256,uint256,uint256)`;
- uncompiled and unreviewed creation bytecode;
- unresolved deployer, owner, nonce, gas, fees, and transaction; and
- all fourteen preparation authority fields set to `false`.

The raw preparation bytes must parse to the exact object being validated. The
preparation ID is recomputed before any compiler input is produced.

## Standard JSON compiler input

The generated Standard JSON object contains the literal source bytes and no
source URLs. Its output selection is restricted to review-relevant material:

- ABI;
- compiler metadata;
- storage layout;
- method identifiers;
- creation bytecode, opcodes, source map, and link references; and
- deployed bytecode, opcodes, source map, link references, and immutable
  references.

The packet records a canonical SHA-256 of this exact Standard JSON object.
Both compiler environments must consume the same object.

## Two independent compiler outputs

The next gate requires at least two outputs produced in distinct environments.
Each output must prove the exact compiler release and exact Standard JSON
input hash.

Review must fail closed unless both outputs have:

- zero compiler errors;
- zero unresolved link references;
- byte-for-byte identical creation bytecode;
- byte-for-byte identical runtime bytecode;
- identical ABI;
- identical metadata;
- identical storage layout; and
- identical method identifiers.

This packet does not claim those comparisons have happened. All output hashes,
bytecode hashes, review decisions, deployer bindings, and transaction fields
remain unresolved.

## Usage

Run only from a clean exact-main checkout after producing a maintained
deployment-preparation packet:

```bash
node tools/void-validator-candidate-registry-compiler-profile-v1.mjs \
  --preparation /private/path/validator-registry-deployment-preparation.json \
  --output /private/path/validator-registry-compiler-profile.json \
  --compiler-input-output /private/path/validator-registry-solc-input.json
```

Both output files are written atomically with mode `0600`; their parent
directories are mode `0700`.

The operational CLI uses the current repository commit and branch. It does
not accept a caller-supplied review timestamp.

## Fail-closed conditions

The tool holds on:

- a malformed, oversized, empty, or symlinked preparation file;
- raw preparation bytes that do not match the supplied object;
- a bad preparation content address;
- a non-main source branch or invalid source commit;
- source bytes or source hash mismatch;
- wrong repository, contract path, chain ID, or resolver contract;
- wrong minimum stake, active cap, churn limit, or registration semantics;
- wrong constructor signature, types, values, or encoding;
- an already compiled or reviewed preparation packet;
- resolved deployment fields;
- any preparation authority field set to `true`;
- a preparation decision other than the maintained hold;
- malformed timestamps;
- an invalid output directory or output symlink; or
- the profile packet and compiler-input paths resolving to the same file.

## Authority boundary

Every compiler-profile authority field is explicitly `false`, including:

- credential-file, private-key, wallet, or signer access;
- compiler execution;
- compiler-output acceptance;
- creation- or runtime-bytecode acceptance;
- deployer or owner binding;
- transaction construction;
- signing or broadcast;
- contract deployment;
- live registry-pointer writes;
- validator registration, Waiting transition, or activation;
- service restart; and
- fund movement.

The source-only tool performs no JSON-RPC request and does not run `solc`.
It does not authorize any irreversible operation.

## Ordered continuation

1. Fast-forward Precision to the exact merged `main`.
2. Rerun the maintained read-only live-registry resolver on chain `2050`.
3. Regenerate the deployment-preparation packet from that fresh report.
4. Generate this exact compiler profile and Standard JSON input.
5. Run the input in two independent Solidity 0.8.20 environments.
6. Compare both outputs with a separate fail-closed bytecode-review tool.
7. Obtain separate ZoSo acceptance of the exact creation and runtime hashes.
8. Bind the reviewed deployer as the resulting registry owner.
9. Construct, but do not sign, an exact unsigned deployment transaction.
10. Obtain separate deployment and broadcast authorization.
11. Broadcast once and verify receipt, live code, policy, owner, and runtime
    bytecode before any live registry selection is written.

The legacy deploy proof is not invoked by this lane.
