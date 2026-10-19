#!/usr/bin/env python3
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_V2"
SCHEMA = "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_candidate_v2"
ROOT = Path(__file__).resolve().parents[1]

SELF_REL = "scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_candidate_v2.py"
BOOTSTRAP_REL = "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c"
BOOTSTRAP_BLOB = "19f9baf8d6d707da43dbd0e247667af1a10e46c5"
INSTALLER_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py"
INSTALLER_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"
INSTALLER_BYTES = 42054
INSTALLER_SHA256 = "e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef"
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY"
FIXED_ROOT = "/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v2"
FIXED_INSTALLER = "/home/zoso/dev/void-node/ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py"
FIXED_PYTHON = "/usr/bin/python3"

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
    "-std=c11",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-O2",
    "-fno-ident",
    "-fno-pie",
)
LINK_FLAGS = ("-static", "-no-pie", "-Wl,--build-id=none")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(("blob " + str(len(raw)) + "\0").encode("ascii"))
    h.update(raw)
    return h.hexdigest()


def canonical(v: object) -> str:
    return json.dumps(v, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def run(argv: list[str], *, timeout: int = 90, pass_fds: tuple[int, ...] = ()) -> subprocess.CompletedProcess[bytes]:
    cp = subprocess.run(
        argv,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=ENV,
        timeout=timeout,
        check=False,
        pass_fds=pass_fds,
    )
    if cp.returncode != 0:
        raise AssertionError(
            "command_failed:" + argv[0] + ":" +
            cp.stderr.decode("utf-8", "replace")[-4000:]
        )
    return cp


def git(args: list[str]) -> str:
    cp = run(["/usr/bin/git", "-C", os.fspath(ROOT), *args], timeout=30)
    if cp.stderr:
        raise AssertionError("git_stderr:" + cp.stderr.decode("utf-8", "replace"))
    return cp.stdout.decode("utf-8", "strict").strip()


def stable_file(relative: str, maximum: int, expected_blob: str | None = None) -> bytes:
    p = ROOT / relative
    before = p.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise AssertionError("file_metadata_invalid:" + relative)
    raw = p.read_bytes()
    after = p.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        if getattr(before, field) != getattr(after, field):
            raise AssertionError("file_changed:" + relative + ":" + field)
    blob = git_blob(raw)
    if expected_blob is not None and blob != expected_blob:
        raise AssertionError("file_blob_mismatch:" + relative)
    if git(["rev-parse", "HEAD:" + relative]) != blob:
        raise AssertionError("file_not_exact_head:" + relative)
    return raw


def root_protected_chain(path: Path) -> None:
    real = Path(os.path.realpath(path))
    current = Path(real.anchor)
    for part in real.parent.parts[1:]:
        st = current.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise AssertionError("tool_parent_not_root_protected:" + os.fspath(current))
        current = current / part
    st = current.lstat()
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
    ):
        raise AssertionError("tool_parent_not_root_protected:" + os.fspath(current))


def tool_identity(alias: str) -> dict[str, object]:
    alias_path = Path(alias)
    ast = alias_path.lstat()
    if ast.st_uid != 0:
        raise AssertionError("tool_alias_not_root_owned:" + alias)
    root_protected_chain(alias_path)
    real = Path(os.path.realpath(alias_path))
    root_protected_chain(real)
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


def sealed_source(raw: bytes) -> int:
    if not hasattr(os, "memfd_create"):
        raise AssertionError("memfd_create_unavailable")
    flags = getattr(os, "MFD_CLOEXEC", 0x0001) | getattr(os, "MFD_ALLOW_SEALING", 0x0002)
    fd = os.memfd_create("void-e2-bootstrap-candidate-v1", flags)
    try:
        view = memoryview(raw)
        written = 0
        while written < len(raw):
            n = os.write(fd, view[written:])
            if n <= 0:
                raise AssertionError("sealed_source_write_failed")
            written += n
        fcntl.fcntl(fd, F_ADD_SEALS, REQUIRED_SEALS)
        seals = int(fcntl.fcntl(fd, F_GET_SEALS))
        if seals & REQUIRED_SEALS != REQUIRED_SEALS:
            raise AssertionError("sealed_source_required_seals_missing")
        os.lseek(fd, 0, os.SEEK_SET)
        if os.read(fd, len(raw) + 1) != raw:
            raise AssertionError("sealed_source_content_drift")
        os.lseek(fd, 0, os.SEEK_SET)
        return fd
    except Exception:
        os.close(fd)
        raise


