# Sponsored runtime storage designated-host plan v2 — local identity authority

Marker: \`VOID_ECONOMIC_SPONSORED_RUNTIME_STORAGE_DESIGNATED_HOST_PLAN_V2\`

Issue: #3237.

## Purpose

Merged #3235 introduced the first read-only Precision designated-host planner for
the sponsored-runtime storage topology. Its host path used Python \`pwd\` /
\`grp\` NSS calls while reporting \`external_network_calls=false\`.

That claim was too strong. libc NSS may consult SSSD, LDAP, NIS, or another
provider selected by \`/etc/nsswitch.conf\`, which can introduce remote network
contact, provider-controlled answers, and unbounded provider latency.

V2 removes libc NSS from the identity authority path. V1 remains frozen as
historical source and is explicitly **not accepted for live planning**.

## Accepted identity-resolution profile

V2 admits exactly one identity profile:

\`\`\`text
passwd: files
group:  files
\`\`\`

The \`passwd\` and \`group\` database source lists must each contain exactly the
single token \`files\`.

The planner fails closed before identity selection for any other profile,
including:

- \`systemd\`;
- \`sss\`;
- \`ldap\`;
- \`nis\`;
- \`compat\`;
- bracket/action expressions such as \`[SUCCESS=return]\`;
- duplicate \`passwd\` or \`group\` database declarations;
- a missing \`passwd\` or \`group\` declaration.

This is intentionally conservative. A normal host whose NSS configuration uses
\`files systemd\` or another provider will return HOLD. That is preferable to
claiming a complete local identity census from only \`/etc/passwd\` and
\`/etc/group\`.

Support for another provider requires a separate reviewed authority contract.

## Descriptor-bound identity bytes

Before deriving any name or numeric identity, V2 descriptor-stably reads:

- \`/etc/nsswitch.conf\`;
- \`/etc/passwd\`;
- \`/etc/group\`;
- \`/etc/login.defs\`.

Each file must be:

- a direct regular non-symlink file;
- single-link;
- root:root owned;
- not group/world writable;
- bounded in size;
- opened with \`O_NOFOLLOW\`;
- unchanged across visible/open descriptor checks.

The evidence records SHA-256, size, owner, mode, link count, device/inode and
mtime/ctime generation identity.

After the repository, unit-collision and selected-storage-path observations are
complete, all four identity-authority files are read and checked again. Any
generation or byte change returns HOLD.

This is a bounded cooperative observation. It does not claim kernel-level
pathname immutability against root-equivalent interference between observations.

## Local identity parsing

V2 contains its own strict parsers and does **not** import or call Python
\`pwd\` / \`grp\`.

The passwd parser requires seven fields, bounded names/fields, numeric UID/GID
values and unique account names.

The group parser requires four fields, bounded names/member lists, numeric GID
values and unique group names.

The accepted local-file namespace is then used to prove:

- \`void-sponsored-runtime\` user absent;
- \`void-sponsored-runtime\` group absent;
- local passwd contains exactly one \`zoso\` name at UID 1000;
- UID 1000 is not aliased to another local passwd name;
- the candidate numeric identity is absent from all local passwd UIDs and from
  both group GIDs and passwd primary GIDs;
- the candidate is inside the exact local \`SYS_UID_*\` / \`SYS_GID_*\` bounds.

The selected candidate remains **plan evidence only**. It is not a provisioned
production identity.

## Network truth

For the accepted V2 identity-resolution path:

- \`libc_nss_lookup_used=false\`;
- \`remote_nss_provider_allowed=false\`;
- \`identity_resolution_external_network_calls=false\`.

The planner still performs only local filesystem reads, fixed-path local Git
inspection and local hostname/numeric-UID observations. It contains no socket
connection or remote NSS API.

The global output may report \`external_network_calls=false\` only after the
files-only NSS profile and bound identity databases have been verified.

If the host has a different identity authority, V2 returns HOLD instead.

## Preserved #3235 gates

V2 preserves the non-NSS checks from the merged generation:

- exact Precision hostname and machine-id;
- numeric caller UID/EUID 1000;
- exact clean \`main\` HEAD/tree;
- exact selected sponsored-runtime storage source identity;
- exact frozen V1 planner source identity;
- root-owned/non-writable trusted parent directories;
- selected systemd unit absence;
- selected storage paths absent;
- production account/root/service names fixed;
- no account/group creation;
- no storage bootstrap;
- no systemd/service action;
- no sponsorship, transaction, presale/WC or funds authority.

## Modes

Hosted CI uses only:

\`\`\`bash
python3 -I -B ops/precision/void_economic_sponsored_runtime_storage_designated_host_plan_v2.py --self-test
python3 -I -B ops/precision/void_economic_sponsored_runtime_storage_designated_host_plan_v2.py --source-plan
python3 -I -B scripts/prove_void_economic_sponsored_runtime_storage_local_identity_v2.py
\`\`\`

The production read-only mode is:

\`\`\`bash
python3 -I -B ops/precision/void_economic_sponsored_runtime_storage_designated_host_plan_v2.py \
  --run \
  --expected-head <exact-reviewed-main-sha>
\`\`\`

This PR does **not** authorize that live run.

A successful source merge only makes the repaired planner available for a later
separately authorized read-only Precision observation.

## Authority boundary

Source/test/CI only.

No Precision planner execution, NSS/network query, account/group creation,
mkdir/chown/chmod, systemd/service action, storage mutation, replay mutation,
gas sponsorship, transaction submission, Wallet/WC mutation, presale/market
activation, treasury/liquidity action or funds movement is authorized.

PROTECT THE CORE. PROTECT THE TRUTH.
