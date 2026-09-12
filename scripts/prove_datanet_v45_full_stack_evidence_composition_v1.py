#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CONTROL = ROOT / "fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"
RUNNER = ROOT / "scripts/run_datanet_v45_full_stack_ext4_v1.sh"
PARENT_HEAD = "d73512174afd4f1f0f2591b11ae6bb9955e203ba"
STATIC = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_COMPOSITION_STATIC_V1_GREEN"
RUNTIME = "VOID_DATANET_V45_RUNTIME_INVENTORY_V1_GREEN"
CANDIDATE = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CANDIDATE_V1_GREEN"
AGGREGATE = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_AGGREGATE_V1_GREEN"
CONTROLS = "VOID_DATANET_V45_FULL_STACK_AGGREGATE_CONTROLS_V1_GREEN"


class AggregateHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def hold(condition: bool, code: str) -> None:
    if not condition:
        raise AggregateHold(code)


def canon(obj: dict) -> bytes:
    return (json.dumps(obj, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def git_blob(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_json_lines(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def seal(obj: dict, field: str) -> dict:
    out = copy.deepcopy(obj)
    out.pop(field, None)
    out[field] = sha256_bytes(canon(out))
    return out


def verify_seal(obj: dict, field: str, code: str) -> None:
    want = obj.get(field)
    base = copy.deepcopy(obj)
    base.pop(field, None)
    hold(isinstance(want, str) and len(want) == 64 and sha256_bytes(canon(base)) == want, code)


def load_control() -> dict:
    cfg = read_json(CONTROL)
    hold(cfg.get("v") == 1, "HOLD_V45_CONTROL_VERSION")
    hold(
        cfg.get("format") == "VOID_DATANET_V45_V43_V44_FULL_STACK_EVIDENCE_COMPOSITION_EXT4_CONTROL_V1",
        "HOLD_V45_CONTROL_FORMAT",
    )
    hold(cfg.get("parent_pr") == 1504 and cfg.get("parent_head") == PARENT_HEAD, "HOLD_V45_PARENT_BINDING")
    for rel, expected in sorted(cfg["accepted_v44_blobs"].items()):
        hold(git_blob(ROOT / rel) == expected, "HOLD_V45_ACCEPTED_V44_BLOB")
    return cfg


def run_text(argv: list[str]) -> str:
    return subprocess.run(argv, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def executable_identity(name: str) -> dict:
    path = shutil.which(name)
    hold(path is not None, "HOLD_V45_RUNTIME_EXECUTABLE_MISSING")
    resolved = Path(path).resolve()
    st = resolved.stat()
    hold(stat.S_ISREG(st.st_mode), "HOLD_V45_RUNTIME_EXECUTABLE_NOT_REGULAR")
    return {
        "requested": name,
        "path": str(resolved),
        "bytes": st.st_size,
        "mode": stat.S_IMODE(st.st_mode),
        "uid": st.st_uid,
        "sha256": sha256_file(resolved),
    }


def source_inventory() -> dict:
    head = run_text(["git", "rev-parse", "HEAD"])
    tree = run_text(["git", "rev-parse", "HEAD^{tree}"])
    listing = subprocess.run(
        ["git", "ls-tree", "-r", "--full-tree", "HEAD"],
        check=True,
        stdout=subprocess.PIPE,
    ).stdout
    direct = {}
    for raw in listing.decode("utf-8", errors="strict").splitlines():
        meta, path = raw.split("\t", 1)
        mode, kind, blob = meta.split()
        if re.search(r"datanet[-_]v4[1-5]", path):
            direct[path] = {"mode": mode, "type": kind, "git_blob": blob}
    return {
        "head": head,
        "tree": tree,
        "recursive_entry_count": len(listing.splitlines()),
        "recursive_listing_sha256": sha256_bytes(listing),
        "direct_v41_v45_entries": direct,
    }


RUNTIME_COMMANDS = [
    "git", "bash", "python3", "node", "sudo", "strace", "dd", "mkfs.ext4",
    "tune2fs", "losetup", "blockdev", "dmsetup", "mount", "umount", "cp",
    "cmp", "sha256sum", "sync", "grep", "awk", "findmnt", "mountpoint",
    "jq", "fallocate", "ln",
]


def runtime_inventory(node_major: int) -> dict:
    node_version = run_text(["node", "--version"])
    hold(node_version.lstrip("v").split(".", 1)[0] == str(node_major), "HOLD_V45_NODE_MAJOR")
    return {
        "marker": RUNTIME,
        "status": "GREEN",
        "node_major": node_major,
        "node_version": node_version,
        "python_version": platform.python_version(),
        "kernel": platform.release(),
        "machine": platform.machine(),
        "system": platform.system(),
        "source": source_inventory(),
        "executables": {name: executable_identity(name) for name in RUNTIME_COMMANDS},
        "production_runtime_touched": False,
    }


def static_mode() -> int:
    cfg = load_control()
    claims = cfg["claim"]
    for key in (
        "natural_v43_gate_on_exact_v45_head",
        "v44_corruption_after_v43_recovery_on_same_r0_image",
        "source_distinct_top_verifier_after_mutator_retirement",
        "exact_git_head_and_tree_bound",
        "transitive_source_and_runtime_inventory_bound",
        "ordered_child_receipts_bound",
        "artifact_membership_and_hashes_bound",
        "full_traced_process_and_helper_census",
        "peak_process_concurrency_bounded",
        "loop_mapper_mount_capabilities_released_before_aggregate",
        "missing_substituted_mixed_head_premature_controls",
    ):
        hold(claims.get(key) is True, "HOLD_V45_STATIC_POSITIVE_CLAIM")
    for key in (
        "physical_power_loss_proved",
        "hardware_write_cache_loss_proved",
        "public_peer_retrieval_proved",
        "chain_2050_authority_proved",
        "production_runtime_activation",
    ):
        hold(claims.get(key) is False, "HOLD_V45_STATIC_NONCLAIM")
    subprocess.run(["bash", "-n", str(RUNNER)], check=True)
    out = {
        "marker": STATIC,
        "status": "GREEN",
        "parent_head": PARENT_HEAD,
        "accepted_v44_blob_count": len(cfg["accepted_v44_blobs"]),
        "tiers": cfg["tiers"],
        "ceilings": cfg["ceilings"],
        "production_runtime_touched": False,
    }
    print(canon(out).decode(), end="")
    return 0


def runtime_mode(ns: argparse.Namespace) -> int:
    load_control()
    out = runtime_inventory(ns.node_major)
    Path(ns.output).write_bytes(canon(out))
    print(canon(out).decode(), end="")
    return 0


def expected_inputs(node: int) -> set[str]:
    n = str(node)
    names = {
        f"v41-static-{n}.jsonl",
        f"v42-static-{n}.jsonl",
        f"v43-static-{n}.jsonl",
        f"v44-static-{n}.jsonl",
        f"v45-static-{n}.jsonl",
        f"datanet-v45-runtime-{n}.json",
        f"datanet-v45-process-{n}.trace",
        f"datanet-v45-runner-{n}.stdout.log",
        f"datanet-v45-runner-{n}.stderr.log",
        f"datanet-v43-v41-{n}.stdout.log",
        f"datanet-v43-v41-{n}.stderr.log",
        f"datanet-v43-pre-{n}.json",
        f"datanet-v43-post-{n}.json",
        f"datanet-v43-pre-{n}.jsonl",
        f"datanet-v43-post-{n}.jsonl",
        f"datanet-v43-final-{n}.json",
        f"datanet-v43-final-{n}.jsonl",
        f"datanet-v43-e0-pre-{n}.txt",
        f"datanet-v43-r0-pre-{n}.txt",
        f"datanet-v43-e0-post-{n}.txt",
        f"datanet-v43-r0-post-{n}.txt",
        f"datanet-v43-crash-copy-{n}.txt",
        f"datanet-v43-sources-{n}.txt",
        f"datanet-v45-v44-capture-{n}.json",
        f"datanet-v45-v44-capture-{n}.jsonl",
        f"datanet-v45-v44-corruption-{n}.json",
        f"datanet-v45-v44-corruption-{n}.jsonl",
        f"datanet-v45-v44-final-{n}.json",
        f"datanet-v45-v44-final-{n}.jsonl",
        f"datanet-v45-v44-raw-diff-{n}.txt",
        f"datanet-v45-v44-super-after-{n}.txt",
        f"datanet-v45-v44-loop-{n}.txt",
        f"datanet-v45-capability-release-{n}.json",
    }
    for leaf in ("aggregate.json", "manifest.json", "observer.json", "restart-census.json", "runtime.json"):
        names.add(f"datanet-v43-v41-evidence-{n}/{leaf}")
    return names


def inventory(root: Path, names: set[str]) -> dict:
    actual = {
        str(path.relative_to(root))
        for path in root.rglob("*")
        if path.is_file()
    }
    hold(actual == names, "HOLD_V45_ARTIFACT_MEMBERSHIP")
    out = {}
    for name in sorted(names):
        path = root / name
        out[name] = {"bytes": path.stat().st_size, "sha256": sha256_file(path)}
    return out


def parse_kv(path: Path) -> dict[str, str]:
    out = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line:
            continue
        key, value = line.split("=", 1)
        hold(key not in out, "HOLD_V45_DUPLICATE_RECEIPT_KEY")
        out[key] = value
    return out


def super_state(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="strict")
    features = next((line for line in text.splitlines() if line.startswith("Filesystem features:")), "")
    return {
        "sha256": sha256_bytes(text.encode("utf-8")),
        "needs_recovery": "needs_recovery" in text,
        "verity": "verity" in features.split(),
    }


def last_json(path: Path) -> dict:
    rows = [line for line in path.read_text(encoding="utf-8").splitlines() if line]
    hold(bool(rows), "HOLD_V45_EMPTY_JSON_LOG")
    try:
        return json.loads(rows[-1])
    except json.JSONDecodeError as exc:
        raise AggregateHold("HOLD_V45_LAST_JSON_FORMAT") from exc


def normalize_trace(path: Path) -> list[tuple[int, float, int, str]]:
    pending: dict[tuple[int, str], tuple[int, float, str]] = {}
    records = []
    sequence = 0
    line_re = re.compile(r"^(\d+)\s+([0-9]+(?:\.[0-9]+)?)\s+(.*)$")
    resumed_re = re.compile(r"^<\.\.\.\s+([A-Za-z0-9_]+) resumed>(.*)$")
    for line in path.read_text(encoding="utf-8", errors="strict").splitlines():
        match = line_re.match(line)
        hold(match is not None, "HOLD_V45_TRACE_LINE_FORMAT")
        pid = int(match.group(1))
        timestamp = float(match.group(2))
        body = match.group(3)
        if body.endswith("<unfinished ...>"):
            name = body.split("(", 1)[0].strip()
            pending[(pid, name)] = (
                sequence,
                timestamp,
                body[: -len("<unfinished ...>")].rstrip(),
            )
            sequence += 1
            continue
        resumed = resumed_re.match(body)
        if resumed:
            name = resumed.group(1)
            start = pending.pop((pid, name), None)
            hold(start is not None, "HOLD_V45_TRACE_RESUME_WITHOUT_START")
            start_sequence, start_timestamp, prefix = start
            body = prefix + resumed.group(2)
            records.append((start_sequence, start_timestamp, pid, body))
            sequence += 1
            continue
        records.append((sequence, timestamp, pid, body))
        sequence += 1
    hold(not pending, "HOLD_V45_TRACE_UNFINISHED")
    return sorted(records, key=lambda item: (item[1], item[0]))


def syscall_result(body: str) -> int | None:
    match = re.search(r"\)\s+=\s+(-?\d+)\s*$", body)
    return int(match.group(1)) if match else None


def process_census(path: Path, ceilings: dict) -> dict:
    records = normalize_trace(path)
    hold(bool(records), "HOLD_V45_EMPTY_PROCESS_TRACE")
    root_pid = records[0][2]
    owner: dict[int, int] = {root_pid: root_pid}
    live = {root_pid}
    all_processes = {root_pid}
    peak = 1
    exec_paths: dict[str, int] = {}
    exec_basenames: dict[str, int] = {}
    exec_records: list[str] = []
    mount_success = 0
    umount_success = 0

    for _, _, pid, body in records:
        result = syscall_result(body)
        if body.startswith("execve(") and result == 0:
            match = re.match(r'execve\("([^"]+)"', body)
            hold(match is not None, "HOLD_V45_EXECVE_PATH")
            path_text = match.group(1)
            exec_paths[path_text] = exec_paths.get(path_text, 0) + 1
            base = Path(path_text).name
            exec_basenames[base] = exec_basenames.get(base, 0) + 1
            exec_records.append(body)
        if body.startswith("mount(") and result == 0:
            mount_success += 1
        if body.startswith("umount2(") and result == 0:
            umount_success += 1

        created = False
        threaded = False
        if body.startswith(("fork(", "vfork(", "clone(", "clone3(")) and result is not None and result > 0:
            created = True
            threaded = body.startswith(("clone(", "clone3(")) and "CLONE_THREAD" in body
        if created:
            child = result
            parent_owner = owner.get(pid, pid)
            if threaded:
                owner[child] = parent_owner
            else:
                owner[child] = child
                live.add(child)
                all_processes.add(child)
                peak = max(peak, len(live))

        if body.startswith("exit_group(") or body.startswith("+++ exited with"):
            process = owner.get(pid, pid)
            live.discard(process)

    def contains_count(*needles: str) -> int:
        return sum(1 for row in exec_records if all(needle in row for needle in needles))

    v41_exec_records = [
        row for row in exec_records
        if "prove_datanet_v41_durable_recovery_campaign_ext4_v1.py" in row
    ]
    v41_entry_execs = sum(1 for row in v41_exec_records if '"--mode"' not in row)
    hold(not live, "HOLD_V45_PROCESS_LIFETIME_NOT_CLOSED")
    hold(len(all_processes) <= ceilings["process_lifetimes_max"], "HOLD_V45_PROCESS_LIFETIME_CEILING")
    hold(peak <= ceilings["peak_processes_max"], "HOLD_V45_PROCESS_PEAK_CEILING")
    hold(sum(exec_paths.values()) <= ceilings["successful_execve_max"], "HOLD_V45_EXECVE_CEILING")
    hold(v41_entry_execs == 1, "HOLD_V45_V41_EXEC_CENSUS")
    hold(contains_count("prove_datanet_v42_fsverity_clean_remount_v1.py", "capture") == 2, "HOLD_V45_V42_EXEC_CENSUS")
    hold(contains_count("prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py", "verify") == 1, "HOLD_V45_V43_EXEC_CENSUS")
    hold(contains_count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", "capture") == 1, "HOLD_V45_V44_CAPTURE_CENSUS")
    hold(contains_count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", "corrupt") == 1, "HOLD_V45_V44_CORRUPT_CENSUS")
    hold(contains_count("prove_datanet_v44_fsverity_raw_corruption_detection_v1.py", "verify") == 1, "HOLD_V45_V44_VERIFY_CENSUS")
    hold(contains_count("dmsetup", "suspend", "--noflush") == 2, "HOLD_V45_DM_SUSPEND_CENSUS")
    hold(mount_success >= 7 and umount_success >= 7, "HOLD_V45_MOUNT_CENSUS")

    return {
        "trace_sha256": sha256_file(path),
        "trace_bytes": path.stat().st_size,
        "root_pid": root_pid,
        "process_lifetimes": len(all_processes),
        "peak_processes": peak,
        "successful_execve": sum(exec_paths.values()),
        "exec_paths": dict(sorted(exec_paths.items())),
        "exec_basenames": dict(sorted(exec_basenames.items())),
        "mount_syscalls_success": mount_success,
        "umount2_syscalls_success": umount_success,
        "all_process_lifetimes_closed": True,
        "v41_campaign_entry_execs": 1,
        "v41_campaign_role_execs": len(v41_exec_records),
        "v42_capture_execs": 2,
        "v43_verify_execs": 1,
        "v44_capture_execs": 1,
        "v44_corrupt_execs": 1,
        "v44_verify_execs": 1,
        "dm_suspend_noflush_execs": 2,
    }


def verify_resource_release(receipt: dict) -> dict:
    for key in ("all_images_removed", "all_loops_released", "all_mappers_released", "all_mounts_released"):
        hold(receipt.get(key) is True, "HOLD_V45_CAPABILITY_RELEASE_RECEIPT")
    hold(receipt.get("marker") == "VOID_DATANET_V45_CAPABILITY_RELEASE_V1_GREEN", "HOLD_V45_CAPABILITY_RELEASE_MARKER")
    hold(receipt.get("status") == "GREEN" and receipt.get("production_runtime_touched") is False, "HOLD_V45_CAPABILITY_RELEASE_STATUS")
    token = receipt.get("resource_token")
    hold(isinstance(token, str) and token.startswith("void-v43-"), "HOLD_V45_RESOURCE_TOKEN")
    kernel_text = Path("/proc/self/mountinfo").read_text(encoding="utf-8", errors="strict")
    for path in Path("/sys/block").glob("loop*/loop/backing_file"):
        try:
            kernel_text += "\n" + path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            pass
    for path in Path("/sys/block").glob("dm-*/dm/name"):
        try:
            kernel_text += "\n" + path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            pass
    hold(token not in kernel_text, "HOLD_V45_LIVE_KERNEL_CAPABILITY")
    return {"resource_token": token, "kernel_scan_clear": True, **{k: True for k in (
        "all_images_removed", "all_loops_released", "all_mappers_released", "all_mounts_released"
    )}}


def verify_static_logs(root: Path, node: int) -> None:
    markers = {
        "v41": "VOID_DATANET_V41_FSVERITY_GENERATION_BOUND_RECORD_COMPOSITION_STATIC_V1_GREEN",
        "v42": "VOID_DATANET_V42_FSVERITY_CLEAN_REMOUNT_STATIC_V1_GREEN",
        "v43": "VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_STATIC_V1_GREEN",
        "v44": "VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_STATIC_V1_GREEN",
        "v45": STATIC,
    }
    for version, marker in markers.items():
        row = last_json(root / f"{version}-static-{node}.jsonl")
        hold(row.get("marker") == marker and row.get("status") == "GREEN", "HOLD_V45_STATIC_CHILD")


def verify_tiers(root: Path, node: int, cfg: dict) -> dict:
    verify_static_logs(root, node)
    campaign_out = root / f"datanet-v43-v41-{node}.stdout.log"
    campaign_err = root / f"datanet-v43-v41-{node}.stderr.log"
    runner_out = root / f"datanet-v45-runner-{node}.stdout.log"
    runner_err = root / f"datanet-v45-runner-{node}.stderr.log"
    hold(campaign_err.stat().st_size == 0 and runner_err.stat().st_size == 0, "HOLD_V45_STDERR_NONEMPTY")
    campaign = last_json(campaign_out)
    hold(campaign.get("marker") == "VOID_DATANET_V41_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN", "HOLD_V45_V41_MARKER")
    hold(campaign["payload_ledger"]["calls"] == 15372 and campaign["payload_ledger"]["completed_mib"] == 960, "HOLD_V45_V41_LEDGER")
    hold(campaign["process_topology"]["total_lifetimes"] == 27 and campaign["process_topology"]["peak_live"] == 9, "HOLD_V45_V41_TOPOLOGY")
    hold(campaign.get("fsverity_record_immutability") is True and campaign.get("production_runtime_touched") is False, "HOLD_V45_V41_STATUS")
    runner = last_json(runner_out)
    hold(runner.get("marker") == "VOID_DATANET_V45_V43_V44_FULL_STACK_RUN_V1_GREEN", "HOLD_V45_RUNNER_MARKER")

    ev = root / f"datanet-v43-v41-evidence-{node}"
    hold({p.name for p in ev.iterdir() if p.is_file()} == {"aggregate.json", "manifest.json", "observer.json", "restart-census.json", "runtime.json"}, "HOLD_V45_V41_EVIDENCE_MEMBERS")
    v41_manifest = read_json(ev / "manifest.json")
    restart = read_json(ev / "restart-census.json")
    hold(len(restart["e0"]["entries"]) == cfg["ceilings"]["e0_namespace_entries"], "HOLD_V45_E0_NAMESPACE_CEILING")
    hold(len(restart["r0"]["entries"]) == cfg["ceilings"]["r0_namespace_entries"], "HOLD_V45_R0_NAMESPACE_CEILING")

    pre_path = root / f"datanet-v43-pre-{node}.json"
    post_path = root / f"datanet-v43-post-{node}.json"
    hold(pre_path.read_bytes() == post_path.read_bytes(), "HOLD_V45_V43_PRE_POST_SNAPSHOT")
    snapshot = read_json(post_path)
    hold(snapshot.get("marker") == "VOID_DATANET_V42_FSVERITY_REMOUNT_SNAPSHOT_V1_GREEN", "HOLD_V45_V42_SNAPSHOT")
    hold(snapshot.get("payload_leaves_verified") == 3 and snapshot.get("recovery_records_verified") == 3, "HOLD_V45_V42_LEAF_COUNT")
    hold(set(snapshot["records"]) == {"armed", "claimed", "closed"}, "HOLD_V45_RECORD_SET")
    for item in snapshot["records"].values():
        hold(item["bytes"] <= cfg["ceilings"]["recovery_record_max_bytes"], "HOLD_V45_RECORD_BYTE_CEILING")

    v43_file = root / f"datanet-v43-final-{node}.json"
    hold(v43_file.read_bytes() == (root / f"datanet-v43-final-{node}.jsonl").read_bytes(), "HOLD_V45_V43_FINAL_DUPLICATE")
    v43 = read_json(v43_file)
    for key in (
        "simulated_sudden_device_loss_proved", "device_mapper_suspend_noflush",
        "snapshot_before_clean_unmount", "crash_image_needs_recovery_pre_replay",
        "same_mapper_device_identity_recreated", "journal_replay_recovery_completed",
        "pre_post_v42_snapshot_equal", "record_inode_generation_stable",
        "record_fsverity_digest_stable", "fresh_v41_admission_after_recovery",
        "same_uid_inplace_mutation_denied_after_recovery",
    ):
        hold(v43.get(key) is True, "HOLD_V45_V43_CLAIM")
    hold(v43.get("physical_power_loss_proved") is False and v43.get("production_runtime_touched") is False, "HOLD_V45_V43_NONCLAIM")

    e0_pre = super_state(root / f"datanet-v43-e0-pre-{node}.txt")
    r0_pre = super_state(root / f"datanet-v43-r0-pre-{node}.txt")
    e0_post = super_state(root / f"datanet-v43-e0-post-{node}.txt")
    r0_post = super_state(root / f"datanet-v43-r0-post-{node}.txt")
    hold(e0_pre["needs_recovery"] and r0_pre["needs_recovery"], "HOLD_V45_V43_NEEDS_RECOVERY_PRE")
    hold(not e0_post["needs_recovery"] and not r0_post["needs_recovery"], "HOLD_V45_V43_NEEDS_RECOVERY_POST")
    hold(all(x["verity"] for x in (e0_pre, r0_pre, e0_post, r0_post)), "HOLD_V45_V43_VERITY_FEATURE")

    crash = parse_kv(root / f"datanet-v43-crash-copy-{node}.txt")
    hold(crash["e0_source_sha256"] == crash["e0_crash_sha256"], "HOLD_V45_E0_CRASH_COPY")
    hold(crash["r0_source_sha256"] == crash["r0_crash_sha256"], "HOLD_V45_R0_CRASH_COPY")
    sources = parse_kv(root / f"datanet-v43-sources-{node}.txt")
    hold(sources["e0_before"] == sources["e0_after"] and sources["r0_before"] == sources["r0_after"], "HOLD_V45_MAPPER_SOURCE_STABILITY")
    hold(sources["e0_dm_before"] == sources["e0_dm_after"] and sources["r0_dm_before"] == sources["r0_dm_after"], "HOLD_V45_MAPPER_IDENTITY_STABILITY")

    capture_path = root / f"datanet-v45-v44-capture-{node}.json"
    capture = read_json(capture_path)
    verify_seal(capture, "manifest_sha256", "HOLD_V45_V44_CAPTURE_SELF_HASH")
    hold(capture.get("marker") == "VOID_DATANET_V44_FSVERITY_RAW_PREIMAGE_CAPTURE_V1_GREEN", "HOLD_V45_V44_CAPTURE_MARKER")
    hold(capture.get("raw_preimage_matches_sealed_record") is True and capture.get("fiemap_sync_flag_used") is False, "HOLD_V45_V44_PREIMAGE")
    closed = snapshot["records"]["closed"]
    hold(capture["record_identity"] == closed["identity"], "HOLD_V45_V43_V44_RECORD_IDENTITY")
    hold(capture["record_generation"] == closed["generation"], "HOLD_V45_V43_V44_RECORD_GENERATION")
    hold(capture["record_sha256"] == closed["sha256"], "HOLD_V45_V43_V44_RECORD_SHA256")
    hold(capture["fsverity"] == closed["fsverity"], "HOLD_V45_V43_V44_FSVERITY")

    corruption_path = root / f"datanet-v45-v44-corruption-{node}.json"
    corruption_log = root / f"datanet-v45-v44-corruption-{node}.jsonl"
    hold(corruption_path.read_bytes() == corruption_log.read_bytes(), "HOLD_V45_V44_CORRUPTION_DUPLICATE")
    corruption = read_json(corruption_path)
    hold(corruption["manifest_sha256"] == capture["manifest_sha256"], "HOLD_V45_V44_CORRUPTION_BINDING")
    hold(corruption["bytes_written"] == cfg["ceilings"]["raw_corruption_bytes"], "HOLD_V45_RAW_BYTE_CEILING")
    hold(corruption["before_hex"] == "7b" and corruption["after_hex"] == "7a" and corruption["xor_mask"] == 1, "HOLD_V45_RAW_BYTE_VALUE")
    fields = (root / f"datanet-v45-v44-raw-diff-{node}.txt").read_text(encoding="utf-8").split()
    hold(len(fields) == 3, "HOLD_V45_RAW_DIFF_CARDINALITY")
    hold(int(fields[0]) == corruption["physical_offset"] + 1, "HOLD_V45_RAW_DIFF_OFFSET")
    hold(int(fields[1], 8) == int(corruption["before_hex"], 16), "HOLD_V45_RAW_DIFF_BEFORE")
    hold(int(fields[2], 8) == int(corruption["after_hex"], 16), "HOLD_V45_RAW_DIFF_AFTER")

    final_path = root / f"datanet-v45-v44-final-{node}.json"
    hold(final_path.read_bytes() == (root / f"datanet-v45-v44-final-{node}.jsonl").read_bytes(), "HOLD_V45_V44_FINAL_DUPLICATE")
    v44 = read_json(final_path)
    for key in (
        "record_identity_stable", "record_generation_stable", "record_metadata_stable",
        "fsverity_root_digest_stable", "fsverity_data_read_eio",
        "actual_v41_admission_fails_on_corrupted_record", "same_uid_write_denied",
        "same_uid_rdwr_denied", "same_uid_truncate_denied",
    ):
        hold(v44.get(key) is True, "HOLD_V45_V44_CLAIM")
    hold(v44.get("fsverity_data_read_errno") == 5 and v44.get("actual_v41_admission_errno") == 5, "HOLD_V45_V44_EIO")
    hold(v44.get("physical_power_loss_proved") is False and v44.get("production_runtime_touched") is False, "HOLD_V45_V44_NONCLAIM")
    v44_super = super_state(root / f"datanet-v45-v44-super-after-{node}.txt")
    hold(v44_super["verity"] and not v44_super["needs_recovery"], "HOLD_V45_V44_SUPER_STATE")
    loop = parse_kv(root / f"datanet-v45-v44-loop-{node}.txt")
    hold(loop["offset"] == "0" and loop["sizelimit"] == "0", "HOLD_V45_V44_LOOP_GEOMETRY")
    dm_fields = loop["dm_table"].split()
    hold(
        loop["dm_name"].startswith(f"void-v43-r0-{node}-")
        and len(dm_fields) >= 5
        and dm_fields[0] == "0"
        and dm_fields[2] == "linear"
        and dm_fields[4] == "0",
        "HOLD_V45_V44_DM_GEOMETRY",
    )

    return {
        "ordered_markers": [
            campaign["marker"],
            snapshot["marker"],
            v43["marker"],
            capture["marker"],
            corruption["marker"],
            v44["marker"],
        ],
        "v41": {
            "total_lifetimes": 27,
            "peak_live": 9,
            "payload_calls": 15372,
            "completed_mib": 960,
            "source_bindings": v41_manifest["source_bindings"],
        },
        "v43": {
            "snapshot_sha256": v43["snapshot_sha256"],
            "journal_replay_recovery_completed": True,
            "record_fsverity_digest_stable": True,
        },
        "v44": {
            "manifest_sha256": capture["manifest_sha256"],
            "record_identity": capture["record_identity"],
            "record_generation": capture["record_generation"],
            "record_sha256": capture["record_sha256"],
            "fsverity": capture["fsverity"],
            "raw_mutation_bytes": 1,
            "direct_read_errno": 5,
            "v41_admission_errno": 5,
        },
        "same_recovered_r0_record_composed": True,
    }


def validate_candidate(obj: dict, expected_head: str, expected_tree: str, actual_inventory: dict) -> None:
    verify_seal(obj, "candidate_sha256", "HOLD_V45_CANDIDATE_SELF_HASH")
    hold(obj.get("head") == expected_head and obj.get("source", {}).get("head") == expected_head, "HOLD_V45_MIXED_HEAD")
    hold(obj.get("tree") == expected_tree and obj.get("source", {}).get("tree") == expected_tree, "HOLD_V45_MIXED_TREE")
    hold(obj.get("mutators_retired") is True and obj.get("capabilities_released") is True, "HOLD_V45_PREMATURE_AGGREGATE")
    hold(set(obj.get("input_inventory", {})) == set(actual_inventory), "HOLD_V45_ARTIFACT_MEMBERSHIP")
    for name, receipt in actual_inventory.items():
        claimed = obj["input_inventory"].get(name)
        hold(claimed == receipt, "HOLD_V45_ARTIFACT_DIGEST")
    hold(obj.get("production_runtime_touched") is False, "HOLD_V45_PRODUCTION_TOUCH")


def candidate_mode(ns: argparse.Namespace) -> int:
    cfg = load_control()
    root = Path(ns.evidence_root).resolve()
    names = expected_inputs(ns.node_major)
    inv = inventory(root, names)
    runtime_path = root / f"datanet-v45-runtime-{ns.node_major}.json"
    runtime = read_json(runtime_path)
    live_runtime = runtime_inventory(ns.node_major)
    hold(runtime == live_runtime, "HOLD_V45_RUNTIME_CHANGED")
    hold(runtime["source"]["head"] == ns.expected_head and runtime["source"]["tree"] == ns.expected_tree, "HOLD_V45_RUNTIME_SOURCE_BINDING")
    tiers = verify_tiers(root, ns.node_major, cfg)
    process = process_census(root / f"datanet-v45-process-{ns.node_major}.trace", cfg["ceilings"])
    release = verify_resource_release(read_json(root / f"datanet-v45-capability-release-{ns.node_major}.json"))
    source = source_inventory()
    hold(source["head"] == ns.expected_head and source["tree"] == ns.expected_tree, "HOLD_V45_SOURCE_BINDING")
    obj = {
        "marker": CANDIDATE,
        "status": "GREEN",
        "head": ns.expected_head,
        "tree": ns.expected_tree,
        "parent_head": PARENT_HEAD,
        "node_major": ns.node_major,
        "source": source,
        "runtime": runtime,
        "tiers": tiers,
        "process_census": process,
        "capability_release": release,
        "mutators_retired": True,
        "capabilities_released": True,
        "input_inventory": inv,
        "nonclaims": {
            "physical_power_loss_proved": False,
            "hardware_write_cache_loss_proved": False,
            "public_peer_retrieval_proved": False,
            "chain_2050_authority_proved": False,
        },
        "production_runtime_touched": False,
    }
    obj = seal(obj, "candidate_sha256")
    validate_candidate(obj, ns.expected_head, ns.expected_tree, inv)
    Path(ns.output).write_bytes(canon(obj))
    print(canon(obj).decode(), end="")
    return 0


def controls_receipt(path: Path) -> dict:
    obj = read_json(path)
    verify_seal(obj, "controls_sha256", "HOLD_V45_CONTROLS_SELF_HASH")
    hold(obj.get("marker") == CONTROLS and obj.get("status") == "GREEN", "HOLD_V45_CONTROLS_MARKER")
    expected = {
        "missing": "HOLD_V45_ARTIFACT_MEMBERSHIP",
        "substituted": "HOLD_V45_ARTIFACT_DIGEST",
        "mixed_head": "HOLD_V45_MIXED_HEAD",
        "premature": "HOLD_V45_PREMATURE_AGGREGATE",
    }
    hold(obj.get("rejections") == expected and obj.get("all_rejected") is True, "HOLD_V45_CONTROLS_RESULT")
    return obj


def finalize_mode(ns: argparse.Namespace) -> int:
    load_control()
    root = Path(ns.evidence_root).resolve()
    candidate_path = Path(ns.candidate).resolve()
    controls_path = Path(ns.controls).resolve()
    candidate = read_json(candidate_path)
    original_names = expected_inputs(ns.node_major)
    original_inv = inventory(root, original_names | {candidate_path.name, controls_path.name})
    base_inv = {name: original_inv[name] for name in original_names}
    validate_candidate(candidate, ns.expected_head, ns.expected_tree, base_inv)
    controls = controls_receipt(controls_path)
    hold(controls.get("candidate_sha256") == candidate["candidate_sha256"], "HOLD_V45_CONTROLS_CANDIDATE_BINDING")
    release = verify_resource_release(read_json(root / f"datanet-v45-capability-release-{ns.node_major}.json"))
    out = {
        "marker": AGGREGATE,
        "status": "GREEN",
        "head": ns.expected_head,
        "tree": ns.expected_tree,
        "parent_head": PARENT_HEAD,
        "node_major": ns.node_major,
        "candidate_sha256": candidate["candidate_sha256"],
        "controls_sha256": controls["controls_sha256"],
        "source": candidate["source"],
        "runtime": candidate["runtime"],
        "tiers": candidate["tiers"],
        "process_census": candidate["process_census"],
        "capability_release": release,
        "artifact_inventory": original_inv,
        "expected_archive_members": sorted(set(original_inv) | {Path(ns.output).name}),
        "mutators_retired_before_source_distinct_aggregate": True,
        "missing_substituted_mixed_head_premature_controls": True,
        "physical_power_loss_proved": False,
        "hardware_write_cache_loss_proved": False,
        "public_peer_retrieval_proved": False,
        "chain_2050_authority_proved": False,
        "production_runtime_touched": False,
    }
    out = seal(out, "aggregate_sha256")
    Path(ns.output).write_bytes(canon(out))
    print(canon(out).decode(), end="")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("static")
    rt = sub.add_parser("runtime")
    rt.add_argument("--node-major", type=int, required=True, choices=(22, 24, 26))
    rt.add_argument("--output", required=True)
    for mode in ("candidate", "finalize"):
        p = sub.add_parser(mode)
        p.add_argument("--node-major", type=int, required=True, choices=(22, 24, 26))
        p.add_argument("--evidence-root", required=True)
        p.add_argument("--expected-head", required=True)
        p.add_argument("--expected-tree", required=True)
        p.add_argument("--output", required=True)
        if mode == "finalize":
            p.add_argument("--candidate", required=True)
            p.add_argument("--controls", required=True)
    ns = parser.parse_args()
    if ns.mode == "static":
        return static_mode()
    if ns.mode == "runtime":
        return runtime_mode(ns)
    if ns.mode == "candidate":
        return candidate_mode(ns)
    return finalize_mode(ns)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AggregateHold as exc:
        print(json.dumps({"marker": "VOID_DATANET_V45_HOLD", "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise
