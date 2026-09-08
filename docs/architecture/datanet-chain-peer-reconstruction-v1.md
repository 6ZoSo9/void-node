# DataNet reference reconstruction result v2

Marker: `VOID_DATANET_CHAIN_PEER_RECONSTRUCTION_V1`

Status: source-only, reference-only planner. Result version 2 repairs unsupported
claims in #1464. Independent review of this exact repair is still required.
No authenticated availability, publication, repair or runtime capability is
implemented by this change.

## Responsibility and limits

The V510 partition remains: Chain-2050 owns finalized facts actually proven by
the chain; DataNet owns byte availability and custody; local projections are
disposable or bounded. A digest does not establish finality or retained bytes.

This helper receives caller-created commitment fields and already-acquired
in-memory Buffers. It compares byte length and SHA-256, rejects a forged majority
against the supplied reference digest, and computes deterministic hypothetical
copy counts. A peer majority never establishes truth.

It does not verify a Chain-2050 event, canonical membership, checkpoint policy,
peer authentication, independent custody, replication policy or durable
publication. It does not prove durable future availability. There is no repair
execution, network call, filesystem operation, signer access or funds action.

## Deliberate result migration

The input shape and commitment encoding remain unchanged. The exported helper
names retain their existing v1 names; the planner result has `result_version=2`.

Every public planner result now has:

```json
{
  "ok": false,
  "result_version": 2,
  "status": "DATANET_RECONSTRUCTION_HOLD",
  "evidence_scope": "UNVERIFIED_REFERENCE_INPUTS",
  "verified_independent_replica_count": 0,
  "availability_proven_for_this_evaluation": false,
  "durable_future_availability_proven": false,
  "chain_digest_selected_over_peer_majority": false,
  "reconstruction_authority_granted": false,
  "publication_authority_granted": false,
  "local_replica_admission_authority_granted": false,
  "retirement_authority_granted": false,
  "repair_execution_authority_granted": false,
  "network_or_filesystem_authority_granted": false,
  "chain_or_peer_mutation_authority_granted": false
}
```

The excerpt omits the module marker, reason, authority object and optional
reference-plan/detail fields. The authority object independently reports all
six verification/custody capabilities false.

A valid reference evaluation adds `reference_plan` and reason
`reference_inputs_not_independently_verified`. Invalid input or no matching
payload returns the same operational HOLD boundary, with a specific reason
and no plan. An operational consumer must never treat the existence of a
reference plan, a reference status, or a matching digest as approval.

Legacy top-level `selected_source`, `valid_replica_count`, and successful
availability statuses are removed. The caller scan found only the two focused
proofs consuming this helper; they migrate with it. There is no runtime
consumer to migrate in this repository.

## Five reviewed claim surfaces

| Review surface | Repaired reference behavior | Still required for runtime use |
| --- | --- | --- |
| Peer authentication | `authenticated` is recorded only as `caller_authenticated_claim`. Toggling it does not change candidate selection. Every candidate reports `peer_authentication_verified=false`. No `admitted_reconstruction_source` is emitted. | An independently verified peer/session/trust-policy/retrieval generation. |
| Finalized commitment | `createDatanetChainCommitmentV1` and `validateDatanetChainCommitmentV1` check syntax and self-derived identity only. Invented, earlier or conflicting checkpoint references all remain operational HOLD. | A source-backed event/state binding, canonical finalized membership and current checkpoint policy. |
| Independent custody | `reference_copy_count` counts matching supplied observations. Aliases may refer to the same Buffer or volume; no independence is inferred. `verified_independent_replica_count` remains zero. | Authenticated possession, independent custody domains and designated-host loss/recovery evidence. |
| Verified-byte handoff | The selected candidate binds reference commitment ID, digest and length in an immutable metadata snapshot. `bytes_retained=false`; reacquisition and verification are required. It is never a publication/readmission token. | Exact bytes coupled to authenticated acquisition, failure-atomic publication, fsync/readback and readmission. |
| Replica policy | The caller-selected target is a request for hypothetical copies. Even a target of one produces only `REFERENCE_CALLER_COPY_TARGET_MET`, inside an operational HOLD. The policy digest is a reference fingerprint, not approval. | An independently admitted policy generation and authorized independent-custody floor. |

These are source-interface demotions, not implementation of the missing
verifiers or custody operations. The original review findings require
independent reassessment; this document does not mark their complete runtime
closure criteria satisfied.

