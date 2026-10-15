#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import pathlib
import re
import socket
import stat
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
V1_PATH = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v1.py"
V2_PATH = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v2.py"

def _load(path: pathlib.Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

v1 = _load(V1_PATH, "void_buy_request_root_runtime_topology_census_v1")
v2 = _load(V2_PATH, "void_buy_request_root_runtime_topology_census_v2")

MARKER = "VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_MACHINE_ID_SHA256 = "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
UNIT = "void-node-live.service"
REQUEST_ENV = "VOID_BUY_REQUEST_DIR"
DEFAULT_RELATIVE = pathlib.Path(".runtime") / "public-buy-void-requests-v1"
REPO_ROOT = pathlib.Path.home() / "dev" / "void-node"
RELEASES_ROOT = pathlib.Path("/opt/void-node-live/releases")
STABLE_ROOT = pathlib.Path("/var/lib/void-buy-request-journal-v1")
HEX40 = re.compile(r"^[0-9a-f]{40}$")
MAX_DIRECT_ENTRIES = 100_000

class CensusError(RuntimeError):
    pass

def _machine_id_sha256() -> str:
    value = v2.machine_id_sha256()
    if value is None:
        raise CensusError("machine_id_unqualified")
    return value

def _service() -> dict[str, Any]:
    code, raw = v1.run_systemctl(
        [
            "show", UNIT, "--no-pager",
            "--property=LoadState", "--property=ActiveState",
            "--property=SubState", "--property=MainPID",
            "--property=WorkingDirectory",
        ],
        user_manager=True,
        allow_failure=True,
    )
    rows: dict[str, str] = {}
    for line in raw.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            rows[key] = value
    pid = int(rows["MainPID"]) if rows.get("MainPID", "").isdigit() else None
    live_cwd = None
    if pid and pid > 1:
        try:
            live_cwd = os.path.realpath(f"/proc/{pid}/cwd")
        except OSError:
            live_cwd = None
    return {
        "status": code,
        "load_state": rows.get("LoadState"),
        "active_state": rows.get("ActiveState"),
        "sub_state": rows.get("SubState"),
        "main_pid": pid,
        "working_directory": rows.get("WorkingDirectory") or None,
        "live_process_cwd": live_cwd,
    }

def _request_root_status(observation: dict[str, Any]) -> dict[str, Any]:
    body = observation.get("body")
    result = {
        "observed": False,
        "source": None,
        "request_dir": None,
    }
    if not isinstance(body, dict):
        return result
    request_dir = body.get("request_dir")
    source = body.get("request_dir_source")
    if (
        observation.get("observed") is not True
        or body.get("marker") != "VOID_BUY_VOID_CONFIRMED_CLOSEOUT_RUNTIME_V1"
        or source not in {"server_default", REQUEST_ENV}
        or not isinstance(request_dir, str)
        or not os.path.isabs(request_dir)
        or os.path.normpath(request_dir) != request_dir
    ):
        return result
    result.update({
        "observed": True,
        "source": source,
        "request_dir": request_dir,
    })
    return result

def _absolute(path: os.PathLike[str] | str) -> str:
    return os.path.abspath(os.path.normpath(str(path)))

def _meta(path: pathlib.Path) -> dict[str, Any]:
    try:
        st = path.lstat()
    except FileNotFoundError:
        return {"exists": False}
    except PermissionError:
        return {"exists": None, "reason": "permission_denied"}
    kind = (
        "directory" if stat.S_ISDIR(st.st_mode)
        else "regular" if stat.S_ISREG(st.st_mode)
        else "symlink" if stat.S_ISLNK(st.st_mode)
        else "other"
    )
    return {
        "exists": True,
        "kind": kind,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "nlink": st.st_nlink,
        "size": st.st_size,
        "dev": st.st_dev,
        "ino": st.st_ino,
        "symlink": stat.S_ISLNK(st.st_mode),
    }

def _ancestor_symlink(path: pathlib.Path) -> bool | None:
    target = pathlib.Path(_absolute(path))
    cursor = pathlib.Path("/")
    for part in target.parts[1:]:
        cursor = cursor / part
        try:
            st = cursor.lstat()
        except FileNotFoundError:
            return False
        except PermissionError:
            return None
        if stat.S_ISLNK(st.st_mode):
            return True
    return False

def _count_only(path: pathlib.Path) -> dict[str, Any]:
    count = 0
    try:
        with os.scandir(path) as entries:
            for _ in entries:
                count += 1
                if count > MAX_DIRECT_ENTRIES:
                    return {"ok": False, "reason": "entry_count_limit_exceeded"}
        return {"ok": True, "count": count}
    except FileNotFoundError:
        return {"ok": False, "reason": "absent"}
    except PermissionError:
        return {"ok": False, "reason": "permission_denied"}
    except OSError as exc:
        return {"ok": False, "reason": f"os_error_{exc.errno}"}

def classify_candidate(path: pathlib.Path, sources: list[str]) -> dict[str, Any]:
    path = pathlib.Path(_absolute(path))
    metadata = _meta(path)
    ancestry = _ancestor_symlink(path)
    result: dict[str, Any] = {
        "path": str(path),
        "sources": sorted(set(sources)),
        "metadata": metadata,
        "symlink_ancestor_observed": ancestry,
        "directory_enumerated_for_count_only": False,
        "directory_entry_names_output": False,
        "request_or_payment_contents_read": False,
        "direct_entry_count": None,
        "other_direct_entry_count": None,
        "fixed_journals": {},
        "classification": None,
    }
    if ancestry is True:
        result["classification"] = "HOLD_SYMLINK_ANCESTOR"
        return result
    if ancestry is None:
        result["classification"] = "UNVERIFIED_ANCESTRY"
        return result
    if metadata.get("exists") is False:
        result["classification"] = "ABSENT_OBSERVED"
        return result
    if metadata.get("exists") is not True:
        result["classification"] = "UNVERIFIED_ROOT"
        return result
    if metadata.get("kind") != "directory" or metadata.get("symlink"):
        result["classification"] = "HOLD_NONCANONICAL_ROOT"
        return result

    counted = _count_only(path)
    result["directory_enumerated_for_count_only"] = True
    if counted.get("ok") is not True:
        result["classification"] = "UNVERIFIED_" + str(counted.get("reason", "COUNT")).upper()
        return result
    result["direct_entry_count"] = counted["count"]

    known = 0
    surviving = False
    uncertain = False
    for name in ("requests.jsonl", "operator-events.jsonl"):
        item = _meta(path / name)
        result["fixed_journals"][name] = {
            "exists": item.get("exists"),
            "kind": item.get("kind"),
            "uid": item.get("uid"),
            "gid": item.get("gid"),
            "mode": item.get("mode"),
            "nlink": item.get("nlink"),
            "size": item.get("size"),
            "symlink": item.get("symlink"),
            "contents_read": False,
        }
        if item.get("exists") is True:
            known += 1
            if item.get("kind") != "regular" or item.get("symlink") or item.get("nlink") != 1:
                uncertain = True
            elif int(item.get("size") or 0) > 0:
                surviving = True
        elif item.get("exists") is None:
            uncertain = True
    other = max(0, int(counted["count"]) - known)
    result["other_direct_entry_count"] = other
    if other > 0:
        surviving = True

    if uncertain:
        result["classification"] = "HOLD_UNVERIFIED_HISTORY_METADATA"
    elif surviving:
        result["classification"] = "SURVIVING_HISTORY_METADATA_OBSERVED"
    elif counted["count"] == 0:
        result["classification"] = "EMPTY_DIRECTORY_OBSERVED_EXTERNAL_ANCHOR_REQUIRED"
    elif known == counted["count"]:
        result["classification"] = "ZERO_LENGTH_FIXED_JOURNALS_OBSERVED_EXTERNAL_ANCHOR_REQUIRED"
    else:
        result["classification"] = "HOLD_UNCLASSIFIED"
    return result

def self_test() -> None:
    import tempfile
    with tempfile.TemporaryDirectory(prefix="void-legacy-root-census-") as td:
        root = pathlib.Path(td)
        empty = root / "empty"
        empty.mkdir()
        e = classify_candidate(empty, ["synthetic"])
        assert e["classification"] == "EMPTY_DIRECTORY_OBSERVED_EXTERNAL_ANCHOR_REQUIRED"
        fixed = root / "fixed"
        fixed.mkdir()
        for name in ("requests.jsonl", "operator-events.jsonl"):
            (fixed / name).write_bytes(b"")
        f = classify_candidate(fixed, ["synthetic"])
        assert f["classification"] == "ZERO_LENGTH_FIXED_JOURNALS_OBSERVED_EXTERNAL_ANCHOR_REQUIRED"
        (fixed / "requests.jsonl").write_bytes(b"x")
        s = classify_candidate(fixed, ["synthetic"])
        assert s["classification"] == "SURVIVING_HISTORY_METADATA_OBSERVED"
    print(MARKER + "_SELF_TEST_GREEN")
    print("empty_metadata_is_not_genesis_proof=true")
    print("zero_length_fixed_journals_are_not_genesis_proof=true")
    print("directory_entry_names_output=false")
    print("request_or_payment_contents_read=false")
    print("historical_request_history_disposition_proven=false")
    print("production_gate_ready=false")

def plan() -> None:
    print(MARKER)
    print("mode=--plan")
    print("read_only=true")
    print("sudo_required=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("external_network_calls=false")
    print("loopback_get_only=true")
    print("process_environment_access=false")
    print("request_or_payment_contents_read=false")
    print("directory_entry_names_output=false")
    print("candidate_set_completeness_proven=false")
    print("historical_request_history_disposition_proven=false")
    print("migration_authorized=false")
    print("production_gate_ready=false")
    print("next_action=RUN_METADATA_ONLY_DESIGNATED_HOST_CENSUS")

def collect() -> dict[str, Any]:
    if os.geteuid() == 0:
        raise CensusError("ordinary_user_required")
    hostname = socket.gethostname()
    machine_sha = _machine_id_sha256()
    service_before = _service()
    process_before = v1.read_process_generation(
        int(service_before.get("main_pid") or 0)
    )
    listener_before = v1.runtime_http_listener_binding(
        int(service_before.get("main_pid") or 0)
    )
    status_before = _request_root_status(
        v1.bounded_local_json(v1.CONFIRMED_CLOSEOUT_STATUS_PATH)
    )

    candidates: dict[str, list[str]] = {}
    def add(path: os.PathLike[str] | str, source: str) -> None:
        candidates.setdefault(_absolute(path), []).append(source)

    add(REPO_ROOT / DEFAULT_RELATIVE, "repo_default")
    if service_before.get("working_directory"):
        add(pathlib.Path(service_before["working_directory"]) / DEFAULT_RELATIVE, "unit_working_directory_default")
    if service_before.get("live_process_cwd"):
        add(pathlib.Path(service_before["live_process_cwd"]) / DEFAULT_RELATIVE, "live_process_cwd_default")
    if (
        status_before.get("observed") is True
        and status_before.get("source") == REQUEST_ENV
        and isinstance(status_before.get("request_dir"), str)
    ):
        add(status_before["request_dir"], "live_status_explicit_request_dir")

    release_inventory_complete = True
    release_count = 0
    try:
        if RELEASES_ROOT.is_dir() and not RELEASES_ROOT.is_symlink():
            for entry in RELEASES_ROOT.iterdir():
                if HEX40.fullmatch(entry.name) and entry.is_dir() and not entry.is_symlink():
                    release_count += 1
                    add(entry / DEFAULT_RELATIVE, "immutable_release_default")
    except PermissionError:
        release_inventory_complete = False

    service_after = _service()
    process_after = v1.read_process_generation(
        int(service_after.get("main_pid") or 0)
    )
    listener_after = v1.runtime_http_listener_binding(
        int(service_after.get("main_pid") or 0)
    )
    status_after = _request_root_status(
        v1.bounded_local_json(v1.CONFIRMED_CLOSEOUT_STATUS_PATH)
    )
    runtime_process_generation_stable = (
        service_before.get("load_state") == "loaded"
        and service_after.get("load_state") == "loaded"
        and service_before.get("active_state") == "active"
        and service_after.get("active_state") == "active"
        and service_before.get("sub_state") == "running"
        and service_after.get("sub_state") == "running"
        and service_before.get("working_directory")
            == service_after.get("working_directory")
        and service_before.get("live_process_cwd")
            == service_after.get("live_process_cwd")
        and process_before.get("observed") is True
        and process_after.get("observed") is True
        and process_before.get("pid") == process_after.get("pid")
        and process_before.get("start_ticks") == process_after.get("start_ticks")
        and process_before.get("cwd") == process_after.get("cwd")
        and process_before.get("exe") == process_after.get("exe")
    )
    runtime_listener_stable = (
        listener_before == listener_after
        and listener_before.get("owned_by_runtime_pid") is True
        and listener_before.get("loopback_listener_observed") is True
    )
    request_root_status_stable = (
        status_before == status_after
        and status_before.get("observed") is True
    )

    add(STABLE_ROOT, "selected_future_stable_root")
    rows = [classify_candidate(pathlib.Path(path), sources) for path, sources in sorted(candidates.items())]
    historical = [row for row in rows if "selected_future_stable_root" not in row["sources"]]
    surviving = [row["path"] for row in historical if row["classification"] == "SURVIVING_HISTORY_METADATA_OBSERVED"]
    unverified = [row["path"] for row in historical if row["classification"].startswith(("HOLD_", "UNVERIFIED_"))]
    empty_shape = [row["path"] for row in historical if "EXTERNAL_ANCHOR_REQUIRED" in row["classification"]]
    absent = [row["path"] for row in historical if row["classification"] == "ABSENT_OBSERVED"]

    candidate_set_complete = (
        release_inventory_complete
        and runtime_process_generation_stable
        and runtime_listener_stable
        and request_root_status_stable
    )
    return {
        "marker": MARKER,
        "version": 1,
        "read_only": True,
        "designated_hostname_matches": hostname == EXPECTED_HOSTNAME,
        "designated_machine_id_matches": machine_sha == EXPECTED_MACHINE_ID_SHA256,
        "service": service_before,
        "process_environment_access": False,
        "external_network_calls": False,
        "loopback_get_only": True,
        "runtime_process_generation_stable": runtime_process_generation_stable,
        "runtime_http_listener_stable": runtime_listener_stable,
        "confirmed_closeout_request_root_status": status_before,
        "confirmed_closeout_request_root_status_stable": request_root_status_stable,
        "immutable_release_count": release_count,
        "immutable_release_inventory_complete": release_inventory_complete,
        "candidate_set_completeness_proven": False,
        "bounded_current_candidate_set_observed": candidate_set_complete,
        "candidate_count": len(rows),
        "candidates": rows,
        "historical_candidate_count": len(historical),
        "surviving_history_metadata_root_count": len(surviving),
        "surviving_history_metadata_roots": surviving,
        "unverified_root_count": len(unverified),
        "unverified_roots": unverified,
        "empty_shape_external_anchor_required_count": len(empty_shape),
        "empty_shape_external_anchor_required_roots": empty_shape,
        "absent_root_count": len(absent),
        "historical_request_history_disposition_proven": False,
        "historical_origin_authenticated": False,
        "filesystem_rollback_prevention_proven": False,
        "migration_authorized": False,
        "request_or_payment_contents_read": False,
        "directory_entry_names_output": False,
        "host_mutation": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "funds_movement": False,
        "production_gate_ready": False,
        "next_action": (
            "REVIEW_SURVIVING_HISTORY_BEFORE_DISPOSITION"
            if surviving or unverified
            else "EXPLICIT_LEGACY_HISTORY_DISPOSITION_AND_EXTERNAL_WITNESS_REQUIRED"
        ),
    }

def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--plan", action="store_true")
    group.add_argument("--run", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if args.plan:
        plan()
        return 0
    result = collect()
    print(MARKER)
    for key in (
        "read_only", "designated_hostname_matches", "designated_machine_id_matches",
        "candidate_set_completeness_proven", "bounded_current_candidate_set_observed",
        "process_environment_access", "external_network_calls", "loopback_get_only",
        "runtime_process_generation_stable", "runtime_http_listener_stable",
        "confirmed_closeout_request_root_status_stable",
        "request_or_payment_contents_read", "directory_entry_names_output",
        "historical_request_history_disposition_proven", "historical_origin_authenticated",
        "filesystem_rollback_prevention_proven", "migration_authorized",
        "host_mutation", "payment_acceptance", "public_presale_activation",
        "funds_movement", "production_gate_ready",
    ):
        value = result[key]
        print(f"{key}={str(value).lower() if isinstance(value, bool) else value}")
    print("historical_candidate_count=" + str(result["historical_candidate_count"]))
    print("surviving_history_metadata_root_count=" + str(result["surviving_history_metadata_root_count"]))
    print("unverified_root_count=" + str(result["unverified_root_count"]))
    print("empty_shape_external_anchor_required_count=" + str(result["empty_shape_external_anchor_required_count"]))
    print("absent_root_count=" + str(result["absent_root_count"]))
    print("next_action=" + result["next_action"])
    print("result_json=" + json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except CensusError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("historical_request_history_disposition_proven=false")
        print("production_gate_ready=false")
        raise SystemExit(2)
