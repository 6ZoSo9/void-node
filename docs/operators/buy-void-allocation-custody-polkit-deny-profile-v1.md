# Buy VOID allocation-custody Polkit deny profile v1

Marker: `VOID_BUY_VOID_ALLOCATION_CUSTODY_POLKIT_DENY_PROFILE_V1`.

Status: **source-only exact rule profile; not installed**.

## Purpose

The live Precision census showed that direct noninteractive Polkit checks for
the ordinary runtime user do not currently prove explicit denial. The existing
allocation-custody host-evidence collector already defines the canonical rule
bytes it expects. This profile materializes those exact bytes as a reviewed
repository object instead of introducing a second policy definition.

Target path:

`/etc/polkit-1/rules.d/00-void-buy-allocation-custody-runtime-deny-v1.rules`

Runtime subject user:

`zoso`

Denied action IDs:
- `org.freedesktop.systemd1.manage-units`;
- `org.freedesktop.systemd1.manage-unit-files`;
- `org.freedesktop.systemd1.reload-daemon`;
- `org.freedesktop.systemd1.set-environment`.

The rule returns `polkit.Result.NO` for those action IDs when
`subject.user === "zoso"`; all other cases are `NOT_HANDLED`.

## Why action-ID-only

The merged host-evidence contract requires the global runtime subject to be
unable to acquire systemd management authority, including unit management,
unit-file changes, daemon reload and manager-environment mutation. Unit-specific
details are still exercised by the later live `pkcheck` matrix, but the rule
does not make its denial contingent on caller-provided unit/verb details.

## Install boundary

This PR does not write to `/etc/polkit-1/rules.d`.

A later guarded installer must:
1. bind this exact source/profile generation;
2. require the target absent or exact-compatible;
3. publish create-only as root-owned, single-link, non-group/world-writable;
4. ensure the target is lexically first across reviewed Polkit rule directories;
5. refresh/observe Polkit using the reviewed host mechanism;
6. run the exact noninteractive `pkcheck` matrix and require exit **1** for
   every reviewed systemd action and custody-unit verb;
7. roll back only bytes created by that invocation if verification fails.

Until live verification:

```text
installed_rule_verified=false
runtime_control_denial_live_verified=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```
