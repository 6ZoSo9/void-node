# Apollyon protected-store metadata-safe first-host collector V1

Marker: `VOID_APOLLYON_PROTECTED_STORE_FIRST_HOST_COLLECTOR_V1`.

Status: **source/test/CI candidate only**. This branch does not execute the Xiphos host pass.

## Exact parent and identity

Repair base: merged #3763 truth-HOLD chain at merge commit
`819031d8e9f1dfe4863a0df06fd2420a00c1cad8`.

That base contains:

- #3760 machine-ID binding head
  `fe751eb56e18ec134b96cb7a4d03738e86379c0d`;
- #3761 collector head
  `f8cf1eba57d8930452642699c21fa188c31cbd13`; and
- #3763 provenance-HOLD head
  `129e294cc35f930a22b15efd313ed541bcbd8306`.

The collector still carries the observed normalized machine-ID digest from
#3760:

- identity kind: `etc_machine_id_sha256`;
- observed normalized machine-ID SHA-256:
  `543902c4c208d749dbe2baa239e9cd010ac50eb8cde4db8eb8cd26f6e806f057`;
- historical binding ID:
  `voidapollyonhostidbind1_84b546de51ba3f22cd1f5775eb0230d5683e53254d3d3426b9a97fc2d3037f1d`;
- raw machine ID is never emitted.

**That digest is evidence only, not authenticated host provenance.** Merged
#3763 explicitly records that authenticated Xiphos machine identity is not
proven and that collector host authority remains unsatisfied. This source
repair therefore does not authorize `--run` and must not reinterpret hostname
or digest equality as authentication.

The parent metadata-safe first-host plan remains
`voidapollyonfirsthostplan1_c75bf9aaa019f82e2d73c80cb0c8bb3a1072bc462870a6d36b67a40fc59746be`.

## Fixed read-only observation surface

A separately authorized future `--run` may inspect only fixed identities:

- `/etc/machine-id` for normalized digest verification;
- trusted ancestor metadata for `/`, `/var`, `/var/lib`, `/run`, `/opt`,
  `/etc`, `/etc/systemd`, and `/etc/systemd/system`;
- fixed claim root `/var/lib/void-apollyon-attempt-claim-v2`;
- fixed consumption directory
  `/var/lib/void-apollyon-attempt-claim-v2/training-start-consumption-v1`;
- fixed runtime/socket/source-root and unit-file metadata;
- the current mount namespace plus bounded `/proc/self/mountinfo` metadata;
- `systemctl show` for a closed read-only property set on
  `void-apollyon-attempt-claim-v2.service`;
- when `MainPID` is nonzero, bounded `/proc/<pid>/status` fields
  `Uid/Gid/Groups/NoNewPrivs/CapEff/CapBnd/CapAmb` and the
  `/proc/<pid>/exe` identity.

The collector never reads `/proc/<pid>/cmdline` or `/proc/<pid>/environ`.

## Protected-store privacy boundary

The collector does **not** enumerate either protected directory. It never calls
`listdir`, `scandir`, `iterdir`, `glob`, or `rglob` on the protected
store, and it never opens a protected record leaf.

Therefore the first pass cannot expose:

- authorization-slot names;
- claim-record names;
- consumption-slot names;
- record JSON bytes;
- customer/request history;
- credentials, keys, wallets, or signer material.

Absence or inactivity is evidence only and is never converted into publication,
writer, release, or training authority. The receipt also keeps
`installed_source_generation_metadata_observed`,
`installed_package_runtime_metadata_observed`, and
`installed_service_process_identity_observed` false unless the corresponding
fixed objects/process were actually present and observed.

## Descriptor and metadata rules

Fixed files/directories use `O_NOFOLLOW|O_CLOEXEC|O_NONBLOCK` where
supported. Observations bind before/opened/visible and terminal generations and
fail closed on symlink/type/link-count/generation ambiguity.

The claim root and consumption directory additionally require an ACL check for
both `system.posix_acl_access` and `system.posix_acl_default`. The collector
records numeric owner/group/mode/link/type metadata but does not infer stronger
store authority merely from matching metadata.

