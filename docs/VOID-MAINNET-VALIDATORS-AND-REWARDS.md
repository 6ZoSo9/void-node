# VOID Mainnet – Validators & Rewards (Phase 1 Draft)

**Status:** DRAFT (numbers and exact knobs can change until we freeze the real mainnet bootstrap JSON and ceremony).  
**Scope:** Protocol-level rewards only. Off-chain/community incentive programs are out of scope for this doc.

---

## 1. Tokenomics recap (what we're enforcing)

Hard constraints already locked in code and docs:

- **Max supply:** 666,666,666 VOID
- **Premine:** 333,333,333 VOID (minted at genesis)
- **Emissions:** 333,333,333 VOID over 100 years, split into 4 eras:
  - Era 1 (years 0–25):      177,777,777 VOID
  - Era 2 (years 25–50):      88,888,889 VOID
  - Era 3 (years 50–75):      44,444,444 VOID
  - Era 4 (years 75–100):     22,222,223 VOID

Contracts in play:

- `VoidToken`                – ERC-20, MAX_SUPPLY / PREMINE / EMISSIONS constants.
- `VoidEmissionsController`  – long-term emission budget logic.
- `ValidatorSet`             – who is a validator and with how much stake.
- `RewardEngine`             – how emissions flow to validators.
- `VoidTreasury`             – cold treasury holding the premine and emission budget.
- `OpsTreasury`              – operational spending account.

**Premine rule (Phase 1):**

- At bootstrap, **the entire premine** is moved into `VoidTreasury`.
- The premine key is a one-shot: after bootstrap, it’s effectively dead (zero balance, no protocol role).
- All validator + emissions flows are fed from `VoidTreasury` and tracked by contracts, not from some random hot EOA.

---

## 2. Who actually earns VOID?

### 2.1 Validators vs “just running a node”

Protocol-level rules (Phase 1):

- To earn **protocol emissions**, you must be:
  - Registered in `ValidatorSet`, and
  - Have VOID stake locked according to the validator pipeline.
- Running a **full node** without being in `ValidatorSet`:
  - **Does not** entitle you to automatic protocol rewards.
  - Makes the network healthier and more resilient (good and encouraged), but
  - Payment for that is **out of scope** for the base protocol. If we want to reward non-validator nodes, we do it via:
    - Off-chain programs run out of `OpsTreasury`, or
    - Agents / JobQueue / side agreements.

This is deliberate: if you try to “pay everyone who runs a node” at the protocol level, you get:
- Sybil pressure (people spin up spam nodes).
- Constant pressure to inflate rewards.
- A governance headache we don’t need in Era 1.

So **Phase 1** is simple and honest:

> Only validators with stake locked in `ValidatorSet` earn protocol rewards.  
> Everyone else is either a user, a dev, or an infra operator who might get paid via separate programs, not automatic emissions.

### 2.2 Basic validator requirements (Phase 1 intent)

We’ll finalize hard numbers later, but the shape is:

- **validator0** (genesis):
  - Comes from `.validator0` in the mainnet `*.live.json` plan.
  - Has:
    - `reward` address (may start as the same as `validatorAdmin`, then rotate later),
    - `consensusKey` (BLS or other consensus key),
    - `stakeVOID` (non-zero).
  - Must be fully wired and funded *before* we run the real bootstrap.

- **Other validators (future eras):**
  - Must meet a **minimum stake** per validator (e.g. “min 10k VOID” – exact figure TBD).
  - Register through the ValidatorSet + RewardEngine flow (not defined here yet, but directionally: they lock stake, join the set, and start earning a share of emissions/fees).

Whatever we pick for minimum stake and validator0 stake will be encoded in:
- The bootstrap live JSON (`validator0.stakeVOID`), and
- Config / policy for ValidatorSet and RewardEngine.

---

## 3. Emissions and validator rewards (conceptual)

### 3.1 Emission eras → RewardEngine

High-level story:

- Emissions for all 4 eras are enforced by `VoidEmissionsController`.
- That controller exposes a budget interface that `RewardEngine` uses.
- `RewardEngine` is responsible for:
  - Reading the current era / emission budget.
  - Slicing emissions across validators based on stake / participation.
  - Paying out rewards in VOID from `VoidTreasury`.

Phase 1 keeps it simple:

- No fancy “megamath” on day one.
- Basic proportional stake model:
  - A validator’s baseline share of emissions is proportional to its stake compared to total active stake.
  - We *may* add uptime / performance multipliers later, but Phase 1 goal is **simple, auditable math**:

> If you have X% of the active stake and you behave, you get roughly X% of the emission flow (before any slashing or penalties).

### 3.2 Fees vs emissions

- **Emissions**: long-term, pre-defined inflation (the 4 era budgets).
- **Fees**: gas paid by users to submit transactions to VOID.

Phase 1 stance:

- Emissions are the main security budget.
- Fees can either:
  - Be burned (partial or full burn schedule), and/or
  - Be shared with validators, Treasury, or some combination.
- Exact fee split is left for a later refinement (and possible on-chain governance changes through AdminGate/UpdateGate/ConfigGate).

The important part for now: **validators earn emissions; fees are an extra lever we can tune later.**

---

## 4. validator0 – Genesis validator

Phase 1 rules for `validator0`:

- Must have:
  - `reward` address (can be cold wallet or a well-secured hot+hardware config).
  - `consensusKey` (matching whatever the consensus layer expects).
  - `stakeVOID > 0` (enforced by `VoidMainnetBootstrapMainnet._checkCoreInvariants`).

- The **stake number**:
  - Is set in `validator0.stakeVOID` in the live JSON.
  - Must be funded via a known, auditable path:
    - VOID originates from `VoidTreasury` (premine),
    - Goes through the appropriate treasury/op/reward path,
    - Ends up locked on behalf of validator0 in `ValidatorSet`.

We are intentionally not locking a final number in this doc yet. Instead:

- Treat this doc as recording the *shape* of the decision.
- The actual `stakeVOID` we choose will be:
  - Reflected in the live JSON, and
  - Checked by the bootstrap PLAN and governance process before we ever broadcast any real mainnet tx.

---

## 5. Full nodes and “just helping the network”

This is the honest part:

- Running a non-validator full node:
  - Helps decentralization and censorship resistance.
  - Keeps your own view of the chain and reduces reliance on third-party providers.
  - Does **not** entitle you to emissions by default.

If we want to reward that behavior, we do it explicitly, not by pretending the protocol can magically pay “everyone” fairly:

- Out of `OpsTreasury` (for example, a program that pays known infra providers).
- Via agents + JobQueue (e.g., agents who pay nodes for providing data / proofs / compute).
- Through community / DAO grants once governance matures.

Phase 1 mainnet keeps the base protocol **narrow and predictable**: emissions pay staked validators. That’s it.

---

## 6. Governance hooks (how this can evolve)

The validators & rewards design is wired into:

- `AdminGate` / `UpdateGate` / `ConfigGate`
- `VoidEmissionsController`
- `RewardEngine`
- `ValidatorSet`

Phase 1 governance model (see `docs/VOID-MAINNET-GOVERNANCE-MODEL.md`) defines:

- Who controls emission and reward parameters.
- How thresholds / multisigs are configured.
- How we can:
  - Adjust validator economics (min stake, emission sharing),
  - Adjust fee splits,
  - Introduce more sophisticated reward curves, without rewriting the whole chain.

This doc is **not** the final word, but it’s the baseline we’ll hold ourselves to when we wire:

- The final bootstrap JSON,
- The real mainnet `runReal(...)` path, and
- Any future governance changes to validator economics.

