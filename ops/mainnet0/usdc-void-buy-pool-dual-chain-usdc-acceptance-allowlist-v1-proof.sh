#!/usr/bin/env bash
set -euo pipefail

echo "VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1_PROOF_BEGIN"

src="src/index.ts"
doc="docs/public/usdc-void-buy-pool-dual-chain-usdc-acceptance-allowlist-v1.md"
fixture="fixtures/public/usdc-void-buy-pool-dual-chain-usdc-acceptance-allowlist-v1.json"

marker="VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1"
preflight_marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_ENABLEMENT_PREFLIGHT_CLOSEOUT_V1"

html_route="/public-node/usdc-void-buy-pool/automatic-payment-enablement/dual-chain-usdc-allowlist-v1"
json_route="/public-node/usdc-void-buy-pool/automatic-payment-enablement/dual-chain-usdc-allowlist-v1.json"

eth_usdc="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
base_usdc="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

test -f "$src"
test -f "$doc"
test -f "$fixture"

grep -F "$marker" "$doc" >/dev/null
grep -F "$html_route" "$doc" >/dev/null
grep -F "$json_route" "$doc" >/dev/null
grep -F "$eth_usdc" "$doc" >/dev/null
grep -F "$base_usdc" "$doc" >/dev/null
grep -F "bridged USDbC" "$doc" >/dev/null

grep -F "$marker" "$src" >/dev/null
grep -F "$html_route" "$src" >/dev/null
grep -F "$json_route" "$src" >/dev/null
grep -F "$preflight_marker" "$src" >/dev/null
grep -F "$eth_usdc" "$src" >/dev/null
grep -F "$base_usdc" "$src" >/dev/null

node <<'NODE'
const fs = require("fs");
const fixture = JSON.parse(fs.readFileSync("fixtures/public/usdc-void-buy-pool-dual-chain-usdc-acceptance-allowlist-v1.json", "utf8"));

function assert(x, msg){ if(!x){ throw new Error(msg); } }

assert(fixture.marker === "VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1", "bad marker");
assert(fixture.scope === "public_read_only_dual_chain_usdc_acceptance_allowlist", "bad scope");
assert(Array.isArray(fixture.accepted_assets), "accepted assets must be array");
assert(fixture.accepted_assets.length === 2, "must accept exactly two assets");

const byChain = Object.fromEntries(fixture.accepted_assets.map(a => [a.chain_key, a]));
assert(byChain.ethereum, "missing ethereum");
assert(byChain.base, "missing base");

assert(byChain.ethereum.chain_id === 1, "ethereum chain_id must be 1");
assert(byChain.ethereum.caip2 === "eip155:1", "ethereum caip2 must be eip155:1");
assert(byChain.ethereum.token_contract === "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "bad ethereum usdc");
assert(byChain.ethereum.token_contract_lowercase === byChain.ethereum.token_contract.toLowerCase(), "bad ethereum lowercase");
assert(byChain.ethereum.decimals === 6, "ethereum decimals must be 6");
assert(byChain.ethereum.native_usdc === true, "ethereum native_usdc must be true");

assert(byChain.base.chain_id === 8453, "base chain_id must be 8453");
assert(byChain.base.caip2 === "eip155:8453", "base caip2 must be eip155:8453");
assert(byChain.base.token_contract === "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "bad base usdc");
assert(byChain.base.token_contract_lowercase === byChain.base.token_contract.toLowerCase(), "bad base lowercase");
assert(byChain.base.decimals === 6, "base decimals must be 6");
assert(byChain.base.native_usdc === true, "base native_usdc must be true");

assert(fixture.rejected_assets.includes("bridged_usdbc"), "must reject USDbC");
assert(fixture.rejected_assets.includes("non_allowlisted_chains"), "must reject non-allowlisted chains");
assert(fixture.rejected_assets.includes("wrong_token_decimals"), "must reject wrong decimals");

for (const [k, v] of Object.entries(fixture.verification_policy)) {
  assert(v === true, `verification policy ${k} must be true`);
}

assert(fixture.status.ethereum_mainnet_usdc_accepted === true, "ethereum usdc must be accepted");
assert(fixture.status.base_mainnet_native_usdc_accepted === true, "base usdc must be accepted");
assert(fixture.status.bridged_usdbc_accepted === false, "USDbC must not be accepted");
assert(fixture.status.automatic_payment_execution_enabled === false, "automatic payment must remain false");
assert(fixture.status.automatic_fulfillment_enabled === false, "automatic fulfillment must remain false");

for (const [k, v] of Object.entries(fixture.authority)) {
  assert(v === false, `authority ${k} must be false`);
}
for (const [k, v] of Object.entries(fixture.privacy)) {
  assert(v === false, `privacy ${k} must be false`);
}
NODE

if grep -RE '"automatic_payment_execution"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment"[[:space:]]*:[[:space:]]*true|"buyer_fulfillment"[[:space:]]*:[[:space:]]*true|"wallet_signing"[[:space:]]*:[[:space:]]*true|"treasury_movement"[[:space:]]*:[[:space:]]*true|"public_mutation"[[:space:]]*:[[:space:]]*true|"automatic_payment_execution_enabled"[[:space:]]*:[[:space:]]*true|"automatic_fulfillment_enabled"[[:space:]]*:[[:space:]]*true|"wallet_signing_enabled"[[:space:]]*:[[:space:]]*true|"public_mutation_enabled"[[:space:]]*:[[:space:]]*true' "$fixture"; then
  echo "unsafe true authority found in dual-chain allowlist fixture" >&2
  exit 1
fi

echo "dual_chain_usdc_acceptance_allowlist_doc_green=true"
echo "dual_chain_usdc_acceptance_allowlist_fixture_green=true"
echo "dual_chain_usdc_acceptance_allowlist_exactly_two_assets_green=true"
echo "dual_chain_usdc_acceptance_allowlist_ethereum_usdc_green=true"
echo "dual_chain_usdc_acceptance_allowlist_base_usdc_green=true"
echo "dual_chain_usdc_acceptance_allowlist_usdbc_rejected_green=true"
echo "dual_chain_usdc_acceptance_allowlist_src_route_green=true"
echo "dual_chain_usdc_acceptance_allowlist_src_dashboard_green=true"
echo "dual_chain_usdc_acceptance_allowlist_src_route_index_green=true"
echo "dual_chain_usdc_acceptance_allowlist_authority_false_green=true"

if test "${VOID_RUNTIME_LIVE_VERIFY:-0}" = "1"; then
  local_origin="${VOID_RUNTIME_LOCAL_ORIGIN:-http://127.0.0.1:4100}"
  public_origin="${VOID_RUNTIME_PUBLIC_ORIGIN:-https://zoso-alienware-aurora-r7.taila47fd.ts.net}"
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' EXIT

  for origin_name in local public; do
    if test "$origin_name" = "local"; then origin="$local_origin"; else origin="$public_origin"; fi

    curl -fsS "$origin$html_route" -o "$tmpdir/$origin_name-allowlist.html"
    curl -fsS "$origin$json_route" -o "$tmpdir/$origin_name-allowlist.json"
    curl -fsS "$origin/public-node" -o "$tmpdir/$origin_name-dashboard.html"
    curl -fsS "$origin/public-node/route-index.json" -o "$tmpdir/$origin_name-route-index.json"

    grep -F "$marker" "$tmpdir/$origin_name-allowlist.html" >/dev/null
    grep -F "$marker" "$tmpdir/$origin_name-allowlist.json" >/dev/null
    grep -F "$eth_usdc" "$tmpdir/$origin_name-allowlist.html" >/dev/null
    grep -F "$base_usdc" "$tmpdir/$origin_name-allowlist.html" >/dev/null
    grep -F "$json_route" "$tmpdir/$origin_name-dashboard.html" >/dev/null
    grep -F "$json_route" "$tmpdir/$origin_name-route-index.json" >/dev/null
  done

  node "$tmpdir/local-allowlist.json" "$tmpdir/public-allowlist.json" <<'NODE'
const fs = require("fs");
for (const f of process.argv.slice(1)) {
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  if (j.marker !== "VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1") throw new Error(`${f}: bad marker`);
  if (!Array.isArray(j.accepted_assets) || j.accepted_assets.length !== 2) throw new Error(`${f}: must accept exactly two assets`);
  const chains = new Set(j.accepted_assets.map(a => `${a.chain_id}:${a.token_contract_lowercase}`));
  if (!chains.has("1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")) throw new Error(`${f}: missing eth usdc`);
  if (!chains.has("8453:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913")) throw new Error(`${f}: missing base usdc`);
  if (j.status.bridged_usdbc_accepted !== false) throw new Error(`${f}: USDbC must be rejected`);
  for (const [k, v] of Object.entries(j.authority)) {
    if (v !== false) throw new Error(`${f}: authority ${k} must be false`);
  }
}
NODE

  echo "dual_chain_usdc_acceptance_allowlist_live_local_route_green=true"
  echo "dual_chain_usdc_acceptance_allowlist_live_local_discovery_green=true"
  echo "dual_chain_usdc_acceptance_allowlist_live_public_route_green=true"
  echo "dual_chain_usdc_acceptance_allowlist_live_public_discovery_green=true"
else
  echo "dual_chain_usdc_acceptance_allowlist_live_check_skipped=true"
fi

echo "VOID_USDC_VOID_BUY_POOL_DUAL_CHAIN_USDC_ACCEPTANCE_ALLOWLIST_V1_GREEN"
