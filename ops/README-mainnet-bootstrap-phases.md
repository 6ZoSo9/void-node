# VOID Mainnet — Bootstrap Phases (Prometheus View)

This doc explains the human phases we use when talking about VOID mainnet bootstrap,
and how they map to the Prometheus gauges + ops scripts.

It does not define on-chain state. It is an operator view only.

---

## 0. Inputs (metrics + scripts)

Prometheus recordings we care about:

- void:mainnet_overall:health:last_5m_v2
- void:mainnet_pillars:health:last_5m
- void:mainnet_lastmile:health:last_5m
- void:mainnet_bootstrap_plan:configured:last_5m
- void:mainnet_bootstrap_plan:health:last_5m

Ops scripts:

- ops/void-mainnet-health-all.sh
- ops/void-mainnet-bootstrap-plan-status.sh
- ops/void-mainnet-bootstrap-plan-rehearse.sh
- ops/void-mainnet-bootstrap-plan-readiness.sh
- ops/void-mainnet-bootstrap-phase.sh

The phase script is read-only:

- ./ops/void-mainnet-bootstrap-phase.sh

It curls Prometheus and prints a label like PRE, A, B, or C.

---

## 1. Phase PRE — Core not healthy

Label: PRE

Conceptual condition:

- void:mainnet_pillars:health:last_5m != 1
  OR
- void:mainnet_lastmile:health:last_5m != 1

Meaning:

- We are not ready to think about mainnet bootstrap yet.
- Fix devnet / mainnet-core / safeboot / lastmile until all pillars are green.

The phase script should say something like:

- phase  : PRE
- reason : core pillars and/or lastmile not all healthy yet

---

## 2. Phase A — Dev-only, PLAN not configured

Label: A

Conceptual condition:

- void:mainnet_pillars:health:last_5m == 1
- void:mainnet_lastmile:health:last_5m == 1
- void:mainnet_bootstrap_plan:configured:last_5m == 0
- void:mainnet_bootstrap_plan:health:last_5m == 0

Meaning:

- Core network is healthy.
- Live PLAN config is not wired into metrics yet.
- We are still in "dev bootstrap only" territory.
- Too early to rehearse a real mainnet PLAN.

---

## 3. Phase B — PLAN configured but NOT READY

Label: B

Conceptual condition:

- void:mainnet_pillars:health:last_5m == 1
- void:mainnet_lastmile:health:last_5m == 1
- void:mainnet_bootstrap_plan:configured:last_5m == 1
- void:mainnet_bootstrap_plan:health:last_5m == 0

Meaning:

- PLAN pipeline is wired and exporting gauges.
- CONFIG_OK = 1 but STRUCT_OK = 0 from the exporter.
- JSON status + Forge rehearsal say:
  - Critical roles.* are still ZERO.
  - Critical contracts.* are still ZERO.
  - validator0 reward/consensusKey/stake are still placeholder or TODO.

Allowed in phase B:

- Iterate on docs:
  - ops/README-mainnet-bootstrap-plan-live.md
  - ops/README-mainnet-plan-roles-and-keys.md
  - ops/README-mainnet-keys-and-devices.md
- Iterate on PLAN tooling:
  - ops/void-mainnet-bootstrap-plan-fill-from-env.sh (env-fill helper)
  - PLAN rehearsal and demo helpers.
- Polish Obelisk validator UX and node install docs.

Not allowed in phase B:

- Treat the PLAN as “ready”.
- Flip any boolean or bypass metric guards to force plan_health = 1.

---

## 4. Phase C — PLAN READY (no broadcast yet)

Label: C

Conceptual future condition:

- void:mainnet_pillars:health:last_5m == 1
- void:mainnet_lastmile:health:last_5m == 1
- void:mainnet_bootstrap_plan:configured:last_5m == 1
- void:mainnet_bootstrap_plan:health:last_5m == 1

Meaning:

- Live PLAN JSON is fully populated (roles, contracts, validator0).
- PLAN exporter reports CONFIG_OK = 1 and STRUCT_OK = 1.
- Forge rehearsal with the live config passes with planReady = true.

At this point:

- We are logically ready for a mainnet bootstrap PLAN-only dry run and human review.
- Still no transactions broadcast.

Any real broadcast scripts will be gated on reaching phase C.

---

## 5. Phase D (future) — Post-bootstrap DONE

Label: D (not wired yet)

Concept:

- Will depend on a dedicated post-bootstrap metric, for example:
  - void_mainnet_bootstrap_done == 1

Emitted by a one-shot script that only succeeds once real bootstrap
has been performed and validated.

This is intentionally not implemented yet. It will be designed closer
to real mainnet launch.

---

## 6. Current expected state (dev viewpoint)

When this doc was written:

- Core pillars and lastmile are healthy (PRE is passed).
- PLAN pipeline is wired and exports gauges.
- Live PLAN JSON is still intentionally ZEROED (no real roles/contracts/validator0).

So we expect:

- Phase script to report phase B once the recordings are fully wired:
  - phase  : B
  - reason : PLAN configured but NOT READY (roles/contracts/validator0 incomplete)

Metrics should look like:

- void:mainnet_bootstrap_plan:configured:last_5m = 1
- void:mainnet_bootstrap_plan:health:last_5m     = 0

We should stay in phase B until:

- Real mainnet keys exist on the LUKS-backed device and are documented.
- Live PLAN config has been filled from those keys on a trusted path.
- Forge rehearsal with the live config passes and exporter reports STRUCT_OK = 1.

Only then do we move to phase C.

---

## 7. Scripts to remember

Quick commands (all read-only with respect to chain state):

- ./ops/void-mainnet-bootstrap-readiness.sh
- ./ops/void-mainnet-bootstrap-plan-status.sh
- ./ops/void-mainnet-bootstrap-plan-readiness.sh
- ./ops/void-mainnet-bootstrap-plan-rehearse.sh
- ./ops/void-mainnet-bootstrap-phase.sh

These may update Prometheus textfiles under ops/metrics/, but they do
not deploy contracts or broadcast transactions.
