# WC/VOID market-vault compiled identity correction v2

Marker: `VOID_WC_VOID_MARKET_VAULT_COMPILED_IDENTITY_CORRECTION_V2`

Status: **deployment hold; v1 bytecode superseded**.

This correction preserves the accepted compiler identity while withdrawing the
deployment authority of the bytecode fields recorded in
`wc-void-market-vault-compiled-identity-acceptance-v1.json`.

## What was wrong

The accepted v1 packet remained bound to the correct retained compiler identity:

- identity ID
  `voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a`;
- identity JSON SHA-256
  `fb9a92e24afa9d7611364ca30b6eff4fe2df2cc2aa8002b77307bead4b864a4b`;
- GitHub Actions run `36464403015`;
- artifact `10988626461`;
- artifact ZIP SHA-256
  `d8707b0a5abc530f888639bffb2079b2d193d147bacfc4a65c3e704858bcb2fc`.

But the v1 acceptance packet recorded over-captured bytecode arrays:

- creation: 10,404 bytes,
  SHA-256 `9fae041d06d317b326fd1a9cee6efc34fa0e214b74a9447e44131969d886a5af`;
- runtime template: 9,295 bytes,
  SHA-256 `421f6e2ecbea1ccf02e20a52119323014a0f65906ff08d060d602ebebb327409`.

The retained compiler identity contains the canonical artifacts instead:

- creation: 9,441 bytes,
  SHA-256 `84bbf44ee873c9e8b271271d8d3dc10bf6bb58d38b0d7da26558275510c0d540`;
- runtime template: 8,342 bytes,
  SHA-256 `99a7179850af5a6e13c1a1b24cf873b011a98fcc8d54479722c20fc254188f7e`.

The source, compiler profile, ABI, metadata, storage layout, method identifiers,
and immutable layout remain unchanged. No Solidity source change or recompile is
required by this correction.

The v2 verifier is schema-closed and fail-closed. It validates the complete
over-captured v1 byte arrays against the v1 packet, binds the canonical
9,441/8,342-byte artifact identities to the retained compiler identity
(run `36464403015`, artifact `10988626461`, identity JSON SHA-256
`fb9a92e2...64a4b`), and explicitly records that the canonical bytecode is
**not** derived by truncating or prefixing the superseded v1 arrays. The
canonical SHA-256 and independently reviewed Keccak-256 identities are fixed
source review inputs. The verifier also binds every unchanged compiler-artifact
digest, reconstructs the old and corrected coupled-launch IDs from the canonical
launch commitment, and verifies the content-addressed `correction_id` as
SHA-256 of canonical v2 JSON with only that ID omitted. Unknown top-level or
nested correction fields fail closed.

## Coupled-launch consequence

The coupled-launch commitment includes the market-vault creation and runtime
hashes. Therefore the old launch identity is superseded:

`sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26`

The corrected commitment deterministically yields:

`sha256:b893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d`

and vault bytes32:

`0xb893f68c8202cb1a8ea25792fb0c032876bbac85ba11a15f4e95dad1f1d75a3d`.

Any control signature or pre-launch artifact bound to the old coupled launch
generation must not be reused for the corrected generation.

## Fail-closed boundary

Until the corrected coupled-launch generation is regenerated:

- market-vault role/deployment qualification must hold;
- deployment is not authorized;
- inventory funding is not authorized;
- market activation is not authorized;
- public presale activation is not authorized;
- transaction signing or broadcast is not authorized;
- funds movement is not authorized.

The v1 acceptance packet remains in Git history and in the repository as
historical evidence. It is not deployment-authoritative after this correction.

Verification:

```bash
node scripts/prove_void_wc_void_market_vault_compiled_identity_correction_v2.mjs
node scripts/prove_void_wc_void_market_vault_role_deployment_qualification_v1.mjs
```

Next gate:

`regenerate_coupled_launch_generation_from_corrected_compiler_identity`.
