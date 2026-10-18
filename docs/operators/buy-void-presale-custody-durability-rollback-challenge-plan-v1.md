# Buy VOID presale custody durability / rollback challenge plan V1

Marker:
`VOID_BUY_VOID_PRESALE_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V1`.

Status: **plan-only source/CI evidence; no host execution or storage mutation authority**.

Plan ID:

`voidbuycustodychallengeplan1_d9a72732d690a09731e7d4d65f4024156acf4813e6550bf72e5f03d5b383d4d0`.

## Purpose

This gate turns #3513's future durability/rollback requirements into one exact,
content-addressed challenge plan after #3515's read-only allocation-custody
collector.

It deliberately does **not** execute the challenge.

The challenge remains necessary because read-only collection cannot prove:
- durable storage under a live append/reopen cycle;
- rollback resistance;
- protected high-water custody; or
- independent second-control enforcement during an attempted stale restore.

## Accepted presale source

The plan binds accepted presale source-freeze V2:

- acceptance artifact:
  `ops/security/buy-void-presale-source-freeze-acceptance-v2.json`;
- Git blob:
  `174d536807f03fd7b6ff44820d4e378c7055150e`;
- acceptance ID:
  `voidbuypresalefreezeaccept2_427988497e4789465dde1c193668bb140d017c4e3ba3748567ea4e3bacfadb57`;
- freeze ID:
  `voidbuypresalefreeze2_32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1`;
- source commit:
  `05614762b1b4638e05e539fd7d20cbf670e1570b`;
- source tree:
  `4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e`.

This is source identity only. Payment rail acceptance, host-install qualification,
presale activation and funds authority remain false.

## Read-only prerequisite collector

The plan binds repaired #3515 generation:

- review head:
  `06c8262abb18ec13d256143ca500f09dbc3632ac`;
- collector blob:
  `216928e1810cb25ce1c331e2edfece629fff76cf`;
- proof blob:
  `f2566d76972262db35f60d049f79ae6f2d34f47e`;
- operator contract blob:
  `e346269a7cb74a849bd24ec88ed8d7bfee060be7`;
- workflow blob:
  `1c31cc09d750d14b0ae0fdef142d46f39b881f89`.

A future challenge requires a successful collector receipt with terminal:

`ALLOCATION_CUSTODY_PREREQUISITES_GREEN_CONTROLLED_CHALLENGE_REQUIRED`.

The collector receipt is prerequisite evidence only.

## Durability contract

The plan binds #3513's machine-readable contract generation:

- contract blob:
  `eef7c4e1db7401ba82fda96aa1e8da40c1981b7d`;
- proof blob:
  `7ced5fb56a22cd546aab30c466021b01b1c6a84d`;
- architecture blob:
  `16a8a755888abd7b9ad4f0377468d6a403f80a70`;
- workflow blob:
  `b3426f40577ff1ca1bbab8ca46232ae1ca0a8148`.

Exactly **20** future evidence properties are required:

1. non-customer canary domain;
2. operation-bound authorization;
3. exact current policy binding;
4. reviewed source-generation binding;
5. unpredictable execution-time challenge entropy;
6. live journal challenge append;
7. live high-water advance;
8. journal + high-water sync/close/reopen;
9. external-witness post-challenge append;
10. controlled rollback attempt;
11. reviewed rollback controller;
12. high-water second-control approval;
13. post-rollback high-water non-decrease;
14. stale-journal refusal;
15. post-rollback external-witness continuity;
16. distinct physical storage reobservation;
17. post-test policy rebind;
18. allocation ledger unchanged;
19. customer request state unchanged;
20. authenticated evidence origin.

No subset is sufficient.

## Non-customer challenge boundary

The future execution must be isolated from customer purchase state.

The plan requires:
- non-customer canary domain only;
- the allocation ledger to remain unchanged;
- customer request state to remain unchanged;
- challenge entropy to be generated at execution time;
- exact accepted source and current policy bindings before mutation;
- evidence origin authentication;
- no automatic promotion after the test.

The plan intentionally does not encode a reusable challenge nonce or rollback
payload. Those must be unpredictable and operation-bound when a later execution
is separately authorized.

## Authority

This manifest is **not** execution authorization.

All remain false:

```text
host_execution_authorized=false
filesystem_read_authorized=false
filesystem_write_authorized=false
storage_mutation_authorized=false
rollback_test_authorized=false
service_mutation_authorized=false
credential_access_authorized=false
wallet_or_signer_access_authorized=false
signing_authorized=false
transaction_submission_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_or_liquidity_action_authorized=false
funds_movement=false
production_host_evidence_authority=false
```

The next gate remains:

`SEPARATELY_AUTHORIZE_NONCUSTOMER_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_V1`.

A later execution gate must separately bind the exact successful #3515 receipt,
fresh challenge entropy and operation-specific authorization before any storage
mutation.

**PROTECT THE CORE.**
