# Buy VOID Epoch-2 dormant candidate V3R live binding V3

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V3`.

Status: **source/test/CI only**. No Precision install or live binding is
authorized by this generation.

## Purpose

V2 used one `expectedHead` for two different authorities:

1. canonical source/candidate authentication; and
2. the already-installed V6R2 credential-composition runtime policy.

That was correct while both generations matched. Precision has since proven a
legitimate split:

- canonical source HEAD:
  `0ada7fde0d90c3946b10693f4621cbd690bfcde6`;
- canonical source tree:
  `9e930fba9aacfafb5b163767302786cd7f31c81e`;
- installed V6R2 runtime/policy HEAD:
  `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- runtime tree:
  `de12c9d2d5e475d435d21da3b047d7b63b69e2b7`;
- installed runtime policy SHA-256:
  `746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549`.

The separately qualified compatibility generation proves the source tree is the
runtime tree plus exactly fifteen reviewed ADD-only paths. It does not rewrite
the canonical checkout or installed policy.

V3 makes that split explicit instead of forcing the source HEAD into the
runtime-policy slot.

## Stack and scope

Parent source-evidence generation: PR #3535 exact head
`7ca15a8dffdd83aa9c3f991e6ad8b1ccd5efea23`.

This child is additive only. Its intended owned paths are:

- `ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v3.mjs`;
- `ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v3.c`;
- `scripts/prove_buy_void_epoch2_dormant_candidate_v3r_live_binding_v3.py`;
- this document;
- the focused workflow.

No V2 path is modified.

## Exact source/runtime contract

The future live entry has two distinct required identities:

```text
source_head=0ada7fde0d90c3946b10693f4621cbd690bfcde6
runtime_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
```

The source head authenticates:

- the canonical `main` checkout;
- dormant candidate V4;
- source-side signer-control predecessor evidence;
- the V3 binder generation.

The runtime head authenticates:

- the installed V6R2 policy;
- installed V6R2 native/runner generation;
- the credential live-composition native first entry;
- the sealed credential/signing receipt generation.

Neither identity may substitute for the other.

## Native binder first entry V3

The future protected root is a new namespace:

`/opt/void-buy-void-epoch2-dormant-v3r-binding-v3`.

The V3 native preentry preserves the V2 native-first boundary and additionally:

- requires explicit `--source-head` and `--runtime-head`;
- requires the requested runtime head to equal the root-owned
  `policy-v3.conf` expected head;
- binds both heads into the private parent proof;
- retains the exact V3 binder descriptor;
- streams only the digest-verified binder bytes to Node stdin;
- passes the source head and runtime policy head separately to the binder.

The V3 preentry binds exact V3 binder identity:

- Git blob:
  `f33a670181d7b6a870a8fecefa76b9ec10a769db`;
- bytes: `39250`;
- SHA-256:
  `717c413afffd51ade4ac690f73e19f3f824c805142f4438b15f1e35009945bef`.

The sensitive failure-truth boundary is preserved. Before binder-source release,
credential/private-key/signing authority is false. After release begins, a
parent-side HOLD reports those states as
`unproven_after_binder_source_release`; it must not falsely claim they are
false.

## Binder V3 compatibility qualification

The V3 binder no longer executes the historical installed qualifier directly
against the source HEAD.

A future protected V3 installation must place the exact compatibility V3/V2/V1
sources under the nested protected subtree
`compat/ops/precision/` inside the V3 root. That depth is required so the V3
Python import-isolation guard never collapses its materialized source root to
`/`. The binder descriptor-loads the V3 source,
requires exact byte count and Git blob, and executes those verified bytes under
isolated Python.

The accepted compatibility V3 dependency is:

- path name:
  `void_buy_void_presale_epoch2_installed_generation_host_evidence_v3.py`;
- Git blob:
  `f9e3b1f5501a56e7ce1a191f12507186e79c28d4`;
- bytes: `27024`.

That V3 source independently binds exact V2 and V1 dependencies and requires:

- runtime HEAD `4c80887...`;
- source HEAD `0ada7fde...`;
- source tree `9e930fba...`;
- exactly fifteen reviewed ADD-only source paths;
- current tracked source and index authenticity;
- unrelated untracked paths are not enumerated and are not source authority;
- runtime/source equality for every delegated installed-runtime dependency;
- no canonical checkout rewind or mutation;
- no installed-policy mutation.

The V3 binder requires that compatibility qualification both before and after
credential live composition and requires byte-canonical equality of both
receipts.

## Credential live-composition boundary

The fixed installed credential-composition native remains:

`/opt/void-buy-void-epoch2-live-composition-v3/void_buy_void_epoch2_live_composition_native_preentry_v3`.

V3 passes **only the runtime policy head** `4c80887...` to that native. This
preserves the native preentry's root-owned policy check.

If separately authorized in a later lifecycle generation, that live composition
may:

- read the Epoch-2 credential only in the sealed child;
- prove active signing capability with a non-transaction signature.

It still must keep false:

```text
transaction_constructed=false
transaction_submitted=false
transaction_broadcast=false
rpc_call=false
payment_acceptance=false
customer_safe_to_pay=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
production_host_evidence_authority=false
```

## Binding receipt

A successful future V3 binding receipt must bind both generations explicitly:

```text
source_head=<exact source generation>
runtime_head=<exact installed runtime generation>
source_runtime_add_only_compatibility_exact=true
source_runtime_added_path_count=15
runtime_policy_sha256=<exact installed runtime policy>
```

The receipt remains candidate-only. It does not grant transaction signing,
transaction broadcast, payment acceptance, public presale activation, WC/VOID
activation, or funds movement.

## Current proof boundary

Hosted/source proof may perform only:

- JavaScript syntax;
- binder `--self-test` and `--plan`;
- direct-worktree live rejection;
- stdin invocation without native-parent authority rejection;
- compilation of the native preentry in a disposable directory;
- native inert self-test;
- pre-source and post-source failure-truth self-test modes;
- static exact-blob and control-flow checks.

It must not run the real V3 live path, read Precision credentials, sign, call
RPC, submit a transaction, accept a payment, or mutate a protected host.

## Remaining lifecycle

This source generation is not installable authority by itself. A later bounded
lifecycle must separately define and accept:

1. native/binder/compatibility candidate derivation;
2. candidate lock;
3. materialization;
4. create-only or reviewed atomic protected installation;
5. installed qualification;
6. operation-bound live-binding authorization.

Only after all of those gates may the credential/non-transaction-signature
binding be considered.

Even a future GREEN binding leaves the remaining launch gates:

1. exact Chain-2050 receipt plus acceptable fee/gas funding;
2. current one-payment/one-fulfillment canary;
3. coupled presale + WC/VOID Sovereign activation.

PROTECT THE CORE.
