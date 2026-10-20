# VOID Epoch-2 V6R3 repaired first-entry binary candidate lock V2

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_BINARY_CANDIDATE_LOCK_V2`.

**Status: source/CI-only repository binary identity. Draft and uninstalled.**

## Repaired generation and hosted evidence

```text
source_pr=3585
source_head=0c28e7941e701f32bece90f1a892b0b6ce1864c7
source_git_blob=8d06482b5cc313cc1609371493112e737f89abc2
source_first_entry_run=39392551384
source_first_entry_job=118527323517

candidate_pr=3587
candidate_head=51b66221e7d3aa5dfb9d7fdee4429c01d5eb92a9
candidate_script_blob=c25da9c7824ed7833ec99e1c000a55d37a2cd674
candidate_workflow_blob=34d40766789f1f41bee6dbb94bb6740bf400c86f
candidate_run=39414505654
derive_a=118600112860
derive_b=118600113154
derive_c=118600113258
compare_job=118600636580

candidate_id=voidbuye2v6r3planfirstentrybincand2_43b60401a5b08fde519fa8d21fbf0b08111bd75183e7a50e79a5c9238da7f990
binary_sha256=b3043169c466ab96a953d00fedd960817e982bf45897ac6b3259baaaeb0e81dd
binary_bytes=813184
lock_id=voidbuye2v6r3planfirstentrybinlock2_b5e1bbca28ed7aad579ac7f37a7575ed90eadd44f73d24edac79df3cc74664c1
```

Three independent Ubuntu 24.04 hosted jobs built the exact repaired native C twice each.
Each V2 candidate report binds the reviewed C Git blob/SHA-256, fixed compiler and
recipe, reproducible static ELF bytes and absent `PT_INTERP`, exact self-test transcript,
and the new securebits/capability-set and root-opened stdout/stderr controls. A fourth
hosted job compared the **canonical candidate JSON byte strings** and succeeded.

The repository lock embeds the entire report and the hosted source/candidate proof
provenance. Its `lock_id` is SHA-256 of canonical JSON with the `lock_id` field
excluded. Its verifier re-derives the candidate in a disposable workspace and rejects
permission overclaims. No built production ELF is published by these Actions.

The old #3573/#3574 binary `986e860593a1aaef34dc6d1ffbd44f626a2bed9512d96be79f1fbcfdc176f2cd`
attests pre-repair source. **Never use that lock for this generation.**

## Negative authority

```text
independent_security_review_satisfied=false
python_runtime_closure_accepted=false
post_exec_dumpability_isolation_accepted=false
production_binary_install_authorized=false
protected_install_authorized=false
installed_binary_identity_proven=false
host_plan_authorized=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
```

## Next gate

`void_buy_void_epoch2_v6r3_plan_first_entry_python_runtime_closure_v2`.

The existing Python/Git and post-exec dumpability contracts from #3575/#3580
still reference the obsolete V1 lock; they **do not** automatically qualify these
new bytes. A separately reviewed current host-specific runtime closure, independent
security review, create-only protected installation and operation-scoped read-only
host plan are required. Source CI grants no signer, payment acceptance or presale
activation authority.

PROTECT THE CORE.
