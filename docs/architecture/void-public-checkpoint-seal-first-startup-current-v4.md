# VOID public checkpoint seal-first startup current V4

## October 13, 2026 — current V5 successor

This file retains the historical V4 record below. The current source-generation
successor is V5, bound to exact `src/index.ts` Git blob
`123ec1792a027f93d4c9030749a0e7e136a75a44`.

V5 preserves frozen V4 proof blob
`7b0a2e99cd9df06c5a4d5b7da21873cf4c288ed5`, requires V4 to refuse the
new source identity, and reruns the same startup-slice VM adversaries in
`scripts/prove_void_public_checkpoint_seal_first_startup_current_v5.mjs`
(Git blob `01bd8df01944457b3f4ffc846e62f765015eb7d3`). The reviewed checkpoint
startup region remains byte-identical; the public-range change is outside that
region.

No host checkpoint, service, wallet, signer, payment, presale, or funds mutation
is authorized by V5 source qualification.


Source-only successor for the Buy VOID request-lock router generation.

- exact current `src/index.ts` Git blob:
  `40239e0f76aa1edce43523d18c1b57691e41e8cf`;
- frozen V1 proof remains unchanged and must refuse this generation;
- reviewed V2 predecessor proof remains immutable at Git blob
  `b03a985c9c4a3dc78ebe3221ee1f2d8b87023b27`;
- V4 replays the same actual startup-slice VM adversaries against the exact
  current router and requires the closed checkpoint startup region to remain
  byte-identical to reviewed canonical main;
- no host checkpoint, service, wallet, signer, payment, presale, or funds
  mutation is authorized.

The current router changes public Buy VOID request locking/privacy outside the
checkpoint boot region. V4 is an additive source-generation proof, not a repin
of historical V1/V2 authority.
