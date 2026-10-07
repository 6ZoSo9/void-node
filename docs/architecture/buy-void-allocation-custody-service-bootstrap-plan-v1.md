# Buy VOID allocation custody service bootstrap plan v1

Marker: `VOID_BUY_ALLOCATION_CUSTODY_SERVICE_BOOTSTRAP_PLAN_V1`

Status: **source-only candidate / production HOLD**. This package is a reviewed
installation *planning contract*, not a service installer. It creates no
systemd unit, socket, Polkit policy, directory, lock, receipt, wallet operation,
transaction or public economic authority. The sole CLI operation is `--plan`.
`--apply`, `--install` and other mutation-like modes fail closed with exit 2.

## Problem it resolves at the planning layer

Operator-observed, read-only Precision evidence on October 7, 2026 found:

- the public node is **user-systemd** `void-node-live.service` as user `zoso`
  (UID 1000), not a dedicated system custody service;
- the public process has zero *current* Linux capabilities, but its service
  exposes a broad `CapabilityBoundingSet` and both configured and live
  `NoNewPrivileges` are false;
- UID 1000 failed discretionary `test -w` checks against both allocation roots
  and their authoritative files. That does not prove systemd/Polkit or
  mount-namespace isolation;
- two distinct ext4 mount/device identities exist: allocation ledger under
  `/dev/sda2`, and the high-water directory on `/dev/nvme0n1p1`;
- both private roots and both files are owned by `void-buy-custody` (UID 994,
  GID 981); the custody identity **can write both stores**;
- the scoped system-service/socket-unit inventory reported no candidates;
  the sampled UID-994 process count was zero; and
- the reviewed early Polkit deny-rule path was absent or unreadable; no
  authenticated service-control denial probe occurred.

These are a historical, operator-provided terminal snapshot, *not* independent
attestation or live evidence. The checked-in sample records the exact observed
source heads `e1521fc72730ecb036b71e476a7530656ebfecae` (local) and
`a5409d8b4c418efc7c6d32ff105202af0933f1b5` (remote tracking). It does
not claim either remains current. Callers can supply arbitrary booleans to the
pure classifier for testing; the result is always `HOLD_SOURCE_ONLY`, even if
all supplied booleans are `true`.

### Digest boundary: integrity label, not attestation

The emitted `plan_sha256` is only a SHA-256 over the classifier's canonical
plan body. It is **not authenticated or signed** and does not prove that the
reported source heads were checked out, that any designated host was observed,
that a particular operator produced the plan, or that the observation is fresh.
The machine-readable output therefore fixes
`plan_digest_scope=canonical_plan_body_only` and keeps
`plan_digest_authenticated`, `plan_digest_signed`,
`plan_digest_is_attestation`, source-provenance verification, designated-host
binding, operator-identity binding, and freshness binding all `false`.
A matching digest can detect accidental byte drift in one exported plan; it
cannot be promoted into provenance, identity, freshness, or launch authority.

### Explicit denied authorities

The authority object enumerates the escalation/economic capabilities that this
plan does **not** grant. In addition to no host/service/runtime/funds mutation,
it explicitly keeps private-key and credential access, transaction signing and
broadcast, Chain-2050 and Work Credit writes, inventory funding, presale
activation, treasury/liquidity movement, systemd daemon-reload/enablement, and
data-root mutation `false`. Broad fields such as
`wallet_or_signer_access=false` or `host_write_performed=false` are not used
as substitutes for those explicit denials.

## Existing reviewed contracts: do not recreate them

The canonical source contracts already exist:

- `tools/void-buy-allocation-custody-service-v1.mjs`: the bounded AF_UNIX
  `reserve`/`recover`/`inspect` service;
- `docs/architecture/buy-void-allocation-custody-service-contract-v1.json`:
  exact request/response and authority contract;
- `tools/void-buy-allocation-custody-host-evidence-v1.mjs`: read-only
  designated-host source and execution-identity collector;
- `src/economic/buy_void_allocation_custody_qualification_v1.ts`: pure
  source/evidence qualification; and
- `src/economic/buy_void_allocation_reservation_publication_writer_v1.ts`:
  canonical descriptor-bound dual-root publication writer.

