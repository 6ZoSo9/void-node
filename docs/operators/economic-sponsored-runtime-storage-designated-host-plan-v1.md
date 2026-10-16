# Sponsored runtime storage designated-host plan v1

Marker: `VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V1`.

Status: **read-only designated-host planner; no provisioning authority**.

## Purpose

This gate consumes the production names/path selection and turns it into one
content-addressed Precision host plan.

It does not create the selected account/group, system service, parent directory,
runtime roots, or store children.

## Designated host

The live plan is bound to:

- hostname `zoso-Precision-Tower-7810`;
- operator `zoso`, UID 1000;
- exact machine-id SHA-256
  `11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2`;
- exact repository root `/home/zoso/dev/void-node`;
- branch `main`;
- caller-supplied exact expected HEAD;
- clean tracked/untracked worktree;
- exact production-selection Git blob
  `2d609f5fdcd10be767ad5518bc3188dff45d1fea`.

## Read-only host observations

A live `--run --expected-head <sha>` performs only read operations.

It requires:
- selected user `void-sponsored-runtime` absent from NSS;
- selected group `void-sponsored-runtime` absent from NSS;
- safe root-owned/non-group/world-writable `/`, `/var`, `/var/lib`,
  `/etc`, `/etc/systemd`, and `/etc/systemd/system`;
- stable direct `/etc/machine-id`;
- root-owned/non-group/world-writable `/etc/login.defs`;
- all four `SYS_UID/GID_MIN/MAX` bounds;
- no selected unit collision under systemd system-unit search paths;
- selected common parent/time/reservation/replay paths all absent.

The planner hashes the complete used UID and GID sets but does not output account
or group names from those sets.

## Numeric identity derivation

If the selected account/group are absent, the planner computes the overlap of
the host's configured system UID/GID ranges and chooses the highest numeric ID
unused by both NSS UID and GID inventories.

It then independently requires that both `getpwuid(candidate)` and
`getgrgid(candidate)` fail.

That number is only a plan candidate:

- `candidate_runtime_uid_gid_selected_in_plan=true`;
- `production_runtime_uid_gid_selected=false`;
- `production_runtime_uid_gid_provisioned=false`.

A later provisioner must re-run the plan immediately before mutation and require
the exact plan ID to remain unchanged.

## Plan identity

The plan ID is:

`voidsponsoredstoreplan1_<sha256(canonical-plan-body)>`

and binds:
- repository head/tree/branch;
- designated host identity;
- machine-id;
- selected production namespace;
- account/group absence;
- login.defs digest and system-ID bounds;
- used UID/GID-set fingerprints;
- chosen free candidate UID/GID;
- unit-collision result;
- descriptor-stable trusted ancestors;
- selected path absence observations.

Any relevant host or repository drift changes or invalidates the plan.

## Hard false authority

Even READY keeps false:
- runtime account creation authorized;
- storage provisioning authorized;
- production UID/GID provisioned;
- live topology evidence verified;
- storage bootstrap;
- service installation/start;
- systemd/filesystem mutation;
- runtime integration;
- gas sponsorship;
- transaction submission;
- public presale activation;
- Work Credit write;
- funds movement.

## Hosted CI

Hosted CI runs only:
- Python syntax compilation without bytecode writes;
- `--self-test`;
- focused source proof;
- inert `--source-plan`.

It never runs the designated-host `--run` path.

## Next gate

A future read-only Precision run may produce:

`next_action=SEPARATELY_AUTHORIZE_SPONSORED_RUNTIME_STORAGE_BOOTSTRAP_V1`

That does **not** itself authorize provisioning.

PROTECT THE CORE.
