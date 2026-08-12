# BTC/VOID Native Atomic Market V1

## Purpose

This document defines the first source-only architecture plan for VOID Network's official post-presale BTC/VOID market.

The goal is to give humans and autonomous agents a machine-readable way to acquire native VOID with native Bitcoin without making wrapped BTC, stablecoins, custodial bridge assets, or third-party exchange infrastructure part of VOID's official market path.

This is a design document only. It does not create a market, seed liquidity, access a wallet or signer, move treasury funds, deploy a contract, create a Bitcoin transaction, enable Buy VOID execution, or authorize trading.

## Market boundary

The official VOID market pair is:

- native Bitcoin (`BTC`);
- native VOID on Chain-2050 (`VOID`).

V1 deliberately excludes:

- USDC, USDT, or other fiat-linked quote assets;
- wrapped BTC as the canonical BTC asset;
- permanent dependence on an external bridge or custodian;
- leverage, lending, margin, or unsecured credit;
- a general multi-token DEX;
- permissionless deposits into a pooled custody account;
- automatic treasury replenishment;
- hidden operator discretion over already-accepted swaps.

Exchanges and independent third parties may create other markets outside this official design. Their markets are not VOID protocol authority.

## Why a native cross-chain market is different from a normal AMM

BTC and VOID do not live on the same ledger. A conventional single-chain constant-product contract cannot directly hold native BTC and native VOID at the same time.

V1 therefore separates two concerns:

1. **price/liquidity accounting** — deterministic pool-style quoting against published BTC and VOID reserve state; and
2. **settlement** — bilateral native cross-chain atomic settlement using a common hashlock and asymmetric refund timelocks.

The user or agent experiences one BTC/VOID market, but native BTC never has to become a synthetic token on Chain-2050.

## Recommended V1 architecture

### 1. Official market maker inventory

The initial official market should use bounded maker inventory owned by the market operator rather than accept arbitrary third-party pooled deposits.

Inventory is separated by chain:

- BTC inventory: designated native Bitcoin UTXOs or a designated watch-only reserve set;
- VOID inventory: designated native VOID inventory on Chain-2050.

The public quote engine treats those two inventories as one logical BTC/VOID liquidity surface. This is an accounting composition, not a claim that both assets live in one contract.

Third-party makers or permissionless liquidity can be evaluated later as a separate versioned design. V1 should first prove the native settlement and accounting model with one bounded official maker.

### 2. Deterministic pool-style pricing

V1 should expose a deterministic pricing curve rather than require a human operator to manually quote every swap.

The preferred starting model is a constant-product-style reserve curve over published logical reserves:

```text
R_btc * R_void = K
```

For BTC-in / VOID-out, the quote engine applies the configured market fee to the BTC input and computes the deterministic VOID output from the same reserve snapshot.

For VOID-in / BTC-out, the inverse direction uses the same reserve state and policy.

The exact fee, minimum trade, maximum trade, reserve floor, and maximum reserve-fraction-per-trade are policy values and are **not fixed by this design document**.

The curve should require no USD price oracle. The BTC/VOID exchange rate emerges from the reserve ratio and completed trades rather than a fiat feed.

### 3. Reserve snapshots

Every executable quote must bind one content-addressed reserve snapshot.

A snapshot should include at minimum:

- market/version identity;
- BTC reserve amount in satoshis;
- VOID reserve amount in canonical VOID atomic units;
- designated BTC reserve outpoints or a digest of the currently eligible reserve set;
- designated VOID reserve account/contract identity or equivalent auditable inventory authority;
- already-reserved BTC amount;
- already-reserved VOID amount;
- available BTC amount;
- available VOID amount;
- fee-policy ID;
- size/risk-policy ID;
- observed Bitcoin height;
- observed Chain-2050 height;
- creation time;
- snapshot ID/digest.

An executable quote must not silently float to a newer reserve snapshot after acceptance.

### 4. Indicative quote versus executable reservation

Bot discovery should not require a liquidity mutation.

V1 should distinguish:

- **indicative quote** — read-only, cheap, non-reserving, useful for discovery and price comparison;
- **executable quote reservation** — bounded state mutation that reserves the exact output inventory for a short interval and receives an exact quote ID.

This prevents anonymous discovery traffic from locking the market's inventory.

An executable quote should bind:

- direction;
- exact input amount;
- exact output amount;
- reserve snapshot ID;
- fee amount/policy;
- minimum output / exact output contract;
- quote expiration;
- chain-height validity window;
- requested receiving address or settlement identity only when necessary;
- hashlock commitment once the swap enters settlement;
- maximum one settlement attempt;
- quote ID.

Expired reservations return inventory to the available pool without creating transaction authority.

## Native atomic settlement

### BTC -> VOID purchase flow

The primary bot-acquisition flow is a buyer paying native BTC and receiving native VOID.

A proposed hash-timelock flow is:

