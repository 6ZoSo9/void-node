# DataNet registry single-transaction signing authorization v1

Marker: `VOID_DATANET_REGISTRY_SINGLE_TRANSACTION_SIGNING_AUTHORIZATION_V1`

Status: exact single-transaction signing authorization artifact. Signing itself
remains a later gate.

## Purpose

Convert one green
`VOID_DATANET_REGISTRY_EXACT_SIGNING_REQUEST_V1` into a content-addressed
authorization for exactly one signing operation.

This gate is intentionally narrower than signing:

- it requires the exact operation-bound confirmation
  `authorizeDatanetRegistryDeploymentSigningV1`;
- it rebuilds and validates the signing request and all of its public/evidence
  lineage;
- it inherits the signing request expiry and cannot extend it;
- it binds the exact candidate, transaction fingerprint, deployer, nonce,
  gas/fee caps, deployment-data hashes, serialized-transaction digest,
  unsigned transaction hash, and predicted contract address;
- it permits at most one signing;
- it requires durable single-use consumption before any signer access; and
- it still forbids broadcast and Chain-2050 write authority.

## Exact confirmation

The only accepted confirmation is:

`authorizeDatanetRegistryDeploymentSigningV1`

A general instruction such as “continue”, source-work authorization, green CI,
merged PR, candidate-construction confirmation, credential-binding confirmation,
or the existence of the signing request does **not** satisfy this gate.

The confirmation is consumed only when an operator intentionally runs the
Precision authorization compiler. Merely merging this source does not generate
an authorization artifact.

## Time boundary

`authorized_at_utc` must be canonical UTC and must fall within the exact
signing-request validity interval.

The authorization inherits the signing request's `valid_until_utc` unchanged.
It cannot create a longer signing window.

A later signer gate must recheck expiry at runtime before opening the deployer
credential.

## Single-use boundary

The authorization records:

- `exact_single_transaction=true`;
- `signing_count_maximum=1`;
- `single_use=true`;
- durable consumption before signer access required; and
- runtime expiry recheck before signer access required.

The authorization itself does not implement replay prevention. Its next gate is
a private durable consumption record written before any signer object is
created.

## Authority boundary

The authorization may set
`exact_transaction_signing_authorized=true` for the exact reviewed candidate,
but this source gate itself still records:

- credential access false;
- private-key access false;
- wallet access false;
- signer object exposure false;
- transaction signing performed false;
- signed-transaction export false;
- transaction submission false;
- transaction broadcast authorized false;
- transaction broadcast performed false;
- deployment authorized/performed false;
- Chain-2050 write authorized/performed false;
- validator/token/funds mutation false;
- migration/public activation false; and
- automatic retry false.

## Precision compiler

`ops/precision/void-datanet-registry-single-transaction-signing-authorization-v1.mjs`
reads only public/evidence JSON artifacts and the signing request. It requires
the exact `--confirmation` value, writes one mode-0600 authorization artifact,
and performs no RPC, SSH, Nimo, credential, signer, systemd, Docker, transaction,
or chain action.

## Next gate

A green authorization receipt permits only:

`durable_single_use_authorization_consumption_before_exact_registry_transaction_signing_v1`

That later consumption must happen before any Nimo deployer credential is
opened for signing.

Broadcast remains a separate authorization even after signing succeeds.
