# Chain-2050 SOVEREIGN owner gas funding authorization v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_OWNER_GAS_FUNDING_AUTHORIZATION_V1`

The Sovereign explicitly authorized exactly one Chain-2050 funding transaction
for the role-authority registry owner.

Authorization ID:

`voidcrasgfa1_bfa53d809d212e947f791b856bf0738b0c4ec8eb1522a80fd75e9eba2ea124cc`

Exact transaction:

- source: `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`
- destination: `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`
- value: `500000000000000 wei`
- nonce: `129`
- unsigned transaction hash:
  `0x9b67e9e6fe373b664446a1b21fc49457ea109227a184f132005198da186a4df6`
- maximum source liability: `525200000352800 wei`

Funding request:

`voidcrasgf1_e7377ba46ccd646fdfe72aec1aeaef1bc451a0918034906dfd67bf8f3d031d8b`

## Exact authority

This authorization permits:

- local signing by the standard Anvil prefunded development account only;
- exactly one raw transaction submission attempt;
- the exact source-to-owner native-gas transfer above;
- Chain-2050 mutation and funds movement only insofar as that exact transfer
  succeeds.

It does not authorize:

- role-authority registry append;
- reuse of the deployment-only signer;
- any other source, destination, nonce, value, fee envelope, or transaction;
- automatic retry;
- replacement transaction;
- treasury or premine action;
- unrelated funds movement.

The execution wrapper must consume this authorization before its single send
attempt and must reconcile the result without retransmission.
