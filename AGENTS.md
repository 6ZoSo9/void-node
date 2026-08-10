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
4. Reuse an existing matching branch or PR instead of creating a duplicate.
5. Record assumptions and fail closed when required repository or runtime state
   cannot be verified.

Do not use a different branch name to disguise a path collision. Do not advance
an unrelated lane merely because it is convenient.

## Active repository-wide execution plan

Marker: `VOID_CAPABILITY_CLOSURE_PLAN_COORDINATION_V1`

While GitHub issue #1182 is open and explicitly designated as the current VOID
capability-closure plan, every worker must read it before starting or extending a
lane. Its priority order, canonical-lane assignments, anti-duplication rules,
and re-evaluation triggers are repository-wide coordination requirements.

- Prefer closing an existing P0/P1 capability loop over opening another
  source-only proof, closeout, documentation, or architecture layer.
- Do not open a parallel implementation for a semantic area that #1182 assigns
  to an existing canonical branch or pull request. Repair or extend that lane.
- Treat `merged`, `deployed`, and `externally accepted` as distinct states and
  stop at the highest state actually proven.
- If #1182 is closed, superseded, explicitly replaced, or its assumptions no
  longer match repository/runtime reality, emit `HOLD`, perform a fresh repo
  scan, and use the newly reviewed plan rather than mechanically continuing it.
- Issue #1182 is temporary execution coordination, not a permanent
  constitutional rule and not authority to bypass this working agreement.

The coordination issue grants no service, deployment, credential, wallet,
signer, payment, Work Credit, validator, treasury, transaction, or fund
movement authority. Separate operation-bound authorization remains required.

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

When several non-colliding lanes are available, prefer work that measurably
improves:

1. customer revenue, automatic fulfillment readiness, or verifiable receipts;
2. outside AI-agent discovery, authentication, capability negotiation, and
   bounded paid-work participation;
3. network reliability, recovery, security, and independent operation;
4. public usability and honest discoverability of already working capabilities;
5. reusable intellectual assets, integrations, and evidence quality.

Money-related work remains high priority, but no urgency converts source-edit
authorization into wallet, payment, treasury, or fund-movement authority.

## Completion rule

Stop at the last authorized gate. Report what changed, what was verified, what
was not executed, and what still requires an operator, credential, runtime host,
wallet, signer, confirmation, merge, or deployment decision.
