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
- accepted V2 launcher lock/candidate identity;
- exact root-custodied Python generation;
- policy bytes rederived from that Python generation;
- complete protected first-entry tree and file identities.

The V5 hardened Git reader may create private temporary metadata while
authenticating the checkout and Git objects. The qualification reports that
truth explicitly. It requires all such private metadata to be cleaned before
returning GREEN.

Accordingly:

- `temporary_git_metadata_write_performed` may be true;
- `temporary_git_metadata_cleanup_completed` must be true;
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

## Authority boundary

A GREEN receipt establishes production-host evidence for this installed
generation only. It does not authorize privileged payload execution.

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
privileged_execution_authorized=false
```

The next gate is a separate **non-executing current-head plan**. Privileged
first-entry execution remains a later independent authorization.

PROTECT THE CORE.
