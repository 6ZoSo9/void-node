# Nimo V3 inactive exact-wire bundle v1

This successor packages the current combined Nimo witness V3 candidate
`voidwfb3_cec212bbadb4586f7d479c2284e7a2850f47bdc2205a6dccfad5274c8c7ef454`
without installing or accepting it.

The historical V1 witness and proposed V2 lock remain immutable. The V3
candidate changes only the compiled allocation-reservation ledger from the
proposed V2 runtime closure; the other seven runtime files remain the reviewed
V2 bytes.

`scripts/prove_buy_void_nimo_v3_inactive_bundle_v1.py` verifies the exact
eight runtime sizes/SHA-256 identities and the exact V2 lock Git blob, builds a
deterministic USTAR archive with fixed member order/uid/gid/mode/mtime, and
independently reparses the result. Inspection reconstructs the canonical TAR
byte-for-byte, so changed headers, payload bytes, padding, or trailing blocks
HOLD.

CI builds the runtime independently on Node 22, 24 and 26, requires the same V3
candidate ID, packages and reinspects each archive, rejects a trailing-byte
tamper, then requires all three archives and receipts to be byte-identical.

This remains an inactive review artifact. It does not install files on Nimo,
authenticate the cross-UID custody principal, mount verified-payment to
allocation dispatch, enable custody reserve/recover, accept customer payment,
activate the presale, access wallets/signers, or move funds.

## Exact archive and private stage

The qualified canonical archive is exactly **256000 bytes** with SHA-256
`5063297be5469385113041da31962d465350607dafffe25784e3b4888e7f6900`.
Node 22, 24 and 26 independently produced byte-identical archives and
receipts.

`scripts/void_nimo_v3_private_stage_v1.py` is a standalone unprivileged
stage/inspection tool pinned to that exact wire image. Public staging is
restricted to a fresh
`$HOME/void-nimo-v3-inactive-review-20261010` directory. The root and
intermediate directories are mode 0700; the eight payload files are mode
0400. Creation uses directory file descriptors, `O_NOFOLLOW`, exclusive
file creation, exact inode/owner/mode/hash checks, and file/directory fsyncs.
A pre-existing stage is a HOLD and is never repaired, replaced or deleted.

The self-test uses disposable temporary directories and requires repeat-stage
rejection, staged-content tamper rejection, and top-level stage path
rebinding/symlink rejection. `--inspect-stage` remains read-only.

Even a successful private stage is **not** an installation or acceptance:
`installed_nimo_v3_accepted=false`,
`authenticated_custody_principal_verified=false`,
`verified_payment_to_allocation_mounted=false`,
`custody_reserve_or_recover_enabled=false`,
`presale_activation=false`, and `funds_moved=false`.
