# VOID Network — WorkCredits Devnet Runbook

This documents how to run the WorkCredits devnet stack:
- Devnet contracts (VOID, WorkCreditsToken, WC/VOID pool)
- WorkCredits HTTP helper on port 4312
- Obelisk UI dev server
- Wallet funding + swap flow

## 1. Assumptions

- Repo is at: ~/dev/void-node
- Devnet RPC: http://127.0.0.1:8545 (chainId 2050)
- You have a MetaMask account on the VOID devnet (chainId 2050)
- Devnet caller key is stored in:
    .secrets/devnet-caller.key

## 2. Start the WorkCredits devnet HTTP helper

From the repo root:

    cd ~/dev/void-node
    ./ops/void-workcredits-devnet-ui-open.sh

This starts the helper on port 4312.

Key endpoints:

- UI page:
    http://127.0.0.1:4312/workcredits/devnet/ui
- Dashboard JSON for a given address:
    http://127.0.0.1:4312/workcredits/devnet/dashboard/<address>.json

Example:

    curl -fsS \
      "http://127.0.0.1:4312/workcredits/devnet/dashboard/0x1111111111111111111111111111111111111111.json" \
      | jq .

## 3. Start the Obelisk UI (dev server)

From the obelisk-ui folder:

    cd ~/dev/void-node/obelisk-ui
    npm install      # first time only
    npm run dev

Vite will listen on 5173 by default (or 5174, 5175, etc. if ports are busy).  
Open the printed Local URL in your browser, for example:

    http://127.0.0.1:5173/

The WorkCredits tab in Obelisk talks to the helper via the Vite dev proxy
and pulls the same JSON that you see under port 4312.

## 4. Mint devnet VOID + WC to your MetaMask wallet

Pick the MetaMask address you want to use on devnet and export it as WALLET:

    export WALLET=0xYOUR_METAMASK_ADDRESS

Then run the mint script (this uses the devnet owner key and on-chain mint):

    cd ~/dev/void-node
    WALLET="$WALLET" /tmp/wc-devnet-mint-to-wallet.sh

This script:

- Uses .secrets/devnet-caller.key as the devnet owner (0x3022...).
- Mints:
    - 1,000 VOID to WALLET
    - 100,000 WC to WALLET

You should see two successful tx receipts in the output and final balances.

Sanity check via the account JSON helper:

    cd ~/dev/void-node
    ACCOUNT="$WALLET" ops/void-workcredits-devnet-account-json.sh | jq .

And via the HTTP helper:

    curl -fsS \
      "http://127.0.0.1:4312/workcredits/devnet/dashboard/$WALLET.json" \
      | jq '.account.balances'

You should see non-zero "void" and "wc" balances.

## 5. Using the Obelisk WorkCredits UI

1. Make sure:
   - WorkCredits HTTP helper is running (4312).
   - Obelisk UI dev server is running (5173/5174).
2. Open the Obelisk URL in your browser.
3. Go to the WorkCredits tab.
4. Click "Use Wallet":
   - MetaMask will prompt for account access.
   - The UI sets address to the current MetaMask account and calls:
        /workcredits/devnet/dashboard/<wallet>.json
5. Confirm that:
   - Pool reserves are ~1,000,000 VOID and 100,000,000 WC.
   - Your wallet shows the minted VOID and WC amounts.

### Swapping

- Choose side:
    - "BUY WC (send VOID)"  -> spend VOID, receive WC.
    - "SELL WC (receive VOID)" -> spend WC, receive VOID.
- Enter a send amount (e.g. 10).
- The UI computes a receive estimate using the current price:
    - wc_per_void
    - void_per_wc
- Click "Execute Devnet Swap (via Wallet)".

Flow:

1. The UI builds a swap execution plan.
2. MetaMask will first ask you to approve token spend (MaxUint256) if needed.
3. MetaMask will then ask you to confirm the swap transaction.
4. After the transaction is confirmed on devnet, click "Load" in the UI to refresh.

You can also verify balances again via:

    ACCOUNT="$WALLET" ops/void-workcredits-devnet-account-json.sh | jq .
    curl -fsS \
      "http://127.0.0.1:4312/workcredits/devnet/dashboard/$WALLET.json" \
      | jq '.account.balances'

## 6. Metrics and WorkCredits mainnet pillar (summary)

Even though this runbook is devnet-focused, there is also a mainnet WorkCredits pillar.

Exporter:

    sudo ops/void-mainnet-workcredits-exporter.sh

Textfile output:

    /var/lib/node_exporter/textfile_collector/void_mainnet_workcredits.prom

Key gauges:

- void_mainnet_workcredits_health
- void:mainnet_workcredits:health:last_5m

Composite with validators + other pillars:

- void_mainnet_pillars_with_validators_and_workcredits_health
- void:mainnet_pillars_with_validators_and_workcredits:health:last_5m

Right now, mainnet WorkCredits addresses are zero in config, so:
- void_mainnet_workcredits_health = 0
- Composite pillars_with_validators_and_workcredits = 0
- Base pillars_with_validators (without WorkCredits) remains 1.

Alert:

- VoidMainnetWorkCreditsUnhealthy
    - Fires when void_mainnet_workcredits_health = 0 for >= 10 minutes.
