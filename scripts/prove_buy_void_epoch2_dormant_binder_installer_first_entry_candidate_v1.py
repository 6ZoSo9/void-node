#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import types

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_V1"
SCHEMA = "void_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_v1"
REPOSITORY = "6ZoSo9/void-node"
ROOT = Path(__file__).resolve().parents[1]

SELF_REL = "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_v1.py"
LAUNCHER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1.c"
)
LAUNCHER_BLOB = "5f1195d0c0a328be4334ad5b7f6e32b150776cab"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
INSTALLER_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"
LOCK_REL = "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
NATIVE_DERIVER_REL = "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v2.py"
NATIVE_DERIVER_BLOB = "f97cb8aff642f2f3e138fe8e087eece22223b934"

LOCK_ID = (
    "voidbuye2dormantbinderlock3_"
    "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"
)
NATIVE_CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
)
NATIVE_SHA256 = "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
NATIVE_BYTES = 726_976
APPLY_CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY"

MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_INSTALLER_BYTES = 2 * 1024 * 1024
MAX_BINARY_BYTES = 2 * 1024 * 1024
F_ADD_SEALS = getattr(fcntl, "F_ADD_SEALS", 1033)
F_GET_SEALS = getattr(fcntl, "F_GET_SEALS", 1034)
F_SEAL_SEAL = getattr(fcntl, "F_SEAL_SEAL", 0x0001)
F_SEAL_SHRINK = getattr(fcntl, "F_SEAL_SHRINK", 0x0002)
F_SEAL_GROW = getattr(fcntl, "F_SEAL_GROW", 0x0004)
F_SEAL_WRITE = getattr(fcntl, "F_SEAL_WRITE", 0x0008)
REQUIRED_SEALS = F_SEAL_SEAL | F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE

ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
}

COMPILE_FLAGS = (
    "-O2",
    "-std=c11",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-fno-ident",
    "-fno-pie",
)
LINK_FLAGS = (
    "-static",
    "-no-pie",
    "-Wl,--build-id=none",
)


def canonical(value: object) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(("blob " + str(len(raw)) + "\0").encode("ascii"))
    h.update(raw)
    return h.hexdigest()


def run(
    argv: list[str],
    *,
    cwd: Path = ROOT,
    timeout: int = 60,
    pass_fds: tuple[int, ...] = (),
    check: bool = True,
) -> subprocess.CompletedProcess[bytes]:
    cp = subprocess.run(
        argv,
        cwd=cwd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=ENV,
        timeout=timeout,
        check=False,
        pass_fds=pass_fds,
    )
    if check and cp.returncode != 0:
        raise AssertionError(
            "command_failed:"
            + argv[0]
            + ":"
            + cp.stderr.decode("utf-8", "replace")[-3000:]
        )
    return cp


def git(args: list[str]) -> str:
    cp = run(["/usr/bin/git", "-C", os.fspath(ROOT), *args], timeout=30)
    if cp.stderr:
        raise AssertionError("git_stderr:" + cp.stderr.decode("utf-8", "replace"))
    return cp.stdout.decode("utf-8", "strict").strip()


def stable_file(relative: str, maximum: int, expected_blob: str | None = None) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise AssertionError("file_metadata_invalid:" + relative)
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        if getattr(before, field) != getattr(after, field):
            raise AssertionError("file_changed:" + relative + ":" + field)
    if len(raw) != before.st_size:
        raise AssertionError("file_short_read:" + relative)
    blob = git_blob(raw)
    if expected_blob is not None and blob != expected_blob:
        raise AssertionError("file_blob_mismatch:" + relative)
    if git(["rev-parse", "HEAD:" + relative]) != blob:
        raise AssertionError("file_not_exact_head:" + relative)
    return raw


def safe_root_chain(path: Path) -> None:
    real = Path(os.path.realpath(path))
    cursor = Path(real.anchor)
    chain = [cursor]
    for part in real.parent.parts[1:]:
        cursor = cursor / part
        chain.append(cursor)
    for item in chain:
        st = item.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise AssertionError("tool_parent_not_root_protected:" + os.fspath(item))


