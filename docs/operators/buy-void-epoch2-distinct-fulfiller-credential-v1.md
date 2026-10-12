# Epoch-2 Buy VOID fulfiller: distinct systemd credential signer V1

Status: **source-only / not mounted / no production key or authorization observed**.

This optional signer factory extends the already-reviewed descriptor-bound
private-credential reader without changing the historical E1 caller. It uses a
*new*, fixed, separately provisioned systemd credential identity:

`buy-void-epoch2-fulfiller-v1`

The original credential `buy-void-native-fulfillment-wallet-v1` is unchanged
and is **never** an alternate source or fallback for this E2 signer.

The factory accepts only a systemd-provided absolute credentials-directory
candidate, reads exactly the fixed E2 leaf through the pinned no-follow
descriptor, and requires that its derived **public** EVM address match the
immutable E2 presale's only authorized fulfiller:

`0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`

It returns HOLD on absent or mismatched credentials, insecure file
permissions/ownership, symlink or multi-linked credential, FD identity drift,
invalid bytes or wrong public address. The distinct E2 signer can sign
**only** canonical Chain 2050 type-2 zero-value
`fulfill(bytes32,address,uint256)` transaction envelopes to the reviewed
E2 presale contract `0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce`.
It requires the exact reviewed Epoch-2 access-list domain marker, positive
bounded amount, nonzero payment ID, reviewed gas ceiling and zero priority fee.
It does not broadcast, store a raw transaction, create an allocation record,
accept a payment, enable any runtime, or grant an operator action.

**Credential access is a privileged future operation.** Do not invoke the
real factory against an installed key without a separately authorized, exact
operator procedure. The source-only test uses a *publicly known dummy key*
and proves that it cannot be admitted as the immutable E2 signer. No actual
private signer key is included, derived, accessed, installed, copied, or
committed by this lane.

Draft #2821 now wires this distinct E2 factory into the **current**
payment-keyed parent and directly called PostgreSQL dependency bootstrap.
The E2 path requires an exact SHA-256 source-policy selector in
`VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID` and **refuses** the
historical E1 `VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID`.
The public source selector is **not an installed credential attestation**.
The signer file is read only inside an explicitly invoked signing operation,
where it must derive the contract's immutable public fulfiller. Missing,
wrong, or old E1 files fail closed. All live enable/apply bits remain OFF.

Production remains HOLD pending a separately authorized installed E2
credential/control check, current runtime deployment and source acceptance,
a real current-chain canary, and coupled WC/VOID Sovereign launch. None of
the E1 credential evidence IDs or the July purchase history is rewritten.

Focused inert verification:

```sh
node --import tsx scripts/prove_buy_void_epoch2_credential_signer_v1.ts
node --import tsx scripts/prove_buy_void_native_fulfillment_wallet_credential_signer_v1.ts
```

The historical July 24 real Base 1-USDC -> Epoch-1 2-VOID purchase seal is
preserved. The current E2 presale holds a separately verified 10M VOID
inventory on Chain 2050; that is not proof of payment readiness.
