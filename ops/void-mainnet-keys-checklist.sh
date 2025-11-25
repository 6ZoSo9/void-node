#!/usr/bin/env bash
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

echo "=== [VOID mainnet – keys & treasury checklist v0] ==="
echo "[repo]    $REPO"
echo "[branch]  \$(git symbolic-ref --short HEAD 2>/dev/null || echo 'UNKNOWN')"
echo

SPEC="docs/VOID-MAINNET-GENESIS-SPEC.md"
if [ -f "$SPEC" ]; then
  echo "Genesis/keys spec found:"
  echo "  $SPEC"
  echo "You can review it with:"
  echo "  less $SPEC"
else
  echo "WARNING: $SPEC not found – update path if the spec moved."
fi

echo
echo "=== 1. Separation of devnet vs mainnet keys ==="
echo "  [ ] Confirm NO devnet/test keys are referenced in the mainnet genesis spec."
echo "  [ ] Confirm all mainnet keys are marked as \"never used on-chain before\"."
echo "  [ ] Document which machines are allowed to ever see raw mainnet seeds."

echo
echo "=== 2. Premine / genesis key plan ==="
echo "  [ ] Define a one-shot premine key used ONLY to initialize VoidTreasury."
echo "  [ ] Ensure premine key never becomes a long-lived treasury signer."
echo "  [ ] Add a note in the spec: premine key is effectively retired after genesis tx."
echo "  [ ] Verify premine allocation flows into a contract (VoidTreasury), not a hot EOA."

echo
echo "=== 3. Treasury structure (cold -> ops -> hot) ==="
echo "  [ ] Confirm design: Premine -> VoidTreasury (cold, contract)."
echo "  [ ] Define Ops Treasury contract/wallet that pulls from VoidTreasury with policies."
echo "  [ ] Define hot wallets for day-to-day spend with SMALL, capped balances."
echo "  [ ] Specify who/what signs for each layer (multisig, hardware, agents, etc.)."
echo "  [ ] Write rules for how VOID moves: Treasury -> Ops -> hot, never the reverse without review."

echo
echo "=== 4. AdminGate / UpdateGate / ConfigGate keys ==="
echo "  [ ] List AdminGate masterKey and any secondary admin sets."
echo "  [ ] List UpdateGate signer set(s) for protocol upgrades."
echo "  [ ] List ConfigGate signer set(s) for parameter changes (fees, limits, etc.)."
echo "  [ ] Make sure no single device/USB holds ALL signer sets without redundancy planning."
echo "  [ ] Document rotation procedure for each gate (how to add/remove signers safely)."

echo
echo "=== 5. LUKS-encrypted USB + backups ==="
echo "  [ ] Prepare at least one LUKS-encrypted USB dedicated to VOID mainnet keys."
echo "  [ ] Store on it (and only on it):"
echo "        - Premine seed (once, for historical record)."
echo "        - AdminGate/UpdateGate/ConfigGate master seeds."
echo "        - VoidTreasury + Ops Treasury cold signer seeds."
echo "        - Any one-shot genesis helper keys."
echo "  [ ] Write down the LUKS passphrase in a separate, offline medium (paper/steel)."
echo "  [ ] Verify you can unlock, read, and re-lock the USB from a clean machine."
echo "  [ ] Decide if a second USB clone is required and document where it lives."

echo
echo "=== 6. Hardware wallet / device policy ==="
echo "  [ ] Decide which keys MUST live on hardware wallets vs plain files."
echo "  [ ] Ensure no key used for on-chain admin lives on an internet-exposed box in raw form."
echo "  [ ] Document \"allowed operations\" for each device (sign-only, no browsing, etc.)."

echo
echo "=== 7. Mainnet launch runbook hooks ==="
echo "  [ ] Add a section in the genesis spec that references this checklist."
echo "  [ ] Before mainnet launch, re-run this script and manually tick off items."
echo "  [ ] Add a TODO in the roadmap: implement VoidTreasury + Ops Treasury contracts"
echo "        and wire them into the mainnet genesis + tokenomics layer."
echo "  [ ] Add a TODO: implement a one-time \"premine->Treasury\" transaction script and archive it."

echo
echo "=== 8. Future AI/agent integration (for later) ==="
echo "  [ ] Plan an AgentOps key set that can manage small, bounded hot wallets for NullFeed/jobs."
echo "  [ ] Ensure agents NEVER hold or sign with Treasury-level keys."
echo "  [ ] Add a note in the spec: \"AI/agents operate at the edge only (hot ops layer).\""

echo
echo "=== 9. Sanity checks ==="
echo "  [ ] Confirm genesis spec, tokenomics spec, and NullFeed spec all agree on:"
echo "        - ChainId (2050)."
echo "        - Premine size and recipients."
echo "        - Treasury structure and gates."
echo "  [ ] Create or update a dedicated \"VOID-KEYS-RUNBOOK.md\" summarizing the above."
echo
echo "[DONE] This script is only a checklist. It does NOT generate keys or touch any secrets."
echo "       Use it as a gate you must pass before we even think about flipping mainnet on."
