# VOID Mainnet v1 Checklist

> This is the _operational_ checklist for VOID mainnet v1 (chainId 2050).
> No fluff. If it’s not on here, it doesn’t block mainnet.

## 0. Baseline tags and branches

- [ ] Code branch for mainnet core: `feat/mainnet-core-20251120` (or successor) is the canonical mainnet-core branch.
- [ ] Health / monitoring baseline tag:
  - [x] `ckpt-mainnet-pillars-safeboot-20251123-232159` (mainnet-core OK, lastmile OK, tokenomics OK, safeboot pillar OK).
- [ ] All PROM config is `promtool`-clean and guarded (no wildcard includes, no stale jobs).

## 1. Node / chain core

- [ ] Main proposer on :4100 / :4700:
  - [ ] Continuous seals, no gaps, WAL pressure within safe window.
  - [ ] `void_head_number` advancing and matching header3/txroot exporters.
- [ ] txRoot / header integrity:
  - [ ] `void_txroot_health == 1` (no mismatches).
  - [ ] `void_header3_match_v2_last == 1` and `void_header3_last_number_v2` tracks head with acceptable lag.
- [ ] safeboot node:
  - [ ] `void-node@safe-4100.service` runs same code path as main (no stale tree).
  - [ ] Safeboot exposes only allowed routes and shares last-mile exporters.
- [ ] Vector 7 (V7) protections enabled and green in alerts.

## 2. Mainnet core health / SLOs

All of these must be 1 for 24h before we call mainnet “ready”:

- [ ] `void:mainnet_core:health:last_5m == 1`
- [ ] `void:mainnet_lastmile:health:last_5m == 1`
- [ ] `void:mainnet_tokenomics:health:last_5m == 1`
- [ ] `max(void:mainnet_overall:health:last_5m_v2) == 1`
- [ ] `max(void:mainnet_pillars:health:last_5m) == 1`
- [ ] `max(void:pillars:health:last_5m) == 1`
- [ ] `void_safeboot_overall_health == 1`

## 3. Protocol contracts (Admin / Update / Validator / Tokenomics)

Define the “mainnet v1 protocol set” and make sure each has a health signal.

- [ ] Canonical mainnet protocol state file:
  - [ ] `docs/VOID-MAINNET-PROTOCOL-STATE.json` exists.
  - [ ] Contains AdminGate, UpdateGate, ValidatorSet (or equivalent), Token(s), JobQueue, ReceiptRegistry, AgentRegistry, ModelRegistry, DatasetRegistry.
  - [ ] `chainId` hard-coded to `2050`.
- [ ] Admin / Update:
  - [ ] AdminGate deployed and wired to masterKey / signer set.
  - [ ] UpdateGate deployed with M-of-N config and manifest hash enforcement.
  - [ ] On-chain events tested with one fake “update manifest” to prove the path works.
- [ ] Validator / operator story:
  - [ ] Minimal validator set defined (even if initially 1–3 nodes).
  - [ ] On-chain (or config+on-chain) mechanism to add/remove validators.
  - [ ] Tokenomics hooks: block rewards / fees or equivalent economic signal are wired to $VOID / VoidStones logic.
- [ ] Tokenomics:
  - [ ] Core token contracts deployed with parameters matching our decided design.
  - [ ] `void_mainnet_tokenomics_health` (or equivalent) == 1 for 24h.

## 4. Last-mile / tx pipeline

End-to-end tx path must be hard green:

- [ ] `/tx/submit -> acceptTx -> txQueue -> proposer -> SegStore -> txRoot -> header3` verified on mainnet settings.
- [ ] Metrics:
  - [ ] Non-empty blocks when txs are queued (last-mile health).
  - [ ] No stuck/mismatched txRoot or header setters.
- [ ] Prometheus:
  - [ ] Last-mile alerts (`void-mainnet-lastmile-*.yml`) stable, no flapping.
  - [ ] Head vs seals vs txRoot gap alerts are quiet.

## 5. Safeboot pillar

Safeboot must be a real escape hatch, not just a textfile lie.

- [ ] `void-node@safe-4100`:
  - [ ] Starts clean with keygate satisfied.
  - [ ] Uses `VOID_SAFEBOOT=1` and strict preblock guards.
  - [ ] Runs from a known-good git tag (safe tree or main tree, but not stale).
- [ ] Metrics:
  - [x] `void_pillars_safeboot_ok` exported via node_exporter textfile.
  - [x] `void_safeboot_overall_health` recording rule.
  - [ ] Safeboot-specific alerts (`void-safeboot-overall.yml`) fire only when safeboot is actually unhealthy.

## 6. NullFeed + agents (MVP only)

No feature creep beyond what’s needed to prove agents + NullFeed on mainnet.

- [ ] NullFeed contracts:
  - [ ] Minimal post registry deployed on devnet, then mainnet.
  - [ ] Off-chain encrypted blobs handled via Obelisk pipeline (compress → encrypt → off-chain → on-chain commit).
  - [ ] Simple fee flow tied into $VOID / VoidStones tokenomics.
- [ ] Agent pipeline:
  - [ ] JobQueue + ReceiptRegistry deployed on mainnet.
  - [ ] At least one NullFeed agent process running against mainnet (does simple jobs, writes receipts).
  - [ ] Health metrics:
    - [ ] Mainnet agent receipts coverage metric defined (similar to devnet coverage).
    - [ ] Alerts only for real stalls, not misconfig.

## 7. Monitoring / gating

Mainnet must be guarded by metrics, not vibes.

- [ ] All void-* rule and alert files `promtool` clean (already enforced).
- [ ] No legacy/stale jobs (header3 v1, old health jobs, etc.).
- [ ] Global “VOID overall green” alert stays green when:
  - [ ] mainnet-core, last-mile, tokenomics, safeboot, and update windows are all OK.
- [ ] Update window / expiry:
  - [ ] `void_update_manifest_*_days_left` metrics present for devnet + mainnet.
  - [ ] Alerting on low days_left tested once then left green.

## 8. Final pre-mainnet gate

Before we flip the “mainnet live” switch:

- [ ] 24h run where:
  - [ ] All mainnet SLOs are at 1.
  - [ ] No Vector 7 / WAL / txroot / header integrity alerts fire.
  - [ ] Safeboot pillar remains 1.
- [ ] Final snapshot:
  - [ ] Prometheus snapshot and config tarball saved.
  - [ ] Git tag created: `mainnet-v1-ready-YYYYMMDD-HHMMSS`.
