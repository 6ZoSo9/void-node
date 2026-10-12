# Mainnet Bootstrap Implementation Checklist

Status: implementation bridge between the premine-vault design lock and the eventual real bootstrap source  
Related:
- `ops/mainnet/void-mainnet.live.json`
- `script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol`
- `docs/MAINNET_PREMINE_VAULTS_BOOTSTRAP_SEQUENCE.md`

## Purpose

This checklist translates the locked premine-vault design into a concrete implementation plan for the future real mainnet bootstrap rewrite.

It exists to answer four questions clearly:

1. What inputs must the real bootstrap require?
2. What actions happen, and in what order?
3. Which actions are offline-only, hot-wallet-only, or live-broadcast?
4. What invariants must pass before any live broadcast is allowed?

---

## 1. Required inputs

The real bootstrap implementation must require all of the following inputs explicitly.

### 1.1 Chain / environment inputs

- Target chain id must be `2050`
- RPC endpoint for rehearsal / verification
- Explicit mode:
  - `PLAN_ONLY`
  - `REHEARSAL`
  - `LIVE_BROADCAST`
- Explicit environment separation:
  - dev / rehearsal
  - mainnet

### 1.2 Key / wallet inputs

- Selected premine vault id
- Selected premine vault address
- Active hot wallet address
- AdminGate controlling key/address
- UpdateGate signer set / owner
- ConfigGate controlling address
- Validator admin address
- Treasury admin address
- Ops treasury admin address

### 1.3 Funding / allocation inputs

- Hot wallet refill amount
- Treasury allocation amount
- Pool seeding allocation amount
- Any other approved bootstrap allocation amounts

### 1.4 Contract / config inputs

- VoidToken target config
- ValidatorSet bootstrap config
- AdminGate config
- UpdateGate config
- ConfigGate config
- Treasury / OpsTreasury config
- RewardEngine config
- Initial validator set / validator0 config
- Any initial policy/config values required for Mainnet-0

---

## 2. Required execution phases

The final bootstrap implementation should be structured into clearly separated phases.

### Phase A — Offline preparation

These steps must happen without exposing untouched premine vaults to a networked machine.

- Select current premine vault for this funding cycle
- Record vault id / purpose / status in written ledger
- Confirm untouched vaults remain offline
- Prepare/refill active hot wallet from the selected vault only
- Confirm the refill amount is bounded and intentional
- Confirm pool seeding amount is bounded and intentional

### Phase B — PLAN_ONLY validation

This phase must never broadcast.

- Load pinned live config
- Validate chain id
- Validate selected vault metadata
- Validate hot wallet metadata
- Validate bootstrap allocation amounts
- Validate that configured allocations do not imply a full-premine treasury transfer
- Validate that required role addresses are present
- Validate that contract config is internally consistent
- Validate that validator bootstrap config is internally consistent
- Print a human-readable plan summary
- Refuse any state mutation

### Phase C — REHEARSAL execution

This phase is for dev/test rehearsal only.

- Deploy / wire contracts in a rehearsal environment
- Model selected premine vault as current source wallet
- Fund active hot wallet with bounded refill
- Fund treasury with bounded explicit allocation
- Fund pool seeding with bounded explicit allocation
- Leave remaining premine in selected vault model
- Verify balances and ownership after each step
- Verify validator wiring
- Verify gate wiring
- Verify RewardEngine / treasury plumbing
- Refuse “move all premine to treasury” behavior

### Phase D — LIVE_BROADCAST execution

This phase must be heavily gated.

- Re-validate config and chain id
- Require explicit live-broadcast mode
- Require explicit operator confirmation input
- Require PLAN_ONLY and/or REHEARSAL prechecks to have passed
- Perform only the approved live actions
- Keep funding actions explicit and bounded
- Do not implicitly sweep all premine into treasury
- Emit/log post-action balance summaries
- Halt on first failed invariant

---

## 3. Funding model rules

The implementation must preserve these rules.

### Allowed

