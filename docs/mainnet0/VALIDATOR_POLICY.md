# VOID Mainnet-0 Validator Policy

## Locked Mainnet-0 Policy

- Minimum validator self-stake: **10,000 VOID**
- Additional validator stake: **allowed**
- Validator power model: **stake-weighted**
- Validator entry model: **permissionless if minimum stake is met**
- Hard validator cap: **none by policy**
- VOID-operated honest validators: **allowed and expected during Mainnet-0 for stability**

## Current Proof Baseline

The current validator runtime lane has been proven through **65 validators** cross-box.

This proves:
- deterministic validator onboarding
- validator-set growth past the 64-validator boundary
- verified epoch manifests
- shadow compare with zero mismatches
- Precision ↔ Alien runtime truth agreement
- repeatable cross-box closeout automation

The 65-validator milestone is **not a maximum**. It is a Mainnet-0 proof target.

## Scaling Targets

- Mainnet-0 practical launch target: **100–500 validators**
- Near-term tested target: **1,000 validators**
- Serious network target: **10,000 validators**
- Long-term aspirational target: **100,000 validators**

## Architecture Direction

### V1 / Mainnet-0

Use the current explicit verified-manifest model.

This prioritizes:
- correctness
- auditability
- simple debugging
- replayable validator truth
- safe launch behavior

### V2 / 10k Validator Path

Add:
- paginated validator registry
- chunked validator-set manifests
- epoch snapshot roots
- lazy runtime loading
- deterministic sampled proposer windows
- proof APIs for validator inclusion and proposer eligibility

### V3 / 100k Validator Path

Add:
- Merkleized validator sets
- compressed schedule commitments
- sampled committees
- validator proofs on demand
- no full validator-set load requirement for normal runtime paths

## Upgrade Rule

Validator architecture upgrades must be:
- epoch-gated
- backward compatible
- shadow-tested before activation
- versioned by manifest format
- able to keep all old epochs readable forever

Forking is reserved only for major security breakage or unrecoverable chain failure.
