# Buy VOID legacy request-history external witness v1

Marker: `VOID_BUY_VOID_LEGACY_HISTORY_EXTERNAL_WITNESS_V1`.

Status: **source-only append/readback contract; no live external witness authority**.

## Separate witness namespace

Legacy request-history acceptance does not reuse the allocation replay witness
journal. The schemas and authority purposes differ.

This contract selects a distinct future witness path:

`/var/lib/void-legacy-history-external-witness-v1/legacy-history-sovereign-authorization-v1.jsonl`

The path selection is source policy only. This PR does not create the directory
or file and does not contact Nimo.

## Event contract

Before planning an event, the source verifier must successfully verify the exact
Sovereign-signed legacy-history authorization from the parent lane.

Each witness event binds:

- monotonically increasing sequence;
- previous-event SHA-256;
- exact signed authorization ID;
- exact authorization-request ID;
- exact disposition candidate ID;
- exact accounting decision;
- canonical candidate SHA-256;
- canonical complete signed-authorization SHA-256;
- verified Sovereign public-key DER SHA-256;
- witness timestamp that cannot predate the authorization.

Events are canonical JSONL. Existing noncanonical, duplicate or broken-chain
history fails closed. A second authorization for the same candidate is rejected,
while an exact already-witnessed authorization is idempotent.

## Readback boundary

The local readback classifier can prove only that caller-supplied observed bytes
exactly equal the planned next journal bytes. It does not authenticate where
those bytes came from.

Therefore even a perfect readback retains:

`external_transport_authenticated=false`

`external_witness_storage_proven=false`

`external_witness_verified=false`

`historical_request_history_disposition_accepted=false`

`stable_root_apply_authorized=false`

A later operator lane must establish a protected, fixed Nimo forced-command
writer/readback transport, authenticate Nimo identity/storage, append exactly
one planned event durably, and re-read the exact resulting bytes. Only a later
composition may accept the external-witness half of the ceremony.

No SSH, Nimo contact, host write, service mutation, private-key access,
request/payment content read, payment acceptance, presale activation or funds
movement occurs here.

PROTECT THE CORE.
