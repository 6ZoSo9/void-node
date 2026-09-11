#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from datanet_v30_campaign_roles_v1 import *
from datanet_v30_campaign_runtime_io_v1 import terminate_active
from datanet_v30_campaign_proof_v1 import main_proof

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("proof", "contender", "publisher", "classifier", "collector"), default="proof")
    parser.add_argument("--root")
    parser.add_argument("--root-identity")
    parser.add_argument("--lock-identity")
    parser.add_argument("--k")
    parser.add_argument("--slot", type=int)
    parser.add_argument("--ready-fd", type=int)
    parser.add_argument("--start-fd", type=int)
    parser.add_argument("--event-fd", type=int)
    parser.add_argument("--gate-fd", type=int)
    parser.add_argument("--hold-fd", type=int)
    parser.add_argument("--expected-s0-identity")
    return parser


def dispatch(ns: argparse.Namespace) -> int:
    if ns.mode == "proof":
        return main_proof()
    for name in ("root", "root_identity", "lock_identity", "k"):
        assert getattr(ns, name) is not None, f"--{name.replace('_', '-')} required"
    if ns.mode == "contender":
        for name in ("slot", "ready_fd", "start_fd", "event_fd", "gate_fd", "hold_fd"):
            assert getattr(ns, name) is not None, f"--{name.replace('_', '-')} required"
        return contender_mode(ns)
    if ns.mode == "publisher":
        assert ns.hold_fd is not None
        return publisher_mode(ns)
    if ns.mode == "classifier":
        return classifier_mode(ns)
    if ns.mode == "collector":
        assert ns.expected_s0_identity is not None
        return collector_mode(ns)
    raise AssertionError(ns.mode)


if __name__ == "__main__":
    try:
        raise SystemExit(dispatch(build_parser().parse_args()))
    finally:
        terminate_active()
