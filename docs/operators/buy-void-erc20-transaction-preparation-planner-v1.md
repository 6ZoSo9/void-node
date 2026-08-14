# Buy VOID ERC-20 transaction preparation planner v1

This source lane adds the standalone read-only transaction-preparation planner for the canonical Buy VOID `VoidToken` ERC-20 fulfillment path.

## Purpose

The existing native-value nonce/fee planner is not semantically valid for ERC-20 fulfillment because it requires a positive native delivery value and includes that delivery value in the wallet-balance requirement. Canonical `VoidToken.transfer(...)` instead uses:

- Chain ID `2050`;
- transaction target = canonical `VoidToken`;
- transaction `value = 0`;
- calldata = exact `transfer(delivery_address, token_amount_atoms)`;
- native balance only for gas.

This planner therefore does not reuse the native-value planner.

## Read-only RPC surface

The planner permits exactly:

- `eth_chainId`;
- `eth_getTransactionCount` with `pending`;
- `eth_gasPrice`;
- `eth_estimateGas` for the exact zero-value token transfer;
- `eth_getBalance`.

The RPC URL is server-controlled loopback HTTP only. The built-in HTTP transport keeps socket-inactivity protection and also enforces a total wall-clock deadline from request start through complete response-body consumption. Incoming response bytes do not reset that total deadline, and every terminal path clears it exactly once.

The focused proof exercises the real built-in transport against a local slow-drip HTTP server that emits bytes more frequently than the inactivity timeout. The planner must still terminate fail closed within the configured total deadline.

## Fail-closed bindings

A plan is returned only when:

- the execution attempt is still `reserved` and otherwise clean;
- the attempt carries no signing/broadcast/money authority from the reservation module;
- the delivery address and six-decimal VOID fulfillment amount are valid;
- conversion to 18-decimal token atoms is exact integer-only `10^12`;
- `eth_chainId` is exactly `2050`;
- the pending nonce is valid;
- gas price is positive;
- gas estimation succeeds for the exact canonical token transfer with `value = 0`;
- buffered gas remains within the configured maximum;
- computed max fee remains within the configured maximum;
- priority fee does not exceed computed max fee;
- the fulfillment wallet's native balance covers the bounded gas cost.

The resulting transaction plan is compatible with the canonical ERC-20 sign/broadcast adapter's existing plan shape.

## Authority boundary

This module is source-only and parent-unmounted. It does not:

- read or write files;
- access wallet credentials or secrets;
- sign a transaction;
- broadcast a transaction;
- persist raw transaction material;
- mutate the execution attempt;
- decrement inventory;
- mount a runtime route;
- retry automatically;
- move VOID, BTC, or any funds.

## Integration sequencing

This PR intentionally adds only new standalone source/proof/docs/CI files so it does not collide with the still-open canonical receipt-reconciliation PR.

Canonical runtime truth must **not** mark `erc20_transaction_preparation_bridge_ready` true from this source-only PR alone. After the receipt-reconciliation PR is merged, a separate collision-clear integration gate can bind this planner into canonical source truth while preserving dependency-bootstrap and execution HOLD boundaries.
