# Buy VOID allocation custody qualification v1

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_QUALIFICATION_V1`

Status: **source-only host/storage evidence classifier; no host I/O and no production authority**.

Reviewed writer parent:

`62ad83462c35b404e1a4cea1e28f68664977df45`

## Purpose

The crash-recoverable allocation writer closes source-level publication races, but
its own authority deliberately keeps these false:

- `post_admission_root_path_stability_proven`;
- `single_root_post_publication_recovery`;
- `protected_high_water_custody_proven`;
- `independent_custody_proven`; and
- `production_gate_ready`.

This classifier defines the exact evidence shape required for the next
privilege-separated custody gate without pretending source code can prove live
host ownership, mount stability, or external receipt trust by itself.

## Trust split

The target deployment shape is:

```text
public Buy runtime UID
  -> AF_UNIX request only
  -> dedicated custody service UID
       -> allocation ledger root
       -> protected high-water / intent root
```

Both storage roots are required to be owned by the custody identity. The public
Buy runtime may not write, rename, or recreate either root.

Every retained ancestor of both roots must be root-owned, direct, non-symlink,
and non-writable by group/other. This intentionally disqualifies a deployment
whose authority roots can be replaced through a user-owned home-directory
ancestor.

## Separate storage-domain evidence

Pathname difference is not custody independence.

For each root, the classifier binds two fingerprints.

Mount-instance fingerprint:

```text
mount_target
mount_source
mount_uuid
major_minor
filesystem_type
statfs_type
mount_options
```

Storage-failure-domain fingerprint:

```text
mount_source
mount_uuid
major_minor
filesystem_type
statfs_type
```

The second deliberately excludes the mount target. Bind aliases of one device
therefore cannot qualify as separate storage.

V1 requires ledger and protected-custody evidence to differ in exact mount
source, UUID, and major:minor identity. A later non-block-device custody design
requires a separate reviewed evidence kind rather than weakening this rule.

## Service and IPC policy

The source evidence requires a dedicated custody UID/GID distinct from the
public runtime and a systemd-style hardening profile including:

- `UMask=0077`;
- `NoNewPrivileges=true`;
- `PrivateTmp=true`;
- `PrivateDevices=true`;
- `ProtectSystem=strict`;
- `ProtectHome=true`;
- kernel/control-group protections;
- `LockPersonality=true`;
- `RestrictSUIDSGID=true`;
- `RestrictRealtime=true`;
- empty capability and ambient-capability sets;
- `RestrictAddressFamilies=AF_UNIX`; and
- an exact writable-path allowlist containing only the two authority roots.

The Unix socket evidence requires a server-controlled direct socket, protected
parent, bounded request/response bytes and timeout, exact schemas, and no
arbitrary path/bytes write or caller-selected rollback generation.

This lane does not install or start that service.

## Current-state binding

The current allocation ledger and current high-water are classified with the
existing #2442 high-water binding. The classifier does not reimplement ledger or
inventory arithmetic.

A source-qualified result therefore requires the exact current ledger bytes to
match:

- record count;
- tip hash;
- ledger SHA-256;
- byte length;
- pool total;
- reserved total; and
- remaining total.

## Why a prior receipt is required

A valid current ledger + matching current high-water cannot detect a coordinated
rollback of both files to an earlier valid pair.

The source contract therefore uses a content-addressed custody receipt. Except
at canonical genesis, an exact prior receipt is required.

Receipt fields include:

- custody epoch and previous receipt digest;
- reviewed writer source head;
- host and qualification-policy identity;
- ledger/custody mount-instance fingerprints;
- ledger/custody storage-failure-domain fingerprints;
- ledger byte length, record count, tip, and ledger hash;
- exact high-water hash and inventory fields; and
- the receipt's own canonical SHA-256.

The receipt chain itself still requires protected live custody later. This
classifier explicitly keeps:

```text
prior_receipt_external_trust_proven=false
independent_custody_proven=false
production_gate_ready=false
```

## Genesis

No prior receipt is accepted only when the current canonical allocation ledger
is empty and its current high-water is the canonical genesis binding.

That produces custody epoch `0` with
`previous_receipt_sha256=null`.

This is the preferred time to establish protected custody: before public intake
creates the first allocation obligation.

## Exact forward continuity

For a supplied prior receipt:

1. receipt schema and self-hash are verified;
2. reviewed writer head, host policy, mount instance, and storage-domain
   fingerprints must match current evidence;
3. unchanged current allocation state returns the same receipt idempotently;
4. otherwise current record count must equal prior count + 1;
5. the prior ledger prefix is reconstructed using the prior receipt's exact
   `ledger_bytes`;
6. the prior high-water JSON is reconstructed from the receipt;
7. #2442 must bind that prior prefix exactly; and
8. #2442's canonical advance planner must prove the full current ledger is one
   exact append and yields the exact current high-water.

Arbitrary multi-record jumps are not accepted in v1.

## Deterministic qualification identity

The normalized host/service/storage evidence is canonicalized and hashed into
one qualification-policy fingerprint.

The final qualification ID is derived from:

```text
void-buy-allocation-custody-qualification-v1
qualification_policy_fingerprint_sha256
receipt_sha256
```

Object-key insertion order does not affect the result.

## Result vocabulary

Success is deliberately named:

`status=source_qualified`

or, for exact replay:

`status=idempotent`.

It is not called live-ready.

Positive results report:

- `root_path_stability_evidence_qualified=true`;
- `separate_storage_domain_evidence_qualified=true`;
- `monotonic_continuity_against_supplied_prior=true`; but
- `prior_receipt_external_trust_proven=false`;
- `independent_custody_proven=false`;
- `production_gate_ready=false`.

## Authority boundary

This classifier performs no filesystem, systemd, mount, permission, RPC, wallet,
signer, transaction, chain, inventory, market, presale, treasury, liquidity, or
funds mutation.

It does not collect live host evidence. It only classifies supplied evidence.

The next gate is a read-only designated-host evidence collector plus separately
protected receipt custody. Only after that evidence is reviewed may a later lane
compose the custody service with the allocation writer.

## Verification

```bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_reservation_high_water_v1.ts
npx tsx scripts/prove_buy_void_allocation_reservation_publication_writer_v1.ts
git diff --check
```

The focused proof covers genesis, object-key order invariance, idempotent
replay, one-record advance, missing prior receipt, multi-record jump, forged
prior prefix, same-count conflict, bind alias, missing custody medium, identity
separation, writable root, unsafe ancestor, IPC policy, service policy, fallback
storage, source-head mismatch, and changed-host prior-receipt mismatch.
