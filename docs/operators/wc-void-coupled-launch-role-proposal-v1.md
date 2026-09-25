# WC/VOID coupled launch role proposal v1

Marker: `VOID_WC_VOID_COUPLED_LAUNCH_ROLE_PROPOSAL_V1`

Status: proposal only. This artifact does not assign contract authority, access a
credential or wallet, construct/sign/broadcast a transaction, deploy/fund the
market vault, activate WC/VOID, activate the presale, mutate WC, or move funds.

## Deterministic coupled launch identity

The coupled launch ID is derived as SHA-256 over canonical JSON for one exact
economic/contract commitment:

- Chain ID `2050`;
- presale pool `buy-void-presale-v1`;
- presale policy `presale-v1`;
- presale inventory `10,000,000 VOID`;
- canonical presale rate `2 / 1` fulfillment units;
- pair `WC_VOID`;
- WC/VOID protocol inventory `10,000,000 VOID`;
- protocol WC seed `0 WC`;
- opening price source `settled_wc_reserve_ratio`;
- accepted `WCVoidMarketVaultV2` compiled identity and bytecode hashes; and
- the canonical policy that presale and WC/VOID must open together.

The result is:

```text
0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83
```

That ID is independent of the eventual signer/controller addresses. Rotating or
rejecting a controller candidate therefore does not silently change the
economic launch commitment.

## Proposed role candidates

### Launch controller candidate

```text
0x2f1E0005E865b772B268bD8c797Bf3EAa901d97E
```

This is a fresh dedicated WC/VOID launch-controller key generated on Nimo while
the host had no default route, no global IPv4 address, and no global IPv6
address.

Public evidence:

```text
ops/mainnet0/wc-void-launch-controller-offline-generation-evidence-v1.json
```

The evidence records:

- offline generation was proven at creation;
- the private key file was created mode `0600`;
- the private key was not printed or exported;
- no mnemonic was generated or printed;
- existing wallet-secret files were not read;
- the public identity receipt SHA-256 is
  `7ca273a6b188e64e7099d57e7705345559fe7156c12406cde5097ce47350f431`;
- generation-time key availability is verified; and
- no signing challenge or transaction signing has been performed.

The private key remains off-repository on Nimo.

### Settlement executor candidate

```text
0xc884f631c3881b8b672bfcbf019c856146cd7f73
```

This is the current production Buy VOID fulfillment wallet, bound by the
existing production credential evidence.

Evidence:

```text
src/economic/buy_void_erc20_production_credential_binding_evidence_v1.ts
```

Its current presale fulfillment authority does not automatically authorize
WC/VOID market settlement. Reuse would be an explicit authority expansion and
is therefore unapproved in this packet.

### Closeout controller candidate

```text
0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b
```

This is the currently evidenced Chain-2050 Sovereign owner address from the
September role-authority genesis authorization.

Evidence:

```text
ops/mainnet0/chain2050-role-authority-sovereign-genesis-append-authorization-v1.json
```

Its existing Sovereign/registry authority does not automatically authorize
WC/VOID terminal closeout. That authority expansion is explicitly unapproved.

## Separation properties

The three proposed addresses are distinct from one another and from the native
VOID token.

The proposal preserves the V2 requirement that:

```text
settlement_executor != closeout_controller
```

The deployment-preparation gate additionally requires all three production role
addresses to be distinct.

## Approval boundary

The checked-in proposal must remain:

```text
sovereign_approved=false
role_binding_authorized=false
```

until an explicit approval covers the exact three role bindings.

A repository merge of this proposal alone is not role authorization.

The launch-controller candidate now has fresh offline generation evidence.
Final role attestation still requires explicit approval of the exact three role
bindings. A signing challenge remains a separate optional control-path proof;
no signing challenge or transaction has been performed by this proposal.

## Production readiness effect

This gate closes the deterministic launch-ID gap only:

```text
market_vault_coupled_launch_commitment_committed=true
market_vault_role_binding_proposal_implemented=true
market_vault_coupled_launch_id=
  0xfb6584220f298f239a4c6a77ff1faa274300a61597eeae85272cdda9e17f1c83
market_vault_final_role_bindings_attested=false
```

Production remains HOLD on final role authority, deployment, runtime
attestation, funding/lock proof, remaining WC market gates, canary, and coupled
activation.

## Verification

```bash
node scripts/prove_void_wc_void_coupled_launch_role_proposal_v1.mjs
node scripts/prove_void_wc_void_market_vault_deployment_preparation_v1.mjs
node scripts/prove_void_wc_void_production_readiness_v1.mjs
```
