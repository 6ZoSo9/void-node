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

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_CANDIDATE_V1"
SCHEMA = "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_candidate_v1"
ROOT = Path(__file__).resolve().parents[1]

SELF_REL = "scripts/prove_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_candidate_v1.py"
BOOTSTRAP_REL = "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1.c"
BOOTSTRAP_BLOB = "243583d4ed0522796b2bbf448abd4e9c28958f50"
INSTALLER_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py"
INSTALLER_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"
INSTALLER_BYTES = 42054
INSTALLER_SHA256 = "e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef"
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY"
FIXED_ROOT = "/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v1"
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


def macro_args(head: str) -> list[str]:
    return [
        '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_SHA256="' + INSTALLER_SHA256 + '"',
        "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_BYTES=" + str(INSTALLER_BYTES) + "U",
        '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD="' + head + '"',
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


def build_once(root: Path, stem: str, source_fd: int, head: str) -> tuple[bytes, list[dict[str, object]]]:
    obj = root / (stem + ".o")
    binary = root / stem
    source_path = "/proc/self/fd/" + str(source_fd)
    cp = run([
        "/usr/bin/cc",
        *COMPILE_FLAGS,
        *macro_args(head),
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
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V1_SELF_TEST_GREEN",
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


def validate(report: dict, binary: bytes) -> None:
    if report.get("schema") != SCHEMA or report.get("marker") != MARKER:
        raise AssertionError("candidate_schema_invalid")
    expected = "voidbuye2bootstrapcand1_" + sha256(
        canonical(material(report)).encode("utf-8")
    )
    if report.get("candidate_id") != expected:
        raise AssertionError("candidate_id_invalid")
    if report.get("repository_head") != git(["rev-parse", "HEAD"]):
        raise AssertionError("candidate_head_invalid")
    src = report.get("source_generation", {})
    if (
        src.get("bootstrap_source_git_blob_sha1") != BOOTSTRAP_BLOB
        or src.get("installer_source_git_blob_sha1") != INSTALLER_BLOB
        or src.get("installer_source_sha256") != INSTALLER_SHA256
        or src.get("installer_source_bytes") != INSTALLER_BYTES
    ):
        raise AssertionError("source_generation_invalid")
    binding = report.get("compile_binding", {})
    if (
        binding.get("expected_head") != report.get("repository_head")
        or binding.get("fixed_root") != FIXED_ROOT
        or binding.get("fixed_installer") != FIXED_INSTALLER
        or binding.get("fixed_python") != FIXED_PYTHON
        or binding.get("confirmation") != CONFIRM
        or binding.get("production_defaults_preserved") is not True
    ):
        raise AssertionError("compile_binding_invalid")
    result = report.get("binary", {})
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
    auth = report.get("authority", {})
    for key in (
        "candidate_accepted",
        "protected_bootstrap_install_authorized",
        "protected_installer_apply_authorized",
        "live_execution_authorized",
        "credential_access",
        "private_key_access",
        "signing",
        "transaction",
        "payment_acceptance",
        "public_presale_activation",
        "wc_void_market_activation",
        "treasury_liquidity_action",
        "funds_movement",
    ):
        if auth.get(key) is not False:
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
    for token in (
        FIXED_ROOT,
        FIXED_INSTALLER,
        FIXED_PYTHON,
        "#error installer sha required",
        "#error installer bytes required",
        "#error expected head required",
        "#error apply confirm required",
    ):
        if token not in source_text:
            raise AssertionError("production_default_or_macro_guard_missing:" + token)

    cc_before = tool_identity("/usr/bin/cc")
    strip_before = tool_identity("/usr/bin/strip")
    cc_version = run(["/usr/bin/cc", "--version"]).stdout.decode("utf-8", "strict").splitlines()[0]
    cc_machine = run(["/usr/bin/cc", "-dumpmachine"]).stdout.decode("utf-8", "strict").strip()

    fd = sealed_source(source)
    try:
        with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-candidate-v1-") as td:
            root = Path(td)
            first, inputs1 = build_once(root, "bootstrap-a", fd, head)
            second, inputs2 = build_once(root, "bootstrap-b", fd, head)
    finally:
        os.close(fd)

    if first != second:
        raise AssertionError("two_bootstrap_builds_differ")
    if inputs1 != inputs2:
        raise AssertionError("static_input_inventory_drift")
    if tool_identity("/usr/bin/cc") != cc_before:
        raise AssertionError("compiler_changed")
    if tool_identity("/usr/bin/strip") != strip_before:
        raise AssertionError("strip_changed")

    report = {
        "schema": SCHEMA,
        "marker": MARKER,
        "version": 1,
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
            "expected_head": head,
            "installer_sha256": INSTALLER_SHA256,
            "installer_bytes": INSTALLER_BYTES,
            "confirmation": CONFIRM,
            "fixed_root": FIXED_ROOT,
            "fixed_installer": FIXED_INSTALLER,
            "fixed_python": FIXED_PYTHON,
            "production_defaults_preserved": True,
            "sealed_bootstrap_source_snapshot": True,
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
    report["candidate_id"] = "voidbuye2bootstrapcand1_" + sha256(
        canonical(report).encode("utf-8")
    )
    validate(report, first)
    return report, first


def derive_dir(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=False)
    report, binary = derive()
    (output / "candidate-v1.json").write_bytes((canonical(report) + "\n").encode("utf-8"))
    target = output / "protected-install-bootstrap-v1"
    target.write_bytes(binary)
    target.chmod(0o555)
    print(MARKER + "_DERIVE_GREEN")
    print("candidate_id=" + report["candidate_id"])
    print("bootstrap_sha256=" + report["binary"]["sha256"])
    print("bootstrap_bytes=" + str(report["binary"]["bytes"]))
    print("two_builds_byte_identical=true")
    print("candidate_accepted=false")
    print("protected_bootstrap_install_authorized=false")
    print("funds_movement=false")


def compare_dir(root: Path) -> None:
    reports = sorted(root.glob("**/candidate-v1.json"))
    if len(reports) != 3:
        raise AssertionError("exactly_three_reports_required")
    binaries = [p.parent / "protected-install-bootstrap-v1" for p in reports]
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
    ):
        if token not in source:
            raise AssertionError("proof_invariant_missing:" + token)
    print(MARKER + "_SELF_TEST_GREEN")
    print("bootstrap_source_exact_head_bound=true")
    print("installer_source_exact_head_bound=true")
    print("production_defaults_preserved=true")
    print("sealed_bootstrap_source_required=true")
    print("root_protected_toolchain_required=true")
    print("two_builds_required=true")
    print("three_hosted_derivations_required=true")
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
