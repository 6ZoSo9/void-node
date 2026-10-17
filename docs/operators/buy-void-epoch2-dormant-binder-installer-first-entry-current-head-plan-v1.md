# Buy VOID Epoch-2 dormant first-entry current-head plan V1

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CURRENT_HEAD_PLAN_V1`.

Status: **root/read-only qualification plus non-executing current-head plan; privileged first-entry execution remains separately authorized**.

## Purpose

This gate follows the installed-qualification authority repair in #3475. It re-runs
the exact read-only installed qualification for an explicit current HEAD, binds
the exact installed launcher generation into a content-addressed plan, and emits
only the future privileged installer-plan argv.

It does **not** execute that argv. The installed launcher, retained native ELF,
and binder remain unexecuted.

## Exact source generations

The planner authenticates the exact installed qualifier Git blob:

`474e525cd54cc99b745d1e3aa62d66dac47ca785`.

That qualifier is in turn bound to frozen V5 installer blob:

`ce6930bc1be8239a3171d4922c44b96a50f5778b`.

The accepted launcher remains:

- lock:
  `voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`;
- candidate:
  `voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`;
- installed path:
  `/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1/bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1`;
- bytes: `731072`;
- SHA-256:
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`;
- Git blob: `798907b18c73ee2cc1dea0fe05b36f27ab4137a7`.

## Qualification requirement

Plan mode requires root because it executes the read-only installed qualifier on
the current host. The qualifier must prove:

- clean exact `main` at the explicit lowercase 40-hex expected HEAD;
- accepted launcher lock/candidate identity;
- complete protected first-entry generation GREEN and stable across three
  snapshots;
- exact root-owned installed file/directory identities;
- exact Python and policy generation;
- temporary private Git metadata cleanup complete;
- installed-generation evidence authority true;
- production/designated-host evidence authority false;
- protected-root/worktree writes false;
- launcher/native/binder execution false;
- credential/key/signing/transaction/RPC/payment/presale/WC/treasury/funds
  authority false.

The V5 hardened Git observer may create private temporary Git metadata while
qualifying the checkout. The plan reports whether that occurred and requires
cleanup to complete before emitting a plan.

## Content-addressed plan

Plan ID prefix:

`voidbuye2dormantfirstentrycurrentheadplan1_`.

The digest binds the complete qualification result, installed launcher
inode-bearing generation, exact expected HEAD, exact source generations, and
future argv.

The emitted future argv is exactly:

```text
/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1/bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1
--installer-plan
--expected-head <exact current HEAD>
```

The planner emits that argv as JSON only. It does not execute the installed
launcher or any descendant.

## Evidence and authority boundary

On a GREEN live plan:

```text
installed_generation_evidence_authority=true
production_host_evidence_authority=false
```

All execution/economic authorities remain false.


Always false:

```text
protected_root_write=false
repository_worktree_write=false
privileged_execution_performed=false
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

A GREEN plan establishes current installed-generation evidence only. It keeps
`production_host_evidence_authority=false` and does not establish designated-host
identity. The full qualification result—including
`installed_generation_evidence_authority=true` and production-host authority
false—is part of the content-addressed plan body.

The plan advances only to a separate authorization review of the planned
privileged **installer-plan** first-entry. That later review must not infer
designated-host authority from this plan, and this gate does not authorize the
execution itself.

PROTECT THE CORE.