## Reference-plan fields and accounting

The nested plan has `evaluated=true`, the same unverified evidence scope,
`reference_commitment`, `requested_policy`, and `reference_policy_sha256`.
Its statuses are:

- `REFERENCE_LOCAL_COPY_NEEDED`: local bytes do not match and a matching peer
  observation exists.
- `REFERENCE_MORE_COPIES_REQUESTED`: local bytes match but the caller's
  requested count is not met.
- `REFERENCE_CALLER_COPY_TARGET_MET`: the supplied matching observations
  meet the caller's requested count, without proving independent retention.

Candidates are selected by matching reference digest/length and object/
commitment identity, then sorted by peer ID and retrieval generation. Caller
authentication claims do not admit or exclude reference bytes. Repair-recipient
labels are hypothetical choices from `caller_accepts_repair_claim`, never
authenticated or executable routing instructions.

The repaired accounting remains:

1. Count matching local/peer observations as `reference_copy_count`.
2. If local bytes do not match, include one `hypothetical_local_copy_count`.
3. Calculate `projected_reference_copies_after_local`.
4. Derive `remote_reference_copies_requested` against `requested_copy_target`.
5. Truncate `candidate_repair_recipients` to that demand.
6. Report `projected_reference_copies_after_plan` and
   `reference_repair_shortfall`.

`missing_reference_copies` is the pre-plan deficit. None of these values
increments an admitted local replica count or reports a completed repair.

## Metadata and byte ownership

All planner-result metadata is detached and deeply frozen, including HOLD details,
reference commitments, policies, selected-candidate bindings and arrays.
Module-owned authority/default-policy objects remain frozen. Caller-owned
policies and Buffers are not frozen, and no Buffer is returned or retained.

The immutable snapshot records what the reference evaluation compared. A caller
can mutate or replace its bytes after return; the old snapshot stays an
operational HOLD. Re-evaluation rejects changed bytes against the reference.
The digest/length binding is useful for later comparison, but it is not an
authenticated acquisition receipt or a custody capability.

## Bounds preserved

Defaults remain 64 MiB per object, 256 MiB aggregate candidate bytes, 64 peers,
a caller target of three and a target ceiling of 16. Absolute ceilings remain
256 MiB per object, 1 GiB aggregate, 256 peers and a target ceiling of 64.
Unknown fields, malformed IDs, duplicate peers, inconsistent generations and
noncanonical numeric inputs remain rejected.

The per-object limit applies to every supplied local and peer Buffer as well as
the reference's claimed byte length. All candidate and aggregate byte budgets
are checked before any supplied payload is hashed, including candidates with
wrong object or commitment identities. An oversized local or peer Buffer
returns `local_payload_bytes_exceed_policy_bound` or
`peer_payload_bytes_exceed_policy_bound`, with observed/maximum byte counts and
no reference plan. Exact-limit inputs remain valid reference candidates.
These checks bound work inside the planner; callers have already acquired the
Buffers and must separately bound acquisition and allocation.

The existing commitment has nine input fields: chain ID, object ID, digest,
byte length, checkpoint height/hash/ID and transaction hash/log index. Its
self-derived ID and uint32 log-index bound are unchanged; neither authenticates
the referenced chain event.

## Verification and remaining gates

The primary proof retains reference-digest, malformed-input, resource-bound,
deterministic-selection and cross-call-poisoning checks. It adds direct
operational-HOLD adversaries for all five review surfaces, injected verifier
claims and immutable metadata. Payload-hash instrumentation verifies that
oversized local/peer candidates, including wrong-identity candidates, cause
zero payload hashing; exact per-object/aggregate limits remain accepted for
reference evaluation. The four-case supplemental proof preserves the
local-copy-before-remote-demand equations.

The parent workflow runs the planner matrix and calls the accounting workflow
at immutable commit `e210cee3cfb52afa5038b0972b7b5419a0c37769`, as required by
the repository Actions reference guard. The runner verifies that this pinned
workflow blob equals the accounting workflow in the current source generation.
Both matrices run Node 22/24/26 and bind the
exact source checkout. The aggregate depends on both matrices. The original
seven paths plus the evidence runner and its adversarial proof are the complete
nine-file source set; all nine trigger the parent workflow on PRs and main
pushes. Accounting is now `workflow_call` only, so all six members share one
run ID and attempt. This deliberately replaces two independent workflow runs.

