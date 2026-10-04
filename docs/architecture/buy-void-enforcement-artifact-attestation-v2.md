# Buy VOID enforcement artifact attestation v2

Marker: `VOID_BUY_VOID_ENFORCEMENT_ARTIFACT_ATTESTATION_V2`

## Purpose

Advance the current Buy VOID executable enforcement closure without rewriting
the accepted historical v1 record.

The v1 manifest remains immutable predecessor evidence. Its accepted artifact-set
SHA-256 is:

`f21b4c486ee686f53cb03e858bdff01d4b56be205c819322813538d5273062fb`

The current checkout is still derived by the reviewed v1 derivation function,
but those derived bytes are treated as a **candidate input** to this successor
generation, never as permission to replace the v1 manifest.

## Hosted successor evidence

Independent Node 22, 24, and 26 runs produced byte-identical current candidate
JSON:

- candidate bytes: 22,575;
- candidate JSON SHA-256:
  `a3905213d6a77287673546491e6aed4a95d5e5a38d0c17f79af668384cc15c87`;
- current enforcement artifact-set SHA-256:
  `904c18f848832e5772346b5cbba23dbca257f5715f4263d3ffca533be28e1038`.

The successor also binds compiled source-finality attestation v3:

- manifest Git blob:
  `46267e9433ad8eb6250d4c831dfda2054fe918f4`;
- compiled v3 generation:
  `b85a5c8a6a7685876452f21450b154351fc0601e367866b778c1be196bb2bee2`;
- reviewed source v5 root:
  `98dd5dcc6edea14a641ce687c76ec8f6ca521844a96560c7044adbe8d4dc5161`;
- v5 provenance artifact:
  `c55879a2d7e577c34067e5053e5342abd4d547fc4c1327723dee1d49eaea8010`;
- verified-payment v2 artifact:
  `babf9920062c0faec9ae525ea7c7557a77c2c5d9164c065fb1b3a31e395a8701`.

The resulting enforcement-successor generation is:

`0b0debdf4bd94b0082f2ef99182c29afcd324545d3bdbee034b7ce0a89e6eabb`

## Verification model

The successor proof:

1. verifies the historical v1 manifest by exact Git blob and artifact-set digest;
2. rederives the current enforcement candidate from the exact checkout;
3. requires the pretty-printed candidate bytes to match the independently
   cross-Node candidate length and SHA-256;
4. binds the candidate's v5 provenance and verified-payment artifacts to the
   compiled-v3 manifest;
5. derives the v2 successor wrapper and compares it byte-for-byte with the
   committed v2 manifest.

The packaged proof verifies the stopped image against the rederived current
candidate while the image-identity verifier consumes that same ephemeral
candidate manifest. Historical v1 is therefore preserved as predecessor
evidence rather than incorrectly compared to new executable bytes.

## Authority

This is provenance only. It grants no runtime mount, deployment, live RPC,
payment acceptance, signing, transaction, Chain-2050 mutation, inventory
funding, presale/market activation, treasury/liquidity action, or funds
movement. Both production source-finality authority and deployed-artifact
generation remain false.
