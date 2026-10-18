# Buy VOID presale current-source enforcement successor V1

Marker: `VOID_BUY_VOID_PRESALE_CURRENT_SOURCE_ENFORCEMENT_SUCCESSOR_V1`.

Status: **source-identity acceptance only; presale freeze itself remains unaccepted**.

## Purpose

#3491 fixes one exact presale source snapshot at:

- commit `05614762b1b4638e05e539fd7d20cbf670e1570b`;
- tree `4ade3faff2c3fd8e73f7ab8bf3ce0685e0d0d30e`;
- freeze ID
  `voidbuypresalefreeze2_32bd552dc92df07fd391ee3571f92e5efd80cbb50bd79bc4b8952484511db7f1`;
- repaired #3491 review head
  `d3e7404791622541a4567ddd506f27caba60cfea`.

That freeze deliberately refuses to treat the historical V2 enforcement lock as
current-source authority without a versioned successor.

This gate provides that successor without changing the accepted enforcement set.

## Historical accepted enforcement

Historical V2 remains byte-frozen:

- candidate Git blob
  `4e23ecbb64eb26c14f5ab15af85eb86d59c3a718`;
- candidate JSON SHA-256
  `092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb`;
- accepted lock Git blob
  `589845615654da8b688764377b34296267ac0063`;
- lock JSON SHA-256
  `06af643df1a807a7d2c3582f6650967575d53874d5bf1277a0f1039bbad6ccd9`;
- enforcement set
  `05d7648032223f74a05d89200ef23a76a5265ef2a3a26e52c7f51ce3b33bc852`;
- protected inventory digest
  `224e8c4b63b231e40b1abf4982127a6e2b999724642c4360c10ca21887bbc0a2`.

No historical lock or candidate is rewritten.

## Fixed-source revalidation

The proof verifies directly from Git that the frozen source commit has:

- exactly 49 protected enforcement paths;
- **0** protected-path blob/mode deltas versus the accepted V2 inventory;
- exactly 28 reviewed economic source files;
- **0** reviewed-economic-source blob/mode deltas between the reachable frozen
  source and current HEAD;
- exact reproduction of the accepted hosted and canonical 28-source inventory
  SHA-256 values, without reading `candidate.current_enforcement_parent` or
  requiring any divergent historical commit object.

The existing hosted #3491 exact-head workflows independently prove:

- V4 current-generation census run `39085990140`;
- census cross-node job `117552963378`;
- census artifacts
  `12121310248`, `12120712719`, `12120269195`;
- census receipt SHA-256
  `66415fe46bb98641f14f24ac935861048ff33ed5eba41e407a483dc5424c41e3`;
- protected candidate/lock run `39085990128`;
- candidate cross-node job `117553326261`;
- candidate artifacts
  `12121216148`, `12121340034`, `12121106137`;
- candidate and lock byte identity across Node 22/24/26;
- current built census identity still matches frozen V4;
- accepted enforcement set remains unchanged.

The successor therefore accepts only:

`current_source_enforcement_successor_accepted=true`.

This successor is stacked on source-clear prerequisite #3500 exact head
`296647cdbba6b113be12b2cc808e2e9cabeac5f9`. That prerequisite provides self-contained current-generation
dispatch V2 at blob `35b8b878ba30cfa7567578ab05424d4f827f3220`, with Node 22/24/26 and cross-node GREEN and
no major Codex findings.

This successor's own CI rebuilds the reviewed economic closure on Node 22, 24,
and 26, runs the self-contained V2 current-generation integration dispatch
separately, and then copies the exact frozen V2 candidate bytes. All three lanes
must require:

- frozen candidate SHA-256
  `092a97373013d32dda610df7363587fa3a669f33248a37420b07541d12d892bb`;
- frozen candidate Git blob
  `4e23ecbb64eb26c14f5ab15af85eb86d59c3a718`;
- frozen lock SHA-256
  `06af643df1a807a7d2c3582f6650967575d53874d5bf1277a0f1039bbad6ccd9`;
- byte-identical frozen candidate files across Node 22/24/26;
- byte-identical current-generation integration receipts across Node 22/24/26;
- `frozen_candidate_rederived_on_current_head=false`.

The accepted candidate proof is not weakened or repinned to manufacture a new
current-head candidate. Current source compatibility is proven separately while
the historical accepted candidate/lock bytes remain exact.

The source proof and current-generation helper are self-contained from reachable
frozen/current tree bytes plus committed accepted inventories. They do not depend
on temporary refs retaining historical enforcement/restack commit objects.

## Successor identity

`voidbuypresaleenfsucc1_819fd2dbce9928145023d4077cffc34e2a9ab3a50e51428fc37dda6ca70a18ef`

The suffix is SHA-256 over canonical sorted compact ASCII JSON of the successor
body excluding `successor_id`.

## Deliberate separation from freeze acceptance

This gate does **not** accept #3491's source freeze.

It changes the prerequisite from:

`current_source_enforcement_successor_required=true`

to accepted successor evidence for the exact frozen snapshot.

A later distinct gate may then evaluate:

`void_buy_void_presale_source_freeze_acceptance_v2`.

## Authority

Only source enforcement identity acceptance is true.

The repaired #3491 payment-policy review is a source-policy binding only. This
successor does not itself accept the source freeze or authorize customer
payment.

All of these remain false:

```text
deployed_artifact_generation_verified=false
runtime_mount_authority=false
production_source_finality_authority_ready=false
source_freeze_accepted=false
customer_payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
signing=false
transaction=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

The coupled launch rule remains unchanged: public presale and WC/VOID market
activation are one later gate. This successor neither activates nor prices that
market.

**PROTECT THE CORE.**
