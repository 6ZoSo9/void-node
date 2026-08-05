# VOID validator candidate registry dual compiler reproducibility v1

Marker:

`VOID_VALIDATOR_CANDIDATE_REGISTRY_DUAL_COMPILER_REPRODUCIBILITY_V1`

Decision:

`HOLD_PENDING_ZOSO_BYTECODE_REVIEW_DEPLOYER_OWNER_BINDING_AND_UNSIGNED_TRANSACTION`

## Purpose

This lane verifies that **two independent compiler environments** produce the
same review-relevant output for the exact validator candidate-registry source
and exact Standard JSON input.

The preceding compiler-profile lane binds:

- compiler release `0.8.20+commit.a1b79de6`;
- EVM target `paris`;
- optimizer enabled with `200` runs;
- `viaIR=false`;
- literal source content;
- CBOR metadata with IPFS bytecode hash;
- no libraries; and
- the complete output selection required for bytecode review.

This reproducibility lane compares actual compiler outputs. A successful result
proves reproducibility between the named environments. It **does not accept the
bytecode for deployment** and does not establish that either compiler
distribution is trustworthy enough for irreversible use. Those remain a
separate ZoSo bytecode review and trust-acceptance gate.

## Why two implementations

One compiler invocation can be corrupted, mispackaged, misconfigured, or
executed under an unexpected wrapper. Identical output from distinct
implementations and packaging environments materially reduces that risk.

The maintained GitHub proof uses:

1. the native official `ethereum/solc:0.8.20` container; and
2. the independently packaged `solc@0.8.20` JavaScript/Emscripten build.

Both environments must report the exact release:

```text
0.8.20+commit.a1b79de6
```

Their environment kinds, implementations, artifact identities, and canonical
environment fingerprints must differ. A duplicated descriptor or two labels for
the same implementation fails closed.

The workflow records public, non-secret identities such as the container image
ID or digest, the `soljson.js` SHA-256, the package-lock SHA-256, Node.js
version, and compiler version output. Environment descriptors containing fields
whose names indicate secrets, private keys, passwords, credentials, mnemonics,
seeds, or tokens are rejected.

## Exact input

The comparison tool reconstructs the Standard JSON input from the exact tracked
source:

```text
contracts/mainnet0/VoidValidatorCandidateRegistry.sol
```

It requires canonical equality with the merged compiler-profile generator. A
caller cannot substitute a Shanghai target, change optimizer settings, enable
IR, alter metadata settings, introduce remappings or libraries, or request a
different output selection.

The EVM target is explicitly `paris`. Neither creation nor runtime opcodes may
contain `PUSH0`.

## Required compiler output

Each output must contain the exact contract at:

```text
contracts/mainnet0/VoidValidatorCandidateRegistry.sol:
VoidValidatorCandidateRegistry
```

The tool requires:

- zero diagnostics with severity `error`;
- nonempty creation bytecode;
- nonempty deployed/runtime bytecode;
- ABI;
- compiler metadata;
- storage layout;
- method identifiers;
- creation and runtime opcodes;
- creation and runtime source maps;
- empty creation and runtime link references; and
- deployed-bytecode immutable references.

Compiler warnings are counted and retained as evidence but are not silently
converted into errors. Any actual compiler error holds the review.

## Exact comparison

The two outputs must match on:

- creation bytecode;
- runtime bytecode;
- creation opcodes;
- runtime opcodes;
- creation source map;
- runtime source map;
- canonical ABI;
- compiler metadata text;
- canonical storage layout;
- canonical method identifiers; and
- canonical immutable references.

The review packet records SHA-256 values for:

- both raw compiler outputs;
- both canonical compiler-output objects;
- creation bytecode;
- runtime bytecode;
- ABI;
- metadata;
- storage layout;
- method identifiers;
- immutable references; and
- full contract-creation deployment data after appending the exact constructor
  arguments for 10,000 VOID, active cap 256, and churn limit 4.

The constructor-appended deployment data is evidence only. It is not an unsigned
transaction and does not bind a deployer, owner, nonce, gas limit, or fee policy.

