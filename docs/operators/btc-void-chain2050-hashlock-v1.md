# BTC/VOID Chain-2050 hashlock settlement V1

Marker:

`VOID_BTC_VOID_CHAIN2050_HASHLOCK_V1`

Compiler identity marker:

`VOID_BTC_VOID_CHAIN2050_HASHLOCK_COMPILER_IDENTITY_V1`

Status:

source/compiler/isolated-semantic proof only. No deployment or production
Chain-2050 authority.

## Purpose

This contract is the Chain-2050 half of issue #2332's Phase-0 BTC/VOID atomic
settlement primitives. It is designed to be deployed once and reused for many
swaps. It is not a per-swap deployment contract.

The Bitcoin P2WSH HTLC is a separate source primitive. A later cross-rail
planner must bind both primitive identities and prove the asymmetric timeout
safety margin before any isolated Phase-1 execution.

## Canonical VOID token

The contract hard-binds the canonical Epoch-2 VoidToken address:

`0x470075b85352eb86f7d089fb9ba88945f12aad94`

No constructor parameter can substitute another token.

The lock path uses `transferFrom`, and claim/refund use `transfer`. The
source assumes the already-reviewed canonical VoidToken semantics at that
address. It does not grant approval or move tokens by itself until an isolated
or later separately authorized deployment exists.

## Per-swap state

Each swap records exactly:

- SHA-256 hashlock;
- beneficiary;
- refund authority;
- amount in VOID atoms;
- absolute Unix refund deadline; and
- terminal state.

The caller that funds `lock(...)` is always the refund authority. A caller
cannot nominate an unrelated refund recipient.

Swap IDs and hashlocks must be nonzero. Beneficiary must be nonzero and
different from the funding/refund caller. Amount must be positive. Refund
deadline must be in the future when the lock is created.

## Funding

`lock(...)` writes the pending swap state, calls canonical VOID
`transferFrom`, and requires the contract's token balance to increase by
exactly the locked amount.

If token transfer or the exact balance delta fails, the EVM transaction reverts
and the swap remains nonexistent.

## Claim

`claim(swapId, preimage)` requires:

- swap state is `Locked`;
- caller is the exact beneficiary;
- current timestamp is strictly less than the refund deadline;
- preimage length is exactly 32 bytes; and
- `sha256(preimage)` equals the bound hashlock.

The contract writes terminal `Claimed` state before the outbound token
transfer. It then requires the contract's canonical-token balance to decrease
by exactly the claimed amount. A false return or a lying `true` return with
the wrong balance delta reverts the whole transaction, restoring the locked
state.

The `Claimed` event emits the exact 32-byte preimage so a later cross-rail
observer can bind the Chain-2050 reveal to the Bitcoin redeem path.

## Refund

`refund(swapId)` requires:

- swap state is `Locked`;
- caller is the original funding/refund authority; and
- current timestamp is greater than or equal to the refund deadline.

The contract writes terminal `Refunded` state before the outbound token
transfer and requires the contract's canonical-token balance to decrease by
exactly the refunded amount. A false return or a lying `true` return with the
wrong balance delta rolls the transaction back to `Locked`.

Claim and refund are mutually exclusive. Any claim/refund replay after a
terminal transition fails.

## Timeout boundary

The exact contract boundary is intentionally:

```text
claim:  now < refundAfterUnix
refund: now >= refundAfterUnix
```

The longer Bitcoin refund horizon versus shorter Chain-2050 refund horizon is
**not** hardcoded here. That is cross-rail orchestration policy and must be
proved separately before Phase-1 execution.

## No privileged escape hatch

V1 has no:

- owner;
- administrator;
- ownership transfer;
- arbitrary withdrawal;
- rescue/sweep function;
- batch drain;
- proxy;
- upgrade function;
- delegatecall; or
- selfdestruct.

The only token outflows are terminal claim and terminal refund.

## Events

`Locked` binds swap ID, hashlock, beneficiary, refund authority, amount,
deadline, and lock timestamp.

`Claimed` binds swap ID, beneficiary, hashlock, revealed preimage, amount, and
claim timestamp.

