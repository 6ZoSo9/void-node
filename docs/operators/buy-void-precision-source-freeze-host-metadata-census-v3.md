# Precision accepted-freeze host metadata census V3

Marker: `VOID_BUY_VOID_PRECISION_SOURCE_FREEZE_HOST_METADATA_CENSUS_V3`.

Status: **read-only evidence collector; always HOLD for release authority**.

## Purpose

V3 updates the no-fetch Precision metadata census to the accepted Buy VOID
source-freeze V2 lineage.

It does not qualify the host by itself. It returns bounded metadata for the
separate host-install qualification evaluator.

## Bound source identity

Freeze candidate:

`voidbuypresalefreeze2_32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1`

Fixed source:

- commit `05614762b1b4638e05e539fd7d20cbf670e1570b`;
- tree `4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e`;
- freeze manifest blob
  `ca9c42e2d3ab4c50ac54badadb9efde6180ad241`.

Current-source enforcement successor:

`voidbuypresaleenfsucc1_819fd2dbce9928145023d4077cffc34e2a9ab3a50e51428fc37dda6ca70a18ef`

Successor blob:

`774db38ccb771f393b44d589a455144b99d36f6b`.

Source-freeze acceptance:

`voidbuypresalefreezeaccept2_427988497e4789465dde1c193668bb140d017c4e3ba3748567ea4e3bacfadb57`

Acceptance blob:

`174d536807f03fd7b6ff44820d4e378c7055150e`.

Final reviewed lineage heads:

- enforcement successor `d29a6663b9fb1f2a1a1c64d911c7f888c33b70e5`;
- source-freeze acceptance `dd2b04d62474ef35b2512744285fe26e3081018f`.

The acceptance itself content-addresses the repaired #3491 native-USDC/BTC-post-presale
semantic evidence while leaving payment-rail acceptance false.

V3 also observes, without interpreting as live authority:

- historical enforcement V2 lock blob
  `589845615654da8b688764377b34296267ac0063`;
- repaired Epoch-2 V6 bootstrap lock blob
  `f2ce1364dd776bfbf1aa1ef59ce999cb46037b73`.

## No-fetch boundary

All local Git identity queries use:

```text
GIT_NO_LAZY_FETCH=1
GIT_ALLOW_PROTOCOL=
GIT_OPTIONAL_LOCKS=0
GIT_NO_REPLACE_OBJECTS=1
```

Hooks, attributes, fsmonitor, untracked cache, preload-index behavior and
recursive submodule behavior are disabled for the observation.

Missing objects remain unavailable. The probe never repairs, checks out, fetches
or writes them.

The behavioral proof uses only temporary local repositories and proves:

- a promisor checkout cannot call its configured local upload-pack helper;
- the checkout is byte/type/mode unchanged;
- the empty-protocol fallback still blocks transport if
  `GIT_NO_LAZY_FETCH` is removed;
- a complete local clone resolves every expected identity without mutation.

## Fixed host observations

The real `--run` uses `lstat` metadata only for:

- `/var/lib/void-source-finality-v7/deployment-receipt.json`;
- `/var/lib/void-allocation-custody-v1`;
- `/opt/void-buy-void-epoch2-live-composition-v3`.

It does not read receipt contents, recurse into custody, follow symlinks, inspect
credentials, query wallet/signer state, or call services.

The allocation-custody mountpoint bit is observed only when the fixed path is a
directory.

Regular-file byte counts are restricted to JSON's interoperable exact-integer
domain:

`0..9007199254740991`

A regular file whose `st_size` is outside that range is not serialized as an
unbounded JSON number. It is classified instead as:

```text
state=REGULAR_SIZE_RANGE_HOLD
mode=null
bytes=null
```

This keeps distinct host observations from collapsing when a downstream
JavaScript consumer parses the report. The focused proof covers the exact
max-safe boundary, max-safe+1, negative synthetic input, and boolean type
confusion.

## Local Git observations

If `~/dev/void-node` is a directory, V3 reports:

- current checkout HEAD;
- local presence of the fixed source/review/successor/acceptance commits;
- exact source tree availability;
- whether the tracked freeze, successor, acceptance, historical enforcement and
  repaired Epoch-2 lock blobs match at current HEAD.

These are observations only. They do not make current HEAD equal to the frozen
source and do not auto-adopt later main commits.

## Host command

A future separately requested read-only Precision handoff may run a byte-verified
copy as the ordinary `zoso` account:

```bash
python3 -I -B void_buy_void_precision_source_freeze_host_metadata_census_v3.py --self-test
python3 -I -B void_buy_void_precision_source_freeze_host_metadata_census_v3.py --run
```

No sudo is required or allowed. `--apply` is unsupported.

Do not fetch, checkout, update or otherwise repair the local repository before
running the census merely to make evidence present.

## Terminal interpretation

Every real host report ends:

`status=HOST_RELEASE_EVIDENCE_HOLD`

and keeps:

```text
source_freeze_acceptance_authority_claimed=false
installed_receipt_authenticity_verified=false
host_install_qualified=false
live_process_generation_verified=false
payment_rail_policy_accepted=false
customer_payment_acceptance_authorized=false
one_payment_one_fulfillment_verified=false
wc_void_launch_coupling_verified=false
public_presale_activation_authorized=false
wc_void_activation_authorized=false
funds_movement=false
production_host_evidence_authority=false
```

The report's next action is to return the JSON for the separate
`VOID_BUY_VOID_PRESALE_SOURCE_FREEZE_HOST_INSTALL_QUALIFICATION_V2` evaluator.

Hosted CI executes synthetic fixtures only. It does not claim Precision host
evidence.

**PROTECT THE CORE.**
