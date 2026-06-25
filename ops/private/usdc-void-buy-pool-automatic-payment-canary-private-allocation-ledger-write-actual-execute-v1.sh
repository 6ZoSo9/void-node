#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

marker="VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1"

approval_proof="ops/mainnet0/usdc-void-buy-pool-automatic-payment-canary-private-allocation-ledger-write-operator-approval-v1-proof.sh"
approval_out="/tmp/void-canary-private-allocation-ledger-write-operator-approval-v1-approve-output.json"

ledger="${VOID_PRIVATE_ALLOCATION_LEDGER_PATH:-ops/private/usdc-void-buy-pool-allocation-reservations.jsonl}"
out="${VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_OUT:-/tmp/void-canary-private-allocation-ledger-write-actual-execute-v1-output.json}"
unlock="${VOID_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE:-0}"

if [ "$unlock" != "1" ]; then
  echo "$marker"
  echo "actual_execute_unlocked=false"
  echo "private_allocation_ledger_write_now=false"
  echo "ledger_entry_written_now=false"
  echo "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1_REFUSED_LOCKED"
  exit 12
fi

test -x "$approval_proof"

bash "$approval_proof" >/tmp/void-private-allocation-ledger-write-actual-execute-approval-proof.log
test -f "$approval_out"

python3 - "$approval_out" "$ledger" "$out" "$marker" <<'PY'
import datetime
import hashlib
import json
import shutil
import sys
from pathlib import Path

approval_path, ledger_path, out_path, marker = sys.argv[1:]
approval = json.loads(Path(approval_path).read_text(encoding="utf-8"))

if approval.get("marker") != "VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_OPERATOR_APPROVAL_V1":
    print("blocked_wrong_approval_marker=true")
    sys.exit(20)

if approval.get("ok") is not True:
    print("blocked_approval_not_ok=true")
    sys.exit(21)

operator = approval.get("operator_approval", {})
if operator.get("state") != "approved_pending_separate_private_allocation_ledger_write_execute":
    print("blocked_operator_approval_state_not_ready=true")
    sys.exit(22)

authority = approval.get("authority", {})
if authority.get("private_allocation_ledger_write_execute_approved") is not True:
    print("blocked_execute_not_approved=true")
    sys.exit(23)

for key in [
    "private_allocation_ledger_write_now",
    "private_allocation_ledger_mutation",
    "fulfillment_execution",
    "wallet_signing",
    "void_transfer",
    "public_mutation",
    "public_buyer_execution",
]:
    if authority.get(key) is not False:
        print(f"blocked_authority_{key}_must_be_false=true")
        sys.exit(24)

packet = approval.get("private_allocation_ledger_write_packet")
if not isinstance(packet, dict):
    print("blocked_missing_packet=true")
    sys.exit(25)

required = [
    "packet_id",
    "allocation_record_id",
    "canonical_payment_identity",
    "buyer_key",
    "void_receive_address",
    "reserved_void_amount",
    "inventory_remaining_before",
    "inventory_remaining_after",
]
missing = [k for k in required if not packet.get(k)]
if missing:
    print("blocked_missing_packet_fields=" + ",".join(missing))
    sys.exit(26)

ledger = Path(ledger_path)
ledger.parent.mkdir(parents=True, exist_ok=True)
if not ledger.exists():
    ledger.write_text("", encoding="utf-8")

raw_before = ledger.read_bytes()
before_lines = [line for line in raw_before.decode("utf-8").splitlines() if line.strip()]

existing = []
for idx, line in enumerate(before_lines, 1):
    try:
        obj = json.loads(line)
    except Exception as exc:
        print(f"blocked_ledger_json_parse_error_line={idx}")
        print(f"error={exc}")
        sys.exit(30)
    existing.append(obj)

allocation_record_id = packet["allocation_record_id"]
packet_id = packet["packet_id"]
canonical_payment_identity = packet["canonical_payment_identity"]

duplicate_lines = []
for idx, obj in enumerate(existing, 1):
    if obj.get("allocation_record_id") == allocation_record_id:
        duplicate_lines.append(f"allocation_record_id:{idx}")
    if obj.get("packet_id") == packet_id:
        duplicate_lines.append(f"packet_id:{idx}")
    if obj.get("canonical_payment_identity") == canonical_payment_identity:
        duplicate_lines.append(f"canonical_payment_identity:{idx}")

