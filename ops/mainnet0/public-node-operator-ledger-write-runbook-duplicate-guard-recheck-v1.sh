#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

TARGET_SUBJECT="${VOID_OPERATOR_LEDGER_WRITE_TARGET_SUBJECT:-first_external_tester_operator_ledger_write_readiness_fixture}"
TARGET_KIND="${VOID_OPERATOR_LEDGER_WRITE_TARGET_KIND:-wc_delta}"
TARGET_DELTA="${VOID_OPERATOR_LEDGER_WRITE_TARGET_DELTA:-1}"

python3 - "$ROOT" "$TARGET_SUBJECT" "$TARGET_KIND" "$TARGET_DELTA" <<'PY'
import hashlib, json, os, sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
target_subject = sys.argv[2]
target_kind = sys.argv[3]
target_delta = str(sys.argv[4])

candidate_rel = [
    "ops/mainnet0/wc-ledger.jsonl",
    "ops/mainnet0/workcredits-ledger.jsonl",
    "ops/mainnet0/operator-ledger.jsonl",
    "ops/mainnet0/public-node-wc-ledger.jsonl",
    "data/wc-ledger.jsonl",
    "data/workcredits-ledger.jsonl",
    "data/operator-ledger.jsonl",
    "var/wc-ledger.jsonl",
    "var/workcredits-ledger.jsonl",
]

env_candidates = [
    os.environ.get("VOID_WC_LEDGER_FILE"),
    os.environ.get("VOID_WORKCREDITS_LEDGER_FILE"),
    os.environ.get("VOID_OPERATOR_LEDGER_FILE"),
]

candidates = []
for item in env_candidates:
    if item:
        candidates.append(Path(item).expanduser())
for rel in candidate_rel:
    candidates.append(root / rel)

seen = set()
records = []
duplicate_lines = []

for p in candidates:
    try:
        rp = p.resolve()
    except Exception:
        continue
    if str(rp) in seen:
        continue
    seen.add(str(rp))

    exists = rp.exists() and rp.is_file()
    rec = {
        "path": str(rp),
        "exists": bool(exists),
        "size_bytes": 0,
        "sha256": None,
        "matching_lines": 0,
    }

    if exists:
        data = rp.read_bytes()
        text = data.decode("utf-8", errors="replace")
        rec["size_bytes"] = len(data)
        rec["sha256"] = hashlib.sha256(data).hexdigest()

        for i, line in enumerate(text.splitlines(), 1):
            hay = line.lower()
            subject_hit = target_subject.lower() in hay
            kind_hit = target_kind.lower() in hay
            delta_hit = f'"delta":{target_delta}' in hay.replace(" ", "") or f'"wc_delta":{target_delta}' in hay.replace(" ", "") or f"delta={target_delta}" in hay
            if subject_hit and (kind_hit or delta_hit):
                rec["matching_lines"] += 1
                duplicate_lines.append({
                    "path": str(rp),
                    "line": i,
                    "sha256": hashlib.sha256(line.encode()).hexdigest(),
                })

    records.append(rec)

duplicate_candidate_count = len(duplicate_lines)
existing_candidate_count = sum(1 for r in records if r["exists"])
scan = {
    "marker": "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_V1",
    "target_subject": target_subject,
    "target_kind": target_kind,
    "target_delta": target_delta,
    "candidate_count": len(records),
    "existing_candidate_count": existing_candidate_count,
    "duplicate_candidate_count": duplicate_candidate_count,
    "duplicate_found": duplicate_candidate_count > 0,
    "records": records,
    "duplicate_lines": duplicate_lines,
    "read_only_scan": True,
    "live_runtime_write": False,
    "wc_ledger_write": False,
    "wc_credit_delta_now": 0,
}
scan_sha = hashlib.sha256(json.dumps(scan, sort_keys=True).encode()).hexdigest()

print("VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_V1")
print("operator_ledger_write_runbook_duplicate_guard_recheck_target_subject=" + target_subject)
print("operator_ledger_write_runbook_duplicate_guard_recheck_target_kind=" + target_kind)
print("operator_ledger_write_runbook_duplicate_guard_recheck_target_delta=" + target_delta)
print("operator_ledger_write_runbook_duplicate_guard_recheck_existing_candidate_count=" + str(existing_candidate_count))
print("operator_ledger_write_runbook_duplicate_guard_recheck_duplicate_candidate_count=" + str(duplicate_candidate_count))
print("operator_ledger_write_runbook_duplicate_guard_recheck_duplicate_found=" + str(duplicate_candidate_count > 0).lower())
print("operator_ledger_write_runbook_duplicate_guard_recheck_read_only_scan=true")
print("operator_ledger_write_runbook_duplicate_guard_recheck_live_runtime_write=false")
print("operator_ledger_write_runbook_duplicate_guard_recheck_wc_ledger_write=false")
print("operator_ledger_write_runbook_duplicate_guard_recheck_wc_credit_delta_now=0")
print("operator_ledger_write_runbook_duplicate_guard_recheck_scan_sha256=" + scan_sha)
if duplicate_candidate_count:
    print("operator_ledger_write_runbook_duplicate_guard_recheck_blocked=true")
else:
    print("operator_ledger_write_runbook_duplicate_guard_recheck_blocked=false")
print("VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_DUPLICATE_GUARD_RECHECK_V1_GREEN")
PY
