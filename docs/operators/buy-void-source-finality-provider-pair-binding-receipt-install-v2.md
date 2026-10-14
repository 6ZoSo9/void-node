# Buy VOID provider-pair installer current-enforcement binding V2

Marker: `VOID_BUY_VOID_SOURCE_FINALITY_PROVIDER_PAIR_RECEIPT_INSTALL_V1`.

## Repair

The original V7 provider-pair installer was pinned to the historical accepted
enforcement constant
`1f83d8e867fc53e8a9ed240f4876f1f9412b7b2dca7c06cbb479dbe38e40a93b`
and parsed the older deployment-receipt schema.

That would reject a legitimate deployment receipt produced from the new
recursion-free V7 enforcement lock even though V7 runtime authority explicitly
treats the compile-time constant as historical-only.

This successor instead trusts only the root-custodied deployment receipt after
verifying its current full schema and content address.

The deployment receipt must prove:

- accepted enforcement set is a SHA-256 identity;
- complete executable closure is true;
- candidate enforcement identity is accepted;
- enforcement lock Git blob and SHA-256 are well formed;
- the enforcement lock ID rederives from those exact three identities;
- process source commit/tree/main identity is well formed;
- current V7 reviewed-source count and digest match;
- the complete deployment receipt ID rederives; and
- canonical JSON wire bytes are exact.

The provider-pair receipt then carries the enforcement set from that verified
deployment receipt. It does not compare it to the historical V7 constant.

## Operation-bound apply

Plan mode prints the exact content-addressed `provider_pair_receipt_id`. Apply
must supply that value again as
`--expected-provider-pair-receipt-id <voidbsfpp1_...>` in addition to the
fixed confirmation token. Immediately before publication, apply re-reads and
reverifies the deployment receipt, rebuilds the provider-pair receipt from the
current deployment binding and provider inputs, and requires both the expected
receipt ID and canonical bytes to match the reviewed invocation. Any provider
identity/fingerprint drift or deployment/enforcement drift HOLDS before the
create-once filesystem mutation.

## Fresh regression

The focused proof uses the current recursion-free V7 candidate set:

`f1f3fbdd0a015fdabf8da924a53a87174663d38cdde182cdc036cf0f9a3407bd`.

It requires that set to pass through a valid current-schema deployment receipt
into the provider-pair receipt. A forged enforcement-lock ID and stale reviewed
source digest both HOLD.

## Authority boundary

This is source/CI repair only. It does not install a production receipt.

```text
rpc_contact=false
credential_access=false
wallet_or_signer_access=false
transaction_broadcast=false
service_mutation=false
public_presale_activation=false
funds_movement=false
```

A separately reviewed immutable/root-owned production launcher is still
required before real root `--apply`.

PROTECT THE CORE.
