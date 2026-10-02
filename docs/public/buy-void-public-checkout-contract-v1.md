# Buy VOID Public Checkout Contract V1

Marker: `VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1`

This lane establishes the request-first public checkout for the first real
Base USDC → native VOID fulfillment.

The broader payment policy also allowlists native Ethereum Mainnet USDC
(chain ID `1`, contract
`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`) and Base Mainnet native USDC
(chain ID `8453`, contract
`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`). **That dual-chain allowlist
does not mean both rails are currently active.** This checkout remains Base-only
until the Ethereum receiver, receipt verification, finality, and request-path
gates are separately activated. Participants must not send Ethereum USDC until
the live checkout explicitly marks the Ethereum rail OPEN.

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

## Self-custody and exchange-wallet loss warning

**SELF-CUSTODY ONLY. VOID is not listed on any exchange. Do not send USDC from
an exchange, pooled-custody account, bridge, or payment processor that obscures
the sender.** The Base USDC sender address is bound as the native VOID
destination identity. If a custodian sends on the participant's behalf, VOID
may be delivered to an address the participant does not control. VOID cannot
recover those funds. Treat exchange/custodial sends as lost.

The participant UI must display this warning before request creation and again
with any returned payment instructions. The self-custody acknowledgement is
required before a request can be created.

Request intake is fail-closed by default. Source defaults
`VOID_BUY_REQUESTS_ENABLED=0`; an explicit `VOID_BUY_REQUESTS_ENABLED=1`
activation is required for the coupled presale/WC launch ceremony. Until then,
the public surface is inspectable and new request/payment intake remains held.
Payment verification for already-created obligations remains available without
reopening new-request intake.

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
