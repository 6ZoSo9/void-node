# VOID Devnet — WorkCredits Pipeline (v0)

This doc captures how the WorkCredits **devnet** stack fits together:

- Contracts and addresses
- Helper HTTP / dashboard JSON
- CLI scripts for minting / funding
- Obelisk UI (swap widget + dashboard)
- Quick smoke-test flow

The goal is: “From a clean terminal, how do I see balances, swap VOID/WC on
devnet in Obelisk, and know which components are in play?”

---

## 1. Core devnet config and addresses

Config JSON:

- \`config/void-workcredits-devnet.live.json\`

Example (current devnet):

- \`chainId   = 2050\`
- \`network  = "devnet"\`
- \`rpcUrl   = "http://127.0.0.1:8545"\`
- \`voidToken\`         (devnet VoidToken)
- \`workCreditsToken\`  (devnet WorkCreditsToken)
- \`lpPool\`            (devnet WorkCreditsPoolV1)

These addresses are also discoverable from:

- \`docs/VOID-DEVNET-PROTOCOL-STATE.json\`
- \`broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json\`

Current canonical devnet addresses wired into Obelisk:

- \`src/workcredits/devnetSwapConfig.ts\`

  - \`WORKCREDITS_DEVNET_POOL_ADDRESS\`
  - \`WORKCREDITS_DEVNET_VOID_TOKEN_ADDRESS\`
  - \`WORKCREDITS_DEVNET_WC_TOKEN_ADDRESS\`
  - \`WORKCREDITS_DEVNET_CHAIN_ID = 2050\`

These must stay in sync with the actual devnet deployment and the pool wiring.

---

## 2. Helper HTTP + dashboard JSON

Devnet WorkCredits helper lives in the main repo, **not** inside Obelisk:

Key pieces:

- \`ops/void-workcredits-devnet-http.cjs\`
- \`ops/void-workcredits-devnet-http.sh\`
- \`ops/void-workcredits-devnet-dashboard.sh\`
- \`ops/void-workcredits-devnet-account-json.sh\`
- \`ops/void-workcredits-devnet-pool-json.sh\`

Helper HTTP base:

- \`http://127.0.0.1:4312\`

Important endpoints:

- Pool JSON:
  - \`/workcredits/devnet/pool.json\`

- Account JSON:
  - \`/workcredits/devnet/account/<addr>.json\`

- Combined dashboard JSON:
  - \`/workcredits/devnet/dashboard/<addr>.json\`

Example:

- \`curl -fsS "http://127.0.0.1:4312/workcredits/devnet/dashboard/<addr>.json" | jq .\`

The dashboard JSON shape (conceptual):

- \`pool\`: reserves, prices, health flags
- \`account\`: balances (void / wc / lp), earnings, meta (addresses, RPC URL)

Example account section:

- \`balances.void\`  (human VOID)
- \`balances.wc\`    (human WC)
- \`balances.lp\`    (LP tokens)
- \`earnings.pending_wc\` (currently 0; placeholder for RewardEngine integration)
- \`meta.workcredits_token\` (WC token address)
- \`meta.pool_address\`     (pool address)
- \`meta.rpc_url\`          (RPC)

---

## 3. CLI helpers for devnet funds

### 3.1. Devnet caller key

Base devnet key (used for minting etc.):

- \`$REPO/.secrets/devnet-caller.key\`

Scripts assume:

- Foundry \`cast\` installed and in PATH.
- \`devnet-caller.key\` contains the private key for the devnet owner/admin
  that can mint VOID/WC in these contracts.

### 3.2. Fund native devnet ETH

We use a small helper (example pattern, may evolve):

- Native devnet ETH/VOID from owner 0x3022… → wallet address.

Result: wallet has gas to approve + swap via MetaMask.

### 3.3. Mint VOID + WC to dev wallet

Script:

- \`ops/void-workcredits-devnet-fund-and-mint.sh\`

Key behavior:

1. Reads \`docs/VOID-DEVNET-PROTOCOL-STATE.json\` to find \`workCreditsToken\`.
2. Loads \`devnet-caller.key\` from \`$REPO/.secrets/devnet-caller.key\`.
3. Derives \`CALLER_ADDR\` via \`cast wallet address\`.
4. Targets user address:
   - default: caller address
   - override: \`USER_ADDR=0x...\` env
5. Sends:
   - \`MINT_AMOUNT\` of WC (default: 1000 * 1e18) via \`mint(address,uint256)\`.

We also have a dedicated VOID funding script:

- \`ops/void-workcredits-devnet-fund-voidtoken.sh\`

This mints VOID to the devnet caller address so we can seed reserves and/or
fund test wallets.

---

## 4. WorkCredits account JSON (per address)

Script:

- \`ops/void-workcredits-devnet-account-json.sh\`

Inputs:

- \`ACCOUNT=<0x...>\` (or first arg)
- \`RPC_URL\` (default: http://127.0.0.1:8545)
- \`STATE_JSON\` (\`docs/VOID-DEVNET-PROTOCOL-STATE.json\`)
- \`BCAST_FILE\` (\`broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json\`)

Behavior:

1. Resolve:
   - WorkCreditsToken address
   - WorkCreditsPool address (best-effort)

2. Call \`balanceOf(ACCOUNT)\` on WC token via \`cast\`.

3. Convert raw 18-dec value to human using \`python3\` and \`Decimal\`.

4. Emit JSON:

   - \`chain = "devnet"\`
   - \`address = ACCOUNT\`
   - \`up = 1\`
   - \`balances.void_raw\` / \`balances.void\` (currently 0 in this script)
   - \`balances.wc_raw\` / \`balances.wc\`
   - \`balances.lp_raw\` / \`balances.lp\` (currently 0)
   - \`earnings.pending_wc_raw\` / \`earnings.pending_wc\`
   - \`meta.pool_address\`, \`meta.workcredits_token\`, \`meta.rpc_url\`, etc.

This JSON is exactly what the helper HTTP wraps into the \`account\` section
of the dashboard.

---

## 5. Obelisk UI wiring

Repo:

- \`obelisk-ui/\`

Core files for devnet WorkCredits:

- \`src/workcredits/WorkCreditsDashboard.tsx\`
- \`src/workcredits/useWorkCreditsDashboard.ts\`
- \`src/workcredits/devnetApi.ts\`
- \`src/workcredits/devnetSwapConfig.ts\`
- \`src/workcredits/devnetSwapExecutor.ts\`
- \`src/workcredits/WorkCreditsTradeWidget.tsx\`

### 5.1. Data fetch

- \`devnetApi.ts\`:

  - Base path:
    - \`DEVNET_BASE_PATH = "/workcredits/devnet"\`
    - Vite proxy sends this to port 4312.

  - \`fetchWorkCreditsDashboard(address)\`:
    - GET \`/workcredits/devnet/dashboard/<addr>.json\`
    - Returns \`{ pool, account }\`.

- \`useWorkCreditsDashboard.ts\`:

  - Hook storing:
    - \`address\`
    - \`data\` (dashboard JSON)
    - \`loading\`
    - \`error\`
    - \`lastUpdated\`
  - \`load(overrideAddress?)\` calls \`fetchWorkCreditsDashboard\`.

### 5.2. Dashboard UI

- \`WorkCreditsDashboard.tsx\`:

  - Uses \`useWorkCreditsDashboard\` with an initial demo address.
  - Buttons:
    - “Use demo address”
    - “Use wallet” (MetaMask \`eth_requestAccounts\` → set address + load)
    - “Load” (reload for current address)

  - Cards:
    - Pool:
      - Shows VOID/WC reserves and price:
        - wc_per_void
        - void_per_wc
    - Account:
      - Shows current wallet address (normalized from hook).
      - VOID / WC balances from \`account.balances\`.

  - Trade widget:
    - Uses \`WorkCreditsTradeWidget\` (and underlying helpers) to:
      - Choose side:
        - BUY WC (send VOID)
        - SELL WC (send WC)
      - Enter send amount and see receive estimate (using pool price).
      - On submit:
        - Build \`SwapExecutionPlan\` via \`buildSwapExecutionPlan\`.
        - Ask for confirmation.
        - Call \`executeDevnetSwap(plan)\`.

### 5.3. Swap execution

- \`devnetSwapExecutor.ts\`:

  - Uses Ethers v6 \`BrowserProvider\` bound to \`window.ethereum\`.
  - Ensures chainId matches \`WORKCREDITS_DEVNET_CHAIN_ID\` (2050) with warnings.
  - Converts human amounts → 18-dec via \`parseUnits\`.
  - Resolves:
    - Input token:
      - BUY WC → spend VOID token.
      - SELL WC → spend WC token.
    - Pool contract:
      - \`WORKCREDITS_DEVNET_POOL_ADDRESS\` + \`WORKCREDITS_DEVNET_POOL_ABI\`.

  - Steps:
    1. Approve MaxUint256 on the input token for the pool.
    2. Wait for approve tx to confirm.
    3. Call:
       - \`swapVoidForWC(amountIn, minOut, from)\` for BUY WC.
       - \`swapWCForVoid(amountIn, minOut, from)\` for SELL WC.
    4. Wait for swap tx receipt.

  - All of this is **devnet-only** plumbing for now.

---

## 6. End-to-end devnet smoke-test

From scratch (assuming devnet node / contracts are up):

1. **Fund wallet native devnet ETH/VOID**

   - Wallet address example:
     - \`0xdf994e1b8c1ac9078c66892b589c8aa76c3be592\`

   - Run the native funding helper (1 ETH from dev owner → wallet).

2. **Mint VOID + WC to wallet**

   - Run:

     - \`USER_ADDR=<0xwallet> ops/void-workcredits-devnet-fund-and-mint.sh\`

   - Confirm:

     - \`cast call <VOID_TOKEN> "balanceOf(address)(uint256)" <wallet>\`
     - \`cast call <WC_TOKEN> "balanceOf(address)(uint256)" <wallet>\`

3. **Check helper account JSON**

   - From \`void-node\` root:

     - \`ACCOUNT=<wallet> ops/void-workcredits-devnet-account-json.sh | jq .\`

   - Expect:
     - non-zero \`balances.void\` and \`balances.wc\`.

4. **Check full dashboard JSON**

   - \`curl -fsS "http://127.0.0.1:4312/workcredits/devnet/dashboard/<wallet>.json" | jq .\`

   - Expect:
     - \`pool.reserves.void\` / \`pool.reserves.wc\` non-zero.
     - \`account.balances.void\` / \`account.balances.wc\` match the mint results.

5. **Run Obelisk UI**

   - \`cd obelisk-ui\`
   - \`npm run dev\`
   - Open the printed http://127.0.0.1:517x/ URL in the browser.
   - Navigate to the WorkCredits section.

   In the UI:
   - Click “Use wallet” to pull the MetaMask account.
   - Click “Load” to fetch the dashboard.
   - Verify:
     - Pool section shows reserves/prices.
     - Account section shows matching VOID/WC balances.

6. **Try a devnet swap**

   - In the Trade widget:
     - Pick:
       - BUY WC (send VOID), or
       - SELL WC (send WC).
     - Enter a small send amount (e.g., 10).
     - Confirm the receive estimate looks reasonable.

   - Click “Swap”.
   - MetaMask should:
     1) Show an \`approve\` tx.
     2) Show a \`swap\` tx.

   - After both confirm:
     - Click “Load” again.
     - VOID/WC balances in the dashboard should update accordingly.

---

## 7. Future WorkCredits devnet TODOs

- Wire RewardEngine on devnet and:
  - update account JSON to surface \`pending_wc\` from real RewardEngine.
  - add an “Earnings / Pending WC” card in the Obelisk UI.

- Add a dedicated devnet WorkCredits pillar:
  - health of pool reserves
  - swap success counters
  - UI/HTTP coverage

- Long term: mirror the devnet pattern to mainnet, with:
  - real WorkCreditsToken / WorkCreditsPool addresses
  - production-grade monitoring, alerts, and dashboards.

This doc is the canonical reference for the current WorkCredits devnet
pipeline: contracts → helper → scripts → dashboard → Obelisk UI.
