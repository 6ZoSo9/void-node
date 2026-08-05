# VOID Mainnet-0 Validator Policy

## Locked Mainnet-0 Policy

- Minimum validator self-stake: **10,000 VOID**
- Additional validator stake: **allowed**
- Validator power model: **stake-weighted**
- Public entry model: **self-custodied candidate registration when a reviewed registry is deployed**
- Candidate registration state: **Candidate**
- Waiting-list admission: **explicit registry-authority action**
- Active-validator admission: **explicit capped activation action plus runtime proof**
- Automatic Candidate-to-Waiting promotion: **forbidden**
- Automatic Waiting-to-Active promotion: **forbidden**
- Hard validator cap: **none by long-term policy; Mainnet-0 contracts may enforce a reviewed operational cap**
- VOID-operated honest validators: **allowed and expected during Mainnet-0 for stability**

Meeting the stake threshold is necessary but not sufficient for active consensus.
A participant must keep wallet custody, register the exact candidate transaction,
pass candidate review, be moved to Waiting, be selected within the current cap
and churn limit, and complete runtime/epoch proof before active-validator status
is claimed.

Candidate registration does not automatically move a candidate to Waiting or Active.

## Current Public Boundary

The repository contains the candidate registry contract, local deployment proofs,
self-custodied unsigned-packet tooling, and state verification. Public candidate
submission becomes live only after a reviewed registry address and chain RPC are
published.

The onboarding tooling:

- reads only public node and contract state;
- prepares an unsigned `registerCandidate(...)` transaction for chain ID `2050`;
- requires exactly 10,000 VOID as the contract value;
- never accepts a private key, seed phrase, mnemonic, or wallet file;
- verifies an already signed transaction before an explicit broadcast gate; and
- cannot call `moveToWaiting(...)` or `markActiveBatch(...)`.

## Current Proof Baseline

The current validator runtime lane has been proven through **65 validators** cross-box.

This proves:

- deterministic validator onboarding;
- validator-set growth past the 64-validator boundary;
- verified epoch manifests;
- shadow compare with zero mismatches;
- Precision ↔ Alien runtime truth agreement; and
- repeatable cross-box closeout automation.

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

- correctness;
- auditability;
- simple debugging;
- replayable validator truth; and
- safe launch behavior.

### V2 / 10k Validator Path

Add:

- paginated validator registry;
- chunked validator-set manifests;
- epoch snapshot roots;
- lazy runtime loading;
- deterministic sampled proposer windows; and
- proof APIs for validator inclusion and proposer eligibility.

### V3 / 100k Validator Path

Add:

- Merkleized validator sets;
- compressed schedule commitments;
- sampled committees;
- validator proofs on demand; and
- no full validator-set load requirement for normal runtime paths.

## Upgrade Rule

Validator architecture upgrades must be:

- epoch-gated;
- backward compatible;
- shadow-tested before activation;
- versioned by manifest format; and
- able to keep all old epochs readable forever.

Forking is reserved only for major security breakage or unrecoverable chain failure.
