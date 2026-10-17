#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import hashlib
import inspect
import json
import os
import pathlib
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import textwrap
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_v2.c"
)
WORKFLOW = (
    ROOT / ".github/workflows/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-v2.yml"
)

TARGET_BLOB = "86dc09e52402c04fb6e4b30a7fcf695833808ca3"
PRODUCTION_INSTALLER = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
PRODUCTION_INSTALLER_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"
MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V2"
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1"
)
EXPECTED_HEAD = "0123456789abcdef0123456789abcdef01234567"
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY"
PLAN_ID = "voidbuye2dormantbinderinstall2_" + "2" * 64
LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
BINDER_REL = "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
BINDER_BLOB = "9c29eb4716077e459b9154f39d0f30cf2e56729f"
BINDER_BYTES = 39_391
BINDER_SHA256 = "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
ACCEPTED_NATIVE_BYTES = 726_976
ACCEPTED_NATIVE_SHA256 = "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
FIXTURE_GIT_CONFIG = (
    b"[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n"
    b"\tbare = false\n\tlogallrefupdates = true\n"
)

parser = argparse.ArgumentParser(description="Prove C2 synthetic and exact production-child handoffs")
parser.add_argument("--accepted-native", required=True, type=pathlib.Path,
                    help="Exact accepted native V3 ELF; read and hash only, never execute")
arguments = parser.parse_args()


