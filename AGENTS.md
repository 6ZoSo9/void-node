# VOID repository working agreement for AI agents

Marker: `VOID_AGENT_WORKING_AGREEMENT_V1`

This file applies to the entire repository unless a more specific `AGENTS.md`
exists in a subdirectory. A nested agreement may tighten these rules but must not
weaken the authority, safety, or evidence boundaries below.

## Mission

Build VOID as practical, reliable, agent-native infrastructure that can earn
real usage and revenue without depending on outside gatekeepers. Preserve ZoSo
as VOID's sovereign constitutional authority over network identity, core rules,
keys, treasury boundaries, irreversible changes, and other existential actions.

Automation should reduce routine operator burden and defend ZoSo's intent. It
must not remove ZoSo from meaningful control or reinterpret network sovereignty
as independence from ZoSo.

## Default operating mode

Repository work is source-only by default. A source commit or merged pull
request is not a deployment, activation, service restart, credential grant,
ledger write, payment authorization, or fund movement.

When a task can be completed safely through GitHub, prefer a bounded branch and
draft pull request. Leave machine-specific execution for a separately reviewed
operator lane.

## Before changing files

1. Read current `main`, open pull requests, and the files relevant to the task.
2. Select one narrow outcome with an explicit changed-path boundary.
3. Check that the planned paths do not overlap another active branch or open PR.
4. Classify any detected coordination collision by severity. Red collisions are
   hard stops; Amber collisions are advisory and require a bounded
   reconciliation plan.
5. Reuse an existing matching branch or PR instead of creating a duplicate.
6. Record assumptions and fail closed when required repository or runtime state
   cannot be verified.

Do not use a different branch name to disguise a path collision. Do not advance
an unrelated lane merely because it is convenient.

## Active repository-wide execution plan

Marker: `VOID_CAPABILITY_CLOSURE_PLAN_COORDINATION_V1`

While GitHub issue #1301 is open and explicitly designated as the current VOID
capability-closure plan, every worker must read it before starting or extending a
lane. Its priority order, canonical-lane assignments, anti-duplication rules,
role-routing rules, comment-discipline rules, and re-evaluation triggers are
repository-wide coordination requirements.

- Prefer closing an existing P0/P1 capability loop over opening another
  source-only proof, closeout, documentation, or architecture layer.
- Do not open a duplicate implementation for a semantic area that #1301 assigns
  to an existing canonical branch or pull request. Disjoint supporting work may
  proceed under the coordination-severity rules below.
- Treat a worker's named specialty as its first-look priority, not a permanent
  exclusive identity. If that specialty is blocked, parked, already adequately
  occupied, requires unavailable authority, or has no meaningful safe action,
  fall through to the highest-value genuinely unowned Green or bounded Amber
  source-only work that can be completed usefully. Return to the specialty when
  it again becomes the highest-value actionable lane.
- Interactive coordinator names used in human/assistant sessions, including Ren
  or Mira, are not scheduled worker slots unless the current live-dispatch policy
  explicitly includes them.
- Treat #1301 as a state index rather than an hourly transcript. Do not post
  routine `STARTED`, heartbeat, `still blocked`, `no change`, or CI-poll comments
  there. Put detailed attributable execution evidence on the lane issue or
  relevant pull request. Use #1301 only for material ownership, blocker,
  collision, dependency, lifecycle, reassignment, or priority changes, and
  prefer one consolidated material update.
- Treat `merged`, `deployed`, and `externally accepted` as distinct states and
  stop at the highest state actually proven.
- If #1301 is closed, superseded, explicitly replaced, or its assumptions no
  longer match repository/runtime reality, emit `HOLD`, perform a fresh repo
  scan, identify the explicitly superseding coordination plan, and use that
  reviewed successor rather than mechanically continuing #1301.
- Issue #1301 and any explicit successor are temporary execution coordination,
  not permanent constitutional rules and not authority to bypass this working
  agreement.

The coordination issue grants no service, deployment, credential, wallet,
signer, payment, Work Credit, validator, treasury, transaction, or fund
movement authority. Separate operation-bound authorization remains required.

## Coordination severity, priority fall-through, and exploration

Marker: `VOID_COORDINATION_PRIORITY_FALLTHROUGH_V2`

Coordination is risk-weighted. The V1 active-lane registry remains collision
evidence; when a candidate check is available, the V2 coordination decision is
the final source-work classification for whether that evidence is blocking.

### Red — hard stop

A Red collision blocks competing work until the collision is removed, explicitly
overridden, or the active sensitive operation ends. Red includes:

- the same branch or worktree being used for competing work;
- collisions involving production Chain-2050 state, consensus/chain source,
  `src/node_core.ts`, contracts, wallets/signers, treasury/economic mutation,
  Work Credit mutation, validators, deployment/restart operations, or other
  explicitly sensitive authority;
