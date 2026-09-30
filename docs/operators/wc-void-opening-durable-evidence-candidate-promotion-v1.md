# WC/VOID durable opening evidence candidate promotion v1

Marker:
`VOID_WC_VOID_OPENING_DURABLE_EVIDENCE_CANDIDATE_PROMOTION_V1`

Status: source-only promotion preparation. This lane does not create opening
evidence, update either canonical candidate, run a canary, activate WC/VOID or
the presale, access a wallet/signer, submit a transaction, or move funds.

## Purpose

Current main already has reviewed durable mechanisms for:

- one create-once WC/VOID opening replay terminal; and
- one replay-bound persisted opening transfer/refund claim binding.

The read-only inspectors can prove, for one exact coupled launch and one exact
opening cohort:

```text
opening_claim_transfer_or_refund_binding_persistence_verified=true
durable_replay_state_persistence_verified=true
duplicate_replay_protection_verified_for_launch=true
```

But the canonical readiness candidates still deliberately contain:

```text
WC/VOID production:
  participant_opening_claim_policy_ready=false
  duplicate_replay_protection_proven=false

coupled economic:
  opening_claim_transfer_or_refund_binding_ready=false
```

This lane defines the missing source-only admission/preparation step between
**real persisted opening evidence** and a later reviewed canonical-candidate
update.

## Evidence request

The operator supplies one private JSON request containing only the exact opening
inputs needed to re-derive the durable objects:

```json
{
  "commitments": [],
  "coupled_launch_id": "sha256:...",
  "data_dir": "/absolute/path/to/data",
  "dispositions": [],
  "ledger_debits": [],
  "mode": "finalize"
}
```

The request file must be:

- outside the source repository;
- an absolute canonical path;
- a direct regular file opened with `O_NOFOLLOW`;
- private against group/other access;
- bounded to 16 MiB;
- stable by device/inode/size/mtime/ctime during read;
- fatal UTF-8;
- exact two-space JSON plus one terminal newline; and
- equal to an independently supplied raw-file SHA-256.

The replay prestate is **not** caller supplied. The tool derives
`initialWcVoidOpeningReplayStateV1(coupled_launch_id)` itself.

## Real durable evidence only

The preparation function invokes both existing read-only inspectors itself:

1. `inspectWcVoidOpeningClaimBindingPersistenceV1`
2. `inspectWcVoidOpeningReplayTerminalV1`

Both independently re-derive the opening transition from the same exact
launch/cohort input.

The promotion layer additionally captures one shared custody generation for:

- `data_dir`;
- `data_dir/wc_v1`;
- the opening-claim-binding store; and
- the opening-replay-terminal store.

Those exact dev/inode/owner/mode identities must remain unchanged across both
inspections. Two individually valid observations from different swapped store
generations are not composable promotion evidence.

Promotion requires all of the following:

- the coupled launch ID equals the fixed coupled candidate's launch identity;
- claim persistence reports `PERSISTENCE_VERIFIED`;
- replay inspection reports `verified`;
- the claim and replay inspectors return the **same binding ID**;
- claim-binding file SHA-256 is present;
- replay terminal capsule ID and SHA-256 are present;
- durable replay persistence is verified;
- duplicate replay protection is verified for that launch;
- both inspectors retain their exact read-only authority objects; and
- market/presale/funds authority remains false.

A request JSON by itself cannot create promotion truth. Removing either durable
artifact makes the preparation fail closed.

## Reviewed source generation

The canonical preparation function, not its caller, reads the exact clean Git:

- HEAD commit; and
- HEAD tree.

It requires a clean worktree before source/evidence reads and rechecks the same
HEAD/tree and cleanliness after the inspectors complete.

The caller cannot supply Git identities.

The canonical source files are fixed:

```text
ops/mainnet0/wc-void-production-candidate-v1.json
ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json
ops/mainnet0/economic-evm-successor-migration-candidate-v1.json
```

Each is descriptor-bound and raw-file SHA-256 committed into the artifact.
The exact bytes read are also converted to Git blob identity and must equal the
corresponding `HEAD:<path>` blob before promotion can continue. This closes the
ABA case where a candidate file is temporarily replaced, read, then restored
before the final clean-worktree check.

## Exact gate deltas

Before promotion, the actual classifiers must report these missing gates:

Production:

```text
participant_opening_claim_policy_required
duplicate_replay_protection_required
```

Coupled:

```text
opening_claim_transfer_or_refund_binding_required
```

The production candidate copy may change only:

```text
participant_opening_claim_policy_ready: false -> true
duplicate_replay_protection_proven: false -> true
```

The coupled candidate copy may change only:

```text
gates.opening_claim_transfer_or_refund_binding_ready: false -> true
```

The tool reconstructs each original candidate from the promoted copy by
reverting only those named fields and requires canonical equality with the
original source.

After promotion it reruns both canonical classifiers.

The production missing-gate list must equal the prior list minus exactly two
requirements. The coupled missing-gate list must equal the prior list minus
exactly one requirement.

Both candidates must remain `HOLD`.

## What remains HOLD

A green artifact explicitly retains:

```text
production_candidate_file_updated=false
coupled_candidate_file_updated=false
candidate_promotion_application_required=true
bounded_canary_green=false
coupled_activation_ready=false
market_activation=false
public_presale_activation=false
funds_movement=false
```

This lane does not prove or promote:

- WC-ledger persistence / quote-reserve custody;
- market-vault deployment/runtime/inventory state;
- participant post-purchase VoidToken control;
- live bounded-canary success;
- final coupled activation; or
- any value-moving authority.

## Promotion artifact

The create-only private output records:

- repository HEAD/tree;
- exact request-file raw SHA-256;
- exact three canonical source-file SHA-256 digests and matching HEAD Git-blob
  identities;
- coupled launch ID and opening mode;
- claim/replay binding ID;
- persisted claim-binding SHA-256;
- replay capsule ID/SHA-256 and replay transition ID;
- exact promoted production and coupled candidate copies;
- before/after classifier summaries;
- exact named gate deltas; and
- content-addressed `voidwcodecp1_<sha256>` promotion ID.

The output must live outside the repository and is mode 0600.

## Command

After independently reviewing the request bytes:

```bash
node tools/void-wc-void-opening-durable-evidence-candidate-promotion-v1.mjs prepare \
  --request /absolute/private/opening-evidence-request.json \
  --request-sha256 <64-hex-reviewed-file-sha256> \
  --output /absolute/private/opening-promotion.json
```

The output is evidence/preparation only. Applying either candidate copy to
canonical source is a separate reviewed transition.

## Proof

The focused proof uses a disposable private directory and the already-reviewed
persistence mechanisms to:

1. persist one real synthetic replay terminal;
2. publish one replay-bound synthetic claim binding;
3. run the new **read-only** preparation over those files;
4. prove the exact 2+1 gate deltas;
5. prove both classifiers remain HOLD;
6. delete the replay terminal and require HOLD;
8. delete the claim-binding file and require HOLD;
9. reject request digest drift;
10. reject weak request permissions;
11. reject wrong coupled launch identity;
12. prove deterministic replay; and
13. prove create-only private output without modifying canonical candidate
    files.

Synthetic temp-state proof is not production launch evidence.

## Authority boundary

This lane authorizes no:

- canonical candidate update;
- production WC-ledger write;
- WC balance mutation;
- token transfer or refund write;
- credential/private-key/wallet/signer access;
- external RPC;
- transaction construction/signing/submission/broadcast;
- authoritative Chain-2050 write;
- inventory funding;
- liquidity movement;
- market activation;
- public presale activation; or
- funds movement.
