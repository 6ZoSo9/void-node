# Buy VOID V7 protected-substrate trusted root launcher V2

Marker: `VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_V2`.

Status: **source/test/CI only**. V2 is the trusted first-instruction launcher for the landed protected-substrate installer **V5**. It does not install or execute anything on Precision.

## Why V2 exists

V5 now composes the landed direct repository-authority repair with the protected full-history source replica. Its trusted caller contract is materially different from the historical V4 launcher contract, so this is a new immutable launcher/policy namespace rather than an in-place widening of V1.

The first privileged instruction must remain reviewed native code. V2 authenticates the exact Python runtime and exact V5 installer before Python can evaluate installer source.

## Landed V5 binding

Canonical V5 landed in `main@47acc1485ab264a1a33d6a8c70072c2c18ce56e4`.

Exact installer identity:

- Git blob: `632f3371ad3095e6a8fdf338b24c34431abe7d2c`
- bytes: `89416`
- SHA-256: `6a2c7de4fd55b2778cd7eb6c625d3b16cea068f9fbf9beb74adf2a04f433c14b`

Installed qualifier V4 Git blob:

`69b1ff028487a139470671cf0afb8937a299897d`

Launcher V2 source Git blob:

`0aa8d3a990de662b8c3c9928d4c31452d8299ca7`

Launcher V2 proof Git blob:

`1c3503a9fe504559e22cdab9a2d423414be137dc`

These are source identities only. Installed launcher/runtime/source generations require separate host qualification.

## Fixed future host layout

V2 requires:

```text
/opt/void-buy-void-v7-protected-substrate-root-launcher-v2/
  bin/void_buy_void_v7_protected_substrate_root_launcher_v2
  policy-v2.conf

/opt/void-buy-void-v7-python-runtime-v1/
  bin/python3.12-static
  lib/python312.zip

/opt/void-buy-void-v7-installer-source-v2/
  .git/
  ops/precision/void_buy_void_v7_protected_substrate_install_v5.py
  ...
```

The V2 source root is a complete root-custodied checkout snapshot of the accepted landed source generation. V5 directly authenticates its repository HEAD/tree inputs and accepted dependency blobs without trusting a dynamic Git child for privileged acceptance.

Required fixed metadata at launcher entry:

- launcher root and `bin`: root:root `0755`;
- installed launcher ELF: root:root `0555`, one link;
- hermetic Python runtime root, `bin`, and `lib`: root:root `0555`;
- static Python executable: root:root `0555`, one link;
- stdlib zip: root:root `0444`, one link;
- source snapshot root: root:root `0555`;
- policy: root:root `0444`, one link;
- V5 installer file: root:root `0444`, one link.

The Python runtime tree is closed: root contains exactly `bin` and `lib`; `bin` contains exactly `python3.12-static`; `lib` contains exactly `python312.zip`. The Python ELF must be static ELF64 x86-64 `ET_EXEC`, contain `PT_LOAD`, and contain neither `PT_INTERP` nor `PT_DYNAMIC`.

Every trusted path and ancestor is checked for effective writability by UID/GID `1000:1000` after supplementary groups are cleared.

## Kernel content seal

Permission hardening alone is not a content seal. V2 requires SHA-256 Linux fs-verity admission on all privileged files that can influence pre-V5 execution:

- launcher ELF;
- `policy-v2.conf`;
- V5 installer;
- static Python executable;
- stdlib zip.

`FS_IOC_MEASURE_VERITY` must succeed with `FS_VERITY_HASH_ALG_SHA256`. Lack of verity support or missing verity state is HOLD.

Ordinary exact SHA-256 checks still authenticate expected bytes; fs-verity supplies kernel-enforced stable verified reads.

## Root-custodied policy

The future policy is exactly eleven LF-terminated rows:

```text
schema=VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_ROOT_LAUNCHER_POLICY_V2
python_root=/opt/void-buy-void-v7-python-runtime-v1
python_bytes=<decimal>
python_sha256=<64 lowercase hex>
stdlib_zip=/opt/void-buy-void-v7-python-runtime-v1/lib/python312.zip
stdlib_bytes=<decimal>
stdlib_sha256=<64 lowercase hex>
source_root=/opt/void-buy-void-v7-installer-source-v2
installer_rel=ops/precision/void_buy_void_v7_protected_substrate_install_v5.py
installer_bytes=89416
installer_sha256=6a2c7de4fd55b2778cd7eb6c625d3b16cea068f9fbf9beb74adf2a04f433c14b
```

