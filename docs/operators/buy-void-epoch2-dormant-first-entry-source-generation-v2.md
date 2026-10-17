# Buy VOID Epoch-2 dormant first-entry source generation V2

Marker family:
- `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V4`
- `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V5`

Status: **source/test/CI only**. This generation is not an accepted native
candidate, is not installed on Precision, and grants no production authority.

## Purpose

V2 is the canonical successor to the V1/V3/V4 generation merged in #3439.
It preserves that generation's closed 35-row application manifest, 13-role
private parent proof, sealed source/tool descriptors, authenticated native
parent, create-only publication and terminal receipt model while repairing the
repository witness defects reproduced after merge.

The repaired generation is deliberately additive:

- inner installer:
  `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py`;
- native bootstrap:
  `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c`;
- manifest:
  `ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf`.

Historical V1/V3/V4 source remains immutable evidence.

## Exact V2 source identity

The manifest has exactly 35 ordered ASCII rows.

- manifest bytes: `2381`;
- manifest SHA-256:
  `70280a4ae4d228b2a2c98712d64e09241df95584cb12d39311776252c985241e`;
- source-generation ID:
  `voidbuye2dormantsourcegen2_70280a4ae4d228b2a2c98712d64e09241df95584cb12d39311776252c985241e`.

Inner V4:

- Git blob: `763865f3eae1b8f92ea2dba1ec0cbaec6e7dc6ba`;
- bytes: `120323`;
- SHA-256:
  `bdfb8bc87f4c2b15af69a0e2eccbffa570d5913383e269166760966ff924fac1`.

Native V5 source:

- Git blob: `83a323b3430c397d2806ad88c2075e4ad427db9d`;
- bytes: `72690`;
- SHA-256:
  `8abe5f6a51365f0edbd127235f0425fff56e63db9ab7fdddab9020e28decca88`.

The accepted dormant-binder first-entry lock, frozen runtime installer, launcher
payload and native payload identities remain unchanged from V1.

## Repository witness repair

### Private Git presentation

Both V4 and V5 reject caller repository configuration as authority.

The Python witness snapshots repository metadata into a bounded private Git
view. The native witness creates private `HEAD`, `refs/heads/main` and
configuration, copies the source index into a sealed memfd, and exposes only the
retained physical object-directory descriptor to the authenticated Git
executable.

No fetch, remote helper or network protocol is available.

### Split index

Source `sharedindex.<40hex>` generations are rejected. The source shared-index
file is not opened by the private witness, so qualification cannot silently
change its metadata while claiming read-only source observation.

### Object identity

The Python witness keeps two intentionally separate object-access boundaries.

The operational `_git_object()` accessor is **not** a generic repository reader:
it accepts only the closed inherited source set authenticated by the native
bootstrap and therefore requires the retained `_BOOTSTRAP_CONTEXT["sources"]`
descriptor generation. An arbitrary repository path without that inherited
source context must fail with
`authenticated_source_descriptors_required`.

Generic raw repository-witness tests instead use the retained
`_RepositorySnapshot.blob()` path. That primitive authenticates tree membership,
object identity, exact bytes and SHA-256 through the private Git witness without
granting those bytes operational source authority. The focused generation proof
requires both sides of this split and verifies the fixture repository remains
byte/metadata unchanged.

Native V5 runs strict Git object verification before and after its worktree
pass and independently recomputes the requested commit and root-tree SHA-1 from
their raw object bodies. A valid compressed object stored beneath a false object
ID therefore cannot inherit that ID as authority.

### Tracked worktree final observation

Every tracked worktree entry is raw-hashed against the committed blob before
bound application-source checks. Native V5 repeats the complete bounded tracked
worktree hash after those later checks. Python V4 retains worktree observations
and rejects generation drift during its final witness recheck.

This detects persistent drift across the verification window; it does not claim
an atomic freeze against change-and-restore by a privileged/root-equivalent
actor.

## Temporary filesystem truth

The repaired plan is **not** filesystem-read-only.

The private Python/Native Git witnesses may create bounded temporary metadata
under `/tmp`. Those paths contain repository metadata only, not credentials,
wallets, private keys or payment contents. They are cleanup-bound and grant no
protected-state authority.

The operational plan therefore reports:

- temporary filesystem write: true;
- scope: private Git metadata under `/tmp`;
- protected-state mutation: false;
- Git fetch/network: false.

This is separate from a later create-only protected installation under
`/opt`.

## Preserved operational boundary

The parent proof still has exactly 13 roles:

`proof, manifest, installer, bootstrap_source, lock, runtime_installer,
launcher, native, policy, python, git, checkout, git_dir`.

V4/V5 preserve:

- root-custodied sealed Python and Git execution;
- exact runtime HEAD as operation evidence;
- closed source-generation membership;
- exact plan ID and confirmation domain;
- pre-mutation and pre-publication parent/source/tool revalidation;
- create-only `renameat2(RENAME_NOREPLACE)` publication;
- no rollback deletion after possible publication;
- truthful post-publication `published_needs_inspection` receipts.

## Authority

This source generation does not authorize or perform:

- Precision protected installation;
- dormant binder live execution;
- credential/private-key access;
- signing;
- RPC or transaction construction/submission/broadcast;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

## Next gate

After exact-head CI is GREEN, derive a reproducible static native V5 candidate
from this exact manifest/source generation, accept that candidate in a new
versioned lock, and materialize its exact install inputs.

Only after those source gates may a separately authorized Precision host-policy
plan and protected installation be considered.

PROTECT THE CORE.
