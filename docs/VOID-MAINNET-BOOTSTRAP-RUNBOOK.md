# VOID Mainnet Bootstrap RUNBOOK

This is the canonical playbook for rehearsing and then executing the VOID mainnet
bootstrap. It is intentionally conservative: every stage must be green before
you touch real mainnet keys or broadcast anything on a live network.

The high-level flow is:

1. **Dev bootstrap on anvil (chainId 2050)** using throwaway keys.
2. **Dev health-all verification** for wiring, tokenomics, and state snapshot.
3. **PLAN** mainnet bootstrap with hardware-wallet keys and LUKS USB.
4. **DRY-RUN** the exact JSON + script combo against an anvil chain (chainId 2050).
5. **LIVE mainnet bootstrap** (one-shot), only when all gates and metrics are green.

---

## 0. Scope and assumptions

This RUNBOOK assumes:

- You are on the machine that controls `void-node` and the future mainnet bootstrap.
- The repo lives at `~/dev/void-node`.
- Devnet and Prometheus are already running and healthy.
- All real mainnet keys will be **fresh**, never used on devnet, and stored behind:
  - A **LUKS-encrypted USB** (for seeds / backups).
  - **Hardware wallets** for any hot signing that must happen.

This document **does not** itself perform any live mainnet actions. It describes
what must be true before we add the final LIVE command.

---

## 1. Dev bootstrap on anvil (chainId 2050)

The dev bootstrap uses throwaway keys and a local anvil chain with `chainId 2050`.
It wires up:

- `UpdateGate`
- `AdminGate`
- `ConfigGate`
- `ValidatorSet`
- `VoidToken`
- `VoidTreasury` + `OpsTreasury`
- `RewardEngine` + emissions controller

Run:

    cd ~/dev/void-node
    ./ops/void-mainnet-dev-bootstrap-full.sh

This should:

- Start (or assume) a local anvil at `http://127.0.0.1:8545` with `chainId 2050`.
- Deploy and wire the mainnet-core contracts using **dev** keys.
- Produce a dev bootstrap config/state file under `config/`, for example:

    config/void-mainnet-bootstrap-dev.state.json

If this step fails, **stop here**. Fix the dev bootstrap script and contracts
before touching anything in later steps.

---

## 2. Step N: Dev bootstrap health-all verification (anvil rehearsal)

Before finalizing any VOID mainnet bootstrap plan, run the dev bootstrap health-all
script against the same local anvil chain with `chainId 2050`:

    cd ~/dev/void-node
    ./ops/void-mainnet-dev-bootstrap-full.sh        # dev bootstrap on anvil
    ./ops/void-mainnet-dev-bootstrap-health-all.sh  # verify wiring + tokenomics + state snapshot

The `health-all` script performs:

- Core wiring + tokenomics sanity checks.
- Emissions budget equality checks.
- Gate wiring sanity:
  - `AdminGate`
  - `ConfigGate`
  - `UpdateGate`
  - `ValidatorSet`
  - `RewardEngine` / emissions controller.
- Writes a canonical dev state file:

    config/void-mainnet-bootstrap-dev.state.json

It must end with a line logically equivalent to:

    RESULT: DEV BOOTSTRAP HEALTH-ALL OK (verify-core + state snapshot)

If you do **not** see that result, or if the script reports any tokenomics /
wiring mismatches, **do not proceed** to planning or mainnet.

---

## 3. Tokenomics invariants (must match dev state snapshot)

The dev state snapshot and health-all checks must agree with the locked VOID
tokenomics. The invariants are:

- **MAX_SUPPLY**

  - `MAX_SUPPLY = 666,666,666 VOID` (total).

- **Premine / Treasury**

  - `PREMINE = 333,333,333 VOID` allocated at genesis.
  - The premine must land in a contract-based `VoidTreasury`, **not** a hot EOA.

- **Emissions over 100 years (4 eras)**

  Over 100 years, emissions must sum to `333,333,333 VOID` split as:

  - Era 1 (years 0–25):   `177,777,777 VOID`
  - Era 2 (years 25–50):  `88,888,889 VOID`
  - Era 3 (years 50–75):  `44,444,444 VOID`
  - Era 4 (years 75–100): `22,222,223 VOID`

