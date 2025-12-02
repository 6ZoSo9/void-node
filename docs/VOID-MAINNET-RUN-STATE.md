# VOID Mainnet Bootstrap RUN State (Planning-Only Spec)

This doc defines the state machine, JSON state file, on-chain sentinel, and Prometheus view
for the VOID mainnet bootstrap `run()` phase.

We are **still in planning-only mode**. No real broadcasts yet.

---

## 1. RUN status enum

Logical states:

- `NOT_STARTED` — we have a valid PLAN + keys, but no mainnet `run()` broadcast has occurred.
- `IN_PROGRESS` — a real `run()` broadcast has started and is executing transactions.
- `COMPLETED` — the bootstrap `run()` sequence has finished successfully and the chain
  is considered *bootstrapped*.
- `FAILED` — a run attempt was started but failed and needs operator intervention.
- `UNKNOWN` — we cannot determine state (e.g. missing local JSON, Prom gauges, or sentinel).

Numeric mapping (for `void_mainnet_run_status` gauge):

- `0` = NOT_STARTED
- `1` = IN_PROGRESS
- `2` = COMPLETED
- `-1` = FAILED
- `-2` = UNKNOWN

---

## 2. Allowed transitions

Let `S` be the current logical status:

- Allowed:
  - `NOT_STARTED` → `IN_PROGRESS`
  - `IN_PROGRESS` → `COMPLETED`
  - `IN_PROGRESS` → `FAILED`
  - `FAILED` → `IN_PROGRESS`  (ONLY if explicitly resumed with operator acknowledgement)
- Disallowed:
  - `COMPLETED` → anything else (COMPLETED is terminal)
  - `NOT_STARTED` → `COMPLETED` (no skipping IN_PROGRESS)
  - Any transition that changes `chainId` or `liveConfigHash` mid-run.

For **mainnet** we will treat:

- `COMPLETED` as *effectively frozen*.
- Any further "replays" as *diagnostic-only* operations that MUST NOT change the sentinel
  or protocol state.

---

## 3. Local JSON state file

Path (already in use):

- `config/void-mainnet-bootstrap-mainnet.state.json`

Fields (current and planned):

- `status` (string) — `"NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "UNKNOWN"`
- `chainId` (number) — must be `2050` for VOID mainnet.
- `planVersion` (string) — e.g. `"v1"`, used to detect breaking changes in plan wiring.
- `liveHash` (string, 0x-prefixed) — keccak of `config/void-mainnet-bootstrap-mainnet.live.json`
  at the time the state file was created or last updated.
- `runTxs` (array) — list of TX hashes or opaque identifiers used by the run() harness.
  For planning-only this is `[]`.
- `startedAt` (string|null) — ISO8601 timestamp when `IN_PROGRESS` was first entered.
- `completedAt` (string|null) — ISO8601 timestamp when `COMPLETED` was first entered.

Planned invariants:

- `chainId` must match both `config.chainId` and RPC chainId (2050) or status is treated
  as `UNKNOWN`.
- `liveHash` must match the current keccak of the LIVE JSON for the RUN state to be
  considered meaningful. If the LIVE config changes, we treat the state as stale until
  re-initialized.

---

## 4. On-chain RUN sentinel (planned)

We will introduce a small **BootstrapRunSentinel** contract on mainnet.

High-level interface:

- `function getState() external view returns (uint8 status, bytes32 liveConfigHash, uint256 runTxCount);`
- Minimal storage:
  - `status` — same numeric mapping as `void_mainnet_run_status`.
  - `liveConfigHash` — keccak of the LIVE JSON used for the real run.
  - `runTxCount` — count of TXs the `run()` harness considers part of the bootstrap.
- Optional fields (TBD at implementation):
  - `deployer` — address that performed the run.
  - `version` — small uint for future migrations.

Rules:

- Sentinel writes happen **only** from the bootstrap `run()` harness under explicit
  operator control.
- After `COMPLETED`, we do not change `status` again. Only strictly additive metadata
  (if any) may be updated in future versions.
- `liveConfigHash` on-chain must match the hash of the LIVE JSON that was actually
  used to perform the run.

PLANNING PHASE:

- For now, on-chain sentinel is **stubbed / non-existent**. All scripts must treat
  sentinel as `STUB` and never gate anything critical on it yet.

---

## 5. Prometheus gauges and labels

Current gauges (already wired via textfile exporter):

- `void_mainnet_run_state{status="<STATUS>",plan_version="<PLAN>",hash_match="<MATCH>"}` = 1
  - `status` label mirrors the local JSON `status` string.
  - `plan_version` label mirrors `planVersion`.
  - `hash_match` label:
    - `"MATCH"`   — local `liveHash` matches current LIVE config keccak.
    - `"MISMATCH"` — local `liveHash` does NOT match current LIVE config keccak.
    - `"UNKNOWN"`  — exporter could not compute or compare hashes (e.g. permissions).

- `void_mainnet_run_status` (numeric)
  - 0,1,2,-1,-2 as defined above.

- `void_mainnet_run_chainid`
  - Should be `2050` when config + state are sane.

Planned recording rules (summary):

- `void:mainnet_run:is_not_started:last_5m`
- `void:mainnet_run:is_in_progress:last_5m`
- `void:mainnet_run:is_completed:last_5m`
- `void:mainnet_run:is_failed:last_5m`
- `void:mainnet_run:is_unknown:last_5m`

Each is derived from `void_mainnet_run_status` == (0/1/2/-1/-2) over a 5m window.

Later, once sentinel is live, we will add:

- `void:mainnet_run:sentinel_status:last_5m`  (from on-chain view)
- `void:mainnet_run:state_vs_sentinel:match:last_5m`  (binary agreement gauge)

---

## 6. Overall interpretation (planning phase)

Right now, while `run()` is **stub-only**:

- Local JSON:
  - `status` SHOULD be `"NOT_STARTED"`.
  - `runTxs` SHOULD be `[]`.
- Prom gauges:
  - `void_mainnet_run_status` SHOULD be `0`.
  - `void_mainnet_run_state{status="NOT_STARTED",...}` SHOULD be present and 1.
  - `hash_match` may be `"MATCH"` for local runs (file comparison OK) or `"UNKNOWN"`
    when exported via node_exporter (no config read); both are acceptable in planning-only.
- Sentinel:
  - Not deployed; all scripts must report sentinel status as `STUB` and not fail gates
    on it.

Any deviation (e.g. `IN_PROGRESS` or `COMPLETED`) during this phase is considered a bug
in the scripts or an operator misfire, not a real bootstrap event.

---

## 7. Future mainnet gating (sketch)

When we are close to real mainnet broadcast, we will:

1. Implement the real `run()` wiring in `VoidMainnetBootstrapMainnet.s.sol`.
2. Deploy and wire `BootstrapRunSentinel`.
3. Extend the RUN exporter to cross-check:
   - JSON state
   - Prom gauges
   - Sentinel `getState()`
4. Add `void_mainnet_run_health` (1/0) and fold it into:
   - `void:mainnet_overall:health:last_5m_v2`
   - pre-push / pillars-preflight gates.

At that point, we will treat any inconsistency between local state, gauges, and sentinel
as a hard failure for build and ops gates.

This doc is the reference for all of that work.

