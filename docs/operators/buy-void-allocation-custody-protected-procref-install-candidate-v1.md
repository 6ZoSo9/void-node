# Buy VOID custody protected proc-ref installer candidate V1

Marker: `VOID_BUY_VOID_CUSTODY_PROTECTED_PROCREF_INSTALL_CANDIDATE_V1`.

Status: **source/CI implementation candidate only; production apply hard-disabled**.

This generation follows the V4-bound source-only install plan in Draft #3784.
It implements and tests the future create-only publication algorithm without
making that algorithm reachable against production.

## Exact inputs

The candidate binds:

- V4-bound install-plan source Git blob
  `a2431fffbee7be4de2ee1152b70e5fcccafd40c9`;
- protected-source V4 acceptance-lock Git blob
  `29a5d9325468897c9b99d22d4a0376547a5e865e`;
- accepted protected source head
  `0eb763d8ecba723f5a80cccb24a297fbf5a010b7`;
- accepted protected source Git blob
  `2f22f0cf3e5c5ed56c2a31f0862f087cdbbe41a9`;
- accepted protected source bytes: `74322`;
- accepted protected source SHA-256
  `79810ed2afa60d2e544e0f6f48ff8189dd26d5aaeb65208bfb1f562fda467a1c`.

## Production apply is unreachable

The source contains:

```text
PRODUCTION_APPLY_AUTHORIZED = False
```

and `apply_production()` checks that value before:

- checking root UID;
- reading the supplied source candidate;
- opening `/` or `/opt`;
- creating a stage directory;
- writing a source file;
- fsync;
- `renameat2`;
- any other host mutation.

Therefore this generation cannot install the protected source even when invoked
with `--apply`.

The proof executes:

```bash
python3 -I -B ...install_candidate_v1.py \
  --apply --source-file /nonexistent/never-read
```

and requires an immediate structured HOLD with
`protected_install_apply_not_authorized`. The nonexistent candidate must not
be read.

No separate confirmation string or user command can override the hardcoded
false authority in this generation.

## Future production boundary implemented but disabled

A later distinct authorization generation may reuse the reviewed primitives
only after separate source acceptance.

The disabled future path requires:

1. root execution;
2. a descriptor-stable source candidate matching exact byte count, Git blob and
   SHA-256;
3. direct descriptor-relative `/opt` opening from retained filesystem-root
   descriptor;
4. root:root, non-group/world-writable install-parent custody;
5. retained install-parent dev/inode/owner/mode/Linux mount ID;
6. absent final and stage names;
7. descriptor-relative creation of exact stage
   `/opt/.void-buy-allocation-custody-procref-v1.stage-v1`;
8. explicit stage mode `0755` regardless of umask;
9. exact single source entry, root ownership in production, mode `0444`,
   exact bytes and digest;
10. staged source fsync and stage-directory fsync;
11. retained-parent and stage revalidation before publication;
12. same-parent `renameat2(RENAME_NOREPLACE)`;
13. install-parent fsync;
14. retained-parent identity/mount revalidation;
15. exact final root/source re-verification;
16. a content-addressed install receipt;
17. stop before root process census execution.

An existing destination is never removed or replaced.

## CI fixture scope

`--self-test` exercises the publication algorithm only under
`TemporaryDirectory` using the CI user's UID/GID. It verifies:

- exact reviewed source bytes;
- `renameat2(RENAME_NOREPLACE)`;
- create-only/no-clobber behavior;
- retained parent descriptor and mount ID;
- same-mount exact stage;
- exact one-entry stage;
- source mode `0444`;
- stage and parent fsync;
- final exact byte re-verification;
- content-addressed receipt generation;
- pre-publication stage cleanup;
- parent metadata drift rejection;
- truthful classification of post-publication parent-fsync and final-verify
  failures.

Those temporary fixture writes do not authorize or simulate a real `/opt`
apply.

## Truthful publication failure boundary

Once atomic publication has happened, later failures are represented as
`PublishedInstallHold` with:

```text
publication_state=published_needs_inspection
publication_failure_phase=parent_fsync | final_verification
```

A post-publication failure is never reported as `not_published`.

Pre-publication failures may clean only the exact stage generation created by
the candidate algorithm; the final target is never unlinked or removed.

## Source-only invocation

Allowed:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_protected_procref_install_candidate_v1.py \
  --source-plan

python3 -I -B \
  ops/precision/void_buy_allocation_custody_protected_procref_install_candidate_v1.py \
  --self-test
```

`--apply` always HOLDs in this generation.

No sudo/root execution is requested or authorized.

## Authority boundary

```text
source_candidate_only=true
production_apply_exposed=false
production_apply_authorized=false
protected_source_installed=false
root_census_execution_authorized=false
host_write=false
service_mutation=false
systemd_mutation=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The next gate after source/CI qualification is review/acceptance of this exact
disabled installer candidate. That still would not authorize host installation.

**PROTECT THE CORE.**
