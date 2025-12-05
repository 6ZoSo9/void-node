# Obelisk Work Credits UX + Relayer Wiring (V1)

Scope: how Obelisk Wallet should expose Work Credits (WC) and the WC relayer in the UI, and how it talks to the WC relayer API.

Relayer protocol and API are defined in:

- `docs/WORKCREDITS-RELAYER-SPEC.md` (on-chain types + EIP-712)
- `docs/WORKCREDITS-RELAYER-API-SPEC.md` (HTTP/JSON surface)

This file is “what Obelisk actually does with that”.

---

## 0. Global assumptions

- User has a VOID address (same as WC address).
- Node RPC is reachable (VOID chain).
- WC relayer HTTP API is reachable (same chainId, knows WorkCreditsRelayerV1 address).
- LLP is seeded and relayer can quote WC fees.

Obelisk does **not** run its own swap math; it just calls the relayer API.

---

## 1. Tabs and where WC/relayer appear

### 1.1 Home tab

- Shows:
  - VOID balance (read from node RPC / VoidToken).
  - WC balance (WorkCreditsToken).
  - Pending WC (off-chain or on-chain view, depending on how we finalize WorkCreditsMinter/RewardEngine UI).
  - A global toggle: **“Use relayer by default”** (boolean in local wallet settings).
  - A simple “network health” indicator (from Prometheus/health exporter later, not covered here).

- Actions:
  - “Collect WC” button:
    - If user has VOID and global relayer toggle is OFF:
      - Use direct on-chain claim (plain tx) and show gas in VOID.
    - If relayer is ON or user chooses “Use WC to pay gas”:
      - Use relayer flow (see section 3.3).

### 1.2 Wallet tab

This is the core WC + VOID interaction hub.

**Balances:**

- “VOID balance: X”
- “WC balance: Y”
- Optionally: “Pending WC: Z” with a “Collect” button.

**Controls:**

- Global relayer toggle (same as Home): “Use Work Credits relayer by default”.
- Per-send toggle in each form: “Pay gas directly (VOID)” vs “Use relayer (WC)”.

**Forms:**

1. **Send VOID**

   Fields:
   - `To` (address / ENS / contact)
   - `Amount` (VOID)
   - Gas mode:
     - Option A: Pay gas directly (user uses VOID).
     - Option B: Use relayer (user pays WC).

   Behavior:
   - If gas mode = direct:
     - Build normal `VoidToken.transfer` tx (or native transfer if we do native VOID).
     - Show gas estimate from RPC.
   - If gas mode = relayer:
     - Build calldata for `VoidToken.transfer`.
     - Call relayer `/quote` with `intent = "SEND_VOID"`.
     - Show:
       - Estimated WC fee (`wcFee`) and equivalent VOID (if we want).
       - Warning if quote is near pool-usage caps.
     - On confirm, go through meta-tx flow (section 3.1).

2. **Send WC**

   Fields:
   - `To`
   - `Amount` (WC)
   - Gas mode toggle (direct vs relayer) identical to “Send VOID”.

   Behavior:
   - Direct:
     - Standard `WorkCreditsToken.transfer` tx, gas in VOID.
   - Relayer:
     - Same pattern as “Send VOID” but `intent = "SEND_WC"` and calldata targets the WC token.

3. **Collect WC** (duplicate of Home but with more detail)

   - Shows:
     - `Pending WC: Z`
   - Options:
     - “Collect (pay gas in VOID)”
     - “Collect (pay gas in WC via relayer)”

   - Relayer path uses `intent = "COLLECT_WC"` and the claim contract’s calldata.

### 1.3 Trading View (WC/VOID)

Goal: simple LLP front-end, not a full DEX.

**Display:**

- Current price:
  - “1 VOID ≈ N WC” and “1 WC ≈ M VOID” based on latest LLP snapshot.
- Pool depth:
  - “Pool: A VOID, B WC”.
- Basic summary of spread/fee (feeBps from relayer).

**Actions:**

1. “Buy VOID with WC”

   - Input: `Spend WC amount`.
   - On change:
     - Obelisk does **not** run Uniswap math; instead:
       - Calls relayer `/quote` with a special “swap-only” intent, e.g. `intent = "SWAP_WC_FOR_VOID"`, and internally the relayer simulates the swap to compute `voidOut` and needed `wcFee` (this can be combined with gas in one composite quote).
   - Show:
     - Estimated VOID received.
     - Total WC cost including:
       - Swap input.
       - Relayer WC fee (if relayer is also paying gas).
   - Confirm leads to meta-tx (section 3.2), or to a direct `UptimeVaultLLP.swapWcForVoid` tx if we want a non-relayed mode as well.

2. “Sell VOID for WC”

   - Same idea, mirrored for `SWAP_VOID_FOR_WC` if we expose that via the relayer service.

Trading view *always* keeps a consistent picture by trusting the relayer’s LLP snapshot; no custom math in Obelisk.

---

## 2. Relayer interactions from Obelisk

