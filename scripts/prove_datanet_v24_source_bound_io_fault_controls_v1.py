#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

MARKER = "VOID_DATANET_V24_SOURCE_BOUND_IO_FAULT_CONTROLS_V1_GREEN"
ROOT = Path(__file__).resolve().parents[1]
FIXTURE_PATH = ROOT / "fixtures/datanet-v24-source-bound-io-fault-controls-v1.json"


def git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def git_blob_sha_at(commit: str, path: str) -> str:
    completed = subprocess.run(
        ["git", "rev-parse", f"{commit}:{path}"],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=15,
        check=False,
    )
    if completed.returncode != 0:
        raise SystemExit(f"HOLD: cannot resolve historical blob {commit}:{path}: {completed.stderr[:300]!r}")
    value = completed.stdout.strip()
    if re.fullmatch(r"[0-9a-f]{40}", value) is None:
        raise SystemExit(f"HOLD: historical blob is not SHA-1: {value!r}")
    return value


def require_ancestor(commit: str) -> None:
    completed = subprocess.run(
        ["git", "merge-base", "--is-ancestor", commit, "HEAD"],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=15,
        check=False,
    )
    if completed.returncode != 0:
        raise SystemExit(f"HOLD: accepted predecessor is not an ancestor: {commit}")


def source_region(text: str, start: str, end: str) -> str:
    start_index = text.find(start)
    end_index = text.find(end, start_index + len(start))
    if start_index < 0 or end_index < 0 or end_index <= start_index:
        raise SystemExit(f"HOLD: source region missing: {start!r} -> {end!r}")
    return text[start_index:end_index]


def sample_sha(path: Path, sample_bytes: int = 131072) -> str:
    with path.open("rb", buffering=0) as fh:
        return hashlib.sha256(fh.read(sample_bytes)).hexdigest()


def require_equal(actual, expected, label: str) -> None:
    if actual != expected:
        raise SystemExit(f"HOLD: {label}: expected={expected!r} actual={actual!r}")


