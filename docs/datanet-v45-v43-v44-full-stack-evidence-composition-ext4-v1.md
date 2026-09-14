# Local owned-producer integration checkpoint — full workflow remains HOLD

This candidate connects direct V45 Python producers to the real custodian
LAUNCH/CHECK/COMMIT path. It is **not a runnable full-matrix replacement yet**.
The inherited V41–V44 static entrypoints and privileged traced Bash runner have
no reviewed owned-launch profile. The supervisor rejects these before output
creation; there is no legacy registration fallback. No new full matrix,
publication, merge, or operator-host run follows from this document.

Published head `5521cc244915fda0ecc55a60848674e12181a9ec` used only
`supervisor_reported_producer_metadata`; its independent producer identity,
exec, output-capability coupling and subtree-retirement flags must all be
interpreted as false. This candidate sets these fields true only in a direct
phase receipt after actual custodian observation. The fixture's workflow-level
flags remain false. An internally consistent receipt alone is not independent
provenance; live retained custody or an independently log-bound capsule is still
required. The trusted coordinator still authorizes the phase/source/argv.

Focused controls exercise the actual custodian before COMMIT: caller identity,
forged launch/receipt observation, invalid preparation, live descendants,
foreign/queued writable pipe references, and output changed outside captured
streams. The SCM_RIGHTS controls explicitly inject one anonymous socket into the
local fixture observer; that facility is not exposed through production LAUNCH.
The original three-output controls program also runs via the real supervisor,
with explicitly synthetic candidate inputs. Neither is a storage campaign.

The historical published-generation minimum is 6,957 process lifetimes and
7,024 successful executable entries. It is a reviewed lower bound, **not a
measurement of this changed source**. Full-workflow counting, tracing composition,
unsupported launch profiles and nested-writer prebinding remain open. The
512/384 runner limits must not be relabeled as workflow limits.

The V666 revision retains kernel exec observation for the owned process tree
until exit. This direct-Python profile admits exactly one executable entry: the
sealed initial root. Direct Python argv and every matching phase contract now
include `-S`, disabling optional site initialization as well as the existing
`-I` isolation and `-B` bytecode suppression. This avoids admitting environment
startup hooks or their threads as producer code. Fork/vfork descendants are observed before resumption and
may run inherited code, but any subsequent root or descendant exec is rejected
at its kernel exec stop. Thread/non-SIGCHLD clone profiles are rejected before
resumption. The observer uses no arbitrary-process attachment or process-memory
or register access. Unsupported tracing fails closed.

A successful phase requires the complete owned trace tree to retire, plus EOF
on every declared stream. EOF alone never permits early admission. The bounded
trace ledger records births, exits, and exec refusal; its 64-task/4,096-event
ceilings are local phase bounds, not a complete workflow census. Signals with
unimplemented group-stop semantics also fail closed.

The canonical COMMIT suite now has 22 cases (three valid, 19 refusals), including
same-PID re-exec, child and grandchild exec, re-exec after closing all output
streams, and thread creation. The existing required custody-control result embeds
this suite; all three consumers reject a missing or invalid embedded result.
This closes receipt-level control wiring without claiming the full workflow runs:
its selftest orchestrator, helper-spawning phases, inherited V41–V44 scripts and
privileged runner still need reviewed execution profiles. They must not be
silently allowed by broadening the single-exec policy.

This observation does not attest arbitrary Python dynamic code, imported code,
external writers, or every nested storage writer. An external pipe holder that
later closes is evidence of stream retirement, not independently verified writer
provenance. Nested prebinding, helper admission, tracer composition, and full
resource accounting remain HOLD before any matrix or source publication.

The legacy design sections below describe retained byte custody and later
workflow goals; their full-workflow execution statements are not acceptance of
this gated candidate.

---

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
3. For the supported direct V45 Python profile, the custodian launches the
   admitted sealed entrypoint, retains a pidfd, and observes its initial exec and
   declared output pipes. The producer never receives writable evidence-file
   descriptors. All role streams and the owned subtree must retire before the
   custodian populates the provisional regular outputs. Caller-supplied producer
   PID/observations are rejected; they cannot authorize CHECK or COMMIT.
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

