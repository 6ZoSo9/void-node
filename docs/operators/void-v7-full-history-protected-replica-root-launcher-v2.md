# VOID V7 full-history protected-replica root launcher V2 — closed-tree source

Status: **source/test/CI only**. This change does not install a launcher, execute
as root on Precision, mutate `/opt`, or run the protected replica installer.

## Purpose

Replica launcher V1 is intentionally fs-verity-only. Precision previously
observed `FS_IOC_MEASURE_VERITY -> ENOTSUP` on the relevant `/opt`
filesystem, so V1 cannot become a trusted installed launcher there.

The landed create-only persistent-seal plan and closed-tree source acceptance
define an alternative seal mode:

`CREATE_ONLY_CLOSED_TREE_V1`.

Launcher V2 applies that already-reviewed admission model to the full-history
protected-replica installer. It preserves V1's operation authority and narrows
its request surface to the replica installer's actual arguments.

## Bound dependencies

- full-history replica installer:
  `ops/precision/void_v7_full_history_protected_replica_install_v1.py`
  - Git blob `a4d5762fe0e1c41b0919b8abb827123e556552ca`
  - bytes `126743`
  - SHA-256
    `794e7ee6a12f59860482fc0c2f99840ee92c374c0a660f13560a498986407f37`
- persistent-seal plan blob:
  `9dde5523dca6ab240626430ce1c2b82f1cfe7f20`
- closed-tree source acceptance blob:
  `919db72903a5fcff59dec7635a4288f41d1753d9`
- closed-tree bootstrap source blob:
  `2a8397c85d698d168f2257ec801557281b73c04d`
- bootstrap proof blob:
  `2bec40bb30b26f229e5a9a290ce262cd40e344c5`
- predecessor replica launcher V1 blob:
  `5dbfbb6af8451d55967e367f09f8896d72d30807`.

## Closed-tree namespace

A future separately reviewed production manifest/bootstrap lane may create:

`/opt/void-v7-full-history-protected-replica-closed-tree-v1`

with the receipt-bound layout:

- `bin/void_v7_full_history_protected_replica_root_launcher_v2`;
- `policy-v2.conf`;
- `install-receipt-v1.conf`;
- `runtime/bin/python3.12-static`;
- `runtime/lib/python312.zip`;
- complete `source/` snapshot containing the replica installer and the minimal
  Git metadata required by the installer.

The launcher requires the same receipt schema and seal mode as the landed
closed-tree contract. It rebinds the root, required directories, launcher,
policy, Python, stdlib, installer and minimal Git authority files to the
receipt's inode/hash/mode/link-count records before Python execution.

## Request surface

Plan accepts exactly one each:

- `--expected-head <40 lowercase hex>`;
- `--expected-tree <40 lowercase hex>`.

Apply additionally requires exactly one each:

- `--expected-plan-id voidv7fullhistoryreplicainstall1_<64 lowercase hex>`;
- `--confirm INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY`.

V5-only arguments are forbidden:

- `--native`;
- `--selector`;
- `--expected-full-history-content-sha256`.

The launcher invokes the retained static Python descriptor with
`-I -B -S` and a minimal fixed environment.

## Persistent-seal model

V2 contains no fs-verity dependency. Instead it consumes the reviewed
`CREATE_ONLY_CLOSED_TREE_V1` receipt contract. This does **not** make the
current source lane a production launcher.

The production manifest lock remains external to the launcher to avoid a
launcher/bootstrap manifest self-hash cycle. A later source lane must bind the
complete V2 launcher/runtime/source payload and exact bootstrap generation into
a production manifest candidate, followed by separate acceptance and host
installation gates.

The security claim remains bounded: the closed-tree design targets same-UID and
unprivileged retained-handle/path races during construction and consumption. It
does not claim resistance to arbitrary malicious root mutation after
installation.

## Authority boundary

This lane does not authorize:

- production payload-manifest acceptance;
- bootstrap candidate acceptance;
- launcher installation;
- root execution;
- protected replica installation;
- live shallow release mutation;
- V5 protected substrate installation;
- service/systemd mutation;
- credential/private-key/signer access;
- transaction/RPC/payment acceptance;
- public presale or WC activation;
- treasury/liquidity action;
- funds movement.

Next source action after this launcher is reviewed is a dedicated production
manifest-lock candidate for this replica closed-tree generation.

PROTECT THE CORE.
