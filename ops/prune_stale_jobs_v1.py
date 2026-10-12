#!/usr/bin/env python3
import json
import shutil
from pathlib import Path

ROOT = Path("data_a")
JOBS = ROOT / "jobs_v1" / "jobs.jsonl"
BACKUP = ROOT / "jobs_v1" / "jobs.backup.pre_stale_prune.jsonl"
PRUNED = ROOT / "jobs_v1" / "jobs.pruned.jsonl"
REPORT = ROOT / "jobs_v1" / "jobs.stale_prune_report.json"

MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000

def jid(x):
    return str(x.get("job_id") or x.get("id") or "")

def ts(x):
    for k in ("ts_ms","created_at_ms","started_at_ms","ts","created_at","updated_at"):
        try:
            n = int(x.get(k) or 0)
            if n > 0:
                return n
        except:
            pass
    return 0

def plaintext_json(x):
    try:
        t = str(((x.get("input") or {}).get("plaintext")) or "").strip()
        return json.loads(t) if t else {}
    except:
        return {}

def status(x):
    return str(x.get("status") or "").strip().lower()

def task(x):
    return str(
        x.get("selected_task_class")
        or x.get("task_class")
        or x.get("kind")
        or ((x.get("meta") or {}).get("selected_task_class"))
        or ((x.get("meta") or {}).get("task_class"))
        or ((x.get("input") or {}).get("selected_task_class"))
        or ((x.get("input") or {}).get("task_class"))
        or ((x.get("input") or {}).get("kind"))
        or "unknown"
    )

def dataset(x):
    p = plaintext_json(x)
    return (
        x.get("selected_dataset_id")
        or x.get("dataset_id")
        or ((x.get("meta") or {}).get("selected_dataset_id"))
        or ((x.get("meta") or {}).get("dataset_id"))
        or ((x.get("input") or {}).get("selected_dataset_id"))
        or ((x.get("input") or {}).get("dataset_id"))
        or p.get("dataset_id")
    )

def stale(x):
    p = plaintext_json(x)
    try:
        return float(
            x.get("selected_stale_for_ms")
            or x.get("stale_for_ms")
            or ((x.get("meta") or {}).get("selected_stale_for_ms"))
            or ((x.get("meta") or {}).get("stale_for_ms"))
            or ((x.get("input") or {}).get("selected_stale_for_ms"))
            or ((x.get("input") or {}).get("stale_for_ms"))
            or p.get("stale_for_ms")
            or 0
        )
    except:
        return 0.0

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

latest = {}
for x in rows:
    i = jid(x)
    if not i:
        continue
    prev = latest.get(i)
    if prev is None or ts(x) >= ts(prev):
        latest[i] = x

prune_ids = set()
samples = []
for i, x in latest.items():
    st = status(x)
    if st not in ("", "queued", "ready", "pending"):
        continue
    klass = task(x)
    if klass not in ("datanet_fetch_verify", "datanet_redundancy_check"):
        continue
    s = stale(x)
    if s <= MAX_STALE_MS:
        continue
    prune_ids.add(i)
    if len(samples) < 25:
        samples.append({
            "id": i,
            "task": klass,
            "dataset_id": dataset(x),
            "stale_for_ms": s,
            "created_at_ms": x.get("created_at_ms"),
        })

kept = []
removed_rows = 0
for x in rows:
    i = jid(x)
    if i and i in prune_ids:
        removed_rows += 1
        continue
    kept.append(x)

if JOBS.exists():
    shutil.copy2(JOBS, BACKUP)

with PRUNED.open("w") as f:
    for x in kept:
        f.write(json.dumps(x, separators=(",", ":")) + "\n")

shutil.move(str(PRUNED), str(JOBS))

report = {
    "max_stale_ms": MAX_STALE_MS,
    "pruned_job_ids": len(prune_ids),
    "removed_rows": removed_rows,
    "kept_rows": len(kept),
    "samples": samples,
}
REPORT.write_text(json.dumps(report, indent=2))

print(json.dumps(report, indent=2))
