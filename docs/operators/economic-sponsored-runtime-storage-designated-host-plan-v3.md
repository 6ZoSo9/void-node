# Economic sponsored runtime storage designated-host plan v3

Marker: `VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V3`.

Issue: #3263.

Status: **source-only/read-only host-plan successor; no provisioning authority**.

## Purpose

Merged V2 closed the original remote-NSS authority gap by replacing libc
`pwd`/`grp` resolution with strict descriptor-bound local identity files.
It intentionally remains the accepted predecessor for that boundary.

V2 still inferred system-unit absence from a hand-written subset of possible
system-manager search roots. V3 leaves the V2 identity/storage policy unchanged
and replaces only that unit-absence authority with the running PID-1 systemd
manager's own active `Manager.UnitPath`.

## Preserved V2 identity authority

V3 preserves the exact V2 local-files contract:

- descriptor-bound `/etc/nsswitch.conf`, `/etc/passwd`, `/etc/group`,
  and `/etc/login.defs`;
- exact `passwd: files` and `group: files`;
- no libc NSS lookup;
- strict bounded local passwd/group parsers;
- deterministic free shared system UID/GID selection;
- post-observation revalidation of every identity-authority file;
- `identity_resolution_external_network_calls=false`.

Merged V2 source Git blob is pinned as
`2cb05a9873de9e6bf359e025721867edce43684b`.

## Authenticated system-manager generation

Before claiming system-unit absence, V3 observes the system manager through
fixed root-custodied tools:

- `/usr/bin/systemctl --version`;
- `/usr/bin/busctl --system call ... GetConnectionUnixProcessID ... org.freedesktop.systemd1`;
- `/usr/bin/busctl --system get-property ... Manager Version`;
- `/usr/bin/busctl --system get-property ... Manager UnitPath`.

The accepted source shape requires:

- reviewed systemd major `255`;
- the D-Bus owner of `org.freedesktop.systemd1` is exactly PID 1;
- running `Manager.Version` exactly equals the installed package version
  reported by `systemctl --version`;
- `Manager.UnitPath` is an exact D-Bus `as` string array;
- nonempty bounded count, absolute normalized unique paths, preserved order;
- SHA-256 over the exact ordered UnitPath byte sequence;
- no caller-supplied search roots.

This plan observes and content-addresses the exact package/version generation.
It does not silently substitute an Xiphos-specific package value for Precision.

## Complete UnitPath absence census

Every root returned by the authenticated manager is observed in order.

For an existing root, V3 requires the root and its existing ancestry to be:

- real directories;
- not symlinks;
- root:root owned;
- not group/world writable;
- descriptor-stable during each generation observation.

For an absent UnitPath root, V3 binds the nearest existing trusted ancestor and
records the root as absent. The selected service basename is checked in every
returned root.

A selected
`void-economic-sponsored-runtime-v1.service` in **any** returned root causes
HOLD, including roots such as:

- `/usr/local/lib/systemd/system`;
- `/run/systemd/transient`;
- `/run/systemd/generator.early`;
- `/run/systemd/generator`;
- `/run/systemd/generator.late`;
- `/etc/systemd/system.control`;
- `/run/systemd/system.control`.

There is no recursive guessed-root scan and no silently ignored returned root.

## Anti-TOCTOU boundary

The observation window is:

1. bind local identity authority;
2. bind fixed systemd client tools;
3. authenticate PID-1 manager + Version + exact UnitPath;
4. census all returned roots and require selected-unit absence;
5. census selected storage paths;
6. revalidate local identity authority;
7. requery PID-1 owner, running Version, and exact UnitPath;
8. require the manager evidence to be byte-for-byte equivalent;
9. reobserve every returned root and selected-unit absence;
10. require root/absence evidence to be exactly stable;
11. revalidate systemd client-tool generations.

Any manager owner/version/UnitPath change, UnitPath reorder, root-generation
change, selected-unit appearance, or malformed property HOLDs.

This is still a read-only **plan**. A later install/apply gate must repeat the
manager/UnitPath/unit-absence census immediately before unit publication. V3
does not turn stale plan evidence into future install authority.

## Required source proof

The focused proof includes synthetic adversaries for:

- a selected unit visible only under `/usr/local/lib/systemd/system`;
- a selected unit visible only under `/run/systemd/transient`;
- duplicate UnitPath roots;
- non-absolute UnitPath roots;
- UnitPath count mismatch;
- manager PID/version/UnitPath drift;
- UnitPath reorder;
- UnitPath-root generation drift.

The focused workflow also reruns the merged V2 self-test/proof so the local-only
NSS repair cannot regress unnoticed.

## Authority boundary

V3 is source/test/CI and later read-only designated-host planning only.

It authorizes none of:

- account/group creation;
- storage provisioning;
- filesystem mutation;
- systemd unit installation, daemon-reload, start, restart, or enablement;
- service execution;
- gas sponsorship;
- transaction construction/submission;
- Work Credit writes;
- public presale or WC/VOID activation;
- wallet/key/signer access;
- treasury/liquidity action;
- funds movement.

A successful V3 host plan may only become input to a **separate explicit
provisioning authorization** after its exact evidence is reviewed.

PROTECT THE CORE.