## Portable hosted proof evidence

`scripts/void_datanet_reconstruction_evidence_v1.mjs` is a separate CI/file
runner; the in-memory planner does not import it. Each matrix job executes the
closed syntax/proof/diff command set and emits one canonical JSON receipt.
Each receipt binds:

- exact source head and tree, nine sorted path/blob/mode entries, and the
  corresponding workflow entry;
- repository, run ID, attempt, event, workflow-definition commit, logical
  GitHub job ID and matrix coordinate;
- exact Node version, major, platform and architecture;
- ordered commands, exit codes, complete bounded stdout/stderr and SHA-256
  output digests;
- closed ordered case-name manifests, their counts and SHA-256 identities;
- `PASS_REFERENCE_PROOFS` and the explicit operational HOLD/false-authority
  vector, including `source_green=false` and `independently_reviewed=false`.

Job identity is the GitHub logical job ID plus its matrix coordinate within
the bound run/attempt; it is not represented as a numeric Actions job ID.
Receipts record exact patch versions and require both lanes for each major to
agree. The workflow source entries must also match the caller's definition commit.
Each job separately binds its actual workflow-definition commit; the accounting
callee pin is carried alongside its unchanged blob identity. Any future change
to that callee file requires a new immutable pin before receipts can pass.
The runner verifies a clean checkout and exact on-disk blobs/modes before and
after execution. Failed commands, signals, timeouts or unexpected stderr cannot
produce a passing receipt. Command output is limited to 64 KiB.

Artifacts are uniquely named by lane, major, run, attempt and head, with
missing-file upload treated as failure. The aggregate downloads only artifacts
for the current run/attempt/head, keeps their directories separate and requires
exactly the six expected names, each containing exactly one regular receipt
file. Receipt contents must match their named lane and major. Symlinks, extra
files and receipts over 256 KiB are rejected. Reads remain bounded even if a
file grows after its size check.

The aggregate derives expectations from its exact checkout and trusted workflow
context. It re-executes the closed proofs on Node 24, compares every saved
command output and case manifest byte-for-byte, and validates the complete
six-member set. It rejects absent/duplicate members, stale attempts, mixed
heads/trees, changed blobs/modes, wrong workflows/runtimes, altered case lists,
substituted output and promoted authority. Merely recomputing a substituted
receipt's digest cannot make it match the source-derived expectations.

The aggregate runs even when a dependency fails and requires both dependency
results to be `success`. Its final artifact contains all six complete receipts,
their digests and the aggregate result; it can be verified without ephemeral
job logs. Artifacts have 30-day retention and must be downloaded for longer
preservation. The aggregate bundle has a bounded size below 1.6 MiB.

At a clean checkout of the independently selected source generation, the
offline verifier accepts explicit trusted coordinates:

```text
node scripts/void_datanet_reconstruction_evidence_v1.mjs verify BUNDLE HEAD RUN ATTEMPT WORKFLOW_DEFINITION_SHA EVENT
```

`EVENT` is `pull_request` or `push`. Obtain these coordinates and the artifact
from the matching GitHub run; do not copy expected values from an untrusted
receipt. The verifier requires the definition commit to be present locally.
It performs no network access. Both Node 22/24/26 and Linux/x64 are supported.

Receipts are unsigned CI records. Canonical hashes establish content integrity;
GitHub artifact provenance supplies their hosted origin. Offline replay checks
consistency against the selected source; it does not cryptographically prove
that a claimed historical job ran. Independent acceptance remains a separate
gate, and neither a complete bundle nor Nimo's 11/11 primitive receipt grants
runtime capability, custody/isolation proof, release acceptance or funds
authority. Nimo evidence cannot substitute for any matrix member.

The primary and accounting suites retain 149 and four cases. The evidence suite
adds 62 schema, substitution, matrix, filesystem, dependency and workflow cases,
for 215 distinct cases. Replaying suites in several jobs adds no distinct cases.
Case-name manifests are emitted by `--case-manifest` only after checks succeed;
their identities are derived from the executed cases, not a duplicated list.

#1462 remains bounded acquisition, not peer or finality verification. #1352 and
#1314 remain frozen under coordination. Future verifier, custody, policy and
publication integration must follow the accepted Boundary successor and its
independent review and designated-host requirements. No Ready/merge or
operational authority is granted here.
