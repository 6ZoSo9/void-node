# VOID public economic launch UI v1

Marker: `VOID_PUBLIC_ECONOMIC_LAUNCH_UI_V1`

This source prepares the public website and application for the Buy VOID presale,
Work Credit earning visibility, and the WC/VOID market launch without activating
any economic authority.

## Presale

The Buy view reads the live checkout config, status, and sale-state routes. It
stays fail-closed unless canonical WC/VOID production + coupled-successor source
state is ready for the exact coupled launch ID, the node reports effective
request intake enabled, receiver binding green, payment ready, matching
request-intake readiness, and remaining inventory.

The environment activation switch cannot open intake independently of the
coupled source gate. Existing-payment verification remains available for
already-created obligations while new intake is held.

When OPEN, the browser may create exactly the already-reviewed guarded Buy VOID
request. The page does not connect a wallet, sign, approve, or send USDC.

The canonical receiver remains:

`0x17a26d4f0c51bd28fbcf5cdd4d20853bfa112ae5`

Base native USDC remains:

`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Ethereum Mainnet native USDC is policy-approved at:

`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`

When intake is OPEN, the public request contract accepts exactly two native-USDC
rails: Base Mainnet and Ethereum Mainnet. The participant must select one rail
before request creation and use only the exact chain ID, token contract,
receiver, amount, and sender identity returned by that request. Switching rails
after request creation is not allowed.

## Exchange and custody warning

SELF-CUSTODY ONLY. VOID is not listed on any exchange. The selected-rail USDC
sender is the VOID destination identity. Exchange and pooled-custody withdrawals can use
an address the participant does not control, so VOID cannot recover the
resulting delivery. The public UI instructs participants to treat those sends as
lost.

## Earn

The website says what the network actually does: useful verified work earns
Work Credits. It does not advertise direct VOID rewards.

## WC/VOID

The website exposes a launch-status surface, not a trading surface. WC/VOID
pricing remains market-determined. The old fixed 100 WC = 1 VOID conversion has
no production meaning, and the $0.50 presale price does not set the WC/VOID
market price.

No quote, trade, debit, settlement, signer, wallet, or market mutation is added
by this source.

## Authority boundary

- presale activation: false
- WC/VOID market activation: false
- public Earn mutation expansion: false
- wallet connection: false
- transaction signing: false
- USDC send by page: false
- VOID transfer by page: false
- funds movement by source change: false
