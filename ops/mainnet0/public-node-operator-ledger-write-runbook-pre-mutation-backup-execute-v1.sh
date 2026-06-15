#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BASE="${VOID_PRE_MUTATION_BACKUP_BASE:-/tmp/void-operator-ledger-write-runbook/pre-mutation-backup-v1}"
OUT="$BASE/$STAMP"

mkdir -p "$OUT"

python3 - "$ROOT" "$OUT" "$STAMP" <<'PY'
import hashlib, json, os, shutil, sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
out = Path(sys.argv[2]).resolve()
stamp = sys.argv[3]

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
files = []
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
        "sha256": None,
        "size_bytes": 0,
        "backup_path": None,
    }

    if exists:
        data = rp.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        safe = hashlib.sha256(str(rp).encode()).hexdigest()[:16] + "-" + rp.name
        bp = out / safe
        shutil.copy2(rp, bp)
        rec.update({
            "sha256": digest,
            "size_bytes": len(data),
            "backup_path": str(bp),
            "backup_sha256": hashlib.sha256(bp.read_bytes()).hexdigest(),
        })

    files.append(rec)

manifest = {
    "marker": "VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_V1",
    "created_at_utc": stamp,
    "backup_dir": str(out),
    "repo_root": str(root),
    "backup_created_now": True,
    "backup_file_created_now": True,
    "ledger_snapshot_created_now": True,
    "candidate_count": len(files),
    "existing_candidate_count": sum(1 for f in files if f["exists"]),
    "files": files,
    "live_runtime_write": False,
    "wc_ledger_write": False,
    "wc_ledger_mutated_now": False,
    "wc_credit_award": False,
    "wc_credit_delta_now": 0,
    "wallet_send": False,
    "validator_mutation_open": False,
    "money_movement_open": False,
    "automatic_ledger_write_allowed": False,
}

mp = out / "pre-mutation-backup-manifest.json"
mp.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
manifest["manifest_sha256"] = hashlib.sha256(mp.read_bytes()).hexdigest()
mp.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")

print("VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_V1")
print("operator_ledger_write_runbook_pre_mutation_backup_execute_backup_created_now=true")
print("operator_ledger_write_runbook_pre_mutation_backup_execute_backup_file_created_now=true")
print("operator_ledger_write_runbook_pre_mutation_backup_execute_ledger_snapshot_created_now=true")
print("operator_ledger_write_runbook_pre_mutation_backup_execute_existing_candidate_count=" + str(manifest["existing_candidate_count"]))
print("operator_ledger_write_runbook_pre_mutation_backup_execute_manifest=" + str(mp))
print("operator_ledger_write_runbook_pre_mutation_backup_execute_manifest_sha256=" + manifest["manifest_sha256"])
print("operator_ledger_write_runbook_pre_mutation_backup_execute_live_runtime_write=false")
print("operator_ledger_write_runbook_pre_mutation_backup_execute_wc_ledger_write=false")
print("operator_ledger_write_runbook_pre_mutation_backup_execute_wc_credit_delta_now=0")
print("VOID_PUBLIC_NODE_OPERATOR_LEDGER_WRITE_RUNBOOK_PRE_MUTATION_BACKUP_EXECUTE_V1_GREEN")
PY
