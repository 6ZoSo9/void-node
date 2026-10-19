# Apollyon authorization-slot protected-origin implementation V1

Marker: `VOID_APOLLYON_AUTHORIZATION_SLOT_PROTECTED_ORIGIN_IMPLEMENTATION_V1`.

Status: **source/read-only implementation candidate; complete protected origin remains unproven**.

## Parent and scope

Parent: #3526 exact head
`db8c56d7ebe73e0646355bc6fcb4a5141ef7422f`.

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

The slot leaf is derived only from the validated authorization-slot ID. The
reader first acquires the visible leaf with Linux `O_PATH|O_NOFOLLOW|O_CLOEXEC`
and proves that held inode is the exact regular mode-0600, single-link generation
owned by the expected claim identity and bounded to 64 KiB. Only after that
admission does it data-open `/proc/self/fd/<held-fd>` with
`O_RDONLY|O_CLOEXEC|O_NONBLOCK`. The data-open therefore targets the retained
already-admitted regular inode, never a pathname replacement such as a FIFO or
device node. The reopened descriptor must match the held and still-visible
generation and expose no POSIX ACL.

## Descriptor-stable reread

The reader:

1. binds root, slot directory and visible slot inode;
2. reads exact canonical bytes through the retained slot descriptor;
3. validates the #3357 slot schema and content-addressed record identity;
4. revalidates retained and visible root/directory/slot generations;
5. rereads the same retained descriptor and requires identical bytes; and
6. revalidates the retained descriptors **and the visible slot-file, slot-directory,
   and claim-root bindings again** after the second reread.

The visible `authorization-slots-v1` binding is checked from the retained claim-root
descriptor both before and after the second reread. Renaming that directory out of
the protected root and replacing it with another directory therefore cannot turn a
stale detached-directory observation into a current receipt.

Host filesystem `OSError` failures from the protected root/slot observation path
are normalized to machine-readable `Hold` results rather than escaping as Python
tracebacks.

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
substitution, missing slot paths, noncanonical and recursively nested JSON,
slot-ID/content-address drift, same-byte visible slot replacement after the first
read, visible slot-directory replacement while the old directory remains retained,
same-byte visible slot replacement after the second reread, and a visible
regular-to-FIFO replacement immediately before data-open. That last fixture
requires the data-open target to be only the retained `/proc/self/fd/<held-fd>`
inode and proves zero data-open attempt on the replacement pathname.

No protected store, service, capability, training, credential, transaction or
funds action occurs.

**PROTECT THE CORE.**


## Current contract-origin parent (October 18, 2026)

The current source-only parent is #3526 at
`db8c56d7ebe73e0646355bc6fcb4a5141ef7422f`, with the protected-origin
contract Git blob `833876baf077b9616d08ee9b13b2657a0818dcc5` and underlying
authorization-slot source `c2ff992a09fe916a5016b5a6c4ceced4ab1d2fa8`.
A full untruncated prior/current parent tree comparison yielded 362 changed
paths and **zero overlap** with this child's four ADD-only files. The accepted
historical direct parent `e496f4391b2b4e9be006695fcd8845669059a48f`
remains preserved in first-parent history.

The current Python reader also repairs the privileged leaf-open boundary: it
uses O_PATH admission before any data-open and then reopens only the held,
already-proven regular inode. It retains its fixed root, ACL/path validation,
descriptor-held rereads, and final visible name and directory generation
checks. Disposable proofs use the current pins; no Xiphos protected state is
observed. Parent contract validity, read-only slot shape and stable inode
observation still do not prove complete claim-service protected origin.
Activation-capability issuance and training remain forbidden.

## Prior revoked-Proxy error-normalization rebind (historical)

This generation is rebound to #3526 `e496f4391b2b4e9be006695fcd8845669059a48f`, whose public slot/candidate/requirements preflights reject active and revoked Proxy inputs through their exact namespaced schema errors before `Array.isArray`. The protected reader semantics in this child are otherwise unchanged; complete protected origin and capability issuance remain false.