def tool_identity(alias: str) -> dict[str, object]:
    alias_path = Path(alias)
    alias_st = alias_path.lstat()
    if alias_st.st_uid != 0:
        raise AssertionError("tool_alias_not_root_owned:" + alias)
    if not stat.S_ISLNK(alias_st.st_mode) and (
        not stat.S_ISREG(alias_st.st_mode) or stat.S_IMODE(alias_st.st_mode) & 0o022
    ):
        raise AssertionError("tool_alias_invalid:" + alias)
    safe_root_chain(alias_path)
    real = Path(os.path.realpath(alias_path))
    safe_root_chain(real)
    st = real.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
        or st.st_size < 1
        or st.st_size > 64 * 1024 * 1024
    ):
        raise AssertionError("tool_target_invalid:" + alias)
    raw = real.read_bytes()
    return {
        "alias": alias,
        "realpath": os.fspath(real),
        "bytes": len(raw),
        "sha256": sha256(raw),
        "root_owned_protected": True,
    }


def load_native_deriver() -> tuple[types.ModuleType, dict]:
    raw = stable_file(NATIVE_DERIVER_REL, 2 * 1024 * 1024, NATIVE_DERIVER_BLOB)
    module = types.ModuleType("void_e2_native_deriver_verified")
    module.__file__ = os.fspath(ROOT / NATIVE_DERIVER_REL)
    module.__package__ = None
    exec(
        compile(
            raw.decode("utf-8", "strict"),
            NATIVE_DERIVER_REL,
            "exec",
            dont_inherit=True,
            optimize=0,
        ),
        module.__dict__,
    )
    if module.MARKER != "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V2":
        raise AssertionError("native_deriver_marker_drift")
    return module, {
        "git_blob_sha1": NATIVE_DERIVER_BLOB,
        "bytes": len(raw),
        "sha256": sha256(raw),
        "executed_from_verified_bytes": True,
        "mutable_path_import": False,
    }


def accepted_lock() -> dict:
    raw = stable_file(LOCK_REL, 256 * 1024, LOCK_BLOB)
    value = json.loads(raw.decode("utf-8", "strict"))
    if (
        value.get("schema")
        != "void_buy_void_epoch2_dormant_binder_native_candidate_lock_v3"
        or value.get("lock_id") != LOCK_ID
        or value.get("candidate_accepted") is not True
        or value.get("native_binary_identity_accepted") is not True
        or value.get("protected_install_authorized") is not False
        or value.get("live_execution_authorized") is not False
        or value.get("funds_movement_authorized") is not False
    ):
        raise AssertionError("accepted_lock_contract_invalid")
    candidate = value.get("candidate_report")
    if (
        not isinstance(candidate, dict)
        or candidate.get("candidate_id") != NATIVE_CANDIDATE_ID
        or candidate.get("candidate_script_git_blob_sha1") != NATIVE_DERIVER_BLOB
        or candidate.get("native_binary_sha256") != NATIVE_SHA256
        or candidate.get("native_binary_bytes") != NATIVE_BYTES
    ):
        raise AssertionError("accepted_lock_candidate_invalid")
    return value


def rederive_accepted_native() -> tuple[bytes, dict]:
    lock = accepted_lock()
    deriver, helper = load_native_deriver()
    report, binary = deriver.derive()
    deriver.validate(report)
    if report.get("candidate_id") != NATIVE_CANDIDATE_ID:
        raise AssertionError("native_candidate_id_mismatch")
    if len(binary) != NATIVE_BYTES or sha256(binary) != NATIVE_SHA256:
        raise AssertionError("native_binary_identity_mismatch")
    locked = lock["candidate_report"]
    if (
        report.get("binary", {}).get("bytes") != locked["native_binary_bytes"]
        or report.get("binary", {}).get("sha256") != locked["native_binary_sha256"]
    ):
        raise AssertionError("native_rederivation_lock_mismatch")
    return binary, {
        "accepted_lock_id": LOCK_ID,
        "accepted_lock_git_blob_sha1": LOCK_BLOB,
        "candidate_id": NATIVE_CANDIDATE_ID,
        "candidate_deriver": helper,
        "binary_bytes": len(binary),
        "binary_sha256": sha256(binary),
        "independently_rederived": True,
    }


