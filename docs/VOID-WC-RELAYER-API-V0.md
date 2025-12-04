# VOID Work Credits — Relayer API v0

Status: PLAN ONLY (devnet first)

Goal: simple endpoints so Obelisk/NullFeed can:
- Show pending WC.
- Let users claim, claim+swap, and spend WC.
- Always choose between:
  - self-tx (user pays gas in VOID), or
  - relayer-tx (relayer fronts gas, gets reimbursed).

Base URL (dev example): http://127.0.0.1:PORT  
All responses JSON.

---

## 1. Get pending WC

GET /wc/pending/:address

Return pending WC for a wallet.

Request path:
- :address — user wallet (0x…).

Example response:

{
  "address": "0x1234...",
  "pending_wc": "123.45",
  "last_update": 1764479999,
  "roleHints": ["validator", "full_node"]
}

UI uses this to show “Pending WC”.

---

## 2. Claim WC — quote

Before sending any tx, UI asks for a quote.

POST /wc/claim/quote

Request body:

{
  "address": "0x1234...",
  "mode": "self | relayer | relayer_swap",
  "requested_wc": null
}

- mode:
  - "self"         → user pays gas in VOID.
  - "relayer"      → relayer pays gas, gets WC fee.
  - "relayer_swap" → relayer pays gas, claims WC and swaps via LLP.
- requested_wc:
  - null   → relayer suggests an amount (e.g. all pending above min).
  - number → user asks for a specific amount; relayer may clamp it.

Example response (relayer mode):

{
  "address": "0x1234...",
  "mode": "relayer",
  "pending_wc": "123.45",
  "claim_wc": "120.00",
  "relayer_fee_wc": "1.20",
  "user_receive_wc": "118.80",
  "expected_void_out": null,
  "policy": {
    "epochLengthSeconds": 3600,
    "defaultFeeBps": 100,
    "minRelayerClaimWC": 25,
    "suggestedMinClaimWC": 50
  }
}

For mode = "relayer_swap", expected_void_out should be populated with a best-effort LLP quote.

---

## 3. Claim WC — SELF mode (user uses their own VOID)

User pays gas directly; no relayer fee enforced on-chain.

POST /wc/claim/self

Request body:

{
  "address": "0x1234...",
  "amount_wc": "100.00"
}

Example response:

{
  "address": "0x1234...",
  "amount_wc": "100.00",
  "proof": "0x...",              // optional: Merkle proof / epoch hash
  "controllerCallData": "0x..."  // optional: encoded call for WorkCreditsController
}

Client options:
- Build the WorkCreditsController call locally using amount_wc and proof, or
- Use controllerCallData as calldata.

User then sends a normal tx:
- to = WorkCreditsController
- data = controllerCallData
- gas paid in user’s own VOID.

Relayer later sees the on-chain mint and decreases pending_wc[address] accordingly.

---

## 4. Claim WC — RELAYER and RELAYER_SWAP modes

User does not pay gas directly; they sign a message, relayer sends the tx.

POST /wc/claim/relayer

Request body:

{
  "address": "0x1234...",
  "mode": "relayer",
  "amount_wc": "120.00",
  "user_signature": "0x..."
}

- user_signature: signature (EIP-191 / EIP-712) authorizing the relayer to claim amount_wc, and optionally swap in relayer_swap mode.

Example response (relayer mode):

{
  "address": "0x1234...",
  "mode": "relayer",
  "amount_wc": "120.00",
  "relayer_fee_wc": "1.20",
  "user_receive_wc": "118.80",
  "tx_hash": "0x...",
  "status": "pending"
}

Example response (relayer_swap mode):

{
  "address": "0x1234...",
  "mode": "relayer_swap",
  "amount_wc": "120.00",
  "relayer_fee_wc": "1.20",
  "expected_void_out": "0.42",
  "void_out": "0.418",
  "tx_hash": "0x...",
  "status": "included"
}

Relayer calls WorkCreditsController.claimWithRelayer(...), and in relayer_swap mode also calls LLP to trade WC→VOID. Relayer decreases pending_wc[address] in its DB after success.

---

## 5. WC-powered sinks (NFTs, awards, NullFeed perks)

Every WC sink should support both modes:

- self-tx (user VOID gas).
- relayer-tx (relayer fronts gas, gets a fee).

### 5.1 Example: NFT purchase, SELF mode

POST /wc/sink/nft/quote

Request body:

{
  "address": "0x1234...",
  "tokenId": "42",
  "mode": "self"
}

Example response:

{
  "address": "0x1234...",
  "tokenId": "42",
  "mode": "self",
  "price_wc": "50.00",
  "canAffordPending": true
}

User then sends a tx directly to the NFT contract using their own VOID for gas:
- buyNftWithWC(tokenId, price_wc)

### 5.2 Example: NFT purchase, RELAYER mode

POST /wc/sink/nft/quote

Request body:

{
  "address": "0x1234...",
  "tokenId": "42",
  "mode": "relayer"
}

Example response:

{
  "address": "0x1234...",
  "tokenId": "42",
  "mode": "relayer",
  "price_wc": "50.00",
  "relayer_fee_wc": "0.50",
  "total_wc": "50.50"
}

User signs a meta-message like:
- “Spend 50 WC on NFT #42, allow relayer R to take 0.50 WC fee.”

Relayer submits the NFT tx; sink contract:
- Verifies signature.
- Burns or transfers 50 WC as price.
- Sends 0.50 WC to relayer as fee.

Same pattern applies to:
- Awards, badges, titles.
- NullFeed channel upgrades or cosmetic boosts.
- Obelisk themes and perks.

---

## 6. Design rules recap

1. Pending first:
   - WC earnings accumulate as pending_wc off-chain; no auto L1 spam.

2. User choice on every spend:
   - self-tx (user pays VOID gas, no relayer fee), or
   - relayer-tx (relayer pays gas, earns a clear WC/VOID fee).

3. Relayer never drained:
   - Every relayer-tx path includes an explicit fee.

4. Simple UI:
   - Show pending WC and on-chain WC.
   - Offer both options per action:
     - “Use my VOID for gas”
     - “Use relayer (fee applies)”