## Fail-closed cases

The tool holds on:

- malformed, empty, oversized, or symlinked input/output/environment files;
- source that is not the tracked validator registry;
- Standard JSON input that differs from the merged Paris profile;
- a compiler release other than `0.8.20+commit.a1b79de6`;
- metadata that reports another compiler, EVM target, or optimizer policy;
- any compiler error;
- missing contract, ABI, storage layout, methods, bytecode, opcodes, or maps;
- creation or runtime `PUSH0`;
- any link reference;
- matching environment fingerprints, kinds, or implementations;
- creation or runtime bytecode mismatch;
- opcode or source-map mismatch;
- ABI, metadata, storage-layout, method-identifier, or immutable-reference
  mismatch;
- a sensitive-looking environment field; or
- a dirty repository checkout.

## Source-only comparison tool

The comparison command reads pre-existing compiler files:

```bash
node tools/void-validator-candidate-registry-dual-compiler-reproducibility-v1.mjs \
  --input /private/path/validator-registry-solc-input.json \
  --output-a /private/path/native-solc-output.json \
  --environment-a /private/path/native-solc-environment.json \
  --output-b /private/path/solcjs-output.json \
  --environment-b /private/path/solcjs-environment.json \
  --review-output /private/path/dual-compiler-review.json
```

The tool itself does not invoke `solc`, Docker, npm, Foundry, RPC, or a wallet.
It writes only the optional mode-600 review packet.

## Result boundary

A green reproducibility comparison sets:

```text
compiler_outputs_reproduced=true
compiler_outputs_compared=true
creation_bytecode_exact_match=true
runtime_bytecode_exact_match=true
bytecode_reviewed_by_zoso=false
compiler_distribution_trust_accepted=false
unsigned_transaction_constructed=false
deployment_authorized=false
transaction_broadcast_authorized=false
execution_authorized=false
```

The review therefore remains at:

```text
HOLD_PENDING_ZOSO_BYTECODE_REVIEW_DEPLOYER_OWNER_BINDING_AND_UNSIGNED_TRANSACTION
```

## Ordered continuation

1. Review the exact creation, runtime, and constructor-appended deployment-data
   hashes.
2. Obtain separate ZoSo acceptance of the exact bytecode and compiler
   distribution evidence.
3. Select and review the deployer address that will become registry owner.
4. Construct, but do not sign, an exact unsigned chain-2050 deployment
   transaction.
5. Obtain separate deployment and broadcast authorization.
6. Broadcast once.
7. Verify receipt, chain ID, deployed runtime hash, 10,000-VOID minimum, active
   cap 256, churn limit 4, and owner.
8. Write a live registry pointer only after the maintained resolver proves
   exactly one live policy-matching registry.

Candidate registration, Waiting admission, Active admission, and runtime
consensus activation remain later independent gates.

## Authority boundary

All eighteen authority fields are false. Creating, reviewing, committing,
merging, or running the comparison does not authorize:

- credential-file, private-key, wallet, or signer access;
- live RPC access;
- compiler-output or bytecode acceptance;
- deployer or resulting-owner binding;
- transaction construction, signing, or broadcast;
- contract deployment or registry-pointer mutation;
- candidate registration, Waiting transition, or validator activation;
- service restart;
- Work Credit issuance or settlement; or
- fund movement.

## Verification

```bash
python3 -m json.tool \
  schemas/void-validator-candidate-registry-dual-compiler-reproducibility-v1.schema.json \
  >/dev/null
node --check \
  tools/void-validator-candidate-registry-dual-compiler-reproducibility-v1.mjs
node --check \
  scripts/prove_void_validator_candidate_registry_dual_compiler_reproducibility_v1.mjs
node scripts/prove_void_validator_candidate_registry_dual_compiler_reproducibility_v1.mjs
npm run typecheck
```

Expected marker:

```text
VOID_VALIDATOR_CANDIDATE_REGISTRY_DUAL_COMPILER_REPRODUCIBILITY_V1_PROOF_GREEN
```
