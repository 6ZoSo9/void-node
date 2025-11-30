# VOID — Obelisk Validator Policy + Metrics (Draft v0)

Status: DRAFT (pre-mainnet)  
Scope: Concrete shape of validator policies and the metrics schema Obelisk Wallet will use.

---

## 1. Background

This doc refines the Obelisk validator plan:

- Validators are driven by:
  - Validator keys (VK) — sign consensus messages.
  - Spending keys — move stake and rewards.
  - Optional Ops keys — manage metadata, rotation, policies.
- We DO NOT mutate v99 core consensus rules.
- We layer policies + metrics around existing ValidatorSet / RewardEngine.

---

## 2. ValidatorPolicy (conceptual struct)

We treat a “validator policy” as a signed, revocable bundle of rules that an engine (Titan, NUC, etc.) must obey when acting on behalf of a validator key.

Conceptual Solidity-ish shape (not the final code):

    struct ValidatorPolicy {
        // Who this policy is for
        address validator;         // validator key (VK)
        address engine;            // engine/operator (optional, 0x0 = any engine)

        // Time / epoch bounds
        uint64  startEpoch;        // inclusive
        uint64  endEpoch;          // inclusive, or 0 for "until revoked"

        // Limits / risk bounds
        uint32  maxMissedEpochs;   // soft bound before wallet should warn / pause
        uint32  maxHeadGapBlocks;  // max allowed head gap before engine auto-pauses
        uint32  maxSlashEvents;    // 0–1 in practice; >0 means "one strike then kill policy"

        // Capabilities
        bool    canPropose;        // block proposals
        bool    canAttest;         // attestations / votes
        bool    canHeartBeat;      // liveness pings / telemetry

        // Metadata / bookkeeping
        bytes32 policyId;          // hash of the policy contents
        uint64  issuedAt;          // timestamp/epoch when signed
        uint64  revokedAt;         // 0 if active, otherwise revocation time
    }

Signatures:

- Policies are signed by the validator key (VK).
- Optional secondary signatures:
  - Ops key / spending key for extra confirmation when policies include high risk.

On-chain representation (options):

- V0 (minimal):
  - Store only policyId and a few scalar flags in ValidatorSet or a separate ValidatorPolicyRegistry.
  - Full policy lives off-chain (in Obelisk and engines), but hash is on-chain for audit.
- Later:
  - Full policy struct can be stored in a dedicated registry for more on-chain introspection.

---

## 3. Policy Lifecycle (Wallet + Engine)

### 3.1 Creation (Obelisk Mobile / Titan)

1. Wallet builds a ValidatorPolicy object.
2. Wallet signs keccak256(policy) with VK.
3. Wallet:
   - Saves policy locally.
   - Sends policy to:
     - The user’s engine (Titan / NUC) over a secure channel.
     - On-chain registry (optional) via a tx that sets policyId and status.

### 3.2 Engine Behavior

An engine that accepts policies MUST:

- Verify:
  - validator matches the validator it is configured to serve.
  - Signature is valid for validator.
  - Current epoch is within [startEpoch, endEpoch].
- Enforce:
  - Only sign messages allowed by capabilities (canPropose, canAttest, canHeartBeat).
  - Refuse to sign when:
    - Head gap > maxHeadGapBlocks.
    - Missed epochs > maxMissedEpochs.
    - Slash events > maxSlashEvents (or >0).
  - Record all actions for audit.

### 3.3 Revocation

Revocation paths:

- On-chain:
  - Transaction that clears policy and/or sets revokedAt and status.
- Off-chain:
  - Wallet pushes “revoke policyId” to engines.
  - Engines must treat revocation as final.

Obelisk MUST expose a one-tap “Kill validator policy now” action.

---

## 4. Metrics Schema (Validator Health)

We want a uniform Prometheus-style schema so Obelisk can show validator health without scraping random internal details.

Labels:

- validator="0x...VK"
- engine="hostname-or-id"
- chain="mainnet-core" (or devnet, testnet, etc.)

