# Apollyon durable attempt-claim publish request envelope v2

Marker: `VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_ENVELOPE_V2`

Status: **pure source/test protocol closure; no service, socket, store or claim execution**.

## Purpose

Accepted #3233 and projected #3276 require an exact six-key publish request and
the method `publish_claim_v2`, but the inherited contract did not fix the request
marker/version literals or the exact canonical byte framing used for
`publish_request_sha256`.

No host implementation should invent those values.

This gate closes that wire-level ambiguity before
`apollyon_durable_attempt_claim_store_service_source_implementation_v2`.

## Source dependency pins

The closure declares and the proof re-hashes these exact dependencies:

- current service-source candidate head `ecb7d92cbc7db0c78f7707894dcd4c409bd29433`;
- current service-source candidate blob `7654ddb2d5875d1aa42e8f41398afb727ba3832d`;
- current store-contract head `9475035552881f34658a7c8f3a6b336199fda159`;
- current store-contract blob `bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc`;
- V1 canonicalizer blob `f97fafb0148527ae3a954e2752faef8c7fc9e88e`.

A downstream implementation must bind this complete protocol dependency closure, not only the envelope file.

## Exact wire envelope

The request object has exactly these six keys:

```text
claim_record
marker
method
store_contract_id
store_policy_id
version
```

Required literals:

```text
marker=VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_REQUEST_V2
version=2
method=publish_claim_v2
store_policy_id=apollyon_claim_store_policy_v2:e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137
```

The top-level `store_contract_id` and `store_policy_id` must exactly equal the
same fields in the enclosed claim record.

The enclosed claim record must use the exact accepted #3233 record schema,
marker, version, status, identifier formats, attempt limit `1`,
`automatic_retry_authorized=false`, and valid content-addressed
`claim_record_id`.

## Canonical framing and request digest

The one accepted request byte representation is:

1. canonical JSON using the repository V1 canonicalizer;
2. UTF-8;
3. exactly one final LF byte;
4. no other literal LF byte in the framed request;
5. total length no greater than 65,536 bytes.

`publish_request_sha256` is the lowercase 64-hex SHA-256 digest of those exact
framed bytes, including the final LF.

The parser exposes this validated evidence as immutable
`canonical_request_utf8_lf` text rather than a mutable `Buffer`.
A downstream consumer that needs bytes must encode that string as UTF-8; mutating
such a reconstructed buffer cannot alter the parser's retained evidence or
`publish_request_sha256`.

This mirrors the reviewed Apollyon AF_UNIX custody protocol and removes
implementation-dependent whitespace/framing choices.

## Deliberate stop

This gate validates protocol shape only. It does not prove:

- protected runner origin;
- current Xiphos state;
- custody record freshness;
- claim-service or publisher identities;
- socket peer credentials;
- store generation/root identity;
- durable publication;
- claim authorization;
- training authorization.

All such boundaries remain required by #3233/#3265/#3276. The repaired
parent lineage additionally requires the fresh live-process credential and host
PID/user-namespace evidence now bound by #3276; this envelope does not attempt
to duplicate or weaken those host checks.

## Authority

No filesystem read/write, network/socket action, service action, account/group
mutation, durable claim publication, training/model execution, private-key
access, signing, wallet, transaction or funds movement.

Next gate after source/CI acceptance:
`apollyon_durable_attempt_claim_store_service_source_implementation_v2`.

PROTECT THE CORE.

## Current source dependency

The current service-source candidate is the exact source blob
`7654ddb2d5875d1aa42e8f41398afb727ba3832d` at commit
`ecb7d92cbc7db0c78f7707894dcd4c409bd29433`. Its parent store-contract
identity is the coherent pair `9475035552881f34658a7c8f3a6b336199fda159` /
`bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc`.

The rebind updates only dependency identity, not request marker/version,
canonical six-key wire schema, UTF-8-plus-LF framing, or publish SHA-256 logic.
No protected origin, Xiphos/host read, socket/service action, claim publication,
training admission, signing, transaction or funds authority follows.