## Closed read-only helper profile — local integration, not workflow acceptance

`OWNED_TREE_READONLY_HELPERS_V1` covers the direct `v45-static`, `runtime`,
`candidate-aba`, `candidate`, `producer-control`, `terminal-aba`, and `finalizer`
phases. It is not a general helper registry.
The custodian derives a fixed source-defined plan before starting each producer.
`v45-static` uses five requests (control-fixture Git object, three source-inventory
Git queries, and Bash syntax checking); `runtime` uses five (control-fixture,
Node version, and three source-inventory queries); normal `candidate` uses eight
(control-fixture, Node version, and two source-inventory passes). `candidate-aba`
is intentionally a one-helper prefix: its expected-success control path executes
`load_control()`, pauses for generation interposition, and must reject at
`snapshot.assert_stable()` before runtime/source-inventory helpers. Requiring the
normal eight-helper candidate plan there can mask the intended
`HOLD_V45_ARTIFACT_GENERATION_CHANGED` with `HOLD_V45_HELPER_PLAN_INCOMPLETE`.
`producer-control` and `finalizer` each use five terminal-verifier requests in
source order: control-fixture query, three source-inventory Git queries, then
Node version. `terminal-aba` is another one-helper prefix: `config()` runs the
control-fixture query before the generation pause, and the expected rejection
occurs before reconstruction can issue source/runtime helpers.
Each admitted request must execute once, in source-defined order, as a direct
child. The root cannot re-exec into a helper; grandchildren, unapproved commands,
duplicates, omitted calls, altered arguments/environment/working directory, and
unsupported thread clones refuse before COMMIT.

Executable files are held open and hashed with bounded reads; the kernel-visible
executable object and arguments are checked at each owned exec stop. Bash's
syntax input is an admitted sealed copy, not a later-opened pathname. Both the
root and helpers remain under observation until retirement. Tool shared libraries
and interpreter-imported code remain within the trusted host runtime, not a newly
proved dependency sandbox. Source and phase authorization still belongs to the
trusted coordinator. No arbitrary process attachment or memory/register access
is used.

The default required custody result includes `readonly_helper_controls`. A, C and D require all 18 exact cases: seven valid fixture-root runs and eleven
rejections through actual custody COMMIT/export and missing-custody entry guards.
The existing owned-tree and writer-retirement tests remain mandatory. The
`--real-static-helper-profile` test separately runs the actual exact-source V45
static phase through the supervisor, custodian, receipt-last publication, capsule
export, and the three producer-receipt validators. A static source check is not
a storage campaign or an executed Node 22/24/26 matrix. The helper fixture using
`node --version` is not the complete runtime-tool inventory.

Observed owned-tree task counts are source-defined by phase: six for `v45-static`
and `runtime` (one root plus five helpers), nine for normal `candidate` (one plus
eight), two for `candidate-aba` (one plus the pre-pause control helper), six for
`producer-control` and `finalizer` (one plus five), and two for `terminal-aba`
(one plus the pre-rejection control helper).
Source-snapshot Git processes, orchestrators, control workers and uploads remain
outside those counts. The historical published
6,957/7,024 lower bound is not this proposal's complete measured workflow census.

Inherited V41–V44 source handoffs, selftest/helper orchestration beyond these two
closed profiles, the privileged storage runner, nested-origin prebinding and
complete resource accounting remain unsupported/unproved. Global workflow
provenance and acceptance flags remain false. Do not publish this partial
proposal or start a full matrix until those gates are reconciled.

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


## Explicit scoped resource capture — not V667 resource-ledger closure

The existing owner can now collect read-only Linux x86-64 syscall-stop metadata
with `PTRACE_GET_SYSCALL_INFO`. It does not create a second tracer, attach to an
unrelated process, read/write registers or process memory, change syscall results,
or store syscall arguments, payload contents or pointer values in this ledger.
The first root exec is the capture boundary. Its return stop and a newborn's
fork return, when observed, are explicit boundary returns, not fabricated entries.

