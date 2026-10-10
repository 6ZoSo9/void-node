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

## Two-file preinstall authorization-set admission — source-only

`scripts/void_nimo_v3_two_file_admission_readonly_v1.py` (Git blob
`943c02dde93e1c4b1a98e715b2a61d7d6c7e56c0`) is an **independent,
read-only** observer for the next Nimo ceremony. It is not a root installer.

On Nimo, the command `python3 - --inspect` (script piped over an already
known-host SSH session) requires nonroot execution and the exact Nimo hostname.
It binds the exact private staged eight-file V3 payload to fresh descriptor-
relative SHA-256 reads, requires all eight installed root-owned runtime files
to have mode 0444, one hard link and nonwritable root-owned ancestors, and
checks the *entire* root-owned public three-key
`/etc/ssh/authorized_keys/voidwitness` against reviewed SHA-256
`82cf34c8c2ff28a29103d050f081cff21f9beb0fbad04ec2d6d4de212c49afe4`.
Raw public keys are never returned; private keys are never opened.

At the operator's October 10 read-only census, six installed bytes were
already V3 exact, and only two historical V1 digests remained:

- `dist/economic/buy_void_allocation_reservation_ledger_v1.js`:
  installed historical `af497a5b7f62b08b60e90a527ae3365540fd2a13fcd99f6dd4e8253423869c0f`,
  proposed V3 `97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0`;
- `dist/economic/buy_void_auto_fulfillment_v1.js`:
  installed historical `ae15c56f1aa7009955058ca1d454da5e0d55a3e6c2011c54e7316374e33a5cf6`,
  proposed V3 `119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c`.

The earlier census did **not** freshly hash the packaged archive and did
**not** report a current full three-key authorization-set SHA. The new
observer verifies the eight staged payload SHA-256 values and the public
authorization-set digest, but still reports
`archive_sha256_freshly_measured=false`,
`runtime_service_quiescence_verified=false`,
`transport_identity_attested=false`, `installed_v3_accepted=false`,
`authenticated_custody_principal_verified=false`,
`presale_activation=false` and `funds_moved=false`.

A mixed one-file replacement, missing/writable/symlinked file, noncanonical
parent, unexpected byte, or auth-set drift is a HOLD. Its nine pure policy
self-tests are included in the existing Node22/24/26 inactive bundle workflow,
with exact source Git blob and byte-identical transcript assertions.
No installation operation, sudo option, root file write, service restart,
wallet/signing, customer-ledger access, payment acceptance or fund movement
is implemented. Separate explicit operator authorization, service
quiescence, safe rollback and post-install V3 evidence acceptance are
required before the two root-owned runtime files may change.
