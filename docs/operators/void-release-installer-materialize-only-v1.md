# VOID Release Installer Materialize-Only V1

## Purpose

`--materialize-only` separates verified release materialization from release activation. It is the source prerequisite for #1607 Stage-B2: a later crash-recoverable apply transaction can start from an already verified, fsync-durable `releases/<version>` tree instead of asking the current installers to publish `current` / `previous` before an operation journal exists.

Both the standard and portable installers keep their existing archive, checksum, manifest, path-safety, and (when requested) attestation admission. The portable path also keeps its bundled Node runtime byte/version validation.

## Contract

For `install` or `update` with `--materialize-only`, the installer may:

- use its private temporary download/extraction directory;
- create `INSTALL_ROOT/releases` when absent;
- create exactly the verified `INSTALL_ROOT/releases/<version>` candidate when absent; or
- reuse that candidate only after the existing tree exactly matches the newly verified extraction by repository-relative path, entry kind, file bytes, file/directory mode, and symlink target.

Before success, every regular file in the materialized candidate is fsynced, candidate directories are fsynced bottom-up, and the `releases/` parent directory is fsynced. A successful result therefore reports `materialized_release_durable=true`.

## Explicit non-mutations

Materialize-only exits before:

- `current` or `previous` staging/publication;
- stable manager or control-updater publication;
- user command symlink publication;
- config/state creation;
- systemd unit publication or daemon reload;
- service enable/start/restart;
- release-retention pruning; or
- any guarded-lane, wallet, signer, validator, Work Credit, transaction, treasury, liquidity, or funds action.

`--materialize-only` is incompatible with `--enable` and `--start`. It also does not support `uninstall` or `self-test` as a materialize operation.

## Existing candidate rule

Internal `RELEASE-CONTENTS-SHA256` verification alone is not sufficient for idempotent reuse because it does not prove directory shape, executable modes, or unlisted symlink/extra-file state. Materialize-only therefore compares the complete existing candidate tree against the freshly verified extraction and HOLDs on any mismatch.

## Focused proof

```bash
node scripts/prove_void_release_installer_materialize_only_v1.mjs
```

The hermetic proof exercises both installers and verifies:

- first materialization succeeds and reports durability;
- exact `update --materialize-only` retry succeeds;
- executable-mode drift is rejected;
- symlink-target drift is rejected;
- an unexpected extra path is rejected;
- `--enable` is rejected before mutation;
- pre-existing `current` / `previous` pointers stay byte-identical;
- older release trees survive even with `VOID_NODE_KEEP_RELEASES=1`, proving pruning did not execute; and
- external bin/config/state/systemd sentinel trees remain unchanged.

## Stage-B2 boundary

This change deliberately does **not** implement the update-apply transaction. It does not bind old-current/old-previous/candidate into an apply intent, publish pointers, own restart/health, restore the exact old pair on rejection, terminalize accepted/restored/HOLD, or prune after terminalization. Those remain the next #1607 layer after this prerequisite is merged.

Source proof is not deployment or runtime evidence.
