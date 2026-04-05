# Mainnet Premine Vaults Bootstrap Sequence

Status: design-lock note for the rebuilt rehearsal bootstrap path  
Related source: `script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol`

## Purpose

This note locks the intended mainnet funding flow around the current premine plan so future bootstrap work does not drift back into the old monolithic treasury model.

## Locked assumptions

- Chain ID remains `2050`.
- Mainnet keys live on LUKS flash drives, not in repo.
- Premine is segmented across **30 offline vaults**.
- Untouched premine vaults remain offline by default.
- Only **one selected premine vault** should ever be touched at a time.
- A **small active hot wallet** is used for current operations.
- Treasury and pool funding come from explicit partial allocations, not from moving the entire premine into a single treasury wallet or contract.
- Initial pool seeding comes from premine allocations.
- Devnet keys must never be reused for mainnet.

## Intended funding sequence

1. **Select one premine vault offline**
   - Choose the current vault for the present funding cycle.
   - Record the vault id, intended purpose, and usage status in the vault ledger/checklist.
   - Do not expose untouched vaults to a networked machine.

2. **Prepare a limited operational refill**
   - Move only a bounded amount from the selected premine vault into a small active hot wallet.
   - The hot wallet is an operational buffer, not the long-lived treasury of the whole network.
   - Keep the hot wallet balance intentionally limited.

3. **Perform explicit partial allocations**
   - Fund the specific destination needed for the current phase:
     - treasury allocation
     - pool seeding allocation
     - other approved bootstrap allocations
   - Each allocation should be deliberate, bounded, and recorded.
   - Do **not** transfer the entire premine into `VoidTreasury` or any single live wallet.

4. **Leave the remaining premine in the selected vault**
   - After the required partial allocations, any remaining balance for that cycle stays with the selected vault unless a deliberate refill is needed.
   - Untouched vaults remain offline and unused.

5. **Repeat only when needed**
   - When more funds are required later, either:
     - use the same currently active premine vault if that funding cycle is still open, or
     - move to the next selected vault under the written vault ledger procedure.
   - Never treat all premine vaults as one always-online treasury.

## Explicit anti-patterns

The following old assumptions are now considered wrong for mainnet design:

- “Mint premine to one owner, then transfer the entire premine into `VoidTreasury`.”
- “Use one monolithic treasury wallet as the live source of all bootstrap funding.”
- “Treat the mainnet bootstrap as if all premine liquidity should immediately become one hot, unified balance.”
- “Assume multisig-first treasury control is the current solo-operator bootstrap model.”

## Relation to current rebuilt rehearsal stub

The rebuilt rehearsal source at:

- `script/mainnet_rebuild/VoidMainnetBootstrapDev.vaults-rebuild.s.sol`

already moves in the right direction by modeling:

- `selectedPremineVault`
- `activeHotWallet`
- partial treasury funding from the selected vault

That file should be treated as a rehearsal/design anchor, not yet the final compile-green mainnet bootstrap implementation.

## What future real bootstrap code should do

Future real bootstrap code should model:

- selected premine vault choice
- active hot wallet refill
- explicit partial allocations
- bounded treasury funding
- bounded pool seeding
- no monolithic premine-to-treasury transfer

## What future real bootstrap code should not do

Future real bootstrap code should not model:

- `voidOwner` as a single permanent premine owner for the entire network
- full-premine transfer into `VoidTreasury`
- full-premine transfer into any single hot wallet
- implicit seeding from a giant always-live treasury balance

## Operator note

The written vault ledger/checklist should track at minimum:

- vault id
- intended purpose
- allocation category
- current status
- whether touched or untouched
- backup locations
- whether it has been used as refill source for the active hot wallet
- whether any pool seeding allocation has already been taken from it

This note locks the intended bootstrap funding sequence until the real mainnet bootstrap source is rebuilt around it.
