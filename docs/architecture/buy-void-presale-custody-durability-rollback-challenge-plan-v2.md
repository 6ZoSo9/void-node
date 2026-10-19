# Buy VOID custody durability / rollback challenge plan V2

Status: **source/test/CI only. No protected host adapter, live rollback, payment, or activation authority.**

This plan advances the exact next gate from #3527. It preserves V1's twenty mandatory future-evidence requirements and adds nine requirements covering a durable one-time authorization claim, replay rejection before mutation, claim survival through rollback, operation-wide exclusive lease, lease ID bound to every phase, terminal lease revalidation, authenticated controller transcript digest, and independent capability/entitlement provenance.

Parent head: `60a6fffc0fd8de576769f4bc090b3a12ca4ba526`.
V1 plan ID: `voidbuycustodychallengeplan1_dd868e3fb6ebdbf894c1170d0ecc153d61e198d9c20279a05c3309957add9006` (immutable blob `5face2022dc2cbc573e32e99f88623f381a8a174`).
Controller candidate V1: blob `96d4ac3499d222841f1f7a3c53e14900b68ae8cf`; proof blob `b196fcaa77a6bdc465baacb3387aa949f47bc956`.
Accepted economic tree: `71c67e62a2b21a98f3f5135ee6aa56e0ef97d262` (unchanged).
New content-addressed plan ID: `voidbuycustodychallengeplan2_8969a5b3e91e20cc42b6d81dc6d51c0148bb878c2b36a0db5ff2f4704ee6fc01` (SHA-256 of canonical JSON without `plan_id`).

The canary domain remains exactly `void.buyvoid.presale.noncustomer.canary.v1`; customer request state and the allocation ledger must remain unchanged. The V1 requirements for exact policy/source binding, unpredictable execution-time entropy, durable high-water, external witness, second-control approval, controlled rollback, stale journal refusal and physical-storage independence remain mandatory.

The standard-library Python proof checks closed schemas, parent source blobs, exact V1 twenty-key requirements, content addressing, and 49 adversarial mutations. CI never runs the controller or the actual storage rollback; all host, signing, transaction, payment, public presale/WC, treasury, liquidity and funds authorities are false.

The protected adapter is not implemented and independently authenticated host evidence is uncollected. Next gate: `DISTINCT_REVIEW_V2_CHALLENGE_PLAN_THEN_PROTECTED_ADAPTER_CANDIDATE`. That review does not itself authorize host execution.

PROTECT THE CORE.