This capture is selected by the prestarted local custodian, not an RPC caller.
The local controls exercise actual LAUNCH/CHECK/COMMIT and export. Captured totals
include observed task generations/execs, paired syscall entries/returns/errors,
selected scalar-I/O return bytes, captured-stream bytes, stopped-task FD samples
and an ordered-event digest. Terminal calls without a return stop and unfinished
calls on refusal are retained explicitly. Detailed pointer arguments are discarded.
All three source consumers verify optional scoped ledgers and their bindings.
No ledger means no measured syscall claim; it does not imply zero resource use.

A stopped-task FD sample is not the exact global peak, nor is the maximum number
of outstanding trace records an exact physical live-process peak. I/O syscall
return counts include data read/written more than once and are not unique evidence
bytes, physical storage bytes, or SCM_RIGHTS descriptor counts. Parent `/proc/io`
counters are not summed with children because those counters can already include
waited-for child work. Unmeasured whole-case values remain null, not zero.

The bounded capture's syscall-stop, task, FD-sample and returned-byte limits fail
before custody COMMIT. A triggering operation may already have occurred inside
the disposable producer; these are observation/admission limits, not a syscall
sandbox or kernel pre-allocation quotas. Refusal never promotes a partial capture
to complete. Cleanup occurs outside the capture and remains an explicit gap.

The separate selected resource-control suite and real-static capture are local
verification modes. They are not enabled in the full workflow and do not resolve
its unsupported launcher, nested-origin, or resource-accounting gates. Complete
per-case telemetry must still cover supervisor, custodian, observer, worker,
consumer, replay, external receiver and failure-cleanup processes, conserve the
combined suite totals, and enforce the remaining limits. The inherited 6,957 /
7,024 figures describe only the published baseline, not this candidate.

## Opt-in local static-case accounting join

The local `StaticCaseResourceCapture` review path launches only the fixed actual
static-resource proof. It records the outer driver, source-supervisor function,
three consuming validators, source-query subprocesses and persistent custodian.
Driver, supervisor and validators share one process in this fixture; they are not
counted as three invented process lifetimes. The recorder verifies the sealed
custodian source at its exec stop, then leaves that custodian's child tracing to
the existing producer observer. Successful fork returns and pidfds bind each
outer-to-inner delegation. It does not attach a second tracer to the producer.

`--real-static-case-resource-profile --output /absolute/new/result.json` in the
existing custody test script performs the fixed source handoff and independently
reconciles the two recorded scopes. It requires unique task generations, matching
parent generations, terminal pidfd observations, one-to-one delegation coverage,
disjoint outer/inner task sets and recomputed syscall/byte sums. A digest is not a
signature: this is a trusted local observer result, not independent CI attestation.
No default workflow, canonical receipt or source-consumer acceptance gate is relaxed.

For the current 97-path source wall, this fixture predicts 103 read-only Git-query
processes, one shared driver/supervisor/consumer process and one custodian, plus
six inner producer/helper processes. Measured counts must agree; predictions alone
are not evidence. The outer capture records the fixture custodian's intentional
SIGTERM shutdown as a terminal event, not a zero exit. It measures that shutdown
path; failure cleanup performed by the collector remains outside successful capture.

The combined scalar I/O totals count transfers by disjoint tasks; the same bytes
may cross a pipe more than once. Peaks cannot be added. FD samples and outstanding
trace-record peaks remain scoped samples/order-dependent records, not exact global
peaks. Producer pre-initial-exec setup, the outer collector/bootstrap, complete
SCM_RIGHTS descriptor counts, all other test cases and conserved whole-suite totals
remain unmeasured. `whole_case_complete=false`, `complete_resource_ledger=false`
and `full_job_process_census=false` are mandatory. This does not clear V668.

`--outer-resource-limit-controls` provides bounded local max+1 admission tests and
a deadline test. An observation limit can detect an operation after it happened;
it is not a kernel pre-allocation quota. Only retained owned pidfds are signaled
on refusal. No arbitrary PID/command interface, process-memory/register access,
service, block device, credentials, source push, installation or network operation
is part of this local capture. No Precision command or hosted rerun is needed.


