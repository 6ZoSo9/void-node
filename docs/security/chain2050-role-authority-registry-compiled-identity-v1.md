# Chain-2050 role-authority registry compiled identity v1

Marker:
`VOID_CHAIN2050_ROLE_AUTHORITY_REGISTRY_COMPILED_IDENTITY_RECORD_V1`

## Status

Measured compiler identity **recorded**, not sovereignly accepted for
deployment.

The committed artifact is:

`ops/mainnet0/chain2050-role-authority-registry-compiled-identity-v1.json`

Its self-addressed identity is:

`voidcraregci1_357e5b21d523eec80cb1485eb44c54acc9d42c9088fd6891075bc52183a65119`

Exact JSON SHA-256:

`1590a2dcde983e483c3bbac6628c6d57b0a560e44cb5796f8075ebdc38fc7bb1`

Exact JSON bytes: `4181`.

## Evidence lineage

The record binds the successful #1695 dual-compiler evidence:

- evidence source head:
  `4a1ea998c817576cce714a3786d544a198b721d4`;
- merged main commit:
  `58691b0a0309c6fc7f1aaebb00232338d842cec9`;
- focused run: `35701262479`;
- real compiler job: `106659598758`;
- reproducibility ID:
  `voidcraregdc1_98ae94aacbf76c6d8de48aa3f57b181dab7e15ee95aaf179fbbb16a40c0c3d73`.

The proof requires both evidence commits to remain ancestors of the current
generation and verifies the current Solidity source still has the measured
source SHA-256.

## Exact compiler identity

Profile:

- Solidity `0.8.20+commit.a1b79de6`;
- EVM `paris`;
- optimizer enabled, 200 runs;
- `viaIR=true`;
- literal-source metadata;
- CBOR enabled;
- IPFS metadata hash.

Measured artifacts:

- contract source SHA-256:
  `a6ecf042569223cc1d56b3e2cc3350206a0abd6352b009212b6540699f7c57f6`;
- Standard JSON canonical SHA-256:
  `06246343aa5c3b4610c87530dd6317cade3d6da61d313bee6c6eeb9c93d44f12`;
- creation bytecode SHA-256:
  `c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733`;
- runtime-template SHA-256:
  `b42f8c9397ab02c299563f84233aecdd8f237bbeb553231b702b9b7db03c535d`;
- expected deployed runtime SHA-256:
  `b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d`;
- immutable reference: byte `1390:32`;
- immutable value:
  `d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7`.

The legacy optimized non-IR pipeline was held by Solidity with
`Stack too deep`. The accepted measurement profile therefore uses the
compiler-prescribed `viaIR=true`; the Solidity source was not modified for
that change.

## Governance boundary

Recording exact bytes is not the same as accepting them for deployment.

The artifact deliberately fixes:

- `sovereign_bytecode_acceptance=false`;
- `owner_address=null`;
- `deployer_address=null`;
- `owner_deployer_separation_reviewed=false`;
- `deployment_data_sha256=null`;
- `unsigned_transaction_constructed=false`;
- `deployment_attested=false`;
- `live_contract_address=null`;
- `production_activation_authorized=false`.

The verifier rejects any packet that fills or flips those values.

## Authority boundary

The record grants no credential, Wallet, signer, RPC, transaction,
deployment, Chain-2050 mutation, registry append, service restart, Work Credit,
validator, production activation, treasury/liquidity, or funds authority.

## Next gate

The next gate is a **separate sovereign review of the exact compiled
identity**.

Only after an explicit bytecode-acceptance decision should source work bind:

1. the constructor `initialOwner`;
2. a collision-free deployment account distinct from protected/frozen roles;
3. owner/deployer separation; and
4. deterministic unsigned deployment data.

Signing, broadcast, deployment, and production activation remain later gates.