def production_fixture_driver() -> None:
    """Root-only disposable fixture driver; never imported by production code."""
    import hashlib
    import json
    import os
    import pathlib
    import re
    import signal
    import stat
    import subprocess
    import sys

    def require(condition: bool, reason: str) -> None:
        if not condition:
            raise RuntimeError(reason)

    require(os.geteuid() == os.getegid() == 0, "fixture_driver_requires_root")
    require(sys.flags.isolated == 1 and sys.flags.no_site == 1,
            "fixture_driver_requires_isolated_no_site_python")
    require(len(sys.argv) == 2 and re.fullmatch(r"[0-9a-f]{64}", sys.argv[1]) is not None,
            "fixture_manifest_digest_required")
    require(os.uname().nodename != "zoso-Precision-Tower-7810", "precision_host_forbidden")

    def digest(raw: bytes) -> str:
        return hashlib.sha256(raw).hexdigest()

    def blob(raw: bytes) -> str:
        return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

    def identity(observed: os.stat_result) -> tuple[int, ...]:
        return tuple(getattr(observed, field) for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        ))

    def directory_binding(observed: os.stat_result) -> tuple[int, ...]:
        return (observed.st_dev, observed.st_ino, observed.st_mode,
                observed.st_uid, observed.st_gid)

    def read_fd(fd: int, size: int) -> bytes:
        result = bytearray()
        while len(result) < size:
            chunk = os.pread(fd, min(65536, size - len(result)), len(result))
            require(bool(chunk), "fixture_input_short_read")
            result.extend(chunk)
        require(not os.pread(fd, 1, size), "fixture_input_grew")
        return bytes(result)

    # All transferred inputs are flat regular files in the caller's newly
    # created temporary directory. Their individual bytes and closed logical
    # paths are checked before a fixed-path directory can be created.
    input_root = os.open(pathlib.Path(__file__).parent,
                         os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        def input_bytes(name: str, size: int, expected_digest: str) -> bytes:
            require(re.fullmatch(r"[a-z0-9-]+", name) is not None,
                    "fixture_input_basename_invalid")
            require(isinstance(size, int) and 0 < size <= 2 * 1024 * 1024,
                    "fixture_input_size_invalid")
            fd = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK,
                         dir_fd=input_root)
            try:
                before = os.fstat(fd)
                require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1
                        and before.st_size == size, "fixture_input_metadata_invalid")
                raw = read_fd(fd, size)
                require(identity(before) == identity(os.fstat(fd)) == identity(
                    os.stat(name, dir_fd=input_root, follow_symlinks=False)),
                    "fixture_input_generation_changed")
                require(digest(raw) == expected_digest, "fixture_input_digest_mismatch")
                return raw
            finally:
                os.close(fd)

        manifest_st = os.stat("production-manifest", dir_fd=input_root, follow_symlinks=False)
        require(0 < manifest_st.st_size <= 65536, "fixture_manifest_size_invalid")
        manifest_raw = input_bytes("production-manifest", manifest_st.st_size, sys.argv[1])
        manifest = json.loads(manifest_raw)
        require(set(manifest) == {"schema", "head", "payloads", "checkout"}
                and manifest["schema"] == "runtime_head_v2_exact_child_fixture_v1",
                "fixture_manifest_schema_invalid")
        head = manifest["head"]
        require(isinstance(head, str) and re.fullmatch(r"[0-9a-f]{40}", head) is not None,
                "fixture_head_invalid")
        payloads = manifest["payloads"]
        require(set(payloads) == {"launcher", "installer", "native", "policy"},
                "fixture_payload_roles_invalid")
        loaded: dict[str, bytes] = {}
        input_names: set[str] = {"production-manifest"}
        for role, row in payloads.items():
            require(set(row) == {"file", "bytes", "sha256"}, "fixture_payload_row_invalid")
            require(row["file"] not in input_names, "fixture_duplicate_input")
            input_names.add(row["file"])
            loaded[role] = input_bytes(row["file"], row["bytes"], row["sha256"])
        require(blob(loaded["installer"]) == "f3d6b1559be7490303cf36338c4bfa38fdaa390a",
                "fixture_production_installer_changed")
        require(len(loaded["native"]) == 726976 and digest(loaded["native"]) ==
                "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c",
                "fixture_accepted_native_changed")
        require(loaded["policy"].startswith(
            b"schema=VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1\n"),
            "fixture_policy_namespace_invalid")
        checkout_rows = manifest["checkout"]
        require(isinstance(checkout_rows, list) and 1 <= len(checkout_rows) <= 128,
                "fixture_checkout_count_invalid")
        checkout: dict[str, dict] = {}
        allowed_directories = {
            ".git", ".git/objects", ".git/objects/info", ".git/objects/pack",
            ".git/refs", ".git/refs/heads", ".git/refs/tags", ".git/logs",
            ".git/logs/refs", ".git/logs/refs/heads", "ops", "ops/security", "ops/precision",
        }
        allowed_files = {
            ".git/config", ".git/HEAD", ".git/index", ".git/COMMIT_EDITMSG",
            ".git/logs/HEAD", ".git/logs/refs/heads/main", ".git/refs/heads/main",
            "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json",
            "ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs",
        }
        total = 0
        for row in checkout_rows:
            relative = row.get("path")
            require(isinstance(relative, str) and relative not in checkout
                    and all(re.fullmatch(r"[A-Za-z0-9_.-]{1,255}", part)
                            and part not in (".", "..") for part in relative.split("/"))
                    and len(relative.split("/")) <= 6, "fixture_checkout_path_invalid")
            if row.get("kind") == "directory":
                require(set(row) == {"path", "kind"} and (
                    relative in allowed_directories
                    or re.fullmatch(r"\.git/objects/[0-9a-f]{2}", relative)),
                    "fixture_checkout_directory_invalid")
                checkout[relative] = {"kind": "directory"}
            else:
                require(set(row) == {"path", "kind", "file", "bytes", "sha256"}
                        and row["kind"] == "file" and (
                            relative in allowed_files
                            or re.fullmatch(r"\.git/objects/[0-9a-f]{2}/[0-9a-f]{38}", relative)),
                        "fixture_checkout_file_invalid")
                require(row["file"] not in input_names, "fixture_duplicate_input")
                input_names.add(row["file"])
                raw = input_bytes(row["file"], row["bytes"], row["sha256"])
                total += len(raw)
                require(total <= 1024 * 1024, "fixture_checkout_byte_budget_exceeded")
                checkout[relative] = {"kind": "file", "raw": raw}
        require(all(str(pathlib.PurePosixPath(relative).parent) == "." or
                    checkout.get(str(pathlib.PurePosixPath(relative).parent), {}).get("kind") == "directory"
                    for relative in checkout), "fixture_checkout_parent_missing")
        require(checkout[".git/config"]["raw"] == (
            b"[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n"
            b"\tbare = false\n\tlogallrefupdates = true\n"), "fixture_git_config_not_closed")
        require(checkout[".git/HEAD"]["raw"] == b"ref: refs/heads/main\n"
                and checkout[".git/refs/heads/main"]["raw"] == (head + "\n").encode("ascii"),
                "fixture_checkout_head_binding_invalid")
        require(checkout[".git/index"]["raw"][:8] == b"DIRC\0\0\0\2",
                "fixture_checkout_not_ordinary_index_v2")
        lock = checkout["ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"]["raw"]
        binder = checkout["ops/precision/void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"]["raw"]
        require(blob(lock) == "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1",
                "fixture_accepted_lock_changed")
        require(blob(binder) == "9c29eb4716077e459b9154f39d0f30cf2e56729f"
                and len(binder) == 39391 and digest(binder) ==
                "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e",
                "fixture_binder_changed")
    finally:
        os.close(input_root)

    launcher_name = "void-buy-void-epoch2-dormant-binder-installer-first-entry-v1"
    pair_name = "void-buy-void-epoch2-dormant-v3r-binding-v2"
    stage_names = ("." + launcher_name + ".stage", "." + pair_name + ".stage")
    nodes: list[dict] = []
    anchors: list[dict] = []
    current_process: subprocess.Popen | None = None
    failure: BaseException | None = None
    cleanup_completed = False
    root_fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)

    def physical_root_directory(fd: int) -> None:
        observed = os.fstat(fd)
        require(stat.S_ISDIR(observed.st_mode) and observed.st_uid == observed.st_gid == 0
                and observed.st_mode & 0o022 == 0, "fixture_anchor_custody_invalid")

    def open_anchor(name: str) -> dict:
        visible = os.stat(name, dir_fd=root_fd, follow_symlinks=False)
        require(stat.S_ISDIR(visible.st_mode), "fixture_anchor_not_physical_directory")
        fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                     dir_fd=root_fd)
        physical_root_directory(fd)
        require(identity(visible) == identity(os.fstat(fd)), "fixture_anchor_rebound")
        value = {"name": name, "fd": fd, "binding": directory_binding(visible), "children": set()}
        anchors.append(value)
        return value

    def verify_anchors() -> None:
        physical_root_directory(root_fd)
        for anchor in anchors:
            require(directory_binding(os.fstat(anchor["fd"])) == anchor["binding"] ==
                    directory_binding(os.stat(anchor["name"], dir_fd=root_fd, follow_symlinks=False)),
                    "fixture_anchor_generation_changed")

    def absent(parent: dict, name: str) -> None:
        try:
            os.stat(name, dir_fd=parent["fd"], follow_symlinks=False)
        except FileNotFoundError:
            return
        raise RuntimeError("fixture_fixed_path_already_present:" + name)

    def directory(parent: dict, name: str, uid: int = 0) -> dict:
        os.mkdir(name, 0o700, dir_fd=parent["fd"])
        fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW,
                     dir_fd=parent["fd"])
        node = {"kind": "directory", "parent": parent, "name": name, "fd": fd, "children": set()}
        nodes.append(node)
        parent["children"].add(name)
        os.fchown(fd, uid, uid)
        os.fchmod(fd, 0o755)
        node["binding"] = directory_binding(os.fstat(fd))
        return node

    def file(parent: dict, name: str, raw: bytes, mode: int, uid: int = 0) -> dict:
        fd = os.open(name, os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_CLOEXEC | os.O_NOFOLLOW,
                     0o600, dir_fd=parent["fd"])
        node = {"kind": "file", "parent": parent, "name": name, "fd": fd}
        nodes.append(node)
        parent["children"].add(name)
        view = memoryview(raw)
        while view:
            written = os.write(fd, view)
            require(written > 0, "fixture_file_short_write")
            view = view[written:]
        os.fchown(fd, uid, uid)
        os.fchmod(fd, mode)
        os.fsync(fd)
        observed = os.fstat(fd)
        require(stat.S_ISREG(observed.st_mode) and observed.st_nlink == 1
                and read_fd(fd, len(raw)) == raw, "fixture_file_readback_failed")
        node.update({"binding": identity(observed), "sha256": digest(raw), "bytes": len(raw)})
        retained = os.open(name, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
                           dir_fd=parent["fd"])
        try:
            require(identity(os.fstat(retained)) == identity(os.fstat(fd)) == node["binding"] ==
                    identity(os.stat(name, dir_fd=parent["fd"], follow_symlinks=False)),
                    "fixture_read_only_descriptor_rebound")
        except BaseException:
            os.close(retained)
            raise
        os.close(fd)
        node["fd"] = retained
        return node

    def verify_node(node: dict) -> None:
        visible = os.stat(node["name"], dir_fd=node["parent"]["fd"], follow_symlinks=False)
        opened = os.fstat(node["fd"])
        if node["kind"] == "file":
            require(identity(visible) == identity(opened) == node["binding"],
                    "fixture_owned_file_generation_changed")
            require(digest(read_fd(node["fd"], node["bytes"])) == node["sha256"],
                    "fixture_owned_file_bytes_changed")
        else:
            require(directory_binding(visible) == directory_binding(opened) == node["binding"],
                    "fixture_owned_directory_generation_changed")
            require(set(os.listdir(node["fd"])) == node["children"],
                    "fixture_owned_directory_has_unknown_entries")

    def snapshot() -> tuple:
        verify_anchors()
        result = []
        for node in nodes:
            verify_node(node)
            result.append((node["kind"], node["name"], identity(os.fstat(node["fd"])),
                           node.get("sha256"), tuple(sorted(node.get("children", ())))))
        return tuple(result)

    def reap_group(pid: int, process: subprocess.Popen | None = None) -> None:
        try:
            os.killpg(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        if process is not None:
            process.communicate(timeout=10)

    def interrupted(_signum: int, _frame: object) -> None:
        raise RuntimeError("fixture_driver_interrupted")

    def invoke(argv: list[str], *, success: bool = True) -> subprocess.CompletedProcess[str]:
        nonlocal current_process
        require(current_process is None, "fixture_previous_child_unreaped")
        reaped = False
        current_process = subprocess.Popen(argv, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                                           stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="strict",
                                           start_new_session=True, env={
                                               "PATH": "/usr/bin:/bin", "HOME": "/root",
                                               "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
                                           })
        try:
            stdout, stderr = current_process.communicate(timeout=30)
            returncode = current_process.returncode
            reaped = True
        except BaseException:
            reap_group(current_process.pid, current_process)
            reaped = True
            raise
        finally:
            if reaped:
                current_process = None
        result = subprocess.CompletedProcess(argv, returncode, stdout, stderr)
        if success:
            require(result.returncode == 0 and not stderr, "fixture_real_launcher_failed:" + stderr[:600])
        return result

    real_child_marker = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PROTECTED_INSTALL_V2"
    outer_green = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V2_GREEN"

    def require_plan(result: subprocess.CompletedProcess[str], state: str) -> str:
        lines = result.stdout.splitlines()
        for fact in (real_child_marker, "mode=plan", "expected_head=" + head,
                     "protected_state=" + state, "candidate_native_verified=true",
                     "binder_source_verified=true", "native_execution=false", "binder_execution=false",
                     "filesystem_write=false", "production_host_evidence_authority=false", outer_green,
                     "operation=installer_plan", "private_parent_proof_fd_consumed_by_installer=true"):
            require(fact in lines, "fixture_real_plan_fact_missing:" + fact)
        plans = re.findall(r"^plan_id=(voidbuye2dormantbinderinstall2_[0-9a-f]{64})$",
                           result.stdout, re.MULTILINE)
        require(len(plans) == 1, "fixture_real_plan_id_missing")
        return plans[0]

    print("production_child_fixture_only=true", flush=True)
    print("fixture_fixed_path_creation_authorized=true", flush=True)
    print("existing_installation_replacement_authorized=false", flush=True)
    print("production_native_or_binder_execution_authorized=false", flush=True)
    print("fixture_network_contact=false", flush=True)
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    signal.signal(signal.SIGALRM, interrupted)
    signal.alarm(180)
    try:
        physical_root_directory(root_fd)
        opt, home = open_anchor("opt"), open_anchor("home")
        # Every fixed target is absent before the first fixed-path mutation.
        for name in (launcher_name, pair_name, *stage_names,
                     "void-buy-void-epoch2-dormant-binder-installer-first-entry-v2"):
            absent(opt, name)
        absent(home, "zoso")
        verify_anchors()
        launcher_root = directory(opt, launcher_name)
        launcher_bin = directory(launcher_root, "bin")
        source_root = directory(launcher_root, "source")
        source_ops = directory(source_root, "ops")
        source_precision = directory(source_ops, "precision")
        inputs = directory(launcher_root, "input")
        file(launcher_bin, "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1", loaded["launcher"], 0o555)
        file(launcher_root, "policy-v1.conf", loaded["policy"], 0o444)
        file(source_precision, "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py",
             loaded["installer"], 0o444)
        file(inputs, "void_buy_void_epoch2_dormant_binder_native_candidate_v2", loaded["native"], 0o444)
        user_home = directory(home, "zoso")
        user_dev = directory(user_home, "dev")
        checkout_root = directory(user_dev, "void-node", 1000)
        copied = {".": checkout_root}
        for relative in sorted(checkout, key=lambda value: (value.count("/"), value)):
            row = checkout[relative]
            path = pathlib.PurePosixPath(relative)
            parent = copied[str(path.parent)]
            if row["kind"] == "directory":
                copied[relative] = directory(parent, path.name, 1000)
            else:
                copied[relative] = file(parent, path.name, row["raw"], 0o644, 1000)
        baseline = snapshot()
        launcher = "/opt/" + launcher_name + "/bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1"
        require_plan(invoke([launcher, "--installer-plan", "--expected-head", head]),
                     "DORMANT_BINDER_ROOT_ABSENT_READY_FOR_CREATE_ONLY")
        require(snapshot() == baseline, "fixture_real_plan_changed_bytes_or_metadata")
        absent(opt, pair_name)
        for name in stage_names:
            absent(opt, name)
        wrong_head = ("0" if head[0] != "0" else "1") + head[1:]
        rejected = invoke([launcher, "--installer-plan", "--expected-head", wrong_head], success=False)
        rejected_lines = rejected.stdout.splitlines()
        require(rejected.returncode == 2 and real_child_marker in rejected_lines
                and "status=HOLD" in rejected_lines and "reason=checkout_head_mismatch" in rejected_lines
                and "protected_install_performed=false" in rejected_lines and "publication=false" in rejected_lines
                and outer_green not in rejected.stdout, "fixture_real_child_wrong_head_not_rejected")
        require(snapshot() == baseline, "fixture_wrong_head_changed_bytes_or_metadata")

        # Seed inert fixture bytes directly. The production apply call must
        # then take ALREADY_GREEN, so no production publication is exercised.
        pair = directory(opt, pair_name)
        file(pair, "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2",
             loaded["native"], 0o555)
        file(pair, "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs", binder, 0o444)
        baseline = snapshot()
        plan_id = require_plan(invoke([launcher, "--installer-plan", "--expected-head", head]),
                               "DORMANT_BINDER_NATIVE_PAIR_GREEN")
        require(snapshot() == baseline, "fixture_green_plan_changed_bytes_or_metadata")
        applied = invoke([launcher, "--installer-apply", "--expected-head", head,
                          "--expected-plan-id", plan_id, "--confirm",
                          "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY"])
        lines = applied.stdout.splitlines()
        for fact in (real_child_marker, "mode=apply", "status=ALREADY_GREEN",
                     "protected_install_performed=false", "publication=false",
                     "publication_state=already_green", "native_execution=false", "binder_execution=false",
                     outer_green, "operation=installer_apply", "installer_apply_child_exit_success=true"):
            require(fact in lines, "fixture_real_already_green_fact_missing:" + fact)
        require(snapshot() == baseline, "fixture_already_green_apply_changed_bytes_or_metadata")
        for name in stage_names:
            absent(opt, name)
    except BaseException as exc:
        failure = exc
    finally:
        signal.alarm(0)
        if current_process is not None:
            try:
                reap_group(current_process.pid, current_process)
                current_process = None
            except BaseException as exc:
                failure = failure or exc
        try:
            require(current_process is None, "fixture_cleanup_refused_while_child_unreaped")
            # Validate the whole owned forest before the first removal. Unknown
            # names, substitutions or changed bytes cause refusal, not rmtree.
            snapshot()
            for node in reversed(nodes):
                verify_node(node)
                if node["kind"] == "file":
                    os.unlink(node["name"], dir_fd=node["parent"]["fd"])
                else:
                    require(not os.listdir(node["fd"]), "fixture_cleanup_directory_not_empty")
                    os.rmdir(node["name"], dir_fd=node["parent"]["fd"])
                node["parent"]["children"].remove(node["name"])
                os.close(node["fd"])
                node["fd"] = -1
            verify_anchors()
            if len(anchors) == 2:
                for name in (launcher_name, pair_name, *stage_names,
                             "void-buy-void-epoch2-dormant-binder-installer-first-entry-v2"):
                    absent(anchors[0], name)
                absent(anchors[1], "zoso")
            cleanup_completed = True
        except BaseException as exc:
            print("production_fixture_cleanup_refused=true", file=sys.stderr)
            failure = failure or exc
        finally:
            for node in reversed(nodes):
                if node["fd"] >= 0:
                    os.close(node["fd"])
            for anchor in reversed(anchors):
                os.close(anchor["fd"])
            os.close(root_fd)
    if failure is not None:
        print("REAL_PRODUCTION_CHILD_HANDOFF_HOLD reason=" + type(failure).__name__ + ":" + str(failure)[:800],
              file=sys.stderr)
        print("production_fixture_cleanup_completed=" + str(cleanup_completed).lower(), file=sys.stderr)
        raise SystemExit(2)
    print("REAL_PRODUCTION_CHILD_HANDOFF_GREEN")
    print("production_child_exact_blob=f3d6b1559be7490303cf36338c4bfa38fdaa390a")
    print("production_child_parent_validator_unchanged=true")
    print("production_c_default_path_exercised=true")
    print("production_retained_regular_installer_fd_exercised=true")
    print("production_child_ready_plan_exercised=true")
    print("production_child_wrong_runtime_head_rejected=true")
    print("production_child_already_green_apply_exercised=true")
    print("production_child_publication_performed=false")
    print("production_native_or_binder_executed=false")
    print("fixture_bytes_and_mtime_ctime_preserved_during_operations=true")
    print("production_fixture_cleanup_completed=true")

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()

def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def run(
    argv: list[str],
    *,
    check: bool = True,
    env: dict[str, str] | None = None,
    input_text: str | None = None,
    timeout: int = 60,
) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    result = subprocess.run(
        argv,
        input=input_text,
        stdin=None if input_text is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env=merged,
        check=False,
        timeout=timeout,
    )
    if check and result.returncode != 0:
        raise AssertionError(
            f"command failed rc={result.returncode}: {argv!r}\n"
            f"stdout={result.stdout}\nstderr={result.stderr}"
        )
    return result

def sudo(
    argv: list[str],
    *,
    check: bool = True,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    return run(["sudo", "-n", *argv], check=check, input_text=input_text)

def sudo_env(
    env: dict[str, str],
    argv: list[str],
    *,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    assignments = [f"{key}={value}" for key, value in sorted(env.items())]
    return run(["sudo", "-n", "env", *assignments, *argv], check=check)

def synthetic_fixture_directory(operation: str, path: pathlib.Path,
                                binding: tuple[int, int] | None = None) -> tuple[int, int]:
    """Create exclusively; remove only the same owned synthetic root inode."""
    program = r'''
import json, os, re, stat, sys
operation, path = sys.argv[1:3]
assert os.geteuid() == os.getegid() == 0
assert re.fullmatch(r"/root/void-e2-dormant-binder-first-entry-proof-[0-9]+", path)
parent = os.open("/root", os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC)
parent_st = os.fstat(parent)
assert parent_st.st_uid == parent_st.st_gid == 0 and parent_st.st_mode & 0o022 == 0
name = path.rsplit("/", 1)[1]
fd = -1
def same(left, right):
    return (left.st_dev, left.st_ino, left.st_mode, left.st_uid, left.st_gid) == (
        right.st_dev, right.st_ino, right.st_mode, right.st_uid, right.st_gid)
try:
    if operation == "create":
        assert len(sys.argv) == 3
        os.mkdir(name, 0o755, dir_fd=parent)
    else:
        assert operation == "cleanup" and len(sys.argv) == 5
    fd = os.open(name, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=parent)
    if operation == "create":
        os.fchmod(fd, 0o755)
    opened = os.fstat(fd)
    assert same(opened, os.stat(name, dir_fd=parent, follow_symlinks=False))
    assert opened.st_uid == opened.st_gid == 0 and stat.S_IMODE(opened.st_mode) == 0o755
    if operation == "create":
        assert not os.listdir(fd)
        print(json.dumps([opened.st_dev, opened.st_ino]))
    else:
        assert (opened.st_dev, opened.st_ino) == (int(sys.argv[3]), int(sys.argv[4])), "synthetic_root_substituted"
        allowed_directories = {"bin", "source", "source/ops", "source/ops/precision", "input"}
        allowed_files = {
            "bin/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1", "policy-v1.conf",
            "source/ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py",
            "source/ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.replacement",
            "input/void_buy_void_epoch2_dormant_binder_native_candidate_v2",
            "input/void_buy_void_epoch2_dormant_binder_native_candidate_v2.replacement",
        }
        owned = []
        def census(directory, prefix=""):
            for child in sorted(os.listdir(directory)):
                relative = prefix + child
                visible = os.stat(child, dir_fd=directory, follow_symlinks=False)
                assert visible.st_uid == visible.st_gid == 0
                if stat.S_ISDIR(visible.st_mode):
                    assert relative in allowed_directories
                    child_fd = os.open(child, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | os.O_CLOEXEC, dir_fd=directory)
                    assert same(visible, os.fstat(child_fd))
                    owned.append((directory, child, child_fd, visible, True))
                    census(child_fd, relative + "/")
                else:
                    assert ((relative in allowed_files and stat.S_ISREG(visible.st_mode) and visible.st_nlink == 1)
                            or (relative == "python3" and stat.S_ISLNK(visible.st_mode)))
                    owned.append((directory, child, -1, visible, False))
        try:
            census(fd)
            assert same(opened, os.fstat(fd)) and same(opened, os.stat(name, dir_fd=parent, follow_symlinks=False))
            for directory, child, child_fd, observed, is_directory in reversed(owned):
                assert same(observed, os.stat(child, dir_fd=directory, follow_symlinks=False)), "synthetic_entry_substituted"
                if is_directory:
                    assert same(observed, os.fstat(child_fd)) and not os.listdir(child_fd)
                    os.rmdir(child, dir_fd=directory)
                else:
                    os.unlink(child, dir_fd=directory)
            assert not os.listdir(fd)
            assert same(opened, os.fstat(fd)) and same(opened, os.stat(name, dir_fd=parent, follow_symlinks=False))
            os.rmdir(name, dir_fd=parent)
            print(json.dumps([opened.st_dev, opened.st_ino]))
        finally:
            for _parent, _name, child_fd, _observed, _is_directory in reversed(owned):
                if child_fd >= 0:
                    os.close(child_fd)
finally:
    if fd >= 0:
        os.close(fd)
    os.close(parent)
'''
    argv = ["/usr/bin/python3", "-I", "-S", "-B", "-c", program, operation, str(path)]
    if binding is not None:
        argv.extend(str(value) for value in binding)
    result = sudo(argv)
    value = json.loads(result.stdout)
    assert isinstance(value, list) and len(value) == 2 and all(isinstance(item, int) for item in value)
    return value[0], value[1]


def install_file(local: pathlib.Path, remote: pathlib.Path, mode: str) -> None:
    sudo([
        "/usr/bin/install", "-o", "root", "-g", "root", "-m", mode,
        str(local), str(remote),
    ])

def write_local(path: pathlib.Path, raw: bytes, mode: int = 0o644) -> None:
    path.write_bytes(raw)
    path.chmod(mode)

def wait_for(path: pathlib.Path, timeout: float = 5.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if path.exists():
            return
        time.sleep(0.01)
    raise AssertionError("timed out waiting for fixture marker")

def compile_candidate(
    *,
    output: pathlib.Path,
    fixture_root: pathlib.Path | None,
    installer_raw: bytes,
    native_raw: bytes,
) -> None:
    argv = [
        shutil.which("cc") or "cc",
        "-O2", "-std=c11", "-Wall", "-Wextra", "-Werror", "-static",
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_SHA256="'
            + sha256(installer_raw) + '"'
        ),
        (
            "-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_BYTES="
            + str(len(installer_raw)) + "U"
        ),
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_SHA256="'
            + sha256(native_raw) + '"'
        ),
        (
            "-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_BYTES="
            + str(len(native_raw)) + "U"
        ),
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_APPLY_CONFIRM="'
            + CONFIRM + '"'
        ),
        str(TARGET), "-o", str(output),
    ]
    if fixture_root is not None:
        argv[1:1] = [
            f'-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT="{fixture_root}"',
            f'-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_PYTHON="{fixture_root / "python3"}"',
        ]
    run(argv)

def require_static(binary: pathlib.Path) -> None:
    result = run(["readelf", "-lW", str(binary)])
    assert " INTERP " not in result.stdout
    assert "Requesting program interpreter" not in result.stdout
    dyn = run(["readelf", "-dW", str(binary)], check=False)
    assert "NEEDED" not in dyn.stdout


def read_bound_input(path: pathlib.Path, *, expected_blob: str | None = None,
                     expected_bytes: int | None = None,
                     expected_sha256: str | None = None) -> bytes:
    assert path.is_absolute() and os.path.normpath(str(path)) == str(path)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        before = os.fstat(fd)
        assert stat.S_ISREG(before.st_mode) and before.st_nlink == 1
        assert 0 < before.st_size <= 2 * 1024 * 1024
        if expected_bytes is not None:
            assert before.st_size == expected_bytes
        raw = bytearray()
        while len(raw) < before.st_size:
            chunk = os.read(fd, min(65536, before.st_size - len(raw)))
            assert chunk
            raw.extend(chunk)
        assert not os.read(fd, 1)
        after, visible = os.fstat(fd), path.lstat()
        for field in ("st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
                      "st_size", "st_mtime_ns", "st_ctime_ns"):
            assert getattr(before, field) == getattr(after, field) == getattr(visible, field)
    finally:
        os.close(fd)
    result = bytes(raw)
    if expected_blob is not None:
        assert git_blob(result) == expected_blob
    if expected_sha256 is not None:
        assert sha256(result) == expected_sha256
    return result

source_raw = TARGET.read_bytes()
source = source_raw.decode("utf-8")
assert git_blob(source_raw) == TARGET_BLOB

production_installer_raw = PRODUCTION_INSTALLER.read_bytes()
production_installer_source = production_installer_raw.decode("utf-8")
assert git_blob(production_installer_raw) == PRODUCTION_INSTALLER_BLOB
production_ast = ast.parse(production_installer_source)
launcher_assignments = [
    node for node in production_ast.body
    if isinstance(node, ast.Assign)
    and any(isinstance(target, ast.Name) and target.id == "FIRST_ENTRY_LAUNCHER"
            for target in node.targets)
]
assert len(launcher_assignments) == 1
launcher_value = launcher_assignments[0].value
assert isinstance(launcher_value, ast.Call) and len(launcher_value.args) == 1
production_launcher = ast.literal_eval(launcher_value.args[0])
default_root = re.findall(
    r'^#define VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT "([^"\n]+)"$',
    source, re.MULTILINE,
)
default_self_suffix = re.findall(
    r'^#define FIXED_SELF VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT "([^"\n]+)"$',
    source, re.MULTILINE,
)
assert len(default_root) == len(default_self_suffix) == 1
assert default_root[0] + default_self_suffix[0] == production_launcher
assert production_launcher == (
    "/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1/bin/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1"
)
accepted_native_raw = read_bound_input(
    arguments.accepted_native, expected_bytes=ACCEPTED_NATIVE_BYTES,
    expected_sha256=ACCEPTED_NATIVE_SHA256,
)
production_lock_raw = read_bound_input(ROOT / LOCK_REL, expected_blob=LOCK_BLOB)
production_binder_raw = read_bound_input(
    ROOT / BINDER_REL, expected_blob=BINDER_BLOB, expected_bytes=BINDER_BYTES,
    expected_sha256=BINDER_SHA256,
)
for required in (
    "FIRST_ENTRY_INSTALLER_FD_ENV",
    "FIRST_ENTRY_NATIVE_FD_ENV",
    "FIRST_ENTRY_PROOF_FD_ENV",
    "FIRST_ENTRY_PROOF_SCHEMA",
    "authenticated_first_entry_fd_contract_required_for_apply=true",
    "authenticated_first_entry_parent_proof_required=true",
    "_read_exact_candidate_inherited",
    "_validate_first_entry_parent",
    "_require_apply_context(native, expected_head)",
):
    assert required in production_installer_source, required

for required in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1",
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1",
    '#error "exact dormant-binder installer SHA-256 must be supplied at build time"',
    '#error "exact dormant-binder native candidate SHA-256 must be supplied at build time"',
    '"--expected-head"',
    "lower_hex_exact(argv[3], 40U)",
    "request.expected_head",
    '#error "exact installer confirmation token must be supplied at build time"',
    "dormant_binder_installer_first_entry_stdin_python_source_forbidden",
    "fexecve(python.fd, next_argv, envp)",
    "native_candidate_descriptor_passed_to_installer=true",
    "private_parent_proof_fd_passed_to_installer=true",
    "parent_pid_start_executable_generation_bound=true",
    "running_python_generation_bound=true",
    "expected_plan_id_forwarded_for_apply=true",
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_NATIVE_FD=%d",
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROOF_FD=%d",
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_PARENT_PROOF_V1",
    '"--expected-plan-id"',
    '"/proc/self/fd/%d"',
    '"PATH=/usr/bin:/bin"',
    '"HOME=/root"',
    '"LANG=C"',
    '"LC_ALL=C"',
    '"TZ=UTC"',
    "post_child_generation_revalidation=true",
    "stale_candidate_lock_promoted=false",
):
    assert required in source, required