- One selected premine vault active at a time
- One small active hot wallet active at a time
- Explicit bounded allocation to treasury
- Explicit bounded allocation to pool seeding
- Explicit bounded operational refill

### Forbidden

- Full-premine transfer into `VoidTreasury`
- Full-premine transfer into any single hot wallet
- Treating one live treasury as the source of the whole premine
- Implicit funding behavior hidden inside a broad bootstrap step
- Reusing dev keys for mainnet

---

## 4. Pre-broadcast invariants

Before live broadcast is allowed, the implementation must verify all of the following.

### Config invariants

- chain id is `2050`
- config mode is correct for intended action
- selected premine vault is explicitly identified
- active hot wallet is explicitly identified
- vault-count assumptions remain consistent with 30-vault plan
- allocation amounts are all bounded and nonzero where required
- total planned allocations do not exceed intended available source balance

### Key / custody invariants

- selected premine vault was chosen intentionally
- untouched premine vaults remain offline
- active hot wallet is limited in purpose and size
- live keys are not being pulled from repo artifacts
- LUKS flash-drive key model remains the assumed custody path

### Bootstrap invariants

- no step implies monolithic premine consolidation
- treasury funding is partial and explicit
- pool seeding is partial and explicit
- validator wiring is complete enough for intended stage
- AdminGate / UpdateGate / ConfigGate addresses are sane
- no dev-only placeholder addresses remain in live mode

### Safety invariants

- PLAN_ONLY path never mutates state
- REHEARSAL path never claims to be live
- LIVE_BROADCAST path is explicitly gated
- any missing critical input forces failure
- any chain-id mismatch forces failure

---

## 5. Real bootstrap implementation tasks

These are the next concrete engineering tasks.

### Task 1 — Define final live JSON schema

The final live JSON schema should include:

- chain id
- mode / status
- selected premine vault id/address
- active hot wallet address
- funding allocation amounts
- gate/admin addresses
- validator bootstrap data
- treasury / ops treasury / reward engine addresses or deployment plan
- pool seeding allocation plan

### Task 2 — Rebuild compile-green bootstrap source

Rebuild a real tracked bootstrap source that:

- compiles in the current repo layout
- uses the selected premine vault model
- uses the active hot wallet model
- uses explicit bounded allocations
- preserves PLAN_ONLY / REHEARSAL / LIVE_BROADCAST separation

### Task 3 — Rebuild or replace stale treasury-centric broadcast assumptions

Replace old assumptions that still imply:

- single premine owner
- monolithic treasury consolidation
- full-premine transfer into `VoidTreasury`

### Task 4 — Add proof/check scripts

Add scripts that prove:

- pinned config matches required schema
- allocations are bounded
- no monolithic premine transfer path exists
- selected vault / hot wallet / treasury balances match intended flow
- pool seeding source is explicitly tracked

### Task 5 — Add operator runbook checks

Add runbook-level checks for:

- vault ledger update completed
- selected vault confirmed
- untouched vaults remain offline
- active hot wallet balance cap respected
- live-broadcast gate conditions satisfied

---

## 6. Definition of done for bootstrap rewrite

The future real bootstrap implementation is only “done” when all of the following are true:

- it compiles in the current repo
- it accepts the final live JSON schema
- it supports PLAN_ONLY without mutation
- it supports rehearsal with explicit bounded funding
- it supports live mode only behind explicit gates
- it does not model monolithic premine-to-treasury transfer
- it preserves the 30-vault premine plan
- it preserves the active hot wallet model
- it preserves explicit pool seeding from premine allocations

---

## 7. Current repo status against this checklist

As of the current state:

- Design lock note exists
- Pinned live JSON stub exists
- Exporter/check logic understands the new premine schema
- Rebuilt rehearsal bootstrap stub exists
- Real compile-green bootstrap source for current repo layout does not yet exist
- Old treasury-centric bootstrap assumptions remain in historical artifacts and recovered source, not in the new design lock

This checklist should be used as the bridge from current design truth to the future real bootstrap implementation.
