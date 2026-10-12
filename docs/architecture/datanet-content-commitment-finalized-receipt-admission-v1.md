# DataNet Content Commitment Finalized Receipt Admission v1

Marker: \`VOID_DATANET_CONTENT_COMMITMENT_FINALIZED_RECEIPT_ADMISSION_V1\`

Status: source-only admission of one exact finalized, confirmed DataNet commitment **call**. Event membership and canonical commitment truth remain pending.

## Purpose

Merged #1729 proves that one exact confirmed transaction is final under the reviewed Mainnet-0 accepted-checkpoint policy.

That is necessary but not sufficient to say that Chain-2050 contains the expected \`ContentCommitted\` event.

This gate closes only the transaction/call side of that distinction.

It binds the #1729 finality artifact back through the #1724 receipt-verification artifact and the exact publisher signing request, rederives the unsigned transaction candidate, and decodes the exact registry call as:

\`commit(bytes32 objectIdSha256,bytes32 contentSha256,uint64 byteLength)\`

## Exact lineage

V1 independently requires and binds:

- exact #1729 finality-verification ID;
- exact #1724 receipt-verification fingerprint;
- exact accepted-checkpoint attestation ID;
- exact signed-transaction hash;
- exact publisher;
- exact finalized receipt block number/hash;
- exact accepted checkpoint height/hash;
- exact publisher signing-request ID;
- exact unsigned-transaction candidate fingerprint;
- exact registry address; and
- exact commit calldata tuple:
  - object ID SHA-256;
  - content SHA-256; and
  - byte length.

The signing-request ID and unsigned-candidate fingerprint are rederived from canonical material.

The commit calldata is ABI-decoded and then re-encoded byte-for-byte to prove the call shape is canonical.

## Finality semantics

The accepted finality kind remains:

\`operator_recognized_accepted_checkpoint\`

V1 does not upgrade that into protocol/BFT consensus finality.

It therefore preserves:

\`protocol_consensus_finality_claimed=false\`

A finalized reverted transaction is rejected by this successful-admission gate and belongs on the separate reverted-terminal path.

## Event-membership separation

A successful contract call does not prove that the expected commitment event was emitted with the exact object/content tuple.

Therefore GREEN deliberately records:

\`event_receipt_membership_verified=false\`

\`canonical_commitment_truth_admitted=false\`

The existing \`VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1\` verifier is the reviewed event/receipt-membership primitive for the next boundary. It checks the exact registry log, transaction hash, block, object digest, content digest, byte length, and canonical block revalidation.

V1 does not duplicate or silently bypass that verifier.

## Relationship to #1464

#1464 currently keeps source-backed finalized Chain-2050 commitment verification on HOLD.

This gate advances only one prerequisite in that chain:

- exact finalized successful commitment call = proven;
- exact \`ContentCommitted\` event membership = still pending;
- canonical commitment truth for reconstruction = still pending.

It does not change the other independent #1464 HOLDs:

- peer/session authentication;
- independent custody/failure-domain proof;
- admitted replication-policy floor;
- selected-byte custody/publication/readback;
- repair execution authority.

## Authority boundary

GREEN performs and authorizes:

- no filesystem mutation;
- no Sovereign private-key access;
- no wallet or signer access;
- no transaction signing;
- no transaction submission;
- no direct RPC or network call;
- no Chain-2050 write;
- no validator mutation;
- no governance mutation;
- no Work Credit mutation;
- no funds action;
- no automatic retry.

This is an admission artifact only.

## Next gate

\`datanet_content_commitment_finalized_event_membership_v1\`

That gate must bind this exact admission artifact to an independently verified \`VOID_DATANET_CHAIN2050_COMMITMENT_RECEIPT_V1\` result for the same transaction, registry, finalized block, object digest, content digest, and byte length.

Only after that exact event-membership binding may a later gate claim canonical commitment truth.
