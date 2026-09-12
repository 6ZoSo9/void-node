# DataNet V45: recovery evidence, bundle authority and continuous custody

## Status and scope

This is a source-only descendant of V44/#1504 at
`d73512174afd4f1f0f2591b11ae6bb9955e203ba`, in the existing #1505 lane.
The custody revision expands that PR from nine additive files to eleven: a
custodian/transport module and a focused integration proof join the existing
workflow, contract, operator document, supervisor, runner and four producer /
verifier programs. No accepted parent file changes. The closed source wall has
97 files, up from 95.

**Source, component-test, hosted-run and independent-acceptance states are
separate.** A successful program or hosted job does not grant acceptance. The
source fixture keeps observed acceptance false, and the downstream JSON now also
reports `v45_full_stack_evidence_composition_accepted=false`. Exact-head hosted
Node 22/24/26 execution, archive/log review and independent review remain required.

## The unchanged storage experiment

The storage branch of the V45 runner still executes the accepted V41 campaign,
V42 snapshot, V43 simulated sudden-device-loss / journal replay, and V44 raw
one-byte corruption detection on the same recovered R0 image. Accepted parent
blob identities, the V41 27-lifetime / peak-nine subcampaign target, the 15,372-call
/ 960-MiB payload ledger, and the storage capability-release requirements are not
relaxed. The new shell modes orchestrate existing phase commands; they are not
additional storage experiments.

This revision does not repair #1494 recovery authorization, redefine root+K,
prove public-peer availability, or alter Chain-2050 authority. The existing
#1352 and #1314 acceptance/release holds remain independent.

## Fixed threat boundary

The bounded custody claim concerns an actor changing the disposable **evidence
namespace**. The source-admitted coordinator, prestarted custodian, inherited
channel/descriptors, kernel and GitHub's run/job/log service are trusted. The
claim does not extend to arbitrary same-UID ptrace/process-memory access,
malicious admitted source, a compromised custodian, a compromised runner or log
service, root/kernel compromise, or host authentication.

There is no writer registry, new persistent key, signature or on-chain identity.
Producer PID, exact resolved argv hash, producer-source hash, head, tree, node
major, run and attempt are local execution bindings. They must not be presented
as an authenticated VOID participant identity.

## Phase bundle authority

A long-lived, source-distinct custodian starts **before** any phase producer. Its
control channel is an inherited Unix socketpair; there is no named listening
socket or network listener. The custodian does not import candidate or publisher
verification logic.

For each normal phase:

1. The supervisor creates all outputs and a separate provisional source-receipt
   inode, initially empty, using the existing same-filesystem staging mechanism.
2. It sends the original descriptors and anchored destination-directory
   descriptors to the custodian. The custodian checks empty regular-file shape,
   single-link identity, and parents; retains read-only handles; and acknowledges
   readiness before the writer starts.
3. The supervisor starts the exact allowlisted producer, records the actual PID,
   argv and source binding, waits for zero exit, and revalidates the retained
   source snapshot. Borrowed input descriptors are read-only; the producer does
   not inherit the writable control channel.
4. It constructs the canonical source-execution receipt from staged descriptor
   bytes. The custodian reads the original objects, independently compares their
   hashes and roles with that receipt, and checks producer/context binding.
5. Outputs are published with `renameat2(RENAME_NOREPLACE)`. These individual
   names remain **provisional**. The source receipt is published last.
6. The custodian checks the original descriptors and terminal names again and
   only then commits the bundle to its protected in-memory ledger. Later readers
   cannot obtain that bundle until this commit succeeds.

Several renames are not one atomic filesystem operation. This design provides
all-or-nothing **authority/admission**, using a manifest published last plus the
live custodian's completion—not all-or-nothing visibility. A self-hashed receipt
or its mere presence is not an authority.

If the third role collides after two publications, the first two names remain
provisional, the foreign third object is preserved, and no source receipt or
custody completion is emitted. The session cannot lend pending objects or export
an accepted capsule. There is no unlink/rollback/retry fallback.

## Continuous reader handoff

The custodian retains each original output and receipt after the producing
supervisor exits. Before another phase starts, it checks all committed identities,
bytes and final names, then lends read-only original descriptors with a sealed
anonymous-memory descriptor map. That map is passed directly to the next child;
it is not a JSON trust file in the evidence directory.

Candidate A, controls B, terminal verifier C and downstream verifier D use this
handoff for local artifact reads. The reader opens a new read-only description
through `/proc/self/fd`, checks it against the protected map, and uses those bytes
for semantic validation. It does not establish origin by opening the evidence
pathname anew. Missing custody, changed identity, unsealed maps and name changes
fail closed. Existing independently implemented semantic reconstruction and
exact-argv contracts remain in place.