The policy binds executable/runtime/source bytes. It deliberately does **not** contain the operation-specific full-history digest.

## Trusted V5 operation inputs

Both plan and apply require exactly one occurrence of each:

```text
--native <absolute path>
--selector <absolute path>
--expected-head <40 lowercase hex>
--expected-tree <40 lowercase hex>
--expected-full-history-content-sha256 <64 lowercase hex>
```

The full-history content digest must come from separately reviewed trusted evidence for the protected replica installed by the #3659 lane. It must not be discovered from untrusted checkout input by the launcher.

V2 rejects:

- missing HEAD, tree, digest, native, or selector values;
- malformed lowercase-hex lengths;
- duplicate occurrences of any accepted option;
- unknown options;
- plan-only use of apply authority fields.

Apply additionally requires exactly one valid V5 plan ID and exact V5 confirmation:

```text
--expected-plan-id voidv7substrateinstallplan5_<64 lowercase hex>
--confirm INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V5_CREATE_ONLY
```

The V5 plan identity includes expected HEAD, expected tree, and expected full-history content SHA-256, so apply replays the reviewed operation-bound tuple.

## First-exec boundary

Before Python starts, V2 requires:

1. running `/proc/self/exe` to match the fixed launcher inode;
2. root-owned trusted ancestry with no group/world write;
3. exact closed policy;
4. exact V5 installer size and SHA-256;
5. exact closed hermetic Python runtime shape;
6. exact policy-bound static Python size/SHA-256 and static-ELF admission;
7. exact policy-bound stdlib zip size/SHA-256;
8. runtime UID/GID 1000 with empty supplementary groups unable to write every trusted path/ancestor;
9. SHA-256 fs-verity on launcher/policy/installer/Python/stdlib;
10. terminal descriptor/path generation revalidation;
11. strict closed parsing of the V5 HEAD/tree/full-history-digest operation tuple.

Python receives only:

```text
-I -B -S
```

and:

```text
PATH=/usr/bin:/bin
HOME=/nonexistent
LANG=C
LC_ALL=C
TZ=UTC
OPENSSL_CONF=/dev/null
```

No inherited Python, loader, Git, shell, or tool environment is forwarded.

## Source proof

The focused V2 proof:

- binds the exact V2 source and landed V5 installer Git blobs;
- rehashes V5 to its compile-bound SHA-256;
- binds current landed base `47acc1485ab264a1a33d6a8c70072c2c18ce56e4`;
- requires the closed HEAD/tree/full-history-digest parser and forwarding surface;
- requires duplicate-argument rejection markers from the native self-test;
- compiles twice with static gcc and requires byte-identical output;
- directly parses ELF program headers and rejects `PT_INTERP` / `PT_DYNAMIC`;
- requires every fs-verity admission gate;
- preserves false host/economic authority markers;
- rejects write/create/network/ambient-environment/PATH-resolved execution primitives from launcher source.

Hosted CI proves only this source/native construction contract.

## Lifecycle

1. Review the V2 source generation against landed V5.
2. Separately derive/review the exact static Python executable + stdlib zip, closed V2 policy, and root-owned V2 source snapshot from accepted canonical source.
3. Separately create those host generations, enable fs-verity on all five privileged files, and qualify exact bytes/verity/custody.
4. Obtain the trusted protected full-history content SHA-256 from separately reviewed #3659 host evidence.
5. Run V2 in **plan** mode with exact HEAD/tree/full-history digest and review the returned V5 plan ID + installed state.
6. Only under separate protected-host authorization may that exact V5 plan be replayed in **apply** mode.
7. Run installed qualification V4 from its separately reviewed installed-host context.

No source/CI GREEN substitutes for host qualification.

## Authority

This lane does **not** perform or authorize:

- creation/replacement of the V2 root source snapshot;
- launcher, policy, Python runtime, or fs-verity installation;
- protected `/opt` V5 apply;
- service/systemd mutation;
- credential/private-key/wallet access;
- signing;
- RPC/transaction submission;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

PROTECT THE CORE.
