# Precision installer V2: source-bound observations and recovery

V1.1 could report enablement after another writer replaced an individual enable
link. Its source and 41-case proof were also outside Git and CI. This generation
commits both exact legacy artifacts, a corrected installer, closed case
populations, an independent process supervisor, receipt schema and aggregate
verifier. It addresses Grace #5149673279/#5150415918, Lamarr #5149847835 and
Darwin #5149862979/#5150239207 in the existing #1373 lane.

The accepted preparation generation remains exactly
`0390ccb559e9f69bb829fe139b80539145f7ed6a`. Its tools, unit bytes, Precision
receipt `445cf0a811c5f2a781f4ba85021be9f031fa0ef105d7abca72a22c5429d49cdb`
and aggregate `e2912ee3c508c3b8346524f8591da61f54ca17793e77260186f56462c0be3738`
are fixed read-only inputs. This change does not request another host capture or
retroactively add installer evidence to that preparation receipt.

## Operation and claim

The existing create-only three-unit operation remains: capture a fresh plan;
confirm its digest within 30 minutes; install the exact unit bytes; explicitly
reload/start/check them on loopback; publish their three enable links; reload
and observe them. The new installer source commit/tree and complete declared
source closure are included in the plan. It must run from its exact Git checkout
with an explicit `--source-head`; a PR-body script is insufficient.

Each link observation binds its no-follow type, exact target, link count,
device/inode, owner/mode, size, mtime/ctime, and retained parent identity.
Unit bytes/inodes, service invocations, live-node identity and source inventory
are also compared. The final sample follows the former final-readlink,
listener-check and directory-guard cutpoints. Missing, replaced, hardlinked,
wrong-target, non-symlink, extra candidate or ABA entries fail the sample.

The terminal is **`ENABLE_LINKS_OBSERVED_AT_EXACT_SAMPLE`**. Its durable event is
`sampled`, not a current-enable authority or a `complete` capability. The named
sample is a sequential observation under a trusted operator namespace; it is
not an atomic multi-entry snapshot or exclusion of another writer. Namespace
changes after a read can invalidate a later observation. The result never emits
`enabled_for_user_default_target=true`. OS, operator and systemd are trusted;
cooperative locking and repeated reads are not hostile same-UID isolation.

`--recover` is read-only. It re-admits the exact plan/source/preparation
generation and reads the private attempt. Partial state deterministically
returns `PARTIAL_OR_UNCERTAIN`; it is never automatically retried or repaired.
A durable sampled terminal is independently re-observed against current unit,
service, parent and entry generations. Matching state returns
`ALREADY_OBSERVED_AT_REVALIDATED_SAMPLE` without repeating any side effect;
contradicted state returns `CONTRADICTED_COMPLETE_QUARANTINED`. A post-sample
failure record does not erase the original observation or authorize replay.
Foreign or different-generation residue receives no filesystem or manager
mutation and no appended event. Staged `Restart=on-failure` can still act after
an uncertain start; this tool has no automatic stop/unlink/rollback authority.

## Executable evidence

The source closure is checked against an explicitly supplied full commit, tree,
Git blob IDs and actual file bytes/modes. Exact legacy SHA-256 values remain
`1d56aa0919ea516662bce28e09f4f5f04f51c889f729c1438f52dbc864bf7cc3` (installer)
and `565fef0d890332a849ce2851e2b2700b054bf5b2789c2a9fdcd194b2572ab1c5` (proof).
All 41 original case IDs are closed in the contract and executed naturally.

Source lookup disables Git replacement objects and independently hashes the raw
commit and every traversed tree. The helper is admitted through that raw chain
before its definitions execute. Local replace refs cannot reinterpret the
reviewed head. Operator plans also bind the Python executable path/version/hash.

The supervisor freezes protected unrelated entries and the complete post-fault
enable-directory census before the primary continues. Primary exit must preserve
them. Mutation audit records carry paths; recovery mutations, writes outside the
fixture home, protected-entry mutations and non-temporary unlink are rejected.
Closed per-schedule terminal checks reject V2 success or any enable-authority
claim in these interrupted schedules, and receipt replay checks the same facts.
The separate review regression proof demonstrates rejection of the reviewers'
false-success and deleted-residue controls; these extra controls are not counted
in the 1,512-process matrix below.

A canonical transient frontdoor not-ready response uses the bounded startup
retry window. Wrong identity, malformed readiness and body mismatches remain
terminal. Recovery compares unit bytes and service/node facts to the confirmed
plan, in addition to the saved sample; a fabricated sample cannot redefine the
admitted unit payload. These checks do not establish hostile operator custody.

| Population per Python runtime | Primary/recovery pairs | Processes |
|---|---:|---:|
| 3 entries × 4 mutations × 4 post-verification cuts × 2 terminations | 96 | 192 |
| 13 interruption cuts × 3 residues × 2 terminations × 2 recovery intents | 156 | 312 |
| Total | 252 | 504 |

Python 3.10, 3.11 and 3.12 therefore execute **1,512 supervised processes**.
Each natural link primary executes the exact V1.1 control and then the successor
in disjoint fixture homes within the same process. Kill primaries execute the
successor. The fresh recovery process classifies every attempted profile. This
retains the review's exact process count while exercising **144 required V1.1
false-green terminals** and zero successor false-enable terminals. The original
41-case unit wall runs in the supervisor process and is not counted as a child.

The parent owns the virtual system manager, command counts, cutpoint timing,
durable entry mutations, SIGKILL, process exit observations and before/after
filesystem/journal censuses. The child executes actual installer functions and
filesystem operations with inventory/HTTP/manager boundaries substituted.
Real subprocess/listener creation is denied inside the admitted worker. No
systemctl command executes. Candidate-reported terminal values are checked
against parent-observed state; their counters are not acceptance inputs.

Recovery has at most 64 protocol transitions (deterministic supervisor ticks),
with a separate 30-second absolute child deadline. Primary work has at most
2,048 protocol transitions. There is no retry of a failed matrix member. The
case manifests enumerate every ordinal and expectation; missing or altered
populations fail admission.

Receipts bind source head/tree/closure, runtime executable/version/hash, exact
preparation identities, case IDs, parent observations, process exits and terminal
roots. The aggregate requires three externally supplied raw receipt digests;
CI captures them after each successful producer step and supplies them to the
separate aggregate step. The CI runner, workflow and supervisor remain trusted.
A digest is not a signature: supplying a forged receipt *and* replacing the
trusted expected digest is outside this boundary. Self-consistent substitutions
with the retained external digest are rejected, alongside missing/duplicate/
stale/mixed-runtime/mixed-head/mixed-artifact or substituted source/case inputs.

The workflow uses the interpreter path returned by each pinned setup-python
action, as documented by [actions/setup-python](https://github.com/actions/setup-python/blob/main/docs/advanced-usage.md#python-path).

## Scope limits

These are author/hosted fixture observations. They cannot establish real
user-systemd behavior on Precision, browser execution, public reachability,
domain recovery, hostile namespace custody, or Chain-2050/DataNet acceptance.
Independent review remains required. Any later host operation must name the
accepted installer hash and a fresh plan digest. Installation, routing and domain
changes remain separate operations. No live node update/restart, package install,
Funnel/DNS change, wallet, transaction or funds action is performed by this PR.