if duplicate_lines:
    result = {
        "marker": marker,
        "ok": False,
        "state": "refused_duplicate_private_allocation_ledger_record",
        "ledger_path": str(ledger),
        "duplicate_lines": duplicate_lines,
        "private_allocation_ledger_write_now": False,
        "ledger_entry_written_now": False,
        "fulfillment_execution": False,
        "wallet_signing": False,
        "void_transfer": False,
        "public_mutation": False,
    }
    Path(out_path).write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2, sort_keys=True))
    print("VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1_REFUSED_DUPLICATE")
    sys.exit(31)

previous_hash = "GENESIS_VOID_PRIVATE_ALLOCATION_LEDGER_V1"
if existing:
    previous_hash = existing[-1].get("allocation_record_hash") or ""
    if not previous_hash:
        print("blocked_previous_hash_missing=true")
        sys.exit(32)

stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M%S")
backup = Path(f"/tmp/void-private-allocation-ledger-write-actual-execute-v1-before-{stamp}.jsonl")
shutil.copy2(ledger, backup)

entry_body = {
    "schema": "void_usdc_void_buy_pool_private_allocation_ledger_record_v1",
    "record_type": "usdc_void_buy_pool_private_allocation_reservation",
    "lane": "automatic_payment_canary_private_allocation_ledger_write_actual_execute_v1",
    "packet_id": packet_id,
    "allocation_record_id": allocation_record_id,
    "canonical_payment_identity": canonical_payment_identity,
    "buyer_key": packet["buyer_key"],
    "void_receive_address": packet["void_receive_address"],
    "reserved_void_amount": packet["reserved_void_amount"],
    "inventory_remaining_before": packet["inventory_remaining_before"],
    "inventory_remaining_after": packet["inventory_remaining_after"],
    "source_preflight_marker": packet.get("source_preflight_marker"),
    "source_preflight_state": packet.get("source_preflight_state"),
    "operator_approval_marker": approval.get("marker"),
    "operator_approval_state": operator.get("state"),
    "previous_allocation_record_hash": previous_hash,
    "created_at_utc": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
    "safety": {
        "private_allocation_ledger_write_now": True,
        "private_allocation_ledger_mutation": True,
        "fulfillment_execution": False,
        "wallet_signing": False,
        "void_transfer": False,
        "public_mutation": False,
        "public_buyer_execution": False,
        "money_movement_now": False
    }
}

payload = json.dumps(entry_body, sort_keys=True, separators=(",", ":"))
record_hash = hashlib.sha256(payload.encode("utf-8")).hexdigest()
entry = dict(entry_body)
entry["allocation_record_hash"] = record_hash
line = json.dumps(entry, sort_keys=True, separators=(",", ":"))

with ledger.open("ab") as f:
    if raw_before and not raw_before.endswith(b"\n"):
        f.write(b"\n")
    f.write(line.encode("utf-8") + b"\n")

raw_after = ledger.read_bytes()
after_lines = [line for line in raw_after.decode("utf-8").splitlines() if line.strip()]

matches = []
for idx, line_after in enumerate(after_lines, 1):
    obj = json.loads(line_after)
    if (
        obj.get("allocation_record_id") == allocation_record_id
        and obj.get("packet_id") == packet_id
        and obj.get("canonical_payment_identity") == canonical_payment_identity
    ):
        matches.append((idx, obj))

if len(matches) != 1:
    print("post_write_match_count=" + str(len(matches)))
    print("VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1_POSTCHECK_FAILED")
    sys.exit(33)

line_no, written = matches[0]
result = {
    "marker": marker,
    "ok": True,
    "state": "private_allocation_ledger_record_appended",
    "ledger_path": str(ledger),
    "backup_path": str(backup),
    "ledger_before_lines": len(before_lines),
    "ledger_after_lines": len(after_lines),
    "ledger_entry_line": line_no,
    "allocation_record_id": allocation_record_id,
    "packet_id": packet_id,
    "canonical_payment_identity": canonical_payment_identity,
    "allocation_record_hash": written["allocation_record_hash"],
    "previous_allocation_record_hash": written["previous_allocation_record_hash"],
    "private_allocation_ledger_write_now": True,
    "ledger_entry_written_now": True,
    "private_allocation_ledger_mutation": True,
    "fulfillment_execution": False,
    "wallet_signing": False,
    "void_transfer": False,
    "public_mutation": False,
    "public_buyer_execution": False,
    "money_movement_now": False,
}
Path(out_path).write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
print(json.dumps(result, indent=2, sort_keys=True))
print("VOID_USDC_VOID_BUY_POOL_AUTOMATIC_PAYMENT_CANARY_PRIVATE_ALLOCATION_LEDGER_WRITE_ACTUAL_EXECUTE_V1_GREEN")
PY