def macro_args() -> list[str]:
    return [
        '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_SHA256="' + INSTALLER_SHA256 + '"',
        "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_BYTES=" + str(INSTALLER_BYTES) + "U",
        '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_APPLY_CONFIRM="' + CONFIRM + '"',
    ]


def inspect_static(binary: Path) -> None:
    p = run(["/usr/bin/readelf", "-lW", os.fspath(binary)])
    d = run(["/usr/bin/readelf", "-dW", os.fspath(binary)])
    ptxt = p.stdout.decode("utf-8", "strict")
    dtxt = d.stdout.decode("utf-8", "strict")
    if " INTERP " in ptxt or "Requesting program interpreter" in ptxt:
        raise AssertionError("pt_interp_present")
    if "NEEDED" in dtxt:
        raise AssertionError("dynamic_needed_present")


def static_inputs(trace: bytes, own_object: Path) -> list[dict[str, object]]:
    out: dict[str, dict[str, object]] = {}
    own = os.path.realpath(own_object)
    for raw_line in trace.decode("utf-8", "replace").splitlines():
        line = raw_line.strip()
        if not line.startswith("/") or not os.path.isfile(line):
            continue
        if os.path.realpath(line) == own:
            continue
        p = Path(line)
        root_protected_chain(p)
        st = p.lstat()
        if (
            not stat.S_ISREG(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
            or st.st_size < 1
            or st.st_size > 256 * 1024 * 1024
        ):
            raise AssertionError("static_link_input_invalid:" + line)
        raw = p.read_bytes()
        out[line] = {
            "path": line,
            "bytes": len(raw),
            "sha256": sha256(raw),
            "root_owned_protected": True,
        }
    rows = [out[k] for k in sorted(out)]
    if not any(str(row["path"]).endswith("/libc.a") for row in rows):
        raise AssertionError("static_libc_not_observed")
    return rows


def build_once(root: Path, stem: str, source_fd: int) -> tuple[bytes, list[dict[str, object]]]:
    obj = root / (stem + ".o")
    binary = root / stem
    source_path = "/proc/self/fd/" + str(source_fd)
    cp = run([
        "/usr/bin/cc",
        *COMPILE_FLAGS,
        *macro_args(),
        "-x", "c", "-c",
        "-o", os.fspath(obj),
        source_path,
    ], pass_fds=(source_fd,))
    if cp.stdout or cp.stderr:
        raise AssertionError("compile_produced_output")
    link = run([
        "/usr/bin/cc",
        *LINK_FLAGS,
        "-Wl,-t",
        "-o", os.fspath(binary),
        os.fspath(obj),
    ])
    if link.stderr:
        raise AssertionError("link_stderr")
    inputs = static_inputs(link.stdout, obj)
    strip = run(["/usr/bin/strip", "--strip-all", os.fspath(binary)])
    if strip.stdout or strip.stderr:
        raise AssertionError("strip_output")
    raw = binary.read_bytes()
    if len(raw) < 64 * 1024 or len(raw) > 2 * 1024 * 1024:
        raise AssertionError("binary_size_invalid")
    inspect_static(binary)
    st = run([os.fspath(binary), "--self-test"])
    if st.stderr:
        raise AssertionError("self_test_stderr")
    lines = set(st.stdout.decode("utf-8", "strict").splitlines())
    for marker in (
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V2_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "exact_installer_snapshot_compile_bound=true",
        "sealed_installer_memfd_required=true",
        "fixed_python_policy_bound=true",
        "caller_stdin_must_be_devnull=true",
        "strict_plan_apply_argv=true",
        "child_environment_closed=true",
        "direct_root_python_authoritative=false",
        "protected_install_authorized=false",
        "funds_movement=false",
    ):
        if marker not in lines:
            raise AssertionError("self_test_marker_missing:" + marker)
    return raw, inputs


def material(report: dict) -> dict:
    out = dict(report)
    out.pop("candidate_id", None)
    return out


def _hex(value: object, width: int) -> bool:
    return (
        isinstance(value, str)
        and len(value) == width
        and all(ch in "0123456789abcdef" for ch in value)
    )


def _exact_keys(value: object, expected: set[str], label: str) -> dict:
    if not isinstance(value, dict) or set(value) != expected:
        raise AssertionError(label + "_keys_invalid")
    return value


def _readdress(report: dict) -> dict:
    value = json.loads(json.dumps(report))
    value["candidate_id"] = "voidbuye2bootstrapcand2_" + sha256(
        canonical(material(value)).encode("utf-8")
    )
    return value


def validate(report: dict, binary: bytes) -> None:
    _exact_keys(
        report,
        {
            "authority",
            "binary",
            "candidate_id",
            "compile_binding",
            "marker",
            "repository",
            "repository_head",
            "repository_tree",
            "schema",
            "source_generation",
            "toolchain",
            "version",
        },
        "candidate_report",
    )
    if (
        report.get("schema") != SCHEMA
        or report.get("marker") != MARKER
        or report.get("version") != 2
        or report.get("repository") != "6ZoSo9/void-node"
    ):
        raise AssertionError("candidate_schema_invalid")

    expected = "voidbuye2bootstrapcand2_" + sha256(
        canonical(material(report)).encode("utf-8")
    )
    if report.get("candidate_id") != expected:
        raise AssertionError("candidate_id_invalid")

    head = git(["rev-parse", "HEAD"])
    tree = git(["rev-parse", "HEAD^{tree}"])
    if (
        report.get("repository_head") != head
        or report.get("repository_tree") != tree
        or not _hex(report.get("repository_head"), 40)
        or not _hex(report.get("repository_tree"), 40)
    ):
        raise AssertionError("candidate_repository_generation_invalid")

    bootstrap_raw = stable_file(BOOTSTRAP_REL, 2 * 1024 * 1024, BOOTSTRAP_BLOB)
    installer_raw = stable_file(INSTALLER_REL, 2 * 1024 * 1024, INSTALLER_BLOB)
    proof_raw = stable_file(SELF_REL, 2 * 1024 * 1024)
    src = _exact_keys(
        report.get("source_generation"),
        {
            "bootstrap_source_bytes",
            "bootstrap_source_git_blob_sha1",
            "bootstrap_source_path",
            "bootstrap_source_sha256",
            "derivation_proof_git_blob_sha1",
            "installer_source_bytes",
            "installer_source_git_blob_sha1",
            "installer_source_path",
            "installer_source_sha256",
        },
        "source_generation",
    )
    if (
        src.get("derivation_proof_git_blob_sha1") != git_blob(proof_raw)
        or src.get("bootstrap_source_path") != BOOTSTRAP_REL
        or src.get("bootstrap_source_git_blob_sha1") != BOOTSTRAP_BLOB
        or src.get("bootstrap_source_bytes") != len(bootstrap_raw)
        or src.get("bootstrap_source_sha256") != sha256(bootstrap_raw)
        or src.get("installer_source_path") != INSTALLER_REL
        or src.get("installer_source_git_blob_sha1") != INSTALLER_BLOB
        or src.get("installer_source_bytes") != len(installer_raw)
        or src.get("installer_source_sha256") != sha256(installer_raw)
        or src.get("installer_source_bytes") != INSTALLER_BYTES
        or src.get("installer_source_sha256") != INSTALLER_SHA256
    ):
        raise AssertionError("source_generation_invalid")

    binding = _exact_keys(
        report.get("compile_binding"),
        {
            "confirmation",
            "fixed_installer",
            "runtime_expected_head_compile_bound",
            "runtime_expected_head_forwarded_unchanged",
            "runtime_expected_head_strict_lowercase_hex",
            "fixed_python",
            "fixed_root",
            "installer_bytes",
            "installer_sha256",
            "production_defaults_preserved",
            "sealed_bootstrap_source_snapshot",
        },
        "compile_binding",
    )
    if (
        binding.get("fixed_root") != FIXED_ROOT
        or binding.get("fixed_installer") != FIXED_INSTALLER
        or binding.get("fixed_python") != FIXED_PYTHON
        or binding.get("confirmation") != CONFIRM
        or binding.get("installer_sha256") != INSTALLER_SHA256
        or binding.get("installer_bytes") != INSTALLER_BYTES
        or binding.get("production_defaults_preserved") is not True
        or binding.get("sealed_bootstrap_source_snapshot") is not True
        or binding.get("runtime_expected_head_compile_bound") is not False
        or binding.get("runtime_expected_head_strict_lowercase_hex") is not True
        or binding.get("runtime_expected_head_forwarded_unchanged") is not True
    ):
        raise AssertionError("compile_binding_invalid")

    toolchain = _exact_keys(
        report.get("toolchain"),
        {
            "cc",
            "compile_flags",
            "compiler_dumpmachine",
            "compiler_version_line",
            "link_flags",
            "static_link_inputs",
            "strip",
            "toolchain_revalidated_after_build",
        },
        "toolchain",
    )
    expected_cc_version = (
        run(["/usr/bin/cc", "--version"])
        .stdout.decode("utf-8", "strict")
        .splitlines()[0]
    )
    expected_cc_machine = (
        run(["/usr/bin/cc", "-dumpmachine"])
        .stdout.decode("utf-8", "strict")
        .strip()
    )
    if (
        toolchain.get("cc") != tool_identity("/usr/bin/cc")
        or toolchain.get("strip") != tool_identity("/usr/bin/strip")
        or toolchain.get("compiler_version_line") != expected_cc_version
        or toolchain.get("compiler_dumpmachine") != expected_cc_machine
        or toolchain.get("compile_flags") != list(COMPILE_FLAGS)
        or toolchain.get("link_flags") != list(LINK_FLAGS)
        or toolchain.get("toolchain_revalidated_after_build") is not True
    ):
        raise AssertionError("toolchain_binding_invalid")

    static_link_inputs = toolchain.get("static_link_inputs")
    if not isinstance(static_link_inputs, list) or len(static_link_inputs) < 4:
        raise AssertionError("static_link_input_inventory_invalid")
    if not any(
        isinstance(item, dict)
        and str(item.get("path", "")).endswith("/libc.a")
        for item in static_link_inputs
    ):
        raise AssertionError("static_libc_identity_missing")
    for item in static_link_inputs:
        _exact_keys(
            item,
            {"bytes", "path", "root_owned_protected", "sha256"},
            "static_link_input",
        )
        if (
            not isinstance(item.get("path"), str)
            or not str(item["path"]).startswith("/")
            or not isinstance(item.get("bytes"), int)
            or item["bytes"] < 1
            or not _hex(item.get("sha256"), 64)
            or item.get("root_owned_protected") is not True
        ):
            raise AssertionError("static_link_input_identity_invalid")
        input_path = Path(item["path"])
        root_protected_chain(input_path)
        st = input_path.lstat()
        if (
            not stat.S_ISREG(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
            or st.st_size != item["bytes"]
            or sha256(input_path.read_bytes()) != item["sha256"]
        ):
            raise AssertionError("static_link_input_current_identity_invalid")

    result = _exact_keys(
        report.get("binary"),
        {
            "bytes",
            "dynamic_needed_absent",
            "git_blob_sha1",
            "self_test_green",
            "sha256",
            "static_no_interp",
            "two_builds_byte_identical",
        },
        "binary",
    )
    if (
        result.get("bytes") != len(binary)
        or result.get("sha256") != sha256(binary)
        or result.get("git_blob_sha1") != git_blob(binary)
        or result.get("two_builds_byte_identical") is not True
        or result.get("static_no_interp") is not True
        or result.get("dynamic_needed_absent") is not True
        or result.get("self_test_green") is not True
    ):
        raise AssertionError("binary_identity_invalid")

    auth = _exact_keys(
        report.get("authority"),
        {
            "candidate_accepted",
            "credential_access",
            "funds_movement",
            "live_execution_authorized",
            "payment_acceptance",
            "private_key_access",
            "protected_bootstrap_install_authorized",
            "protected_installer_apply_authorized",
            "public_presale_activation",
            "signing",
            "source_only_candidate",
            "transaction",
            "treasury_liquidity_action",
            "wc_void_market_activation",
        },
        "authority",
    )
    if auth.get("source_only_candidate") is not True:
        raise AssertionError("source_only_candidate_truth_invalid")
    for key, value in auth.items():
        if key == "source_only_candidate":
            continue
        if value is not False:
            raise AssertionError("authority_overclaim:" + key)


def derive() -> tuple[dict, bytes]:
    head = git(["rev-parse", "--verify", "HEAD"])
    tree = git(["rev-parse", "--verify", "HEAD^{tree}"])
    if git(["status", "--porcelain=v1", "--untracked-files=all"]) != "":
        raise AssertionError("repository_not_clean")

    source = stable_file(BOOTSTRAP_REL, 2 * 1024 * 1024, BOOTSTRAP_BLOB)
    installer = stable_file(INSTALLER_REL, 2 * 1024 * 1024, INSTALLER_BLOB)
    self_raw = stable_file(SELF_REL, 2 * 1024 * 1024)
    if len(installer) != INSTALLER_BYTES or sha256(installer) != INSTALLER_SHA256:
        raise AssertionError("installer_identity_invalid")

    source_text = source.decode("utf-8", "strict")
    if "VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD" in source_text:
        raise AssertionError("compile_time_expected_head_still_present")
    for token in (
        FIXED_ROOT,
        FIXED_INSTALLER,
        FIXED_PYTHON,
        "#error installer sha required",
        "#error installer bytes required",
        "#error apply confirm required",
        'hexn(argv[7],40)',
        'snprintf(r.expected_head,sizeof(r.expected_head),"%s",argv[7])',
        '(char*)"--expected-head",q.expected_head',
    ):
        if token not in source_text:
            raise AssertionError("production_default_or_runtime_head_contract_missing:" + token)

    cc_before = tool_identity("/usr/bin/cc")
    strip_before = tool_identity("/usr/bin/strip")
    cc_version = run(["/usr/bin/cc", "--version"]).stdout.decode("utf-8", "strict").splitlines()[0]
    cc_machine = run(["/usr/bin/cc", "-dumpmachine"]).stdout.decode("utf-8", "strict").strip()

    fd = sealed_source(source)
    try:
        with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-candidate-v2-") as td:
            root = Path(td)
            first, inputs1 = build_once(root, "bootstrap-a", fd)
            second, inputs2 = build_once(root, "bootstrap-b", fd)
    finally:
        os.close(fd)

    if first != second:
        raise AssertionError("two_bootstrap_builds_differ")
    if head.encode("ascii") in first:
        raise AssertionError("repository_head_embedded_in_bootstrap")
    if inputs1 != inputs2:
        raise AssertionError("static_input_inventory_drift")
    if tool_identity("/usr/bin/cc") != cc_before:
        raise AssertionError("compiler_changed")
    if tool_identity("/usr/bin/strip") != strip_before:
        raise AssertionError("strip_changed")

    report = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": 2,
        "repository": "6ZoSo9/void-node",
        "repository_head": head,
        "repository_tree": tree,
        "source_generation": {
            "derivation_proof_git_blob_sha1": git_blob(self_raw),
            "bootstrap_source_path": BOOTSTRAP_REL,
            "bootstrap_source_git_blob_sha1": BOOTSTRAP_BLOB,
            "bootstrap_source_bytes": len(source),
            "bootstrap_source_sha256": sha256(source),
            "installer_source_path": INSTALLER_REL,
            "installer_source_git_blob_sha1": INSTALLER_BLOB,
            "installer_source_bytes": len(installer),
            "installer_source_sha256": sha256(installer),
        },
        "compile_binding": {
            "installer_sha256": INSTALLER_SHA256,
            "installer_bytes": INSTALLER_BYTES,
            "confirmation": CONFIRM,
            "fixed_root": FIXED_ROOT,
            "fixed_installer": FIXED_INSTALLER,
            "fixed_python": FIXED_PYTHON,
            "production_defaults_preserved": True,
            "sealed_bootstrap_source_snapshot": True,
            "runtime_expected_head_compile_bound": False,
            "runtime_expected_head_strict_lowercase_hex": True,
            "runtime_expected_head_forwarded_unchanged": True,
        },
        "toolchain": {
            "cc": cc_before,
            "strip": strip_before,
            "compiler_version_line": cc_version,
            "compiler_dumpmachine": cc_machine,
            "compile_flags": list(COMPILE_FLAGS),
            "link_flags": list(LINK_FLAGS),
            "static_link_inputs": inputs1,
            "toolchain_revalidated_after_build": True,
        },
        "binary": {
            "bytes": len(first),
            "sha256": sha256(first),
            "git_blob_sha1": git_blob(first),
            "two_builds_byte_identical": True,
            "static_no_interp": True,
            "dynamic_needed_absent": True,
            "self_test_green": True,
        },
        "authority": {
            "source_only_candidate": True,
            "candidate_accepted": False,
            "protected_bootstrap_install_authorized": False,
            "protected_installer_apply_authorized": False,
            "live_execution_authorized": False,
            "credential_access": False,
            "private_key_access": False,
            "signing": False,
            "transaction": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "wc_void_market_activation": False,
            "treasury_liquidity_action": False,
            "funds_movement": False,
        },
    }
    report["candidate_id"] = "voidbuye2bootstrapcand2_" + sha256(
        canonical(report).encode("utf-8")
    )
    validate(report, first)

    forged_source = _readdress(report)
    forged_source["source_generation"]["bootstrap_source_git_blob_sha1"] = "0" * 40
    forged_source = _readdress(forged_source)
    try:
        validate(forged_source, first)
    except AssertionError as exc:
        if "source_generation_invalid" not in str(exc):
            raise
    else:
        raise AssertionError("readdressed_source_binding_accepted")

    forged_confirm = _readdress(report)
    forged_confirm["compile_binding"]["confirmation"] = "FORGED_CONFIRMATION"
    forged_confirm = _readdress(forged_confirm)
    try:
        validate(forged_confirm, first)
    except AssertionError as exc:
        if "compile_binding_invalid" not in str(exc):
            raise
    else:
        raise AssertionError("readdressed_confirmation_binding_accepted")

    forged_runtime = _readdress(report)
    forged_runtime["compile_binding"]["runtime_expected_head_compile_bound"] = True
    forged_runtime = _readdress(forged_runtime)
    try:
        validate(forged_runtime, first)
    except AssertionError as exc:
        if "compile_binding_invalid" not in str(exc):
            raise
    else:
        raise AssertionError("readdressed_runtime_head_binding_accepted")

    forged_toolchain = _readdress(report)
    forged_toolchain["toolchain"]["compile_flags"] = [*COMPILE_FLAGS, "-w"]
    forged_toolchain = _readdress(forged_toolchain)
    try:
        validate(forged_toolchain, first)
    except AssertionError as exc:
        if "toolchain_binding_invalid" not in str(exc):
            raise
    else:
        raise AssertionError("readdressed_toolchain_binding_accepted")

    return report, first


def derive_dir(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=False)
    report, binary = derive()
    (output / "candidate-v2.json").write_bytes((canonical(report) + "\n").encode("utf-8"))
    target = output / "protected-install-bootstrap-v2"
    target.write_bytes(binary)
    target.chmod(0o555)
    print(MARKER + "_DERIVE_GREEN")
    print("candidate_id=" + report["candidate_id"])
    print("bootstrap_sha256=" + report["binary"]["sha256"])
    print("bootstrap_bytes=" + str(report["binary"]["bytes"]))
    print("two_builds_byte_identical=true")
    print("repository_head_not_embedded_in_bootstrap=true")
    print("runtime_expected_head_compile_bound=false")
    print("semantic_report_validation_fail_closed=true")
    print("readdressed_source_binding_rejected=true")
    print("readdressed_confirmation_binding_rejected=true")
    print("readdressed_runtime_head_binding_rejected=true")
    print("readdressed_toolchain_binding_rejected=true")
    print("candidate_accepted=false")
    print("protected_bootstrap_install_authorized=false")
    print("funds_movement=false")


def compare_dir(root: Path) -> None:
    reports = sorted(root.glob("**/candidate-v2.json"))
    if len(reports) != 3:
        raise AssertionError("exactly_three_reports_required")
    binaries = [p.parent / "protected-install-bootstrap-v2" for p in reports]
    if not all(p.is_file() for p in binaries):
        raise AssertionError("bootstrap_binary_missing")
    rb = [p.read_bytes() for p in reports]
    bb = [p.read_bytes() for p in binaries]
    if not (rb[0] == rb[1] == rb[2]):
        raise AssertionError("hosted_reports_differ")
    if not (bb[0] == bb[1] == bb[2]):
        raise AssertionError("hosted_binaries_differ")
    hosted = json.loads(rb[0].decode("utf-8", "strict"))
    validate(hosted, bb[0])

    independent, binary = derive()
    if (canonical(independent) + "\n").encode("utf-8") != rb[0]:
        raise AssertionError("independent_report_differs")
    if binary != bb[0]:
        raise AssertionError("independent_binary_differs")

    print(MARKER + "_THREE_RUN_GREEN")
    print("three_run_report_bytes_identical=true")
    print("three_run_binary_bytes_identical=true")
    print("independent_report_rederived=true")
    print("independent_bootstrap_rederived=true")
    print("semantic_report_validation_fail_closed=true")
    print("candidate_id=" + hosted["candidate_id"])
    print("bootstrap_sha256=" + hosted["binary"]["sha256"])
    print("candidate_accepted=false")
    print("protected_bootstrap_install_authorized=false")
    print("funds_movement=false")


def self_test() -> None:
    stable_file(BOOTSTRAP_REL, 2 * 1024 * 1024, BOOTSTRAP_BLOB)
    installer = stable_file(INSTALLER_REL, 2 * 1024 * 1024, INSTALLER_BLOB)
    if len(installer) != INSTALLER_BYTES or sha256(installer) != INSTALLER_SHA256:
        raise AssertionError("installer_identity_invalid")
    for tool in ("/usr/bin/cc", "/usr/bin/strip"):
        tool_identity(tool)
    source = stable_file(SELF_REL, 2 * 1024 * 1024).decode("utf-8", "strict")
    for token in (
        "sealed_source(source)",
        "two_bootstrap_builds_differ",
        '"candidate_accepted": False',
        '"protected_bootstrap_install_authorized": False',
        '"protected_installer_apply_authorized": False',
        '"funds_movement": False',
        "readdressed_source_binding_accepted",
        "readdressed_confirmation_binding_accepted",
        "readdressed_runtime_head_binding_accepted",
        "readdressed_toolchain_binding_accepted",
    ):
        if token not in source:
            raise AssertionError("proof_invariant_missing:" + token)
    print(MARKER + "_SELF_TEST_GREEN")
    print("bootstrap_source_exact_head_bound=true")
    print("installer_source_exact_head_bound=true")
    print("production_defaults_preserved=true")
    print("runtime_expected_head_compile_bound=false")
    print("runtime_expected_head_strict_lowercase_hex=true")
    print("runtime_expected_head_forwarded_unchanged=true")
    print("sealed_bootstrap_source_required=true")
    print("root_protected_toolchain_required=true")
    print("two_builds_required=true")
    print("three_hosted_derivations_required=true")
    print("semantic_report_validation_fail_closed=true")
    print("candidate_accepted=false")
    print("protected_bootstrap_install_authorized=false")
    print("protected_installer_apply_authorized=false")
    print("funds_movement=false")


def main() -> int:
    p = argparse.ArgumentParser()
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test", action="store_true")
    g.add_argument("--derive-dir", type=Path)
    g.add_argument("--compare-dir", type=Path)
    a = p.parse_args()
    if a.self_test:
        self_test()
    elif a.derive_dir is not None:
        derive_dir(a.derive_dir)
    else:
        compare_dir(a.compare_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
