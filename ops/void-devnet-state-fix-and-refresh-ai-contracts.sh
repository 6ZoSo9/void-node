#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
STATE="${STATE:-$REPO/docs/VOID-DEVNET-PROTOCOL-STATE.json}"
CHAINID="${CHAINID:-2050}"
FORCE="${FORCE:-0}"  # set FORCE=1 to overwrite even if current looks valid

need() { command -v "$1" >/dev/null 2>&1 || { echo "[ERR] missing dep: $1" >&2; exit 2; }; }
need python3
need find
need sort
need head
need mktemp
need jq

is_addr() { [[ "${1:-}" =~ ^0x[0-9a-fA-F]{40}$ ]]; }

echo "=== [state fix + refresh ai contracts] ==="
echo "REPO=$REPO"
echo "STATE=$STATE"
echo "CHAINID=$CHAINID"
echo "FORCE=$FORCE"
echo

if [ ! -f "$STATE" ]; then
  echo "[ERR] state file not found: $STATE" >&2
  exit 3
fi

TS="$(date +%s)"
BK="$STATE.bak.$TS"
cp -a "$STATE" "$BK"
echo "[backup] $BK"
echo

# Newest run-latest.json first (mtime)
mapfile -t RUNS < <(
  find "$REPO/broadcast" -type f -name 'run-latest.json' -print 2>/dev/null \
    | while read -r f; do
        # print mtime_epoch<TAB>path
        python3 - <<PY "$f"
import os, sys
p=sys.argv[1]
print(f"{int(os.stat(p).st_mtime)}\t{p}")
PY
      done \
    | sort -nr \
    | awk -F'\t' '{print $2}'
)

echo "RUNS=${#RUNS[@]} (newest first)"
if [ "${#RUNS[@]}" -eq 0 ]; then
  echo "[WARN] no broadcast/**/run-latest.json found under $REPO/broadcast"
fi
echo

python3 - <<'PY'
import json, re, sys, os, time
from pathlib import Path

state_path = Path(os.environ.get("STATE", ""))
runs = os.environ.get("RUNS_LIST", "")
force = int(os.environ.get("FORCE", "0"))

targets = ["JobQueue","ReceiptRegistry","AgentRegistry","ModelRegistry","DatasetRegistry"]
addr_re = re.compile(r"^0x[0-9a-fA-F]{40}$")

def load_json_any(path: Path):
    raw = path.read_text(encoding="utf-8", errors="replace")
    try:
        j = json.loads(raw)
    except Exception as e:
        raise SystemExit(f"[ERR] state is not valid JSON: {path} ({e})")
    # If the root is a string that itself contains JSON, unwrap it.
    if isinstance(j, str):
        try:
            j2 = json.loads(j)
            j = j2
            print("[fix] state root was a JSON string; unwrapped via json.loads(root_string)")
        except Exception:
            print("[warn] state root is a string but not JSON; leaving as-is (will be normalized to empty object)")
            j = {}
    # If it's an array, try to use the first object element
    if isinstance(j, list):
        first_obj = next((x for x in j if isinstance(x, dict)), None)
        if first_obj is not None:
            print("[fix] state root was an array; using first object element")
            j = first_obj
        else:
            print("[warn] state root is an array with no objects; normalizing to empty object")
            j = {}
    if not isinstance(j, dict):
        print(f"[warn] state root type={type(j).__name__}; normalizing to empty object")
        j = {}
    return j

def get_addr_from_state(st, k):
    def addr(x):
        if isinstance(x, dict):
            return x.get("address") or x.get("addr") or ""
        if isinstance(x, str):
            return x
        return ""
    v = st.get(k)
    if not v and isinstance(st.get("contracts"), dict):
        v = st["contracts"].get(k)
    a = addr(v)
    return a if addr_re.match(a or "") else ""

def set_addr(st, k, a):
    # top-level convenience
    st[k] = a
    # canonical nested
    st.setdefault("contracts", {})
    if not isinstance(st["contracts"], dict):
        st["contracts"] = {}
    st["contracts"].setdefault(k, {})
    if not isinstance(st["contracts"][k], dict):
        st["contracts"][k] = {}
    st["contracts"][k]["address"] = a

def scan_run_for_targets(run_path: Path):
    try:
        j = json.loads(run_path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return {}
    found = {}

    # Common Foundry shapes:
    # - transactions[].contractName + contractAddress
    # - additionalContracts[].name + address
    txs = j.get("transactions") if isinstance(j, dict) else None
    if isinstance(txs, list):
        for t in txs:
            if not isinstance(t, dict): continue
            name = t.get("contractName") or t.get("name")
            addr = t.get("contractAddress") or t.get("address")
            if isinstance(name, str) and isinstance(addr, str) and addr_re.match(addr):
                if name in targets and name not in found:
                    found[name] = addr

    adds = j.get("additionalContracts") if isinstance(j, dict) else None
    if isinstance(adds, list):
        for t in adds:
            if not isinstance(t, dict): continue
            name = t.get("name") or t.get("contractName")
            addr = t.get("address") or t.get("contractAddress")
            if isinstance(name, str) and isinstance(addr, str) and addr_re.match(addr):
                if name in targets and name not in found:
                    found[name] = addr

    # Some broadcasts put deployments under "deployments" (rare, but cheap to check)
    deps = j.get("deployments") if isinstance(j, dict) else None
    if isinstance(deps, list):
        for t in deps:
            if not isinstance(t, dict): continue
            name = t.get("contractName") or t.get("name")
            addr = t.get("contractAddress") or t.get("address")
            if isinstance(name, str) and isinstance(addr, str) and addr_re.match(addr):
                if name in targets and name not in found:
                    found[name] = addr

    return found

# plumb env from bash
STATE = Path(os.environ["STATE"])
RUNS = [Path(p) for p in os.environ.get("RUNS_LIST","").splitlines() if p.strip()]

st = load_json_any(STATE)
st.setdefault("chainId", st.get("chainId"))
st.setdefault("contracts", {})

before = {k: get_addr_from_state(st,k) for k in targets}
print("=== [before] ===")
for k in targets:
    a = before.get(k,"")
    print(f"{k:16} {'OK' if a else 'BAD':3} {a!r}")
print()

# Decide whether to attempt refresh:
need_refresh = force or any(not before.get(k) for k in targets)
if not need_refresh:
    print("[skip] all target addresses already present and valid (set FORCE=1 to rescan broadcasts)")
else:
    # scan newest-first, take first hit per contract
    picked = {}
    for rp in RUNS:
        hit = scan_run_for_targets(rp)
        for k, a in hit.items():
            if k not in picked and addr_re.match(a):
                picked[k] = (a, str(rp))
        if len(picked) == len(targets):
            break

    changed = 0
    for k in targets:
        cur = before.get(k) or ""
        if cur and not force:
            continue
        if k in picked:
            a, src = picked[k]
            set_addr(st, k, a)
            changed += 1
            print(f"[set] {k}={a} (from {src})")
        else:
            print(f"[warn] {k}: not found in broadcast artifacts (still empty/invalid)")

    print()
    if changed > 0:
        tmp = STATE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(st, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        tmp.replace(STATE)
        print(f"[write] updated state: {STATE} (changed {changed})")
    else:
        print("[done] no changes made")

# final report
st2 = load_json_any(STATE)
st2.setdefault("contracts", {})
after = {k: get_addr_from_state(st2,k) for k in targets}
print()
print("=== [after] ===")
for k in targets:
    a = after.get(k,"")
    print(f"{k:16} {'OK' if a else 'BAD':3} {a!r}")

PY
