# VOID Mainnet — WorkCredits Pillar (v0)

## 1. Scope

This document tracks the WorkCredits pillar for VOID mainnet.

- This is a meta / ops pillar, not the full economic spec.
- Goal: ensure mainnet has a clean, checkable signal for:
  - “Do we have a WorkCredits mainnet spec JSON?”
  - “Does it have non-zero addresses for the WorkCredits token and pool?”
  - “Is the WorkCredits pillar health gauge green?”
- For now, this is non-gating (soft pass) in ops/void-mainnet-pillars-preflight.sh.
  - We can flip it to hard-gating later when WorkCredits mainnet wiring is real.

## 2. Config: live WorkCredits spec JSON

File:

- config/void-mainnet-workcredits.live.json

Structure (conceptual):

    {
      "chainId": 2050,
      "workCreditsToken": "0x0000000000000000000000000000000000000000",
      "workCreditsPool":  "0x0000000000000000000000000000000000000000"
    }

Rules:

1. chainId must be 2050 (VOID mainnet).
2. workCreditsToken:
   - Zero address (0x0000...0000) means “not wired yet”.
   - Non-zero address means “this is the canonical WorkCredits mainnet token”.
3. workCreditsPool:
   - Zero address: “no mainnet WC/VOID pool yet”.
   - Non-zero: canonical mainnet WC/VOID AMM pool (WorkCreditsPoolV1 or successor).

We update this JSON only when:
- WorkCredits token is actually deployed on mainnet.
- WorkCredits pool (WC/VOID) is actually live on mainnet.
- We are ready to treat non-zero addresses as production truth.

Until then, workCreditsToken / workCreditsPool stay at zero and the pillar is allowed to be red.

## 3. Exporter: textfile collector

Script:

- ops/void-mainnet-workcredits-exporter.sh

Key behavior:

- Reads CFG (default: config/void-mainnet-workcredits.live.json).
- Emits Prometheus textfile metrics to:

    /var/lib/node_exporter/textfile_collector/void_mainnet_workcredits.prom

Internal checks:

- spec_present = 1 if the JSON exists.
- spec_nonempty = 1 if both workCreditsToken and workCreditsPool are non-zero addresses.
- health = 1 if spec_present == 1 and spec_nonempty == 1.

Non-zero address check:

- Anything not equal to lowercase zero address is treated as non-zero:

    0x0000000000000000000000000000000000000000  -> zero
    anything else                               -> non-zero

This mirrors the patterns used by other pillars.

## 4. Metrics: gauges and 5m view

Exporter emits:

- void_mainnet_workcredits_spec_present
- void_mainnet_workcredits_spec_nonempty
- void_mainnet_workcredits_health

Recording rule (5m smoothed view):

- void:mainnet_workcredits:health:last_5m

Intended semantics:

- spec_present:
  - 1 → spec JSON exists.
  - 0 → file missing; WorkCredits pillar not configured.
- spec_nonempty:
  - 1 → token + pool both non-zero.
  - 0 → at least one is zero (pre-wiring / misconfigured).
- health:
  - 1 → pillar is happy: spec exists and non-zero addresses.
  - 0 → pillar is not healthy yet (stub/partial).

## 5. Pillars-preflight behavior

Script:

- ops/void-mainnet-pillars-preflight.sh

Current behavior (v0):

- Runs the usual pillars:
  - safeboot
  - devnet
  - mainnet-core
  - lastmile
  - keys
  - plan
  - validators
  - etc.

- Then runs WorkCredits health as a soft step:

    ./ops/void-mainnet-workcredits-health-all.sh || echo "[workcredits-health] NON-ZERO EXIT (ignored for now; pillar is allowed to be red while spec is stubbed)"

Interpretation:

- If WorkCredits pillar is red (expected while addresses are zero), pre-push still passes.
- Output clearly labels this as “allowed to be red while spec is stubbed”.

This keeps WorkCredits on the radar without blocking mainnet work.

## 6. Health-all helper

Script:

- ops/void-mainnet-workcredits-health-all.sh

Behavior:

- Queries Prometheus for:

    void_mainnet_workcredits_spec_present
    void_mainnet_workcredits_spec_nonempty
    void_mainnet_workcredits_health

- Prints raw gauges and a summary:
  - spec_ok = 1 if spec_present == 1 and spec_nonempty == 1.
  - Healthy if spec_ok == 1 and health == 1.

- Exit codes:
  - 0 → pillar is fully healthy.
  - 1 → pillar not healthy yet (expected while mainnet WC is not wired).

For now, pillars-preflight ignores this non-zero exit (soft gate).

## 7. Implementation status (this checkpoint)

At this checkpoint:

- Spec JSON exists:

    config/void-mainnet-workcredits.live.json

- Exporter works:

  - ops/void-mainnet-workcredits-exporter.sh writes void_mainnet_workcredits.prom.
  - spec_present=1, spec_nonempty=0, health=0 (as expected for zero addresses).

- Prometheus sees:

    void_mainnet_workcredits_spec_present = 1
    void_mainnet_workcredits_spec_nonempty = 0
    void_mainnet_workcredits_health = 0
    void:mainnet_workcredits:health:last_5m = 0

- ops/void-mainnet-workcredits-health-all.sh prints
  “RESULT: BAD (WorkCredits pillar not healthy yet)” and exits 1.
- ops/void-mainnet-pillars-preflight.sh runs the WorkCredits health-all step but does not gate on it.

Tags associated with this state (for reference):

- ckpt-mainnet-workcredits-pillar-stub-...
- ckpt-mainnet-workcredits-spec-...
- ckpt-mainnet-workcredits-pillar-stub-v2-...

(Exact timestamps via: git tag -l 'ckpt-mainnet-workcredits-*'.)

## 8. Future work (post-mainnet / later phases)

Once VOID mainnet is live and stable, we will:

1. Deploy WorkCredits contracts on mainnet:
   - WorkCreditsToken mainnet instance.
   - WorkCreditsPoolV1 (or successor) WC/VOID pool.

2. Update the live JSON with real addresses:
   - Set workCreditsToken to mainnet WC token address.
   - Set workCreditsPool to mainnet pool address.
   - Re-run the exporter; expect spec_nonempty=1, health=1.

3. Tighten the gate (optional future change):
   - Turn WorkCredits pillar into a hard gate in ops/void-mainnet-pillars-preflight.sh.
   - Add composite metrics if needed, such as:
     - void_mainnet_pillars_with_workcredits_health
     - void:mainnet_pillars_with_workcredits:health:last_5m

4. Wire into Obelisk / dashboard:
   - Show WorkCredits pillar state (red/amber/green) in the “Work Credits” / “Dashboard” tabs.
   - Later tie into more detailed metrics: pool liquidity, price, on-chain volume.

## 9. Design principle

- Keep WorkCredits as a separate, explicit pillar:
  - It should not silently break mainnet if WC is misconfigured.
  - Ops, dashboards, and AI agents should immediately know if WorkCredits is wired and healthy.
- Early phase (now):
  - Pillar is visible but soft.
- Later phases:
  - Pillar becomes part of the full “economic health” view once mainnet WC contracts exist.

