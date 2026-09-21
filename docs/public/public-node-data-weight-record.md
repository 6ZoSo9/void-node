# VOID Public Node Data Weight Record v1

Marker: `VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_DOC_V1`

Data Weight Record v1 is the first public skeleton for ranking stored data.

Rule: persistent does not mean equal priority.

Doctrine: **VOID preserves memory, but weights attention.**

The public route is:

`/public-node/data-weight-record.json`

Route marker:

`VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1`

It separates:

- existence
- verification state
- payload preservation
- trust and promotion
- storage tier
- AI visibility
- freshness
- duplicate status
- suspicion status
- tombstone status

## Two-layer ranking model

Data ranking is inspectable evidence, not a truth oracle.

The first layer is the **network baseline evidence vector**. Relevant signals include byte/proof integrity, provenance, freshness, availability, replication reliability, schema/link health, duplicate state, suspicion/quarantine/tombstone state, independent corroboration where available, reproducibility, source reliability, conflict history, alteration detection, adversarial-risk penalties, and task suitability.

The second layer is a **requester/task-specific overlay**. A requester may reweight qualified baseline signals for a particular task, but it must not rewrite the underlying evidence, erase failed hard gates, or create new authority.

A future aggregate rank may help with retrieval order, visibility, replication priority, review priority, qualification, and promotion eligibility, but its component values and penalty reasons must remain inspectable.

Popularity, replication count, model agreement, wealth, and validator stake are not semantic-truth scores.

## Relationship to Chain-2050

A Data Weight Record may be a required promotion precondition. It is not sufficient Chain-2050 authority.

Ranking can qualify a candidate for validator consideration. Where the applicable constitutional phase has activated validator admission authority, validators then apply the standing Chain-2050 rules and participate in the ordinary canonical-admission decision using the quorum required by the standing protocol. Current Phase 0 remains operator-rooted and this document does not activate validator quorum.

In a quorum-governed phase, a high rank without the required validator quorum does not create canonical state. Validator agreement cannot rescue a candidate that failed a mandatory hard proof or authority gate.

Ranking and validator admission are also separate from constitutional authority. Neither a rank nor a validator quorum may amend the constitution, redefine the DataNet-to-Chain truth membrane, expand validator powers, or exercise Sovereign-reserved constitutional/protocol mutation or chain-stop authority.

This is public read-only. It does not accept public uploads, mutate data, move money, send wallet transactions, execute swaps, fulfill Buy VOID requests, mutate validators, or claim to be network truth.

Proof marker:

`VOID_PUBLIC_NODE_DATA_WEIGHT_RECORD_V1_GREEN`