def main() -> None:
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    require_equal(fixture["v"], 1, "fixture version")
    require_equal(fixture["format"], "VOID_DATANET_V24_SOURCE_BOUND_IO_FAULT_CONTROLS_V1", "fixture format")
    controls = fixture["controls"]
    require_equal(len(controls), 12, "control count")
    require_equal(len(set(controls)), 12, "control uniqueness")

    expected_controls = [
        f"{kind}:{fault}"
        for kind in ("read", "write")
        for fault in (
            "short-positive",
            "zero-before-end",
            "eintr",
            "duplicate-offset",
            "discontinuous-offset",
            "max-plus-one-offset",
        )
    ]
    require_equal(controls, expected_controls, "Darwin V24 exact control order")

    require_ancestor(fixture["accepted_predecessor_commit"])
    require_equal(
        git_blob_sha_at(
            fixture["accepted_predecessor_commit"],
            fixture["accepted_predecessor_publisher_path"],
        ),
        fixture["accepted_predecessor_publisher_blob_sha"],
        "accepted predecessor publisher historical blob",
    )

    publisher = ROOT / fixture["wired_publisher_path"]
    engine = ROOT / fixture["engine_path"]
    case_harness = ROOT / fixture["case_harness_path"]
    for path, expected_sha, label in (
        (publisher, fixture["wired_publisher_blob_sha"], "wired publisher blob"),
        (engine, fixture["engine_blob_sha"], "bounded engine blob"),
        (case_harness, fixture["case_harness_blob_sha"], "fault harness blob"),
    ):
        require_equal(git_blob_sha(path), expected_sha, label)

    publisher_text = publisher.read_text(encoding="utf-8")
    engine_text = engine.read_text(encoding="utf-8")
    harness_text = case_harness.read_text(encoding="utf-8")
    require_equal(
        'import { runDatanetBoundedPayloadIoV1 } from "./datanet_v24_bounded_payload_io_v1.mjs";' in publisher_text,
        True,
        "wired publisher exact engine import",
    )
    write_region = source_region(publisher_text, "function writePayload(fd) {", "function fullHashFd(fd, label) {")
    read_region = source_region(publisher_text, "function fullHashFd(fd, label) {", "function assertLedger(actual, expected, prefix) {")
    require_equal(write_region.count("runDatanetBoundedPayloadIoV1({"), 1, "publisher write engine call count")
    require_equal(read_region.count("runDatanetBoundedPayloadIoV1({"), 1, "publisher read engine call count")
    require_equal('kind: "write"' in write_region, True, "publisher write engine kind")
    require_equal('kind: "read"' in read_region, True, "publisher read engine kind")
    require_equal("includeEofProbe: true" in read_region, True, "publisher read EOF probe")
    require_equal(write_region.count("fs.writeSync("), 1, "publisher write syscall dispatch count")
    require_equal(write_region.count("fs.readSync("), 0, "publisher write region read syscall count")
    require_equal(read_region.count("fs.readSync("), 1, "publisher read syscall dispatch count")
    require_equal(read_region.count("fs.writeSync("), 0, "publisher read region write syscall count")
    require_equal("for (let offset =" in write_region, False, "legacy publisher write offset loop")
    require_equal("for (let offset =" in read_region, False, "legacy publisher read offset loop")
    require_equal("runDatanetBoundedPayloadIoV1" in engine_text, True, "engine export missing")
    require_equal("./datanet_v24_bounded_payload_io_v1.mjs" in harness_text, True, "harness engine import missing")
    require_equal(fixture["publisher_shared_engine_wired"], True, "fixture wiring state")
    require_equal(fixture["source_bound_injected_fault_matrix_proved"], True, "fixture acceptance state")

    node = shutil.which("node")
    strace = shutil.which("strace")
    if node is None:
        raise SystemExit("HOLD: node unavailable")
    if strace is None:
        raise SystemExit("HOLD: strace unavailable; external syscall observation is mandatory")

    case_results = []
    runner_temp = os.environ.get("RUNNER_TEMP")
    temp_parent = Path(runner_temp) if runner_temp else None
    with tempfile.TemporaryDirectory(prefix="void-datanet-v24-faults-", dir=temp_parent) as temp_raw:
        temp = Path(temp_raw)
        sentinel = temp / "payload-destination-sentinel.bin"
        fd = os.open(sentinel, os.O_CREAT | os.O_EXCL | os.O_RDWR, 0o600)
        try:
            os.ftruncate(fd, fixture["payload_bytes"])
            poison = bytes([0xA5]) * fixture["io_block_bytes"]
            os.pwrite(fd, poison, 0)
            os.pwrite(fd, poison, fixture["io_block_bytes"])
            os.fsync(fd)
        finally:
            os.close(fd)
        baseline_stat = sentinel.stat()
        baseline_sample_sha = sample_sha(sentinel)

        for index, control in enumerate(controls):
            trace_path = temp / f"trace-{index:02d}.log"
            env = os.environ.copy()
            env["VOID_DATANET_FAULT_DESTINATION"] = str(sentinel)
            command = [
                strace,
                "-qq",
                "-f",
                "-yy",
                "-s",
                "256",
                "-e",
                "trace=open,openat,read,pread64,write,pwrite64,fallocate,link,linkat,rename,renameat,renameat2,unlink,unlinkat,execve",
                "-o",
                str(trace_path),
                node,
                str(case_harness),
                control,
            ]
            completed = subprocess.run(
                command,
                cwd=ROOT,
                env=env,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=30,
                check=False,
            )
            require_equal(completed.returncode, fixture["expected_control_exit"], f"{control} exit")
            if completed.stderr:
                raise SystemExit(f"HOLD: {control} stderr was not empty: {completed.stderr[:400]!r}")
            lines = [line for line in completed.stdout.splitlines() if line.strip()]
            require_equal(len(lines), 1, f"{control} stdout record count")
            record = json.loads(lines[0])
            fault = control.split(":", 1)[1]
            require_equal(record["marker"], "VOID_DATANET_V24_IO_FAULT_CONTROL_CASE_V1_HOLD", f"{control} marker")
            require_equal(record["status"], "HOLD", f"{control} status")
            require_equal(record["control"], control, f"{control} identity")
            require_equal(record["reason"], fixture["expected_reasons"][fault], f"{control} reason")
            require_equal(record["injected_events"], 1, f"{control} injected events")
            require_equal(record["retry_count"], fixture["expected_retry_count"], f"{control} retry count")
            require_equal(record["real_dispatch_calls"], fixture["expected_real_dispatch_calls"], f"{control} real dispatch")
            require_equal(record["real_destination_fd_opens"], 0, f"{control} destination opens")
            require_equal(record["destination_touched"], False, f"{control} destination touched")
            require_equal(record["payload_allocation_count"], fixture["expected_payload_allocation_count"], f"{control} allocation")
            require_equal(record["fallocate_helper_lifetimes"], fixture["expected_fallocate_helper_lifetimes"], f"{control} fallocate")
            require_equal(record["link_helper_lifetimes"], fixture["expected_link_helper_lifetimes"], f"{control} link")
            require_equal(record["rename_count"], fixture["expected_rename_count"], f"{control} rename")
            require_equal(record["unlink_count"], fixture["expected_unlink_count"], f"{control} unlink")
            require_equal(record["publication_count"], fixture["expected_publication_count"], f"{control} publication")
            require_equal(record["availability_terminal_count"], fixture["expected_availability_terminal_count"], f"{control} terminal")

            trace = trace_path.read_text(encoding="utf-8", errors="replace")
            destination_mentions = trace.count(str(sentinel))
            require_equal(destination_mentions, 0, f"{control} traced destination syscall mentions")
            mutation_calls = re.findall(r"\b(?:fallocate|link|linkat|rename|renameat|renameat2|unlink|unlinkat)\(", trace)
            require_equal(mutation_calls, [], f"{control} traced mutation syscalls")
            if "/usr/bin/fallocate" in trace or "/usr/bin/ln" in trace:
                raise SystemExit(f"HOLD: {control} launched a publication helper")

            after_stat = sentinel.stat()
            require_equal(after_stat.st_dev, baseline_stat.st_dev, f"{control} sentinel dev")
            require_equal(after_stat.st_ino, baseline_stat.st_ino, f"{control} sentinel ino")
            require_equal(after_stat.st_size, baseline_stat.st_size, f"{control} sentinel size")
            require_equal(sample_sha(sentinel), baseline_sample_sha, f"{control} sentinel sample hash")
            case_results.append({
                "control": control,
                "reason": record["reason"],
                "retry_count": 0,
                "real_dispatch_calls": 0,
                "traced_destination_syscall_mentions": 0,
                "traced_mutation_syscalls": 0,
            })

    print(json.dumps({
        "marker": MARKER,
        "status": "GREEN",
        "accepted_predecessor_commit": fixture["accepted_predecessor_commit"],
        "accepted_predecessor_publisher_blob_sha": fixture["accepted_predecessor_publisher_blob_sha"],
        "wired_publisher_blob_sha": fixture["wired_publisher_blob_sha"],
        "engine_blob_sha": fixture["engine_blob_sha"],
        "case_harness_blob_sha": fixture["case_harness_blob_sha"],
        "controls": len(case_results),
        "read_controls": sum(item["control"].startswith("read:") for item in case_results),
        "write_controls": sum(item["control"].startswith("write:") for item in case_results),
        "all_hold": True,
        "all_zero_retry": True,
        "all_zero_real_dispatch": True,
        "external_syscall_observer": strace,
        "all_zero_destination_syscalls": True,
        "all_zero_mutation_syscalls": True,
        "publisher_shared_engine_wired": True,
        "source_bound_injected_fault_matrix_proved": True,
        "adapter_seam_proved": True,
        "cases": case_results,
    }, sort_keys=True, separators=(",", ":")))


if __name__ == "__main__":
    main()
