# VOID / Obelisk – WorkCredits UI Spec (devnet v0)

This document specifies how Obelisk Wallet should use the WorkCredits devnet API
for the WorkCredits tab.

For devnet, all data is fetched from the helper HTTP service:

    Base URL (devnet helper):
        http://127.0.0.1:4312

The main endpoint Obelisk should use is:

    GET /workcredits/devnet/dashboard/:address.json

where `:address` is the user’s EOA (the address Obelisk is connected with).

-------------------------------------------------------------------------------
1. Dashboard JSON shape (summary)
-------------------------------------------------------------------------------

Example shape (fields relevant to the wallet):

    {
      "chain": "devnet",
      "address": "0xUSER_ADDRESS",
      "price": {
        "wc_per_void": 100,
        "void_per_wc": 0.01
      },
      "pool_reserves": {
        "void": 1000000,
        "wc": 100000000
      },
      "balances": {
        "void_raw": "0",
        "wc_raw": "0",
        "lp_raw": "0",
        "void": 0,
        "wc": 0,
        "lp": 0
      },
      "pending_wc": 0
    }

This is a wallet-friendly summary derived from the raw dashboard JSON
(`/workcredits/devnet/dashboard/:address.json`). The helper script
`ops/void-workcredits-devnet-dashboard-demo.sh` prints this summary for testing.

Obelisk does NOT need to know how to compute these values – it just consumes
the JSON.

Key fields:

- `price.wc_per_void`  : how many WC per 1 VOID
- `price.void_per_wc`  : how many VOID per 1 WC
- `pool_reserves.void` : total VOID in the WC/VOID pool
- `pool_reserves.wc`   : total WC in the WC/VOID pool
- `balances.void`      : user’s VOID balance (human readable)
- `balances.wc`        : user’s WC balance (human readable)
- `balances.lp`        : user’s LP token balance (human readable)
- `pending_wc`         : user’s pending WC rewards (human readable)


-------------------------------------------------------------------------------
2. Obelisk WorkCredits tab – required panels
-------------------------------------------------------------------------------

The WorkCredits tab in Obelisk should show at least:

1. **Price panel**
   - Inputs: `price.wc_per_void`, `price.void_per_wc`
   - Display:
     - “1 VOID = {wc_per_void} WC”
     - “1 WC = {void_per_wc} VOID”

2. **Pool reserves panel**
   - Inputs: `pool_reserves.void`, `pool_reserves.wc`
   - Display:
     - “Pool VOID: {void}”
     - “Pool WC: {wc}”
   - This is informational only for now (no direct user controls).

3. **Balances panel**
   - Inputs: `balances.void`, `balances.wc`, `balances.lp`
   - Display:
     - “Your VOID: {void}”
     - “Your WC: {wc}”
     - “Your LP: {lp}”
   - These numbers come directly from the dashboard JSON.

4. **Pending rewards panel**
   - Input: `pending_wc`
   - Display:
     - “Pending WC: {pending_wc}”
   - Also show a **“Collect WC”** button, which will be wired later to a
     transaction builder. For now it can be a disabled or “devnet only”
     button until the TX path is implemented.

5. **Devnet status**
   - Optional but recommended:
     - Show `chain` (“devnet”) somewhere.
     - If the dashboard call fails or `up != 1` (from the underlying data),
       show an error banner like “WorkCredits devnet helper offline”.


-------------------------------------------------------------------------------
3. Network calls from Obelisk
-------------------------------------------------------------------------------

For devnet v0, Obelisk should perform these calls:

1. On tab load (or when wallet connects):

       GET http://127.0.0.1:4312/workcredits/devnet/dashboard/:address.json

   - Parse JSON.
   - Populate price, pool reserves, balances, pending WC.

2. Periodic refresh while the WorkCredits tab is visible:

   - Example: refetch the dashboard every 10–30 seconds.
   - If a fetch fails, keep the last known values but show a small warning.

3. No write operations yet:

   - There is currently **no** on-chain “collect pending WC” transaction wired
     in Obelisk via this API. That will be specified in a later version.
   - For now, Obelisk is read-only with respect to WorkCredits devnet.


-------------------------------------------------------------------------------
4. Future actions (planned, not implemented yet)
-------------------------------------------------------------------------------

These actions are part of the roadmap and will be specified in a later version
of this document:

1. **Collect pending WC**
   - Button in the Pending rewards panel.
   - Behind the scenes: build and send a transaction to claim `pending_wc`
     into the user’s WC balance.
   - Likely flow:
     - Obelisk asks a backend or local helper for a “collect pending” TX.
     - User confirms TX in Obelisk / underlying wallet.
     - After confirmation, dashboard refresh shows `pending_wc` decreased
       and `balances.wc` increased.

2. **Buy / Sell WC (WC/VOID pool)**
   - Obelisk will eventually provide a simple trade UI:
     - Buy WC with VOID.
     - Sell WC for VOID.
   - These flows will use the same pool / price data exposed in the current
     dashboard, plus additional quote/preview endpoints or client-side math.

3. **Relayer toggle + “collect pending WC” shortcut**
   - The global wallet will have a relayer on/off switch and a “Collect
     pending WC” shortcut.
   - These UI controls will reuse the same WorkCredits data and TX building
     logic described above.

For now, the WorkCredits tab is **read-only** and driven entirely by the
dashboard endpoint plus the JSON shape described in this v0 spec.