def sealed_source(raw: bytes) -> int:
    if not hasattr(os, "memfd_create"):
        raise AssertionError("memfd_create_unavailable")
    flags = getattr(os, "MFD_CLOEXEC", 0x0001) | getattr(os, "MFD_ALLOW_SEALING", 0x0002)
    fd = os.memfd_create("void-e2-first-entry-candidate-v1", flags)
    try:
        offset = 0
        while offset < len(raw):
            wrote = os.write(fd, raw[offset:])
            if wrote <= 0:
                raise AssertionError("sealed_source_write_failed")
            offset += wrote
        os.fsync(fd)
        fcntl.fcntl(fd, F_ADD_SEALS, REQUIRED_SEALS)
        seals = int(fcntl.fcntl(fd, F_GET_SEALS))
        if seals & REQUIRED_SEALS != REQUIRED_SEALS:
            raise AssertionError("sealed_source_required_seals_missing")
        os.lseek(fd, 0, os.SEEK_SET)
        observed = bytearray()
        while len(observed) < len(raw):
            chunk = os.read(fd, min(65536, len(raw) - len(observed)))
            if not chunk:
                raise AssertionError("sealed_source_short_read")
            observed.extend(chunk)
        if bytes(observed) != raw or os.read(fd, 1):
            raise AssertionError("sealed_source_content_drift")
        os.lseek(fd, 0, os.SEEK_SET)
        return fd
    except Exception:
        os.close(fd)
        raise


def macro_args(installer_raw: bytes, native_raw: bytes, head: str) -> list[str]:
    return [
        '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_SHA256="'
        + sha256(installer_raw)
        + '"',
        "-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_BYTES="
        + str(len(installer_raw))
        + "U",
        '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_SHA256="'
        + sha256(native_raw)
        + '"',
        "-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_BYTES="
        + str(len(native_raw))
        + "U",
        '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_EXPECTED_HEAD="' + head + '"',
        '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_APPLY_CONFIRM="'
        + APPLY_CONFIRM
        + '"',
    ]


