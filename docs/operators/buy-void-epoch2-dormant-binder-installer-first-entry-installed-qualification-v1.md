# Buy VOID Epoch-2 dormant first-entry installed qualification V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_INSTALLED_QUALIFICATION_V1`.

Status: **read-only installed-state qualification; privileged execution remains separately authorized**.

## Purpose

Qualify the complete protected dormant first-entry generation installed by the
current frozen V5 installer after a separately authorized create-only apply.

This gate does **not** execute the installed launcher, retained native ELF, or
binder. It does not access credentials/private keys, sign, transact, call RPC,
accept customer payments, activate presale/WC, mutate services/systemd, perform
treasury/liquidity operations, or move funds.

The qualifier is bound to the exact V5 installer source Git blob:

`ce6930bc1be8239a3171d4922c44b96a50f5778b`.

Checkout and accepted-lock observation use the standalone repository witness
from the exact outer V6 installer Git blob:

`70dd0e0feaebbea08c63d8c19549f928c8d70b7a`.

Both modules are authenticated before use. The frozen V5 installer continues
to define the installed byte identities, Python generation, policy and
protected-tree checks. Its native-parent-only checkout and lock entrypoints
are not called by this standalone qualifier, and its private bootstrap context
is never fabricated or assigned.

## Installed namespace

The qualifier requires the fixed root:

`/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1`

with the exact V5 layout:

```text
bin/
  void_buy_void_epoch2_dormant_binder_installer_first_entry_v1
input/
  void_buy_void_epoch2_dormant_binder_native_candidate_v2
source/
  ops/
    precision/
      void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py
policy-v1.conf
```

All directories must be `0755 root:root`. The launcher must be `0555
root:root`. The retained native input, runtime installer source and policy must
be `0444 root:root`. No extra direct entries are accepted.

The exact byte identities are inherited from the verified V5 installer
generation. The qualifier authenticates that source before executing its
read-only helper functions.

## Host/source binding

A live qualification requires root and an explicit lowercase 40-hex
`--expected-head`.

For that exact clean `main` generation it verifies:

- checkout generation;
- retained Git tool generation;
- accepted V2 launcher lock/candidate identity;
- exact root-custodied Python generation;
- policy bytes rederived from that Python generation;
- complete protected first-entry tree and file identities.

One standalone outer V6 repository witness remains open across all three
installed-state snapshots. It observes the exact clean checkout, reads the V2
accepted lock by its fixed Git blob identity, and binds the authenticated V5
and observer source generations. Accepted-lock fields retain the frozen V5
schema and candidate requirements. The witness checks its retained source,
index, worktree, Git tool and descriptor generations on exit.

This Git reader creates private temporary metadata. It loads no repository
configuration, executes no repository callbacks and performs no source-object
fetch. Successful cleanup and final generation revalidation are required
before GREEN is emitted. Failure output retains the actual private-write and
cleanup result.

Accordingly:

- `temporary_git_metadata_write_required=true`;
- `temporary_git_metadata_write_performed=true` on a completed qualification;
- `temporary_git_metadata_cleanup_completed` must be true;
- `standalone_git_tool_admission=true`;
- `native_parent_authority_claimed=false`;
- `protected_root_write=false`;
- `repository_worktree_write=false`.

“Read-only installed qualification” means no mutation of the protected
installed generation, checkout worktree, services, credentials or funds. It
does not pretend the hardened temporary Git witness is write-free.

## Stability

The complete installed-state snapshot is collected three times. Every
checkout, policy, Python, directory entry set, file generation, size, mode,
owner, digest and inode-bearing metadata record must remain identical across
all three observations.

Any installed-path replacement, mode change, extra entry, policy drift, Python
generation drift, checkout drift, staging root, or incomplete temporary Git
cleanup causes HOLD.

## Integration proof

The focused proof keeps the disposable installed-tree unit cases and also
loads the real qualifier, frozen V5 module, standalone V6 Git observer and
accepted V2 lock. In an isolated Git checkout, the real contracts must advance
past Git and lock validation to the expected absent-installation HOLD. The
same boundary is exercised through the actual current-head planner. Source,
lock or checkout drift must be rejected and private metadata must be cleaned.

That integration fixture does not install or execute production payloads and
does not claim a GREEN installed host. The installed-tree unit fixtures remain
explicitly synthetic.

## Authority boundary

A GREEN receipt establishes installed-generation evidence only. It does not
establish designated-host or production-host identity, and it does not
authorize privileged payload execution.

On a GREEN live qualification:
`installed_generation_evidence_authority=true`.

Production/designated-host authority remains a separate gate and stays false
here.

Always false:

```text
protected_root_write=false
repository_worktree_write=false
launcher_execution=false
native_execution=false
binder_execution=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
privileged_execution_authorized=false
```

The next gate is a separate **non-executing current-head plan**. Privileged
first-entry execution remains a later independent authorization.

PROTECT THE CORE.
