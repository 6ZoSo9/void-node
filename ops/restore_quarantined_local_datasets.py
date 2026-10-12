#!/usr/bin/env python3
import json
import shutil
from pathlib import Path

ROOT = Path("data_a")
LOCAL = ROOT / "datanet_v1" / "local_jobs"
QUAR = ROOT / "datanet_v1" / "quarantine"
REPORT = ROOT / "datanet_v1" / "stale_local_datasets_restore_report.json"

LOCAL.mkdir(parents=True, exist_ok=True)
QUAR.mkdir(parents=True, exist_ok=True)

moved = []
skipped = []
total = 0

for f in sorted(QUAR.glob("ds_*.txt")):
    total += 1
    dst = LOCAL / f.name
    try:
        if dst.exists():
            skipped.append({
                "dataset_id": f.stem,
                "from": str(f),
                "to": str(dst),
                "reason": "already_exists_in_local_jobs",
            })
            continue
        shutil.move(str(f), str(dst))
        st = dst.stat()
        moved.append({
            "dataset_id": dst.stem,
            "from": str(f),
            "to": str(dst),
            "bytes": int(st.st_size),
            "file_mtime_ms": float(st.st_mtime * 1000.0),
        })
    except Exception as e:
        skipped.append({
            "dataset_id": f.stem,
            "from": str(f),
            "to": str(dst),
            "reason": f"move_failed:{e}",
        })

report = {
    "quarantine_dir": str(QUAR),
    "local_dir": str(LOCAL),
    "seen_total": total,
    "restored_total": len(moved),
    "skipped_total": len(skipped),
    "restored_sample": moved[:100],
    "skipped_sample": skipped[:100],
}
REPORT.write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
