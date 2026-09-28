# Precision Epoch-2 signed-artifact metadata census wrapper v1

Marker: `VOID_PRECISION_EPOCH2_SIGNED_ARTIFACT_METADATA_CENSUS_V1`

This wrapper narrows the existing metadata-only signed-artifact census to
operator-owned VOID artifacts immediately below `~/Downloads`.

It does not recursively scan the whole home directory or treat the whole
Downloads directory as an approved root. It selects only:

- direct child directories whose basenames begin with a VOID-owned prefix; and
- direct regular files whose basenames begin with `void` or `.void`.

Selected directories are passed to the canonical census tool as explicit roots;
selected files are passed individually as explicit files.

Because the canonical census intentionally accepts at most 16 roots and 256
explicit files per invocation, the Precision wrapper deterministically batches
larger approved top-level scopes. Root batches contain at most 16 directories;
explicit-file batches contain at most 256 files. Each batch produces its own
private create-once mode-`0600` receipt. The wrapper then verifies all receipts,
rejects duplicate discovered paths across batches, and prints aggregate counts,
candidate basenames, receipt paths, and receipt SHA-256 values.

The wrapper itself remains bounded to at most 1,024 approved roots and 1,024
approved explicit files. Exceeding those totals fails closed instead of silently
skipping scope.

The underlying census records metadata only and never reads candidate file
contents. The resulting receipt is private, create-once, mode `0600`, and
remains an operator-review artifact rather than public evidence.

The wrapper deliberately does not promote any replay gate. A green result still
reports:

- `pending_legacy_signed_transaction_census_complete=false`;
- `privileged_signer_nonce_or_key_replay_fence_proven=false`;
- `cross_epoch_replay_protection_proven=false`.

After the private receipt is reviewed, individually approved raw signed
transaction artifacts may be passed to the existing exact raw-transaction
inspector. Credential, wallet, mnemonic, keystore, and private-key files must
not be supplied for raw-transaction inspection.

Authority remains read-only metadata discovery plus one private local receipt.
There is no service action, credential-content read, wallet/key use, signing,
broadcast, Chain-2050 write, token/funds movement, migration, or activation.
