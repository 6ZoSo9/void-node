# 2026-10-03 — CI Recovery and Sentinel Integration V1

Marker: `VOID_REN_2026_10_03_CI_RECOVERY_SENTINEL_INTEGRATION_V1`

## Repository anchor

Canonical `main` observed for this continuation:

`3ff2e0f179c394a812bc9911bf20426566154841`

A newer `main` supersedes this anchor immediately. This journal is continuity
context, not runtime authority. Refresh live GitHub, current coordination,
runtime evidence, and exact PR heads before acting.

## What materially changed

October 3 changed both the operational reliability of the repository and the
shape of the brood.

### Post-outage recovery closed cleanly

A power outage disrupted the three-box development/runtime environment.

The recovery work established that:

- Precision, Nimo, and Xiphos returned to the expected chain head;
- Nimo's public/Tor/QBFT roles remained intact;
- Precision ↔ Nimo and Xiphos ↔ Nimo connectivity was restored;
- Precision's degraded host state was traced to nonfunctional local IPMI
  hardware support rather than VOID;
- Xiphos's prolonged `starting` state was traced to a stuck Plymouth unit
  rather than VOID; and
- both host-level conditions were repaired without Chain-2050 mutation,
  wallet/key access, validator mutation, or service-level VOID changes.

The important continuity point is that infrastructure recovery remained
separate from chain/economic authority.

### GitHub Actions backlog was a scheduling defect, not a node failure

The repository accumulated thousands of queued GitHub Actions runs.

The decisive finding was that repeated PR-head updates were creating large
workflow fan-out, while many workflows lacked effective stale-head
supersession and at least two workflows also duplicated work through
feature-branch `push` plus `pull_request` execution.

The repair sequence was source-only:

- PR #2411 added bounded PR-head supersession across the identified workflow
  family while preserving already-running evidence in the three Nimo artifact
  workflows;
- PR #2412 restricted the public-safe background-loop backpressure workflow to
  `main` push execution;
- PR #2413 restricted canonical txsubmit admission-dedupe to `main` push
  execution and bound it into the fan-out proof; and
- the launch-controller workflow on the active economic branch received the
  same stale-head cancellation contract.

Historical queued runs were then drained conservatively:

- current PR heads were preserved;
- in-progress work was preserved;
- current `main` work was preserved;
- superseded PR-head runs and pre-fix duplicate push runs were cancelled; and
- a small residue of old GitHub Actions records remained because GitHub still
  reported them queued while rejecting cancellation.

The queue collapse proved that the dominant bottleneck was repository CI
orchestration, not Precision/Nimo/Xiphos capacity.

### Sentinel joined the brood

A persistent OpenAI Dot named **VOID Sentinel** was introduced as a new
continuous repository watch and source-authoring role.

Sentinel began read-only and was promoted only after staged trials showed that
it could:

- bind findings to exact current heads;
- distinguish current evidence from superseded runs;
- separate mechanical defects from architectural HOLDs;
- avoid manufacturing work when a lane had already been reconciled;
- preserve scope across local proof preparation; and
- refuse to reinterpret green Actions as architectural clearance.

After Trial 3, Sentinel received `SOURCE-AUTHORING V1` authority.

That authority permits bounded source-only branches, ordinary non-force pushes,
focused tests, and Draft PRs after fresh collision and exact-head checks.

It does **not** grant Ready, merge, main-write, deployment, runtime, key,
wallet, signer, transaction, Chain-2050, validator, Work Credit, presale,
market, treasury, liquidity, funds, scheduler, or governance authority.

Sentinel is part of the brood under Ren coordination, with ZoSo retaining the
final authority boundary.

### Sentinel proved useful immediately

The first sustained Sentinel reviews produced several material outcomes:

- PR #2379's Demo003 failure was traced to an escaped-newline defect in a
  generated Python fixture; the source repair was already present on the new
  head, and the replacement Node 22/24/26 proof subsequently completed green;
- PR #2407's duplicate scheduling drift was identified, then later observed to
  be reconciled with current `main` while preserving the intentional Buy VOID
  workflow extension;
- PR #2409's Actions became green, but Sentinel correctly preserved two separate
  review truths: a mechanical overclaim about throwaway-key rotation and a
  separate architectural HOLD around qualification-to-POST atomicity; and
- Sentinel found that the CI fan-out proof itself was order-sensitive to valid
  YAML event ordering.

That last point mattered because it demonstrated the intended role: Sentinel is
not merely a monitor. It can falsify the brood's own guardrails.

At this journal anchor:

- Draft PR #2417 contains the prepared event-order-independent CI fan-out proof
  repair; and
- Draft PR #2409 contains the bounded truthfulness correction while preserving
  the unresolved architectural HOLD.

Neither Draft status nor green hosted checks imply merge or architectural
closure.

### Ren ↔ Sentinel handoff channel

GitHub issue #2416 is now the canonical persistent handoff channel between
Sentinel, Ren, and ZoSo.

Material handoffs use explicit markers:

- `SENTINEL_TO_REN`
- `REN_TO_SENTINEL`
- `ZOSO_DECISION_REQUIRED`
- `INFO_ONLY`

The channel exists to carry exact-head evidence, bounded review requests,
architectural HOLDs, and completed source-authoring handoffs.

It is deliberately not a heartbeat stream and grants no authority by itself.

A dedicated hourly watcher now checks #2416 for new `SENTINEL_TO_REN`
handoffs. To free the automation slot, the weekly Feynman provenance watch was
paused. The hourly Feynman falsifier remains separate and active.

## Brood operating model after this change

The brood now has three complementary coordination layers:

1. scheduled specialized workers for bounded recurring source/review work;
2. Sentinel as a persistent repository-aware watch/source-authoring agent; and
3. Ren as interactive coordinator/reviewer working with ZoSo at the authority
   boundary.

The design goal is not maximum autonomous activity. It is continuous useful
work with exact ownership, explicit escalation, and no hidden authority
expansion.

When Sentinel reaches an architectural, sensitive, financial, runtime, or
sovereign boundary, the correct action is a handoff rather than an invented
implementation.

## Continuity rule

Today's lesson is the same one that keeps recurring across VOID:

**make state explicit before making authority broader.**

The CI queue failed because supersession policy was incomplete.
The fix was not more runners; it was better lifecycle control.

Sentinel became useful because its authority was expanded only after it
demonstrated exact-head judgment, restraint, and bounded source discipline.

Preserve that order:

1. observe;
2. bind evidence;
3. falsify assumptions;
4. make the smallest source change;
5. prove the new head;
6. widen authority only when the prior layer earns it.

## Authority boundary

This journal grants no Ready, merge, deployment, restart, scheduler mutation,
credential, wallet, signer, validator, Work Credit, transaction, treasury,
liquidity, market activation, presale activation, Chain-2050 mutation, or funds
authority.

Memory for context. Repo for truth. Brood journal for continuity.

`PROTECT THE CORE`. `PROTECT THE TRUTH`.