def static_input_identity(trace: bytes, own_object: Path) -> list[dict[str, object]]:
    values: dict[str, dict[str, object]] = {}
    own_real = os.path.realpath(own_object)
    for raw_line in trace.decode("utf-8", "replace").splitlines():
        line = raw_line.strip()
        if not line.startswith("/"):
            continue
        if os.path.realpath(line) == own_real or not os.path.isfile(line):
            continue
        path = Path(line)
        safe_root_chain(path)
        st = path.lstat()
        if (
            not stat.S_ISREG(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
            or st.st_size < 1
            or st.st_size > 256 * 1024 * 1024
        ):
            raise AssertionError("static_link_input_invalid:" + line)
        data = path.read_bytes()
        values[line] = {
            "path": line,
            "bytes": len(data),
            "sha256": sha256(data),
            "root_owned_protected": True,
        }
    result = [values[key] for key in sorted(values)]
    if len(result) < 4:
        raise AssertionError("static_link_input_inventory_too_small")
    if not any(str(item["path"]).endswith("/libc.a") for item in result):
        raise AssertionError("static_libc_not_observed")
    return result


def inspect_static(binary: Path) -> dict[str, bool]:
    program = run(["/usr/bin/readelf", "-lW", os.fspath(binary)])
    dynamic = run(["/usr/bin/readelf", "-dW", os.fspath(binary)], check=False)
    ptext = program.stdout.decode("utf-8", "strict")
    dtext = (dynamic.stdout + dynamic.stderr).decode("utf-8", "replace")
    if " INTERP " in ptext or "Requesting program interpreter" in ptext:
        raise AssertionError("pt_interp_present")
    if "NEEDED" in dtext:
        raise AssertionError("dynamic_needed_present")
    return {
        "elf_static_no_interp": True,
        "elf_dynamic_needed_absent": True,
    }


def build_once(
    root: Path,
    stem: str,
    source_fd: int,
    installer_raw: bytes,
    native_raw: bytes,
    head: str,
) -> tuple[bytes, list[dict[str, object]]]:
    cc = "/usr/bin/cc"
    strip = "/usr/bin/strip"
    obj = root / (stem + ".o")
    binary = root / stem
    source_arg = "/proc/self/fd/" + str(source_fd)
    compile_cp = run(
        [
            cc,
            *COMPILE_FLAGS,
            *macro_args(installer_raw, native_raw, head),
            "-x",
            "c",
            "-c",
            "-o",
            os.fspath(obj),
            source_arg,
        ],
        pass_fds=(source_fd,),
    )
    if compile_cp.stdout or compile_cp.stderr:
        raise AssertionError("launcher_compile_produced_output")
    link_cp = run(
        [
            cc,
            *LINK_FLAGS,
            "-Wl,-t",
            "-o",
            os.fspath(binary),
            os.fspath(obj),
        ]
    )
    if link_cp.returncode != 0 or link_cp.stderr:
        raise AssertionError("launcher_link_failed_or_stderr")
    inputs = static_input_identity(link_cp.stdout, obj)
    strip_cp = run([strip, "--strip-all", os.fspath(binary)])
    if strip_cp.stdout or strip_cp.stderr:
        raise AssertionError("launcher_strip_produced_output")
    raw = binary.read_bytes()
    if len(raw) < 64 * 1024 or len(raw) > MAX_BINARY_BYTES:
        raise AssertionError("launcher_binary_size_invalid")
    inspect_static(binary)
    self_test = run([os.fspath(binary), "--self-test"])
    if self_test.stderr:
        raise AssertionError("launcher_self_test_stderr")
    output = self_test.stdout.decode("utf-8", "strict")
    for required in (
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "installer_generation_compile_bound=true",
        "native_candidate_generation_compile_bound=true",
        "expected_head_compile_bound=true",
        "apply_confirmation_compile_bound=true",
        "python_generation_root_policy_bound=true",
        "protected_install_authorized=false",
    ):
        if required not in output.splitlines():
            raise AssertionError("launcher_self_test_marker_missing:" + required)
    return raw, inputs


def repository_identity() -> tuple[str, str]:
    head = git(["rev-parse", "--verify", "HEAD"])
    tree = git(["rev-parse", "--verify", "HEAD^{tree}"])
    if len(head) != 40 or len(tree) != 40:
        raise AssertionError("repository_identity_invalid")
    if git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise AssertionError("repository_not_clean")
    return head, tree


def candidate_material(report: dict) -> dict:
    value = dict(report)
    value.pop("candidate_id", None)
    return value


def derive() -> tuple[dict, bytes]:
    head, tree = repository_identity()
    launcher_raw = stable_file(LAUNCHER_REL, MAX_SOURCE_BYTES, LAUNCHER_BLOB)
    installer_raw = stable_file(INSTALLER_REL, MAX_INSTALLER_BYTES, INSTALLER_BLOB)
    self_raw = stable_file(SELF_REL, 2 * 1024 * 1024)
    native_raw, native = rederive_accepted_native()

    cc_before = tool_identity("/usr/bin/cc")
    strip_before = tool_identity("/usr/bin/strip")
    cc_version = run(["/usr/bin/cc", "--version"]).stdout.decode("utf-8", "strict").splitlines()[0]
    cc_machine = run(["/usr/bin/cc", "-dumpmachine"]).stdout.decode("utf-8", "strict").strip()
    cc_version_number = run(["/usr/bin/cc", "-dumpversion"]).stdout.decode("utf-8", "strict").strip()

    source_fd = sealed_source(launcher_raw)
    try:
        with tempfile.TemporaryDirectory(prefix="void-e2-first-entry-candidate-v1-") as td:
            root = Path(td)
            binary_a, inputs_a = build_once(
                root, "candidate-a", source_fd, installer_raw, native_raw, head
            )
            binary_b, inputs_b = build_once(
                root, "candidate-b", source_fd, installer_raw, native_raw, head
            )
    finally:
        os.close(source_fd)

    if binary_a != binary_b:
        raise AssertionError("two_launcher_builds_differ")
    if inputs_a != inputs_b:
        raise AssertionError("static_link_input_inventory_drift")

    cc_after = tool_identity("/usr/bin/cc")
    strip_after = tool_identity("/usr/bin/strip")
    if cc_before != cc_after or strip_before != strip_after:
        raise AssertionError("toolchain_changed_during_build")

    binary_sha = sha256(binary_a)
    report = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": 1,
        "repository": REPOSITORY,
        "repository_head": head,
        "repository_tree": tree,
        "source_generation": {
            "derivation_proof_git_blob_sha1": git_blob(self_raw),
            "launcher_source_path": LAUNCHER_REL,
            "launcher_source_git_blob_sha1": LAUNCHER_BLOB,
            "launcher_source_bytes": len(launcher_raw),
            "launcher_source_sha256": sha256(launcher_raw),
            "installer_source_path": INSTALLER_REL,
            "installer_source_git_blob_sha1": INSTALLER_BLOB,
            "installer_source_bytes": len(installer_raw),
            "installer_source_sha256": sha256(installer_raw),
        },
        "accepted_native_input": native,
        "compile_binding": {
            "fixed_install_root_default_used": True,
            "fixed_python_default_used": True,
            "expected_head": head,
            "apply_confirmation": APPLY_CONFIRM,
            "installer_sha256": sha256(installer_raw),
            "installer_bytes": len(installer_raw),
            "native_sha256": sha256(native_raw),
            "native_bytes": len(native_raw),
            "sealed_launcher_source_snapshot": True,
            "required_seal_mask": REQUIRED_SEALS,
        },
        "toolchain": {
            "cc": cc_before,
            "strip": strip_before,
            "compiler_version_line": cc_version,
            "compiler_dumpmachine": cc_machine,
            "compiler_dumpversion": cc_version_number,
            "compile_flags": list(COMPILE_FLAGS),
            "link_flags": list(LINK_FLAGS),
            "static_link_inputs": inputs_a,
            "toolchain_revalidated_after_build": True,
        },
        "binary": {
            "bytes": len(binary_a),
            "sha256": binary_sha,
            "git_blob_sha1": git_blob(binary_a),
            "two_builds_byte_identical": True,
            "elf_static_no_interp": True,
            "elf_dynamic_needed_absent": True,
            "self_test_green": True,
        },
        "authority": {
            "source_only_candidate": True,
            "candidate_report_filesystem_write": True,
            "candidate_accepted": False,
            "protected_install_authorized": False,
            "precision_install_authorized": False,
            "native_or_binder_live_execution_authorized": False,
            "credential_access": False,
            "private_key_access": False,
            "signing": False,
            "transaction": False,
            "payment_acceptance": False,
            "customer_safe_to_pay": False,
            "public_presale_activation": False,
            "wc_void_market_activation": False,
            "treasury_liquidity_action": False,
            "funds_movement": False,
            "production_host_evidence_authority": False,
        },
    }
    report["candidate_id"] = (
        "voidbuye2dormantfirstentrycand1_"
        + sha256(canonical(candidate_material(report)).encode("utf-8"))
    )
    validate(report, binary_a)

    forged_source = _readdress(report)
    forged_source["source_generation"]["launcher_source_git_blob_sha1"] = "0" * 40
    forged_source = _readdress(forged_source)
    try:
        validate(forged_source, binary_a)
    except AssertionError as exc:
        if "candidate_source_generation_invalid" not in str(exc):
            raise
    else:
        raise AssertionError("readdressed_source_binding_accepted")

    forged_confirm = _readdress(report)
    forged_confirm["compile_binding"]["apply_confirmation"] = "FORGED_CONFIRMATION"
    forged_confirm = _readdress(forged_confirm)
    try:
        validate(forged_confirm, binary_a)
    except AssertionError as exc:
        if "compile_binding_invalid" not in str(exc):
            raise
    else:
        raise AssertionError("readdressed_confirmation_binding_accepted")

    forged_flags = _readdress(report)
    forged_flags["toolchain"]["compile_flags"] = [*COMPILE_FLAGS, "-w"]
    forged_flags = _readdress(forged_flags)
    try:
        validate(forged_flags, binary_a)
    except AssertionError as exc:
        if "toolchain_binding_invalid" not in str(exc):
            raise
    else:
        raise AssertionError("readdressed_toolchain_binding_accepted")

    return report, binary_a


