# Buy VOID Epoch-2 dormant-binder first-entry launcher materializer V2

Marker:
`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_MATERIALIZER_V2`.

Status: **source/CI artifact publication only**.

## Purpose

Materialize the launcher ELF accepted by V2 lock #3450 as a deterministic
create-only operator artifact.

This gate does not install the launcher under `/opt` and does not execute it.

## Accepted authority

V2 lock:

`voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`

Lock Git blob:

`227c2fa449abf1387925373c706ecd07775d5898`

Canonical candidate merge:

`3a38da1e53ac52374aae4182d24ad4c245dfe504`

Canonical tree:

`4a25e5cb001667920b1b5715679c7cce99bd68fe`

Candidate:

`voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`

Accepted ELF:

- bytes: `731072`;
- SHA-256:
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`;
- Git blob:
  `798907b18c73ee2cc1dea0fe05b36f27ab4137a7`;
- output mode: `0555`;
- static executable;
- no `PT_INTERP`;
- no dynamic `NEEDED`.

Accepted report:

- bytes: `6131`;
- SHA-256:
  `2eafc4dc83d7d59fbd5e1d7a7fa809661c72e3387ae83e7f3badae78780da6ac`;
- Git blob:
  `ec94d8238028a32dbf8a03ac72fc5ce7120607b7`.

## Runtime-head contract

The accepted launcher V2 is repository-HEAD independent at the ELF boundary:

```text
runtime_expected_head_compile_bound=false
runtime_expected_head_strict_lowercase_hex=true
runtime_expected_head_forwarded_unchanged=true
repository_head_not_embedded_in_launcher=true
frozen_child_launcher_path_compatible=true
```

The materializer does not change or reinterpret those claims. It rederives the
exact candidate at the locked canonical merge and rejects any byte drift.

Historical V1 lock remains frozen with install authority false.

## Deterministic rederivation

The materializer:

1. verifies the exact V2 lock blob and authority fields;
2. verifies canonical candidate merge/tree;
3. creates a disposable detached worktree at the canonical merge;
4. verifies the exact V2 candidate proof Git blob;
5. executes that verified candidate source in-memory;
6. calls its reviewed `derive()`;
7. requires exact report bytes/hash/Git blob/candidate ID;
8. requires exact launcher bytes/hash/Git blob and ELF magic;
9. removes the disposable worktree.

It never derives against the newer materializer branch HEAD and calls that
accepted.

## Create-only publication

The output parent must already exist as a real directory.

The materializer:

- opens the output with `O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`;
- writes exact accepted bytes;
- changes mode to `0555`;
- fsyncs the output;
- rereads/hashes the retained output descriptor;
- fsyncs the parent directory;
- verifies the visible name still identifies the created inode.

Replay against an existing output fails with `reason=output_exists`.

A failed materialization does not delete the visible pathname by name.

## Independent proof

The proof binds:

- materializer Git blob
  `611e5d54154e3d3d5d9e7ba6c0374d697ecc3ba7`;
- V2 lock blob
  `227c2fa449abf1387925373c706ecd07775d5898`;
- V2 candidate proof
  `de2f487c625cf96c812cb6d4246d3d036a589e89`;
- launcher V2 source
  `86dc09e52402c04fb6e4b30a7fcf695833808ca3`;
- frozen runtime child
  `f3d6b1559be7490303cf36338c4bfa38fdaa390a`.

It performs two independent materializations and requires byte identity, exact
SHA/Git-blob identity, static ELF properties and replay rejection.

## Authority

This is artifact publication only.

Still false:

```text
protected_install_authorized=false
precision_install_authorized=false
native_or_binder_live_execution_authorized=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

The next gate is a separately versioned V2-compatible protected installer. The
historical V1 installer is not silently repinned to this lock.

**PROTECT THE CORE.**
