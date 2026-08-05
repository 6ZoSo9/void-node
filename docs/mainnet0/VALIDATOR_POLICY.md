# VOID Mainnet-0 Validator Policy

## Locked Mainnet-0 Policy

- Minimum validator self-stake: **10,000 VOID**
- Additional validator stake: **allowed and returned in full on withdrawal**
- Validator power model: **stake-weighted**
- Public entry model: **self-custodied candidate registration when a reviewed registry is deployed**
- Candidate registration state: **Candidate**
- Waiting-list admission: **explicit registry-authority action**
- Active-validator admission: **explicit capped activation action plus runtime proof**
- Automatic Candidate-to-Waiting promotion: **forbidden**
- Automatic Waiting-to-Active promotion: **forbidden**
- Participant-controlled exit initiation: **available from Candidate, Waiting, Active, or Jailed**
- Active-origin exit finalization: **requires seven days plus explicit active-set removal confirmation**
- Non-active participant exit delay: **7 days before Unbonded**
- Stake withdrawal: **candidate owner only, after Unbonded, to a nonzero recipient selected by that owner**
- Registry ownership transfer: **two-step pending-owner acceptance**
- Hard validator cap: **none by long-term policy; Mainnet-0 contracts may enforce a reviewed operational cap**
- VOID-operated honest validators: **allowed and expected during Mainnet-0 for stability**

Meeting the stake threshold is necessary but not sufficient for active consensus.
A participant must keep wallet custody, register the exact candidate transaction,
pass candidate review, be moved to Waiting, be selected within the current cap
and churn limit, and complete runtime/epoch proof before active-validator status
is claimed.

Candidate registration does not automatically move a candidate to Waiting or Active.
A registry Active record is not, by itself, proof that the runtime is performing
consensus duties. For the same reason, an Active-origin exit cannot release stake
until the separate active set has been explicitly acknowledged as removed.

## Stake custody and exit safety

The candidate registry may custody native VOID only under these rules:

1. `registerCandidate(...)` records the complete attached value, including any
   amount above the 10,000-VOID minimum.
2. `totalStaked` tracks recorded participant stake independently of any native
   value forcibly sent to the contract.
3. Candidate, Waiting, Active, and Jailed participants may call `requestExit()`
   without registry-owner cooperation.
4. A Waiting exit decrements `waitingCount` exactly once. An Active exit moves
   one slot from `activeCount` into `pendingActiveExitCount`, so the reviewed
   active cap remains consumed until external removal is confirmed.
5. No participant-controlled exit can become Unbonded before the fixed seven-day
   delay. An Active-origin exit additionally requires a nonzero active-set removal
   evidence commitment recorded by registry authority.
6. Administrative `markUnbonded(...)` is limited to Candidate, Waiting, or
   Jailed. It cannot directly unbond Active or bypass a participant exit already
   in Exiting. A Jailed record derived from Active must carry confirmed removal.
7. Only the candidate owner may call `withdrawStake(...)` for that candidate.
8. Withdrawal zeros the complete recorded stake and updates `totalStaked`
   before the external transfer.
9. A failed transfer reverts the complete state change, and reentrant withdrawal
   is rejected.
10. Double withdrawal, zero-recipient withdrawal, withdrawal before Unbonded,
    and withdrawal of another candidate's stake are forbidden.

An Active participant can initiate exit without registry-owner cooperation, but
the registry cannot prove external consensus removal by observing its own state.
`confirmActiveSetRemoval(...)` therefore records a separate nonzero public evidence
commitment before Active-origin finalization and frees the pending cap slot exactly
once. Zero or duplicate confirmations are rejected.

Jailing removes a candidate from Waiting or Active accounting but does not
transfer, destroy, or confiscate the participant's recorded stake. Jailing an
Active record is the registry-owner's explicit emergency-removal acknowledgment,
records a deterministic nonzero public evidence commitment, and preserves the
participant's right to use the delayed exit path.

## Ownership safety

Registry authority changes use two steps:

1. the current owner proposes a nonzero, different pending owner; and
2. that exact pending owner accepts.

A pending transfer cannot be silently overwritten. The current owner may cancel
it before acceptance. A mistyped or nonresponsive pending address therefore
does not immediately destroy registry authority.

## Current Public Boundary

The repository contains the candidate registry source, local deployment proofs,
self-custodied unsigned-packet tooling, state verification, and focused stake
safety tests. Public candidate submission becomes live only after:

- the stake-safety source repair is merged;
- the exact compiler profile and dual-compiler outputs are regenerated;
- the repaired creation and runtime bytecode receive a fresh semantic review;
- a new unsigned deployment packet is constructed from stable chain-2050 state;
- separate signing and broadcast authorization is given;
- deployed runtime bytecode, immutable policy, owner, counters, active-exit
  evidence state, and withdrawal behavior are proven; and
- the reviewed registry address and chain RPC are published.

The onboarding tooling:

- reads only public node and contract state;
- prepares an unsigned `registerCandidate(...)` transaction for chain ID `2050`;
- requires exactly 10,000 VOID as the minimum contract value;
- never accepts a private key, seed phrase, mnemonic, or wallet file;
- verifies an already signed transaction before an explicit broadcast gate; and
- cannot call `moveToWaiting(...)`, `markActiveBatch(...)`,
  `confirmActiveSetRemoval(...)`, or `markUnbonded(...)`.

## Rejected deployment packet

The unsigned packet produced on August 5, 2026 before this repair is rejected
for deployment because its bytecode could receive stake but could not return it.
The following values are historical evidence only and must never be signed, broadcast, extended, or reused:

```text
packet_id:
voidvcrudpt1_18c8e237f07c66cbf9f3d647ea2f6d43f2543e9a68102f42c586686709a327b4

packet_file_sha256:
b1c50ea6129758b57bd72f79d4e79cb65b369a7640556755684a08cac40f349b

unsigned_transaction_hash:
0x09216225ea11ed7150a4a1df6c12308ade9e4fbabd4d17d1f973d1c59dc17e02

predicted_contract_address:
0xab7Da9E55E07995A671D96f19CDB965304035064
```

The prior creation-bytecode, runtime-template, simulated-runtime, and deployment-
data hashes are also superseded when the contract source changes. Every one of
those artifacts must be regenerated from the repaired source.

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
