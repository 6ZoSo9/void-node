#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/dev/void-node"

echo "=== [obelisk-validator-ux] VOID mainnet validator UX checklist ==="
echo

echo "[phase 0] Preconditions (do NOT skip)"
echo "  - void:mainnet_overall:health:last_5m_v2 == 1"
echo "  - void:mainnet_pillars:health:last_5m      == 1"
echo "  - void:mainnet_lastmile:health:last_5m    == 1"
echo "  - void_safeboot_overall_health            == 1"
echo "  - void:mainnet_bootstrap_plan:health:last_5m == 0 (PLAN intentionally NOT READY yet)"
echo

echo "[phase 1] Obelisk Wallet baseline (per-validator human UX)"
echo "  1. Install Obelisk Wallet on a trusted device:"
echo "     - Tier examples (design-time only for now):"
echo "       * Obelisk Lite   – browser extension (signing only)."
echo "       * Obelisk Mobile – phone app (future light validator target)."
echo "       * Obelisk Titan  – desktop/heavy (GPU, full validator)."
echo "  2. Create a new VOID account / identity."
echo "  3. Write the seed phrase on PAPER:"
echo "     - No screenshots, no cloud backups, no plaintext files."
echo "     - Store with other VOID mainnet secrets (our keys+devices plan)."
echo "  4. Confirm wallet shows:"
echo "     - Network: VOID Mainnet"
echo "     - chainId: 2050"
echo "     - Address: 0x... (this will usually be the REWARD address)."
echo

echo "[phase 2] Funding & basic on-chain usability"
echo "  1. Ensure the REWARD address has enough VOID for:"
echo "     - Gas for validator registration tx."
echo "     - Gas for future maintenance/rotation txs."
echo "  2. Sanity checks a future Obelisk UI MUST surface clearly:"
echo "     - \"Network: VOID Mainnet (2050)\" visible."
echo "     - Current head height from a trusted RPC (not stuck)."
echo "     - Basic send/receive works before allowing validator actions."
echo

echo "[phase 3] Validator identity & keys (conceptual contract wiring)"
echo "  1. Choose validator identity:"
echo "     - Validator name / moniker (shown in explorers)."
echo "     - Public REWARD address (payout wallet)."
echo "  2. Generate consensus keypair (BLS or Ed25519, depending on final design):"
echo "     - PRIVATE consensus key MUST live either:"
echo "       * Inside Obelisk Titan (desktop validator), or"
echo "       * On a dedicated validator machine with hardened storage."
echo "     - NEVER reuse the same seed as the REWARD wallet."
echo "  3. Mapping we expect on-chain (ValidatorSet wiring):"
echo "     - reward         -> REWARD EOA (user-facing wallet address)."
echo "     - consensusKey   -> validator consensus pubkey (bytes)."
echo "     - stakeVOID      -> amount of VOID locked in RewardEngine/Treasury."
echo

echo "[phase 4] Node side – tying a running node to a validator identity"
echo "  1. Run a VOID node on the validator machine:"
echo "     - For mainnet-core, this is a packaged version of void-node."
echo "     - Node must expose:"
echo "       * /head.txt"
echo "       * /metrics/void/head"
echo "       * txroot/header3/seals/proposer exporters (already used by pillars)."
echo "  2. Future Obelisk UX must support:"
echo "     - \"Connect to local node\" (e.g. http://127.0.0.1:4100)."
echo "     - Show node health derived from the same Prometheus-style exporters."
echo "  3. Once connected, user flow should be:"
echo "     - \"Register as validator\""
echo "     - Wallet builds & signs tx sequence against ValidatorSet/RewardEngine:"
echo "       * Lock stake in RewardEngine/Treasury."
echo "       * Register validator (reward + consensusKey + params)."
echo "     - Wallet shows a clear summary BEFORE broadcast."
echo

echo "[phase 5] Monitoring & ongoing UX expectations"
echo "  1. Wallet must surface at least:"
echo "     - Current validator status (active / inactive / jailed / unknown)."
echo "     - Effective stake and rewards (from RewardEngine)."
echo "     - Last-seen block participation (simple uptime-ish view)."
echo "  2. Node + Prometheus side:"
echo "     - Existing exporters (txroot/header3/seals/proposer/head) stay canonical."
echo "     - New Obelisk-specific dashboards can sit on top; they MUST NOT fork truth."
echo "  3. Nice-to-have (later, not now):"
echo "     - Push-style alerts (mobile notifications) for:"
echo "       * Node down / drift too high."
echo "       * Validator missing blocks for N minutes."
echo "       * Rewards claimable above a threshold."
echo

echo "[phase 6] Mobile validators (Obelisk Mobile – future path)"
echo "  NOTE: This is design intent, not implemented yet."
echo "  1. Treat phones as light validators with constraints:"
echo "     - Limited CPU/network; may delegate heavy work to Titan/servers."
echo "     - Still control their own keys; no custodial nonsense."
echo "  2. Flow we will target:"
echo "     - Obelisk Mobile pairs with a \"helper\" node (Titan / server)."
echo "     - Helper node does heavy lifting (full node, proofs, AI agents)."
echo "     - Mobile wallet signs validator-related messages and approves actions."
echo

echo "[phase 7] Obelisk + PLAN + keys (how this ties into our current work)"
echo "  - The PLAN scripts & gauges gate whether mainnet bootstrap is safe to even attempt."
echo "  - The keys+devices docs define where each secret lives (LUKS device vs paper vs hardware)."
echo "  - This validator-UX checklist is the human-facing side we will build into Obelisk:"
echo "      * It must never bypass those guards."
echo "      * It must never encourage keeping HOT keys on random hardware."
echo

echo "Summary:"
echo "  - This script is documentation only: it prints the UX checklist we are designing."
echo "  - No RPC calls, no local mainnet changes, no txs, no keys touched."
echo "  - Next time we iterate on Obelisk, we update THIS script and the Obelisk docs together."
echo

echo "=== [obelisk-validator-ux] DONE (checklist only, no state changed) ==="
