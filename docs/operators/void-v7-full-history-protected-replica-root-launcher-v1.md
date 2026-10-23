# VOID V7 full-history protected-replica root launcher V1

Marker:

`VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_V1`.

Status: **source/test/CI only**. No protected host installation or replica apply is performed by this change.

## Purpose

The landed full-history replica installer

`ops/precision/void_v7_full_history_protected_replica_install_v1.py`

correctly requires a trusted native first-instruction boundary before privileged
`--plan` or `--apply`. Direct privileged Python execution from the ordinary
user-owned checkout is not accepted authority.

This lane adds that missing native launcher source for the replica installer.
It is distinct from the landed Buy VOID V7 substrate launcher V2 because it
binds a different installer, plan namespace, confirmation token, source snapshot
and a smaller request surface.

## Exact installer identity

The launcher compile-binds the landed replica installer:

- Git blob: `a4d5762fe0e1c41b0919b8abb827123e556552ca`
- bytes: `126743`
- SHA-256:
  `794e7ee6a12f59860482fc0c2f99840ee92c374c0a660f13560a498986407f37`

The installer plan namespace is:

`voidv7fullhistoryreplicainstall1_`

Apply confirmation is:

`INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY`.

## Future fixed host namespace

A future separately reviewed install lane may create:

`/opt/void-v7-full-history-protected-replica-root-launcher-v1`

containing exactly:

- `bin/void_v7_full_history_protected_replica_root_launcher_v1`;
- `policy-v1.conf`.

The launcher requires the immutable source snapshot:

`/opt/void-v7-full-history-protected-replica-installer-source-v1`

and exact installer path:

`ops/precision/void_v7_full_history_protected_replica_install_v1.py`.

It reuses the separately reviewed static Python runtime namespace:

`/opt/void-buy-void-v7-python-runtime-v1`

with exact:

- `bin/python3.12-static`;
- `lib/python312.zip`.

No host installation of any of these paths is authorized by this source lane.

## Policy V1

The future root-owned mode-0444 policy is closed and ordered:

```text
schema=VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_ROOT_LAUNCHER_POLICY_V1
python_root=/opt/void-buy-void-v7-python-runtime-v1
python_bytes=<positive canonical decimal>
python_sha256=<64 lowercase hex>
stdlib_zip=/opt/void-buy-void-v7-python-runtime-v1/lib/python312.zip
stdlib_bytes=<positive canonical decimal>
stdlib_sha256=<64 lowercase hex>
source_root=/opt/void-v7-full-history-protected-replica-installer-source-v1
installer_rel=ops/precision/void_v7_full_history_protected_replica_install_v1.py
installer_bytes=126743
installer_sha256=794e7ee6a12f59860482fc0c2f99840ee92c374c0a660f13560a498986407f37
```

Unknown, reordered, duplicate, malformed or extra rows are rejected.

## First-instruction contract

The native launcher:

1. requires real/effective UID 0 for production operation;
2. authenticates its own fixed running inode;
3. requires root-owned, non-group/world-writable path ancestry;
4. requires exact root-owned modes for launcher, policy, Python runtime,
   stdlib ZIP, source snapshot and installer;
5. requires SHA-256 fs-verity measurement for launcher, policy, installer,
   Python and stdlib ZIP;
6. compile-binds the exact installer size and SHA-256;
7. requires the runtime UID/GID `1000:1000` with cleared supplementary
   groups to be unable to write every trusted path or ancestor;
8. requires a static x86-64 Python executable with no `PT_INTERP` or
   `PT_DYNAMIC`;
9. retains authenticated descriptors across validation;
10. executes Python by retained descriptor with `-I -B -S`;
11. supplies only a fixed minimal environment;
12. forwards only the exact replica-installer operation schema.

## Request surface

Plan requires exactly:

- `--plan`;
- `--expected-head <40 lowercase hex>`;
- `--expected-tree <40 lowercase hex>`.

Apply requires exactly:

- `--apply`;
- `--expected-head <40 lowercase hex>`;
- `--expected-tree <40 lowercase hex>`;
- `--expected-plan-id voidv7fullhistoryreplicainstall1_<64 lowercase hex>`;
- `--confirm INSTALL_VOID_V7_FULL_HISTORY_PROTECTED_REPLICA_V1_CREATE_ONLY`.

Duplicate arguments are rejected. V5 substrate-only arguments such as
`--native`, `--selector` and
`--expected-full-history-content-sha256` are not accepted.

## Source proof

The focused proof:

- authenticates this launcher Git blob and the landed replica-installer Git blob;
- rehashes the exact installer bytes;
- compiles the launcher twice with static linking and no build ID;
- requires byte-identical outputs;
- parses ELF64 program headers directly;
- requires x86-64 `ET_EXEC` with at least one `PT_LOAD`;
- rejects `PT_INTERP` and `PT_DYNAMIC`;
- runs the native self-test;
- verifies the exact launcher namespace, request surface and safety markers.

Hosted CI is source/native evidence only. It never executes privileged plan/apply.

## Persistent-seal HOLD

This launcher deliberately retains the same persistent content-seal requirement
as launcher V2. It does not weaken fs-verity to make host progress appear green.

Precision previously observed `FS_IOC_MEASURE_VERITY -> ENOTSUP` on the
relevant `/opt` filesystem. Therefore source acceptance of this launcher is
**not** host-install authority. A separately reviewed fs-verity-capable target
or another equally strong persistent content-seal design is still required
before a trusted installed launcher can exist.

The open static-Python runtime-closure work is also a separate dependency. This
PR does not claim that runtime is installed or qualified.

## Authority boundary

This lane does not:

- install the launcher, policy, source snapshot or Python runtime;
- enable fs-verity;
- run replica-installer `--plan` or `--apply` as root;
- mutate `/opt/void-v7-source-release-full-history-v1`;
- mutate the live shallow runtime release;
- query or mutate services/systemd;
- access credentials, private keys, wallets or signers;
- sign;
- transact or call provider RPC;
- accept payments;
- activate public presale or WC/VOID markets;
- perform treasury/liquidity action;
- move funds.

After source landing, the next action is a separately reviewed host-install and
persistent-seal lane, not direct replica apply.

PROTECT THE CORE.