### 4.1 Core Validator Metrics (per validator)

Gauges:

- void_validator_liveness  
  1 = engine is actively participating (within policy bounds).  
  0 = paused, misconfigured, or outside policy window.

- void_validator_head_gap_blocks  
  Number of blocks behind chain tip (from engine’s view).

- void_validator_downtime_seconds_1d  
  Estimated downtime in the last 24h.

- void_validator_slash_events_total  
  Total slashing events observed for this validator.

- void_validator_policy_active  
  1 = a policy is active and not revoked.  
  0 = no active policy.

- void_validator_policy_start_epoch  
- void_validator_policy_end_epoch  

### 4.2 Reward / Stake Metrics

- void_validator_stake_balance  
  Effective stake (VOID) currently bonded.

- void_validator_rewards_unclaimed  
  Rewards that can be claimed.

- void_validator_rewards_rate_1h  
  Estimated reward rate (VOID per hour) based on last-hour data.

These may be exported:

- Directly by void-node (if it knows validator addresses), or
- By a sidecar exporter that talks to contracts via RPC and writes Prom textfiles.

### 4.3 Policy + Risk Metrics

- void_validator_slash_risk  
  Derived risk score (0..1 or 0..100) based on:
  - Head gap.
  - Missed epochs.
  - Misbehavior flags.

- void_validator_policy_mismatch  
  1 = engine is running with a policy hash that does not match on-chain policyId.  
  0 = in sync.

- void_validator_policy_signature_errors_total  
  Count of invalid/malformed policies seen by the engine.

---

## 5. Exporter Endpoints (Node / Engine Side)

We mirror existing patterns:

- Node exporters under:
  - /metrics/void/...
  - /__void/metrics/...

Draft endpoints:

- /metrics/void/validator  
  Text format, multiple lines, each with validator / engine / chain labels.
  Includes liveness, head gap, stake, rewards, etc.

- /__void/metrics/validator.prom  
  Convenience dump for Prometheus jobs.
  Matches void_validator_* schema.

Later:

- /__void/metrics/validator/<validator>.prom  
  Per-validator targeted exporter if needed.

---

## 6. Obelisk Wallet Consumption

### 6.1 Obelisk Titan

- Reads local Prometheus or /__void/metrics/validator.prom.
- Shows:
  - Overall status (green/yellow/red).
  - Details (stake, rewards, slash risk).
- Allows:
  - Start/stop validator participation (within policy).
  - Rotate policies.
  - Emergency revoke.

### 6.2 Obelisk Mobile

For “phone as key island + remote engine” mode:

- Polls engine metrics via:
  - Direct connection (Tor/VPN/DDNS), or
  - Encrypted relay that cannot see keys.
- Displays:
  - Liveness / head gap.
  - Slash risk.
- Guides user:
  - Pause validator now.
  - Extend policy window.
  - Rotate engine / move policy to another host.

### 6.3 Obelisk Lite (Browser)

- Read-only-ish:
  - Show validator state if user has one.
  - Offer delegate UX to mobile/Titan setup.
- No validator keys stored in extension.

---

## 7. Implementation Order (Post-Mainnet)

Order after mainnet is stable:

1. Metrics first  
   - Implement void_validator_* exporters for your validator.  
   - Add Grafana “Validator Health” dashboard.

2. On-chain policy hash  
   - Extend ValidatorSet or add ValidatorPolicyRegistry with policyId + status.  
   - No slashing rule changes; just bookkeeping.

3. Policy engine v0  
   - Small service next to void-node:
     - Accepts policies.
     - Enforces epoch bounds and simple caps (canPropose/canAttest).
   - Uses validator key from Obelisk Titan or local secure store.

4. Mobile integration  
   - Implement policy create/revoke flows in Obelisk Mobile.  
   - Wire “remote engine” config (Titan address, TLS/Tor settings).

5. Phone micro-validator (later)  
   - Only after we have light-client headers and are comfortable with load.  
   - Design minimal committee duty where phones sign small, bounded messages.

