# WC/VOID durable opening canonical application v1

Marker:
`VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_V1`

Status: source-only prepare / verify-applied contract.

## Purpose

Merged durable-opening evidence promotion proves real persisted claim binding and
replay-terminal state, then prepares candidate copies with exactly:

```text
production.participant_opening_claim_policy_ready:
  false -> true

production.duplicate_replay_protection_proven:
  false -> true

coupled.gates.opening_claim_transfer_or_refund_binding_ready:
  false -> true
```

Canonical source still keeps those fields false. This contract provides the
separate reviewed Git application lineage required before bounded-canary and
final coupled activation can rely on them.

## Prepare inputs

Prepare requires:

- one absolute, canonical, outside-repository private opening-evidence request
  file plus exact SHA-256; and
- exact serialized durable-opening promotion receipt bytes plus SHA-256.

The existing durable promotion is re-executed. That re-execution reads and
inspects the real persisted claim/replay state referenced by the request and
requires the complete result to equal the supplied promotion receipt.

Authority-bearing promotion/classifier code is **not** imported from the mutable
working tree. The application wrapper first binds a clean repository HEAD/tree,
then creates a private temporary execution tree from that exact Git generation.
The tree receives only reviewed Node package bytes from the merged
`reviewed-node-package-runtime-ethers-v1` profile. Execution uses Node
permissions, a minimal child environment, and the exact reviewed Git generation.

The application wrapper additionally binds one clean repository HEAD/tree and
the exact HEAD Git blobs of:

- production candidate;
- coupled candidate;
- successor migration candidate;
- this application tool;
- durable-opening promotion tool;
- claim persistence inspector;
- replay persistence inspector; and
- both canonical classifiers.

Git reads use absolute `/usr/bin/git --no-replace-objects` with a minimal
explicit environment. Global/system Git config is disabled and command-line
overrides disable fsmonitor, hooks, attributes, untracked cache, preload index
and submodule recursion. Dynamic-loader and Node path/loader variables are not
inherited.

The private reviewed execution checkout is detached at the exact application
base HEAD/tree. The reviewed durable-promotion module is the only allowed module
in its recursive semantic closure with a child-process import, and its child
process is Git. The private process may read the reviewed execution tree plus
the exact private request/data directory needed for real persistence inspection;
it receives no filesystem-write permission. Bare `ethers` resolution is served
from the reviewed package materialization rather than repository/ancestor
`node_modules`.

## Exact delta

The prepared targets may change only the two production fields and one coupled
gate listed above.

Resetting those fields to false must reproduce the exact application-base
candidate bytes.

The source and target classifiers must remain HOLD. The production missing-gate
list may lose exactly:

```text
participant_opening_claim_policy_required
duplicate_replay_protection_required
```

The coupled missing-gate list may lose exactly:

```text
opening_claim_transfer_or_refund_binding_required
```

Every other missing gate stays in the same order.

The plan explicitly preserves:

```text
bounded_canary_green=false
coupled_activation_ready=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

## Plan anti-forgery boundary

The content-addressed plan records exact source/target file SHA-256 and Git blob
identities, evidence IDs, request/receipt hashes, classifier summaries, tool
blobs and application-base HEAD/tree.

Plan validation re-reads the exact application-base commit and independently
re-proves:

- source candidate identities;
- tool/classifier/inspector identities;
- exact three-field source delta; and
- before/after classifier transition executed from the exact private reviewed
  base generation.

Hidden working-tree changes, Git replacement refs, hostile fsmonitor/global
config and ambient dynamic-loader/Node overrides are not execution authority.

A caller cannot add an unrelated target change, recompute target hashes and the
plan ID, and obtain a valid application plan.

## Application

The actual candidate update is a separate reviewed Git commit or PR. It must
apply the exact production and coupled target objects from the plan.

Do not combine this application with ledger/custody, participant-control,
bounded-canary, final activation, runtime/service mutation, deployment, funding,
or public intake.

## Verify-applied

After the exact source commit is merged, verification runs from clean canonical
`main` and requires:

- application base is an ancestor of current main;
- exact target production/coupled Git blobs are present;
- successor candidate is unchanged from the plan;
- application/promotion/claim/replay/classifier source blobs have not drifted;
  and
- both classifiers reproduce the prepared poststate.

A green result remains:

```text
OPENING_DURABLE_EVIDENCE_CANONICAL_APPLICATION_VERIFIED_FINAL_ACTIVATION_HOLD
bounded_canary_green=false
coupled_activation_ready=false
final_coupled_activation_required=true
```

This applied lineage is a prerequisite of #2200, not final activation.

## Authority

No canonical source is written by this tool. The verifier does create and remove
a private temporary reviewed execution tree outside the repository; that
temporary filesystem write is implementation scaffolding, not repository or
runtime mutation.

It performs no runtime/service/RPC mutation, credential/key/wallet/signer
access, transaction construction/signing/broadcast, Chain-2050 write, token/WC
movement, inventory or liquidity action, market/presale activation, or funds
movement. The reviewed child execution does not claim socket-level network
isolation; instead the recursive reviewed semantic closure contains no network
operation and its sole child-process surface is the reviewed Git read path.

Focused proof:

```bash
node scripts/prove_void_wc_void_opening_durable_evidence_canonical_application_v1.mjs
```
