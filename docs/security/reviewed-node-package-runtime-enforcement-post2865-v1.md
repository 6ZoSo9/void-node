# Reviewed Node package runtime — post-2865 enforcement lock V1

## Outcome

Accept the exact combined package-runtime identity derived byte-for-byte on
Node 22, 24 and 26 by Draft #2921 after dependency remediation #2865 merged.

Accepted identity:

- roots: `ethers`, `express`;
- package generation:
  `package.json=14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`,
  `package-lock.json=15b5c82ea36f13079a2f9e8863722f654eb3f201`;
- root versions: `ethers@6.17.0`, `express@4.22.3`;
- profile ID:
  `voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac`;
- packages aggregate:
  `77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6`;
- package count: 82;
- file count: 2,498;
- total bytes: 21,290,060;
- exact candidate JSON SHA-256:
  `24650a7984afe461406da3cf21c410ab4104b70d8cf939711b5c1936a1240037`.

The permanent proof does not copy trust from the candidate receipt. It pins the
candidate proof Git blob, re-executes the candidate derivation, requires the
exact candidate digest, independently recollects the complete lockfile-derived
profile, checks its canonical digest/content ID/aggregate/counts/root versions,
then materializes the exact profile into a private permission-fenced runtime and
imports both Express and ethers without ancestor package fallback.

## Generation boundary

This identity is versioned separately from the historical pre-#2865
`VOID_REVIEWED_NODE_PACKAGE_RUNTIME_ENFORCEMENT_V1` profile. Historical V1
bytes remain unchanged. Any later package metadata change supersedes this
post-#2865 identity and must produce another versioned successor rather than
repinning either prior identity.

## Composition boundary

This lock establishes package-runtime identity only. It does **not** compose
the provider/global-writer closure from #2919 and therefore keeps:

- `provider_closure_composed=false`;
- `complete_executable_closure_verified=false`;
- `deployed_artifact_generation_verified=false`;
- `runtime_mount_authority=false`;
- `production_source_finality_authority_ready=false`;
- `public_presale_activation=false`;
- `funds_movement=false`.

No service, deployment, runtime configuration, credential, wallet/signer, RPC,
payment, transaction, Chain-2050/WC, inventory, treasury/liquidity, presale or
funds action occurs.

**PROTECT THE CORE.**
