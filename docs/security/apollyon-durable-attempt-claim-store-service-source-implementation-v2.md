# Apollyon durable attempt-claim store service source implementation V2

Marker:
`VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_SERVICE_SOURCE_IMPLEMENTATION_V2`.

Status: **source/test/CI implementation core only; no installed service, AF_UNIX listener, Xiphos mutation, or production claim publication**.

## Purpose

The accepted Apollyon claim-store stack defined all of the pieces surrounding a durable claim writer, but the concrete service core was still missing:

- #3276 defined the fixed service/store policy and path roles;
- #3285 froze exact six-key request framing and `publish_request_sha256`;
- #3291/#3300/#3306/#3309 defined the privileged handoff, native peer/process provenance requirements, and kernel primitives;
- #3357 added the authorization-wide create-once winner slot.

Without this implementation, later training-start protected-store revalidation could not truthfully name concrete claim/slot/generation leaf paths.

This gate provides the reusable synchronous store/publisher core and fixes the physical protected-store namespace. It deliberately does **not** supply an installed service wrapper or claim that caller-provided provenance/serialization callbacks are host authority.

## Exact parent

Base: accepted #3357 exact head
`4e7d433a4141b4a7cad7fb001d0800dccb1b5ec2`.

Important exact source generations:

- authorization-slot V1:
  `93582c324ca85aeff56eb61f82b32f1e4c18dfe9`;
- exact request envelope V2:
  `d1726e3be042549769d2fe554371facd2ed60553`;
- protected store contract V2:
  `6e3e5a80b3f481f98aced9b33e3f2ec66ec96bbe`;
- inert store-service candidate V2:
  `d67ef39c4cd034844fb0862e180de46ed4cd0c88`;
- native peer integration V2:
  `394b9dbaebbdbb561be6119f5be8b60d59fb367d`;
- shared canonicalizer:
  `f97fafb0148527ae3a954e2752faef8c7fc9e88e`;
- terminal receipt:
  `e27f0ebb968f4611bfc069670325c3f5e6df1c65`;
- live source/session binding:
  `981935515e08634be96446e58922c16be56d33ad`;
- revalidation handoff:
  `5d913eb08d79c76ed926d8b88be05b12f475abd5`.

## Fixed physical namespace

The service implementation fixes the protected root role to the existing host-plan path:

`/var/lib/void-apollyon-attempt-claim-v2`.

Within one retained root descriptor, the V2 implementation namespace is:

```text
active-generation-v2.json
store-generations-v2/
authorization-slots-v1/
claims-v2/
.pending-v2/
training-start-consumption-v1/
```

The implementation itself does not create those directories or install that root. Host installation remains a separate gate.

Protected root and subdirectories are required mode `0700` and owned by the configured claim service UID/GID. Durable record leaves are required mode `0600`, single-link after completed publication, and exact owner/group.

The retained root identity is content-addressed as canonical:

```text
dev
ino
mode
uid
gid
nlink
size
```

and must equal the active/immutable store-generation record's
`root_identity_sha256`.

## Exact publisher forwarding

`prepareApollyonDurableAttemptClaimPublisherForwardV2()` accepts only a Buffer containing the exact canonical #3285 request frame.

It validates the request and returns a fresh byte copy of the exact original frame plus its digest. It explicitly reports:

- no request reconstruction;
- no recanonicalization;
- no argv source;
- no environment source;
- no stdin source;
- no filesystem source;
- no network source.

A later publisher process wrapper must obtain those bytes from the reviewed inherited private pipe. This source function alone is not that runtime proof.

## Durable slot-first publication

`createApollyonDurableAttemptClaimStoreServiceCoreV2()` receives a retained root FD, exact claim UID/GID, a source-session binding ID, and two injected synchronous capabilities:

- `withExclusiveStoreTransaction(fn)`;
- `revalidate(stage, context)`.

The core validates the exact request, claim record, authorization-slot winner, expected generation record, retained root identity, active generation and immutable generation file before mutation.

The mutation order is fixed:

1. pre-mutation generation + source revalidation;
2. recover any exact interrupted hard-link publication;
3. classify existing slot/claim state;
4. create or recover the authorization slot;
5. reread/validate exact slot bytes;
6. revalidate generation/provenance;
7. create or recover the exact bound claim;
8. reread/validate exact claim bytes;
9. revalidate generation/provenance;
10. emit a validated standard durable-success response.

