# Buy VOID Epoch-2 live-binding source/runtime compatibility contract V1

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_BINDING_SOURCE_RUNTIME_COMPAT_CONTRACT_V1`.

Status: **source/test/CI only**. No Precision execution, installation, credential access, signing, payment acceptance, activation, or funds movement is authorized.

## Observed host state

The separately authorized Precision evidence established:

- canonical source HEAD `0ada7fde0d90c3946b10693f4621cbd690bfcde6`;
- canonical source tree `9e930fba9aacfafb5b163767302786cd7f31c81e`;
- installed runtime/policy HEAD `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- installed policy SHA-256 `746cfbe2f031868fff3a75f8307986f25c62460085f41a4827e712702a2d6549`;
- exact source/runtime compatibility: 15 ADD-only source paths, no modified/deleted/renamed pre-existing runtime paths;
- installed generation qualification GREEN through the reviewed V3 compatibility host-evidence path;
- no installed-policy mutation and no canonical checkout rewind.

The runtime policy is therefore valid historical runtime authority and **must not be rewritten merely to equal current source main**.

## Exact seam

The current dormant binding V2 and credential live-composition runner V3 each use one `expectedHead` for two different identities:

1. canonical source checkout identity; and
2. installed runtime/policy identity.

That assumption became false after source-only main advances.

The outer dormant native preentry V2 additionally requires the requested head to equal the installed live-composition policy head before streaming the binder. The credential native preentry V3 has the same policy-head equality, but that boundary is correct for the runtime-sensitive credential flow.

## Required successor split

The repair must preserve two independently authenticated identities:

- **runtime head**: `4c80887...`, used for installed V6R2 policy/native/runner qualification, sealed credential/process evidence, and the credential live-composition sensitive sequence;
- **current source head**: observed from local `main` at runtime, required to descend from `4c80887...`, with zero tracked checkout drift and exact runtime/source identity for the credential qualifier and sealed probe.

Required implementation order:

1. credential live-composition runner V4 adds source/runtime compatibility while retaining runtime-policy head for the sensitive sequence;
2. a V6R3 runner/policy candidate-lock/install/qualification lifecycle upgrades only runner/policy as required; the existing credential native preentry V3 binary remains valid and policy-bound;
3. dormant candidate live-binding V3 adopts the same two-head evidence model;
4. dormant binder native preentry V3 candidate-lock/install/qualification binds the new binder byte identity.

No layer may silently reinterpret source HEAD as runtime-policy HEAD.

## Authority

Always false in this contract:

