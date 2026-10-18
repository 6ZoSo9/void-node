# Buy VOID presale authenticated receipt + live-process host evidence V1

Marker:
`VOID_BUY_VOID_PRESALE_RECEIPT_LIVE_PROCESS_HOST_EVIDENCE_V1`.

Status: **source/CI-only collector definition; no Precision collection has been run by this gate**.

Parent plan:

`voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab`

This gate implements only lane 1 of #3507:

`authenticated_receipt_and_live_process`.

It does not collect allocation-custody or Epoch-2 installed-generation evidence.

## Purpose

A future separately authorized Precision run can establish two facts that #3503
and #3507 deliberately leave false:

1. the existing root-custodied deployment receipt authenticates the exact source
   generation of the currently retained VOID live process;
2. the existing root-custodied live-process V2 receipt is byte-for-byte the
   receipt derived from that exact retained live-process generation.

Even a GREEN result does **not** make production source-finality authority,
payment acceptance, presale activation, WC/VOID activation, transaction
submission, treasury action, or funds movement true.

## Exact reviewed primitives

The collector is stacked on #3507 and binds these existing sources:

- deployment/source-finality verifier:
  `src/economic/buy_void_source_finality_generation_provenance_v7.ts`
  — Git blob `390ff1a2ff0437cd8c8693e7807c12275df42573`;
- live-process V2 receipt schema/binding:
  `src/economic/buy_void_source_finality_live_process_binding_v2.ts`
  — Git blob `987c97568a4d1b9814218603df48a65dbfeed18f`;
- reviewed receipt builder/source-custody helpers:
  `ops/precision/void_buy_void_source_finality_live_process_binding_v2_receipt_publish_v1.ts`
  — Git blob `a334ab29477dec3e36862a512191b9701debb73e`;
- live selector collection plan:
  `ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts`
  — Git blob `d47a6f99870f385c1bc938adbef74535b78eba1f`.

The collector imports only the publisher module's in-memory receipt builder and
source-custody requalification helper. It does **not** import its create/replace,
retire, rollback, or publication functions.

## Future host collection sequence

A future `--run` requires root because the reviewed selector collection
primitive itself requires root and retained pidfd/process inspection.

Inputs:

```text
--run --runtime-uid <exact live runtime uid> --runtime-gid <exact live runtime gid>
```

The collector performs this sequence:

1. collect live manager/service generation A using the reviewed installed
   selector;
2. require the collection plan's source/launcher/generation flags and all
   publication/presale/funds authorities remain fail-closed;
3. verify the fixed deployment receipt
   `/var/lib/void-source-finality-v7/deployment-receipt.json`
   against generation A's exact source commit/tree;
4. requalify reviewed live source custody using the existing non-mutating
   source-custody helper;
5. derive, in memory, the exact V2 live-process binding receipt for generation A;
6. descriptor-read the fixed installed receipt
   `/var/lib/void-source-finality-v7/live-process-binding-v2.json`
   with root-owned/non-writable ancestry, `O_RDONLY|O_NOFOLLOW`, root:root
   `0444`, bounded size, and pre/post generation checks;
7. require installed receipt bytes to exactly equal the derived canonical
   receipt bytes;
8. collect live generation B through a second independent selector session;
9. require A and B to match on plan ID, manager/service PID generations,
   source commit/tree, invocation ID, cgroup/cmdline identity and runtime IDs;
10. reverify the deployment receipt and source custody for generation B;
11. independently rederive the V2 receipt and require identical receipt bytes;
12. reread the installed receipt and require the same exact bytes.

Any source/process/receipt generation drift causes HOLD.

## Deliberate process execution

This collector is read-only with respect to persistent host state, but it is
**not metadata-only**.

A future authorized host run executes:
- the existing reviewed selector process twice;
- the existing reviewed source-custody requalification child twice.

The report therefore states:

```text
selector_process_execution_performed=true
source_custody_process_execution_performed=true
filesystem_read_performed=true
filesystem_write_performed=false
network_contact_performed=false
receipt_publication_performed=false
receipt_retirement_performed=false
service_mutation_performed=false
```

The existing VOID service is observed, not restarted or mutated.

## Why the service self-verifier is not called

`verifyBuyVoidSourceFinalityLiveProcessBindingV2()` intentionally binds the
receipt to the **calling process**. Calling it from an external host collector
would compare the service receipt to the collector process and would be the
wrong authority model.

Instead this collector independently derives the canonical expected receipt from
the retained service generation and requires the installed root-custodied
receipt file to be byte-identical to it.

## GREEN report

A GREEN report may set only this lane's evidence:

```text
authenticated_receipt_verified=true
source_custody_requalified=true
selector_generation_verified=true
same_live_process_binding_verified=true
installed_live_process_receipt_exact_bytes_match=true
pre_post_live_generation_stable=true
```

It must still keep:

```text
filesystem_write_performed=false
network_contact_performed=false
receipt_publication_performed=false
service_mutation_performed=false
credential_access=false
wallet_or_signer_access=false
signing=false
transaction_submission=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_or_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

## CI boundary

Hosted CI:
- binds the exact #3507 parent plan and four reviewed primitive blobs;
- typechecks the repository;
- runs adversarial/source proof;
- runs collector `--self-test`;
- does **not** run collector `--run`;
- does not inspect a hosted fake service as production evidence.

The real Precision collection remains separately authorized.

**PROTECT THE CORE.**
