# Buy VOID custody launch evidence — descriptor-bound read-only source candidate

## Purpose and exact ancestry

This separate Draft is stacked on [custody launch authority V2 #2681](https://github.com/6ZoSo9/void-node/pull/2681),
which is itself stacked on current integration [#2675](https://github.com/6ZoSo9/void-node/pull/2675).
The classifier already verifies a dual-signed coupled-launch activation receipt,
shared generation journal and custody-private high-water, but it explicitly
rejects caller-supplied evidence bytes as production authority. This reader
adds a **source-only Linux descriptor-bound observation primitive** for future
independently reviewed privileged service integration.

It does not import or invoke the V2 classifier, does not read deployed evidence,
and does not configure the custody-service socket, UID, ledger or writers.

The original reviewed upstream Git blobs remain pinned by the synthetic proof:
- V2 classifier: `223ebdb8317009228094b8ebecef19dc37d87a91`.
- Shared coupled-launch gate: `e0402744ae51bb7bda2dc1e2038aae217d868ed9`.

## Explicit source input names and trust

The journal is read under
`<shared_data_dir>/economic/buy-void-coupled-live-generation-v1.jsonl`,
matching the current coupled-launch generation journal producer.
The signed activation receipt is deliberately supplied as a **separate absolute
path**, because its reviewed runtime source binds it through
`VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH`; this proof invents no
deployed receipt directory. The custody-private high-water is also a separate
absolute path: V2 has no approved deployed writer or filename yet.

**All three paths are test inputs in this prototype.** Merely supplying them
does NOT authorize the server policy, prove the original source gate is ready,
establish the reader's cross-UID permissions, or qualify reserve/recover.
A future custody-owned service must independently select and pin these paths.
The reader rejects missing high-water (bootstrap HOLD), shared-data-root
high-water, a duplicated receipt/high-water path, noncanonical absolute paths,
symlink files/directories, and custody high-water parent/file not owned by the
current service UID with group/other permissions absent.

## Linux fd/path boundary

The reader traverses the **entire absolute directory path** component by
component from a held `/` directory descriptor using
`O_DIRECTORY | O_NOFOLLOW` with
`/proc/self/fd/<parent_fd>/<next_component>`. It opens each evidence leaf
relative to its last retained parent descriptor with `O_NOFOLLOW`, reads at
most its preflight byte length + one sentinel, and checks initial/after leaf
and ancestor inode/size/mode/timestamp identities against the visible path.
Bounded limits mirror the V2 classifier: journal 64 KiB, receipt 64 KiB,
high-water 16 KiB.

A disposable test uses synthetic bytes only. It requires a clean three-file
read, a missing custody high-water HOLD, inappropriate permissions HOLD,
noncanonical/root-swapped input HOLD, symlink leaf HOLD, parent-directory
swap before fd open HOLD, ancestor swap while reading HOLD, and concurrent
3 MiB growth with exactly pre-size+one-byte consumption. It repeats the
positive read after restoring only the test fixture. Tests run on independent
Linux Node 22, 24 and 26; byte-identical receipts are required.

This does NOT establish atomicity across the three separately opened files,
Linux mount namespace/procfs production assumptions, durable high-water
publication, original payment evidence, committed request chronology,
provider finality or a service-side principal/capability boundary.

## Absolute authority restrictions

Both source and positive test results explicitly report:

```text
server_path_configuration_verified=false
source_gate_verified=false
receipt_signature_verified=false
cross_uid_permissions_qualified=false
cross_file_atomic_snapshot_verified=false
custody_high_water_write_performed=false
custody_reserve_method_enabled=false
custody_recover_method_enabled=false
production_allocation_mutation_ready=false
funds_movement=false
```

Source policy additionally keeps `service_mounted=false`.
A caller can mutate returned Buffer copies; that remains untrusted input
and must not be promoted to custody authority without independently verified,
server-owned root selection and actor identity. This branch is **not a
production-capable reader or an allocation reservation recovery writer**.

Later stages must implement crash-consistent high-water advance, guarded
reserve/recover with protected original-request/payment provenance, strict
capacity/duplicate serialization and a reviewed server-only IPC channel.
A green source-only test here does not make the presale or WC/VOID market
eligible to open.

No merge, Ready, deployed host/service, permissions/UID/socket changes,
customer/payment/ledger files, wallets, keys, signer, transactions,
Chain-2050/WC, presale/market, inventory/treasury/liquidity or funds action.

**PROTECT THE CORE.**
