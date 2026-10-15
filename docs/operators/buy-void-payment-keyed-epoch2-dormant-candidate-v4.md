# Buy VOID Epoch-2 dormant runtime candidate V4

V4 is an additive truth-correction successor to merged V3. It does not enable
runtime/apply authority, select a new wallet, or close any live economic gate.

## Exact predecessor

Predecessor:
`ops/mainnet0/buy-void-payment-keyed-epoch2-dormant-candidate-v3.json`

Git blob:
`04061934a537a1d91213cdd1f9110b46faca4cc7`

V4 Git blob:
`e569c9211e01f14c7c00dd1c5041d4dfb0817609`

## Repair

V3 correctly retired standing fulfiller balance as nonzero-fee funding
authority, but its replacement gate was grammatically ambiguous:

`qualify_live_zero_fee_envelope_and_exact_chain_receipt_or_prove_per_payment_native_gas_funding`

That can be parsed as:

`(zero-fee AND exact-chain-receipt) OR per-payment-funding`

and could therefore be read as allowing the nonzero-fee branch to bypass the
exact chain receipt.

V4 replaces only that remaining-gate string with:

`qualify_live_exact_chain_receipt_and_either_zero_fee_envelope_or_per_payment_native_gas_funding`

The contract is now unambiguous:

1. an exact live Chain-2050 receipt/observation is required in every branch;
2. then fee admissibility is either:
   - a reviewed live zero-fee envelope; or
   - separately reviewed payment-specific native-gas funding/reservation.

A standing fulfiller native balance remains insufficient authority for the
nonzero-fee branch.

## Preserved state

V4 requires byte-semantic equality with V3 for:

- complete `candidate_configuration`;
- complete `signer_credential_state`;
- complete `authority` object;
- production RPC/contract/fulfiller/inventory/rate policy;
- remaining-gate count.

Only the fee/chain-receipt gate wording changes.

## Authority

V4 remains candidate-only:

- runtime enabled = false;
- runtime apply enabled = false;
- credential/private-key access = false;
- transaction signing/broadcast = false;
- payment acceptance = false;
- public presale activation = false;
- WC/VOID market activation = false;
- funds movement = false.

No host/runtime mutation, RPC call, credential access, signing, transaction,
gas spend, inventory movement, presale/WC activation, or funds movement occurs.

PROTECT THE CORE.
