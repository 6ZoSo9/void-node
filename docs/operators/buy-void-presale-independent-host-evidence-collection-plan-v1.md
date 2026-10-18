# Buy VOID presale independent host-evidence collection plan V1

Marker:
`VOID_BUY_VOID_PRESALE_INDEPENDENT_HOST_EVIDENCE_COLLECTION_PLAN_V1`.

Status: **source/CI-only non-executing plan**.

## Purpose

#3503 deliberately stops at metadata classification. It cannot turn path
presence into:

- deployment-receipt authenticity;
- live-process source-finality evidence;
- allocation-custody host/storage qualification;
- exact Epoch-2 installed-generation qualification;
- payment acceptance or presale activation.

This gate defines the three independent host evidence collections required
before a later offline composition may classify those facts.

It does **not** run any collector.

## Parent classifier

Bound parent head:

`dfcc2c991fb1496debf4ee1e2007ae9f0237d842`

Bound #3503 sources:

- host classifier:
  `scripts/void_buy_void_presale_source_freeze_host_install_qualification_v2.py`
  at Git blob
  `1c8299cb38e3a02c5e65c3d38d4863e8ee0c1005`;
- classifier proof:
  `scripts/prove_buy_void_presale_source_freeze_host_install_qualification_v2.py`
  at Git blob
  `d42ad28bc00fe383a20eeb6d1c66a7c39cd1b674`.

The parent remains HOLD pending independent evidence.

## Evidence domain 1 — source-finality receipt/live process

Reviewed collector:

`ops/precision/void_buy_void_source_finality_live_process_v2_collection_plan_v1.ts`

Git blob:

`d47a6f99870f385c1bc938adbef74535b78eba1f`

Reviewed validators:

- V7 deployment provenance:
  `src/economic/buy_void_source_finality_generation_provenance_v7.ts`
  at `390ff1a2ff0437cd8c8693e7807c12275df42573`;
- V2 live-process binding:
  `src/economic/buy_void_source_finality_live_process_binding_v2.ts`
  at `987c97568a4d1b9814218603df48a65dbfeed18f`.

Fixed receipt locations are recorded as:

```text
/var/lib/void-source-finality-v7/deployment-receipt.json
/var/lib/void-source-finality-v7/live-process-binding-v2.json
```

The plan names only the read-only collection-plan source. It explicitly excludes
the receipt publisher.

A future execution is sensitive even though it writes nothing: the collector
requires root, executes the locked native selector, reads selected process
kernel/environment evidence, and performs filesystem reads.

The collector's reviewed authority remains:

```text
filesystem_write_performed=false
network_contact_performed=false
receipt_publication_authorized=false
production_source_finality_authority_ready=false
public_presale_activation=false
funds_movement=false
```

## Evidence domain 2 — allocation custody

Reviewed collector:

`tools/void-buy-allocation-custody-host-evidence-v1.mjs`

Git blob:

`ce2892d50a1e5e2a31fc1dd7d8b9974a9034a712`

Operator contract:

`docs/architecture/buy-void-allocation-custody-host-evidence-v1.md`

Git blob:

`10a95c941da517a0ba2e071c6845b17cebf0f708`

The collector requires
`VOID_ALLOCATION_CUSTODY_HOST_EVIDENCE_CONFIG_JSON` with exactly:

```text
repo_root
ledger_root
custody_root
runtime_user
custody_user
ipc_group
socket_path
service_unit
runtime_service_unit
```

It observes reviewed repository bytes, filesystem/mount identity, systemd
policy, runtime process privilege state, Polkit denial evidence and the AF_UNIX
custody boundary.

It remains read-only and does not itself prove monotonic evidence generation or
final production custody authority.

## Evidence domain 3 — Epoch-2 installed generation

Reviewed qualifier:

`ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`

Git blob:

`a04c2e7665294cdd142426e9eb01ee27c5292b8d`

Proof:

`scripts/prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`

Git blob:

`c14ec00acffbc55630aa68db0013d97cac068ab3`

A future run requires an exact current repository HEAD and root execution.

This qualifier is read-only, but it executes the retained installed native
binary's inert self-test twice through a descriptor-bound path. That execution
is explicitly disclosed and remains separately authorized.

It does not execute the live composition runner, access credential contents,
sign, transact, accept payment or move funds.

## Plan output

The plan accepts:

- one lowercase 40-hex expected repository HEAD;
- positive runtime UID;
- positive runtime GID.

It outputs content-addressed JSON containing:

- exact source/blob identities for each evidence domain;
- logical invocation arrays;
- required custody configuration keys;
- expected evidence output names;
- all sensitive authority flags false.

The plan does not accept shell fragments and does not execute its logical
invocations.

## Authority

This gate grants none of the host operations that it describes.

```text
collection_plan_only=true
host_execution_authorized=false
receipt_publication_authorized=false
filesystem_write_authorized=false
service_mutation_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
rpc_call_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
production_host_evidence_authority=false
```

Next gate:

`SEPARATELY_AUTHORIZE_PRESALE_INDEPENDENT_HOST_EVIDENCE_COLLECTION_V1`

After collection, a later offline composition must validate the three evidence
packets together before any stronger host-install claim is considered.

**PROTECT THE CORE.**