This plan neither modifies nor duplicates their semantics. No actor may bypass
or fake their later runtime evidence by marking a planning boolean `true`.

## Critical executable-closure prerequisite

The canonical custody service after merged security patch #2606 imports
exactly **two compiled** ESM modules from `dist/economic`:

~~~text
buy_void_allocation_reservation_ledger_v1.js
buy_void_allocation_reservation_high_water_v1.js
~~~

Its other **static** ESM imports are exactly the reviewed built-ins
`node:crypto`, `node:fs`, `node:net`, `node:path` and `node:url`.
The source-only proof uses Node's ESM parser to compare **every static module
specifier** against that explicit complete allowlist. It rejects new relative
helpers, third-party packages, built-ins or other specifiers instead of silently
discarding imports outside `../dist/`; an independent full service-byte digest
also detects changes that this parser might not enumerate. The current source
pins `service_source_sha256=sha256:cccc37795507bb5ccf659f28374bafae27f93e56ef3ecbf2f72fd79b05e6185d`
and contract
`service_contract_sha256=sha256:461c97c7f65cce4a96cab7977222fcf9edb4cdd2d89b231709d13a9d1b7f3477`.

The IPC `reserve` and `recover` methods remain provenance-HOLD, and this
two-import source does not load the allocation publication writer. Those two
modules may have their own transitive runtime imports: neither this top-level
census nor a checksum of the untrusted candidate plan proves a protected
executable closure, signed provenance or qualified host custody. Copying source
from a mutable `/home/zoso/dev/void-node` checkout does **not** bind the
executable closure.

**Do not construct a runnable `ExecStart` or install/start the custody unit
until an independently reviewed plan qualifies the complete executing Node
binary/package/module closure, its exact content hashes, its protected
root-owned installation path and ancestors, and its at-use immutability.**
The planner therefore emits `requested_exec_start=null` and
`installable_unit_generated=false`. It does not select a mutable-worktree or
unreviewed `/opt/...` path as executable authority.

## Candidate service policy (not an installable systemd unit)

The source-only plan records expected system-manager policy properties for
later review: `User=void-buy-custody`, `Group=void-buy-custody`, `UMask=0077`,
`NoNewPrivileges=yes`, `PrivateTmp=yes`, `PrivateDevices=yes`,
`ProtectSystem=strict`, `ProtectHome=yes`, kernel/module/control-group
protection, personality/setuid/realtime restrictions, *empty*
`CapabilityBoundingSet` and `AmbientCapabilities`,
`RestrictAddressFamilies=AF_UNIX`, and exact `ReadWritePaths` for the two
allocation roots. These are **targets**; actual effective service properties
and kernel state must be independently measured after a separately authorized
installation.

The planned service belongs to the **system** manager. The public VOID node
currently belongs to the **user** manager. Those must not be conflated.

### IPC boundary

The existing custody source calls `server.listen(socket_path)` and applies
`chmod(0660)` and `chown` itself. It does **not** consume a socket passed by
systemd socket activation. Creating a parallel `*.socket` unit at the same
pathname risks a competing bind and is **not** a valid shortcut. The plan
therefore says `socket_unit_needed=false` and
`socket_activation_implemented=false`.

A later independent host bootstrap must arrange a preexisting, direct, private
socket parent owned by the custody identity, mode `0750` and with a separately
reviewed IPC group distinct from both services' primary groups. The custody
service is expected to create its own AF_UNIX socket at mode `0660`. The
public runtime must have only reviewed group-based socket access, without
write/rename/recreate rights over the socket directory or either data root.
Those runtime filesystem and group facts are **not** established by this plan.

### Writable socket parent inside `ProtectSystem=strict`

The candidate policy requires `ProtectSystem=strict` but enumerates only the
ledger and high-water roots in `ReadWritePaths`. Those **exact two paths** are
also required by the existing merged custody classifier. The source service
creates and unlinks the AF_UNIX socket itself; it does not inherit a prebound
socket from systemd. A pre-existing directory with correct UID/GID/mode is
**insufficient** if the service sees the parent as read-only inside its mount
namespace. Neither socket bind nor cleanup is proven merely by DAC checks.