A pre-existing claim without its authorization slot is a hard HOLD.

A different valid claim for the same occupied authorization slot is a hard collision/HOLD before a second claim can be published.

## Create-only durability algorithm

Both slot and claim records use the same bounded publication primitive:

1. create a private random pending leaf in `.pending-v2` with
   `O_RDWR|O_EXCL|O_NOFOLLOW`; read/write access is retained only so the
   service can verify the exact bytes through that same private descriptor;
2. enforce mode/owner/link-count metadata;
3. write exact canonical bytes;
4. file `fsync`;
5. exact same-descriptor reread from byte offset zero;
6. create-only hard-link pending → final;
7. final-directory `fsync`;
8. unlink the pending name;
9. pending-directory `fsync`;
10. exact final reread.

Hard-link publication is used so the final leaf is never directly partially written and no overwrite API is required.

If a crash or cleanup failure leaves a final link with `nlink=2`, retry may remove only the single pending entry whose device/inode exactly equals that final record and whose deterministic pending prefix matches the expected slot/claim digest. Ambiguous or foreign pending state HOLDs.

A failure after final publication but before durable cleanup is reported as indeterminate, never false success.

## Source-only revalidation boundary

The three required revalidation stages are:

```text
before_slot_publication
after_slot_before_claim
before_success_ack
```

Each stage is bracketed by active + immutable generation rereads.

The callback receipt is exact-schema and binds:

- source-session binding ID;
- publish-request SHA-256;
- store generation and generation-record IDs;
- authorization-slot ID + record ID;
- claim-record ID;
- exact stage.

However, a **caller-supplied callback is not host provenance**. Likewise, a caller-supplied exclusive-transaction wrapper is not proof of system-wide serialization.

These are narrow injectable interfaces so the store algorithm can be deterministically tested before the later native/Xiphos integration binds them to reviewed kernel process/session evidence and a real store-generation serialization primitive.

## Hosted adversarial proof

The focused proof uses only disposable private temporary roots. It proves:

- exact publisher bytes are preserved;
- malformed/noncanonical requests reject;
- retained root identity is bound to generation records;
- active and immutable generation records must match;
- slot is durable before claim publication;
- pending-file fsync → hard-link → directory-fsync → cleanup ordering;
- final exact reread;
- exact replay is idempotent;
- a different claim for the same authorization is rejected;
- failure after durable slot / before claim recovers only that same bound claim;
- failure after claim hard-link / before pending cleanup produces indeterminate state, then exact retry reconciles the nlink-2 generation and succeeds;
- generation drift introduced by revalidation callback rejects before mutation;
- orphan claim without slot rejects;
- asynchronous revalidation and asynchronous transaction wrappers reject before mutation.

The proof mutates only disposable CI filesystem state. It does not contact Xiphos.

## Deliberate non-authority

This generation reports implementation source as present, but keeps all live authority false:

```text
caller_supplied_exclusive_transaction_is_host_proof=false
caller_supplied_revalidator_is_host_proof=false
native_peer_runtime_integration_present=false
af_unix_listener_implementation_present=false
privileged_revalidator_runtime_integration_present=false
publisher_runtime_process_integration_present=false
installed_source_custody_proven=false
protected_store_origin_proven=false
cross_uid_host_qualification_performed=false
kernel_peer_authentication_performed=false
direct_parent_lineage_proven=false
privileged_revalidation_performed=false
challenge_exchange_performed=false
xiphos_execution_performed=false
production_claim_store_mutation_performed=false
production_durable_attempt_claim_performed=false
attempt_claim_authorized=false
training_start_admission=false
training_execution_authorized=false
training_execution_performed=false
operator_private_key_access=false
signing=false
wallet_access=false
transaction=false
funds_movement=false
```

## Next gate

`apollyon_durable_attempt_claim_store_service_runtime_integration_v2`.

That gate must bind the source core to the accepted native peer/process/revalidator primitives, authenticate the injected capabilities, and later undergo a separate installed Xiphos qualification before any production claim mutation can be considered.

**PROTECT THE CORE.**
