# VOID Mainnet Bootstrap – DEV PLAN Rehearsal

This doc anchors the DEV PLAN flow for VOID mainnet bootstrap.
It is NOT mainnet and does NOT touch real keys or live funds.

---

## 1. Dev PLAN config

Dev PLAN config file:

- config/void-mainnet-bootstrap-mainnet.dev.json

This file is derived from the live mainnet template:

- config/void-mainnet-bootstrap-mainnet.live.json

A helper script (dev keys → dev config) keeps the same JSON shape as the live
file but fills in dev/rehearsal addresses (from anvil or dev keyset) instead of
real mainnet addresses.

---

## 2. PLAN script (read-only, no broadcasts)

Bootstrap script:

- script/VoidMainnetBootstrapMainnet.s.sol
- Contract: VoidMainnetBootstrapMainnet
- Function: plan(string configPath)

The plan() function:

- Reads the JSON config.
- Parses:
  - .chainId
  - .roles.*
  - .contracts.*
  - .validator0.*
- Logs a human-readable PLAN to the console.
- Performs NO deployments.
- Performs NO state changes.
- Performs NO broadcasts.

PLAN mode is pure inspection of the config and the intended wiring.

---

## 3. Dev PLAN rehearsal helper

Helper script:

- ops/void-mainnet-dev-plan-rehearsal.sh

What it does:

1. Uses:
   - DEV_CFG="config/void-mainnet-bootstrap-mainnet.dev.json"
   - RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"

2. Runs:

   forge script script/VoidMainnetBootstrapMainnet.s.sol:VoidMainnetBootstrapMainnet \
     --rpc-url "$RPC_URL" \
     --sig "plan(string)" "$DEV_CFG" \
     -vvvv

3. Exits 0 when:
   - The JSON is well-formed.
   - chainId matches (2050 on both RPC and config).
   - All required roles and contracts are present.
   - validator0 fields parse correctly.

Expected logs include lines like:

- "=== [VOID mainnet bootstrap mainnet PLAN] ==="
- "runtime chainId : 2050"
- "config  chainId : 2050"
- "chainId sanity OK; parsed config view (PLAN)."
- Role and contract dumps.
- "PLAN mode: no broadcasts, no state changes, no deployments."

If ops/void-mainnet-dev-plan-rehearsal.sh exits with status 0,
the dev PLAN config is considered structurally sound.

---

## 4. When to run the dev PLAN rehearsal

Run the dev PLAN rehearsal when:

- We change the PLAN script logic.
- We change the JSON structure of the bootstrap config.
- We regenerate the dev PLAN config from new dev keys.
- We tighten monitoring/alerts around "plan health" so failures actually mean
  something real.

---

## 5. Separation from real mainnet

This DEV PLAN flow:

- Uses dev keys and dev addresses.
- Talks only to an RPC like http://127.0.0.1:8545 (anvil / local).
- Never broadcasts mainnet transactions.
- Never touches the real *.live.json mainnet config.

Real mainnet bootstrap will have:

- A separate RUNBOOK.
- A *.live.json that is kept off-git.
- Air-gapped keygen and USB-based key movement.
- Additional Prometheus/textfile guards and pre-push gates.

This doc exists to explain the dev rehearsal flow only.