assert "VOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_EXPECTED_HEAD" not in source
assert '#error "exact accepted repository head must be supplied at build time"' not in source
for forbidden in (
    "voidbuye2dormantbinderlock2_34df",
    "voidbuye2dormantbindercand2_3427",
    "--qualifier-run",
    "OP_QUALIFIER_RUN",
    "PYTHONPATH=",
    "PYTHONHOME=",
    "PYTHONSTARTUP=",
    "PYTHONINSPECT=",
    "PYTHONWARNINGS=",
    "LD_PRELOAD=",
    "LD_LIBRARY_PATH=",
):
    assert forbidden not in source, forbidden

# The source cannot accidentally build without a concrete accepted generation.
missing_generation = run(
    [
        shutil.which("cc") or "cc",
        "-O2", "-std=c11", "-Wall", "-Wextra", "-Werror", "-static",
        str(TARGET), "-o", os.devnull,
    ],
    check=False,
)
assert missing_generation.returncode != 0
assert "must be supplied at build time" in missing_generation.stderr

with tempfile.TemporaryDirectory(
    prefix="void-e2-dormant-binder-first-entry-proof-"
) as td:
    temp = pathlib.Path(td)
    fixture_root = pathlib.Path(
        f"/root/void-e2-dormant-binder-first-entry-proof-{os.getpid()}"
    )
    binary_local = temp / "preentry"
    installer_local = temp / "installer.py"
    native_local = temp / "native-candidate"
    invocation_marker = temp / "invoked"
    abnormal_control = temp / "abnormal"

    installer_text = textwrap.dedent(
        f"""\
        #!/usr/bin/env python3
        import argparse
        import os
        import pathlib
        import signal
        import sys
        import time

        marker = pathlib.Path({str(invocation_marker)!r})
        abnormal = pathlib.Path({str(abnormal_control)!r})
        parser = argparse.ArgumentParser()
        mode = parser.add_mutually_exclusive_group(required=True)
        mode.add_argument("--plan", action="store_true")
        mode.add_argument("--apply", action="store_true")
        parser.add_argument("--native", required=True)
        parser.add_argument("--expected-head", required=True)
        parser.add_argument("--expected-plan-id", default="")
        parser.add_argument("--confirm", default="")
        args = parser.parse_args()

        assert os.environ[
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY"
        ] == "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1"
        installer_fd = int(os.environ[
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_INSTALLER_FD"
        ])
        native_fd = int(os.environ[
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_NATIVE_FD"
        ])
        proof_fd = int(os.environ[
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROOF_FD"
        ])
        assert len({{installer_fd, native_fd, proof_fd}}) == 3
        proof_raw = bytearray()
        while True:
            chunk = os.read(proof_fd, 4096)
            if not chunk:
                break
            proof_raw.extend(chunk)
        os.close(proof_fd)
        proof_lines = bytes(proof_raw).decode("ascii").splitlines()
        expected_keys = [
            "schema",
            "parent_pid",
            "parent_start_ticks",
            "launcher_dev",
            "launcher_ino",
            "installer_dev",
            "installer_ino",
            "native_dev",
            "native_ino",
            "python_dev",
            "python_ino",
            "installer_fd",
            "native_fd",
            "operation",
            "expected_head",
        ]
        assert [line.split("=", 1)[0] for line in proof_lines] == expected_keys
        proof = dict(line.split("=", 1) for line in proof_lines)
        assert proof["schema"] == (
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_PARENT_PROOF_V1"
        )
        parent_pid = int(proof["parent_pid"])
        assert parent_pid == os.getppid()
        stat_text = pathlib.Path(f"/proc/{{parent_pid}}/stat").read_text(
            encoding="ascii"
        )
        right = stat_text.rfind(")")
        fields = stat_text[right + 2:].split()
        assert proof["parent_start_ticks"] == fields[19]
        parent_exe = os.stat(f"/proc/{{parent_pid}}/exe")
        python_exe = os.stat("/proc/self/exe")
        installer_st = os.fstat(installer_fd)
        native_st = os.fstat(native_fd)
        assert (int(proof["launcher_dev"]), int(proof["launcher_ino"])) == (
            parent_exe.st_dev, parent_exe.st_ino
        )
        assert (int(proof["installer_dev"]), int(proof["installer_ino"])) == (
            installer_st.st_dev, installer_st.st_ino
        )
        assert (int(proof["native_dev"]), int(proof["native_ino"])) == (
            native_st.st_dev, native_st.st_ino
        )
        assert (int(proof["python_dev"]), int(proof["python_ino"])) == (
            python_exe.st_dev, python_exe.st_ino
        )
        assert int(proof["installer_fd"]) == installer_fd
        assert int(proof["native_fd"]) == native_fd
        assert sys.argv[0] == f"/proc/self/fd/{{installer_fd}}"
        assert args.native == f"/proc/self/fd/{{native_fd}}"
        assert args.expected_head == {EXPECTED_HEAD!r}
        assert proof["expected_head"] == {EXPECTED_HEAD!r}
        assert proof["operation"] == (
            "installer_plan" if args.plan else "installer_apply"
        )
        marker.write_text("invoked\\n", encoding="utf-8")

        time.sleep(0.35)
        os.lseek(native_fd, 0, os.SEEK_SET)
        candidate = os.read(native_fd, 4096)
        assert candidate == b"VOID_DORMANT_BINDER_SYNTHETIC_NATIVE_V2\\n"

        if args.plan:
            assert args.confirm == ""
            assert args.expected_plan_id == ""
            print("plan_id=" + {PLAN_ID!r})
            print("FIXTURE_DORMANT_BINDER_INSTALLER_PLAN_GREEN")
        else:
            assert args.confirm == {CONFIRM!r}
            assert args.expected_plan_id == {PLAN_ID!r}
            if abnormal.exists():
                os.kill(os.getpid(), signal.SIGKILL)
            print("FIXTURE_DORMANT_BINDER_INSTALLER_APPLY_GREEN")
        """
    ).encode("utf-8")
    native_raw = b"VOID_DORMANT_BINDER_SYNTHETIC_NATIVE_V2\n"
    write_local(installer_local, installer_text)
    write_local(native_local, native_raw)

    compile_candidate(
        output=binary_local,
        fixture_root=fixture_root,
        installer_raw=installer_text,
        native_raw=native_raw,
    )
    require_static(binary_local)

    self_test = run([str(binary_local), "--self-test"])
    for marker in (
        MARKER + "_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "caller_stdin_never_python_source=true",
        "caller_stdin_must_be_devnull=true",
        "installer_generation_compile_bound=true",
        "native_candidate_generation_compile_bound=true",
        "expected_head_compile_bound=false",
        "runtime_expected_head_strict_lowercase_hex=true",
        "runtime_expected_head_forwarded_unchanged=true",
        "apply_confirmation_compile_bound=true",
        "python_generation_root_policy_bound=true",
        "private_parent_proof_fd_passed_to_installer=true",
        "parent_pid_start_executable_generation_bound=true",
        "running_python_generation_bound=true",
        "stale_candidate_lock_promoted=false",
        "protected_install_authorized=false",
    ):
        assert marker in self_test.stdout, marker

    python_real = pathlib.Path("/usr/bin/python3").resolve()
    python_raw = python_real.read_bytes()
    policy_local = temp / "policy-v1.conf"
    policy_local.write_text(
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + sha256(python_raw) + "\n"
        + "python_bytes=" + str(len(python_raw)) + "\n",
        encoding="utf-8",
    )

    preentry = (
        fixture_root / "bin/"
        "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1"
    )
    installer_remote = (
        fixture_root / "source/ops/precision/"
        "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
    )
    native_remote = (
        fixture_root / "input/"
        "void_buy_void_epoch2_dormant_binder_native_candidate_v2"
    )
    python_link = fixture_root / "python3"

    created_root: tuple[int, int] | None = None
    race: subprocess.Popen[str] | None = None
    native_race: subprocess.Popen[str] | None = None
    try:
        created_root = synthetic_fixture_directory("create", fixture_root)
        for directory in (
            fixture_root / "bin",
            fixture_root / "source",
            fixture_root / "source/ops",
            fixture_root / "source/ops/precision",
            fixture_root / "input",
        ):
            sudo(["/usr/bin/mkdir", "-p", str(directory)])
            sudo(["/usr/bin/chown", "root:root", str(directory)])
            sudo(["/usr/bin/chmod", "0755", str(directory)])

        install_file(binary_local, preentry, "0555")
        install_file(policy_local, fixture_root / "policy-v1.conf", "0444")
        install_file(installer_local, installer_remote, "0444")
        install_file(native_local, native_remote, "0444")
        sudo(["/usr/bin/ln", "-s", "/usr/bin/python3", str(python_link)])

        plan = sudo([str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD])
        assert "FIXTURE_DORMANT_BINDER_INSTALLER_PLAN_GREEN" in plan.stdout
        assert MARKER + "_GREEN" in plan.stdout
        assert "operation=installer_plan" in plan.stdout
        assert "privileged_first_entry_authenticated=true" in plan.stdout
        assert "private_parent_proof_fd_consumed_by_installer=true" in plan.stdout
        assert "parent_pid_start_executable_generation_bound=true" in plan.stdout
        assert "running_python_generation_bound=true" in plan.stdout
        assert "installer_apply_performed=false" in plan.stdout

        apply = sudo([
            str(preentry), "--installer-apply",
            "--expected-head", EXPECTED_HEAD,
            "--expected-plan-id", PLAN_ID,
            "--confirm", CONFIRM,
        ])
        assert "FIXTURE_DORMANT_BINDER_INSTALLER_APPLY_GREEN" in apply.stdout
        assert MARKER + "_GREEN" in apply.stdout
        assert "operation=installer_apply" in apply.stdout
        assert "installer_apply_child_exit_success=true" in apply.stdout

        if invocation_marker.exists():
            invocation_marker.unlink()
        wrong_confirm = sudo(
            [
                str(preentry), "--installer-apply",
                "--expected-head", EXPECTED_HEAD,
                "--expected-plan-id", PLAN_ID,
                "--confirm", "WRONG_CONFIRM",
            ],
            check=False,
        )
        assert wrong_confirm.returncode == 2
        assert "arguments_invalid" in wrong_confirm.stderr
        assert "child_process_created=false" in wrong_confirm.stderr
        assert "installer_apply_performed=false" in wrong_confirm.stderr
        assert not invocation_marker.exists()

        if invocation_marker.exists():
            invocation_marker.unlink()
        missing_head = sudo(
            [str(preentry), "--installer-plan"],
            check=False,
        )
        assert missing_head.returncode == 2
        assert "arguments_invalid" in missing_head.stderr
        assert "child_process_created=false" in missing_head.stderr
        assert not invocation_marker.exists()

        uppercase_head = sudo(
            [
                str(preentry), "--installer-plan",
                "--expected-head", EXPECTED_HEAD.upper(),
            ],
            check=False,
        )
        assert uppercase_head.returncode == 2
        assert "arguments_invalid" in uppercase_head.stderr
        assert "child_process_created=false" in uppercase_head.stderr
        assert not invocation_marker.exists()

        short_head = sudo(
            [
                str(preentry), "--installer-plan",
                "--expected-head", EXPECTED_HEAD[:-1],
            ],
            check=False,
        )
        assert short_head.returncode == 2
        assert "arguments_invalid" in short_head.stderr
        assert "child_process_created=false" in short_head.stderr
        assert not invocation_marker.exists()

        if invocation_marker.exists():
            invocation_marker.unlink()
        arbitrary_stdin = sudo(
            [str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
            check=False,
            input_text="print('ATTACKER_ROOT_PYTHON_EXECUTED')\n",
        )
        assert arbitrary_stdin.returncode == 2
        assert "stdin_python_source_forbidden" in arbitrary_stdin.stderr
        assert "child_process_created=false" in arbitrary_stdin.stderr
        assert not invocation_marker.exists()

        mutated_installer = temp / "mutated-installer.py"
        mutated_installer.write_bytes(installer_text + b"# mutation\n")
        install_file(mutated_installer, installer_remote, "0444")
        bad_installer = sudo([str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD], check=False)
        assert bad_installer.returncode == 2
        assert "installer_identity_mismatch" in bad_installer.stderr
        assert "child_process_created=false" in bad_installer.stderr
        install_file(installer_local, installer_remote, "0444")

        mutated_native = temp / "mutated-native"
        mutated_native.write_bytes(native_raw + b"mutation\n")
        install_file(mutated_native, native_remote, "0444")
        bad_native = sudo([str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD], check=False)
        assert bad_native.returncode == 2
        assert "native_input_identity_mismatch" in bad_native.stderr
        assert "child_process_created=false" in bad_native.stderr
        install_file(native_local, native_remote, "0444")

        sudo(["/usr/bin/rm", str(python_link)])
        sudo(["/usr/bin/ln", "-s", "/bin/false", str(python_link)])
        bad_python = sudo([str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD], check=False)
        assert bad_python.returncode == 2
        assert "python_identity_mismatch" in bad_python.stderr
        assert "child_process_created=false" in bad_python.stderr
        sudo(["/usr/bin/rm", str(python_link)])
        sudo(["/usr/bin/ln", "-s", "/usr/bin/python3", str(python_link)])

        # The source is descriptor-retained: replacing the visible pathname
        # while the child runs cannot change executed bytes, but parent GREEN
        # is refused after visible-generation revalidation.
        if invocation_marker.exists():
            invocation_marker.unlink()
        race = subprocess.Popen(
            ["sudo", "-n", str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
        )
        wait_for(invocation_marker)
        replacement = temp / "installer-replacement.py"
        replacement.write_bytes(installer_text)
        install_file(
            replacement,
            installer_remote.with_suffix(".replacement"),
            "0444",
        )
        sudo([
            "/usr/bin/mv", "-f",
            str(installer_remote.with_suffix(".replacement")),
            str(installer_remote),
        ])
        race_stdout, race_stderr = race.communicate(timeout=20)
        assert race.returncode == 2
        assert "FIXTURE_DORMANT_BINDER_INSTALLER_PLAN_GREEN" in race_stdout
        assert MARKER + "_GREEN" not in race_stdout
        assert "installer_generation_changed" in race_stderr
        assert "child_process_created=true" in race_stderr
        install_file(installer_local, installer_remote, "0444")

        # Replacing the visible native pathname after authenticated open cannot
        # change bytes consumed by the child. The child succeeds from the
        # retained descriptor; the parent then withholds GREEN on path drift.
        if invocation_marker.exists():
            invocation_marker.unlink()
        native_race = subprocess.Popen(
            ["sudo", "-n", str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
        )
        wait_for(invocation_marker)
        native_replacement = temp / "native-replacement"
        native_replacement.write_bytes(b"X" * len(native_raw))
        install_file(
            native_replacement,
            native_remote.with_suffix(".replacement"),
            "0444",
        )
        sudo([
            "/usr/bin/mv", "-f",
            str(native_remote.with_suffix(".replacement")),
            str(native_remote),
        ])
        native_stdout, native_stderr = native_race.communicate(timeout=20)
        assert native_race.returncode == 2
        assert "FIXTURE_DORMANT_BINDER_INSTALLER_PLAN_GREEN" in native_stdout
        assert MARKER + "_GREEN" not in native_stdout
        assert "native_input_generation_changed" in native_stderr
        assert "child_process_created=true" in native_stderr
        install_file(native_local, native_remote, "0444")

        abnormal_control.write_text("1\n", encoding="utf-8")
        abnormal = sudo(
            [
                str(preentry), "--installer-apply",
                "--expected-head", EXPECTED_HEAD,
                "--expected-plan-id", PLAN_ID,
                "--confirm", CONFIRM,
            ],
            check=False,
        )
        abnormal_control.unlink()
        assert abnormal.returncode == 2
        assert "child_not_cleanly_exited" in abnormal.stderr
        assert "child_process_created=true" in abnormal.stderr
        assert (
            "installer_apply_state=unknown_or_partial_if_child_created"
            in abnormal.stderr
        )
        assert "installer_apply_performed=false" not in abnormal.stderr

        preload_marker = temp / "preload-marker"
        preload_c = temp / "preload.c"
        preload_so = temp / "preload.so"
        preload_c.write_text(
            "#include <stdio.h>\n"
            "__attribute__((constructor)) static void mark(void){"
            f'FILE*f=fopen("{preload_marker}","w");'
            'if(f){fputs("loaded\\n",f);fclose(f);}}\n',
            encoding="utf-8",
        )
        run([
            shutil.which("cc") or "cc",
            "-shared", "-fPIC", str(preload_c), "-o", str(preload_so),
        ])
        run(["/usr/bin/true"], env={"LD_PRELOAD": str(preload_so)})
        assert preload_marker.exists()
        preload_marker.unlink()
        protected_loader = sudo_env(
            {
                "LD_PRELOAD": str(preload_so),
                "LD_LIBRARY_PATH": "/definitely/not/a/library/path",
                "LD_AUDIT": "/definitely/not/an/audit.so",
            },
            [str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
        )
        assert MARKER + "_GREEN" in protected_loader.stdout
        assert not preload_marker.exists()

        python_marker = temp / "pythonpath-marker"
        evil_dir = temp / "evil-pythonpath"
        evil_dir.mkdir()
        (evil_dir / "sitecustomize.py").write_text(
            f"open({str(python_marker)!r},'w').write('loaded\\n')\n",
            encoding="utf-8",
        )
        run([
            "/usr/bin/python3", "-c", "pass"
        ], env={"PYTHONPATH": str(evil_dir)})
        assert python_marker.exists()
        python_marker.unlink()
        protected_python = sudo_env(
            {
                "PYTHONPATH": str(evil_dir),
                "PYTHONHOME": "/definitely/not/a/python/home",
                "PYTHONSTARTUP": str(evil_dir / "sitecustomize.py"),
                "PYTHONINSPECT": "1",
                "PYTHONWARNINGS": "error",
                "PYTHONBREAKPOINT": "evil.breakpoint",
            },
            [str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
        )
        assert MARKER + "_GREEN" in protected_python.stdout
        assert not python_marker.exists()

    finally:
        synthetic_children_reaped = True
        for process in (race, native_race):
            if process is not None:
                try:
                    process.communicate(timeout=20)
                except (OSError, subprocess.SubprocessError):
                    synthetic_children_reaped = False
        assert synthetic_children_reaped, "synthetic_fixture_cleanup_refused_while_child_unreaped"
        if created_root is not None:
            assert synthetic_fixture_directory("cleanup", fixture_root, created_root) == created_root

# The exact production child is a separate positive from the adversarial
# synthetic child above. No production constant or validator is replaced.
with tempfile.TemporaryDirectory(prefix="void-e2-real-runtime-child-proof-") as td:
    temp = pathlib.Path(td)
    default_binary = temp / "default-launcher"
    compile_candidate(output=default_binary, fixture_root=None,
                      installer_raw=production_installer_raw, native_raw=accepted_native_raw)
    require_static(default_binary)
    git_checkout = temp / "prebuilt-checkout"
    empty_template = temp / "empty-template"
    git_checkout.mkdir()
    empty_template.mkdir()
    git_env = {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1", "GIT_TERMINAL_PROMPT": "0", "GIT_ALLOW_PROTOCOL": "",
        "GIT_NO_LAZY_FETCH": "1", "GIT_OPTIONAL_LOCKS": "0", "GIT_ATTR_NOSYSTEM": "1",
        "GIT_AUTHOR_NAME": "VOID exact child fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "VOID exact child fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        "GIT_AUTHOR_DATE": "2001-01-01T00:00:00Z", "GIT_COMMITTER_DATE": "2001-01-01T00:00:00Z",
    }

    def fixture_git(*args: str) -> bytes:
        completed = subprocess.run([
            "/usr/bin/git", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false",
            "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false", "-c", "core.attributesFile=/dev/null",
            "-C", str(git_checkout), *args,
        ], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env=git_env, timeout=30, check=False)
        assert completed.returncode == 0 and not completed.stderr, completed.stderr.decode("utf-8", "replace")
        return completed.stdout

    fixture_git("init", "--quiet", "--initial-branch=main", "--template=" + str(empty_template))
    (git_checkout / ".git/config").write_bytes(FIXTURE_GIT_CONFIG)
    for relative, raw in ((LOCK_REL, production_lock_raw), (BINDER_REL, production_binder_raw)):
        path = git_checkout / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        write_local(path, raw)
    fixture_git("add", "--", LOCK_REL, BINDER_REL)
    fixture_git("commit", "--quiet", "--no-gpg-sign", "-m", "Exact frozen production-child fixture inputs")
    real_head = fixture_git("rev-parse", "--verify", "HEAD").decode("ascii").strip()
    assert re.fullmatch(r"[0-9a-f]{40}", real_head)
    assert fixture_git("status", "--porcelain=v1", "--untracked-files=all") == b""
    assert fixture_git("ls-files", "-z").split(b"\0") == [BINDER_REL.encode("ascii"), LOCK_REL.encode("ascii"), b""]
    assert (git_checkout / ".git/config").read_bytes() == FIXTURE_GIT_CONFIG
    payloads = {}
    python_raw = pathlib.Path("/usr/bin/python3").resolve().read_bytes()
    policy_raw = ("schema=" + POLICY_SCHEMA + "\npython_sha256=" + sha256(python_raw)
                  + "\npython_bytes=" + str(len(python_raw)) + "\n").encode("ascii")
    for role, raw in (("launcher", default_binary.read_bytes()), ("installer", production_installer_raw),
                      ("native", accepted_native_raw), ("policy", policy_raw)):
        basename = "input-" + role
        write_local(temp / basename, raw, 0o444)
        payloads[role] = {"file": basename, "bytes": len(raw), "sha256": sha256(raw)}
    rows = []
    for index, path in enumerate(sorted(git_checkout.rglob("*"))):
        relative = str(path.relative_to(git_checkout))
        observed = path.lstat()
        if stat.S_ISDIR(observed.st_mode):
            rows.append({"path": relative, "kind": "directory"})
        else:
            assert stat.S_ISREG(observed.st_mode) and observed.st_nlink == 1
            raw = read_bound_input(path)
            basename = "checkout-input-" + str(index)
            write_local(temp / basename, raw, 0o444)
            rows.append({"path": relative, "kind": "file", "file": basename,
                         "bytes": len(raw), "sha256": sha256(raw)})
    manifest_raw = json.dumps({
        "schema": "runtime_head_v2_exact_child_fixture_v1", "head": real_head,
        "payloads": payloads, "checkout": rows,
    }, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii")
    write_local(temp / "production-manifest", manifest_raw, 0o444)
    driver = temp / "production-driver.py"
    write_local(driver, (inspect.getsource(production_fixture_driver)
                         + "\nproduction_fixture_driver()\n").encode("utf-8"), 0o444)
    print("production_child_fixture_fixed_path_creation_authorized=true", flush=True)
    print("production_child_fixture_requires_all_fixed_paths_absent=true", flush=True)
    print("production_child_fixture_native_or_binder_execution_authorized=false", flush=True)
    production_argv = ["/usr/bin/python3", "-I", "-S", "-B", str(driver), sha256(manifest_raw)]
    if os.geteuid() != 0 or os.getegid() != 0:
        production_argv = ["sudo", "-n", *production_argv]
    production = run(production_argv, timeout=240)
    assert not production.stderr, production.stderr
    for fact in (
        "REAL_PRODUCTION_CHILD_HANDOFF_GREEN",
        "production_child_parent_validator_unchanged=true",
        "production_c_default_path_exercised=true",
        "production_retained_regular_installer_fd_exercised=true",
        "production_child_ready_plan_exercised=true",
        "production_child_wrong_runtime_head_rejected=true",
        "production_child_already_green_apply_exercised=true",
        "production_child_publication_performed=false",
        "production_native_or_binder_executed=false",
        "fixture_bytes_and_mtime_ctime_preserved_during_operations=true",
        "production_fixture_cleanup_completed=true",
    ):
        assert fact in production.stdout.splitlines(), fact
    print(production.stdout, end="")
    assert read_bound_input(PRODUCTION_INSTALLER, expected_blob=PRODUCTION_INSTALLER_BLOB) == production_installer_raw
    assert read_bound_input(ROOT / LOCK_REL, expected_blob=LOCK_BLOB) == production_lock_raw
    assert read_bound_input(ROOT / BINDER_REL, expected_blob=BINDER_BLOB) == production_binder_raw
    assert read_bound_input(arguments.accepted_native, expected_bytes=ACCEPTED_NATIVE_BYTES,
                            expected_sha256=ACCEPTED_NATIVE_SHA256) == accepted_native_raw

# Trigger parity is exact and per-event; execution-command occurrences do not count.
workflow = WORKFLOW.read_text(encoding="utf-8")
trigger = workflow.split("\npermissions:", 1)[0]
expected_paths = {
    ".github/workflows/buy-void-epoch2-dormant-binder-installer-first-entry-v2.yml",
    "docs/operators/buy-void-epoch2-dormant-binder-installer-first-entry-v2.md",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_v2.c",
    "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1.c",
    LOCK_REL,
    BINDER_REL,
    "scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py",
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_v2.py",
}
for event,tail in (
    ("pull_request","  push:\n"),
    ("push","  workflow_dispatch:\n"),
):
    block = trigger.split("  "+event+":\n",1)[1].split(tail,1)[0]
    paths = {
        line.strip()[3:-1]
        for line in block.splitlines()
        if line.strip().startswith('- "')
    }
    assert paths == expected_paths,(event,paths)

print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V2_PROOF_GREEN")
print("production_default_self_matches_frozen_child_literal=true")
print("canonical_policy_v1_namespace_preserved=true")
print("exact_production_child_handoff_exercised=true")
print("production_child_create_only_publication_exercised=false")
print("static_native_first_instruction=true")
print("private_parent_proof_pipe_exercised=true")
print("parent_pid_start_executable_generation_bound=true")
print("running_python_generation_bound=true")
print("generation_macros_required_no_defaults=true")
print("runtime_expected_head_compile_bound=false")
print("runtime_expected_head_strict_lowercase_hex=true")
print("runtime_expected_head_forwarded_unchanged=true")
print("missing_runtime_head_rejected_before_child=true")
print("uppercase_runtime_head_rejected_before_child=true")
print("short_runtime_head_rejected_before_child=true")
print("stale_candidate_lock_promoted=false")
print("caller_stdin_python_rejected_before_child=true")
print("wrong_confirmation_rejected_before_child=true")
print("installer_source_generation_bound_before_python=true")
print("native_candidate_generation_bound_before_python=true")
print("python_generation_bound_before_payload=true")
print("retained_installer_descriptor_execution=true")
print("post_child_generation_revalidation=true")
print("native_candidate_descriptor_passed_to_installer=true")
print("expected_plan_id_forwarded_for_apply=true")
print("mid_child_native_path_substitution_consumes_retained_fd=true")
print("abnormal_apply_receipt_conservative=true")
print("ld_preload_dynamic_control_executes=true")
print("ld_preload_cannot_reach_static_preentry_or_python_child=true")
print("pythonpath_dynamic_control_executes=true")
print("caller_python_environment_cannot_reach_child=true")
print("protected_install_authorized=false")
print("precision_apply_performed=false")
print("credential_content_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
