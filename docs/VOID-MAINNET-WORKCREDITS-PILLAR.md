# VOID Mainnet — WorkCredits Pillar (v1, stub era)

This doc tracks the WorkCredits pillar for VOID mainnet and how we monitor it.

Right now this pillar is stubbed: there are no real mainnet WorkCredits contracts,
so the pillar is expected to be red. We just want clean metrics, alerts, and a
composite health signal.

---

## 1. Config JSON (stub spec)

File:

- config/void-mainnet-workcredits.live.json

Current stub contents (conceptual):

- chainId: 2050
- workCreditsToken: 0x0000000000000000000000000000000000000000
- workCreditsPool:  0x0000000000000000000000000000000000000000

Rules:

1) chainId must be 2050 for mainnet.
2) workCreditsToken:
   - 0x0000…0000 → not wired yet (stub).
   - non-zero → canonical mainnet WorkCredits token address.
3) workCreditsPool:
   - 0x0000…0000 → no WC/VOID mainnet pool yet.
   - non-zero → canonical mainnet WC/VOID AMM pool.

During the stub era we intentionally keep both zero.
We only flip them to real addresses when mainnet WorkCredits is live.

---

## 2. Exporter: ops/void-mainnet-workcredits-exporter.sh

Script:

- ops/void-mainnet-workcredits-exporter.sh

Config input:

- config/void-mainnet-workcredits.live.json

Textfile output:

- /var/lib/node_exporter/textfile_collector/void_mainnet_workcredits.prom

Behavior (summary):

1) If config JSON is missing:
   - void_mainnet_workcredits_health = 0
   - void_mainnet_workcredits_info{mode="stub",reason="missing_config",...} 1

2) If jq is missing:
   - void_mainnet_workcredits_health = 0
   - void_mainnet_workcredits_info{mode="stub",reason="jq_missing",...} 1

3) If chainId != 2050:
   - void_mainnet_workcredits_health = 0
   - void_mainnet_workcredits_info{mode="stub",reason="bad_chainId",chainId="...",...} 1

4) If chainId == 2050 and JSON parses:
   - It inspects workCreditsToken and workCreditsPool.
   - Zero vs non-zero are encoded into labels:
       token_zero = "true" | "false"
       pool_zero  = "true" | "false"
   - Current stub semantics:
       both zero → pillar unhealthy (expected right now)
       both non-zero → pillar healthy once mainnet WC is wired.

Key metrics (logical meaning):

- void_mainnet_workcredits_spec_present
    1 → JSON file exists and parsed
    0 → file missing or unreadable

- void_mainnet_workcredits_spec_nonempty
    1 → token and pool are both non-zero
    0 → at least one is zero

- void_mainnet_workcredits_health
    1 → spec present and non-zero addresses (real mainnet wiring)
    0 → missing spec, bad chainId, or stub/zero-addr state

---

## 3. Recording rule (5-minute view)

Recording rule:

- void:mainnet_workcredits:health:last_5m

This rolls void_mainnet_workcredits_health into a 5-minute view
(max_over_time style) so brief exporter blips do not cause noisy alerts.

Right now (stub era):

- void_mainnet_workcredits_health = 0
- void:mainnet_workcredits:health:last_5m = 0

---

## 4. Alert: VoidMainnetWorkCreditsUnhealthy

Alert name:

- VoidMainnetWorkCreditsUnhealthy

Condition (conceptual):

- Fires when void_mainnet_workcredits_health == 0 for at least 10m.

Annotation (summary):

- Says the WorkCredits mainnet pillar is UNHEALTHY.
- Common causes:
    * spec JSON missing or still stubbed
    * textfile not updating
- Tells you to check:
    1) sudo sed -n '1,40p' /var/lib/node_exporter/textfile_collector/void_mainnet_workcredits.prom
    2) config/void-mainnet-workcredits.live.json
    3) sudo ops/void-mainnet-workcredits-exporter.sh

During the stub era this alert is expected to be pending/warning,
because WorkCredits is not wired on mainnet yet.

---

## 5. Composite health with pillars + validators + WorkCredits

Base composite (already green):

