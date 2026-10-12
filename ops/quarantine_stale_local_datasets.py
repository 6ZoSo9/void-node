#!/usr/bin/env python3
import json
import shutil
import time
from pathlib import Path

ROOT = Path("data_a")
LOCAL = ROOT / "datanet_v1" / "local_jobs"
QUAR = ROOT / "datanet_v1" / "quarantine"
REPORT = ROOT / "datanet_v1" / "stale_local_datasets_quarantine_report.json"
MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000

now_ms = time.time() * 1000.0
QUAR.mkdir(parents=True, exist_ok=True)

moved = []
kept = 0
total = 0

if LOCAL.exists():
    for f in sorted(LOCAL.glob("ds_*.txt")):
        total += 1
        try:
            st = f.stat()
            mtime_ms = float(st.st_mtime * 1000.0)
            stale_ms = max(0.0, now_ms - mtime_ms)
            if stale_ms > MAX_STALE_MS:
                dst = QUAR / f.name
                shutil.move(str(f), str(dst))
                moved.append({
                    "dataset_id": f.stem,
                    "from": str(f),
                    "to": str(dst),
                    "file_mtime_ms": mtime_ms,
                    "stale_for_ms": stale_ms,
                    "bytes": int(st.st_size),
                })
            else:
                kept += 1
        except:
            kept += 1

report = {
    "local_dir": str(LOCAL),
    "quarantine_dir": str(QUAR),
    "max_stale_ms": MAX_STALE_MS,
    "total_seen": total,
    "moved_total": len(moved),
    "kept_total": kept,
    "moved_sample": moved[:100],
}
REPORT.write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
