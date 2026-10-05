# Coupled native-gas reconciliation custody qualification v1

Marker: `VOID_COUPLED_NATIVE_GAS_RECONCILIATION_CUSTODY_QUALIFICATION_V1`

Status: **source-only host-evidence classifier; no live host I/O and no production authority**.

## Purpose

Issue #2498 tracks the designated-host boundary intentionally left false by the
native-gas reconciliation writer. Source-level pathname and descriptor checks
can detect drift, but they cannot prove that a same-UID runtime cannot later
rename/recreate a payer root, replace a writable ancestor, bind-mount an
alternate namespace, or remount qualified storage.

This classifier defines the evidence shape required before any later runtime
composition may claim that boundary is closed.

It does **not** install a service, change ownership or permissions, create
storage, mount/remount anything, publish reconciliation rows, call RPC, access a
wallet/signer/key, construct/sign/broadcast a transaction, spend gas, activate
the presale/WC market, or move funds.

## Deployment shape classified

The target privilege split is:

```text
public runtime UID
  -> no write/rename/recreate authority over payer root
  -> dedicated reconciliation-custody service UID
       -> payer-domain-v1.json
       -> records/
       -> reconciliations/
       -> gas-liability-admission-v1.queue/
```

The service UID/GID must be distinct from the public runtime UID/GID. The payer
root is service-owned and mode `0700`.

Every ancestor above the payer root must be:

- direct and non-symlink;
- root-owned;
- non-writable by group/other;
- not writable, renameable, or recreateable by the public runtime identity.

That intentionally disqualifies a root beneath a user-owned or runtime-writable
home/path ancestor.

## Exact namespace identity

The evidence binds one payer root by resolved path, device and inode, then
requires direct service-owned children at exactly:

```text
payer-domain-v1.json
records/
reconciliations/
gas-liability-admission-v1.queue/
```

The three directories must be mode `0700`; the payer-domain file must be mode
`0600`, link count 1, and bind the exact expected `payer_domain_id` plus
content SHA-256.

All five retained identities (root, payer-domain file, records,
reconciliations, queue) must have distinct inodes on the same device.

A missing or alternate reconciliation namespace therefore HOLDS. There is no
fallback to a user-home or alternate path.

## Mount authority

The payer root carries one mount-instance fingerprint over:

- mount target;
- source;
- UUID;
- major:minor;
- filesystem type;
- statfs type; and
- sorted mount options.

The supplied evidence must state that the public runtime cannot remount or
bind-mount the authority. The mount must be writable for the dedicated service.

This source classifier does not prove those host claims; it only requires and
content-addresses them. A later read-only collector must obtain them from the
designated host.

## Service policy

The supplied service policy must bind an exact unit digest and require:

- dedicated UID/GID;
- `UMask=0077`;
- `NoNewPrivileges=true`;
- `PrivateTmp=true`;
- `PrivateDevices=true`;
- `ProtectSystem=strict`;
- `ProtectHome=true`;
- kernel/control-group protection;
- `LockPersonality=true`;
- `RestrictSUIDSGID=true`;
- `RestrictRealtime=true`;
- empty capability and ambient-capability sets;
- an exact writable-path allowlist containing only the payer root; and
- no public-runtime authority to control the service.

## Negative host evidence

A source-qualified snapshot must explicitly bind successful negative tests for:

- same-UID payer-root rename denial;
- same-UID payer-root recreate denial;
- symlink substitution denial;
- bind-mount substitution denial;
- remount denial; and
- alternate reconciliation namespace substitution denial.

A false/missing negative test HOLDS.

## Evidence freshness

The host snapshot binds:

- host ID;
- observation time;
- expiry time;
- positive evidence generation; and
- boot-ID SHA-256.

The caller supplies `verification_now_ms`. V1 accepts at most a five-minute
observation-to-expiry interval and rejects future, expired, zero-generation, or
overlong snapshots.

The classifier does not prove the origin of that clock, does not prove
generation monotonicity across independently supplied snapshots, and does not
perform the live host observation. It therefore keeps:

```text
writer_generation_binding_proven=false
bootstrap_receipt_external_trust_proven=false
evidence_generation_monotonicity_proven=false
verification_clock_authority_proven=false
live_host_qualification_performed=false
production_gate_ready=false
```

## Qualification receipt

A positive source result emits a content-addressed receipt binding the host,
snapshot generation/time/boot ID, payer-domain identity, payer-root
device/inode, exact child inode identities, mount-instance fingerprint, service
unit digest, and static policy fingerprint.

That receipt is only a source-classified evidence object. Its protected
external custody is a separate gate and remains false here.

## Relationship to #2494 / #2497

This lane is intentionally independent of the current Draft writer generation.

- #2497 defines the stable terminal-cost/reconciliation identity parent.
- #2494 remains HARD-HOLD until #2497 is accepted/merged and the writer is
  restacked/reproved.
- this custody classifier does not import or bless the current #2494 writer.

A later lane must bind the exact accepted writer source generation before
setting `writer_generation_binding_proven=true`, collect fresh designated-host
evidence, protect the qualification/bootstrap receipt, and then compose runtime
admission.

## Authority boundary

Always false in this lane:

- storage bootstrap;
- runtime integration;
- payment acceptance;
- wallet/signer/private-key access;
- transaction construction/signing/broadcast;
- Chain-2050 write;
- native-gas spend;
- inventory mutation;
- WC/VOID or presale activation;
- treasury/liquidity action;
- production readiness; and
- funds movement.

## Verification

```bash
npm run typecheck
npm run build
npx tsx scripts/prove_coupled_native_gas_reconciliation_custody_qualification_v1.ts
git diff --check
```

The focused proof covers a green synthetic evidence snapshot plus stale/future/
overlong evidence, zero generation, service/runtime identity collapse, unsafe or
runtime-writable ancestors, root symlink/replacement authority, bind/remount
authority, wrong mount target, alternate reconciliation namespace, inode alias,
payer-domain mismatch/link alias, service hardening drift, writable-path drift,
failed negative tests, fallback storage, and missing required namespace.