- incomplete collision evidence when the candidate itself touches a sensitive
  path or sensitive semantic lane; and
- any operation that could mutate the same live service, durable state, signer,
  wallet, treasury, validator, or irreversible/shared authority concurrently.

Recent activity in a Red lane is a real exclusion boundary. Do not work around it
by renaming a branch, moving to another chat, or choosing a neighboring file.

### Amber — advisory collision

An Amber collision warns of likely reconciliation cost but does not by itself
block bounded source work. Examples include a static family reservation, nearby
ordinary subsystem work, non-sensitive path overlap, or incomplete path metadata
for an otherwise non-sensitive source lane.

Amber work may proceed only when:

- the outcome is independently useful and not a duplicate implementation;
- no Red authority or shared mutable state is inherited;
- the worker keeps the changed-path scope narrow and records the collision; and
- later reconciliation is expected before merge if the overlap remains.

The prior-30-minute activity window is advisory for Amber work. Ordinary source
traffic must not freeze an entire subsystem merely because another worker was
recently active nearby.

### Green — clear concurrency

Green work is disjoint from active sensitive state and has no material collision.
Proceed normally under the repository quality and authority rules.

### Primary workers are not exclusive owners

A worker named in the current coordination plan is the primary first-look worker
for that lane, not the exclusive owner of an entire subsystem and not permanently
bound to that specialty. Other workers must not duplicate the canonical
implementation or enter a Red boundary, but they may take disjoint prerequisites,
fall through to another priority, review/integrate existing work, or explore
elsewhere. A blocked primary worker should likewise fall through to useful
unowned work rather than idle solely to preserve role purity.

### Priority fall-through

Workers should attempt the highest-value useful priority first. If that work is
already adequately occupied, blocked by a Red collision, or requires authority
the worker does not have, continue down the repository priority order. Do not
stop merely because the first attractive lane is taken.

### Exploration mode

If the named high-priority lanes are occupied or no safe bounded task is obvious,
exploration is explicitly allowed. Scan the repository broadly for capability
gaps, stale assumptions, brittle tests, correctness debt, security/recovery
weaknesses, operator friction, missing automation, performance opportunities, or
useful integrations. Exclude Red collisions, rank the remaining candidates by
value and risk, and execute the best bounded Green or Amber improvement.

Exploration is not permission for decorative churn. Prefer work that closes a
real capability, removes recurring friction, reduces risk, or creates measurable
usage/economic value.

## Authority boundaries

Without separate, explicit authorization, agents must not:

- read, print, copy, rotate, create, or expose private keys, tokens, passwords,
  seed phrases, credentials, secret paths, or authorization headers;
- deploy code, install packages on an operator host, start a listener, reload
  systemd, enable, start, stop, or restart a service;
- access a wallet or signer, sign production data, construct or broadcast a
  transaction, authorize or execute payment, or move funds;
- write Work Credits, settle WC to VOID, mutate production replay state, grant
  payment authority, or dispatch paid work;
- change validator admission, consensus, chain identity, constitutional rules,
  treasury boundaries, governance authority, or irreversible key ownership;
- bypass a fresh operation-bound confirmation required by a reviewed execution
  contract.

A task request to edit source does not authorize any of the operations above.
Keep preparation, review, approval, activation, and post-activation evidence as
separate gates when the underlying authority differs.

## Security requirements

- Treat all external input, repository fixtures, API responses, and runtime
  evidence as untrusted until validated.
- Use strict schemas, exact allowlists, bounded sizes, explicit timeouts, and
  replay protection where applicable.
- Never place a secret in source, examples, logs, issue text, pull-request text,
  workflow output, test fixtures, or generated receipts.
- Preserve existing authentication, signature, identity, trust-policy,
  confirmation, and activation-lease boundaries unless the task explicitly
  strengthens them.
- Reject redirects, arbitrary URLs, wildcard authority, silent fallback, and
  permissive parsing in security-sensitive paths.
- Prefer append-only evidence and atomic, compare-and-swap, or content-addressed
  state transitions over destructive replacement.
- On uncertainty or state drift, emit `HOLD` and stop before mutation.

## Git and pull-request rules

- Start from current `main` unless an exact reviewed base is required.
- Use a task-specific feature or fix branch; do not commit directly to `main`.
- Stage or modify only the confirmed paths. Never use `git add -A`, `git add .`,
  or `git add --all` in a mixed worktree.
- Do not force-push, rewrite shared history, reset away unrelated work, or delete
  another lane's branch or worktree.
- Keep generated files, local diagnostics, credentials, and private evidence out
  of commits unless they are explicitly reviewed public artifacts.
- Open at most one pull request for the lane and create it as a draft by default.
- Do not merge, enable auto-merge, deploy, or delete the branch unless that
  separate action is explicitly authorized.

