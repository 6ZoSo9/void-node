# V7 V5 static staging launcher + pair qualifier V2

## Purpose

Implement the production-disabled trusted admission surfaces defined by Draft
#3720 for the exact canonical staging installers proven in #3719.

This successor reuses the reviewed #3714 closed-tree/static-launcher design but
binds the canonical installer generation and canonical stage custody:

- installer source commit:
  `5ec1658836c2f7580cbbd27d9b49b5f3892b90ef`;
- installer source tree:
  `681040be548b140e9a15d2c4c851ecba9e8623ed`;
- source installer blob:
  `b8b52649730cd1b1cf23ffc8c68878cef8ecfc5b`;
- receipt installer blob:
  `8a8da645c73216714fad1140c9981745fbb4a8de`;
- source stage mode:
  `0755`;
- source internal build path:
  `/opt/.void-buy-void-v7-reviewed-v1.stage-v5.build-v1`.

## Launcher V2

Source:

`ops/precision/void_v7_v5_source_receipt_stage_root_launcher_v2.c`

Future fixed closed-tree root:

`/opt/void-v7-v5-source-receipt-stage-closed-tree-v2`

The launcher binds:

- V2 trusted-admission plan ID
  `voidv7v5stageadmissionplan2_ab5bf952568a3633b494322dcef46f4ee8e15d20f8881c8bd9b6f787f414e2a5`;
- V2 plan blob
  `c7ff1128ff04f3ce5f995206af52f844564c6b39`;
- source installer: 129,332 bytes,
  SHA-256 `b4e12ba83f2ef874bd5f55bf2577e412a02a6d9010ee5563f9dbd2dfb0db00db`;
- receipt installer: 12,395 bytes,
  SHA-256 `755ce5836df711f7c3ff254f71246db7e1e6de9509dd84eddd6b67b2c8973a3a`;
- exact implementation commit/tree above.

Its four operations remain:

- `source-stage-plan`;
- `source-stage-apply`;
- `receipt-stage-plan`;
- `receipt-stage-apply`.

The caller cannot supply paths, receipt bytes, candidate paths, or source
generation. The selected installer is authenticated and inherited into static
Python through a retained file descriptor; it is not reopened by pathname after
the final validation.

## Production-disabled boundary

The launcher source intentionally compiles with an **unaccepted** V2 manifest
lock by default.

A normal staging operation must HOLD until a future separately reviewed V2
closed-tree manifest and V2 acceptance ID are compiled into the launcher.

The V2 acceptance prefix is distinct:

`voidv7v5stageaccept2_`

This prevents a V1 closed-tree acceptance identity from authorizing the V2
closed tree.

This Draft does not create a manifest candidate, accept a manifest, install a
closed tree, run as root, or apply either stage.

## Pair qualifier V2

Source:

`ops/precision/void_v7_v5_source_receipt_stage_pair_qualifier_v2.py`

It is read-only and refuses sudo.

The V5 source stage must be exact root:root mode `0755`, full-history,
non-shallow, clean `main`, with exact V5 head/tree/parent and 18,357 reachable
commits.

The qualifier separately treats the fixed V4 source as root-owned and
group/world non-writable rather than incorrectly inheriting V5's exact stage
mode. This keeps fixed-V4 custody validation compatible with the already
installed generation while making V5's future production-root shape exact.

It also requires:

- source internal build path `.stage-v5.build-v1` absent;
- exact V5 receipt stage identity;
- exact fixed V4 source/receipt identities;
- reserved V4 predecessor paths absent;
- source and receipt stages on the same respective filesystems as the fixed
  V4 objects.

A GREEN qualifier result remains staging evidence only:

```text
exchange_preconditions_complete=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
runtime_cutover_authority=false
service_mutation=false
public_presale_activation=false
funds_movement=false
```

## CI proof

The V2 proof inherits the green #3714 adversarial suite and rebinds it to V2.
It must:

- compile launcher V2 with `-std=c11 -O2 -Wall -Wextra -Werror`;
- run launcher self-test;
- prove normal operations fail closed while the production manifest is
  unaccepted;
- prove selected installer execution remains descriptor-bound through
  `/proc/self/fd/<fd>` even after pathname replacement;