Obelisk only needs three flows:

- **Meta-tx for arbitrary contract call paid in WC** (generic).
- **Collect WC via relayer** (specific flavor of the above).
- **Trading swaps via relayer** (future extension).

### 2.1 Generic meta-tx flow (core pattern)

This is what “Send VOID/WC with relayer” uses.

1. **User fills form.**

   - Example: Send 5 VOID to `0xR`.
   - Obelisk builds `to` and `data` (ABI-encoded function call).

2. **Obelisk fetches nonce.**

   - Call WorkCreditsRelayerV1 `nonces(user)` via node RPC.
   - Get `nonce` (uint256).

3. **Obelisk calls relayer `/quote`.**

   - POST `/api/wc-relayer/v1/quote` with `QuoteParams`:
     - `user`, `to`, `data`, `value`, optional `gasLimitHint`, `intent`.
   - Get back `QuoteResult`:
     - `wcFee`, `voidNeeded`, etc.

4. **Obelisk builds `RelayedCall` message.**

   - `RelayedCallPayload`:
     - `user`     = wallet address.
     - `to`, `data`, `value` as needed.
     - `nonce`    = value from step 2.
     - `maxWCFee` = some margin over `wcFee` or exactly `wcFee`.
     - `deadline` = now + N seconds/minutes.

5. **User signs typed data.**

   - Obelisk prepares EIP-712 typed data exactly as in `WORKCREDITS-RELAYER-SPEC.md`.
   - Shows user the key details:
     - Target contract.
     - Action summary (e.g. “Send 5 VOID to 0xR using WC relayer”).
     - MaxWC fee.
     - Deadline.
   - User signs; Obelisk gets `signature` hex.

6. **Obelisk submits to relayer.**

   - POST `/api/wc-relayer/v1/submit`:
     - `{ relayedCall, signature, wcFee }`
   - Relayer:
     - Calls `executeRelayedCall` on-chain.
     - Uses `wcFee` that is **<= maxWCFee`.
     - Returns `SubmissionResult` with `txHash`.

7. **Obelisk tracks tx status.**

   - Poll node RPC for that `txHash` until mined.
   - Update UI (pending → confirmed → failed).

### 2.2 Collect WC via relayer

Same pattern, with a specific target and intent.

1. Obelisk builds calldata for `WorkCreditsMinter.claim()` or whatever the claim function is.
2. Obelisk calls `/quote` with:
   - `intent = "COLLECT_WC"`.
3. Obelisk displays:
   - “You are claiming Z WC, paying Y WC in relayer fees. Net: (Z - Y) WC.”
4. User signs `RelayedCall` with `maxWCFee >= Y`.
5. Obelisk calls `/submit`.
6. On success, Obelisk refreshes WC balance and pending WC.

### 2.3 Trading via relayer (future)

We can treat trading as just another relayed call:

- Target contract: `UptimeVaultLLP`.
- Calldata: `swapWcForVoid` or `swapVoidForWc`.
- Intent values:
  - `SWAP_WC_FOR_VOID`
  - `SWAP_VOID_FOR_WC`

The flow is identical; the only difference is how Obelisk constructs the call and how the relayer interprets the intent for quote purposes.

---

## 3. UX rules and guardrails

A few hard rules so the UX doesn’t create economic nonsense:

1. Always reflect **relayer quote**, don’t make up numbers.
2. If relayer returns an error:
   - `POOL_INSUFFICIENT_LIQUIDITY` → show “Pool too shallow for this action.”
   - `QUOTE_EXCEEDS_MAX_WCFEE` → show a clear message and prompt to increase max fee or reduce amount.
   - `CHAIN_UNHEALTHY` → show “Network busy/unavailable, try again.”
3. Don’t let user set `maxWCFee` lower than the last `wcFee` returned by `/quote` (plus whatever extra margin they explicitly ask for).
4. If quote `expiresAt` is in the past or very near:
   - Force a re-quote before allowing submit.
5. For safety, Obelisk should:
   - Use a short default deadline (e.g. 2–5 minutes).
   - Show the user when a signature is “stale”.

---

## 4. Minimal “per-action” mapping table

| Action           | Tab      | Target contract        | intent         | Gas modes        |
|------------------|----------|------------------------|----------------|------------------|
| Send VOID        | Wallet   | VoidToken (or native)  | SEND_VOID      | Direct / Relayer |
| Send WC          | Wallet   | WorkCreditsToken       | SEND_WC        | Direct / Relayer |
| Collect WC       | Home/Wallet | WC claim contract   | COLLECT_WC     | Direct / Relayer |
| Buy VOID with WC | Trading  | UptimeVaultLLP         | SWAP_WC_FOR_VOID | Direct / Relayer |
| Sell VOID for WC | Trading  | UptimeVaultLLP         | SWAP_VOID_FOR_WC | Direct / Relayer |

Direct = user pays gas in VOID with a normal tx.  
Relayer = WC-funded meta-tx via WorkCreditsRelayerV1.

