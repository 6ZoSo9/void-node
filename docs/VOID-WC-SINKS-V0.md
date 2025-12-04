# VOID Work Credits — Sinks v0 (NFTs, awards, NullFeed, perks)

Status: PLAN ONLY  
Goal: Make every WC-powered perk (NFTs, awards, NullFeed upgrades, Obelisk themes, etc.)
follow one simple pattern:

- Users can always choose:
  - SELF mode: use their own VOID to pay gas, no relayer fee.
  - RELAYER mode: relayer pays gas, takes a small WC/VOID fee.
- Relayer is available for ALL WC sinks.
- Events and semantics are consistent, so UI and analytics do not care what the sink is.

---

## 1. Concepts

WC sink = any contract or module that CONSUMES WC:

- NFT avatar market
- Awards / badges / special roles
- NullFeed channel upgrades or cosmetic boosts
- Obelisk themes and visual perks
- Future bots / premium features

Every sink must:

1) Accept WC spend in a standard way.  
2) Support SELF and RELAYER paths.  
3) Emit standard events so we can track usage.

---

## 2. Spend modes

Two modes for any WC spend:

1) SELF mode (user uses their own VOID for gas)
2) RELAYER mode (relayer fronts gas, gets paid)

Design rule:

For any WC sink, user should ALWAYS be able to:
- send a direct tx, OR
- sign a meta-message and let a relayer execute.

---

## 3. SELF mode (direct tx, user gas)

Example flow (NFT buy, but applies to any sink):

- User calls sink directly from their wallet.
- Wallet uses VOID to pay gas.
- Sink pulls/burns WC from user’s balance.

Example signature at the conceptual level:

- buyNftWithWC(tokenId, wcAmount)
- upgradeChannelWithWC(channelId, wcAmount)
- applyThemeWithWC(themeId, wcAmount)

On-chain behavior:

- Check user has enough WC.
- Transfer or burn wcAmount from user.
- Perform the action (mint NFT, upgrade channel, etc.).
- Emit WC spend events.

No relayer involvement, no relayer fee.

This path is for power users and those who do not want the relayer.

---

## 4. RELAYER mode (meta-tx, relayer gas + fee)

Relayer mode general pattern:

1) UI asks sink/relayer for a quote (how much WC, what fee).
2) User signs a meta-message:
   - “Spend N WC on sink S, allow relayer R, allow fee F.”
3) Relayer submits a tx to sink contract:
   - Contract verifies signature and policy.
   - Contract spends WC from user.
   - Contract pays relayer a fee.
   - Contract performs the action.

Events show exactly how much went to sink and how much went to relayer.

---

## 5. Common data shape (conceptual)

When quoting a WC sink operation, the relayer/sink should answer with something like:

{
  "address": "0x1234...",
  "sink": "nft_market",
  "action": "buy",
  "targetId": "42",
  "mode": "self | relayer",
  "price_wc": "50.00",
  "relayer_fee_wc": "0.50",
  "total_wc": "50.50"
}

UI then:

- Shows price_wc and (if mode=relayer) the extra relayer_fee_wc.
- Lets user choose SELF or RELAYER.

For SELF:
- UI builds a normal tx to the sink with price_wc.

For RELAYER:
- UI builds and signs a meta-message containing:
  - user address
  - sink identifier
  - action + targetId
  - price_wc
  - relayer_fee_wc
  - relayer address
  - expiry / nonce

Relayer submits the actual tx.

---

## 6. Standard events for WC sinks

To make analytics easy, all WC sinks should emit a standard event set alongside their own events.

Conceptual example (Solidity-ish, but not final):

event WCSpent(
    address indexed user,
    address indexed sink,
    bytes32 indexed sinkTag,
    uint256 amountWC,
    uint256 relayerFeeWC,
    address relayer,
    bytes32 context
);

Where:

- user: who paid WC.
- sink: sink contract (this).
- sinkTag: short identifier (“nft.market”, “nullfeed.channel.upgrade”, “obelisk.theme”).
- amountWC: total WC spent by user (including relayer fee).
- relayerFeeWC: how much of amountWC went to relayer (0 in SELF mode).
- relayer: relayer address (zero in SELF mode).
- context: arbitrary hashed context (e.g. keccak(channelId, featureId, tokenId)).

Additionally, sinks may emit their own specific events (e.g., NftMinted, ChannelUpgraded).

This gives Prometheus / indexers / dashboards one unified way to see all WC usage.

---

## 7. Relayer economics for sinks

Relayer must NOT lose money.

Relayer fee policy (WC side):

- When using RELAYER mode, sink contracts must:
  - Deduct relayer_fee_wc from the WC spend.
  - Send relayer_fee_wc to the relayer address.
  - Use the remainder for the sink action (price_wc).

For example:

- NFT price = 50 WC.
- Relayer fee = 0.5 WC.
- total_wc (user spend) = 50.5 WC.

Contract logic:

- Spend 50.5 WC from user (via allowance or signed transfer).
- Send 0.5 WC to relayer.
- Burn or transfer 50 WC as the price.

Relayer fee policy (VOID side):

- Optional: some sinks (heavier gas) may also pay a small VOID fee to relayer.
- That is policy-driven and not required in v0; baseline is WC fee.

---

## 8. Relayer coverage rule

Design rule for VOID Network:

Relayer support MUST exist for ALL WC sinks. That includes:
- NFT/avatar marketplace.
- Awards / badges / titles.
- NullFeed channel upgrades and customizations.
- Obelisk UI themes and perks.
- Future bots, premium services, or AI-related WC spends.

But relayer is always OPTIONAL for the user:
- Self-tx path must exist and be documented.
- If relayer infra is down, users can still spend WC in SELF mode.

---

## 9. UI expectations (Obelisk / NullFeed)

When a WC sink is invoked in the UI:

1) Show WC balances:
   - Pending WC (from relayer).
   - On-chain WC (from L1).

2) Show the action quote:
   - price_wc
   - if using relayer mode: relayer_fee_wc and total_wc
   - if using relayer_swap (for claim+swap style), show expected VOID result.

3) Present two buttons where it makes sense:
   - “Use my VOID for gas (self)”
   - “Use relayer (fee applies)”

4) Make RELAYER mode convenient but never the only option.

---

## 10. Future details (not v0 blockers)

Later, we can extend this spec with:

- A formal Solidity interface (IWCSink) for contracts to implement.
- Structured EIP-712 domain and messages for:
  - WC sink meta-txs.
  - Relayer scopes/permissions.
- More complex fee policies:
  - Tiered fees per sink type.
  - VOID-based fees for high-gas operations.

But v0 design stays simple:
- Same pattern for all sinks.
- Dual modes (self or relayer).
- Unified event for analytics.