def _hex(value: object, width: int) -> bool:
    return (
        isinstance(value, str)
        and len(value) == width
        and all(ch in "0123456789abcdef" for ch in value)
    )


def _readdress(report: dict) -> dict:
    value = json.loads(json.dumps(report))
    value["candidate_id"] = (
        "voidbuye2dormantfirstentrycand1_"
        + sha256(canonical(candidate_material(value)).encode("utf-8"))
    )
    return value


def validate(report: dict, binary: bytes) -> None:
    if (
        report.get("schema") != SCHEMA
        or report.get("marker") != MARKER
        or report.get("version") != 1
        or report.get("repository") != REPOSITORY
    ):
        raise AssertionError("candidate_report_identity_invalid")
    expected_id = (
        "voidbuye2dormantfirstentrycand1_"
        + sha256(canonical(candidate_material(report)).encode("utf-8"))
    )
    if report.get("candidate_id") != expected_id:
        raise AssertionError("candidate_id_invalid")

    current_head, current_tree = repository_identity()
    if (
        report.get("repository_head") != current_head
        or report.get("repository_tree") != current_tree
        or not _hex(report.get("repository_head"), 40)
        or not _hex(report.get("repository_tree"), 40)
    ):
        raise AssertionError("candidate_repository_generation_invalid")

    launcher_raw = stable_file(LAUNCHER_REL, MAX_SOURCE_BYTES, LAUNCHER_BLOB)
    installer_raw = stable_file(INSTALLER_REL, MAX_INSTALLER_BYTES, INSTALLER_BLOB)
    source = report.get("source_generation")
    if (
        not isinstance(source, dict)
        or not _hex(source.get("derivation_proof_git_blob_sha1"), 40)
        or source.get("launcher_source_path") != LAUNCHER_REL
        or source.get("launcher_source_git_blob_sha1") != LAUNCHER_BLOB
        or source.get("launcher_source_bytes") != len(launcher_raw)
        or source.get("launcher_source_sha256") != sha256(launcher_raw)
        or source.get("installer_source_path") != INSTALLER_REL
        or source.get("installer_source_git_blob_sha1") != INSTALLER_BLOB
        or source.get("installer_source_bytes") != len(installer_raw)
        or source.get("installer_source_sha256") != sha256(installer_raw)
    ):
        raise AssertionError("candidate_source_generation_invalid")

    compiled = report.get("compile_binding")
    if (
        not isinstance(compiled, dict)
        or compiled.get("fixed_install_root_default_used") is not True
        or compiled.get("fixed_python_default_used") is not True
        or compiled.get("expected_head") != current_head
        or compiled.get("apply_confirmation") != APPLY_CONFIRM
        or compiled.get("installer_sha256") != sha256(installer_raw)
        or compiled.get("installer_bytes") != len(installer_raw)
        or compiled.get("native_sha256") != NATIVE_SHA256
        or compiled.get("native_bytes") != NATIVE_BYTES
        or compiled.get("sealed_launcher_source_snapshot") is not True
        or compiled.get("required_seal_mask") != REQUIRED_SEALS
    ):
        raise AssertionError("compile_binding_invalid")

    toolchain = report.get("toolchain")
    if (
        not isinstance(toolchain, dict)
        or toolchain.get("cc") != tool_identity("/usr/bin/cc")
        or toolchain.get("strip") != tool_identity("/usr/bin/strip")
        or not isinstance(toolchain.get("compiler_version_line"), str)
        or not toolchain["compiler_version_line"]
        or not isinstance(toolchain.get("compiler_dumpmachine"), str)
        or not toolchain["compiler_dumpmachine"]
        or not isinstance(toolchain.get("compiler_dumpversion"), str)
        or not toolchain["compiler_dumpversion"]
        or toolchain.get("compile_flags") != list(COMPILE_FLAGS)
        or toolchain.get("link_flags") != list(LINK_FLAGS)
        or toolchain.get("toolchain_revalidated_after_build") is not True
    ):
        raise AssertionError("toolchain_binding_invalid")
    static_inputs = toolchain.get("static_link_inputs")
    if not isinstance(static_inputs, list) or len(static_inputs) < 4:
        raise AssertionError("static_link_input_inventory_invalid")
    if not any(
        isinstance(item, dict)
        and str(item.get("path", "")).endswith("/libc.a")
        for item in static_inputs
    ):
        raise AssertionError("static_libc_identity_missing")
    for item in static_inputs:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("path"), str)
            or not str(item["path"]).startswith("/")
            or not isinstance(item.get("bytes"), int)
            or item["bytes"] < 1
            or not _hex(item.get("sha256"), 64)
            or item.get("root_owned_protected") is not True
        ):
            raise AssertionError("static_link_input_identity_invalid")

    accepted = report.get("accepted_native_input")
    if (
        not isinstance(accepted, dict)
        or accepted.get("accepted_lock_id") != LOCK_ID
        or accepted.get("candidate_id") != NATIVE_CANDIDATE_ID
        or accepted.get("binary_sha256") != NATIVE_SHA256
        or accepted.get("binary_bytes") != NATIVE_BYTES
        or accepted.get("independently_rederived") is not True
    ):
        raise AssertionError("accepted_native_binding_invalid")
    result = report.get("binary")
    if (
        not isinstance(result, dict)
        or result.get("bytes") != len(binary)
        or result.get("sha256") != sha256(binary)
        or result.get("git_blob_sha1") != git_blob(binary)
        or result.get("two_builds_byte_identical") is not True
        or result.get("elf_static_no_interp") is not True
        or result.get("elf_dynamic_needed_absent") is not True
        or result.get("self_test_green") is not True
    ):
        raise AssertionError("launcher_binary_identity_invalid")
    authority = report.get("authority")
    if not isinstance(authority, dict) or authority.get("source_only_candidate") is not True:
        raise AssertionError("authority_missing")
    for key, value in authority.items():
        if key in ("source_only_candidate", "candidate_report_filesystem_write"):
            continue
        if value is not False:
            raise AssertionError("authority_overclaim:" + key)


