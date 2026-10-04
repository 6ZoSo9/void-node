# V5 source-generation provenance review checklist

Review the exact successor generation only.

- Historical V4 source/proof evidence remains unchanged and cannot be silently
  repinned to the new verifier bytes.
- V5 contains exactly five reviewed runtime source records.
- The authenticated composition V3, authority V2, source-chain RPC adapter V1,
  and payment RPC observer V1 records retain their reviewed predecessor
  commit/blob identities.
- `buy_void_verified_payment_v2.ts` resolves to reviewed Git blob
  `9ba679d52c74d5590558ccfdb5882597d79b9f31`.
- Every recorded commit must contain the exact recorded blob whenever the commit
  object is available in the non-shallow review checkout.
- V5 recomputes the current runtime Git blob for every reviewed source.
- Source paths are module-derived, direct regular files, non-symlink,
  single-link, bounded, and stable across descriptor read.
- Reviewed-source verification runs before dynamic V3 execution or RPC.
- The total deadline begins before source verification, is not reset for V3,
  and is checked after composition.
- Caller source-generation/commit/blob assertions are not accepted.
- Source and compiled-module layouts resolve the same reviewed `src/economic`
  files.
- The production image contains the V5 module and all five reviewed source
  files needed for packaged source verification.
- V5 keeps `source_generation_verified=false`,
  `deployed_artifact_generation_verified=false`, ancestry/provider-quorum
  truth unchanged, and `production_source_finality_authority_ready=false`.
- The production execution preflight consumes V5, not historical V4.
- Compiled artifact V3 must bind the V5 reviewed-source digest and preserve
  unchanged predecessor artifacts byte-for-byte where claimed.
- Enforcement/package successors are required before the new executable bytes
  can be treated as accepted production artifact identity.
- No live external RPC, wallet/signer, transaction, Chain-2050/inventory,
  activation, treasury/liquidity, or funds authority is introduced.
