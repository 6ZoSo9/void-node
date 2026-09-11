#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import argparse
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import datanet_v34_campaign_acceptance_v1 as acceptance
import datanet_v34_campaign_modes_v1 as modes
import prove_datanet_v31_campaign_topology_ext4_v1 as v31


def parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=("proof", "contender", "publisher", "classifier", "collector"), default="proof")
    p.add_argument("--root")
    p.add_argument("--root-identity")
    p.add_argument("--lock-identity")
    p.add_argument("--k")
    p.add_argument("--slot", type=int)
    p.add_argument("--ready-fd", type=int)
    p.add_argument("--start-fd", type=int)
    p.add_argument("--event-fd", type=int)
    p.add_argument("--gate-fd", type=int)
    p.add_argument("--hold-fd", type=int)
    p.add_argument("--prior-fd", type=int)
    p.add_argument("--expected-s0-identity")
    p.add_argument("--expected-s0-generation", type=int)
    p.add_argument("--expected-armed-sha256")
    return p


def dispatch(ns) -> int:
    if ns.mode == "proof":
        return acceptance.main_proof()
    for name in ("root", "root_identity", "lock_identity", "k"):
        assert getattr(ns, name) is not None
    if ns.mode == "contender":
        for name in ("slot", "ready_fd", "start_fd", "event_fd", "gate_fd", "hold_fd", "prior_fd"):
            assert getattr(ns, name) is not None
        return modes.contender_mode(ns)
    if ns.mode == "publisher":
        assert ns.hold_fd is not None
        return modes.publisher_mode(ns)
    if ns.mode == "classifier":
        return modes.classifier_mode(ns)
    assert ns.mode == "collector"
    for name in ("expected_s0_identity", "expected_s0_generation", "expected_armed_sha256"):
        assert getattr(ns, name) is not None
    return modes.collector_mode(ns)


if __name__ == "__main__":
    try:
        raise SystemExit(dispatch(parser().parse_args()))
    finally:
        v31.terminate_active()