`Refunded` binds swap ID, refund authority, amount, and refund timestamp.

These events are designed for later independent Phase-1 observer receipts.
They are not themselves proof that a live deployment has occurred.

## Compiler identity

The compiler proof uses the same reviewed profile as the WC/VOID vault:

- Solidity `0.8.24`;
- release `0.8.24+commit.e11b9ed9`;
- EVM version `paris`;
- optimizer disabled, runs=200;
- `viaIR=false`;
- literal source metadata;
- IPFS bytecode metadata hash.

The review tool now binds source provenance before accepting compiler outputs:

- repository HEAD and tree are derived with the hardened absolute-Git/config-isolated boundary;
- the worktree settlement source must equal exact `HEAD:contracts/mainnet/BtcVoidHashlockSettlementV1.sol` bytes and Git blob;
- caller-supplied source commit/ref authority is not accepted;
- `contracts/epoch2/VoidEpoch2TokenV1.sol` is also exact-HEAD byte/blob bound;
- the canonical token source is checked for the ordinary bool-returning
  `transfer` / `transferFrom` / exact-balance-update semantics the settlement
  relies on;
- this source proof does **not** claim live token runtime-code equality:
  `canonical_token_runtime_verified=false`.

Hosted CI compiles the exact settlement source twice:

1. native `ethereum/solc:0.8.24`;
2. `solc-js@0.8.24`.

The current identity tool cross-checks those two supplied compiler execution
artifacts and records `compiler_outputs_cross_checked=true`, but deliberately
records `compiler_execution_rederived=false`. Therefore the identity is now
source-authoritative but is **not yet standalone compiler-execution authority**;
closing that last provenance boundary requires the review tool itself to execute
or otherwise cryptographically rederive both compiler environments.

The review requires exact agreement for:

- creation bytecode;
- deployed runtime bytecode;
- ABI;
- method identifiers;
- storage layout; and
- metadata.

The exact public function surface is:

- `claim(bytes32,bytes)`;
- `getSwap(bytes32)`;
- `lock(bytes32,bytes32,address,uint256,uint256)`;
- `refund(bytes32)`;
- `stateOf(bytes32)`; and
- `voidToken()`.

The only storage root is the private `_swaps` mapping at slot 0. There are no
link references or immutable references.

The generated identity is content-addressed as:

`voidbtvc2050h1_<sha256>`

## Isolated semantic proof

The self-contained Foundry suite etches a mock ERC-20 runtime at the exact
canonical token address and proves:

- exact canonical-token funding;
- funding caller becomes refund authority;
- beneficiary-only claim;
- exact 32-byte preimage requirement;
- wrong-preimage rejection;
- two simultaneously live swaps retain independent state/roles/amount/deadline
  and exact aggregate escrow through claim/refund transitions;
- exact decoded `Claimed` event evidence, including emitter, swap ID,
  beneficiary, hashlock, revealed 32-byte preimage, amount, and claim timestamp;
- strict claim-before-deadline boundary;
- refund-at-deadline boundary;
- refund-authority enforcement;
- claim replay rejection;
- refund replay rejection;
- claim-after-refund rejection;
- refund-after-claim rejection;
- invalid/duplicate lock rejection;
- funding-transfer rollback;
- claim-transfer rollback;
- refund-transfer rollback;
- true-without-value funding rejection;
- true-without-value claim rejection;
- true-without-value refund rejection; and
- absence of common admin/withdraw/upgrade selector surfaces.

This is isolated test execution only.

## Authority boundary

This source slice authorizes no:

- contract deployment;
- production Chain-2050 RPC or state write;
- Bitcoin RPC or mainnet contact;
- wallet, signer, private-key, or credential access;
- transaction construction, signing, submission, or broadcast;
- production VOID inventory reservation or funding;
- treasury or liquidity action;
- market/presale activation; or
- funds movement.

A later reviewed gate must bind the compiled contract identity, Bitcoin HTLC
identity, timeout plan, and real isolated execution receipts before Phase-1
evidence may become execution-verified.
