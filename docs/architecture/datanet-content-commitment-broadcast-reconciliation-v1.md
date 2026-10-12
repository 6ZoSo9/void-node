# DataNet Content Commitment Broadcast Reconciliation v1

Marker: \`VOID_DATANET_CONTENT_COMMITMENT_BROADCAST_RECONCILIATION_V1\`

Status: source-only post-attempt reconciliation after an exact durable submission intent exists.

This gate is deliberately incapable of resubmission.

## Why reconciliation survives authorization expiry

The original Sovereign broadcast authorization controls whether a new submission attempt may begin.

Once #1720 has durably claimed the exact submission and invoked the one allowed submit seam, the system must remain able to determine what happened even after the original 300-second authorization window expires.

Therefore this gate:

- requires the exact durable #1714 consumption record;
- requires the exact durable #1720 submission-intent record;
- permits **inspection only** after the submission-intent timestamp;
- records whether the original authorization is expired at reconciliation time; and
- never interprets expiry as permission to retry or resubmit.

## Durable lineage

The gate independently reads and verifies:

\`broadcast-consumed/<broadcast-authorization-id>.json\`

and:

\`broadcast-submission-intents/<broadcast-authorization-id>.json\`

Both must be inside the same canonical private \`0700\` state root.

Both records must be direct private \`0600\` files.

V1 recomputes:

- the #1714 broadcast-consumption ID;
- the #1720 submission-intent ID; and
- the deterministic #1720 submission idempotency key.

The intent must bind exactly to the consumption record's:

- broadcast authorization lineage;
- opaque signed-receipt lineage;
- original signing lineage;
- unsigned transaction fingerprint;
- publisher;
- signed-transaction hash;
- custody-handle fingerprint; and
- canonical state-store fingerprint.

## Inspection-only dependency

The only dependency method used by this module is:

\`inspect_submission(request)\`

There is no submit method call site.

The inspection request is metadata-only and contains no raw signed transaction or opaque custody handle.

A production composition may connect a read-only inspector that performs bounded RPC observation, but this module itself contains no socket, HTTP, fetch, JSON-RPC, or provider transport.

## Outcome routing

### Definitive not submitted

\`not_submitted\` with definitive no-submission evidence routes to:

\`explicit_submission_claim_release_after_definitive_not_submitted_v1\`

The reconciliation gate itself does **not** release or delete the #1720 intent and does not retry.

### Unknown or accepted

These statuses remain reconciliation-required and route back to:

\`broadcast_reconciliation_without_resubmission_v1\`

A later explicit invocation may inspect again. No invocation can submit.

### Confirmed or reverted

Terminal observation routes to:

\`reconciled_broadcast_receipt_verification_v1\`

Receipt/transaction-state verification remains separate.

## Secret-output rejection

Inspector output is recursively rejected if it contains private material, raw transaction bytes, signed payload bytes, or a custody handle.

## Authority boundary

A GREEN reconciliation result proves:

- exact #1714 consumption record verified;
- exact #1720 durable submission intent verified;
- canonical state store verified;
- inspection method invoked = true;
- submit method invoked = false;
- transaction submission authorized = false;
- automatic retry = false;
- raw signed-transaction access = false;
- opaque custody-handle access = false;
- filesystem mutation = false;
- wallet/signing/private-key access = false;
- direct network/RPC calls by this module = false; and
- direct Chain-2050 write by this module = false.

Read-only external observation through the injected inspector is the only permitted external capability.

## Next gates

- definitive not submitted -> \`explicit_submission_claim_release_after_definitive_not_submitted_v1\`
- unknown / accepted -> \`broadcast_reconciliation_without_resubmission_v1\`
- confirmed / reverted -> \`reconciled_broadcast_receipt_verification_v1\`
