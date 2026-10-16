# Buy VOID Epoch-2 dormant-binder installer first-entry materializer V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_MATERIALIZER_V1`.

Status: **source/CI artifact publication only**.

## Purpose

Merged #3389 accepts the exact authenticated dormant-binder installer
first-entry launcher identity, but an acceptance lock is not itself an operator
artifact.

This lane closes only that byte-handoff gap. It deterministically rederives the
accepted static launcher at the exact canonical candidate merge and publishes
one create-only mode-0555 artifact for a later protected installation gate.

It does **not** write under `/opt`, install the launcher on Precision, run the
dormant-binder installer, execute the dormant binder, access credentials, sign,
transact, accept payment, activate presale/WC, or move funds.

## Accepted lock and candidate

Accepted launcher lock:

`voidbuye2dormantfirstentrylock1_bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85`.

Canonical candidate merge:

`9eebcd1bb15ea0b853c3c7cfe0ffd8dd60030a30`.

Canonical candidate tree:

`edff3fcf5b23763c6afe86ba3eb6ba1c92a79bee`.

Accepted candidate ID:

`voidbuye2dormantfirstentrycand1_b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736`.

Accepted launcher ELF:

- bytes: `731072`;
- SHA-256:
  `4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a`;
- Git-blob identity:
  `eb66ce5313a8c0b01639ebec79564111d55163c4`;
- output mode: `0555`;
- static executable;
- no `PT_INTERP`;
- no dynamic `NEEDED`.

Accepted candidate report:

- bytes: `5400`;
- SHA-256:
  `a345e861b81cd19288b71122bd353a1d586d070febfc87933ed8181c0d3abebe`;
- Git blob:
  `3a2fe37452a35621d738713b5e4b51391f5c4400`.

## Exact rederivation boundary

The materializer does not rebuild against its own newer branch HEAD.

It:

1. verifies the merged #3389 lock blob and all acceptance booleans;
2. verifies the canonical candidate merge and tree;
3. creates a disposable detached Git worktree at exactly
   `9eebcd1bb15ea0b853c3c7cfe0ffd8dd60030a30`;
4. descriptor-stably reads the exact candidate proof there and requires Git blob
   `1d15fccf256571c382a09d99c8545d5b24ad2077`;
5. executes that verified source in-memory, never through a mutable import;
6. calls the candidate's reviewed `derive()` at the locked merge generation;
7. requires exact report bytes/hash/Git-blob/candidate ID/tree;
8. requires exact launcher bytes/hash/Git-blob and ELF magic;
9. removes the disposable worktree after derivation.

This preserves the compile-bound expected HEAD carried by the accepted launcher.
A newer main or materializer branch cannot silently produce a new launcher
generation and call it accepted.

## Create-only artifact publication

The requested output parent must already exist as a real directory.

The materializer:

1. retains the parent directory descriptor;
2. creates the final leaf once with
   `O_CREAT|O_EXCL|O_NOFOLLOW|O_CLOEXEC`;
3. writes the exact accepted launcher bytes;
4. changes mode to `0555`;
5. fsyncs the file;
6. rereads and hashes the bytes through the retained output descriptor;
7. fsyncs the parent directory;
8. requires the visible output name to still identify the exact created inode.

A duplicate target fails with `reason=output_exists`.

If materialization fails after create-only open, the materializer does **not**
unlink the visible pathname by name. Preserving a partial failed output is safer
than deleting a same-UID replacement inode. A retry therefore uses a fresh
destination after explicit operator inspection/removal.

## Hosted proof

The focused proof:

- binds the exact materializer, lock, candidate, launcher-source and protected-
  installer source Git blobs;
- runs the materializer inert self-test;
- performs two independent materializations and requires byte identity;
- requires exact accepted bytes and SHA-256;
- requires no `PT_INTERP` or dynamic `NEEDED`;
- proves a replay cannot overwrite the first output;
- proves the materializer contains no destructive output cleanup path.

Hosted CI publishes:

- `void_buy_void_epoch2_dormant_binder_installer_first_entry_v1`;
- `SHA256SUMS_epoch2_dormant_binder_first_entry_v1.txt`;
- the accepted #3389 lock JSON;
- the materializer receipt.

Artifact retention is convenience only. A later protected installer must
independently verify the candidate lock and launcher bytes before publication.

## Authority boundary

Still false:

```text
protected_install_authorized=false
precision_install_authorized=false
native_or_binder_live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
production_host_evidence_authority=false
funds_movement=false
```

No `/opt` write, service/systemd action, credential/key access, signing,
transaction/RPC, payment acceptance, presale/WC activation, treasury/liquidity
action, or funds movement occurs in this lane.

Next gate after source/CI acceptance:

`void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1`.

**PROTECT THE CORE.**
