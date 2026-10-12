# USDC External Receipt RPC Reader User-Agent Compatibility Repair v1

Marker: VOID_USDC_EXTERNAL_RECEIPT_RPC_READER_USER_AGENT_COMPATIBILITY_REPAIR_V1

Purpose: repair the live read-only USDC external receipt RPC reader so free/public Base RPC endpoints that reject Python urllib's default client may accept the request through an explicit benign User-Agent header.

Repair scope:

- Adds `user-agent: void-node-live-readonly/1.0` to the JSON-RPC HTTP request.
- Keeps the reader read-only.
- Keeps default disabled behavior when required env is missing.
- Allows explicit-env live receipt observation against free Base RPC.
- Does not verify finality.
- Does not trust an external state root.
- Does not verify real payment for fulfillment.
- Does not reserve inventory.
- Does not write the private allocation ledger.
- Does not fulfill automatically.
- Does not transfer VOID.

Observed public/free Base RPC compatibility:

- `https://mainnet.base.org`
- chain id `8453`
- `eth_getTransactionReceipt` live-read-only path returns receipt observation when explicit env is supplied.

Non-activation statement: this repair only improves HTTP compatibility for live read-only receipt observation. It adds no payment authority, finality authority, allocation authority, inventory authority, fulfillment authority, wallet authority, or public mutation authority.