def derive_dir(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=False)
    report, binary = derive()
    report_bytes = (canonical(report) + "\n").encode("utf-8")
    (output / "candidate-v1.json").write_bytes(report_bytes)
    target = output / "installer-first-entry-v1"
    target.write_bytes(binary)
    target.chmod(0o555)
    print(MARKER + "_DERIVE_GREEN")
    print("candidate_id=" + report["candidate_id"])
    print("repository_head=" + report["repository_head"])
    print("accepted_native_rederived=true")
    print("two_launcher_builds_byte_identical=true")
    print("launcher_binary_sha256=" + report["binary"]["sha256"])
    print("launcher_binary_bytes=" + str(report["binary"]["bytes"]))
    print("static_no_interp=true")
    print("semantic_report_validation_fail_closed=true")
    print("readdressed_source_binding_rejected=true")
    print("readdressed_confirmation_binding_rejected=true")
    print("readdressed_toolchain_binding_rejected=true")
    print("candidate_accepted=false")
    print("precision_install_authorized=false")
    print("funds_movement=false")


def compare_dir(root: Path) -> None:
    reports = sorted(root.glob("**/candidate-v1.json"))
    if len(reports) != 3:
        raise AssertionError("exactly_three_hosted_reports_required")
    binaries = [path.parent / "installer-first-entry-v1" for path in reports]
    if not all(path.is_file() for path in binaries):
        raise AssertionError("hosted_launcher_binary_missing")
    report_bytes = [path.read_bytes() for path in reports]
    binary_bytes = [path.read_bytes() for path in binaries]
    if not (report_bytes[0] == report_bytes[1] == report_bytes[2]):
        raise AssertionError("three_hosted_reports_differ")
    if not (binary_bytes[0] == binary_bytes[1] == binary_bytes[2]):
        raise AssertionError("three_hosted_binaries_differ")
    hosted = json.loads(report_bytes[0].decode("utf-8", "strict"))
    validate(hosted, binary_bytes[0])

    independent, independent_binary = derive()
    independent_bytes = (canonical(independent) + "\n").encode("utf-8")
    if independent_bytes != report_bytes[0]:
        raise AssertionError("independent_report_rederivation_differs")
    if independent_binary != binary_bytes[0]:
        raise AssertionError("independent_binary_rederivation_differs")

    print(MARKER + "_THREE_RUN_GREEN")
    print("three_run_report_bytes_identical=true")
    print("three_run_binary_bytes_identical=true")
    print("comparison_rederived_report=true")
    print("comparison_rederived_launcher_elf=true")
    print("accepted_native_rederived=true")
    print("semantic_report_validation_fail_closed=true")
    print("candidate_id=" + hosted["candidate_id"])
    print("launcher_binary_sha256=" + hosted["binary"]["sha256"])
    print("candidate_accepted=false")
    print("precision_install_authorized=false")
    print("funds_movement=false")


