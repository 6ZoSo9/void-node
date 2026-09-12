#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import copy
from pathlib import Path
import sys

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import prove_datanet_v45_full_stack_evidence_composition_v1 as v45


def expect(code: str, obj: dict, head: str, tree: str, actual: dict) -> str:
    try:
        v45.validate_candidate(obj, head, tree, actual)
    except v45.AggregateHold as exc:
        if exc.code != code:
            raise AssertionError((code, exc.code)) from exc
        return exc.code
    raise AssertionError(f"control unexpectedly accepted: {code}")


def reseal(obj: dict) -> dict:
    return v45.seal(obj, "candidate_sha256")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidate", required=True)
    parser.add_argument("--expected-head", required=True)
    parser.add_argument("--expected-tree", required=True)
    parser.add_argument("--output", required=True)
    ns = parser.parse_args()

    candidate = v45.read_json(Path(ns.candidate))
    actual = copy.deepcopy(candidate["input_inventory"])
    v45.validate_candidate(candidate, ns.expected_head, ns.expected_tree, actual)
    first = sorted(actual)[0]

    missing = copy.deepcopy(candidate)
    del missing["input_inventory"][first]
    missing = reseal(missing)

    substituted = copy.deepcopy(candidate)
    substituted["input_inventory"][first]["sha256"] = "0" * 64
    substituted = reseal(substituted)

    mixed = copy.deepcopy(candidate)
    mixed["head"] = "f" * 40
    mixed["source"]["head"] = "f" * 40
    mixed = reseal(mixed)

    premature = copy.deepcopy(candidate)
    premature["mutators_retired"] = False
    premature = reseal(premature)

    rejections = {
        "missing": expect("HOLD_V45_ARTIFACT_MEMBERSHIP", missing, ns.expected_head, ns.expected_tree, actual),
        "substituted": expect("HOLD_V45_ARTIFACT_DIGEST", substituted, ns.expected_head, ns.expected_tree, actual),
        "mixed_head": expect("HOLD_V45_MIXED_HEAD", mixed, ns.expected_head, ns.expected_tree, actual),
        "premature": expect("HOLD_V45_PREMATURE_AGGREGATE", premature, ns.expected_head, ns.expected_tree, actual),
    }
    out = {
        "marker": v45.CONTROLS,
        "status": "GREEN",
        "candidate_sha256": candidate["candidate_sha256"],
        "rejections": rejections,
        "all_rejected": True,
        "production_runtime_touched": False,
    }
    out = v45.seal(out, "controls_sha256")
    Path(ns.output).write_bytes(v45.canon(out))
    print(v45.canon(out).decode(), end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
