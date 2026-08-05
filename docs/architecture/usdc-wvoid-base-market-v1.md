# USDC / wVOID Base market v1

## Decision

The fixed-price Buy VOID presale remains an independent product and runtime.
The USDC / wVOID market is additive. This lane does not retire, replace, mutate,
or fund itself from the presale.

## Canonical asset model

- Native VOID on chain `2050` remains canonical.
- `wVOID` is an 18-decimal ERC-20 market representation on Base.
- Base mainnet chain ID is `8453`; Base Sepolia is `84532`.
- Native USDC on Base mainnet is
  `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`.
- Test USDC on Base Sepolia is
  `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.

Addresses and chain parameters must be reverified from official Base and Circle
sources immediately before any deployment or liquidity transaction.

## Non-negotiable conservation invariant

```text
wVOID total supply <= native VOID locked for redemption
```

Minting requires a finalized native lock. Native release requires a prior burn.
Every lock, mint, burn, and release identifier is single-use and replay-safe.

## Separation from Buy VOID

This lane must not:

- modify any `buy_void_*` source or runtime;
- stop or retire the presale;
- reuse the fulfillment wallet;
- reuse presale inventory or payment requests;
- use presale receipts as bridge authority;
- use presale revenue or inventory for pool liquidity without a later explicit
  Sovereign decision.

The public product may eventually expose both `Buy VOID` and `Trade VOID` as
separate surfaces.

## Delivery stages

1. Closed source-only market plan.
2. Local wVOID and lock/redeem model with adversarial proofs.
3. Base Sepolia round-trip canary using test assets only.
4. Independent security review and supply-conservation audit.
5. Explicit Base mainnet deployment gate.
6. Explicit pool creation and capped liquidity gate.
7. Separate Trade VOID interface.

## Mainnet gates

No live deployment or pool action occurs until all of the following are fixed in
an explicit reviewed packet:

- wVOID contract bytecode and administrator boundaries;
- native lock custody and redemption design;
- relayer or validator attestation threshold;
- pause, quarantine, and recovery policy;
- pool venue, fee tier, initial price, and price range;
- exact USDC and wVOID contract addresses;
- initial USDC and wVOID liquidity caps;
- treasury source and LP-position custody;
- monitoring, incident response, and retirement rules.

## Authority boundary

This source lane performs no deployment, pool creation, liquidity provision,
wallet or credential access, native VOID lock, wVOID mint or burn, transaction
signing, transaction broadcast, or fund movement.
