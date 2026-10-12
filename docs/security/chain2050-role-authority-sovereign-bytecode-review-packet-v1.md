# Chain-2050 role-authority Sovereign bytecode review packet v1

Marker:
`VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_BYTECODE_REVIEW_PACKET_V1`

## Purpose

Freeze the exact dual-compiler result from merged #1695 into one deterministic
human-review packet before owner/deployer binding or deployment construction.

This gate does **not** decide acceptance for the Sovereign.

## Locked compiled identity

The packet binds the exact #1695 measured identities:

- reproducibility ID:
  `voidcraregdc1_98ae94aacbf76c6d8de48aa3f57b181dab7e15ee95aaf179fbbb16a40c0c3d73`
- contract source SHA-256:
  `a6ecf042569223cc1d56b3e2cc3350206a0abd6352b009212b6540699f7c57f6`
- Standard JSON canonical SHA-256:
  `06246343aa5c3b4610c87530dd6317cade3d6da61d313bee6c6eeb9c93d44f12`
- creation bytecode SHA-256:
  `c0844cd0718ed2dc345bbc01107b57dbb2c2129e325066bff399502031a14733`
- runtime-template SHA-256:
  `b42f8c9397ab02c299563f84233aecdd8f237bbeb553231b702b9b7db03c535d`
- expected deployed runtime SHA-256:
  `b2e1938deb9dd2692a322fd837a5128aeb99d3c33095087c8af8d828a6ed930d`
- immutable empty-root SHA-256:
  `d50b8a122e11454b6cca6a03b312ecac6af6ea1a5d5c5d5f9dd3fdd03b1faea7`
- ABI SHA-256:
  `e56ff6fb3c9c1d3847b7bfab49793d623788dcf5d1dc3d1eac4384fc70c356c2`
- metadata SHA-256:
  `09309636ce80a9baa748e9a65a59ff9a7ef29374ee76ec90417e1b86171c0d89`
- storage-layout SHA-256:
  `14e186caa001ba17491c04456d6b32cd64be5cd93cb71c22a565e419af817fbe`
- method-identifiers SHA-256:
  `7e2ddaad9d4345b3a4a38363142152ba385733cadaf28f16310405df1c662fbf`

The current contract source must still hash exactly to the accepted #1695
source identity or packet generation fails closed.

## Authority surface summary

The packet also makes the relevant contract authority visible for review:

- constructor requires Chain ID 2050;
- constructor requires nonzero initial owner;
- registry append is owner-only;
- exact idempotent replay is supported;
- ownership transfer is two-step;
- one immutable exists: `emptyRegistryRootSha256`;
- no direct external-call, delegatecall, selfdestruct, receive/fallback payable,
  signer, wallet, or funds surface is detected by the source review.

This is not a substitute for reading the Solidity source; it is a deterministic
review index.

## Sovereign boundary

The packet deliberately remains:

`HOLD_PENDING_EXPLICIT_SOVEREIGN_BYTECODE_ACCEPTANCE`

and records:

- `sovereign_bytecode_acceptance=false`;
- `compiler_distribution_trust_accepted=false`;
- `owner_address=null`;
- `deployer_address=null`;
- `unsigned_transaction=null`;
- `deployment_address=null`.

The packet SHA-256 is the exact object the Sovereign may later accept.

## After explicit acceptance

The next gate may then bind:

1. exact constructor owner address;
2. exact deployer address and separation policy;
3. constructor deployment data; and
4. an unsigned Chain-2050 deployment transaction.

Even that next gate must keep signing, broadcast, deployment, registry append,
service restart and production activation separately held.