The A→B→A fault controls run against disposable copies. Their deliberately changed
files are not the custodian's originals. Their output/control receipts are still
source-supervised and become committed inputs to the real verification path.

### Nested runner boundary is explicit

V41–V44's legacy child-owned evidence files are imported into retained custody at
the **supervised runner completion boundary**. They are not retroactively claimed
to have been prebound before each nested producer created them. Their capsule
object records use `origin=nested_runner_boundary`, and
`nested_producer_prebinding_proved=false` remains explicit. This revision closes
the V45 supervisor-to-verifier handoff; it does not silently promote that into a
proof covering every inner write throughout the historical parent campaign.

## Artifact upload and downstream trust

Closing a supervisor while leaving only a mutable receipt beside its outputs
would reopen the original gap. The session therefore exports a capsule from the
retained objects, verifies them again, and obtains sealed capsule bytes from the
custodian. The capsule contains the original evidence plus one custody summary
binding per-object identity, size/hash, producer phase, and prebound versus
nested-boundary origin.

The supervisor emits one canonical capsule digest/context line to the CI job log
**before** writing the upload copy. The log service, not a co-located digest file,
is the independent commitment authority for this bounded hosted proof. Replacing
the upload copy cannot replace the earlier recorded digest.

`actions/upload-artifact` uploads exactly `capsule.zip`. The outer Actions ZIP
retains its existing API digest check. Downstream D additionally:

- lists jobs for the exact run attempt, requires one successful `full-stack (N)`
  job for each of 22/24/26, and requires the successful custody-session step;
- fetches each job's logs through the Actions API and requires exactly one
  timestamped commitment line with the exact head/tree/node/run/attempt;
- rejects missing, duplicate, malformed or wrong-context commitments;
- checks the inner capsule bytes against that independently fetched digest
  before admitting members or self-hashed receipts;
- verifies the custody summary and original per-node artifact inventory, then
  preserves the previous independent source/attempt/semantic checks.

No authorization header follows a signed storage redirect. Archive and log reads
remain bounded. Unsupported response shapes fail closed. Live hosted log/redirect
behavior still requires a fresh hosted run; local parser tests are not that proof.

The downstream session exports its own capsule and log commitment for the final
external audit. A later audit must check that top commitment as well; the top ZIP
is not self-authenticating.

## Mandatory focused controls

`prove_datanet_v45_custody_integration_v1.py` runs before the storage campaign in
every node job. Its result and source-execution receipt are required members of
the candidate, terminal and downstream evidence sets. Those independently check
the case list and the decisive collision/consumer-rejection predicates.

The 15 cases cover normal completion; distinct/identical third-role collisions;
unsupported publication; paired, identical and in-place replacement; receipt-only
replacement; parent replacement; substitution after lending; unsealed/missing
custody; altered capsules; duplicate log commitments; and stale attempts.

These are disposable Python integration controls with **synthetic candidate
inputs**. They exercise the real supervisor `run()`, the real three-output
controls producer, the persistent custodian, and the real candidate/terminal/top
entry guards. The timing hooks are test-local wrappers around the production
no-replace call, not an exposed operator mutation mode. The failed-session tests
call the actual consumer entry points and require refusal before any aggregate
output; they do not claim a fresh storage-campaign run.

## Process accounting

The existing `strace` measurements and ceilings still apply only to the storage
runner subgraph. The long-lived coordinator/custodian, descriptor handoffs,
integration controls, capsule construction, log reads and uploads are outside
that trace. Their ledger entries are explicitly untraced/unknown. Neither the old
245/240/10 runner observations nor the old full-workflow lower bounds are claimed
as new-generation measurements. Complete process/lifetime/concurrency acceptance
remains false until independently measured.

## Operator failure handling

A pre-child conflict and a post-child partial publication are different outcomes.
For a post-child failure, `VOID_V45_PHASE_QUARANTINE_V1` reports the phase and each
known original, visible and staged identity, with which names this attempt
published. An unavailable observation is stated rather than replaced by a guessed
identity. The failed bundle remains non-authoritative.

Preserve the whole failed attempt for review. Do not rerun in that directory,
blindly remove finals/staging, overwrite a sentinel, or salvage an apparent GREEN
receipt. A later authorized attempt uses a fresh namespace. Disposable test-fixture
cleanup is not permission to delete operator evidence or live state.

## Acceptance and non-claims

Keep #1505 Draft. After the final integrated source commit, require a naturally
triggered first-attempt Node 22/24/26 run plus downstream, independent capsule /
ZIP / member / log audit, and fresh source-bound review. Any source change stales
older evidence for the changed generation. No runtime JSON independently grants
review, merge, release or production authority.

No claim of literal physical power or volatile-cache loss, arbitrary corruption
coverage, public-peer retrieval, general DataNet availability, Chain-2050 finality,
deployment, service changes, wallet/signing activity, transactions or funds movement.
