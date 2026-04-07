#!/usr/bin/env python3
import json
import shutil
from pathlib import Path

ROOT = Path("data_a")
JOBS = ROOT / "jobs_v1" / "jobs.jsonl"
AGENTV1 = ROOT / "agent_v1"
AGENTV1.mkdir(parents=True, exist_ok=True)

REPAIRED = ROOT / "jobs_v1" / "jobs.repaired.jsonl"
BACKUP = ROOT / "jobs_v1" / f"jobs.backup.pre_repair.jsonl"
TERMINAL = AGENTV1 / "job_state.imported_from_jobs_v1.jsonl"

def jid(obj):
    return str(obj.get("job_id") or obj.get("id") or "")

def ts(obj):
    for k in ("ts_ms","created_at_ms","started_at_ms","ts","created_at","updated_at"):
        try:
            n = int(obj.get(k) or 0)
            if n > 0:
                return n
        except:
            pass
    return 0

def is_runnable_status(obj):
    st = str(obj.get("status") or "").strip().lower()
    if not st:
        return True
    return st in ("queued", "ready", "pending")

def canonical_task(obj):
    return (
        obj.get("selected_task_class")
        or obj.get("task_class")
        or obj.get("kind")
        or (obj.get("meta") or {}).get("selected_task_class")
        or (obj.get("meta") or {}).get("task_class")
        or (obj.get("input") or {}).get("selected_task_class")
        or (obj.get("input") or {}).get("task_class")
        or (obj.get("input") or {}).get("kind")
    )

def canonical_dataset(obj):
    return (
        obj.get("selected_dataset_id")
        or obj.get("dataset_id")
        or (obj.get("meta") or {}).get("selected_dataset_id")
        or (obj.get("meta") or {}).get("dataset_id")
        or (obj.get("input") or {}).get("selected_dataset_id")
        or (obj.get("input") or {}).get("dataset_id")
    )

rows = []
if JOBS.exists():
    for line in JOBS.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except:
            pass

by_id = {}
for obj in rows:
    i = jid(obj)
    if not i:
        continue
    bucket = by_id.setdefault(i, [])
    bucket.append(obj)

repaired_rows = []
terminal_rows = []

for i, items in by_id.items():
    items = sorted(items, key=ts)
    runnable = [x for x in items if is_runnable_status(x)]
    latest = items[-1]

    if runnable:
        seed = runnable[-1].copy()
    else:
        seed = items[0].copy()

    seed["id"] = str(seed.get("id") or seed.get("job_id") or i)
    if "job_id" not in seed:
        seed["job_id"] = i

    task = canonical_task(seed)
    dataset = canonical_dataset(seed)

    if task and not seed.get("selected_task_class"):
        seed["selected_task_class"] = task
    if dataset and not seed.get("selected_dataset_id"):
        seed["selected_dataset_id"] = dataset

    if not seed.get("status") or not is_runnable_status(seed):
        seed["status"] = "queued"

    repaired_rows.append(seed)

    for x in items:
        st = str(x.get("status") or "").strip().lower()
        if st in ("running", "completed", "failed", "error", "done", "cancelled"):
            y = dict(x)
            y["_migrated_from_jobs_v1"] = True
            terminal_rows.append(y)

shutil.copy2(JOBS, BACKUP)

with REPAIRED.open("w") as f:
    for obj in repaired_rows:
        f.write(json.dumps(obj, separators=(",", ":")) + "\n")

with TERMINAL.open("a") as f:
    for obj in terminal_rows:
        f.write(json.dumps(obj, separators=(",", ":")) + "\n")

shutil.move(str(REPAIRED), str(JOBS))

print(f"backup={BACKUP}")
print(f"jobs_rewritten={len(repaired_rows)}")
print(f"terminal_exported={len(terminal_rows)}")
