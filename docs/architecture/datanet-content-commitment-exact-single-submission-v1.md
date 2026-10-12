# DataNet Content Commitment Exact Single Submission v1

Marker: \`VOID_DATANET_CONTENT_COMMITMENT_EXACT_SINGLE_SUBMISSION_V1\`

Confirmation: \`datanetSubmitExactConsumedBroadcastAuthorizationOnceV1\`

Status: source-only exact single-submission handoff after merged #1719.

This gate introduces the first DataNet source boundary that may invoke an injected broadcaster \`submit_once\` method. It does not provide or activate a production broadcaster, RPC provider, socket, HTTP client, service, route, or startup hook.

## Preconditions

Before any durable submission claim or submit call, V1 requires:

1. exact broadcast-authorization ID;
2. exact durable #1714 broadcast-consumption record ID;
3. the existing canonical private broadcast state root;
4. exact canonical state-root realpath SHA-256;
5. explicit \`apply=true\`;
6. exact confirmation string for applied execution; and
7. a fresh #1719 inspection performed at the current gate invocation.

The fresh inspection must report exactly:

- \`status=not_submitted\`;
- \`definitive_not_submitted=true\`;
- \`submission_may_have_occurred=false\`;
- \`reconciliation_required=false\`; and
- later single-submission candidacy = true.

The #1719 inspector re-checks the original Sovereign authorization expiry. Durable consumption does not extend the 300-second authorization window.

## Durable intent before submission

Applied execution derives a deterministic submission idempotency key over:

- broadcast authorization ID;
- broadcast-consumption record ID;
- fresh inspection-request ID;
- exact signed-transaction hash;
- custody-handle fingerprint; and
- canonical broadcast-state-store fingerprint.

V1 atomically publishes one immutable submission intent under:

\`broadcast-submission-intents/<broadcast-authorization-id>.json\`

The directory is private mode \`0700\`; the record is mode \`0600\`.

Publication uses an exclusive temporary file, file \`fsync\`, atomic hard-link publication, and directory \`fsync\`.

The final intent exists **before** \`submit_once\` is invoked.

## Single-use behavior

If the exact authorization already has a submission-intent record, V1 HOLDs before any fresh inspection or submit call.

There is no delete, reset, release, or automatic retry operation in this gate.

After the first submit-method invocation, every outcome routes to reconciliation:

- \`accepted\`;
- \`unknown\`;
- a reported definitive \`not_submitted\`;
- malformed or secret-bearing response;
- hash mismatch;
- broadcaster HOLD; or
- thrown exception.

Even a definitive no-submission result after \`submit_once\` does not automatically release the durable claim. A later reviewed reconciliation/release boundary may make that decision from stronger evidence.

## Metadata-only application boundary

The request passed to the injected submitter contains:

- exact authorization/consumption/inspection/intent IDs;
- deterministic submission idempotency key;
- original unsigned transaction fingerprint;
- publisher address;
- signed-transaction hash;
- custody-handle **fingerprint**;
- canonical state-store fingerprint;
- exact-single-submission flag; and
- automatic-retry=false.

The application does not receive or pass:

- raw signed transaction bytes;
- an opaque custody handle;
- wallet material;
- signer material; or
- Sovereign private-key material.

An injected private broadcaster is responsible for resolving opaque custody internally if production composition later chooses to connect one.

## Direct transport boundary

This module contains no:

- \`node:net\`;
- HTTP/HTTPS client;
- \`fetch\`;
- JSON-RPC provider;
- \`eth_sendRawTransaction\`; or
- direct Chain-2050 transport.

Its only external effect seam is the injected \`submit_once\` dependency after the durable claim.

The source lane itself does not activate or configure a production implementation of that dependency.

## Dry run

Without \`apply=true\`, V1 performs the fresh read-only inspection and derives the exact future intent/idempotency identities, but:

- publishes no intent;
- invokes no submit method; and
- authorizes no retry or mutation.

## Authority boundary

A successful applied source-path result means:

- fresh definitive not-submitted inspection occurred;
- exact durable submission intent was published first;
- injected \`submit_once\` was invoked exactly once by this invocation;
- the result is now reconciliation-required;
- automatic retry is false;
- raw signed-transaction access is false;
- opaque custody-handle access is false;
- Sovereign private-key access is false;
- wallet/signing access is false;
- direct RPC/network calls by this module are false; and
- direct Chain-2050 writes by this module are false.

The injected submitter **may** cause an external transaction submission if a later production composition connects a live broadcaster. This PR does not provide, activate, mount, or configure such a composition.

## Next gate

\`broadcast_reconciliation_without_resubmission_v1\`

Any retry or claim-release behavior requires a separate reviewed boundary.