GitHub API commits are real remote commits. They do not prove that Precision,
Nimo, Alienware, or any public runtime has fetched or deployed them.

## Implementation quality

Prefer the smallest change that closes a real capability, reliability, security,
discoverability, or revenue blocker. Avoid decorative churn and repeated
closeout layers that do not change a user's or agent's ability to use VOID.

Keep behavior deterministic where practical. Use explicit types and closed data
contracts. Preserve backward compatibility unless the task documents and proves
a deliberate migration.

Repository Node.js work must respect the canonical `package.json` and
`package-lock.json` engine contract. Supported majors are Node.js 22, 24, and 26
(`^22.0.0 || ^24.0.0 || ^26.0.0`), with Node.js 24 LTS as the repository
default. Do not silently narrow this contract to Node.js 22-only.

## Architecture and dependency principles

- Design subsystems as narrow, independently testable capabilities with explicit
  typed or closed contracts. Consumers should depend on the contract rather than
  another subsystem's internal state or implementation details.
- Make cross-boundary outcomes deterministic and machine-readable. Missing
  handlers, malformed responses, ambiguous results, timeouts, and state drift
  must not become implicit success; return an explicit hold, rejection, or error
  state that callers can reason about.
- Treat asynchronous and network behavior as an architectural concern. Separate
  relevant connection, operation/inactivity, and total deadlines; bound retries
  and timers; and do not let one timeout class silently stand in for another.
- Keep dangerous primitives behind minimal, least-authority interfaces. Crypto,
  signing, wallet/signer access, consensus mutation, treasury/economic mutation,
  and other high-impact capabilities must not be casually exposed to ordinary
  application code.
- Prefer one coherent quality gate for a change where practical: type/compile
  checks, lint/build checks, focused deterministic or adversarial proof, and
  diff hygiene should compose into one reviewable acceptance story. Passing one
  check never implies the others passed.
- State negative evidence explicitly. Documentation and receipts should say what
  they do not prove: a digest is not a signature, source-green is not deployed,
  synthetic proof is not external acceptance, and economic equivalence is not
  bit-identical historical continuity.
- Prefer open, portable, replaceable dependencies and protocols. Avoid critical
  reliance on one vendor, hosted platform, narrow language ecosystem, or opaque
  service when an auditable fallback or migration path can reasonably exist.
- Treat maintainability, operator usability, outside-agent usability, adoption,
  network activity, and real economic value as architecture constraints alongside
  technical elegance and performance. A clean design that cannot be operated,
  adopted, or sustained is not a complete success.
- Stable subsystem contracts should allow concurrent workers to operate on
  separate bounded areas without every worker needing full-repository knowledge.
  Coordination must still detect path, semantic, authority, and dependency
  collisions before mutation.

## Validation

Every code or contract lane should include focused verification proportionate to
its risk. Typical checks include:

- syntax or compile checks for every changed executable file;
- the focused deterministic or adversarial proof for the changed behavior;
- `npm run typecheck` and/or `npm run build` when the scope touches compiled
  TypeScript;
- strict JSON parsing and schema validation for changed JSON artifacts;
- `git diff --check` or an equivalent whitespace check;
- an exact review of changed paths and file modes;
- regression checks for preserved authority boundaries.

Do not hide repository-baseline failures. Distinguish pre-existing failures from
failures introduced by the lane, and do not claim full green when only focused
checks ran.

## Pull-request evidence

A pull request should state:

1. the problem and why it matters;
2. the exact changed-file scope;
3. the important implementation decisions;
4. the commands or workflows used for verification;
5. current operational truth and remaining blockers;
6. the authority and safety boundary;
7. the next separately authorized gate, if any.

Use exact commit SHAs and artifact digests when they are material. Never claim a
runtime is live, a customer can pay, work was dispatched, WC was written, or
funds moved unless separately captured evidence proves that event.

## Priority order

When several useful lanes are available, prefer work that measurably improves:

1. customer revenue, automatic fulfillment readiness, or verifiable receipts;
2. outside AI-agent discovery, authentication, capability negotiation, and
   bounded paid-work participation;
3. network reliability, recovery, security, and independent operation;
4. public usability and honest discoverability of already working capabilities;
5. reusable intellectual assets, integrations, and evidence quality;
6. bounded exploration that discovers and closes the best remaining Green or
   Amber capability/reliability/correctness gap when higher priorities are taken.

Prefer the highest useful non-Red lane, not merely the first named lane. Money-
related work remains high priority, but no urgency converts source-edit
authorization into wallet, payment, treasury, or fund-movement authority.

## Completion rule

Stop at the last authorized gate. Report what changed, what was verified, what
was not executed, and what still requires an operator, credential, runtime host,
wallet, signer, confirmation, merge, or deployment decision.
