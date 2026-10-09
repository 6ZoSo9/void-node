# Buy VOID custody launch high-water writer V1

## Purpose

This source-only successor closes one specific gap left intentionally false by
the custody launch-authority V2 classifier: persisting a newer already-qualified
custody launch high-water without trusting caller-selected paths or caller
supplied authority bytes.

The V2 classifier is carried forward byte-for-byte from the earlier custody
authority lane. This companion writer does not make that classifier, the
allocation custody service, Buy VOID intake, or fulfillment production-ready.

## Authority boundary

The writer is **advance-only**. It will not create the first custody high-water.
A missing high-water returns
`bootstrap_requires_separate_qualification` with zero write. Genesis/bootstrap
remains a distinct host/custody ceremony so deletion of anti-rollback state
cannot be silently reinterpreted as a fresh install.

Runtime configuration selects three paths once at startup:

- the canonical coupled-launch generation journal;
- the dual-signed live activation receipt; and
- the private custody root.

There is no IPC/request field for any path or bytes. The only authoritative
output filename is
`buy-void-custody-launch-high-water-v2.json`.

## Descriptor and publication model

The writer:

- walks directories through retained `/proc/self/fd` descriptors using
  `O_DIRECTORY|O_NOFOLLOW`;
- rejects writable observed-authority directories and requires the custody root
  to be private to the current custody UID;
- reads journal, receipt and current high-water with bounded descriptor-bound
  before/after identity checks;
- asks the V2 classifier to derive the exact next canonical high-water;
- rejects extra candidate fields and rebuilds candidate bytes through
  `buildBuyVoidCustodyLaunchHighWaterV2(...)`;
- writes only a fixed-name private temp with `O_EXCL|O_NOFOLLOW`, fsyncs it,
  and then re-reads all authority evidence before replacement;
- atomically renames only over the fixed existing high-water, fsyncs the custody
  directory and exact-postchecks published bytes; and
- classifies the resulting state again.

If the rename occurred but a later postcheck/classification fails, the returned
decision truthfully reports `operation_performed=true`.

## Deliberate remaining HOLDs

Source-level pathname checks still do not prove a hostile same-UID actor cannot
replace a qualified root after the final revalidation. Accordingly this writer
keeps all of these false:

- `post_admission_root_path_stability_proven`;
- `protected_high_water_custody_proven`;
- `independent_custody_proven`;
- `runtime_integration`;
- `custody_reserve_method_enabled`;
- `custody_recover_method_enabled`;
- `production_allocation_mutation_ready`;
- payment acceptance, signer/wallet, transaction, Chain-2050/WC,
  presale/market activation and funds authority.

A later designated-host qualification must bind exact UID/GID/mount/ancestor
policy and the first high-water bootstrap before this helper can participate in
a production custody service.

## Focused proof

The deterministic proof requires Node 22/24/26 byte-identical output and covers:

- exact-current idempotence;
- one monotonic fixed-file advance and exact replay;
- missing-high-water bootstrap HOLD;
- extra-field candidate rejection even with a matching digest;
- journal mutation after candidate derivation;
- visible custody-root replacement;
- symlink custody-root rejection;
- truthful mutation reporting when failure occurs after rename; and
- production-classifier HOLD on the current source generation.

No live service, customer record, credential, wallet/key/signer, transaction,
Chain-2050/WC state, presale/market state, inventory, treasury, liquidity or
funds are touched.

**PROTECT THE CORE.**
