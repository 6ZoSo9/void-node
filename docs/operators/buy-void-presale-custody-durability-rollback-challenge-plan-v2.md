# Buy VOID presale custody durability / rollback challenge plan V2

Marker:
`VOID_BUY_VOID_PRESALE_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V2`.

Status: **versioned plan-only source/CI evidence; no protected adapter or live challenge authority**.

Plan ID:

`voidbuycustodychallengeplan2_ce86a3cf5790e583941b88178a288c448caf0bccc0816a4c85495b6e55971734`.

## Immutable predecessor

V2 preserves V1 byte-for-byte and binds its exact plan identity:

- V1 plan blob: `5face2022dc2cbc573e32e99f88623f381a8a174`;
- V1 plan ID:
  `voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006`;
- all **20** V1 required-future-evidence properties remain true;
- the V1 challenge scope remains unchanged.

V2 does not reinterpret V1 as carrying controller-era semantics.

## Bound controller generation

V2 binds #3527 exact source generation:

- head `60a6fffc0fd8de576769f4bc090b3a12ca4ba526`;
- tree `bb90a3caab421d811da6fe63f2d29967ab7e2e35`;
- controller blob `96d4ac3499d222841f1f7a3c53e14900b68ae8cf`;
- proof blob `b196fcaa77a6bdc465baacb3387aa949f47bc956`;
- architecture blob `e5af9cc148ac53f3e08188770760ae9d264b5a5f`;
- workflow blob `8b4295696529dfe770b631b5ac3e6e57c64f7c17`.

The controller remains an injected-capability source candidate. Its sixteen
capabilities are not authenticated host capabilities by this plan.

## Controller-era additions

In addition to all V1 requirements, a future protected challenge must prove:

1. an authenticated durable one-time operation-authorization claim;
2. same-authorization replay rejection before mutation;
3. post-rollback authorization-claim survival and revalidation;
4. canonical controller transcript-digest binding;
5. exact evidence-origin digest echo;
6. an authenticated operation-wide exclusive lease;
7. exact lease-ID binding through every challenge phase;
8. terminal operation-lease revalidation;
9. authenticated injected capabilities;
10. authenticated operation-bound authorization; and
11. proven operation-lease exclusivity.

## Lease release / cleanup contract

A future protected adapter must additionally prove:

- the retained lease handle and owner/process generation are adapter-local and
  bound to the operation;
- deterministic release is attempted on every post-acquisition exit path,
  including HOLD/error/replay exits;
- GREEN is impossible unless release succeeds **or** a reviewed lock primitive
  proves automatic kernel release for the exact retained descriptor/process
  generation;
- release cannot occur before terminal lease revalidation and evidence-origin
  authentication;
- lease-loss/reacquire ABA is excluded with a fencing/generation token or
  equivalent retained-handle identity; and
- cleanup failure HOLDS and can never make the already-consumed one-time
  authorization reusable.

This closes the lifecycle addendum without granting lease-release authority in
this plan.

## Distinct review gate

#3527 remains distinct-review HOLD. V2 also requires its own distinct review.

A protected host adapter candidate must **not** be built from same-account
source/CI clearance alone.

Next gate:

`DISTINCTLY_REVIEW_CUSTODY_DURABILITY_ROLLBACK_CHALLENGE_PLAN_V2_BEFORE_PROTECTED_HOST_ADAPTER_V1`.

## Authority

All live authority remains false, including:

```text
protected_host_adapter_authorized=false
protected_adapter_build_authorized=false
live_challenge_authorized=false
lease_release_authorized=false
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

**PROTECT THE CORE. PROTECT THE TRUTH.**
