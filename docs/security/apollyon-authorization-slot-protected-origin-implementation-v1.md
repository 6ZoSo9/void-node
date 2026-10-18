# Apollyon authorization-slot protected-origin implementation V1

Marker: `VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_IMPLEMENTATION_V1`.

Status: **source/read-only implementation candidate; complete protected origin remains unproven**.

## Parent and scope

Parent: #3526 exact head
`0aee45290fe2af7b5990d470ca4ecd177bb9429b`.

This child implements the fixed protected-slot reader/reread boundary named by
the #3526 contract. It does not issue an activation capability.

## Fixed read boundary

Future live mode is fixed to:

`/var/lib/void-apollyon-attempt-claim-v2/authorization-slots-v1`.

The caller can supply only an expected authorization-slot ID and expected
non-root claim UID/GID. The root and slot-directory paths are not selectable.

Traversal is descriptor-relative from `/` with no-follow directory opens.
Trusted ancestors must be root-owned/root-group, not group/world writable, and
must expose no POSIX access/default ACL. The final claim root and slot directory
must be exact mode 0700 and owned by the expected claim identity, also without
POSIX ACLs.

The slot leaf is derived only from the validated authorization-slot ID. It is
opened read-only with `O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK`; a racing FIFO cannot
block the privileged reader. The leaf must be regular, mode 0600, link count 1,
owned by the expected claim identity, bounded to 64 KiB, and have no POSIX ACL.

## Descriptor-stable reread

The reader:

1. binds root, slot directory and visible slot inode;
2. reads exact canonical bytes through the retained slot descriptor;
3. validates the #3357 slot schema and content-addressed record identity;
4. revalidates retained and visible root/directory/slot generations;
5. rereads the same retained descriptor and requires identical bytes; and
6. revalidates retained and visible root/directory/slot generations **again**
   after the second reread.

Same-byte pathname replacement before or after the second reread therefore
HOLDs.

Malformed UTF-8/JSON, duplicate keys, noncanonical framing, recursive/resource
JSON failures, slot-ID drift, hard links, ACL/mode drift, symlinks and
special-file substitution fail closed.

## Deliberate partial result

A GREEN source/read-only receipt can prove only the fixed protected-root
metadata/custody checks, one retained protected root during the observation,
descriptor-stable slot reread, and exact canonical slot bytes/content address.

These #3526 requirements remain false/unperformed:

```text
claim_service_only_writer_proven=false
current_store_generation_revalidation_performed=false
exact_claim_record_revalidation_performed=false
exact_terminal_receipt_revalidation_performed=false
exact_publish_request_revalidation_performed=false
protected_authorization_slot_origin_proven=false
activation_capability_issuance_authorized=false
activation_capability_issuance_performed=false
training_start_consumption_authorized=false
training_start_consumption_performed=false
training_release_authorized=false
training_execution_authorized=false
training_execution=false
filesystem_write=false
network_access=false
service_action=false
socket_action=false
credential_access=false
private_key_access=false
signing=false
wallet_access=false
transaction=false
funds_movement=false
```

Because those requirements remain open, the next gate is **not** capability
issuance. It is:

`apollyon_authorization_slot_protected_origin_claim_service_revalidation_v1`.

That gate must bind reviewed claim-service writer/origin plus current store
generation, exact claim record, terminal receipt and publish request before
complete protected origin can become true.

## Hosted proof

Hosted CI uses disposable temporary directories under the ordinary runner
UID/GID only. It performs no Xiphos access.

Adversaries cover wrong root/slot/file modes, hard links, symlinks, FIFO
substitution, noncanonical and recursively nested JSON, slot-ID/content-address
drift, same-byte visible replacement after the first read, and same-byte visible
replacement after the second reread.

No protected store, service, capability, training, credential, transaction or
funds action occurs.

**PROTECT THE CORE.**
