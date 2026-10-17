# Buy VOID — presale payment-rail policy attestation V1

**Status:** Source-policy clarification and historical-documentation erratum.
**Not** a release-source acceptance, payment instruction, host qualification,
live-market admission, or public presale activation.

## Why this versioned clarification is required

The frozen source candidate in draft
[#3409](https://github.com/6ZoSo9/void-node/pull/3409)
was deliberately pinned as immutable source evidence. Its operator
architecture document contains the sentence
`purchase safety with BTC-only presale`. That sentence is **incorrect as
a statement of the reviewed customer-payment rail**.

The later non-privileged Precision host census, draft
[#3415](https://github.com/6ZoSo9/void-node/pull/3415), accurately
describes the native-USDC payment rail. Rewriting the earlier freeze
documentation in place would invalidate frozen Git identities and
its exact-scope proof. This attestation therefore **leaves every frozen
source byte unchanged**, records the discrepancy explicitly, and states
which already-reviewed public policy is authoritative for future launch
review.

## Reviewed customer-facing policy

| Question | Source-reviewed contract |
| --- | --- |
| Presale accepted asset | **Native USDC only**, not BTC |
| Supported source chains | **Ethereum mainnet (chain ID 1)** and **Base mainnet (chain ID 8453)** |
| Unsupported payments | Bridged USDbC, lookalike tokens, unsupported chains, blind deposits and exchange/custodial sends |
| Fixed presale price | **1 USDC = 2 VOID** (equivalent to **$0.50 per VOID**) |
| Finite presale supply | **10,000,000 VOID** |
| Verified fulfillment | One canonical, finalized, uniquely bound payment may satisfy **at most one** fulfillment |
| WC/VOID opening | **Coupled** to public presale activation; WC/VOID price **market-determined**, no fixed conversion |
| Official BTC/VOID market | **Separate post-presale market**, not an approved presale checkout/payment rail |

All customer payment instructions and transfers remain **HOLD** pending
separately approved production source, RPC-finality, custody, signer/gas,
funding, duplicate-payment, capacity, one-payment/one-fulfillment, and
WC/VOID coupled-launch gates. Nothing here authorizes payment acceptance.

## Pinned repository evidence

The Python attestation reads **only public tracked source documents,
the frozen source manifest, and the V5 lock** at their exact Git
blobs/modes. It binds:

- `README.md`, blob `6b52c555eb7d93b9ea6652d50aa946f6a319d7de`;
- `scripts/lib/void_buy_void_dual_rail_server_policy_contract_v1.mjs`,
  blob `fbdfc69b23ea2c7a81ed83e0a327af37a94fc552`: executable-source
  definitions for Base chain 8453, Ethereum chain 1, native USDC, the
  10M pool, 2:1 rate and source-only activation HOLD;
- `docs/architecture/buy-void-dual-rail-server-policy-v1.md`,
  blob `a8c2300f7f2b1296790bf496e02a997f7126310f`;
- `docs/operators/wc-void-coupled-launch-regeneration-census-v2.md`,
  blob `0a0479fe6f22d3b09458749a31a63f90a510ce5a`;
- frozen #3409 architecture doc, blob
  `599203e3edb9deb39d7df6b0fd662373eee7ea30`;
- #3415 host runbook, blob
  `8ec7c32de83c673f26d53f91938d306b02086db1`;
- frozen source manifest, blob
  `91d2d7877bc3066e3030337576ca2dddeb55bfc8`;
- accepted V5 **source-identity-only** lock, blob
  `61a9d85d285f9c9d249adf401580822c44c6dac6`;
- host census proof, blob
  `e82feb591d3dfab838e0aeb597efab3f2b5866a3`.

The freeze manifest's historical field
`btc_void_presale_and_wc_void_pool_coupled=true` is **not** a payment-asset
allowlist. It must not be interpreted as authorization to accept BTC for
Buy VOID presale checkout. The actual customer rail is defined by the
reviewed native-USDC dual-rail policy above. A later versioned freeze
manifest should name the coupling without this ambiguity, but no
earlier manifest or lock is repinned here.

## Hosted verification

The source-only proof also pins the reviewed JavaScript dual-rail
policy contract in addition to the public docs. This is evidence of the
checked-in source configuration, not proof that either live RPC/payment
rail, server environment or runtime consumer is installed and ready.

The source-only proof requires exactly three **ADD-only** paths on
top of the immutable #3415 host-census head:
this document, the proof, and its CI workflow. It pins the exact
historical contradiction, positive canonical policy evidence and
the immutable freeze/host Git blobs. It explicitly rejects
unsupported `--apply`, refuses a dirty checkout, uses Git in read-only
mode, and makes no network contact or payment instructions.

The proof may return `GREEN` for **successful discovery and
versioned documentation of the historical inconsistency**. This is
**not** evidence that the frozen document itself has been edited,
that the source is production approved, or that payment rails
are live. The release-review status is explicitly
`PAYMENT_RAIL_DOCUMENTATION_RECONCILIATION_HOLD`.

## Authority and next decision

All live authority remains false:
`customer_payment_acceptance_authorized=false`,
`public_presale_activation=false`,
`wc_void_activation=false`,
`funds_movement=false`.

Before public launch, review and approve a versioned consumer-facing
release contract that consistently advertises the supported native-USDC
rails and never reproduces the legacy BTC-only presale claim. Qualify
Precision live/installed evidence and the entire coupled launch
separately. No real customer should send funds on the basis of this
source attestation.

**PROTECT THE CORE.**
