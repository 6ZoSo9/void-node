# VOID Network – Emissions & Validator Rewards (v1)

This file is the canonical summary of VOID monetary policy and validator rewards.

Locked constants for mainnet:
- MAX_SUPPLY = 666,666,666 VOID
- PREMINE    = 230,000,000 VOID
- REMAINING_EMISSIONS = 436,666,666 VOID (for validators over time)

Rules:
- At genesis, totalSupply = PREMINE.
- Over time, block rewards pay validators from REMAINING_EMISSIONS.
- totalSupply must NEVER exceed MAX_SUPPLY.

Shape (high level):
- Rewards are deterministic per height (or era index).
- Rewards decay over eras so emissions are front-loaded but long-lived.
- Validators are always paid by protocol, no off-chain minting.

Implementation notes:
- Exact parameters (era length, initial reward R0, decay factor) live in a params doc
  and in the genesis config, and must satisfy: Σ_rewards <= REMAINING_EMISSIONS.
- void-node enforces the cap by clamping the final reward if a block would overflow
  MAX_SUPPLY.
