#!/usr/bin/env python3
"""Retired V1 preparation: use the separately reviewed, exact-source V2 tool.

Corrected V1 observations cannot become a fresh V2 aggregate. No mutation.
"""
import json

if __name__ == "__main__":
    print(json.dumps({"marker": "VOID_PRECISION_WEB_PREPARATION_V1", "result": "HOLD",
        "reason": "V1 retired; use reviewed prepare_void_precision_web_recovery_v2.py with its full source head",
        "installed": False, "service_changed": False, "funnel_changed": False, "dns_changed": False}))
    raise SystemExit(2)
