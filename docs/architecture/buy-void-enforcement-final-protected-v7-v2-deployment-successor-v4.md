# V7/V2 protected deployment candidate V4 — repaired reader generation

Status: **unaccepted source candidate; no deployment, runtime, presale, or funds authority**.

This candidate is derived from Draft PR #3661 exact head `d66379084ceead538479b776d153bddac2f678e3` and
replaces the stale V3 deployment-reader inventory row with the reviewed
descriptor-bound production reader.

## Exact reviewed transition

- path: `ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`
- predecessor V3 blob: `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`
- current repaired blob: `e0a682ea4038ca22e3a3b97da2cac29874096c46`
- all other protected rows: byte/mode identical to candidate V3
- reviewed protected drift count: `1`

## Candidate identities

- V4 proof Git blob: `4a10cebe913999bb12a5e2cce44e7e48652ab706`
- V4 candidate Git blob: `cde87fb709b727102fd05b106217f3bdeef07985`
- V4 candidate SHA-256: `701a6c493d17e1263ae09b591b3df93feed8fea710b8ee8e2980f3b8c9e2263b`
- V4 protected inventory SHA-256: `c87299b5d3ab7efad7b946ea3cbdc3b01bcae828141e864785743cd3d5f8e21d`
- V4 enforcement-set SHA-256: `e13b69320010736404819dcf24061aaeee5da37b4efae3a140eec8ff08faaeec`

The proof reads every protected source through a bounded
`O_RDONLY|O_NOFOLLOW|O_NONBLOCK` descriptor and directly exercises replacement,
symlink, FIFO-substitution, post-open growth, and oversize cases.

The V3 candidate `5301c32f53c2a82435152e38b36486507a73f906` and V3 lock `e530390e505d447ca0ad9e2a098ec6a819ae3e6c` remain
byte-for-byte preserved. V4 is not accepted by this lane. A separate hosted
evidence review and V4 acceptance-lock successor are required before the
deployment planner may return `PLAN_GREEN` for the repaired reader generation.

No apply, service mutation, credential/signer access, transaction broadcast,
chain-2050 mutation, public presale activation, or funds movement occurs.