Before proposing an executable unit, a separate source/host gate must select
and verify a **qualifier-compatible writable namespace exception** for that
socket parent (for example, a reviewed systemd-managed `RuntimeDirectory`
arrangement or another explicitly qualified mechanism). It must also prove
that the final parent retains the required *distinct* IPC group rather than
silently reverting to the custody service's primary group at startup or restart,
that the public runtime can connect without replacing socket entries, and
that bind/unlink/restart works under the effective hardening policy. Do not
add a third `ReadWritePaths` entry without amending and reviewing the existing
exact-paths qualification contract. Do not use a competing systemd socket unit.

The new source-only observation field
`socket_parent_namespace_write_exception_proven=false` is untrusted and
cannot authorize live service startup. The plan deliberately leaves the
exception mechanism unselected and reports
`HOLD_SOCKET_PARENT_WRITABLE_NAMESPACE_EXCEPTION`; a fabricated true value
still returns `HOLD_SOURCE_ONLY`.

## Service-control boundary

A secure public-runtime policy needs effective `NoNewPrivileges=yes`, empty
capability bounding/ambient sets, zero observed kernel capabilities, and
sufficiently protected unit execution identity. Retaining UID 1000 as the
public process while directly giving it write access to custody roots would
violate the existing separation.

The merged host collector additionally requires the root-owned, immutable,
lexically first reviewed deny rule at:

~~~text
/etc/polkit-1/rules.d/00-void-buy-allocation-custody-runtime-deny-v1.rules
~~~

A later, separately authorized installation must verify exact rule bytes,
`systemd` version/authorization-policy compatibility, kernel capabilities and
*live noninteractive* `pkcheck` denial for every reviewed systemd management
action. Only explicit `pkcheck` exit **1** qualifies; an interactive challenge,
missing agent or error is not denial proof. The planner does not install that
rule or run `pkcheck`.

## Correct future ordering

1. Review, build and bind exact service + contract + full compiled/runtime
   dependency closure. Install it only under a protected non-user-writable
   executable root by a separately reviewed ceremony.
2. Review and qualify the public runtime's user-manager hardening. No
   unreviewed drop-in or live service restart is part of this package.
3. Review and bootstrap the distinct system-manager custody identity, service,
   IPC group, socket parent, exact fixed server config and reviewed
   `ProtectSystem=strict` socket-parent writable-namespace exception. Preserve
   canonical ledger/high-water files unchanged; no automatic genesis rewrite.
4. Install and independently verify the exact global runtime Polkit denial;
   prove live runtime privilege/capability and service-control boundaries.
5. Observe the complete service `ExecStart`, unit hardening, socket/parent,
   user/group, mount/device/ancestor identities and source artifacts twice
   using the existing host collector; require an independently controlled
   freshness and receipt chain.
6. Establish **independent rollback resistance**: UID 994 may legitimately
   publish to both data roots, but must not be able to rewind *all* historical
   authority, including the monotonic high-water/receipt witness. Two devices
   under the same writable UID do not prove this property.
7. Rehearse restart, crash recovery, lost custody medium, mount substitution,
   stale receipt, same-generation alternative high-water and rollback-negative
   schedules before any separate runtime integration or economic launch gate.

The above list is sequencing, not a bundled authorization to perform it.

## Source-only verification

~~~bash
node --check tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs
node scripts/prove_void_buy_allocation_custody_service_bootstrap_plan_v1.mjs
node tools/void-buy-allocation-custody-service-bootstrap-plan-v1.mjs --plan
~~~

The proof rejects accessor/proxy/extra-key/caller-authority injections, verifies
missing-host-gate diagnosis, confirms an all-true forged observation still
cannot authorize production, requires an unresolved exact `ExecStart`, rejects
`--apply`/`--install` modes, and checks the no-mutation authority contract.
It also checks that the checked-out custody service's **top-level compiled
ESM import specifiers** exactly match the frozen candidate list; removal or
substitution causes proof failure, not silent deployment-plan reuse. This is
not a review of transitive imports, not protected-executable qualification,
and not host or payment authority. The #2604/#2606 reserve/recovery HOLD
patches change that import list; rebind this plan to the reviewed final
service source and compiled closure before promoting any host bootstrap.
All planned outcomes retain `production_gate_ready=false`.

**PROTECT THE CORE.**
