# Buy VOID protected V7/V2 candidate V4 successor

Status: **source/CI-only candidate; explicitly unaccepted**.

## Parent

Exact composition parent: `5e71209a92cb428fe0692a4764b3dd7466645e75` (#3664).

Historical V3 candidate and accepted V3 lock remain immutable:
- V3 candidate blob `5301c32f53c2a82435152e38b36486507a73f906`;
- V3 lock blob `e530390e505d447ca0ad9e2a098ec6a819ae3e6c`.

## Reviewed transition

The parent composition proves a single additional protected-row transition after V3:

`ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts`

- predecessor blob `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`;
- current hardened blob `f2d5288d6c1b639df6d9dcb1c174046ec9287f3b`;
- mode `100644`.

Current 49-row inventory SHA-256:
`686745113e5e5223a357c053a41496dc8ded12698c31967d541efea7bfe469f1`.

## Hosted composition evidence

- workflow run `39982169951`;
- Node 22 artifact `12514272109`;
- Node 24 artifact `12514485977`;
- Node 26 artifact `12513009476`;
- cross-node job `120514201748`;
- planner-HOLD job `120515308789`.

The planner job proves the accepted V3 lock HOLDS on exactly the hardened receipt row and never produces PLAN_GREEN.

## Candidate V4 identity

- Git blob: `b8341906d9563739a50dac98ea184a1d93267531`;
- bytes: `18214`;
- SHA-256: `7408f190f01113ca8be42f388acbe7fad083ec11100fa9bb31017e635cf53a9f`;
- candidate enforcement-set SHA-256: `f28b445fe5f1e632d1265ead825ecf9338644a3ae2704fde83ba1cedaf6be695`;
- proof blob: `781c99c145ac267f1a177c542f095a7f7bd3063f`.

Candidate V4 is **not accepted**. A separate V4 lock successor may be authored only after exact hosted V4 derivation/cross-node evidence and review are terminal.

## Authority

All remain false: candidate acceptance, deployed artifact generation, runtime mount, production source-finality, public presale activation and funds movement.

No merge, deployment/apply, service mutation, credentials/signing, transaction/payment acceptance, treasury/liquidity action or funds movement.

PROTECT THE CORE.
