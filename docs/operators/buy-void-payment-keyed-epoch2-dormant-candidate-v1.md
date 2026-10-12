# Buy VOID Epoch-2 dormant runtime candidate v1

This checked-in record is a **source-only, non-installable successor proposal**.
It does not replace or mutate the preserved Epoch-1 production candidate or
July 24, 2026 1-USDC/Base → 2-VOID historical fulfilled customer proof.

## Reviewed tuple

- Production QBFT RPC: `http://127.0.0.1:18553/`, selected by
  `ops/mainnet0/production-epoch2-rpc-target-v1.json`.
- Epoch-2 presale: `0x530bc90ba74f2539a9e484ccb1be9291c3bc35ce`.
- Immutable presale fulfiller: `0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`
  (ceremony role `launch_operator_signer`).
- Token: `0x470075b85352eb86f7d089fb9ba88945f12aad94`.
- Gas-estimate safety multiplier 15,000 bps; maximum computed delivery
  gas limit 320,000, carried from the reviewed dormant original.

The **maximum priority fee is zero** in the new candidate. The retired
candidate requires 1 gwei priority fees, which cannot pass the current
Epoch-2 zero-gas-price execution path: the payment-keyed planner holds
when its configured priority fee exceeds the computed maximum. The zero
priority value does not grant a zero-fee market override; source still
must observe and validate the selected RPC's actual fee response before
constructing a transaction. This candidate is not proof of future gas
pricing or sufficient balances.

## Distinct public source-policy selector — NOT signer evidence

The dormant candidate now carries
`VOID_BUY_VOID_EPOCH2_CREDENTIAL_SOURCE_BINDING_ID` with exact SHA-256
`5fde8cc7fcd0493619c105ac9f367063fbdacd74e8ae50df76454c6d298206f1`.
It binds the reviewed E2 chain, contract, RPC, immutable fulfiller and the
**separate** systemd credential leaf name `buy-void-epoch2-fulfiller-v1`.
This ID is publicly computable. It is **not a signature, not installed
credential evidence, not runtime application authorization** and cannot
replace an operator-controlled current-generation signer attestation.
The E1 credential evidence field is still deliberately omitted. Candidate
FULL_RUNTIME_ENABLED and FULL_RUNTIME_APPLY_ENABLED remain 0.

## Deliberate signing HOLD

`VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID` and
`CREDENTIALS_DIRECTORY` are **omitted**. The original binding evidence
certifies only the retired `0xc884f6...` wallet, **not** the immutable
Epoch-2 fulfiller. The exact new signer has not produced accepted
current-generation systemd credential evidence in this source change.

Therefore even a successful EIP-191 public address-control challenge is
insufficient to turn this configuration into an executable runtime. A
separate approved ceremony must bind the **actual installed systemd
credential** to the exact E2 fulfiller, source generation, RPC and
zero-fee-compatible type-2 signed access-list domain.

The activation envelope remains disabled:

```text
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0
VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0
public_customer_payment_intake=false
wc_void_market_activation=false
```

Do **not** paste the candidate into a live unit or change its enable
flags. It intentionally fails production credential admission. An
inactive runtime candidate does not establish payment finality,
exactly-once allocation, a verified current-chain delivery receipt,
public acceptance, or WC/VOID launch authority.

## Inert verification

From the exact reviewed source tree:

```sh
node --import tsx scripts/prove_buy_void_payment_keyed_epoch2_dormant_candidate_v1.ts
```

The proof checks the immutable Epoch-2 target, archived original
candidate, and role-mapping manifest. It rejects legacy signer/RPC/
contract regression, inherited credential evidence or credential
directory, nonzero priority fee, unknown configuration keys, false
signer attestations, and any premature runtime/financial activation.
It also checks the reported read-only 154,388-gas estimate would yield
231,582 gas at the selected 150% multiplier. This is a numerical source
check, not a new live RPC observation.

Next separately reviewed operator gates: actual signer-control
attestation; installed credential identity; a current-generation
runtime/transaction provenance acceptance; a controlled real
Epoch-2 payment-to-fulfillment canary; and coupled presale/WC-VOID
Sovereign opening authorization.
