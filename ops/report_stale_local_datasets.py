#!/usr/bin/env python3
import json
import shutil
from pathlib import Path

ROOT = Path("data_a")
LOCAL = ROOT / "datanet_v1" / "local_jobs"
REPORT = ROOT / "datanet_v1" / "stale_local_datasets_report.json"
MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000

rt = {}
try:
    # runtime is in-memory only, so this script uses file mtime as the durable basis
    pass
except:
    pass

rows = []
if LOCAL.exists():
    for f in sorted(LOCAL.glob("ds_*.txt")):
        try:
            st = f.stat()
            mtime_ms = float(st.st_mtime * 1000.0)
            rows.append({
                "dataset_id": f.stem,
                "path": str(f),
                "file_mtime_ms": mtime_ms,
                "stale_for_ms": max(0.0, __import__("time").time() * 1000.0 - mtime_ms),
                "bytes": int(st.st_size),
            })
        except:
            pass

over = [x for x in rows if float(x.get("stale_for_ms") or 0) > MAX_STALE_MS]
over.sort(key=lambda z: float(z.get("stale_for_ms") or 0), reverse=True)

report = {
    "local_dir": str(LOCAL),
    "max_stale_ms": MAX_STALE_MS,
    "total_datasets": len(rows),
    "over_stale_total": len(over),
    "over_stale_sample": over[:100],
}
REPORT.write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
