# Chain-2050 SOVEREIGN owner gas funding request evidence v1

Marker: `VOID_CHAIN2050_ROLE_AUTHORITY_SOVEREIGN_OWNER_GAS_FUNDING_REQUEST_EVIDENCE_V1`

This freezes the exact unsigned gas-funding transaction prepared for the
role-authority registry owner. No authorization is implied.

- source: `0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266`
- destination: `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`
- amount: `500000000000000 wei`
- nonce: `129`
- unsigned transaction hash:
  `0x9b67e9e6fe373b664446a1b21fc49457ea109227a184f132005198da186a4df6`
- funding request:
  `voidcrasgf1_e7377ba46ccd646fdfe72aec1aeaef1bc451a0918034906dfd67bf8f3d031d8b`
- evidence:
  `voidcrasgfre1_13d8939436ef22b7deb461aa30416e985ac05947c1df63bf39cdb95696e08cfe`

The source is the standard Anvil prefunded development account previously used
for the role-authority deployment gas-funding lineage. The deployment-only
signer is not reused.

## Authority boundary

`funding_authorized=false`

No private-key access, signing, broadcast, Chain-2050 write, registry append, or
automatic retry is authorized by this evidence.

The next gate requires an explicit Sovereign authorization bound to the exact
unsigned transaction hash above.