## Retained outer refusal records and source-specific case coverage

The explicitly selected outer limit controls now keep the complete returned
`StaticCaseResourceCapture` record under each result's `capture` field. A passing
refusal summary alone is not measurement evidence. The result binds the current
source head/tree and the exact controls/custodian source hashes. Its verifier
recomputes capture and ledger hashes, checks partial-scope arithmetic, expected
refusal and source identities, and reconciles ledger task generations against
the outer recorder's retained roles. Altered, resealed records are rejected.

The task-limit trigger exists before the bounded ledger admits its row. The
returned capture keeps that task generation in `task_roles`; this is a known
coverage difference, not a silently dropped or zero-cost process. A refusal
before any owned launch retains an empty owned capture, not a claim that the
harness or its pre-existing child used no resources. Failure cleanup can be
confirmed operationally without a complete measurement of cleanup syscalls.

These five controls do not rerun the completed 111-lifetime static case. The
collector, launch setup, exact simultaneous peaks, descriptor transfers and
whole-suite accounting remain unmeasured. `whole_case_complete=false`,
`complete_resource_ledger=false` and `hard_execution_resource_ceiling=false`
remain mandatory. The collector and normal custody/runtime paths are unchanged.

Coverage must name its source generation and distinguish semantic scenarios,
retained execution records and component-ledger references. Repeat static runs
are separate executions of one scenario. A ledger referenced both directly and
inside a receipt is counted once. Arithmetic assertions, consumer mutation
checks and the audit itself are not silently assigned zero resource cost or
invented separate process lifetimes. Do not import the older 64/87 component
coverage into this source, or count a previous-generation PASS as new evidence.


## Local invocation identity (V671 candidate; no publication authority)

The source supervisor offers an explicit local invocation-journal dispatcher.
It launches only the fixed named single-case profiles, with one fsynced BEGIN
before each launch and one parent-observed terminal record. Each identity binds
source head/tree and inventory, scenario, ordinal, explicit attempt, a random
session nonce, and the measured Python runtime selected for launch. The journal
file descriptor is not inherited; the case receives sealed request context.
This is source-distinct bookkeeping, not a second kernel execution observer or
a signature against same-UID/root or trusted-controller compromise.

A completed invocation requires root exit zero, its exact result, and an
observed elapsed value within the admission deadline. A PASS result followed
by timeout/nonzero exit is not a completed execution. A missing terminal remains
UNFINISHED, even when its last result file says PASS. Truncated records fail
closed. No automatic retry or historical ID reconstruction is implemented.

The read-only replay validator requires the independently supplied exact source,
runtime and selected plan. It rejects duplicated IDs, ordinals, task generations,
reused attempt IDs, cross-source records, and reused ledger objects across
invocations before returning totals. Within one invocation, repeated pointers
to the same ledger reference one canonical object rather than extra measurements.
Optional artifact admission rehashes original result/log bytes; validating journal
structure alone is explicitly different. No resource totals or global peaks are
inferred from completed invocation counts.

The legacy suite is not silently rerouted. Only launches made by this selected
dispatcher are covered. Parent startup/source queries, journal-writing work,
worker descendants and cleanup costs still lack a complete resource ledger.
The successful 233bda6a static joins and prior 0fba9334 executions are not rerun,
relabelled, or retroactively assigned authenticated invocation IDs. The old
18-completion figure remains a conservative historical floor.

The five outer-refusal scenarios now have a single-case entrypoint reusing the
existing checks; the legacy five-case suite calls the same function. The local
identity dispatcher may select these refusals, normal/third-role primary cases,
the data-model cross-runtime selftest, and harmless journal testing fixtures.
It never selects the completed successful 111-task static proof, storage runner,
wallets, hosted CI, or any deployment. A launch deadline is post-observation
admission, not a hard wall-clock guarantee, and root reap is not a claim that
all descendant cleanup or resource use was independently verified.


## Local identified case registry (V2; not a workflow admission)

