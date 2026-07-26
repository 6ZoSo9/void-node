# Buy VOID Public Checkout Contract V1

Marker: `VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1`

This lane establishes the request-first public checkout for the first real
Base USDC → native VOID fulfillment.

## Bound values

- Base Mainnet chain ID: `8453`
- Native Base USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Approved receiver: `0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5`
- Receiver proof marker:
  `VOID_BUY_VOID_BASE_RECEIVER_HTTPS_CONTROL_PROOF_CORRECTED_V4`
- Receiver proof receipt manifest:
  `dbb0334f7ab01ed11b8200c36d4d94cfc5879032119b530b3709e4b240967830`
- Native VOID delivery chain ID: `2050`
- Destination field: `void_destination_address`
- Fixed rate: `2 VOID per USDC` (`0.50 USDC per VOID`)

The receiver is source-bound. An environment receiver may be absent or match
the bound receiver exactly; a different environment receiver causes a
fail-closed checkout hold.

## Request contract

The buyer creates a JSON `POST` request at
`/__void/buy-void/request` before sending payment. The legacy GET mutation
route returns HTTP 405.

The Base USDC sender must equal the native VOID destination address. Only one
non-terminal request may exist per destination. Repeating the same amount is
idempotent; a different amount conflicts until the earlier request is
`fulfilled` or `rejected`.

The page cannot send USDC, request an approval, bind a payment transaction,
activate fulfillment, sign, broadcast, move funds, transfer VOID, or restart a
node.
