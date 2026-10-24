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

`/opt/void-buy-void-v7-create-only-closed-tree-v1`.

The root surface remains fixed:

- `bin/`
- `policy-v3.conf`
- `runtime/`
- `source/`
- bootstrap-created `install-receipt-v1.conf`.

`bin/` contains only the V3 launcher. `runtime/` contains only the static
Python executable and stdlib ZIP at their fixed paths.

`source/` is different: it is a **complete manifest-locked repository
snapshot** for V5, not a single installer leaf. The production manifest must
carry the entire reviewed worktree at the exact expected tree plus a minimal
closed `.git` authority containing exactly:

- `.git/HEAD`;
- `.git/config`;
- `.git/objects/` and `.git/objects/info/`;
- `.git/info/`;
- `.git/refs/`, `.git/refs/heads/`, and
  `.git/refs/heads/main`.

No other `.git` payload path is admitted by V3. In particular, object packs,
tags, logs, shallow metadata, commondir/config.worktree indirection, grafts and
alternates are outside the launcher snapshot contract.


No Git object history is required by this launcher snapshot. V5 recomputes the
worktree tree OID directly, authenticates the main ref and closed config, and
then authenticates its pinned sibling dependency files.

All payload directories are exact `root:root 0555`. Payload files are exact
`0444` or `0555` as declared by the reviewed manifest.

The closed-tree bootstrap supports regular files and directories only. The
production manifest-lock candidate must therefore independently prove that its
reviewed source tree contains no tracked symlink before it can be proposed. The
source tree at the #3693 acceptance base was independently observed with 12,008
Git-tree entries and zero mode-`120000` symlinks; that observation is not
future manifest authority and must be rechecked at the exact candidate head.

## Receipt-first admission

Before Python execution V3 requires a bounded receipt of at most 250,000
manifest payload entries and 128 MiB, with canonical strictly sorted paths.
The receipt may contain the complete `source/` snapshot, while the fixed
launcher/runtime and minimal Git authority paths remain mandatory.

V3 requires:


- receipt schema `VOID_BUY_VOID_V7_CREATE_ONLY_CLOSED_TREE_RECEIPT_V1`;
- seal mode `CREATE_ONLY_CLOSED_TREE_V1`;
- exact reviewed plan ID and Git blob;
- canonical bounded manifest/source/bootstrap identities;
- receipt root device/inode equal to the visible closed-tree root;
- every receipt entry to remain within `bin/`, `runtime/`, `source/`, or the fixed policy path;
- all mandatory launcher/runtime/minimal-Git/V5 paths with exact kind and mode;
- an exact minimal `.git` receipt layout with no additional Git metadata paths;
- no duplicate, reordered, self-receipt, or alternate path encodings;
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

## Manifest lock remains external to launcher

V3 deliberately does **not** compile-bind the production manifest SHA,
bootstrap SHA or source-generation SHA.

Embedding those values in V3 would create a self-hash cycle: the launcher
binary is itself a payload entry in the production manifest, while its bytes
would then depend on that manifest's hash.

The landed acceptance instead authorizes a **bootstrap source revision** for
the production manifest lock. The bootstrap executable is outside the final
closed-tree payload, so it can safely compile-bind the complete manifest
SHA/bytes and source generation, build fresh payload inodes, and record its own
binary SHA in the durable receipt without a cycle.

V3 then validates the receipt/tree produced by that separately accepted
bootstrap under the reviewed threat model. The receipt's manifest/source/
bootstrap identity fields are schema-validated and preserved as evidence, but
they are not launcher compile-time authority.

Production manifest acceptance, bootstrap candidate acceptance, launcher host
acceptance and root execution authorization remain separate future gates.

## Complete V5 source composition

The future production manifest must build `source/` so that V5 can satisfy
`require_git_metadata_provenance(ROOT)` and
`require_worktree_matches_tree(ROOT, expected_tree)`. A payload that contains
only `void_buy_void_v7_protected_substrate_install_v5.py` is invalid and will
HOLD.

V3 receipt-binds the minimal Git metadata files and V5 installer before exec.
V5 remains the final authority for the complete source worktree and its pinned
lock/materializer/predecessor/qualifier dependencies.

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
