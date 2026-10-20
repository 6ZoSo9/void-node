# Buy VOID V7 protected-substrate trusted root launcher V1

Marker: `VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V1`.

Status: **source/test/CI only**. This contract closes the privileged Python-start boundary that the landed V4 installer deliberately leaves outside its own in-script guard. It does not install or execute anything on Precision.

## Why this launcher exists

The landed V4 installer requires isolated Python and performs strong privileged-source, Git-metadata, runtime-UID nonwritability, candidate-byte and create-only publication checks. Those checks begin only after Python has started.

A privileged invocation from the ordinary user-owned checkout is therefore not an accepted authority boundary. The first privileged instruction must itself be reviewed and root-custodied, and it must authenticate the Python generation and the exact installer source before Python can evaluate the installer.

V1 uses a **static native x86-64 ELF** as that first instruction.

## Reviewed source binding

The launcher is source-bound to the landed V4 installer generation:

- installer Git blob: `6e187a9a6e782df13ecd423fc80c82b759a8f6db`;
- installer bytes: `87048`;
- installer SHA-256: `72bdf7325fd2b3f373ad3fd41e706d9961d293cf11178d06b72ab41ddc9f8cfc`.

The launcher source Git blob is:

`825ebd9ddda4f47f43dba8f016260d5e7a9bfad0`.

The source proof Git blob is:

`3648487036da713551ef4ec19248cc09a38ff84e`.

These are source identities only. A later installed launcher must be separately bound to its compiled ELF identity.

## Fixed future host layout

V1 requires these exact future paths:

```text
/opt/void-buy-void-v7-protected-substrate-root-launcher-v1/
  bin/void_buy_void_v7_protected_substrate_root_launcher_v1
  policy-v1.conf

/opt/void-buy-void-v7-installer-source-v1/
  .git/
  ops/precision/void_buy_void_v7_protected_substrate_install_v4.py
  ...
```

The source root is a **complete Git checkout snapshot**, not a copied standalone Python file. The inner V4 installer itself requires an exact real `.git` directory, closed Git configuration/object-store semantics, clean `main`, exact expected HEAD, and its accepted dependency blobs.

Required fixed metadata at launcher entry:

- launcher root and `bin`: root:root `0755`;
- installed launcher ELF: root:root `0555`, one link;
- source snapshot root: root:root `0555`;
- policy: root:root `0444`, one link;
- installer file in the snapshot: root:root `0444`, one link.

Every trusted path and every ancestor is additionally checked for effective writability by runtime UID/GID `1000:1000` after clearing supplementary groups. Mode bits alone are not treated as sufficient ACL evidence.

## Host policy

The future root-custodied policy is a closed eight-row LF-terminated file:

```text
schema=VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_POLICY_V1
python_path=/usr/bin/python3.<minor>
python_bytes=<decimal>
python_sha256=<64 lowercase hex>
source_root=/opt/void-buy-void-v7-installer-source-v1
installer_rel=ops/precision/void_buy_void_v7_protected_substrate_install_v4.py
installer_bytes=87048
installer_sha256=72bdf7325fd2b3f373ad3fd41e706d9961d293cf11178d06b72ab41ddc9f8cfc
```

The Python path must be its canonical real path under `/usr/bin/python3.<minor>`. The launcher retains a no-follow/nonblocking descriptor for that exact executable, hashes the retained descriptor, revalidates descriptor/path generation, and executes **that descriptor** with `fexecve`.

## First-exec boundary

Before Python starts, the native launcher requires:

1. its running `/proc/self/exe` generation to equal the fixed installed launcher inode;
2. root-owned, non-group/world-writable trusted ancestry;
3. exact policy and installer file generations;
4. exact installer SHA-256;
5. canonical Python path, size and SHA-256 from the policy;
6. runtime UID/GID 1000 with empty supplementary groups to be unable to write every trusted path or ancestor;
7. terminal descriptor/path generation revalidation.

Python receives only:

```text
-I -B -S
```

and this explicit environment:

```text
PATH=/usr/bin:/bin
HOME=/nonexistent
LANG=C
LC_ALL=C
TZ=UTC
```

No inherited Python, loader, Git, shell, or tool environment is forwarded.

## Operation contract

Plan mode forwards only:

```text
--plan
--native <absolute path>
--selector <absolute path>
--expected-head <40 lowercase hex>
```

Apply mode additionally requires the V4 operation-bound plan ID and the exact V4 confirmation:

```text
--expected-plan-id voidv7substrateinstallplan4_<64 lowercase hex>
--confirm INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V4_CREATE_ONLY
```

The launcher does not weaken candidate handling. V4 still opens the native and selector candidates no-follow/nonblocking, requires their accepted exact sizes/SHA-256 values, retains the bytes in memory, and derives the operation-bound plan before any publication.

## Source proof

The focused proof:

- binds the exact launcher and landed-installer Git blobs;
- rehashes the landed installer to the compile-bound SHA-256;
- compiles the launcher twice with `gcc -static` and requires byte-identical output;
- parses the ELF64 program headers directly;
- requires x86-64 `ET_EXEC`, at least one `PT_LOAD`, and **no** `PT_INTERP` or `PT_DYNAMIC`;
- runs the launcher `--self-test`;
- rejects source use of write/create filesystem primitives, network primitives, ambient environment reads, or PATH-resolved execution.

Hosted CI proves only the source/native construction contract. It does not prove the future installed host generations.

## Lifecycle

1. Review and land this source generation.
2. Separately derive the exact Precision Python host policy and a content-addressed root-owned full source snapshot from canonical landed `main`.
3. Separately install/qualify the static launcher + policy + source snapshot.
4. Run the launcher in **plan** mode and review the exact V4 `plan_id` and installed state.
5. Only under separate protected-host authorization may the exact reviewed plan be replayed in `--apply` mode with the explicit V4 confirmation.
6. Run installed qualification V3 only through its separately reviewed exact-landed-source launch context.

No earlier source/CI GREEN substitutes for these host gates.

## Authority

This source lane does **not** perform or authorize:

- creation or replacement of the root source snapshot;
- installation of the launcher or policy;
- protected `/opt` V4 apply;
- service/systemd mutation;
- credential/private-key/wallet access;
- signing;
- RPC or transaction submission;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

PROTECT THE CORE.
