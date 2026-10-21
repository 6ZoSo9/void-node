# Buy VOID V7 protected-substrate trusted root launcher V1

Marker: `VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V1`.

Status: **source/test/CI only**. This contract closes the privileged Python-start boundary that the landed V4 installer deliberately leaves outside its own in-script guard. It does not install or execute anything on Precision.

## Why this launcher exists

The landed V4 installer requires isolated Python and performs strong privileged-source, Git-metadata, runtime-UID nonwritability, candidate-byte and create-only publication checks. Those checks begin only after Python has started.

A privileged invocation from the ordinary user-owned checkout is therefore not an accepted authority boundary. The first privileged instruction must itself be reviewed and root-custodied, and it must authenticate the Python generation and the exact installer source before Python can evaluate the installer.

V1 uses a **static native x86-64 ELF** as that first instruction.

## Reviewed source binding

The launcher is source-bound to the reviewed direct-runtime-drop V4 installer generation from #3650. This source dependency removes the root-time dynamic `/usr/bin/setpriv` execution path before the launcher generation is eligible to advance:

- installer Git blob: `94112afa2f805e0a6ce881a490c1c64e31e0413e`;
- installer bytes: `87744`;
- installer SHA-256: `2e6ac01e770b3f8859d2c741647e4bd9650ed263756c5821f8371e93ad4c32fc`.

The launcher source Git blob is:

`6ecd7fef155967d35d4500b07da841c4e578c6de`.

The source proof Git blob is:

`7e5a0d029847ae36b8359c926dab3c8b9a8c482e`.

These are source identities only. A later installed launcher must be separately bound to its compiled ELF identity.

## Fixed future host layout

V1 requires these exact future paths:

```text
/opt/void-buy-void-v7-protected-substrate-root-launcher-v1/
  bin/void_buy_void_v7_protected_substrate_root_launcher_v1
  policy-v1.conf

/opt/void-buy-void-v7-python-runtime-v1/
  bin/python3.12-static
  lib/python312.zip

/opt/void-buy-void-v7-installer-source-v1/
  .git/
  ops/precision/void_buy_void_v7_protected_substrate_install_v4.py
  ...
```

The source root is a **complete Git checkout snapshot**, not a copied standalone Python file. The inner V4 installer itself requires an exact real `.git` directory, closed Git configuration/object-store semantics, clean `main`, exact expected HEAD, and its accepted dependency blobs.

Required fixed metadata at launcher entry:

- launcher root and `bin`: root:root `0755`;
- installed launcher ELF: root:root `0555`, one link;
- hermetic Python runtime root, `bin`, and `lib`: root:root `0555`;
- static Python executable: root:root `0555`, one link;
- stdlib zip: root:root `0444`, one link;
- source snapshot root: root:root `0555`;
- policy: root:root `0444`, one link;
- installer file in the snapshot: root:root `0444`, one link.

The Python runtime directories are closed: the runtime root contains exactly `bin` and `lib`, `bin` contains exactly `python3.12-static`, and `lib` contains exactly `python312.zip`. The launcher rejects a Python ELF with `PT_INTERP` or `PT_DYNAMIC`, so the accepted interpreter cannot fall back to a host dynamic-loader/shared-library closure.

Every trusted path and every ancestor is additionally checked for effective writability by runtime UID/GID `1000:1000` after clearing supplementary groups. Mode bits alone are not treated as sufficient ACL evidence.

That ACL test is **not** treated as a content seal. A writable file descriptor or writable mmap opened before a later chmod/chown can survive metadata hardening. Therefore every privileged file that can affect pre-V4 execution must already have Linux **fs-verity** enabled before the launcher will trust it:

- the installed launcher ELF;
- `policy-v1.conf`;
- the V4 installer file inside the source snapshot;
- `bin/python3.12-static`;
- `lib/python312.zip`.

The launcher requires `FS_IOC_MEASURE_VERITY` to succeed with the SHA-256 fs-verity algorithm on each retained descriptor. The ordinary full-file SHA-256 checks still authenticate the expected bytes; fs-verity supplies the kernel-enforced no-write/stable-read property that metadata checks alone cannot provide. A host filesystem without fs-verity support is a **HOLD**, not permission to fall back to chmod/chown-only custody.

## Host policy

The future root-custodied policy is a closed eleven-row LF-terminated file:

```text
schema=VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_POLICY_V1
python_root=/opt/void-buy-void-v7-python-runtime-v1
python_bytes=<decimal>
python_sha256=<64 lowercase hex>
stdlib_zip=/opt/void-buy-void-v7-python-runtime-v1/lib/python312.zip
stdlib_bytes=<decimal>
stdlib_sha256=<64 lowercase hex>
source_root=/opt/void-buy-void-v7-installer-source-v1
installer_rel=ops/precision/void_buy_void_v7_protected_substrate_install_v4.py
installer_bytes=87744
installer_sha256=2e6ac01e770b3f8859d2c741647e4bd9650ed263756c5821f8371e93ad4c32fc
```

The policy does not admit an arbitrary host interpreter tree. The launcher opens the fixed `bin/python3.12-static` and `lib/python312.zip` leaves no-follow/nonblocking, verifies exact size + SHA-256 from the root-custodied policy, revalidates descriptor/path generation, and requires the Python executable itself to be static ELF64 x86-64 `ET_EXEC` with `PT_LOAD` and with no `PT_INTERP` or `PT_DYNAMIC`.

The later host-policy/runtime installation lane must therefore accept one exact static Python executable and one exact stdlib zip as a closed runtime generation. This source PR defines that boundary but does not install or accept those future host bytes.

## First-exec boundary

Before Python starts, the native launcher requires:

1. its running `/proc/self/exe` generation to equal the fixed installed launcher inode;
2. root-owned, non-group/world-writable trusted ancestry;
3. exact policy and installer file generations;
4. exact installer SHA-256;
5. the closed hermetic Python directory shape;
6. exact policy-bound static Python size + SHA-256 and static-ELF admission;
7. exact policy-bound stdlib-zip size + SHA-256;
8. runtime UID/GID 1000 with empty supplementary groups to be unable to write every trusted runtime/source/launcher path or ancestor;
9. SHA-256 fs-verity admission on launcher self, policy, installer, static Python, and stdlib zip;
10. terminal descriptor/path generation revalidation before `fexecve`.

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
OPENSSL_CONF=/dev/null
```

No inherited Python, loader, Git, shell, or tool environment is forwarded. The contract deliberately excludes the host `/usr/lib/python3.<minor>` import tree that triggered the independent P1 finding.

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
- requires source bindings for `FS_IOC_MEASURE_VERITY`, SHA-256 fs-verity algorithm admission, and all five privileged-file verity gates;
- requires the self-test to bind static-Python, exact stdlib-zip, closed runtime-tree, retained-descriptor exec, kernel content sealing, and false host/economic authority markers;
- rejects source use of write/create filesystem primitives, network primitives, ambient environment reads, or PATH-resolved execution.

Hosted CI proves only the source/native construction contract. It does not prove the future installed host generations.

## Lifecycle

1. Review and land this source generation.
2. Separately derive and review one exact static Python executable + stdlib zip, the corresponding host policy, and a content-addressed root-owned full source snapshot from canonical landed `main`.
3. Separately install those files as fresh root-custodied generations, enable fs-verity on launcher/policy/installer/Python/stdlib, and qualify the verity state plus exact bytes. Enabling or measuring verity failure is HOLD.
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
