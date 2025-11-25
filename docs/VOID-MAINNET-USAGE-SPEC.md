# VOID Mainnet Usage Spec (v1)

## 0. Purpose

This document defines how we measure **usage** on VOID mainnet for:
- SLOs / dashboards
- Alerts
- Preflight gates before pushes / deploys

Usage here is strictly about **on-chain activity** driven by users and agents,
not internal node health. Node health is covered by:
- txroot/header3/seals
- mainnet-core pillar
- last-mile health

Usage is one pillar feeding into `void_mainnet_overall_health` and the
`void:mainnet_overall:health:last_5m_v2` scoreboard.

---

## 1. Inputs and metrics (current v1)

We already have a textfile exporter writing:

- `/var/lib/node_exporter/textfile_collector/void_mainnet_usage.prom`

That file currently defines:

- `void_mainnet_usage_nonempty_recent`
  - `1` if at least one recent block in the window is non-empty
  - `0` if all blocks in the window are empty

- `void_mainnet_usage_last_nonempty_gap`
  - Number of blocks since last non-empty block
  - Smaller is better; larger means "no activity" for a while

- `void_mainnet_usage_health`
  - `1` if the window is considered "healthy usage"
  - `0` if usage is considered "bad / idle"

These may be extended in v2+ with:
- `jobs_recent` / `jobs_per_min` (NullFeed, JobQueue)
- `receipts_recent` / `receipts_per_min`
- Per-role or per-contract breakdowns.

---

## 2. Window definition

We treat usage over a **sliding block window**.

Let:

- `N` = size of the recent window (blocks)
- `B_latest` = latest block number on mainnet-core
- `W` = `[B_latest - (N-1), ..., B_latest]`

Implementation detail:
- v1 window size is defined in the exporter shell script (not in Solidity).
- For now we assume something in the range 16–64 blocks.
- Exact value is not critical as long as it is:
  - Stable in configs
  - Reflected in dashboards
  - Mentioned in this spec and any future update.

Exporter responsibilities:
- Scan blocks in `W` via HTTP (4100) dev inspectors.
- Count:
  - `nonempty_count = #blocks in W with txCount > 0`
  - `empty_count = N - nonempty_count`
- Compute:
  - `void_mainnet_usage_nonempty_recent = 1` iff `nonempty_count > 0`
  - `void_mainnet_usage_last_nonempty_gap` via `/metrics/void/head` and
    the last non-empty persisted block number.

---

## 3. Health rule (v1)

At v1 we intentionally keep this dumb and conservative.

### 3.1 Health definition (current behavior)

We define **usage health** primarily as "no evidence that the chain is idle":

- `void_mainnet_usage_health = 1` when BOTH:
  1. `void_mainnet_usage_nonempty_recent == 1`
     - At least one non-empty block in the current window.
  2. `void_mainnet_usage_last_nonempty_gap <= G_max`
     - Gap threshold `G_max` is a constant set by exporter config
       (for now treat `G_max`  as a small number like 16–64 blocks).

- `void_mainnet_usage_health = 0` otherwise.

Operational meaning:
- Health `1` ⇒ there has been at least one non-empty block "recently"
  and we are not obviously stuck emitting an infinite string of empties.
- Health `0` ⇒ either:
  - All blocks in the window are empty, or
  - Gap since last non-empty block exceeds our tolerance.

We will tighten this later once:
- NullFeed is live
- JobQueue / ReceiptRegistry are active on mainnet
- We have a richer notion of "useful work per minute".

### 3.2 Interaction with last-mile

Last-mile health is already responsible for:
- Ensuring blocks are structurally valid
- Ensuring txroot/header3/seals line up
- Checking that we aren't sealing garbage

Usage does **not** override last-mile.
Instead:

- If last-mile is bad (`void_mainnet_lastmile_health == 0`),
  overall mainnet health is bad, even if usage is high.
- If usage is bad (`void_mainnet_usage_health == 0`) but last-mile is good,
  overall health can still be considered degraded for presentation,
  but the core is not failing.

---

## 4. Mainnet overall interaction (v1)

`void_mainnet_overall_health` is computed from:
- mainnet-core pillar
- last-mile pillar
- tokenomics pillar
- (usage is effectively part of the usage/last-mile view)

For now the rules are:

- core pillar must be `1`
- last-mile pillar must be `1`
- tokenomics pillar must be `1`
- usage health should be `1` for the full "everything is good" view,
  but a temporary dip (idle period) is treated more like "degraded" than "catastrophic".

Dashboards:
- Overall mainnet panel shows:
  - overall health (0/1)
  - usage health (0/1)
  - last non-empty gap
  - non-empty_recent flag.

Alerts:
- Usage-only alerts should be **warning** level, not critical, unless
  combined with other signals (e.g. jobs coverage dropping).

---

## 5. Future extensions (v2+)

We expect to upgrade usage once:
- NullFeed is live
- DEV/AGENT layers are busy
- Validators and users are posting jobs and receipts.

Planned extensions:

1. **Job / receipt rate integration**
   - Gauges:
     - `void_mainnet_usage_jobs_per_min`
     - `void_mainnet_usage_receipts_per_min`
   - Health rule:
     - Allow "idle but healthy" if:
       - mainnet overall health is 1
       - job/receipt rate is 0
       - BUT we are in a scheduled maintenance/dead time window.

2. **Per-contract usage**
   - Breakdown usage by:
     - NullFeed postings / reads
     - JobQueue submissions
     - Agent receipts
   - Possibly per-module health (NullFeed_usage_ok, Jobs_usage_ok, etc.).

3. **Temporal SLOs**
   - Rolling 1h / 24h windows:
     - "Non-empty at least once every X blocks for 95% of the time"
     - "Jobs/receipts present in at least Y% of blocks"

These belong in a v2 spec once we actually see real traffic patterns and
have NullFeed + devnet/mainnet agents pounding the chain.

---

## 6. Invariants and expectations

At all times:

- Exporters must NEVER wedge Prometheus:
  - Always write valid `.prom` textfile format.
  - Avoid chmod 600 on textfiles; keep them `0644 root:root`.
  - If an exporter fails, it should keep the last good file or write a
    clearly invalid health value but still syntactically valid.

- Health definitions must:
  - Be monotonic wrt obvious badness (more idle ⇒ more likely to be 0).
  - Never require specific absolute TPS; usage is relative here.

- Any change to usage semantics:
  - MUST be reflected here (this spec).
  - MUST update dashboards and Prom recording rules.
  - SHOULD have a dedicated checkpoint tag:
    - e.g. `ckpt-mainnet-usage-spec-v2-YYYYMMDD-HHMMSS`.

