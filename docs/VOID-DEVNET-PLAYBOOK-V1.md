# VOID Devnet Playbook – v1 (2025-11-14)

Minimal steps to run the VOID devnet locally and bootstrap core protocol state.

---

## 1. Start Anvil (dev-only)

In a separate terminal:

  anvil --chain-id 2050 --block-time 2

Sanity:

  cast chain-id --rpc-url http://127.0.0.1:8545    # expect 2050
  cast block-number --rpc-url http://127.0.0.1:8545

---

## 2. Set dev-only key (Anvil default)

In your dev shell (where you run scripts):

  cd ~/dev/void-node
  export DEVNET_PRIVKEY='0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

Optional sanity:

  cast wallet address "$DEVNET_PRIVKEY"
  # expect: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

---

## 3. One-shot devnet stack (tests + deploy + premine verify)

From the repo root:

  cd ~/dev/void-node
  RPC_URL=http://127.0.0.1:8545 \
  DEVNET_PRIVKEY="$DEVNET_PRIVKEY" \
    ./ops/void-devnet-stack.sh

This will:
- Run all core contract tests.
- Deploy VoidToken + AdminGate.
- Verify premine (totalSupply and deployer balance).

It updates:

- docs/VOID-DEVNET-DEPLOY-ADDRESSES.json

---

## 4. Bootstrap protocol snapshot

Write protocol state snapshot (chainId + deployer + system roots):

  cd ~/dev/void-node
  RPC_URL=http://127.0.0.1:8545 \
  DEVNET_PRIVKEY="$DEVNET_PRIVKEY" \
    ./ops/void-devnet-bootstrap-protocol.sh

This writes:

- docs/VOID-DEVNET-PROTOCOL-STATE.json

---

## 5. Verify protocol snapshot vs live chain

Check JSON matches the running devnet:

  cd ~/dev/void-node
  RPC_URL=http://127.0.0.1:8545 \
  DEVNET_PRIVKEY="$DEVNET_PRIVKEY" \
    ./ops/void-devnet-protocol-verify.sh

You want:

  [OK] devnet protocol snapshot matches live chain-id (and key if provided)

---

## 6. System bootstrap (AdminGate masterKey)

Ensure AdminGate is wired with the devnet master key:

  cd ~/dev/void-node
  RPC_URL=http://127.0.0.1:8545 \
  DEVNET_PRIVKEY="$DEVNET_PRIVKEY" \
    ./ops/void-devnet-system-bootstrap.sh

Typical happy-path output:

  [system-bootstrap] current masterKey = 0xf39F...
  [system-bootstrap][OK] masterKey already set to deployer – nothing to do

---

## 7. Handy sanity checks

After a run, you can sanity check balances:

  cd ~/dev/void-node
  ADDR_FILE=docs/VOID-DEVNET-DEPLOY-ADDRESSES.json
  TOKEN_ADDR=$(jq -r '.VoidToken' "$ADDR_FILE")
  DEPLOYER=$(jq -r '.deployer' "$ADDR_FILE")

  cast call "$TOKEN_ADDR" "totalSupply()(uint256)" --rpc-url http://127.0.0.1:8545
  cast call "$TOKEN_ADDR" "balanceOf(address)(uint256)" "$DEPLOYER" --rpc-url http://127.0.0.1:8545

Both values should be:

  230000000000000000000000000   # 230M VOID with 18 decimals

