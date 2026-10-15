#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import pwd
import re
import socket
import stat
import types
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[2]
V1_PATH = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v1.py"
V2_PATH = ROOT / "ops/precision/void_buy_request_root_runtime_topology_census_v2.py"
AUTH_QUERY_PATH = (
    ROOT / "ops/precision/void_buy_void_user_manager_query_live_qualification_v1.py"
)
DEPENDENCY_BLOBS = {
    V1_PATH: "9ca9cb948a08973d0d874c5473ad2743de14140c",
    V2_PATH: "305737478025e22ddc8f56da29f2a2dfde251d8b",
    AUTH_QUERY_PATH: "e0d3a583030a5465cc793f740c04f4b33f84eba6",
}
MAX_DEPENDENCY_SOURCE_BYTES = 2 * 1024 * 1024


class CensusError(RuntimeError):
    pass


def _same_stat(a: os.stat_result, b: os.stat_result) -> bool:
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_mode == b.st_mode
        and a.st_nlink == b.st_nlink
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
    )


def _git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def _authenticated_source_bytes(path: pathlib.Path) -> bytes:
    try:
        visible_before = path.lstat()
    except OSError as exc:
        raise CensusError("dependency_source_unavailable:" + path.name) from exc
    if (
        not stat.S_ISREG(visible_before.st_mode)
        or stat.S_ISLNK(visible_before.st_mode)
        or visible_before.st_nlink != 1
        or visible_before.st_size < 1
        or visible_before.st_size > MAX_DEPENDENCY_SOURCE_BYTES
    ):
        raise CensusError("dependency_source_metadata_invalid:" + path.name)
    try:
        fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    except OSError as exc:
        raise CensusError("dependency_source_open_failed:" + path.name) from exc
    try:
        opened_before = os.fstat(fd)
        if not _same_stat(visible_before, opened_before):
            raise CensusError("dependency_source_rebound:" + path.name)
        remaining = visible_before.st_size
        chunks: list[bytes] = []
        while remaining:
            chunk = os.read(fd, min(256 * 1024, remaining))
            if not chunk:
                raise CensusError("dependency_source_short_read:" + path.name)
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise CensusError("dependency_source_grew:" + path.name)
        opened_after = os.fstat(fd)
        visible_after = path.lstat()
        if (
            not _same_stat(opened_before, opened_after)
            or not _same_stat(opened_after, visible_after)
        ):
            raise CensusError("dependency_source_changed:" + path.name)
    finally:
        os.close(fd)
    return b"".join(chunks)


def _load_authenticated(path: pathlib.Path, name: str):
    raw = _authenticated_source_bytes(path)
    expected = DEPENDENCY_BLOBS[path]
    if _git_blob_sha1(raw) != expected:
        raise CensusError("dependency_source_blob_mismatch:" + path.name)
    module = types.ModuleType(name)
    module.__file__ = str(path)
    module.__package__ = ""
    try:
        code = compile(raw, str(path), "exec", dont_inherit=True)
        exec(code, module.__dict__)
    except Exception as exc:
        raise CensusError("dependency_source_execution_failed:" + path.name) from exc
    return module


v1 = _load_authenticated(V1_PATH, "void_buy_request_root_runtime_topology_census_v1")
v2 = _load_authenticated(V2_PATH, "void_buy_request_root_runtime_topology_census_v2")
auth = _load_authenticated(
    AUTH_QUERY_PATH,
    "void_buy_void_user_manager_query_live_qualification_v1",
)

MARKER = "VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1"
EXPECTED_HOSTNAME = "zoso-Precision-Tower-7810"
EXPECTED_USER = "zoso"
EXPECTED_UID = 1000
EXPECTED_MACHINE_ID_SHA256 = "11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2"
UNIT = "void-node-live.service"
REQUEST_ENV = "VOID_BUY_REQUEST_DIR"
DEFAULT_RELATIVE = pathlib.Path(".runtime") / "public-buy-void-requests-v1"
REPO_ROOT = pathlib.Path("/home/zoso/dev/void-node")
RELEASES_ROOT = pathlib.Path("/opt/void-node-live/releases")
STABLE_ROOT = pathlib.Path("/var/lib/void-buy-request-journal-v1")
HEX40 = re.compile(r"^[0-9a-f]{40}$")
MAX_DIRECT_ENTRIES = 100_000