- syntax/self-test qualifier V2;
- assert the canonical `0755/.build-v1` semantics;
- reject reuse of predecessor `0555/.tmp-v1` assumptions.

## Authority

Source/test/CI only:

```text
launcher_install_authorized=false
root_execution_authorized=false
source_stage_apply_authorized=false
receipt_stage_apply_authorized=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
transition_journal_mutation=false
consumer_fence_mutation=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

PROTECT THE CORE.

## Hardened installer boundary

This V2 launcher generation now binds the #3719 installer hardening accepted by
#3720:

- source retained reads include `O_NONBLOCK` alongside `O_NOFOLLOW`, with
  a real regular→FIFO race regression;
- the receipt installer enforces isolated/safe-path Python before
  source-tree-shadowable imports, with a hostile sibling import regression.

The launcher still executes the selected installer from a retained descriptor
under static Python `-I -B -S`, so the hardened installer checks are an
additional fail-closed layer.

The production manifest remains unaccepted. No root execution or staging apply
is authorized by this rebind.

PROTECT THE CORE.


## Staging-pair qualifier custody repair — October 22, 2026 (Draft successor)

The canonical V2 launcher remains production-disabled. The read-only qualifier
now additionally requires:

- receipt bytes, digest, identity **and root custody metadata** to derive from
  the same retained, no-follow file descriptor; a terminal pathname-generation
  comparison rejects substitution after the read;
- source-stage root and *every descendant* to be root:root, on the same
  filesystem, with directories mode `0755`, data files mode `0444`,
  executable files mode `0755`, single-linked regular files, no symlinks or
  special files, no POSIX access/default ACLs or file capabilities;
- descriptor-relative, bounded, no-follow, nonblocking directory traversal,
  with visible generation identity and file/directory metadata revalidation;
- equal source-tree metadata-generation fingerprints before and after the
  Git commit/tree/index/full-history checks, rejecting path substitutions,
  writable descendants, and generation drift.

Disposable unprivileged negative fixtures test writable directories/files,
source-generation substitution and receipt pathname replacement. These tests
exercise production read-only validation helpers and never access protected
host paths. The bounded source scan is a *point-in-time* qualification of a
root-custodied tree; it cannot defend against a malicious root administrator
changing a tree after successful qualification. A separate trusted-root
launcher and accepted payload manifest remain mandatory.

**Remaining independent gates:** a distinct-principal source security review,
successful exact-head CI, separately resolving the #3712/#3715 shared staging
destination collision, and repairing the separately reported #3721 pre-
acceptance manifest trust-root gap. The #3724 manifest *candidate* authorization
does not accept a manifest and grants no root/stage operation.

```text
production_payload_manifest_accepted=false
launcher_install_authorized=false
root_execution_authorized=false
source_stage_apply_authorized=false
receipt_stage_apply_authorized=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
service_mutation=false
public_presale_activation=false
funds_movement=false
```

PROTECT THE CORE.

## Whole-tree numerical-bound repair — October 23, 2026

This versioned successor closes the staging-pair qualifier's exact node/depth
boundary gap without changing its read-only authority.

The recursive custody scan now defines:

- `MAX_CUSTODY_NODES = 250000` as the maximum **total traversed nodes,
  including the source-stage root**;
- `MAX_CUSTODY_DEPTH = 64` with the root at depth 0, applied to **every
  child type before directory/file branching**;
- therefore a regular file at depth 64 is allowed, while any directory or
  regular file at depth 65 is rejected;
- the root consumes one node from the global budget before any children are
  enumerated, and every directory or regular-file child consumes exactly one
  additional node.

The production helper is exercised at the exact count and depth boundaries.
The disposable self-test requires the root+nested-directory+leaf fixture to
report three total nodes, rejects one node beyond the configured cap, rejects
depth cap + 1, and specifically rejects a regular-file child beyond the depth
limit.

These repairs do not change the existing custody, Git-generation, receipt,
launcher, or authority boundaries. The qualifier remains read-only and
production-disabled:

```text
production_payload_manifest_accepted=false
launcher_install_authorized=false
root_execution_authorized=false
source_stage_apply_authorized=false
receipt_stage_apply_authorized=false
fixed_source_exchange_authority=false
fixed_receipt_exchange_authority=false
service_mutation=false
public_presale_activation=false
funds_movement=false
```

PROTECT THE CORE.