- void_mainnet_pillars_with_validators_health
- void:mainnet_pillars_with_validators:health:last_5m

These combine:
- safeboot
- devnet
- mainnet-core
- lastmile
- keys
- plan
- validators RUN

Current value: 1 (healthy).

Extended composite including WorkCredits:

- void_mainnet_pillars_with_validators_and_workcredits_health
- void:mainnet_pillars_with_validators_and_workcredits:health:last_5m

Conceptual formula:

    composite =
      void_mainnet_pillars_with_validators_health
      * void_mainnet_workcredits_health

Today:

- pillars_with_validators_health = 1
- void_mainnet_workcredits_health = 0
- composite = 0 (by design, because WC is stubbed).

We treat the WorkCredits-extended composite as informational for now.
Pre-push gating still uses the base pillars+validators metric that is 1.

---

## 6. Future TODOs for this pillar

When we actually wire WorkCredits on mainnet:

1) Update config/void-mainnet-workcredits.live.json with:
   - real workCreditsToken address
   - real workCreditsPool address

2) Confirm exporter output:
   - spec_present = 1
   - spec_nonempty = 1
   - health = 1
   - info{reason="ok_live",...} 1 (we can refine this reason later)

3) Ensure:
   - void:mainnet_workcredits:health:last_5m == 1
   - void_mainnet_pillars_with_validators_and_workcredits_health == 1

4) Decide when to:
   - make WorkCredits a hard part of ops/void-mainnet-pillars-preflight.sh
   - bump alert severity from warning to critical once WC is required
     for mainnet operation.

Until then, this doc is the canonical reference for:
- what the WorkCredits mainnet pillar is,
- what metrics to look at,
- why the composite including WorkCredits is 0 while the rest of the
  pillars are fully green.

## Mainnet WorkCredits pillar: metrics and health

The VOID mainnet WorkCredits pillar is monitored via a textfile exporter and
Prometheus gauges. These are the canonical signals:

### Core gauges

- void_mainnet_workcredits_health
  - 1 = WorkCredits mainnet pillar is healthy.
  - 0 = pillar failing (config/exporter problem).

- void_mainnet_workcredits_config{chain_id="2050",reason="ok"}
  - Confirms the live JSON config:
    - config/void-workcredits-mainnet.live.json
  - Labels:
    - chain_id — expected to be "2050".
    - reason   — "ok" when config passes internal checks.

- void_mainnet_workcredits_checks{check="..."}
  - Individual config checks (1=pass, 0=fail).
  - Expected checks:
    - check="chain_id_2050"
    - check="void_token_nonzero"
    - check="wc_token_nonzero"
    - check="pool_nonzero"
    - check="decimals_18"

If any of these checks drop to 0, void_mainnet_workcredits_health should
eventually expose the failure and the pillar should be treated as unhealthy.

### Composite pillars + validators + WorkCredits

WorkCredits is also included in the composite mainnet pillar:

- void:mainnet_pillars_with_validators_and_workcredits:health:last_5m

Semantics:

- 1 = all of the following are healthy:
  - mainnet keys pillar
  - PLAN pillar
  - safeboot pillar
  - devnet pillar
  - mainnet core pillar
  - mainnet lastmile pillar
  - validators RUN pillar
  - WorkCredits mainnet pillar
- 0 = at least one of those components is unhealthy.

This composite is used by higher-level health gates (pillars-preflight,
pre-push, etc.) to ensure WorkCredits is wired into the overall mainnet
readiness story.

### Quick CLI smoke: mainnet health summary

Use the helper script to check the full mainnet bootstrap + pillars state in
one shot:

    cd "$HOME/dev/void-node"
    ./ops/void-mainnet-health-summary.sh

You should see lines like:

- void_mainnet_workcredits_health 1
- void:mainnet_pillars_with_validators_and_workcredits:health:last_5m 1

And a final summary similar to:

    [RESULT] OK (keys + PLAN + safeboot + devnet + mainnet-core + lastmile + workcredits + composite all healthy)

This script is the preferred way to quickly confirm that:

- WorkCredits mainnet pillar is healthy, and
- It is fully included in the composite mainnet pillars + validators +
  WorkCredits health check.

