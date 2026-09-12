#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
"""Independent downstream admission of the exact Node 22/24/26 V45 artifacts."""
from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import stat
import subprocess
import sys
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json"
PER_NODE_MARKER = "VOID_DATANET_V45_FULL_STACK_EVIDENCE_AGGREGATE_V2_GREEN"
TOP_MARKER = "VOID_DATANET_V45_NODE_22_24_26_TOP_AGGREGATE_V1_GREEN"
NODES = (22, 24, 26)


class MatrixHold(AssertionError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def require(condition: bool, code: str) -> None:
    if not condition:
        raise MatrixHold(code)


def canon(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()


def verify_seal(value: dict, field: str, code: str) -> None:
    claimed = value.get(field)
    body = copy.deepcopy(value)
    body.pop(field, None)
    require(isinstance(claimed, str) and len(claimed) == 64 and digest(canon(body)) == claimed, code)


def seal(value: dict, field: str) -> dict:
    out = copy.deepcopy(value)
    out.pop(field, None)
    out[field] = digest(canon(out))
    return out


def json_bytes(data: bytes, code: str) -> dict:
    try:
        value = json.loads(data.decode("utf-8", errors="strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise MatrixHold(code) from exc
    require(isinstance(value, dict), code)
    return value


def git_text(*args: str) -> str:
    return subprocess.run(args, check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout.strip()


def fingerprint(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_nlink, st.st_uid, st.st_gid,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )


def read_fd_fully(fd: int, expected: int) -> bytes:
    pieces = []
    left = expected
    while left > 0:
        piece = os.read(fd, min(left, 1024 * 1024))
        require(bool(piece), "HOLD_V45_MATRIX_SOURCE_SHORT_READ")
        pieces.append(piece)
        left -= len(piece)
    require(os.read(fd, 1) == b"", "HOLD_V45_MATRIX_SOURCE_SIZE_GROWTH")
    return b"".join(pieces)


def read_one_generation(path: Path) -> tuple[bytes, os.stat_result]:
    require(path.is_absolute() and path.name not in ("", ".", ".."), "HOLD_V45_MATRIX_SOURCE_PATH")
    dflags = os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    fflags = os.O_RDONLY | os.O_CLOEXEC | getattr(os, "O_NOFOLLOW", 0)
    parent = os.open(path.parent, dflags)
    fd = -1
    try:
        parent_key = fingerprint(os.fstat(parent))
        visible = os.stat(path.name, dir_fd=parent, follow_symlinks=False)
        fd = os.open(path.name, fflags, dir_fd=parent)
        before = os.fstat(fd)
        require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1, "HOLD_V45_MATRIX_SOURCE_REGULAR")
        require(fingerprint(visible) == fingerprint(before), "HOLD_V45_MATRIX_SOURCE_OPEN_GENERATION")
        data = read_fd_fully(fd, before.st_size)
        after = os.fstat(fd)
        require(fingerprint(after) == fingerprint(before), "HOLD_V45_MATRIX_SOURCE_CHANGED")
        require(
            fingerprint(os.stat(path.name, dir_fd=parent, follow_symlinks=False)) == fingerprint(after),
            "HOLD_V45_MATRIX_SOURCE_REPLACED",
        )
        require(fingerprint(os.fstat(parent)) == parent_key, "HOLD_V45_MATRIX_SOURCE_PARENT_ABA")
        return data, after
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent)


def current_source() -> dict:
    fixture_bytes, _ = read_one_generation(FIXTURE)
    expected_fixture_blob = git_text(
        "git", "rev-parse",
        "HEAD:fixtures/datanet-v45-v43-v44-full-stack-evidence-composition-ext4-v1.json",
    )
    require(git_blob(fixture_bytes) == expected_fixture_blob, "HOLD_V45_MATRIX_FIXTURE_HEAD_DRIFT")
    cfg = json_bytes(fixture_bytes, "HOLD_V45_MATRIX_FIXTURE")
    paths = cfg.get("source_wall_paths")
    require(isinstance(paths, list) and paths == sorted(set(paths)), "HOLD_V45_MATRIX_SOURCE_WALL_CANONICAL")
    head = git_text("git", "rev-parse", "HEAD")
    tree = git_text("git", "rev-parse", "HEAD^{tree}")
    listing = subprocess.run(["git", "ls-tree", "-r", "--full-tree", "HEAD"], check=True, stdout=subprocess.PIPE).stdout
    tracked = {}
    for line in listing.decode("utf-8", errors="strict").splitlines():
        left, path = line.split("\t", 1)
        mode, kind, blob = left.split()
        tracked[path] = {"mode": mode, "type": kind, "git_blob": blob}
    entries = {}
    for path in paths:
        item = tracked.get(path)
        require(item is not None and item["type"] == "blob", "HOLD_V45_MATRIX_SOURCE_WALL_MEMBER")
        source_path = ROOT / path
        data, source_stat = read_one_generation(source_path)
        require(git_blob(data) == item["git_blob"], "HOLD_V45_MATRIX_SOURCE_WORKTREE_DRIFT")
        worktree_mode = stat.S_IMODE(source_stat.st_mode)
        worktree_git_mode = "100755" if worktree_mode & 0o111 else "100644"
        require(worktree_git_mode == item["mode"], "HOLD_V45_MATRIX_SOURCE_MODE_DRIFT")
        entries[path] = {**item, "worktree_mode": worktree_mode, "bytes": len(data), "sha256": digest(data)}
    return {
        "head": head,
        "tree": tree,
        "recursive_entry_count": len(listing.splitlines()),
        "recursive_listing_sha256": digest(listing),
        "source_wall_paths_sha256": digest(canon({"paths": paths})),
        "source_wall_entry_count": len(entries),
        "source_wall_entries": entries,
        "transitive_source_wall_verified": True,
    }


def request_bytes(url: str, token: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2026-03-10",
            "User-Agent": "void-datanet-v45-cross-runtime-verifier-v1",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def api_object(url: str, token: str, code: str) -> tuple[dict, bytes]:
    raw = request_bytes(url, token)
    return json_bytes(raw, code), raw


def archive_members(data: bytes) -> dict[str, bytes]:
    members = {}
    try:
        with zipfile.ZipFile(io.BytesIO(data), "r") as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                path = PurePosixPath(info.filename)
                require(not path.is_absolute() and ".." not in path.parts and len(path.parts) in (1, 2), "HOLD_V45_MATRIX_ARCHIVE_PATH")
                name = str(path)
                require(name not in members, "HOLD_V45_MATRIX_ARCHIVE_DUPLICATE_MEMBER")
                members[name] = archive.read(info)
    except zipfile.BadZipFile as exc:
        raise MatrixHold("HOLD_V45_MATRIX_ARCHIVE_ZIP") from exc
    require(bool(members), "HOLD_V45_MATRIX_ARCHIVE_EMPTY")
    return members


def normalized_artifact_record(obj: dict) -> dict:
    workflow = obj.get("workflow_run") or {}
    return {
        "id": obj.get("id"),
        "node_id": obj.get("node_id"),
        "name": obj.get("name"),
        "size_in_bytes": obj.get("size_in_bytes"),
        "url": obj.get("url"),
        "archive_download_url": obj.get("archive_download_url"),
        "expired": obj.get("expired"),
        "digest": obj.get("digest"),
        "created_at": obj.get("created_at"),
        "updated_at": obj.get("updated_at"),
        "expires_at": obj.get("expires_at"),
        "workflow_run": {
            "id": workflow.get("id"),
            "head_sha": workflow.get("head_sha"),
            "head_branch": workflow.get("head_branch"),
            "repository_id": workflow.get("repository_id"),
            "head_repository_id": workflow.get("head_repository_id"),
        },
    }


def admit_node_artifact(obj: dict, archive: bytes, node: int, head: str, tree: str, run_id: int, source: dict) -> dict:
    expected_name = f"datanet-v45-full-stack-node-{node}-{head}"
    record = normalized_artifact_record(obj)
    require(record["name"] == expected_name, "HOLD_V45_MATRIX_RUNTIME_LABEL")
    require(isinstance(record["id"], int) and record["id"] > 0, "HOLD_V45_MATRIX_ARTIFACT_ID")
    require(record["expired"] is False, "HOLD_V45_MATRIX_STALE_ARTIFACT")
    require(record["workflow_run"]["id"] == run_id and record["workflow_run"]["head_sha"] == head, "HOLD_V45_MATRIX_STALE_ARTIFACT")
    api_digest = record.get("digest")
    zip_digest = digest(archive)
    require(api_digest == f"sha256:{zip_digest}", "HOLD_V45_MATRIX_ARCHIVE_DIGEST")
    require(record.get("size_in_bytes") == len(archive), "HOLD_V45_MATRIX_ARCHIVE_SIZE")

    members = archive_members(archive)
    aggregate_name = f"datanet-v45-aggregate-{node}.json"
    require(aggregate_name in members, "HOLD_V45_MATRIX_AGGREGATE_MISSING")
    aggregate = json_bytes(members[aggregate_name], "HOLD_V45_MATRIX_AGGREGATE_JSON")
    verify_seal(aggregate, "aggregate_sha256", "HOLD_V45_MATRIX_AGGREGATE_SEAL")
    require(aggregate.get("marker") == PER_NODE_MARKER and aggregate.get("status") == "GREEN", "HOLD_V45_MATRIX_AGGREGATE_MARKER")
    require(aggregate.get("head") == head and aggregate.get("tree") == tree, "HOLD_V45_MATRIX_MIXED_HEAD_TREE")
    require(aggregate.get("node_major") == node and aggregate.get("runtime", {}).get("node_major") == node, "HOLD_V45_MATRIX_RUNTIME_LABEL")
    require(aggregate.get("source") == source and aggregate.get("runtime", {}).get("source") == source, "HOLD_V45_MATRIX_SOURCE_DRIFT")
    require(set(aggregate.get("expected_archive_members", [])) == set(members), "HOLD_V45_MATRIX_ARCHIVE_MEMBERSHIP")
    inventory = aggregate.get("artifact_inventory")
    require(isinstance(inventory, dict) and set(inventory) == set(members) - {aggregate_name}, "HOLD_V45_MATRIX_ARCHIVE_MEMBERSHIP")
    for name, item in inventory.items():
        require(item.get("bytes") == len(members[name]) and item.get("sha256") == digest(members[name]), "HOLD_V45_MATRIX_MEMBER_DIGEST")
    required_true = (
        "artifact_generation_bound", "candidate_generation_aba_control",
        "terminal_generation_aba_control", "producer_substitution_control",
        "source_distinct_terminal_verifier", "transitive_source_wall_verified",
    )
    require(all(aggregate.get(key) is True for key in required_true), "HOLD_V45_MATRIX_PREMATURE_AGGREGATE")
    require(aggregate.get("terminal_verifier_imports_candidate_or_controls") is False, "HOLD_V45_MATRIX_PREMATURE_AGGREGATE")
    require(aggregate.get("full_job_process_census") is False, "HOLD_V45_MATRIX_PROCESS_SCOPE")
    require(aggregate.get("full_campaign_evidence_accepted") is False and aggregate.get("datanet_availability_proved") is False, "HOLD_V45_MATRIX_OVERCLAIM")
    require(aggregate.get("production_runtime_touched") is False, "HOLD_V45_MATRIX_PRODUCTION_TOUCH")

    candidate_name = f"datanet-v45-candidate-{node}.json"
    controls_name = f"datanet-v45-controls-{node}.json"
    producer_name = f"datanet-v45-producer-substitution-control-{node}.json"
    terminal_name = f"datanet-v45-terminal-aba-control-{node}.json"
    for name in (candidate_name, controls_name, producer_name, terminal_name):
        require(name in members, "HOLD_V45_MATRIX_CONTROL_MEMBER")
    candidate = json_bytes(members[candidate_name], "HOLD_V45_MATRIX_CANDIDATE_JSON")
    controls = json_bytes(members[controls_name], "HOLD_V45_MATRIX_CONTROLS_JSON")
    producer = json_bytes(members[producer_name], "HOLD_V45_MATRIX_PRODUCER_JSON")
    terminal = json_bytes(members[terminal_name], "HOLD_V45_MATRIX_TERMINAL_JSON")
    verify_seal(candidate, "candidate_sha256", "HOLD_V45_MATRIX_CANDIDATE_SEAL")
    verify_seal(controls, "controls_sha256", "HOLD_V45_MATRIX_CONTROLS_SEAL")
    verify_seal(producer, "receipt_sha256", "HOLD_V45_MATRIX_PRODUCER_SEAL")
    verify_seal(terminal, "receipt_sha256", "HOLD_V45_MATRIX_TERMINAL_SEAL")
    require(candidate.get("candidate_sha256") == aggregate.get("candidate_sha256") == controls.get("candidate_sha256"), "HOLD_V45_MATRIX_PRODUCER_BINDING")
    require(controls.get("controls_sha256") == aggregate.get("controls_sha256"), "HOLD_V45_MATRIX_PRODUCER_BINDING")

    return {
        "node_major": node,
        "artifact_id": record["id"],
        "artifact_name": record["name"],
        "artifact_api_record_sha256": digest(canon(record)),
        "artifact_api_digest": api_digest,
        "artifact_zip_sha256": zip_digest,
        "artifact_zip_bytes": len(archive),
        "archive_members": sorted(members),
        "archive_members_sha256": digest(canon({"members": sorted(members)})),
        "per_node_aggregate_sha256": aggregate["aggregate_sha256"],
        "source_wall_paths_sha256": source["source_wall_paths_sha256"],
        "source_inventory_sha256": digest(canon(source)),
        "head": head,
        "tree": tree,
        "run_id": run_id,
        "expired": False,
        "ready": True,
    }


def validate_model(rows: list[dict], head: str, tree: str, run_id: int, source_digest: str) -> None:
    nodes = [row.get("node_major") for row in rows]
    require(len(nodes) == len(set(nodes)), "HOLD_V45_MATRIX_DUPLICATE_NODE")
    require(set(nodes) == set(NODES), "HOLD_V45_MATRIX_NODE_SET")
    artifact_ids = [row.get("artifact_id") for row in rows]
    require(len(artifact_ids) == len(set(artifact_ids)), "HOLD_V45_MATRIX_DUPLICATE_ARTIFACT")
    for row in rows:
        node = row["node_major"]
        require(row.get("artifact_name") == f"datanet-v45-full-stack-node-{node}-{head}", "HOLD_V45_MATRIX_RUNTIME_LABEL")
        require(row.get("head") == head and row.get("tree") == tree, "HOLD_V45_MATRIX_MIXED_HEAD_TREE")
        require(row.get("run_id") == run_id and row.get("expired") is False, "HOLD_V45_MATRIX_STALE_ARTIFACT")
        require(row.get("artifact_api_digest") == f"sha256:{row.get('artifact_zip_sha256')}", "HOLD_V45_MATRIX_ARCHIVE_DIGEST")
        require(row.get("source_inventory_sha256") == source_digest, "HOLD_V45_MATRIX_SOURCE_DRIFT")
        require(row.get("ready") is True, "HOLD_V45_MATRIX_PREMATURE_AGGREGATE")


def expect(code: str, rows: list[dict], head: str, tree: str, run_id: int, source_digest: str) -> str:
    try:
        validate_model(rows, head, tree, run_id, source_digest)
    except MatrixHold as exc:
        require(exc.code == code, "HOLD_V45_MATRIX_CONTROL_WRONG_REJECTION")
        return exc.code
    raise MatrixHold("HOLD_V45_MATRIX_CONTROL_ACCEPTED")


def matrix_controls(rows: list[dict], head: str, tree: str, run_id: int, source_digest: str) -> dict:
    missing = copy.deepcopy(rows[:-1])
    duplicate = copy.deepcopy(rows) + [copy.deepcopy(rows[0])]
    substituted = copy.deepcopy(rows)
    substituted[0]["artifact_zip_sha256"] = "0" * 64
    mixed = copy.deepcopy(rows)
    mixed[0]["tree"] = "f" * 40
    mislabeled = copy.deepcopy(rows)
    mislabeled[0]["artifact_name"] = f"datanet-v45-full-stack-node-24-{head}"
    drift = copy.deepcopy(rows)
    drift[0]["source_inventory_sha256"] = "0" * 64
    premature = copy.deepcopy(rows)
    premature[0]["ready"] = False
    stale = copy.deepcopy(rows)
    stale[0]["run_id"] = run_id + 1
    return {
        "missing": expect("HOLD_V45_MATRIX_NODE_SET", missing, head, tree, run_id, source_digest),
        "duplicate": expect("HOLD_V45_MATRIX_DUPLICATE_NODE", duplicate, head, tree, run_id, source_digest),
        "substituted": expect("HOLD_V45_MATRIX_ARCHIVE_DIGEST", substituted, head, tree, run_id, source_digest),
        "mixed_head_tree": expect("HOLD_V45_MATRIX_MIXED_HEAD_TREE", mixed, head, tree, run_id, source_digest),
        "mislabeled_runtime": expect("HOLD_V45_MATRIX_RUNTIME_LABEL", mislabeled, head, tree, run_id, source_digest),
        "source_drift": expect("HOLD_V45_MATRIX_SOURCE_DRIFT", drift, head, tree, run_id, source_digest),
        "premature": expect("HOLD_V45_MATRIX_PREMATURE_AGGREGATE", premature, head, tree, run_id, source_digest),
        "stale": expect("HOLD_V45_MATRIX_STALE_ARTIFACT", stale, head, tree, run_id, source_digest),
    }


def selftest() -> int:
    head, tree, run_id, source_digest = "a" * 40, "b" * 40, 77, "c" * 64
    rows = []
    for index, node in enumerate(NODES, start=1):
        zip_hash = str(index) * 64
        rows.append({
            "node_major": node,
            "artifact_id": index,
            "artifact_name": f"datanet-v45-full-stack-node-{node}-{head}",
            "artifact_api_digest": f"sha256:{zip_hash}",
            "artifact_zip_sha256": zip_hash,
            "source_inventory_sha256": source_digest,
            "head": head,
            "tree": tree,
            "run_id": run_id,
            "expired": False,
            "ready": True,
        })
    validate_model(rows, head, tree, run_id, source_digest)
    controls = matrix_controls(rows, head, tree, run_id, source_digest)
    require(len(controls) == 8, "HOLD_V45_MATRIX_SELFTEST")
    print(json.dumps({"marker": "VOID_DATANET_V45_CROSS_RUNTIME_SELFTEST_V1_GREEN", "controls": controls}, sort_keys=True))
    return 0


def aggregate(ns: argparse.Namespace) -> int:
    token = os.environ.get("GITHUB_TOKEN")
    require(isinstance(token, str) and bool(token), "HOLD_V45_MATRIX_GITHUB_TOKEN")
    source = current_source()
    require(source["head"] == ns.expected_head and source["tree"] == ns.expected_tree, "HOLD_V45_MATRIX_LOCAL_SOURCE")
    base = f"{ns.api_url.rstrip('/')}/repos/{ns.repository}"
    run, run_raw = api_object(f"{base}/actions/runs/{ns.run_id}", token, "HOLD_V45_MATRIX_RUN_API")
    require(run.get("id") == ns.run_id and run.get("head_sha") == ns.expected_head, "HOLD_V45_MATRIX_STALE_RUN")
    require(run.get("event") in ("pull_request", "push"), "HOLD_V45_MATRIX_RUN_EVENT")
    require(run.get("status") in ("in_progress", "completed") and run.get("conclusion") in (None, "success"), "HOLD_V45_MATRIX_RUN_STATUS")

    artifacts = None
    artifacts_raw = b""
    for attempt in range(6):
        artifacts, artifacts_raw = api_object(
            f"{base}/actions/runs/{ns.run_id}/artifacts?per_page=100",
            token,
            "HOLD_V45_MATRIX_ARTIFACT_API",
        )
        rows = artifacts.get("artifacts")
        if isinstance(rows, list) and len(rows) == 3:
            break
        if attempt < 5:
            time.sleep(2)
    require(isinstance(artifacts, dict) and artifacts.get("total_count") == 3, "HOLD_V45_MATRIX_ARTIFACT_COUNT")
    api_rows = artifacts.get("artifacts")
    require(isinstance(api_rows, list) and len(api_rows) == 3, "HOLD_V45_MATRIX_ARTIFACT_COUNT")
    by_name = {item.get("name"): item for item in api_rows if isinstance(item, dict)}
    expected_names = {f"datanet-v45-full-stack-node-{node}-{ns.expected_head}" for node in NODES}
    require(set(by_name) == expected_names, "HOLD_V45_MATRIX_ARTIFACT_NAMES")

    admitted = []
    for node in NODES:
        name = f"datanet-v45-full-stack-node-{node}-{ns.expected_head}"
        item = by_name[name]
        url = item.get("archive_download_url")
        require(isinstance(url, str) and url.startswith("https://"), "HOLD_V45_MATRIX_ARCHIVE_URL")
        archive = request_bytes(url, token)
        admitted.append(admit_node_artifact(item, archive, node, ns.expected_head, ns.expected_tree, ns.run_id, source))

    source_digest = digest(canon(source))
    validate_model(admitted, ns.expected_head, ns.expected_tree, ns.run_id, source_digest)
    controls = matrix_controls(admitted, ns.expected_head, ns.expected_tree, ns.run_id, source_digest)
    out = {
        "marker": TOP_MARKER,
        "status": "GREEN",
        "repository": ns.repository,
        "run_id": ns.run_id,
        "head": ns.expected_head,
        "tree": ns.expected_tree,
        "run_api_response_sha256": digest(run_raw),
        "artifact_list_api_response_sha256": digest(artifacts_raw),
        "source": source,
        "source_inventory_sha256": source_digest,
        "nodes": admitted,
        "node_set": list(NODES),
        "controls": controls,
        "all_cross_runtime_controls_rejected": True,
        "exact_artifact_ids_bound": True,
        "artifact_api_and_zip_digests_bound": True,
        "per_node_membership_and_aggregate_bound": True,
        "node_runtime_labels_bound": True,
        "source_distinct_cross_runtime_verifier": True,
        "v45_full_stack_evidence_composition_accepted": True,
        "full_job_process_census": False,
        "datanet_availability_proved": False,
        "production_runtime_touched": False,
    }
    out = seal(out, "top_aggregate_sha256")
    Path(ns.output).write_bytes(canon(out))
    print(canon(out).decode(), end="")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="mode", required=True)
    sub.add_parser("selftest")
    live = sub.add_parser("aggregate")
    live.add_argument("--repository", required=True)
    live.add_argument("--run-id", type=int, required=True)
    live.add_argument("--api-url", required=True)
    live.add_argument("--expected-head", required=True)
    live.add_argument("--expected-tree", required=True)
    live.add_argument("--output", required=True)
    ns = parser.parse_args()
    return selftest() if ns.mode == "selftest" else aggregate(ns)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except MatrixHold as exc:
        print(json.dumps({"marker": "VOID_DATANET_V45_MATRIX_HOLD", "code": exc.code}, sort_keys=True), file=sys.stderr)
        raise
