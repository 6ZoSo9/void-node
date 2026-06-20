#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

out="${VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_OUT:-/tmp/void-wc-to-void-settlement-preview-v1.json}"
account="${VOID_WC_SETTLEMENT_ACCOUNT:-}"
rate="${VOID_WC_TO_VOID_RATE_WC_PER_VOID:-100}"
cap="${VOID_WC_TO_VOID_PREVIEW_MAX_VOID:-1}"
ledger_override="${VOID_WC_SETTLEMENT_PREVIEW_LEDGER:-}"

python3 - "$out" "$account" "$rate" "$cap" "$ledger_override" <<'PY'
import json
import math
import os
import sys
from pathlib import Path
from decimal import Decimal, ROUND_DOWN

out = Path(sys.argv[1])
requested_account = sys.argv[2].strip()
rate_wc_per_void = Decimal(str(sys.argv[3]))
max_void_cap = Decimal(str(sys.argv[4]))
ledger_override = sys.argv[5].strip()

root = Path.cwd()

candidate_ledgers = []
if ledger_override:
    candidate_ledgers.append(Path(ledger_override))
candidate_ledgers.extend([
    root / "ops/mainnet0/work-credits-ledger.jsonl",
    root / "data/wc_v1/ledger.jsonl",
    Path(os.environ.get("VOID_DATA_DIR", "")) / "wc_v1/ledger.jsonl" if os.environ.get("VOID_DATA_DIR") else None,
    Path(os.environ.get("DATA_DIR", "")) / "wc_v1/ledger.jsonl" if os.environ.get("DATA_DIR") else None,
])
candidate_ledgers = [p for p in candidate_ledgers if p is not None]

def as_decimal(v):
    if v is None:
        return None
    try:
        if isinstance(v, bool):
            return None
        return Decimal(str(v))
    except Exception:
        return None

def pick_account(j):
    for k in ("account", "who", "participant", "recipient", "wallet", "subject"):
        v = j.get(k)
        if v is not None and str(v).strip():
            return str(v).strip()
    return "unknown"

def pick_amount(j):
    for k in ("wc_delta", "wc_credit_delta", "delta", "amount_wc", "wc", "amount"):
        d = as_decimal(j.get(k))
        if d is not None:
            return d
    return Decimal("0")

def is_negative_event(j):
    text = " ".join(str(j.get(k, "")) for k in ("kind", "type", "action", "status", "source")).lower()
    return any(x in text for x in ("debit", "redeem", "settle", "payout", "void_conversion", "wc_to_void"))

events = []
ledger_sources = []

for p in candidate_ledgers:
    try:
        if not p.exists() or not p.is_file():
            ledger_sources.append({"path": str(p), "exists": False, "events": 0})
            continue
        lines = [ln for ln in p.read_text(errors="replace").splitlines() if ln.strip()]
        source_events = 0
        for idx, line in enumerate(lines, 1):
            try:
                j = json.loads(line)
            except Exception:
                continue
            if not isinstance(j, dict):
                continue
            acct = pick_account(j)
            amt = pick_amount(j)
            if is_negative_event(j) and amt > 0:
                amt = -amt
            events.append({
                "source": str(p),
                "line": idx,
                "account": acct,
                "wc_delta": str(amt),
                "id": str(j.get("id") or j.get("receipt_id") or j.get("source_hash") or f"{p}:{idx}")[:160],
            })
            source_events += 1
        ledger_sources.append({"path": str(p), "exists": True, "events": source_events})
    except Exception as e:
        ledger_sources.append({"path": str(p), "exists": False, "error": str(e), "events": 0})

balances = {}
for e in events:
    balances[e["account"]] = balances.get(e["account"], Decimal("0")) + Decimal(e["wc_delta"])

if requested_account:
    selected = requested_account
elif balances:
    selected = sorted(balances.items(), key=lambda kv: (kv[1], kv[0]), reverse=True)[0][0]
else:
    selected = ""

balance = balances.get(selected, Decimal("0")) if selected else Decimal("0")
raw_void = Decimal("0")
if rate_wc_per_void > 0 and balance > 0:
    raw_void = balance / rate_wc_per_void

proposed_void = min(raw_void, max_void_cap)
proposed_void = proposed_void.quantize(Decimal("0.000001"), rounding=ROUND_DOWN)

eligible = bool(selected and balance >= rate_wc_per_void and proposed_void > 0)

result = {
    "marker": "VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1",
    "ok": True,
    "preview_only": True,
    "no_money_movement": True,
    "tx_broadcast": False,
    "private_key_required": False,
    "public_route_added": False,
    "ledger_write": False,
    "selected_account": selected,
    "requested_account": requested_account,
    "ledger_sources": ledger_sources,
    "account_balances_wc": {k: str(v) for k, v in sorted(balances.items())},
    "selected_balance_wc": str(balance),
    "conversion_policy": {
        "wc_per_void": str(rate_wc_per_void),
        "max_void_preview_cap": str(max_void_cap),
        "rounding": "down_to_0.000001_VOID"
    },
    "proposed_settlement": {
        "eligible": eligible,
        "proposed_void_delta": str(proposed_void),
        "raw_void_delta_before_cap": str(raw_void),
        "requires_operator_approval_record": True,
        "requires_duplicate_guard": True,
        "requires_explicit_private_execute_command": True,
        "execution_command_included": False
    },
    "closed_boundaries": {
        "does_not_send_void": True,
        "does_not_call_rpc": True,
        "does_not_read_private_key": True,
        "does_not_modify_ledger": True,
        "does_not_open_public_mutation": True,
        "does_not_open_public_intake": True
    },
    "events_seen": len(events)
}

out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
print(json.dumps(result, indent=2, sort_keys=True))
PY

grep -F '"marker": "VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1"' "$out" >/dev/null
grep -F '"preview_only": true' "$out" >/dev/null
grep -F '"tx_broadcast": false' "$out" >/dev/null
grep -F '"private_key_required": false' "$out" >/dev/null
grep -F '"does_not_send_void": true' "$out" >/dev/null

echo "VOID_WC_TO_VOID_SETTLEMENT_PREVIEW_V1_GREEN"
echo "preview_out=$out"