def _machine_id_sha256() -> str:
    value = v2.machine_id_sha256()
    if value is None:
        raise CensusError("machine_id_unqualified")
    return value

def _authenticated_query(installer: Any) -> dict[str, Any]:
    native, output_sha256 = auth.run_authenticated_query(installer)
    return {
        "native": native,
        "output_sha256": output_sha256,
        "identity": auth._stable_identity(native),
    }


def _service_view(query: dict[str, Any], process: dict[str, Any]) -> dict[str, Any]:
    native = query["native"]
    identity = query["identity"]
    return {
        "authenticated_user_manager": True,
        "load_state": native["LoadState"],
        "active_state": native["ActiveState"],
        "sub_state": native["SubState"],
        "main_pid": identity["main_pid"],
        "runtime_uid": identity["runtime_uid"],
        "control_group": identity["control_group"],
        "working_directory": None,
        "working_directory_authenticated": False,
        "live_process_cwd": process.get("cwd"),
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

def _release_inventory() -> tuple[list[pathlib.Path], bool]:
    try:
        root_meta = _meta(RELEASES_ROOT)
        if (
            root_meta.get("exists") is not True
            or root_meta.get("kind") != "directory"
            or root_meta.get("symlink") is True
        ):
            return [], False
        paths: list[pathlib.Path] = []
        complete = True
        for entry in RELEASES_ROOT.iterdir():
            if not HEX40.fullmatch(entry.name):
                continue
            item = _meta(entry)
            if (
                item.get("exists") is not True
                or item.get("kind") != "directory"
                or item.get("symlink") is True
            ):
                complete = False
                continue
            paths.append(entry / DEFAULT_RELATIVE)
        return sorted(paths, key=str), complete
    except OSError:
        return [], False


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
    for dependency, expected in DEPENDENCY_BLOBS.items():
        assert _git_blob_sha1(_authenticated_source_bytes(dependency)) == expected
    own_source = pathlib.Path(__file__).read_text(encoding="utf-8")
    assert "run_systemctl" not in own_source
    assert "systemctl" not in own_source
    print(MARKER + "_SELF_TEST_GREEN")
    print("empty_metadata_is_not_genesis_proof=true")
    print("zero_length_fixed_journals_are_not_genesis_proof=true")
    print("directory_entry_names_output=false")
    print("request_or_payment_contents_read=false")
    print("historical_request_history_disposition_proven=false")
    print("authenticated_dependency_sources_bound=true")
    print("unauthenticated_user_manager_not_authority=true")
    print("production_gate_ready=false")

def plan() -> None:
    print(MARKER)
    print("mode=--plan")
    print("read_only=true")
    print("sudo_required=true")
    print("root_execution_required_for_authenticated_manager_query=true")
    print("designated_runtime_user=zoso")
    print("designated_runtime_uid=1000")
    print("authenticated_user_manager_required=true")
    print("unit_working_directory_authenticated=false")
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
    print("next_action=RUN_AUTHENTICATED_METADATA_ONLY_DESIGNATED_HOST_CENSUS")


def collect() -> dict[str, Any]:
    if os.geteuid() != 0:
        raise CensusError("root_required_for_authenticated_manager_query")
    try:
        runtime_account = pwd.getpwuid(EXPECTED_UID)
    except KeyError as exc:
        raise CensusError("designated_runtime_user_identity_unavailable") from exc
    if runtime_account.pw_name != EXPECTED_USER:
        raise CensusError("designated_runtime_user_required")

    hostname = socket.gethostname()
    machine_sha = _machine_id_sha256()
    designated_host_identity_verified = (
        hostname == EXPECTED_HOSTNAME
        and machine_sha == EXPECTED_MACHINE_ID_SHA256
    )

    installer = auth._load_installer()
    installed_before = auth.installed_pair_snapshot(installer)
    authenticated_before = _authenticated_query(installer)
    installed_middle = auth.installed_pair_snapshot(installer)
    identity_before = authenticated_before["identity"]
    main_pid = int(identity_before["main_pid"])

    process_before = v1.read_process_generation(main_pid)
    listener_before = v1.runtime_http_listener_binding(main_pid)
    status_before = _request_root_status(
        v1.bounded_local_json(v1.CONFIRMED_CLOSEOUT_STATUS_PATH)
    )

    candidates: dict[str, list[str]] = {}
    def add(path: os.PathLike[str] | str, source: str) -> None:
        candidates.setdefault(_absolute(path), []).append(source)

    add(REPO_ROOT / DEFAULT_RELATIVE, "repo_default")
    if process_before.get("observed") is True and process_before.get("cwd"):
        add(
            pathlib.Path(str(process_before["cwd"])) / DEFAULT_RELATIVE,
            "authenticated_live_process_cwd_default",
        )
    if (
        status_before.get("observed") is True
        and status_before.get("source") == REQUEST_ENV
        and isinstance(status_before.get("request_dir"), str)
    ):
        add(status_before["request_dir"], "live_status_explicit_request_dir")

    release_paths_before, release_inventory_complete_before = _release_inventory()
    for release_path in release_paths_before:
        add(release_path, "immutable_release_default")
    release_count = len(release_paths_before)

    add(STABLE_ROOT, "selected_future_stable_root")
    rows = [
        classify_candidate(pathlib.Path(path), sources)
        for path, sources in sorted(candidates.items())
    ]
    rows_second = [
        classify_candidate(pathlib.Path(path), sources)
        for path, sources in sorted(candidates.items())
    ]
    candidate_observations_stable = rows == rows_second

    release_paths_after, release_inventory_complete_after = _release_inventory()
    process_after = v1.read_process_generation(main_pid)
    listener_after = v1.runtime_http_listener_binding(main_pid)
    status_after = _request_root_status(
        v1.bounded_local_json(v1.CONFIRMED_CLOSEOUT_STATUS_PATH)
    )

    authenticated_after = _authenticated_query(installer)
    installed_after = auth.installed_pair_snapshot(installer)
    identity_after = authenticated_after["identity"]

    installed_authenticated_query_pair_stable = (
        installed_before == installed_middle == installed_after
    )
    authenticated_user_manager_query_stable = (
        installed_authenticated_query_pair_stable
        and authenticated_before["native"] == authenticated_after["native"]
        and authenticated_before["output_sha256"]
            == authenticated_after["output_sha256"]
        and identity_before == identity_after
        and int(identity_before["runtime_uid"]) == EXPECTED_UID
        and int(identity_after["runtime_uid"]) == EXPECTED_UID
        and int(identity_after["main_pid"]) == main_pid
    )
    runtime_process_generation_stable = (
        authenticated_user_manager_query_stable
        and process_before.get("observed") is True
        and process_after.get("observed") is True
        and process_before.get("pid") == main_pid
        and process_after.get("pid") == main_pid
        and str(process_before.get("start_ticks"))
            == str(identity_before["service_start_ticks"])
        and str(process_after.get("start_ticks"))
            == str(identity_after["service_start_ticks"])
        and process_before.get("start_ticks") == process_after.get("start_ticks")
        and process_before.get("cwd") == process_after.get("cwd")
        and process_before.get("exe") == process_after.get("exe")
    )
    runtime_listener_stable = (
        authenticated_user_manager_query_stable
        and listener_before == listener_after
        and listener_before.get("owned_by_runtime_pid") is True
        and listener_before.get("loopback_listener_observed") is True
    )
    request_root_status_stable = (
        authenticated_user_manager_query_stable
        and status_before == status_after
        and status_before.get("observed") is True
    )
    release_inventory_stable = (
        release_inventory_complete_before
        and release_inventory_complete_after
        and release_paths_before == release_paths_after
    )

    historical = [
        row for row in rows
        if "selected_future_stable_root" not in row["sources"]
    ]
    surviving = [
        row["path"] for row in historical
        if row["classification"] == "SURVIVING_HISTORY_METADATA_OBSERVED"
    ]
    unverified = [
        row["path"] for row in historical
        if row["classification"].startswith(("HOLD_", "UNVERIFIED_"))
    ]
    empty_shape = [
        row["path"] for row in historical
        if "EXTERNAL_ANCHOR_REQUIRED" in row["classification"]
    ]
    absent = [
        row["path"] for row in historical
        if row["classification"] == "ABSENT_OBSERVED"
    ]

    candidate_set_complete = (
        designated_host_identity_verified
        and authenticated_user_manager_query_stable
        and runtime_process_generation_stable
        and runtime_listener_stable
        and request_root_status_stable
        and release_inventory_stable
        and candidate_observations_stable
    )
    service = _service_view(authenticated_before, process_before)
    return {
        "marker": MARKER,
        "version": 1,
        "read_only": True,
        "root_execution_required": True,
        "designated_hostname_matches": hostname == EXPECTED_HOSTNAME,
        "designated_runtime_user_matches":
            int(identity_before["runtime_uid"]) == EXPECTED_UID
            and runtime_account.pw_name == EXPECTED_USER,
        "effective_uid": os.geteuid(),
        "designated_machine_id_matches":
            machine_sha == EXPECTED_MACHINE_ID_SHA256,
        "designated_host_identity_verified": designated_host_identity_verified,
        "authenticated_private_manager_peer": True,
        "authenticated_user_manager_query_stable":
            authenticated_user_manager_query_stable,
        "installed_authenticated_query_pair_stable":
            installed_authenticated_query_pair_stable,
        "authenticated_main_pid": main_pid,
        "unit_working_directory_authenticated": False,
        "service": service,
        "process_environment_access": False,
        "external_network_calls": False,
        "loopback_get_only": True,
        "runtime_process_generation_stable": runtime_process_generation_stable,
        "runtime_http_listener_stable": runtime_listener_stable,
        "confirmed_closeout_request_root_status": status_before,
        "confirmed_closeout_request_root_status_stable":
            request_root_status_stable,
        "immutable_release_count": release_count,
        "immutable_release_inventory_complete":
            release_inventory_complete_before
            and release_inventory_complete_after,
        "immutable_release_inventory_stable": release_inventory_stable,
        "candidate_observations_stable": candidate_observations_stable,
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
        "service_mutation": False,
        "systemd_mutation": False,
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
        "read_only", "root_execution_required",
        "designated_hostname_matches", "designated_runtime_user_matches",
        "designated_machine_id_matches", "designated_host_identity_verified",
        "authenticated_private_manager_peer",
        "authenticated_user_manager_query_stable",
        "installed_authenticated_query_pair_stable",
        "unit_working_directory_authenticated",
        "candidate_set_completeness_proven",
        "bounded_current_candidate_set_observed",
        "process_environment_access", "external_network_calls", "loopback_get_only",
        "runtime_process_generation_stable", "runtime_http_listener_stable",
        "confirmed_closeout_request_root_status_stable",
        "immutable_release_inventory_stable", "candidate_observations_stable",
        "request_or_payment_contents_read", "directory_entry_names_output",
        "historical_request_history_disposition_proven", "historical_origin_authenticated",
        "filesystem_rollback_prevention_proven", "migration_authorized",
        "host_mutation", "service_mutation", "systemd_mutation",
        "payment_acceptance", "public_presale_activation",
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