- **Equality checks**

  The dev bootstrap health-all script must confirm:

  - `PREMINE + EMISSIONS_TOTAL == MAX_SUPPLY`
  - Emissions schedule matches the on-chain configuration used by `RewardEngine`.
  - The dev state snapshot reflects the same numbers you see in the Solidity
    specs and Prometheus tokenomics exporters.

Any mismatch here is a **hard error**. Fix the contracts / scripts before
you even start planning mainnet.

---

## 4. PLAN: Mainnet bootstrap design (hardware wallets + LUKS USB)

Once the dev bootstrap + health-all are green and the dev state snapshot matches
the locked tokenomics, you can start designing the real mainnet bootstrap plan.

Principles:

- **Fresh keys only**

  - Devnet keys are NEVER reused for mainnet.
  - Mainnet premine, AdminGate, UpdateGate, ValidatorSet, and Ops keys are
    generated fresh and stored offline.

- **VoidTreasury, not hot wallets**

  - The premine lives in a contract-based `VoidTreasury` at genesis.
  - Spending flows:

        VoidPremine (genesis) -> VoidTreasury -> OpsTreasury -> hot wallets

  - The premine EOA (if any) is effectively burned after sending to `VoidTreasury`.

- **Storage of critical secrets**

  - Seeds and any one-shot genesis keys live on a **LUKS-encrypted USB** and/or
    hardware wallets.
  - No plain-text seeds on disk.
  - No `.live` configs with secrets ever committed to git.

- **Mainnet plan JSON**

  - The human-readable plan will be stored in a file such as:

        config/void-mainnet-bootstrap-mainnet.live.json

  - `.gitignore` already ensures this file (and similar `*.live.json` files) is
    never committed.

This PLAN step is mostly human work: deciding which hardware wallets, which
signers, and how many UpdateGate / AdminGate signers you want for mainnet.

---

## 5. DRY-RUN: mainnet plan on anvil (no real keys, same JSON shape)

Before touching a real network, you must dry-run the exact **shape** of the
mainnet bootstrap using throwaway keys and an anvil chain with `chainId 2050`.

The goal of the dry-run:

- Use the **same JSON structure** you will use for mainnet (roles, contract
  wiring, emissions config, validator set, etc.).
- Run the same style of bootstrap script you will later use for mainnet, but
  against an anvil instance.
- Confirm:

  - All contracts deploy and wire correctly.
  - Tokenomics invariants still hold.
  - Prometheus exporters and health scripts see a healthy mainnet-core pillar.
  - The resulting dry-run state snapshot matches what you expect for mainnet.

The DRY-RUN should end with logs clearly indicating success, mirroring the dev
health-all messaging but referencing the mainnet plan JSON.

If the DRY-RUN fails, you fix the plan and repeat until it is fully clean.

---

## 6. LIVE: One-shot VOID mainnet bootstrap (TBD final command)

The LIVE step is a **one-shot** operation. It must not be run until ALL of the
following are true:

- Devnet pillars and coverage exporters are green.
- Mainnet-core dev bootstrap and health-all are green.
- Safeboot pillar is healthy and mirrors last-mile behavior.
- The mainnet PLAN has been dry-run at least once on anvil with no errors.
- All keys are confirmed and backed up on LUKS USB / hardware wallets.
- You have physically verified which machine and which wallet will sign what.

Only then do you:

1. Start from a clean, tagged repo checkpoint.
2. Mount the LUKS USB and unlock any required hardware wallets.
3. Run the final mainnet bootstrap script once, using the `*.live.json` plan.
4. Immediately verify:

   - Genesis premine -> `VoidTreasury` balance.
   - Initial validator set and config on-chain.
   - Prometheus mainnet pillars exporters are all green.

The exact LIVE command will be filled in once:

- The final mainnet keys plan is frozen.
- The UpdateGate / AdminGate / ValidatorSet wiring for production is locked.
- The bootstrap script interface is 100% stable.

Until then, treat this section as **reserved**: no ad-hoc CLI experiments here.

---
