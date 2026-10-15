# Buy VOID allocation-custody existing-target replacement plan v1

Marker: `VOID_BUY_VOID_CUSTODY_EXISTING_TARGET_REPLACEMENT_PLAN_V1`.

Status: **source-only replacement planning; no host apply authority**.

## Why this exists

The Precision install-prerequisite census found the fixed target

`/opt/void-buy-allocation-custody-runtime-v1`

already exists as a root-owned, non-group/world-writable legacy tree, but it is
not the accepted ten-file custody runtime.

Observed evidence:

- host: `zoso-Precision-Tower-7810`;
- target uid/gid: `0/0`;
- mode: `0755`;
- inventory entries: `906`;
- accepted runtime matches: `2`;
- expected missing: `6`;
- expected mismatched: `2`;
- expected unreadable: `0`;
- unexpected entries: `897`;
- opaque unexpected subtrees: `56`;
- symlink entries: `0`;
- unsafe owner/write entries: `0`;
- accepted runtime tree exact: `false`;
- status: `NONEMPTY_TARGET_NOT_EXACT_ACCEPTED_BUNDLE`.

That operator observation is not cryptographically authenticated or time-bound.
It is evidence for a source plan, not permission to replace the target.

## Bound dependencies

The plan first binds the merged archive-acceptance lock itself:

- path:
  `ops/security/buy-void-allocation-custody-runtime-install-archive-lock-v1.json`;
- Git blob: `099e81e1185a1590eb987e4b231889c571af6f49`;
- bytes: `2185`;
- SHA-256:
  `4d0a169bbc1dec33a3ef72fa9b93ff2ae3fd42dae7ae197fda61bd6e91e7791b`.

Only after exact lock-byte identity succeeds does it accept the archive identity:

- ID:
  `voidbuycustodyarchive1_5685b87bba1987b7365909eb4bd684b89695f7d5e1253d59dcd63ff390732333`;
- bytes: `256000`;
- SHA-256:
  `1fec540e1bac3f728bfa438512a6e0149eea1cda2ae5f2a05f4ec9f19a5a5c9d`.

It also requires the reviewed fixed Node profile:

- path: `/usr/bin/node`;
- SHA-256:
  `fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48`;
- live at-use reverification remains mandatory.

And the staged-runtime Polkit profile:

- runtime principal: `void-buy-runtime`;
- canonical rule bytes: `442`;
- SHA-256:
  `43ffa6d96236b2f5bb9daedf4ddb74c9ec3a7c93eb60ebfe1b4808f01af1c8d7`;
- installed-rule and live-denial verification remain false.

## Required later apply shape

A future separately reviewed root installer must, at minimum:

1. freshly reobserve the target and require the same safe custody class;
2. freshly reopen/hash `/usr/bin/node` and its trusted ancestry;
3. reverify the exact accepted archive bytes;
4. prove the custody service is absent or inactive and no admitted process is
   using the target generation;
5. stage the accepted tree under a root-owned sibling on the same filesystem;
6. verify the staged tree exactly before transition;
7. preserve the pre-existing target under a content-addressed, no-clobber
   rollback name;
8. use only a same-filesystem rename transition;
9. fsync the relevant files/directories before and after transition;
10. postverify the exact installed tree;
11. leave Polkit installation/live denial and service start as separate gates.

The plan does not authorize deleting the rollback generation.

## Authority boundary

This generation deliberately remains:

```text
operator_evidence_authenticated=false
observation_freshness_proven=false
replacement_required=true
replacement_authorized=false
replacement_apply_authorized=false
existing_target_replaced=false
rollback_snapshot_created=false
filesystem_write=false
service_mutation=false
systemd_mutation=false
permission_mutation=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

No Precision mutation, service action, request/payment/customer/ledger read,
credential/key/wallet/signer/RPC/transaction/WC/presale or funds action is
performed by this source contract.
