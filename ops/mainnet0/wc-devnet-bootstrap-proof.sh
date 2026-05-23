#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

export PATH="${HOME}/.foundry/bin:${PATH}"
RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
BASE="${BASE:-http://127.0.0.1:4100}"
DEPLOYER_PK="${WC_DEVNET_DEPLOYER_PK:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
RELAYER_WALLET="${WC_RELAYER_WALLET:-0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266}"
TEST_WALLET="${WC_TEST_WALLET:-0xdf994e1b8c1ac9078c66892b589c8aa76c3be592}"
STAMP="${STAMP:-$(date +%Y%m%d-%H%M%S)}"
OUT_DIR="${OUT_DIR:-.runtime/mainnet0/wc-devnet-bootstrap-$STAMP}"
TMP_ROOT="$OUT_DIR/foundry-root"

mkdir -p "$OUT_DIR" "$TMP_ROOT/src" broadcast/WorkCreditsDevnetDeploy.s.sol/2050

need() { command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing $1" >&2; exit 1; }; }
need node
need python3
need jq
need curl
need forge
need cast
need anvil

echo "=== WC devnet bootstrap proof ==="
echo "rpc=$RPC_URL"
echo "base=$BASE"
echo "out=$OUT_DIR"

echo
echo "=== [1] node readiness ==="
READY="$(curl -fsS "$BASE/__void/ready.json")"
printf '%s\n' "$READY"
python3 - "$READY" <<'PY'
import json, sys
o=json.loads(sys.argv[1])
assert o.get("ready") is True
assert int(o.get("gap", -1)) == 0
assert int(o.get("txroot_live", 0)) == 1
print("[ok] ready/gap/txroot")
PY

echo
echo "=== [2] ensure local RPC 8545 chainId 2050 ==="
if ! cast chain-id --rpc-url "$RPC_URL" >/tmp/void-wc-chainid.$$ 2>/dev/null; then
  echo "[info] no RPC on 8545; starting disposable anvil chainId 2050"
  nohup anvil --host 127.0.0.1 --port 8545 --chain-id 2050 >"/tmp/void-wc-devnet-anvil-$STAMP.log" 2>&1 &
  sleep 4
fi

CHAIN_ID="$(cast chain-id --rpc-url "$RPC_URL")"
echo "chain_id=$CHAIN_ID"
test "$CHAIN_ID" = "2050"

DEPLOYER_ADDR="$(cast wallet address --private-key "$DEPLOYER_PK")"
echo "deployer=$DEPLOYER_ADDR"
cast rpc --rpc-url "$RPC_URL" anvil_setBalance "$DEPLOYER_ADDR" "0x56BC75E2D63100000" >/dev/null 2>&1 || true

echo
echo "=== [3] create self-contained WC contracts ==="
cat > "$TMP_ROOT/foundry.toml" <<'TOML'
[profile.default]
src = "src"
out = "out"
libs = []
solc_version = "0.8.35"
optimizer = true
optimizer_runs = 200
TOML

cat > "$TMP_ROOT/src/WCDevnet.sol" <<'SOL'
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Like {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract DevnetERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function mint(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "mint_to_zero");
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "transfer_to_zero");
        require(balanceOf[from] >= amount, "balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
    }
}

contract DevnetVoidToken is DevnetERC20 {
    constructor() DevnetERC20("VOID Devnet", "VOID") {}
}

contract WorkCreditsToken is DevnetERC20 {
    constructor() DevnetERC20("WorkCredits", "WC") {}
}

contract WorkCreditsPoolV1 {
    address public immutable voidToken;
    address public immutable workCreditsToken;
    uint256 public constant WC_PER_VOID = 100;

    event SwapVoidForWc(address indexed sender, address indexed to, uint256 amountIn, uint256 amountOut);
    event SwapWcForVoid(address indexed sender, address indexed to, uint256 amountIn, uint256 amountOut);

    constructor(address voidToken_, address workCreditsToken_) {
        require(voidToken_ != address(0), "void_zero");
        require(workCreditsToken_ != address(0), "wc_zero");
        voidToken = voidToken_;
        workCreditsToken = workCreditsToken_;
    }

    function swapVoidForWc(uint256 amountIn, uint256 minOut, address to) external returns (uint256 amountOut) {
        require(to != address(0), "to_zero");
        amountOut = amountIn * WC_PER_VOID;
        require(amountOut >= minOut, "slippage");
        require(IERC20Like(voidToken).transferFrom(msg.sender, address(this), amountIn), "void_in");
        require(IERC20Like(workCreditsToken).transfer(to, amountOut), "wc_out");
        emit SwapVoidForWc(msg.sender, to, amountIn, amountOut);
    }

    function swapWcForVoid(uint256 amountIn, uint256 minOut, address to) external returns (uint256 amountOut) {
        require(to != address(0), "to_zero");
        amountOut = amountIn / WC_PER_VOID;
        require(amountOut > 0, "dust");
        require(amountOut >= minOut, "slippage");
        require(IERC20Like(workCreditsToken).transferFrom(msg.sender, address(this), amountIn), "wc_in");
        require(IERC20Like(voidToken).transfer(to, amountOut), "void_out");
        emit SwapWcForVoid(msg.sender, to, amountIn, amountOut);
    }
}
SOL

forge build --root "$TMP_ROOT"

deploy_contract() {
  local target="$1"
  shift || true
  local log="$OUT_DIR/${target}.deploy.log"

  set +e
  forge create \
    --root "$TMP_ROOT" \
    --rpc-url "$RPC_URL" \
    --private-key "$DEPLOYER_PK" \
    --broadcast \
    "src/WCDevnet.sol:${target}" \
    "$@" >"$log" 2>&1
  local rc=$?
  set -e

  if [ "$rc" -ne 0 ]; then
    echo "[ERR] forge create failed for $target rc=$rc" >&2
    sed -n '1,240p' "$log" >&2
    return "$rc"
  fi

  local addr
  addr="$(
    python3 - "$log" <<'PY'
import re, sys, pathlib
text = pathlib.Path(sys.argv[1]).read_text(errors="replace")

patterns = [
    r"Deployed to:\s*(0x[0-9a-fA-F]{40})",
    r"Contract Address:\s*(0x[0-9a-fA-F]{40})",
    r"contractAddress['\"]?\s*[:=]\s*['\"]?(0x[0-9a-fA-F]{40})",
    r"deployedTo['\"]?\s*[:=]\s*['\"]?(0x[0-9a-fA-F]{40})",
]
for pat in patterns:
    m = re.search(pat, text)
    if m:
        print(m.group(1))
        raise SystemExit(0)

print("----- deploy log begin -----", file=sys.stderr)
print(text[:4000], file=sys.stderr)
print("----- deploy log end -----", file=sys.stderr)
raise SystemExit(1)
PY
  )"

  if ! [[ "$addr" =~ ^0x[0-9a-fA-F]{40}$ ]]; then
    echo "[ERR] invalid deployed address for $target: $addr" >&2
    sed -n '1,240p' "$log" >&2
    return 1
  fi

  echo "$addr"
}

echo
echo "=== [4] deploy WC devnet contracts ==="
VOID_TOKEN="$(deploy_contract DevnetVoidToken)"
WC_TOKEN="$(deploy_contract WorkCreditsToken)"
POOL="$(deploy_contract WorkCreditsPoolV1 --constructor-args "$VOID_TOKEN" "$WC_TOKEN")"

echo "void_token=$VOID_TOKEN"
echo "wc_token=$WC_TOKEN"
echo "pool=$POOL"

echo
echo "=== [5] seed pool + relayer/test balances ==="
VOID_POOL_RAW="500000000000000000000"
WC_POOL_RAW="50000000000000000000000"
VOID_USER_RAW="1000000000000000000000"
WC_USER_RAW="100000000000000000000000"

cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" "$VOID_TOKEN" 'mint(address,uint256)' "$POOL" "$VOID_POOL_RAW" >/dev/null
cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" "$WC_TOKEN" 'mint(address,uint256)' "$POOL" "$WC_POOL_RAW" >/dev/null
cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" "$VOID_TOKEN" 'mint(address,uint256)' "$RELAYER_WALLET" "$VOID_USER_RAW" >/dev/null
cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" "$WC_TOKEN" 'mint(address,uint256)' "$RELAYER_WALLET" "$WC_USER_RAW" >/dev/null
cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" "$VOID_TOKEN" 'mint(address,uint256)' "$TEST_WALLET" "$VOID_USER_RAW" >/dev/null
cast send --rpc-url "$RPC_URL" --private-key "$DEPLOYER_PK" "$WC_TOKEN" 'mint(address,uint256)' "$TEST_WALLET" "$WC_USER_RAW" >/dev/null

echo
echo "=== [6] prove deployed code + balances ==="
for pair in "VOID:$VOID_TOKEN" "WC:$WC_TOKEN" "POOL:$POOL"; do
  name="${pair%%:*}"
  addr="${pair#*:}"
  code="$(cast code "$addr" --rpc-url "$RPC_URL")"
  echo "${name}_code_len=${#code}"
  test "${#code}" -gt 2
done

cast call --rpc-url "$RPC_URL" "$POOL" 'voidToken()(address)'
cast call --rpc-url "$RPC_URL" "$VOID_TOKEN" 'balanceOf(address)(uint256)' "$POOL"
cast call --rpc-url "$RPC_URL" "$WC_TOKEN" 'balanceOf(address)(uint256)' "$POOL"

echo
echo "=== [7] write state JSON + broadcast compatibility artifact ==="
python3 - "$VOID_TOKEN" "$WC_TOKEN" "$POOL" "$VOID_POOL_RAW" "$WC_POOL_RAW" <<'PY'
import json, pathlib, sys

void_token, wc_token, pool, void_raw, wc_raw = sys.argv[1:]

proto = {
  "chain": "devnet",
  "rpc_url": "http://127.0.0.1:8545",
  "workCreditsToken": wc_token,
  "workCreditsPoolV1": pool,
  "workCreditsRelayerV1": "0x0000000000000000000000000000000000000000",
  "voidToken": void_token
}
proto_path = pathlib.Path(os.environ.get("STATE_JSON", "docs/VOID-DEVNET-PROTOCOL-STATE.json"))
proto_path.parent.mkdir(parents=True, exist_ok=True)
proto_path.write_text(json.dumps(proto, indent=2) + "\n")

wc = {
  "chain": "devnet",
  "rpc_url": "http://127.0.0.1:8545",
  "pool_address": pool,
  "void_reserve_raw": void_raw,
  "wc_reserve_raw": wc_raw,
  "workcredits_token": wc_token,
  "void_token": void_token
}
wc_path = pathlib.Path(os.environ.get("STATE_FILE", "docs/VOID-WORKCREDITS-DEVNET-STATE.json"))
wc_path.parent.mkdir(parents=True, exist_ok=True)
wc_path.write_text(json.dumps(wc, indent=2) + "\n")

cfg_path = pathlib.Path(os.environ.get("WC_CONFIG_FILE", "config/void-workcredits-devnet.live.json"))
cfg_path.parent.mkdir(parents=True, exist_ok=True)
try:
    cfg = json.loads(cfg_path.read_text())
except Exception:
    cfg = {}
cfg["chainId"] = 2050
cfg["network"] = "devnet"
cfg["rpcUrl"] = "http://127.0.0.1:8545"
cfg["voidToken"] = void_token
cfg["workCreditsToken"] = wc_token
cfg["lpPool"] = pool
cfg["notes"] = [
  "Generated by ops/mainnet0/wc-devnet-bootstrap-proof.sh.",
  "Local devnet helper/relayer state only; not public Mainnet-0 launch approval."
]
cfg_path.write_text(json.dumps(cfg, indent=2) + "\n")

bcast = {
  "transactions": [
    {"contractName": "DevnetVoidToken", "contractAddress": void_token},
    {"contractName": "WorkCreditsToken", "contractAddress": wc_token},
    {"contractName": "WorkCreditsPoolV1", "contractAddress": pool}
  ]
}
bpath = pathlib.Path(os.environ.get("BCAST_FILE", "broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json"))
bpath.parent.mkdir(parents=True, exist_ok=True)
bpath.parent.mkdir(parents=True, exist_ok=True)
bpath.write_text(json.dumps(bcast, indent=2) + "\n")

print(json.dumps({
  "voidToken": void_token,
  "workCreditsToken": wc_token,
  "workCreditsPoolV1": pool
}, indent=2))
PY

echo
echo "=== [8] install/start helper + relayer user units ==="
HELPER_UNIT_SRC="ops/systemd/user/void-workcredits-devnet-http.service"
RELAYER_UNIT_SRC="ops/systemd/user/void-wc-relayer.service"
USER_UNIT_DIR="$HOME/.config/systemd/user"

test -f "$HELPER_UNIT_SRC"
test -f "$RELAYER_UNIT_SRC"

mkdir -p "$USER_UNIT_DIR"
cp -a "$HELPER_UNIT_SRC" "$USER_UNIT_DIR/void-workcredits-devnet-http.service"
cp -a "$RELAYER_UNIT_SRC" "$USER_UNIT_DIR/void-wc-relayer.service"

systemctl --user daemon-reload
systemctl --user enable --now void-workcredits-devnet-http.service void-wc-relayer.service
systemctl --user restart void-workcredits-devnet-http.service
systemctl --user restart void-wc-relayer.service
sleep 4

systemctl --user --no-pager --full status void-workcredits-devnet-http.service | sed -n '1,80p' || true
systemctl --user --no-pager --full status void-wc-relayer.service | sed -n '1,80p' || true

echo
echo "=== [9] helper/relayer probes ==="
POOL_JSON="$OUT_DIR/pool.json"
RELAYER_JSON="$OUT_DIR/relayer-health.json"

curl -fsS --max-time 10 http://127.0.0.1:4312/workcredits/devnet/pool.json | tee "$POOL_JSON"
echo
curl -fsS --max-time 10 http://127.0.0.1:4313/api/wc-relayer/v1/health | tee "$RELAYER_JSON"
echo

python3 - "$POOL_JSON" "$RELAYER_JSON" <<'PY'
import json, sys
pool=json.load(open(sys.argv[1]))
rel=json.load(open(sys.argv[2]))
assert pool.get("up") == 1 or pool.get("ok") is True or pool.get("health") == 1, pool
assert rel.get("ok") is True, rel
assert rel.get("helper_up") is True, rel
print("[ok] helper pool + relayer helper_up")
PY

echo
echo "=== [10] optional WC stack smoke ==="
make wc-stack-status
WC_RELAYER_SMOKE_REQUIRE_EXECUTE=0 bash ops/wc-relayer-smoke.sh

echo
echo "=== [11] Mainnet-0 status smoke still green ==="
make mainnet0-status-smoke

echo
echo "=== [12] summary ==="
python3 - <<PY
print({
  "wc_devnet_bootstrap": "green",
  "void_token": "$VOID_TOKEN",
  "workcredits_token": "$WC_TOKEN",
  "workcredits_pool": "$POOL",
  "relayer_wallet": "$RELAYER_WALLET",
  "test_wallet": "$TEST_WALLET",
  "launch_state": "not_go_for_public_mainnet0",
  "mutation_scope": "local_8545_devnet_only"
})
PY
