# Buy VOID Epoch-2 dormant runtime candidate V3

V3 is a **truth-correction successor** to V2. It does not select a new runtime
configuration, close an execution gate, or grant any new authority.

## Exact predecessor

Predecessor:
`ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v2.json`

Git blob:
`6a0159e516d30ca8a4b9af4dcace79a4fcddfbb1`

V3 Git blob:
`04061934a537a1d91213cdd1f9110b46faca4cc7`

## Repair

V2's remaining-gate text still said:

`qualify_live_zero_fee_or_nonzero_fee_envelope_and_exact_chain_receipt`

That wording could be read as if a nonzero Chain-2050 fee path were already
qualifiable from a standing fulfiller native balance.

V3 replaces only that remaining gate with:

`qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding`

This matches the current fee policy:
- a metered zero-fee path may qualify without native-gas funding;
- a nonzero fee path may not use a standing wallet balance as funding authority;
- nonzero fees require a separately reviewed, payment-specific native-gas
  funding/reservation proof before advancement.

## Preserved state

Byte-semantically unchanged from V2:
- complete `candidate_configuration`;
- complete `signer_credential_state`;
- complete `authority` object;
- remaining-gate count;
- selected RPC, contracts, fulfiller, inventory/rate policy and all disabled
  runtime/apply bits.

V3 remains candidate-only:
- runtime enabled = false;
- apply enabled = false;
- credential/private-key access = false;
- transaction signing/broadcast = false;
- payment acceptance = false;
- public presale activation = false;
- WC/VOID market activation = false;
- funds movement = false.

No host/runtime mutation, live query, credential access, signing, transaction or
economic action occurs.

PROTECT THE CORE.