1. buyer generates a random secret `S` locally;
2. buyer sends only `H = SHA256(S)` to the market settlement protocol;
3. buyer funds a native Bitcoin HTLC output that can be redeemed by the maker with `S` before the long BTC refund timeout, or refunded by the buyer after that timeout;
4. after the configured Bitcoin confirmation/risk policy is satisfied, the maker locks the exact quoted VOID output on Chain-2050 under the same `H` with a **shorter** VOID refund timeout;
5. buyer redeems the VOID lock by revealing `S` on Chain-2050;
6. maker learns `S` from the VOID redemption and uses it to redeem the BTC HTLC;
7. both chains are observed through the configured continuity policy before the swap is marked settled.

The BTC refund horizon must be longer than the VOID refund horizon by a policy-defined safety margin so the maker has time to redeem BTC after the buyer reveals the secret on Chain-2050.

The public service never needs the buyer's BTC or VOID private keys.

### VOID -> BTC flow

The reverse direction should use the same atomic principle with roles/timelocks arranged so neither side can take the other asset without revealing the common preimage and leaving the counterparty enough time to claim the opposite chain.

V1 implementation work should prove both directions in fixtures/regtest before either is eligible for public mainnet authority.

## Bitcoin confirmation and reorganization policy

Bitcoin settlement is probabilistic rather than instantly final.

The market must therefore define a separate confirmation/risk policy that can vary by trade size. The architecture must fail closed when:

- the funding transaction disappears or is replaced before required confidence;
- the committed outpoint changes;
- a reorganization invalidates an accepted funding observation;
- the HTLC script does not exactly reproduce the agreed hashlock/refund contract;
- the observed amount is not exact;
- the transaction arrives after the quote/settlement validity window;
- fee behavior makes the exact contract invalid.

This design intentionally does not hard-code a Bitcoin confirmation count. That value belongs to a separately reviewed risk policy.

## Chain-2050 settlement contract requirements

A later implementation lane may use a small dedicated Chain-2050 hashlock contract or an equivalent native primitive.

It must provide only the minimum atomic-swap authority:

- lock exact VOID amount;
- exact hash commitment;
- exact beneficiary;
- exact refund authority;
- exact timeout;
- redeem with valid preimage;
- refund only after timeout;
- deterministic terminal events/receipts;
- no arbitrary token transfer authority;
- no upgrade backdoor in the V1 settlement object;
- no batch drain or unrestricted operator withdrawal path.

Contract deployment, bytecode review, key authority, and mainnet activation remain separate gates.

## Liquidity reservation and double-spend prevention

The logical pool cannot quote the same inventory to multiple executable swaps simultaneously.

V1 needs a crash-consistent reservation journal that binds:

- quote ID;
- reserve snapshot ID;
- exact inventory reserved;
- direction;
- state-machine phase;
- expiry;
- Bitcoin HTLC identity/outpoint when known;
- Chain-2050 lock identity when known;
- terminal settlement/refund outcome.

Reservations are create-only or append-only. Restart recovery must reconstruct exact outstanding reservations before any new executable quote can be issued.

A confirmed, refunded, expired, or terminally held swap must never become a fresh executable swap by resetting journal state.

## State machine

The first implementation should use an explicit fail-closed state machine rather than inferred transaction status.

Suggested high-level phases:

```text
indicative
  -> reserved
  -> hash_bound
  -> source_funded
  -> source_confirmed
  -> counterparty_locked
  -> preimage_revealed
  -> both_claims_observed
  -> settled
```

Terminal alternatives include:

```text
expired
refunded
held
cancelled_before_funding
```

No terminal state automatically retries.

Each phase transition must be idempotent and receipt-backed.

## Bot-native public surface

The BTC/VOID market should integrate into the existing AI-agent first-contact family rather than require a separate human-only exchange UI.

Planned discovery surfaces may include:

```text
/.well-known/void-market.json
/public-node/market/btc-void/v1/status.json
/public-node/market/btc-void/v1/reserves.json
/public-node/market/btc-void/v1/receipts/
```

A later runtime may expose quote/reservation APIs, but planned endpoints must not be advertised as live until independently observable.

The first-contact manifest can eventually advertise a capability such as:

```text
market.btc_void.native_atomic_v1
```

only after the corresponding public status and proof surfaces exist.

### Cold-start bot experience

An autonomous agent should eventually be able to:

1. discover VOID's first-contact document;
2. discover the official BTC/VOID market capability;
3. read reserve/market status;
4. request an indicative quote without registration or credentials;
5. inspect the atomic-settlement contract and expected chain actions;
6. decide whether to create an executable reservation;
7. fund only from its own BTC wallet;
8. receive VOID to its own Chain-2050 address;
9. verify the settlement receipt independently.

The network should never request the agent's private key, seed phrase, mnemonic, or raw wallet secret.

## Public receipts and provenance

Every meaningful market object should be machine-verifiable and cross-linked:

- reserve snapshot;
- indicative/executable quote;
- reservation receipt;
- BTC funding observation;
- Chain-2050 lock observation;
- redemption/refund observation;
- final settlement or HOLD receipt.

Public receipts should expose only data already necessary for verification and should not attach unnecessary off-chain identity.

A final successful receipt should bind the exact BTC transaction/outpoint, exact Chain-2050 settlement identity, amounts, block/height observations, reserve snapshot/quote ID, state-machine terminal outcome, and relevant proof digests.

This receipt graph also becomes part of the organic bot-discovery loop: agents can encounter a real market receipt and follow its provenance back to VOID first contact and the live BTC/VOID market surface.

## Treasury and inventory boundary

No treasury movement is authorized by this plan.

Before any official liquidity is seeded, a separate operator/governance decision must define:

- exact BTC inventory source;
- exact VOID inventory source;
- maximum initial inventory on each side;
- minimum reserve floor;
- maximum per-swap exposure;
- maximum aggregate in-flight exposure;
- fee policy;
- accounting/segregation policy;
- signer separation and recovery procedure;
- allowed replenishment behavior;
- shutdown/refund behavior.

There is no leverage, borrowing, or automatic treasury refill in V1.

## Relationship to the presale Buy VOID lane

The existing Buy VOID/presale family is not the permanent BTC/VOID market implementation.

The post-presale transition should be explicit:

1. close the presale under its own exact closeout rules;
2. preserve historical presale receipts and no-duplicate guarantees;
3. retire presale-specific execution rather than repurpose it into a general exchange engine;
4. activate the BTC/VOID market only through its own reviewed architecture, liquidity, settlement, and operator gates.

Legacy USDC-named presale artifacts may remain as historical/source evidence but must not define the official post-presale market pair.

## Initial-price boundary

The presale price and the post-presale BTC/VOID pool are separate mechanisms.

The initial BTC/VOID reserve ratio must be an explicit market-seeding decision. V1 does not automatically carry a fiat-denominated presale price into permanent market pricing and does not require an external USD oracle.

Once live, the official market price should be determined by the BTC/VOID reserve curve and completed market activity under the configured policy.

## Failure and shutdown behavior

A market shutdown must stop **new** executable reservations while preserving the ability to complete or refund already-bound atomic swaps.

Shutdown must not strand users by disabling refund monitoring or the minimum settlement actions required by already-created HTLCs.

Fail-closed conditions include:

- reserve mismatch;
- journal reconstruction failure;
- signer or wallet identity mismatch;
- Bitcoin RPC disagreement or stale chain view;
- Chain-2050 continuity failure;
- active unresolved settlement debt;
- duplicate swap/quote identity;
- hash/timelock mismatch;
- unexpected contract/script bytes;
- unsafe fee/dust condition;
- time/height ambiguity;
- operator authority drift.

## Implementation phases

### Phase 0 — design and deterministic fixtures

- finalize market invariants;
- define quote/reserve/receipt schemas;
- specify Bitcoin HTLC script contract;
- specify Chain-2050 hashlock contract;
- specify deterministic pricing and reservation math;
- no wallet or network mutation.

### Phase 1 — Bitcoin regtest + isolated Chain-2050 atomic proof

- prove BTC -> VOID success;
- prove VOID -> BTC success;
- prove both refund paths;
- prove wrong preimage, wrong amount, wrong script, wrong timeout, replay, restart, and reorg handling;
- no mainnet funds.

### Phase 2 — read-only public market discovery

- publish machine-readable market identity/status;
- publish indicative deterministic quotes from fixture or explicitly non-executable reserve state;
- integrate market discovery into AI-agent first contact;
- execution remains disabled.

### Phase 3 — bounded operator rehearsal

- exact real signer identities may be sealed under a separate authority gate;
- use explicitly bounded test inventory;
- one swap per operator authorization;
- complete public receipt and crash/restart proof;
- still no broad public execution.

### Phase 4 — bounded public BTC/VOID market

Only after all prior phases are exact green and treasury/liquidity authority is separately approved:

- enable executable reservations;
- enforce trade/in-flight limits;
- one atomic state machine per swap;
- automatic safe settlement/refund monitoring;
- public reserve and receipt surfaces;
- bots and humans use the same protocol.

### Phase 5 — optional broader liquidity

Only after V1 demonstrates stable native settlement should VOID consider additional makers or permissionless liquidity.

That is a separate versioned design and must not weaken the native BTC/VOID or non-custodial settlement boundary.

## Success metric

The official market succeeds when an unknown autonomous agent can discover the BTC/VOID capability, inspect reserves and deterministic price, acquire native VOID using native BTC through a bounded atomic settlement, independently verify both chains and the final receipt, and do so without surrendering wallet secrets or relying on wrapped BTC, stablecoins, an external bridge custodian, or a fiat price oracle.

`PROTECT THE CORE`.
