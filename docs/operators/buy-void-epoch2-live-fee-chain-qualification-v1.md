# Buy VOID Epoch-2 live fee + chain qualification v1

Marker:
`VOID_BUY_VOID_EPOCH2_LIVE_FEE_CHAIN_QUALIFICATION_V1`.

Status: **source-only read-only live qualification runner; live execution remains
separately authorized**.

## Purpose

This gate follows the authenticated credential + accepted signer-control
composition and qualifies the current Chain-2050 fee/funding envelope without
constructing, signing or submitting an economic transaction.

The production payment-keyed transaction-preparation source uses
`eth_gasPrice` as its live fee signal. This runner mirrors that policy exactly:

- accepted gas-limit multiplier: 15,000 bps;
- accepted maximum gas limit: 320,000;
- fee multiplier: 20,000 bps / 200%;
- maximum fee per gas: 3,000,000,000 wei;
- maximum priority fee per gas: 0 wei.

If live gas price is zero, the exact Epoch-2 presale may use a zero-fee Type-2
envelope. If live gas price is nonzero, the conservative observed gas price is
the greater of the two bounded live observations and the derived maximum fee is
`ceil(observed * 20000 / 10000)`.

The computed fee must remain at or below 3 Gwei and the configured priority fee
must remain zero and no greater than computed max fee.

## Fresh credential/signer child

Live mode accepts no supplied child receipt.

It invokes the exact authenticated credential + signer-control child Git object:

`6d68b52ec036e422a151239f9c8f3ee7faa28055`.

The child must still be dormant:
- authenticated credential identity and active signing capability proven;
- accepted signer-control evidence bound;
- no transaction signing/broadcast;
- `customer_safe_to_pay=false`;
- no payment/presale/WC/funds authority.

The chain observation is bracketed by **two fresh child invocations**. Because
each child contains a fresh non-transaction challenge/signature, the two child
receipt IDs are expected to differ. The fee gate instead derives a closed
stable runtime identity from both receipts and requires exact equality of:

- source head / chain / epoch / presale / fulfiller;
- accepted signer-control evidence identities;
- dormant candidate lineage;
- credential-query lock;
- runtime UID;
- authenticated manager PID + start ticks;
- service MainPID + start ticks;
- authenticated credential qualification SHA-256;
- signer address.

A service restart, credential-generation change, or authenticated-manager
generation change during the 12-second chain observation therefore HOLDS.
Both public child receipts are retained in the final fee receipt so this
bracketing is independently reviewable.

## Candidate-v2 policy binding

The runner loads the exact dormant candidate v2 Git object:

`6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1`.

Its selected production RPC, fulfiller, presale target and exact fee/gas policy
must match the constants above.

No caller can substitute another RPC or fee policy.

## Read-only Chain-2050 receipt

The fixed endpoint is:

`http://127.0.0.1:18553/`.

Allowed live RPC methods are only:

- `eth_chainId`;
- `eth_blockNumber`;
- `eth_getBlockByNumber`;
- `net_peerCount`;
- `qbft_getValidatorsByBlockNumber`;
- `eth_getCode`;
- `eth_gasPrice`;
- `eth_getBalance`.

The runner does not call `eth_estimateGas` because the current dormant
candidate already binds the accepted 320,000 production gas ceiling. It also
does not reserve a nonce or construct fulfillment calldata.

The observation requires:

- chain ID 2050;
- accepted historical block 3854 and its exact reviewed hash;
- current block progression across a 12-second observation window;
- at least two peers before and after;
- the exact three reviewed QBFT validators at both pinned heads;
- exact presale and VoidToken runtime-code SHA-256 identities;
- two live `eth_gasPrice` observations;
- conservative fee derivation matching production semantics;
- the accepted 320,000 gas ceiling;
- pending fulfiller native balance sufficient for
  `320000 * computed_max_fee_per_gas`;
- re-read of the final pinned block with identical hash.

The receipt builder independently rederives all fee arithmetic from the
observation and candidate policy before emitting a content-addressed receipt.

## Authority boundary

Even a GREEN live fee/chain receipt remains pre-canary evidence.

It keeps:

- `transaction_calldata_constructed=false`;
- `nonce_reserved=false`;
- `transaction_signing_proven=false`;
- `transaction_constructed=false`;
- `transaction_submitted=false`;
- `transaction_broadcast=false`;
- `customer_payment_record_access=false`;
- `customer_safe_to_pay=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `chain2050_mutation=false`;
- `funds_movement=false`;
- `production_host_evidence_authority=false`.

The only sensitive descendant action is the already-reviewed non-transaction
credential signature performed by the exact child chain.

Hosted CI uses inert transports only and performs no network access.

A future live GREEN receipt advances only to:

`COMPLETE_CURRENT_CHAIN2050_ONE_PAYMENT_ONE_FULFILLMENT_CANARY`.

PROTECT THE CORE.

## Fresh RPC host binding

The selected production RPC descriptor and historical runtime observation are
expected-generation data only, not current authority. The live gate freshly
revalidates the exact service process, kernel cgroup/argv/environment, rootless
Docker socket and accepted container generation, exact port mapping and
loopback listener before and after the fee window. Any drift HOLDS.

The production receipt builder accepts only host-binding objects minted by the
live observer in the same process; synthetic JSON cannot acquire fresh-host
authority.
