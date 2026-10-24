# V7/V2 protected deployment candidate V4 — repaired reader generation

Status: **unaccepted source candidate; no deployment, runtime, presale, or funds authority**.

This candidate is derived from Draft PR #3661 exact head `1b15fcf5070e7b8a8aa4b9348de88cf11be2ef26` and
replaces the stale V3 deployment-reader inventory row with the reviewed
descriptor-bound production reader.

## Exact reviewed transition

- path: `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
- predecessor V3 blob: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`
- current repaired blob: `e0a682ea4038ca22e3a3b97da2cac29874096c46`
- all other protected rows: byte/mode identical to candidate V3
- reviewed protected drift count: `1`

## Candidate identities

- V4 proof Git blob: `3a7401202fee374f2a7da3f5efc0d29976f9792a`
- V4 candidate Git blob: `ec00f0c552e600fff38e4998e4beb128c93b481d`
- V4 candidate SHA-256: `fbf3d5fbc1efad92c7bb5bb3fb45f686d1bddb95d4a7c34cadbd862b69318c60`
- V4 protected inventory SHA-256: `c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`
- V4 enforcement-set SHA-256: `00e8ca31370f9c6c4fa77185ed05a9ed0554e0b2036b6c5f2e937e7839c67b1a`

The proof reads every protected source through a bounded
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK` descriptor and directly exercises replacement,
symlink, FIFO-substitution, post-open growth, and oversize cases.

The V3 candidate `40c7d21e0f22bc2ffe079f80360af342f4d8a6aa` and V3 lock `f1b9d661eb3363e9bf18dbeb3610c659a54219bb` remain
byte-for-byte preserved. V4 is not accepted by this lane. A separate hosted
evidence review and V4 acceptance-lock successor are required before the
deployment planner may return `PLAN_GREEN` for the repaired reader generation.

No apply, service mutation, credential/signer access, transaction broadcast,
chain-2050 mutation, public presale activation, or funds movement occurs.
