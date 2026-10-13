# VOID public checkpoint seal-first startup current V4

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
