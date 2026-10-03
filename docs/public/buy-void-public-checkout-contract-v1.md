# Buy VOID Public Checkout Contract V1

Marker: `VOID_BUY_VOID_PUBLIC_CHECKOUT_CONTRACT_V1`

This lane establishes the request-first public checkout for Base or Ethereum
native USDC → native VOID fulfillment.

The payment policy accepts exactly two payment rails as approved policy
options, but request readiness is rail-specific. Base follows the coupled Buy
request gate. Ethereum remains HOLD
unless its separate fail-closed request gate is explicitly opened:

- Base Mainnet native USDC: chain ID `8453`, contract
  `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- Ethereum Mainnet native USDC: chain ID `1`, contract
  `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

The buyer must select one rail in the request and use only the exact chain and
token returned in that request's payment instructions. Both rails remain
request-first, self-custody only, separately payment-verified, and explicitly
fulfilled; payment observation alone never sends VOID.

## Bound values

- Base Mainnet chain ID: `8453`
- Ethereum Mainnet chain ID: `1`
- Native Ethereum USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
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
the sender.** The selected-rail USDC sender address is bound as the native VOID
destination identity. If a custodian sends on the participant's behalf, VOID
may be delivered to an address the participant does not control. VOID cannot
recover those funds. Treat exchange/custodial sends as lost.

The participant UI must display this warning before request creation and again
with any returned payment instructions. The self-custody acknowledgement is
required before a request can be created.

Request intake is fail-closed by default. Source defaults
`VOID_BUY_REQUESTS_ENABLED=0`; an explicit `VOID_BUY_REQUESTS_ENABLED=1`
activation is required for Base request intake at the coupled presale/WC launch.
Ethereum additionally requires `VOID_BUY_ETHEREUM_REQUESTS_ENABLED=1`, which
defaults to HOLD and cannot be opened merely by enabling Base. Until the relevant
rail gate is open, the public surface is inspectable but that rail rejects new
request/payment intake.
Payment verification for already-created obligations remains available without
reopening new-request intake.

## Request contract

The buyer creates a JSON `POST` request at
`/__void/buy-void/request` before sending payment. The legacy GET mutation
route returns HTTP 405.

The selected-rail USDC sender must equal the native VOID destination address.
For backward compatibility, `ack_base_native_usdc` is accepted only for Base requests. Ethereum requests require the generic selected-rail `ack_native_usdc` acknowledgement explicitly.
Only one non-terminal request may exist per destination. Repeating the same
amount on the same payment chain is idempotent. Changing the amount or payment
chain conflicts until the earlier request is `fulfilled` or `rejected`.

The page cannot send USDC, request an approval, bind a payment transaction,
activate fulfillment, sign, broadcast, move funds, transfer VOID, or restart a
node.
