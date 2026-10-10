# Buy VOID Nimo V3 runtime-bundle qualification v3

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V3`

## Purpose

This is a **separate acceptance generation** for the exact eight runtime files
already packaged by the immutable Nimo V3 candidate
`voidwfb3_cec212bbadb4586f7d479c2284e7a2850f47bdc2205a6dccfad5274c8c7ef454`.

It does not edit or reinterpret the historical V1 runtime-bundle qualifier, the
proposed V2 lock, or the V3 candidate record. The candidate record remains
`HOLD_UNACCEPTED_SOURCE_CANDIDATE`; this new contract separately determines
whether those exact bytes satisfy the installation-time runtime-bundle shape.

Frozen identities remain:

- historical V1 qualifier Git blob:
  `d2e84643c9f4d76c642c7e07d4ea2bf1634035e4`;
- proposed V2 lock Git blob:
  `73c7f88348a1d6b208336df8779940657607bd7d`;
- V3 candidate archive:
  `sha256:5063297be5469385113041da31962d465350607dafffe25784e3b4888e7f6900`.

## Exact V3 closure

The qualifier binds all eight absolute installed paths, exact SHA-256 values,
UID/GID 0, mode 0444, one hard link, regular-file/no-symlink identity and a
root-owned non-writable parent chain.

The two bytes that differ from the currently installed frozen V1 bundle are:

- allocation reservation ledger:
  `97a1cb675fec65558aa823b94f049815345fbaed4ac69c9dfae4e1416950cec0`;
- auto fulfillment:
  `119a08db651cb85091f66ed2c9e475c56a81f21c9084c47c7f8ee083f831a47c`.

The other six installed runtime files are unchanged and retain their existing
reviewed digests.

## Evidence collector

`tools/void-buy-allocation-custody-witness-runtime-bundle-evidence-v3.mjs`
is read-only. It performs the same descriptor-bound, no-follow, exact-metadata,
bounded-read and double-census shape as the historical V1 evidence collector,
but invokes only the V3 qualifier and V3 file list.

The collector does not install bytes. A future host installation must still
perform an explicit operator-authorized root write, then run this collector
against the resulting host.

## Historical preservation and negative controls

The focused proof requires the V1 qualifier and V2 lock Git blobs to remain
exact, and also pins the existing V3 candidate, archive-builder and private
stage source blobs. It builds the current runtime and requires every source or
compiled runtime byte to match the V3 file list.

It specifically rejects substitution of the predecessor ledger digest,
predecessor auto-fulfillment digest, candidate manifest ID, archive digest,
ownership/mode/link/symlink metadata, and second-census drift.

Node 22, 24 and 26 independently run the candidate proof, V3 qualifier and V3
evidence collector; their emitted receipts must be byte-identical.

## Authority boundary

Even a GREEN V3 source qualification does **not** mean Nimo is installed.
It does not modify Nimo, SSH, authorized keys, the continuity attestation,
witness storage, services, custody reserve/recover, payment intake, allocation
dispatch, wallets/signers, transactions, WC/VOID launch state, or funds.

The following remain false after source qualification:

`live_nimo_installed=false`,
`external_transport_authenticated=false`,
`verified_payment_to_allocation_mounted=false`,
`custody_reserve_or_recover_enabled=false`,
`production_gate_ready=false`,
`presale_activation=false`, and
`funds_movement=false`.

After merge and exact-main qualification, the next gate is a separately
guarded Nimo installation of the exact V3 bytes followed immediately by this
read-only V3 evidence collector and the existing V2 installation/SSH
qualification chain. Historical proof generations are never repinned.
