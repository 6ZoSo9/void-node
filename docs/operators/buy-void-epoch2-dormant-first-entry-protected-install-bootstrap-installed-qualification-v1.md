# Buy VOID Epoch-2 dormant first-entry protected-bootstrap installed qualification V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V1`.

Status: **source/test/CI-only read-only qualification contract**.

## Purpose

Qualify the exact installed protected bootstrap generation before that bootstrap
may be used as a privileged first instruction.

The qualification is bound to the merged create-only installer source Git blob:

`df3c27c57e0d413c7487189f1ddf6c141004d67c`.

It reuses that installer's accepted lock, exact root layout, exact accepted
bootstrap ELF identity and exact root-Python policy derivation.

## Required installed root

The future host run requires the installer to report:

`PROTECTED_BOOTSTRAP_ROOT_GREEN`.

The protected namespace must be exactly:

```text
/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1/
  bin/
    void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1
  policy-v1.conf
```

It requires:

- root and `bin/`: `root:root 0755`;
- bootstrap ELF: `root:root 0555`, one link, 731072 bytes,
  SHA-256
  `1b570f704841f8b833707de2c85ca66d2a344f3a77b5d1979ab29eaae2ec1189`;
- policy: `root:root 0444`, exact bytes derived from the stable
  root-owned `/usr/bin/python3` generation.

## Read-only host run

A future separately authorized root run:

1. verifies exact clean checkout `--expected-head`, accepted bootstrap lock,
   Git generation, Python generation, installed root and policy;
2. snapshots the full installed generation;
3. opens the installed bootstrap with `O_NOFOLLOW` and retains the descriptor;
4. hashes the retained descriptor and executes only
   `/proc/self/fd/<fd> --self-test`;
5. revalidates both the retained descriptor and visible installed pathname;
6. takes a second full installed snapshot;
7. repeats the descriptor-bound inert self-test exactly once;
8. takes the final installed snapshot;
9. requires before/middle/after snapshots and both self-test transcripts to be
   byte-identical.

The bootstrap's self-test exits before its root-only installer-plan/apply path,
so qualification does not open or execute the downstream protected installer.

## Required inert self-test

The qualification requires the installed bootstrap to emit, among other
markers:

```text
VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V1_SELF_TEST_GREEN
static_native_first_instruction_required=true
exact_installer_snapshot_compile_bound=true
sealed_installer_memfd_required=true
fixed_python_policy_bound=true
caller_stdin_must_be_devnull=true
strict_plan_apply_argv=true
child_environment_closed=true
direct_root_python_authoritative=false
protected_install_authorized=false
funds_movement=false
```

## Authority boundary

The qualification does not invoke either:

- `--installer-plan`; or
- `--installer-apply`.

It does not execute the dormant binder/native candidate and does not access
credentials/private keys, sign, call RPC, construct/submit/broadcast a
transaction, accept payment, activate presale/WC, mutate services/systemd,
perform treasury actions, or move funds.

After a future GREEN host qualification, the next gate is a fresh separate
authorization for the installed protected bootstrap's **installer-plan** only.
That plan remains non-mutating; apply remains another independent
operation-bound authorization.

PROTECT THE CORE.