The explicit `--local-invocation-manifest --all-live-cases` mode now maps every
named primary, owned-COMMIT, primitive, helper, resource, outer-refusal and identity
RPC case, plus the standalone cross-runtime data selftest, to its own durable
BEGIN/SPAWN/END identity. There are 91 names in that closed live plan. The six
journal-fixture scenarios are separate; the three historical 111-task static
executions are neither selectable nor counted. The previous eight-case default
is preserved. The unmodified default legacy suite is not claimed to have per-case
identity, nor does this map cover every assertion/helper/recorder invocation.

Only the predeclared owned/primitive descriptor-transfer fixtures inherit an
anonymous socketpair endpoint. The parent holds the writer or leaves it queued
until the case root is reaped; in the closed positive case it closes the writer
earlier. V2 terminal records bind one received/closed descriptor and the parent's
monotonic timestamps to that invocation. These records are controlled-fixture
bookkeeping, not independent live tracing, general SCM_RIGHTS totals, or a closed
cleanup/resource ledger. Interrupted or malformed records never count complete.

Source identities, explicit attempts, ledger aliases, existing refusal checks,
per-case deadlines and no automatic retry remain mandatory. Selecting all cases
does not start the privileged storage campaign, touch an operator host or make
this local proposal publishable. Full resources, exact simultaneous peaks, nested
origin, the legacy aggregate composition and unsupported launch profiles remain
open. No full campaign/availability/readiness flag is promoted by registry coverage.


## Local journal-worker boundary observation (V3; not hosted acceptance)

The explicit `--observe-workers` dispatcher uses a separate source-bound observer
process from the custody module. That process forks the fixed sealed case worker,
retains its pidfd, checks the initial interpreter/source/request/argv/cwd/environment
at the kernel exec stop, and observes the worker root and its threads through
terminal wait. A later root exec refuses even if the worker previously wrote PASS.
The recorder requires the sealed observation, exact journal association, observed
wait result and result bytes before counting completion. Historical V2 journals
are not relabeled independently observed. The selected runtime field still says
parent-measured; the V3 observation is additional evidence with a narrower scope.

Resource capture starts at the child's pre-exec synchronization stop, covers its
descriptor/cwd setup, worker execution and root/thread shutdown, and ends at terminal
wait. Fork-to-stop instructions, recorder/observer work, process children, external
holders, global peaks and complete descriptor accounting remain excluded. Thread
rows are task generations, not extra process lifetimes. Captured counters are
post-observation admission checks, not hard pre-allocation or execution ceilings.

No TRACEFORK/TRACEVFORK is enabled on this worker observer: nested producers and
inner tracers retain their existing owners. SIGCHLD delivery stops from nested
tracing are counted separately, not silently omitted or miscounted as execs.
The original 111-task static joins are not rerun or imported. This does not establish
nested original-object custody, all legacy invocation coverage, a full resource
ledger, a hosted Node matrix, or readiness to publish/merge/deploy.


## Local worker/nested resource join (V4; incomplete measurement windows)

The explicit observed invocation journal now records successful worker child-creation
returns. Each process witness binds the creating worker task, syscall sequence,
child PID/start-time/parent identity and a retained pidfd. Thread returns are
classified separately and stay in the worker partition. Missing or changed child
metadata remains unresolved; PID numbers alone never authorize a component join.
The observer does not attach to these children, inspect their memory/registers,
observe their execs or take observation away from their existing custodians.

Each terminal journal row binds a separately retained worker-resource-join object.
The join validates every retained component, deduplicates aliases, requires its
root to match a recorded direct-child generation, and rejects overlapping task
windows or cross-source/invocation bindings. It lists child witnesses lacking a
resource window. Empty partial captures and missing records are not free work.
Only disjoint retained-window counters are added. Peak values, elapsed intervals,
full cleanup, descriptor capabilities and missing resources are not inferred.

A readable child pidfd is evidence of that task's exit, not proof of reaping,
its exit status, descendants' retirement, or closure of transferred descriptors.
This local join is not a source-distinct full-campaign terminal. Whole-case
completeness, nested original-object custody, hard execution ceilings, global
peaks and full workflow acceptance remain false. The preserved 111-task static
proof and earlier invocation populations are not rerun, relabeled or summed.