def self_test() -> None:
    launcher = stable_file(LAUNCHER_REL, MAX_SOURCE_BYTES, LAUNCHER_BLOB)
    installer = stable_file(INSTALLER_REL, MAX_INSTALLER_BYTES, INSTALLER_BLOB)
    lock = accepted_lock()
    deriver, helper = load_native_deriver()
    if len(launcher) < 1 or len(installer) < 1:
        raise AssertionError("source_empty")
    if lock["candidate_report"]["candidate_id"] != NATIVE_CANDIDATE_ID:
        raise AssertionError("lock_candidate_drift")
    if helper["executed_from_verified_bytes"] is not True:
        raise AssertionError("native_deriver_verified_execution_missing")
    if not callable(getattr(deriver, "derive", None)):
        raise AssertionError("native_deriver_api_missing")
    for tool in ("/usr/bin/cc", "/usr/bin/strip"):
        tool_identity(tool)
    own = stable_file(SELF_REL, 2 * 1024 * 1024)
    source = own.decode("utf-8", "strict")
    for required in (
        "rederive_accepted_native()",
        "sealed_source(launcher_raw)",
        "two_launcher_builds_differ",
        '"fixed_install_root_default_used": True',
        '"fixed_python_default_used": True',
        '"candidate_accepted": False',
        '"precision_install_authorized": False',
        "readdressed_source_binding_accepted",
        "readdressed_confirmation_binding_accepted",
        "readdressed_toolchain_binding_accepted",
    ):
        if required not in source:
            raise AssertionError("proof_invariant_missing:" + required)
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_lock_v3_bound=true")
    print("accepted_native_deriver_verified_bytes=true")
    print("accepted_native_independent_rederivation_required=true")
    print("launcher_source_exact_head_bound=true")
    print("installer_source_exact_head_bound=true")
    print("sealed_launcher_source_required=true")
    print("root_protected_compiler_and_strip_required=true")
    print("two_builds_required=true")
    print("three_hosted_derivations_required=true")
    print("semantic_report_validation_fail_closed=true")
    print("candidate_accepted=false")
    print("precision_install_authorized=false")
    print("native_or_binder_live_execution_authorized=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive-dir", type=Path)
    mode.add_argument("--compare-dir", type=Path)
    args = parser.parse_args()
    if args.self_test:
        self_test()
    elif args.derive_dir is not None:
        derive_dir(args.derive_dir)
    elif args.compare_dir is not None:
        compare_dir(args.compare_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
