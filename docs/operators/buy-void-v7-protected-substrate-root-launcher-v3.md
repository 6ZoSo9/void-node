# Buy VOID V7 protected substrate root launcher V3 — closed-tree source implementation

Status: **source/test/CI implementation candidate only**.

Marker:

`VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V3`.

## Purpose

Launcher V3 is the source implementation authorized by landed closed-tree
acceptance
`voidv7closedtreeaccept1_19ac8c5b09377162ff42048535352a15b5dc75020701c9402c1ebc6ba73fc4b3`.

It preserves launcher V2's static native first-instruction boundary, exact V5
operation argument surface, static Python admission, isolated `-I -B -S`
execution, fixed environment, runtime-UID nonwritability checks and retained
Python descriptor `fexecve`.

V3 changes only the persistent-seal admission model. V2 remains unchanged and
fs-verity-only.

## Closed-tree layout

V3 expects one create-only root:

`/opt/void-buy-void-v7-create-only-closed-tree-v1`

with payload paths exactly:

- `bin/`
- `bin/void_buy_void_v7_protected_substrate_root_launcher_v3`
- `policy-v3.conf`
- `runtime/`
- `runtime/bin/`
- `runtime/bin/python3.12-static`
- `runtime/lib/`
- `runtime/lib/python312.zip`
- `source/`
- `source/ops/`
- `source/ops/precision/`
- `source/ops/precision/void_buy_void_v7_protected_substrate_install_v5.py`

plus bootstrap-created receipt:

`install-receipt-v1.conf`.

All payload directories are exact `root:root 0555`. Consumed executable files
are exact `0555`; policy, stdlib ZIP and V5 source are exact `0444`.

## Receipt-first admission

Before Python execution V3 requires:

- receipt schema `VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_RECEIPT_V1`;
- seal mode `CREATE_ONLY_CLOSED_TREE_V1`;
- exact reviewed plan ID and Git blob;
- canonical bounded manifest/source/bootstrap identities;
- receipt root device/inode equal to the visible closed-tree root;
- exactly the twelve reviewed payload entries and no duplicate or alternate
  path encodings;
- receipt-bound device, inode, mode, nlink, size and SHA-256 for every
  privileged consumed file;
- receipt-bound identities for every consumed directory;
- exact root/subdirectory visible layout;
- terminal receipt/root/directory/file generation revalidation before
  `fexecve`.

The receipt is not treated as a cryptographic kernel seal. The reviewed security
claim is narrower: a root-custodied create-only bootstrap must have built and
published the closed tree while preventing retained unprivileged destination
write authority. Arbitrary malicious root after installation remains outside
this threat model.

## Policy V3

`policy-v3.conf` is itself receipt-bound and has a closed ordered schema
binding:

- schema and seal mode;
- fixed closed-tree root and receipt path;
- exact Python relative path, byte count and SHA-256;
- exact stdlib ZIP relative path, byte count and SHA-256;
- exact landed V5 relative path, byte count and SHA-256;
- exact closed-tree source-acceptance ID.

## V5 operation surface

V3 preserves V2's exact request surface.

Plan requires:

- `--native <absolute path>`
- `--selector <absolute path>`
- `--expected-head <40 lowercase hex>`
- `--expected-tree <40 lowercase hex>`
- `--expected-full-history-content-sha256 <64 lowercase hex>`

Apply additionally requires:

- `--expected-plan-id voidv7substrateinstallplan5_<64 lowercase hex>`
- `--confirm INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V5_CREATE_ONLY`

No extra authority is accepted.

## Source authority boundary

This PR authorizes source review only.

It does **not** accept a production payload manifest, bootstrap candidate,
launcher host generation, root execution, protected filesystem mutation,
launcher installation, V5 apply, service/systemd mutation, credentials,
private keys, signing, transaction/payment, presale/WC activation,
treasury/liquidity action or funds movement.

A future production manifest-lock candidate and host acceptance remain distinct
gates.

PROTECT THE CORE.
