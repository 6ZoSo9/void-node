# Reviewed Node package runtime — enforcement post-#2865 lock V1

## Outcome

Lock the audited dependency-generation package runtime derived byte-identically
on Node 22, 24 and 26 by #2921 at exact candidate head
`d80f258d7b55fb66d5ec29761befe828efca2b0c`.

Accepted package-runtime identity:

- roots: `ethers`, `express`;
- package.json Git blob:
  `14fbdf5717b07fd4c734f5da7a8e84ed59bee93f`;
- package-lock Git blob:
  `15b5c82ea36f13079a2f9e8863722f654eb3f201`;
- ethers: `6.17.0`;
- express: `4.22.3`;
- profile ID:
  `voidrnpr1_08e05626e80fbd2aecc3018514aaf76e491954f8258fff996f0b2dca1c3055ac`;
- package aggregate:
  `77622df7d483bc3f73aa39468246f6860237a3f6749a09a0284644493f3990b6`;
- profile canonical SHA-256:
  `3493638417e2f02a39bb7c48a08935e299754d7474feb71a5c2a48944d3f1757`;
- exact candidate JSON SHA-256:
  `24650a7984afe461406da3cf21c410ab4104b70d8cf939711b5c1936a1240037`;
- 82 packages / 2,498 files / 21,290,060 bytes.

The proof rederives the exact #2921 candidate, independently recollects the
complete package profile, requires canonical byte-semantic equality, verifies
the reviewed profile, materializes it into a private permission-fenced runtime,
and imports both Express and ethers with ancestor package fallback forbidden.

## Generation boundary

This identity is explicitly the audited dependency generation merged by #2865.
It supersedes the pre-#2865 package identity from #2913 for current enforcement
work. It does not rewrite or reinterpret the older evidence.

Any later package metadata change invalidates this lock and requires a new
reviewed generation.

## Authority

This accepts package-runtime identity only:

```text
profile_identity_accepted=true
whole_enforcement_closure_verified=false
candidate_enforcement_identity_accepted=false
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

The next source-only step is to compose this accepted package identity with
#2919's audited provider/global-writer closure and the current delivery-route /
source-finality preflight graph.

No live service, credential, wallet/signer, RPC/payment, transaction,
Chain-2050/WC, inventory/treasury/liquidity, presale/market or funds action
occurs.

**PROTECT THE CORE.**
