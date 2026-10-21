# V7/V2 protected deployment candidate V4 — repaired reader generation

Status: **unaccepted source candidate; no deployment, runtime, presale, or funds authority**.

This candidate is derived from Draft PR #3661 exact head `0344d7dab153be75716646d5c6f5162f926f25ee` and
replaces the stale V3 deployment-reader inventory row with the reviewed
descriptor-bound production reader.

## Exact reviewed transition

- path: `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
- predecessor V3 blob: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`
- current repaired blob: `e0a682ea4038ca22e3a3b97da2cac29874096c46`
- all other protected rows: byte/mode identical to candidate V3
- reviewed protected drift count: `1`

## Candidate identities

- V4 proof Git blob: `f33a579e62c8201de24d5076cfcbffab66df8dae`
- V4 candidate Git blob: `5893e300a78dc4ca7729ef47f95a8e3eea2043cf`
- V4 candidate SHA-256: `bf360784af7a6ddf908812b9c335e8e52d4410ba249c5ea1988b97d9cfd5a72c`
- V4 protected inventory SHA-256: `8485ef25c236b8798bed3a67b9308ef7dcd383aedca1486f4f488d043d7efbe0`
- V4 enforcement-set SHA-256: `ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2`

The proof reads every protected source through a bounded
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK` descriptor and directly exercises replacement,
symlink, FIFO-substitution, post-open growth, and oversize cases.

The V3 candidate `79998af4763b6afca84ffe4e8d14d9a6ff535dfd` and V3 lock `245ce93ebfb53478211fab765489e88d8fa23c4a` remain
byte-for-byte preserved. V4 is not accepted by this lane. A separate hosted
evidence review and V4 acceptance-lock successor are required before the
deployment planner may return `PLAN_GREEN` for the repaired reader generation.

No apply, service mutation, credential/signer access, transaction broadcast,
chain-2050 mutation, public presale activation, or funds movement occurs.
