# VOID / Obelisk – WorkCredits Devnet API (v0)

This document describes the devnet-only HTTP API that Obelisk Wallet and other
clients can use to inspect WorkCredits (WC) state on VOID devnet.

For now this API is served by a small helper process, not by the main void-node
HTTP server. Later we can proxy or embed these routes behind the main node, but
v0 is meant to be simple and wallet-friendly.

-------------------------------------------------------------------------------
1. Base URL (devnet helper)
-------------------------------------------------------------------------------

By default the helper listens on:

    http://127.0.0.1:4312

You can override the port via the WC_HTTP_PORT environment variable.

Helper process (devnet, ad-hoc):

    cd "$HOME/dev/void-node"
    WC_HTTP_PORT=4312 ./ops/void-workcredits-devnet-http.sh

You should see logs similar to:

    [workcredits-http] ROOT=/home/zoso/dev/void-node
    [workcredits-http] PORT=4312
    [workcredits-http] listening on http://127.0.0.1:4312

In normal operation we run this helper as a systemd user service
(void-workcredits-devnet-http.service). See section 5.

-------------------------------------------------------------------------------
2. Endpoint: GET /workcredits/devnet/pool.json
-------------------------------------------------------------------------------

Returns the current WC/VOID pool state and prices on devnet.

    Method: GET
    Path  : /workcredits/devnet/pool.json
    Base  : http://127.0.0.1:4312

2.1 Request

    curl -fsS "http://127.0.0.1:4312/workcredits/devnet/pool.json" | jq .

2.2 Response shape (example)

    {
      "chain": "devnet",
      "up": 1,
      "health": 1,
      "health_5m": 1,
      "pool": {
        "address": "0xdab942e37D0D8da45eB19f31897dff7306914Ab9",
        "rpcUrl": "http://127.0.0.1:8545"
      },
      "reserves": {
        "void_raw": 1e24,
        "wc_raw": 1e26,
        "void": 1000000,
        "wc": 100000000
      },
      "price": {
        "wc_per_void": 100,
        "void_per_wc": 0.01
      }
    }

Fields:

- chain          – network tag, currently always "devnet".
- up             – 1 if the underlying Prometheus gauges can be read, 0 on error.
- health         – 1 if basic invariants pass (reserves > 0, prices > 0).
- health_5m      – 1 if health has been good for the last 5 minutes.
- pool.address   – WC/VOID pool contract address on devnet.
- pool.rpcUrl    – RPC URL the helper is querying (http://127.0.0.1:8545).
- reserves.*     – raw (void_raw, wc_raw) and human (void, wc) reserves.
- price.*        – wc_per_void (WC per 1 VOID) and void_per_wc (VOID per 1 WC).

Wallet UI can use this endpoint for:

- Showing pool liquidity.
- Showing current WC/VOID price.
- Plotting basic “price over time” charts by polling and storing snapshots.

-------------------------------------------------------------------------------
3. Endpoint: GET /workcredits/devnet/account/:address.json
-------------------------------------------------------------------------------

Returns balances and pending WC earnings for a single devnet address.

    Method: GET
    Path  : /workcredits/devnet/account/:address.json
    Base  : http://127.0.0.1:4312

The :address segment must be a hex EOA or contract address, for example:

    0x1234...abcd

(case-insensitive, 0x-prefixed).

3.1 Request

    ADDR="0xYOUR_DEVNET_ADDRESS"
    curl -fsS "http://127.0.0.1:4312/workcredits/devnet/account/$ADDR.json" | jq .

3.2 Response shape (example)

    {
      "chain": "devnet",
      "address": "0xYOUR_DEVNET_ADDRESS",
      "up": 1,
      "balances": {
        "void_raw": "0",
        "wc_raw": "0",
        "lp_raw": "0",
        "void": 0.0,
        "wc": 0,
        "lp": 0.0
      },
      "earnings": {
        "pending_wc_raw": "0",
        "pending_wc": 0.0
      },
      "meta": {
        "pool_address": "0xdab942e37d0d8da45eb19f31897dff7306914ab9",
        "workcredits_token": "0xf95864611c26d59da4a0534ec1dd3bd0ef6bae0a",
        "rpc_url": "http://127.0.0.1:8545",
        "state_json": "/home/zoso/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json",
        "broadcast_file": "/home/zoso/dev/void-node/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json",
        "updated_at": 1765500745
      }
    }

Important fields:

- chain                   – "devnet".
- address                 – the address you requested.
- up                      – 1 if the helper could read all required gauges and metadata.
- balances.void_raw       – raw VOID balance (string, 18 decimals).
- balances.wc_raw         – raw WC balance (string, 18 decimals).
- balances.lp_raw         – raw LP token balance (string).
- balances.void / wc / lp – human-readable balances for UI.
- earnings.pending_wc_raw – raw pending WC (string).
- earnings.pending_wc     – human-readable pending WC (float, for display only).
- meta.*                  – wiring/debug metadata; not required for normal UI use.

Wallet UI can use this endpoint for:

- Showing VOID and WC balances for the active wallet.
- Showing LP position size if the user is a liquidity provider.
- Showing “Pending WC” so the user can click Collect once we wire that flow.

-------------------------------------------------------------------------------
4. CORS / browser usage
-------------------------------------------------------------------------------

The helper sends JSON and is intended to be callable from local browser-based
wallet UIs during development.

If you see CORS or network errors:

- Confirm the helper is running on port 4312.
- Confirm the UI is calling http://127.0.0.1:4312 (not a stale port).

Later, Obelisk Wallet can:

- Call this helper directly (devnet only), or
- Go through future /workcredits/* routes exposed by void-node itself.

For v0 we standardize on the helper at:

    http://127.0.0.1:4312

-------------------------------------------------------------------------------
5. Systemd user service (recommended for dev)
-------------------------------------------------------------------------------

Instead of running the helper manually, you can install a systemd user unit:

    ~/.config/systemd/user/void-workcredits-devnet-http.service

Service behavior:

- Runs from $HOME/dev/void-node.
- Uses WC_HTTP_PORT=4312.
- Restarts on failure (Restart=on-failure).
- Logs visible via journalctl --user.

Basic commands:

    # Reload units (after creating or editing the service)
    systemctl --user daemon-reload

    # Start and enable at login
    systemctl --user enable --now void-workcredits-devnet-http.service

    # Check status / logs
    systemctl --user status void-workcredits-devnet-http.service --no-pager
    journalctl --user -u void-workcredits-devnet-http.service -n 50 --no-pager

Once the unit is running, the API should be reachable at:

    http://127.0.0.1:4312/workcredits/devnet/pool.json
    http://127.0.0.1:4312/workcredits/devnet/account/:address.json

-------------------------------------------------------------------------------
6. Obelisk Wallet integration (v0)
-------------------------------------------------------------------------------

For Obelisk Wallet v0, the WorkCredits “data client” should:

- Treat http://127.0.0.1:4312 as the devnet base URL.
- Use the two endpoints documented here:
    - GET /workcredits/devnet/pool.json
    - GET /workcredits/devnet/account/:address.json
- Map fields as follows:

  Wallet balances tab:

    - VOID balance = balances.void
    - WC balance   = balances.wc
    - LP balance   = balances.lp
    - Pending WC   = earnings.pending_wc

  Trading view tab:

    - Price WC/VOID = price.wc_per_void
    - Price VOID/WC = price.void_per_wc
    - Liquidity     = reserves.void and reserves.wc

Future versions will add:

- POST endpoints for swapping WC/VOID.
- POST endpoints for adding/removing liquidity.
- Authenticated endpoints for “collect pending WC”.

This document is the canonical v0 spec for the WorkCredits devnet API.

-------------------------------------------------------------------------------
3. Endpoint: GET /workcredits/devnet/account/:address.json
-------------------------------------------------------------------------------

Returns the WorkCredits / VOID balances and pending earnings for a single
devnet address. This is a thin wrapper around devnet JSON-RPC / ERC-20 state
plus our WorkCredits bookkeeping.

Method: GET
Path  : /workcredits/devnet/account/:address.json
Base  : http://127.0.0.1:4312

Example:

    cd "$HOME/dev/void-node"

    # Make sure the helper is running on 4312
    WC_HTTP_PORT=4312 ./ops/void-workcredits-devnet-http.sh &
    HELPER_PID=$!
    sleep 2

    ADDR="0x1111111111111111111111111111111111111111"

    curl -fsS "http://127.0.0.1:4312/workcredits/devnet/account/$ADDR.json" | jq .

    kill "$HELPER_PID" || true

Example response (shape):

    {
      "chain": "devnet",
      "address": "0x1111111111111111111111111111111111111111",
      "up": 1,
      "balances": {
        "void_raw": "0",
        "wc_raw": "0",
        "lp_raw": "0",
        "void": 0,
        "wc": 0,
        "lp": 0
      },
      "earnings": {
        "pending_wc_raw": "0",
        "pending_wc": 0
      },
      "meta": {
        "pool_address": "0xdab942e37d0d8da45eb19f31897dff7306914ab9",
        "workcredits_token": "0xf95864611c26d59da4a0534ec1dd3bd0ef6bae0a",
        "rpc_url": "http://127.0.0.1:8545",
        "state_json": "/home/zoso/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json",
        "broadcast_file": "/home/zoso/dev/void-node/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json",
        "updated_at": 1765503547
      }
    }

Notes:

- up == 1 means the helper successfully read chain state.
- void / wc / lp are human-readable balances, derived from 18-decimal raw units.


-------------------------------------------------------------------------------
4. Endpoint: GET /workcredits/devnet/dashboard/:address.json
-------------------------------------------------------------------------------

This is the main endpoint Obelisk Wallet should use for the WorkCredits tab.

It combines:

- Current pool state (reserves, prices, health)
- The caller’s balances and pending earnings

into a single JSON payload.

Method: GET
Path  : /workcredits/devnet/dashboard/:address.json
Base  : http://127.0.0.1:4312

Example:

    cd "$HOME/dev/void-node"

    WC_HTTP_PORT=4312 ./ops/void-workcredits-devnet-http.sh &
    HELPER_PID=$!
    sleep 2

    ADDR="0x1111111111111111111111111111111111111111"

    curl -fsS "http://127.0.0.1:4312/workcredits/devnet/dashboard/$ADDR.json" | jq .

    kill "$HELPER_PID" || true

Example response (shape):

    {
      "chain": "devnet",
      "address": "0x1111111111111111111111111111111111111111",
      "pool": {
        "chain": "devnet",
        "up": 1,
        "health": 1,
        "health_5m": 1,
        "pool": {
          "address": "0xdab942e37D0D8da45eB19f31897dff7306914Ab9",
          "rpcUrl": "http://127.0.0.1:8545"
        },
        "reserves": {
          "void_raw": 1e24,
          "wc_raw": 1e26,
          "void": 1000000,
          "wc": 100000000
        },
        "price": {
          "wc_per_void": 100,
          "void_per_wc": 0.01
        }
      },
      "account": {
        "chain": "devnet",
        "address": "0x1111111111111111111111111111111111111111",
        "up": 1,
        "balances": {
          "void_raw": "0",
          "wc_raw": "0",
          "lp_raw": "0",
          "void": 0,
          "wc": 0,
          "lp": 0
        },
        "earnings": {
          "pending_wc_raw": "0",
          "pending_wc": 0
        },
        "meta": {
          "pool_address": "0xdab942e37d0d8da45eb19f31897dff7306914ab9",
          "workcredits_token": "0xf95864611c26d59da4a0534ec1dd3bd0ef6bae0a",
          "rpc_url": "http://127.0.0.1:8545",
          "state_json": "/home/zoso/dev/void-node/docs/VOID-DEVNET-PROTOCOL-STATE.json",
          "broadcast_file": "/home/zoso/dev/void-node/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json",
          "updated_at": 1765503547
        }
      }
    }

Wallets should generally only need this endpoint for the WorkCredits tab:
price, pool reserves, balances, and pending WC are all present here.


-------------------------------------------------------------------------------
5. Obelisk Wallet – minimal WorkCredits usage
-------------------------------------------------------------------------------

For the Obelisk Wallet WorkCredits tab (devnet):

- Base URL: http://127.0.0.1:4312
- Address : user’s connected EOA (from the wallet)

Basic flow:

1. On load, call:

       GET /workcredits/devnet/dashboard/:address.json

2. Use the response to populate:
   - Price card (wc_per_void, void_per_wc)
   - Pool reserves (void, wc)
   - User balances (void, wc, lp)
   - Pending WC (earnings.pending_wc)

3. Periodically refresh the dashboard endpoint (e.g., every 10–30 seconds)
   while the WorkCredits tab is visible.

This dashboard endpoint is the canonical source for the WorkCredits panel in
Obelisk on devnet.
