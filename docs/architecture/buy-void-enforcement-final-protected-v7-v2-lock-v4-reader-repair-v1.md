# Buy VOID protected V7/V2 lock V4 reader-repair V1

Status: **source/CI evidence lock; candidate acceptance and independent review HOLD**.

This lock accepts only #3680 exact candidate `895c2bf320defbbca5fba6792e2a75126b2c4d76`, candidate blob
`5893e300a78dc4ca7729ef47f95a8e3eea2043cf`, 17,788 bytes, SHA-256
`bf360784af7a6ddf908812b9c335e8e52d4410ba249c5ea1988b97d9cfd5a72c`,
enforcement-set SHA-256
`ff084a754e7eb6bef08ec1b1079a17a6110b4333876f0231e46395eed63042d2`,
and inventory SHA-256
`8485ef25c236b8798bed3a67b9308ef7dcd383aedca1486f4f488d043d7efbe0`.

Hosted candidate evidence is run `39665164718`, Node 22/24/26 artifacts
`12376738282` / `12377278277` / `12377118279`, cross-node job
`119449789170`. Current Dispatch V4 evidence is separately bound in the manifest.

Historical V3 candidate/lock remain immutable. The reviewed V4 transition is exactly
the deployment-receipt reader row from `3de6e4bd...` to `e0a682ea...`, mode
`100644`. The proof uses bounded `O_NOFOLLOW|O_NONBLOCK` descriptor reads with
regular-replacement, symlink, FIFO and oversize adversaries.

The source lock binds and verifies this exact candidate with
`candidate_identity_lock_evidence_verified=true`, but deliberately keeps
`candidate_enforcement_identity_accepted=false` because existing VOID consumers
treat that legacy field as authority and do not understand the newer review/lifecycle
flags. A separately reviewed successor must perform any later acceptance promotion.
It also retains:
- `independent_review_complete=false`;
- `candidate_acceptance_lifecycle_ready=false`;
- `downstream_candidate_v5_derivation_ready=false`.

Codex review quota is exhausted. Same-account source work cannot satisfy the
independent-review gate. #3682 must not derive or accept V5 until separate review
clears this lock.

Deployed artifact generation, runtime mount, production source-finality, public
presale activation and funds movement remain false. No merge, host apply, service,
credential/signing, transaction/payment, treasury/liquidity or funds authority.

PROTECT THE CORE.
