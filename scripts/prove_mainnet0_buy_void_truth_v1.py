#!/usr/bin/env python3
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / "scripts" / "classify_mainnet0_buy_void_truth_v1.py"
BLOCKER_PROOF = ROOT / "ops" / "mainnet" / "mainnet0-blockers-proof.sh"


def run_case(blockers: str, status: str) -> subprocess.CompletedProcess[str]:
    with tempfile.TemporaryDirectory(prefix="void-mainnet0-buy-truth-") as tmp:
        root = Path(tmp)
        blockers_path = root / "blockers.md"
        status_path = root / "status.md"
        blockers_path.write_text(blockers, encoding="utf-8")
        status_path.write_text(status, encoding="utf-8")
        return subprocess.run(
            [
                sys.executable,
                str(HELPER),
                "--blockers",
                str(blockers_path),
                "--status",
                str(status_path),
            ],
            text=True,
            capture_output=True,
            check=False,
        )


complete = run_case(
    "## Cleared Blocker: first Buy VOID real fulfillment closeout is complete\n",
    "First real Buy VOID payment claim and fulfillment have completed successfully.\n",
)
assert complete.returncode == 0, complete.stderr
assert "buy_void_status=first_real_fulfillment_complete" in complete.stdout

pending = run_case(
    "Blocker 3: Buy VOID real claim/send is not complete\n",
    "Buy VOID real payment claim has not been run\n",
)
assert pending.returncode == 0, pending.stderr
assert "buy_void_status=first_real_fulfillment_pending" in pending.stdout

mismatch = run_case(
    "## Cleared Blocker: first Buy VOID real fulfillment closeout is complete\n",
    "Buy VOID real payment claim has not been run\n",
)
assert mismatch.returncode != 0
assert "truth mismatch" in mismatch.stderr

contradictory = run_case(
    "\n".join(
        [
            "## Cleared Blocker: first Buy VOID real fulfillment closeout is complete",
            "Buy VOID real claim/send is not complete",
        ]
    ),
    "First real Buy VOID payment claim and fulfillment have completed successfully.\n",
)
assert contradictory.returncode != 0
assert "ambiguous" in contradictory.stderr

missing = run_case("no buy state\n", "no buy state\n")
assert missing.returncode != 0
assert "ambiguous" in missing.stderr

source = BLOCKER_PROOF.read_text(encoding="utf-8")
assert "classify_mainnet0_buy_void_truth_v1.py" in source
assert '"buy_void_status": buy_void_status' in source
assert '"buy_void_status": "first_real_fulfillment_complete"' not in source

print("complete_state_classified=true")
print("pending_state_classified=true")
print("cross_file_mismatch_rejected=true")
print("contradictory_state_rejected=true")
print("missing_state_rejected=true")
print("hardcoded_complete_summary=false")
print("VOID_MAINNET0_BUY_VOID_TRUTH_V1_PROOF_GREEN")
