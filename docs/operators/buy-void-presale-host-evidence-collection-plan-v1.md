# Buy VOID presale host-evidence collection plan V1

Marker: `VOID_BUY_VOID_PRESALE_HOST_EVIDENCE_COLLECTION_PLAN_V1`.

Status: **plan/source/CI only; no host evidence has been collected by this gate**.

Plan ID:

`voidbuyhostevplan1_42809a0e54b1adf4537df6ec848d3327299dee2895becd174d60e4f287dae1b7`

Parent host-install classifier:

`#3503 @ 086887b517bf6bf6fab336cbcc56c22471e1a92c`.

The parent remains fail-closed even when metadata aligns:
`HOST_INSTALL_QUALIFICATION_HOLD_INDEPENDENT_EVIDENCE_REQUIRED`.

## Purpose

This plan names the exact existing source primitives for the three independent
host-evidence classes still required after #3503. It does not execute them and
does not convert source availability into host evidence.

The machine-readable `evidence_lanes` interface is closed: the proof requires
exact lane names, exact status fields, exact role names, and exact
`{path,blob}` pairs. Flattening all lane roles must produce exactly the nine
`PRIMITIVE_PINS` entries with no duplicate path. A synthetic in-memory
path/blob mutation is required to fail while the underlying pinned source files
remain unchanged.

All nine pinned primitive blobs are byte-identical on the accepted #3503 stack
and review reference `main@e64049c3f460eae077364567f63aa3298ecf9c31`.
Hosted CI independently checks both `HEAD:<path>` and
`e64049c3f460eae077364567f63aa3298ecf9c31:<path>` against each pinned blob before accepting this
compatibility statement. Later main commits are not auto-adopted.

## Lane 1 — authenticated deployment receipt + live process

Pinned source:

- deployment receipt installer:
  `3de6e4bd1f9aa2e9c0a0889cc7c0ab489cb306c0`;
- V2 live-process receipt publisher:
  `a334ab29477dec3e36862a512191b9701debb73e`;
- V2 same-live-process binding:
  `987c97568a4d1b9814218603df48a65dbfeed18f`;
- protected collection plan:
  `d47a6f99870f385c1bc938adbef74535b78eba1f`.

Current truth:

```text
evidence_collected=false
authenticated_receipt_verified=false
same_live_process_binding_verified=false
```

A later separately authorized host collection must authenticate the deployment
receipt and bind that receipt to the exact retained live process generation.
Source presence alone cannot do this.

## Lane 2 — allocation custody storage + rollback independence

Pinned source:

- rollback-independence classifier:
  `2d5fc24498b569f20701445d6214a8ca31e4f701`;
- live rollback-policy evidence collector:
  `cf40d9d4a19d138d74aee849a6c02f96ee362dbb`;
- second-control composition:
  `97180cc03e3f1b2f9935191ac6aafe4b15307708`.

Current truth:

```text
evidence_collected=false
live_durable_storage_proven=false
rollback_resistance_proven=false
independent_custody_proven=false
```

The source contracts deliberately keep those live claims false until separately
authorized host/storage evidence exists.

## Lane 3 — Epoch-2 installed generation

Pinned source:

- installed qualifier V5:
  `a04c2e7665294cdd142426e9eb01ee27c5292b8d`;
- V5 behavioral proof:
  `c14ec00acffbc55630aa68db0013d97cac068ab3`.

Current truth:

```text
evidence_collected=false
installed_generation_qualified=false
```

The qualifier itself requires a separately authorized read-only installed-host
observation. Hosted CI does not execute that collection.

## Authority

This plan grants none:

```text
host_execution_authorized=false
filesystem_read_authorized=false
filesystem_write_authorized=false
service_mutation_authorized=false
credential_access_authorized=false
wallet_or_signer_access_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
transaction_submission_authorized=false
treasury_or_liquidity_action_authorized=false
funds_movement=false
production_host_evidence_authority=false
```

Next gate:

`SEPARATELY_AUTHORIZE_READ_ONLY_HOST_EVIDENCE_COLLECTION`.

**PROTECT THE CORE.**


## Parent reconciliation

This generation refreshes only the parent host-install classifier provenance after
the #3497/#3498/#3503 reconciliation train. The parent classifier's current exact
head is `086887b517bf6bf6fab336cbcc56c22471e1a92c`; evaluator/proof/doc/workflow
blobs are pinned in the machine-readable plan. No evidence lane, primitive pin,
authority field, or host-execution gate changes.
