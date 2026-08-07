#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

COMPLETE_BLOCKERS = (
    r"Cleared Blocker: first Buy VOID real claim/send is complete",
    r"Cleared Blocker: first Buy VOID real fulfillment closeout is proven",
    r"Cleared Blocker: first Buy VOID real fulfillment closeout is complete",
    r"Buy VOID real fulfillment has been completed and closeout-proven",
    r"Buy VOID has completed its first controlled real-money fulfillment test",
)
PENDING_BLOCKERS = (
    r"Blocker 3: Buy VOID real claim/send is not complete",
    r"Buy VOID real claim/send is not complete",
)
COMPLETE_STATUS = (
    r"First real Buy VOID payment claim and fulfillment have completed successfully",
    r"Buy VOID real fulfillment has been completed and closeout-proven",
    r"Buy VOID has completed its first controlled real-money fulfillment test",
)
PENDING_STATUS = (
    r"Buy VOID real payment claim has not been run",
)


def fail(message: str) -> None:
    raise RuntimeError(message)


def classify(
    text: str,
    complete_patterns: tuple[str, ...],
    pending_patterns: tuple[str, ...],
    label: str,
) -> str:
    complete = any(re.search(pattern, text) for pattern in complete_patterns)
    pending = any(re.search(pattern, text) for pattern in pending_patterns)
    if complete == pending:
        state = "both complete and pending" if complete else "neither complete nor pending"
        fail(f"{label} Buy VOID truth is ambiguous: {state}")
    return "first_real_fulfillment_complete" if complete else "first_real_fulfillment_pending"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--blockers", required=True)
    parser.add_argument("--status", required=True)
    args = parser.parse_args()

    blockers = Path(args.blockers).read_text(encoding="utf-8")
    status = Path(args.status).read_text(encoding="utf-8")
    blockers_state = classify(blockers, COMPLETE_BLOCKERS, PENDING_BLOCKERS, "blockers")
    status_state = classify(status, COMPLETE_STATUS, PENDING_STATUS, "status")
    if blockers_state != status_state:
        fail(
            "Buy VOID truth mismatch: "
            f"blockers={blockers_state} status={status_state}"
        )

    print(f"buy_void_status={blockers_state}")
    print("buy_void_truth_consistent=true")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"HOLD: {error}", file=sys.stderr)
        raise SystemExit(1)