Mount evidence records only the covering fixed mount identity, filesystem type,
a SHA-256 of the **complete selected kernel `/proc/self/mountinfo` row**,
exact-mountpoint status, and the count of mount rows sharing the same
root/device. The digest therefore binds the selected row's mount options,
optional propagation fields, filesystem type, mount source, and super-options
without emitting the raw row or unrelated mount paths. The disposable proof
uses distinct sentinel material in each adversarial mount-options, mount-source,
and super-options row and inspects the **returned adversarial receipt itself**;
none of that raw material may appear outside the digest. A remount or source/
super-option change between the first and second pass changes the digest and
HOLDs.

If more than one covering mount has the same greatest mount-point specificity,
the collector HOLDs instead of choosing one row by file order.

## Service/process boundary

The only systemd command is `systemctl show` with a fixed unit and closed
property set. No start, stop, restart, reload, enable, disable, daemon-reload,
kill, signal, or unit mutation is implemented.

For a live MainPID, the collector reads bounded process-status identity and
capability fields plus executable identity only. It brackets the observation
with bounded `/proc/<pid>/stat` start-time reads and also samples the allowed
status fields and executable identity twice. It HOLDs on PID reuse, credential
or capability drift, executable-path drift, or executable inode/metadata drift.
This prevents both PID recycling and same-process `execve`/credential changes
from splicing different runtime subjects into one receipt. It does not read raw
argv, environment, open file names, sockets, memory, or credentials.

The retained collector implementation contains before/after pass-level
generation checks for machine identity, trusted ancestors, fixed paths, mount
metadata, systemd state, and service-process subject. **Those live observations
are not executable in this source generation:** the public `--run` path first
requires authenticated Xiphos machine-identity provenance and host-pass
authority, both hard-bound false here, and HOLDs before hostname or filesystem
observation. A later reviewed authenticated-attestation successor must
explicitly rebind that gate before the retained observation logic can be used.

## Authority semantics

Under the current merged #3763 truth-HOLD, this collector is **not authorized
to execute a host pass**. The existing receipt schema can represent:

```text
host_pass_performed=true
machine_identity_bound=true
```

only after a **separate authenticated Xiphos identity attestation** is bound by
a later reviewed generation and the host pass receives its own explicit
operator authorization. The observed #3760 digest alone is insufficient.

Any eventual authorized receipt must continue to report false:

```text
protected_store_origin_proven=false
current_store_generation_revalidation_performed=false
authorization_winner_reread_performed=false
durable_claim_record_reread_performed=false
consumption_slot_classification_performed=false
writer_directory_capability_origin_proven=false
writer_invocation_authorized=false
consumption_publication_authorized=false
trainer_release_authorized=false
training_execution_authorized=false
credential_access=false
signing=false
transaction=false
funds_movement=false
```

The successful receipt is a metadata census for independent review, not an
authorization token.

## Source proof

The disposable proof pins the exact #3760 binding generation, the merged #3763
provenance-HOLD generation, and this collector source. It verifies:

- canonical machine-ID normalization and invalid forms;
- bounded closed process-status parsing;
- closed `systemctl show` parsing;
- mount-cover selection plus complete selected-row binding for mount options,
  mount source, and super-options;
- no dependency on directory enumeration;
- symlink rejection;
- synthetic ACL rejection;
- terminal descriptor-generation drift rejection;
- the public `run_host_pass()` provenance gate, with every host-observation
  provider patched to fail if reached; the gate must HOLD first with zero calls;
- negative machine-identity and host-pass authority in plan mode; and
- exact four-file parent-relative scope.

No Xiphos host pass is performed by CI.

Source blob: `160ad246b36eb2ee6680acc411686ff43a25bef9`.

Proof blob: `c0e05dacfb557956f6d2fa79522ccf18cb1f6d1f`.

## Next gate

After exact-head CI and independent review, the next gate is **not** `--run`.
First, a separate authenticated Xiphos machine-identity attestation must be
reviewed and bound so the merged #3763 provenance HOLD is actually satisfied.
Only after that may an actual metadata-safe `--run` pass be considered under
a separate explicit operator authorization.

No merge, deployment, service mutation, writer invocation, claim publication,
trainer release/training, credential/signing/transaction or funds authority
follows from this source repair.

**PROTECT THE CORE.**
