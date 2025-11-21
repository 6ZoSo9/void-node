# VOID Mainnet Core Health (Pillar Spec v1)

This doc defines what "mainnet core health" means for VOID and how our
Prometheus gauges + recording rules are interpreted by the CLI and pre-push
guards.

Goal: a single truth for "is mainnet core sane enough to let changes out?"

---

## 1. Core gauges (Prometheus)

Raw gauges:

- void_mainnet_core_health  
  - 1 = core node(s) + critical exporters behaving as expected  
  - 0 = something core is broken (header3, txroot, proposer, seals, etc.)

- void_mainnet_core_manifest_health  
  - 1 = mainnet core is following a valid, non-expired UpdateGate manifest  
  - 0 = no valid manifest, manifest expired, or manifest parse/update failed

- void_mainnet_core_manifest_days_left  
  - Approx days until the current mainnet core manifest expires  
  - Example: 365 = about one year of runway

Safeboot pillar:

- safeboot_overall  
  - 1 = safeboot node is up and its own health rules pass  
  - 0 = safeboot is down or failing health checks

Other safeboot helpers (void:safeboot:health_ok, void:safeboot:head_ok) are
best-effort. safeboot_overall is the one that matters for pillars.

---

## 2. Recording rules (smoothed views)

To avoid flapping, we use 5m smoothed views:

- void:mainnet_core:health:last_5m  
  - Defined as: max_over_time(void_mainnet_core_health[5m])  
  - 1 = core has been healthy at least once in last 5 minutes  
  - 0 = core has been consistently bad for 5+ minutes

- void:mainnet_core:manifest_days_left:last  
  - Defined as: last_over_time(void_mainnet_core_manifest_days_left[5m])  
  - Tracks the last known days_left over 5m

Overall mainnet pillar view:

- void:mainnet_overall:health:last_5m  
  - Combines:
    - safeboot_overall
    - void_mainnet_core_health (and/or its 5m view)
    - manifest health + days_left requirements  
  - 1 = "VOID mainnet pillar OK"  
  - 0 = something in the mainnet pillar stack is wrong

---

## 3. What "healthy" means in practice

Mainnet core is considered healthy when ALL of this is true:

1) safeboot_overall == 1  
   - Safeboot node up and passing its own health rules

2) void_mainnet_core_health == 1  
   AND void:mainnet_core:health:last_5m == 1  
   - Core exporters (header3, txroot, proposer, seals, etc.) are OK now and
     across a 5-minute window

3) void_mainnet_core_manifest_health == 1  
   - Update manifest for mainnet core is valid and non-broken

4) void_mainnet_core_manifest_days_left >= 7  
   - Minimum 7-day runway for mainnet core manifests  
   - Below 7 days = operational risk; we block risky flows (like pushing
     mainnet-core changes)

If any of these fail, void:mainnet_overall:health:last_5m should eventually go 0.

---

## 4. How pillars-preflight uses these gauges

The pillars-preflight script (called by pre-push on feat/mainnet-core-* branches)
does:

1) Safeboot check  
   - Reads safeboot_overall  
   - Requires: safeboot_overall == 1

2) Mainnet core check  
   - Reads:
     - void_mainnet_core_health
     - void:mainnet_core:health:last_5m
     - void_mainnet_core_manifest_health
     - void_mainnet_core_manifest_days_left
   - Requires:
     - void_mainnet_core_health == 1
     - void:mainnet_core:health:last_5m == 1
     - void_mainnet_core_manifest_health == 1
     - void_mainnet_core_manifest_days_left >= 7

3) Pillars summary  
   - Prints safeboot + devnet + mainnet core summary, including chosen
     manifest_days  
   - If any pillar is red (or manifest_days < 7), preflight fails and blocks
     the push

Net effect: mainnet-core Git pushes are tied to live Prometheus state.

---

## 5. Operator checklist ("is mainnet core green?")

Quick manual checks:

    # Core gauges
    curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_mainnet_core_health' \
      | jq -r '.data.result[0].value // "null"'

    curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_mainnet_core_manifest_health' \
      | jq -r '.data.result[0].value // "null"'

    curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void_mainnet_core_manifest_days_left' \
      | jq -r '.data.result[0].value // "null"'

    # Smoothed views and overall
    curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void:mainnet_core:health:last_5m' \
      | jq -r '.data.result[0].value // "null"'

    curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void:mainnet_core:manifest_days_left:last' \
      | jq -r '.data.result[0].value // "null"'

    curl -fsS 'http://127.0.0.1:9090/api/v1/query?query=void:mainnet_overall:health:last_5m' \
      | jq -r '.data.result[0].value // "null"'

Healthy shape:

- safeboot_overall = 1
- void_mainnet_core_health = 1
- void:mainnet_core:health:last_5m = 1
- void_mainnet_core_manifest_health = 1
- void_mainnet_core_manifest_days_left >= 7
- void:mainnet_overall:health:last_5m = 1

If any come back null or 0: fix exporter / manifest / node before trusting
mainnet core or pushing mainnet-core branches.

---

## 6. Future extensions (notes)

Later, void_mainnet_core_health can be extended to include:

- Header parity / gap (header3 v2)
- TxRoot mismatch / stall checks
- Proposer tick SLOs
- Vector 7 (V7) pressure / WAL stress guards
- Agent receipts coverage for mainnet, once live

Contract: void_mainnet_core_health stays a single scalar meaning
"mainnet core is reasonably safe and up to spec", and pre-push / pillars logic
continue to depend only on:
- safeboot_overall
- void_mainnet_core_health (+ its smoothed view)
- void_mainnet_core_manifest_health
- void_mainnet_core_manifest_days_left
