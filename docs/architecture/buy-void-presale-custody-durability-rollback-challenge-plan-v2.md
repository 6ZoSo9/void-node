# Buy VOID custody durability / rollback challenge plan V2

Status: **source/test/CI only. No protected host adapter, live rollback, payment, or activation authority.**

This plan advances the exact next gate from #3527. It preserves V1's twenty mandatory future-evidence requirements and adds nine requirements covering a durable one-time authorization claim, replay rejection before mutation, claim survival through rollback, operation-wide exclusive lease, lease ID bound to every phase, terminal lease revalidation, authenticated controller transcript digest, and independent capability/entitlement provenance.

Parent head: `60a6fffc0fd8de576769f4bc090b3a12ca4ba526`.
V1 plan ID: `voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006` (immutable blob `5face2022dc2cbc573e32e99f88623f381a8a174`).
Controller candidate V1: blob `96d4ac3499d222841f1f7a3c53e14900b68ae8cf`; proof blob `b196fcaa77a6bdc465baacb3387aa949f47bc956`.
Accepted economic tree: `71c67e62a2b21a98f3f5135ee6aa56e0ef97d262` (unchanged).
New content-addressed plan ID: `voidbuycustodychallengeplan2_622c5cab506b8424860a484e6675f73031a26635c0ef29a80aee2281f53f0844` (SHA-256 of canonical JSON without `plan_id`).

The canary domain remains exactly `void.buyvoid.presale.noncustomer.canary.v1`; customer request state and the allocation ledger must remain unchanged. The V1 requirements for exact policy/source binding, unpredictable execution-time entropy, durable high-water, external witness, second-control approval, controlled rollback, stale journal refusal and physical-storage independence remain mandatory.

The standard-library Python proof checks closed schemas, parent source blobs, exact V1 twenty-key requirements, content addressing, and 51 adversarial mutations. CI never runs the controller or the actual storage rollback; all host, signing, transaction, payment, public presale/WC, treasury, liquidity and funds authorities are false.

The reviewed V1 rollback controller explicitly rejects authorization records with a non-V1 plan ID. Thus the V2 plan cannot drive the controller unchanged. A versioned V2 controller successor must accept only this exact V2 plan ID and preserve V1's claim, lease, transcript and fail-closed invariants. Only then can a distinct-reviewed protected host adapter be considered; V1 authorizations cannot be reinterpreted as V2.

The protected adapter is not implemented and independently authenticated host evidence is uncollected. Next gate: `DISTINCT_REVIEW_V2_PLAN_THEN_CONTROLLER_V2_REBIND_AND_PROTECTED_ADAPTER`. That review does not itself authorize host execution.

PROTECT THE CORE.

## Executable V1/V2 authorization-separation proof

The dedicated hosted source-proof workflow now executes the **reviewed pure V1 controller** with wholly synthetic noncustomer authorization records. A valid V1 authorization must pass plan validation and reach the deliberately empty capability-set preflight. The content-addressed V2 authorization, and an attempted V1-to-V2 plan-field substitution, must both throw `authorization_plan_invalid` *before* any injected capability is inspected or invoked. The test uses a throwing Proxy as a capability-access sentinel and requires its invocation count to remain zero. It performs no real challenge, credential read, storage operation, service query, network request, signer action, payment, or funds movement. This behavioral test supplements—not replaces—the Python static source/blob proof and does not grant controller V2/adapter authority.