```text
host_execution_authorized=false
filesystem_mutation_authorized=false
canonical_checkout_mutation_authorized=false
installed_policy_mutation_authorized=false
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

Next source gate: `IMPLEMENT_EPOCH2_CREDENTIAL_RUNNER_V4_SOURCE_RUNTIME_COMPAT_SOURCE_ONLY`.

PROTECT THE CORE.


## Step 1 source implementation

The first required successor is now present in this Draft as:

`ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v4.mjs`.

This V4 source is **not installed** and grants no live authority. It preserves the existing installed native preentry V3 fixed-path/policy boundary and V3 confirmation token, but replaces the runner's historical single-head checkout requirement with an exact source/runtime compatibility check:

- runtime head is fixed to `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- runtime head remains fixed to `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- current source HEAD/tree are observed from local `main` during the sensitive sequence;
- current source HEAD must descend from the runtime head using local Git objects only;
- tracked checkout drift is rejected while unrelated untracked paths remain non-authoritative;
- credential-qualification and sealed-probe Git blobs must be identical at runtime and the observed current source head;
- the observed source compatibility snapshot must remain byte-for-byte stable before/after the sensitive sequence;
- all live Git observation runs with global/system config disabled, replacement objects disabled, lazy fetch disabled, prompts/askpass disabled, and all Git transports denied; missing objects HOLD locally rather than contacting a remote;
- the sensitive sequence continues to use the runtime head authenticated by the installed native preentry.

The V4 receipt adds explicit source-checkout compatibility fields while keeping transaction/payment/activation/funds authority false.

Next source gate after exact-head CI: derive the V6R3 runner/policy candidate-lock/install/qualification lifecycle. The existing credential native preentry V3 binary remains intentionally unchanged.

## CI-only execution-path correction

The production target remains deliberately bound to fixed `/usr/bin/node` through
the installed native-preentry policy. Hosted CI is not the production host and
must not pretend that its toolcache layout is `/usr/bin/node`.

The focused Python source proof therefore resolves `node` from the hosted CI
`PATH` only for inert `--self-test` / `--plan` execution. This does not alter
the live runner's fixed target-host `NODE="/usr/bin/node"` constant or installed
policy identity.

The workflow also pins `actions/checkout` to the repository-reviewed immutable
commit and disables persisted checkout credentials. These are CI provenance
controls only; they grant no live authority.


## October 19 self-invalidating-head repair

The first Runner V4 draft compile-bound `SOURCE_HEAD=0ada7fde...`. That was
correct for the observed Precision baseline but incorrect for an installable
long-lived runner: merging the source PR would itself advance `main` and make
that fixed source-head predicate fail.

Current Runner V4 removes fixed current-source HEAD/tree constants. It preserves
the fixed runtime/policy head and instead requires local source ancestry, clean
tracked state, exact runtime/current dependency blob equality, disabled Git
transport/lazy fetch, and a stable source snapshot across the sensitive window.

The earlier Runner V4 candidate/lock generation is superseded by this source
repair and has no installation authority. Candidate/lock evidence must be
re-derived from the repaired Runner V4 blob.


## October 19 privileged-read provenance and namespace repair

Runner V4 advanced again after exact-head review found two remaining source defects:

1. source/runtime dependency equality covered only the top qualifier and sealed probe while root execution consumed the full eight-file qualifier closure;
2. authenticated in-memory root modules still received `__file__` paths under the user-owned canonical checkout.

The repaired Runner V4 blob is now
`4e84b6eb77c284ecf7d85b609cec4d1cf130c7a7`.

The repair now requires one immutable source/runtime dependency set containing all
eight qualifier-closure entries plus the sealed probe. Every entry must equal its
reviewed blob at both runtime head and current source head before root Python may
start. A nested-current-source drift adversary must HOLD.

Root module `__file__` values now live only beneath the fixed synthetic namespace
`/__void_authenticated_qualifier_closure_v1__`. Runner V4 requires that namespace
to have no filesystem entry (including dangling symlinks) before and after the
root child. The bootstrap contains no canonical user-checkout closure path. All
known content readers remain in-memory overrides, so any missed/future pathname
read fails closed instead of entering `/home/zoso/dev/void-node`.

This source advance supersedes the currently published V6R3 candidate/lock/plan
identities. Those artifacts retain **no authority for this repaired Runner V4**
and must be rederived only after fresh exact-head proof.

No Precision host run, credential/private-key access, signing, transaction,
payment/activation, service mutation, or funds movement is authorized.


## Runtime-release sealed-probe repair

Exact review of the main-based integration found that historical sealed-v2 still derives its reviewed source root from `process.cwd()` and requires that Git checkout to equal the runtime expected head. Running it from the mutable canonical source checkout would therefore HOLD once source main advances beyond the installed runtime.

Runner V4 now separates those roots explicitly:

- outer source compatibility is observed against canonical `/home/zoso/dev/void-node`;
- every outer Git command pins exact `--git-dir` and `--work-tree`, preventing local `core.worktree` redirection;
- the sealed credential probe runs as runtime UID with cwd fixed to `/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- `/`, `/opt`, `/opt/void-node-live`, its `releases` directory and the exact runtime release root must all resolve canonically and remain root:root, direct directories, non-group/world-writable before the probe;
- the historical sealed probe retains its own exact Git HEAD/tree/branch/tracked-authority-file checks against runtime head `4c80887...`;
- current source ancestry/dependency checks still bracket the full sensitive sequence.

This source repair does not run the probe, access credential/key material, sign, transact, accept payments, mutate services, activate presale/WC, or move funds.
