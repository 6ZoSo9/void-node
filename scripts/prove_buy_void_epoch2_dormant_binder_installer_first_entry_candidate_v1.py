#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_CANDIDATE_V1"
ROOT = Path(__file__).resolve().parents[1]

SOURCE_PARENT = "adc5a87d0200aa354b03d9910cbfc1cb2d59bb38"
SOURCE_PARENT_TREE = "bdd7790ee344b103e15fa1de842652ad1a83188d"

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
LOCK_ID = (
    "voidbuye2dormantbinderlock3_"
    "a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a"
)
DORMANT_CANDIDATE_ID = (
    "voidbuye2dormantbindercand2_"
    "8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d"
)
DORMANT_NATIVE_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)
DORMANT_NATIVE_BYTES = 726_976

FIRST_ENTRY_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_v1.py"
)
FIRST_ENTRY_PROOF_BLOB = "40affd58e8618567296e1a62d2c51f9edcc736e8"
INSTALLER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
INSTALLER_PROOF_BLOB = "31da472f1ef1c655ae5f06da09591aefbee7c791"
V2R_QUALIFIER_REL = (
    "ops/precision/void_buy_void_epoch2_dormant_binder_installed_qualification_v2r.py"
)
V2R_QUALIFIER_BLOB = "c1ea5912984c552f7b929d60b93d1948c42b8e1c"

EXPECTED_HEAD = SOURCE_PARENT
APPLY_CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V3_CREATE_ONLY"

CANDIDATE_PREFIX = "voidbuye2dormantentrycand1_"
HEX40 = re.compile(r"^[0-9a-f]{40}$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")

CC = Path("/usr/bin/gcc")
STRIP = Path("/usr/bin/strip")
READELF = Path("/usr/bin/readelf")
GIT = Path("/usr/bin/git")

ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/tmp",
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

F_ADD_SEALS = getattr(fcntl, "F_ADD_SEALS", 1033)
F_GET_SEALS = getattr(fcntl, "F_GET_SEALS", 1034)
F_SEAL_SEAL = getattr(fcntl, "F_SEAL_SEAL", 0x0001)
F_SEAL_SHRINK = getattr(fcntl, "F_SEAL_SHRINK", 0x0002)
F_SEAL_GROW = getattr(fcntl, "F_SEAL_GROW", 0x0004)
F_SEAL_WRITE = getattr(fcntl, "F_SEAL_WRITE", 0x0008)
REQUIRED_SEALS = F_SEAL_SEAL | F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE

EXPECTED_SELF_TEST = """VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1_SELF_TEST_GREEN
source_only=true
static_native_first_instruction_required=true
fixed_plan_apply_operation_allowlist=true
caller_stdin_never_python_source=true
caller_stdin_must_be_devnull=true
installer_generation_compile_bound=true
native_candidate_generation_compile_bound=true
expected_head_compile_bound=true
apply_confirmation_compile_bound=true
python_generation_root_policy_bound=true
installer_descriptor_retained=true
native_candidate_descriptor_retained=true
native_candidate_descriptor_passed_to_installer=true
private_parent_proof_fd_passed_to_installer=true
parent_pid_start_executable_generation_bound=true
running_python_generation_bound=true
expected_plan_id_forwarded_for_apply=true
python_descriptor_fexecve=true
child_environment_closed=true
post_child_generation_revalidation=true
stale_candidate_lock_promoted=false
protected_install_authorized=false
installer_apply_performed=false
credential_content_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
funds_movement=false
"""


def canonical(value: object) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    )


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw)
    return h.hexdigest()


def run(
    argv: list[str],
    *,
    pass_fds: tuple[int, ...] = (),
    timeout: int = 60,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[bytes]:
    result = subprocess.run(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=timeout,
        env=ENV if env is None else env,
        pass_fds=pass_fds,
    )
    return result


def git(args: list[str]) -> bytes:
    result = run([str(GIT), "-C", str(ROOT), *args], timeout=30)
    if result.returncode != 0 or result.stderr:
        raise AssertionError(
            "git command failed: " + " ".join(args) + ": "
            + result.stderr.decode("utf-8", "replace")[-1000:]
        )
    return result.stdout


def require_source_parent() -> None:
    if git(["rev-parse", "--verify", SOURCE_PARENT + "^{commit}"]).decode().strip() != SOURCE_PARENT:
        raise AssertionError("source parent commit unavailable")
    if git(["rev-parse", "--verify", SOURCE_PARENT + "^{tree}"]).decode().strip() != SOURCE_PARENT_TREE:
        raise AssertionError("source parent tree mismatch")
    ancestor = run(
        [str(GIT), "-C", str(ROOT), "merge-base", "--is-ancestor", SOURCE_PARENT, "HEAD"],
        timeout=30,
    )
    if ancestor.returncode != 0:
        raise AssertionError("source parent is not an ancestor of checkout")
    status = git(["status", "--porcelain=v1", "--untracked-files=all"])
    if status:
        raise AssertionError("checkout is not clean")


def git_object(relative: str, expected_blob: str) -> bytes:
    raw = git(["show", SOURCE_PARENT + ":" + relative])
    if git_blob_sha1(raw) != expected_blob:
        raise AssertionError("git object blob mismatch: " + relative)
    return raw


def trusted_path(path: Path, *, executable: bool | None = None) -> dict[str, object]:
    real = path.resolve(strict=True)
    current = Path("/")
    for part in real.parent.parts[1:]:
        current = current / part
        st = current.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_mode & 0o022
        ):
            raise AssertionError("tool ancestor is not root-protected: " + str(current))
    st = real.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_mode & 0o022
    ):
        raise AssertionError("tool/static input is not root-protected: " + str(real))
    if executable is True and not (st.st_mode & 0o111):
        raise AssertionError("tool is not executable: " + str(real))
    raw = real.read_bytes()
    return {
        "path": str(real),
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": stat.S_IMODE(st.st_mode),
        "bytes": len(raw),
        "sha256": sha256(raw),
    }


def toolchain_identity() -> dict[str, object]:
    cc = trusted_path(CC, executable=True)
    strip = trusted_path(STRIP, executable=True)
    readelf = trusted_path(READELF, executable=True)
    version = run([str(CC), "--version"])
    machine = run([str(CC), "-dumpmachine"])
    dumpversion = run([str(CC), "-dumpversion"])
    for result, label in (
        (version, "cc version"),
        (machine, "cc machine"),
        (dumpversion, "cc dumpversion"),
    ):
        if result.returncode != 0 or result.stderr:
            raise AssertionError(label + " query failed")
    static_inputs: dict[str, object] = {}
    for name in ("crt1.o", "crti.o", "crtn.o", "libc.a", "libgcc.a", "libgcc_eh.a"):
        found = run([str(CC), "-print-file-name=" + name])
        if found.returncode != 0 or found.stderr:
            raise AssertionError("static input lookup failed: " + name)
        value = found.stdout.decode("utf-8", "strict").strip()
        if not value or value == name:
            raise AssertionError("static input unresolved: " + name)
        static_inputs[name] = trusted_path(Path(value), executable=None)
    return {
        "cc": cc,
        "strip": strip,
        "readelf": readelf,
        "cc_version_line": version.stdout.decode("utf-8", "strict").splitlines()[0],
        "cc_dumpmachine": machine.stdout.decode("ascii", "strict").strip(),
        "cc_dumpversion": dumpversion.stdout.decode("ascii", "strict").strip(),
        "static_inputs": static_inputs,
        "root_owned_protected": True,
    }


def source_inputs() -> tuple[dict[str, object], bytes, bytes]:
    require_source_parent()
    launcher = git_object(LAUNCHER_REL, LAUNCHER_BLOB)
    installer = git_object(INSTALLER_REL, INSTALLER_BLOB)
    lock_raw = git_object(LOCK_REL, LOCK_BLOB)
    first_entry_proof = git_object(FIRST_ENTRY_PROOF_REL, FIRST_ENTRY_PROOF_BLOB)
    installer_proof = git_object(INSTALLER_PROOF_REL, INSTALLER_PROOF_BLOB)
    v2r = git_object(V2R_QUALIFIER_REL, V2R_QUALIFIER_BLOB)

    lock = json.loads(lock_raw)
    if (
        lock.get("lock_id") != LOCK_ID
        or lock.get("candidate_accepted") is not True
        or lock.get("native_binary_identity_accepted") is not True
        or lock.get("protected_install_authorized") is not False
        or lock.get("live_execution_authorized") is not False
        or lock.get("next_gate")
        != "void_buy_void_epoch2_dormant_binder_native_protected_install_v2"
    ):
        raise AssertionError("accepted V3 lock contract mismatch")
    candidate = lock.get("candidate_report")
    if (
        not isinstance(candidate, dict)
        or candidate.get("candidate_id") != DORMANT_CANDIDATE_ID
        or candidate.get("native_binary_sha256") != DORMANT_NATIVE_SHA256
        or candidate.get("native_binary_bytes") != DORMANT_NATIVE_BYTES
    ):
        raise AssertionError("accepted dormant candidate identity mismatch")

    identities = {
        "source_parent": SOURCE_PARENT,
        "source_parent_tree": SOURCE_PARENT_TREE,
        "launcher_source": {
            "path": LAUNCHER_REL,
            "git_blob_sha1": LAUNCHER_BLOB,
            "bytes": len(launcher),
            "sha256": sha256(launcher),
        },
        "installer_source": {
            "path": INSTALLER_REL,
            "git_blob_sha1": INSTALLER_BLOB,
            "bytes": len(installer),
            "sha256": sha256(installer),
        },
        "accepted_lock": {
            "path": LOCK_REL,
            "git_blob_sha1": LOCK_BLOB,
            "lock_id": LOCK_ID,
            "dormant_candidate_id": DORMANT_CANDIDATE_ID,
            "native_sha256": DORMANT_NATIVE_SHA256,
            "native_bytes": DORMANT_NATIVE_BYTES,
        },
        "first_entry_proof_git_blob_sha1": git_blob_sha1(first_entry_proof),
        "installer_proof_git_blob_sha1": git_blob_sha1(installer_proof),
        "v2r_qualifier_git_blob_sha1": git_blob_sha1(v2r),
    }
    return identities, launcher, installer


def write_all(fd: int, data: bytes) -> None:
    view = memoryview(data)
    offset = 0
    while offset < len(view):
        written = os.write(fd, view[offset:])
        if written <= 0:
            raise AssertionError("sealed source short write")
        offset += written


def read_fd(fd: int, maximum: int) -> bytes:
    os.lseek(fd, 0, os.SEEK_SET)
    parts: list[bytes] = []
    total = 0
    while True:
        chunk = os.read(fd, min(65536, maximum + 1 - total))
        if not chunk:
            break
        parts.append(chunk)
        total += len(chunk)
        if total > maximum:
            raise AssertionError("sealed source too large")
    return b"".join(parts)


def sealed_source(data: bytes) -> tuple[int, dict[str, object]]:
    if not hasattr(os, "memfd_create"):
        raise AssertionError("memfd_create unavailable")
    fd = os.memfd_create(
        "void-e2-dormant-binder-installer-first-entry-candidate-v1",
        getattr(os, "MFD_CLOEXEC", 0x0001)
        | getattr(os, "MFD_ALLOW_SEALING", 0x0002),
    )
    try:
        write_all(fd, data)
        os.fsync(fd)
        fcntl.fcntl(fd, F_ADD_SEALS, REQUIRED_SEALS)
        observed = int(fcntl.fcntl(fd, F_GET_SEALS))
        if observed & REQUIRED_SEALS != REQUIRED_SEALS:
            raise AssertionError("sealed source required seals missing")
        if read_fd(fd, 2 * 1024 * 1024) != data:
            raise AssertionError("sealed source bytes changed")
        try:
            os.pwrite(fd, b"X", 0)
        except OSError as exc:
            if exc.errno not in (errno.EPERM, errno.EBUSY):
                raise
        else:
            raise AssertionError("sealed source remained writable")
        return fd, {
            "kind": "sealed_memfd",
            "bytes": len(data),
            "sha256": sha256(data),
            "required_seal_mask": REQUIRED_SEALS,
            "observed_seal_mask": observed,
            "write_after_seal_rejected": True,
            "build_input_is_checkout_path": False,
            "build_input_is_verified_git_object_snapshot": True,
        }
    except BaseException:
        os.close(fd)
        raise


def compile_flags(installer: bytes) -> list[str]:
    return [
        "-O2",
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-fno-ident",
        "-fno-pie",
        "-static",
        "-no-pie",
        "-Wl,--build-id=none",
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_SHA256="'
            + sha256(installer) + '"'
        ),
        (
            "-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_BYTES="
            + str(len(installer)) + "U"
        ),
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_SHA256="'
            + DORMANT_NATIVE_SHA256 + '"'
        ),
        (
            "-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_BYTES="
            + str(DORMANT_NATIVE_BYTES) + "U"
        ),
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_EXPECTED_HEAD="'
            + EXPECTED_HEAD + '"'
        ),
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_APPLY_CONFIRM="'
            + APPLY_CONFIRM + '"'
        ),
    ]


def inspect_elf(raw: bytes, path: Path) -> dict[str, object]:
    if len(raw) < 64 or raw[:4] != b"\x7fELF":
        raise AssertionError("candidate is not ELF")
    if raw[4] != 2 or raw[5] != 1:
        raise AssertionError("candidate is not ELF64 little-endian")
    if int.from_bytes(raw[18:20], "little") != 62:
        raise AssertionError("candidate is not x86_64")
    ph = run([str(READELF), "-lW", str(path)])
    dyn = run([str(READELF), "-dW", str(path)])
    if ph.returncode != 0 or ph.stderr:
        raise AssertionError("readelf program-header inspection failed")
    if " INTERP " in ph.stdout.decode("utf-8", "strict"):
        raise AssertionError("candidate retains PT_INTERP")
    dyn_text = dyn.stdout.decode("utf-8", "strict")
    if dyn.returncode not in (0, 1):
        raise AssertionError("readelf dynamic inspection failed")
    if "NEEDED" in dyn_text:
        raise AssertionError("candidate has dynamic dependency")
    return {
        "elf_magic_verified": True,
        "elf64_little_endian": True,
        "machine_x86_64": True,
        "pt_interp_absent": True,
        "dynamic_needed_absent": True,
        "static_link_required": True,
    }


def compile_one(
    source_fd: int,
    installer: bytes,
    root: Path,
    stem: str,
) -> tuple[bytes, dict[str, object]]:
    output = root / stem
    argv = [
        str(CC),
        *compile_flags(installer),
        "-x",
        "c",
        f"/proc/self/fd/{source_fd}",
        "-o",
        str(output),
    ]
    result = run(argv, pass_fds=(source_fd,), timeout=90)
    if result.returncode != 0 or result.stdout or result.stderr:
        raise AssertionError(
            "candidate compile failed: "
            + result.stderr.decode("utf-8", "replace")[-3000:]
        )
    stripped = run([str(STRIP), "--strip-all", str(output)], timeout=30)
    if stripped.returncode != 0 or stripped.stdout or stripped.stderr:
        raise AssertionError("candidate strip failed")
    raw = output.read_bytes()
    elf = inspect_elf(raw, output)
    return raw, {
        "compile_flags": compile_flags(installer),
        "binary_bytes": len(raw),
        "binary_sha256": sha256(raw),
        **elf,
    }


def run_self_test(path: Path) -> tuple[bytes, str]:
    result = run([str(path), "--self-test"], timeout=20)
    if result.returncode != 0 or result.stderr:
        raise AssertionError("candidate self-test failed")
    if result.stdout.decode("utf-8", "strict") != EXPECTED_SELF_TEST:
        raise AssertionError("candidate self-test transcript mismatch")
    hostile_env = dict(ENV)
    hostile_env["LD_PRELOAD"] = "/definitely/not/a/real/library.so"
    hostile = run([str(path), "--self-test"], timeout=20, env=hostile_env)
    if (
        hostile.returncode != 0
        or hostile.stderr
        or hostile.stdout != result.stdout
    ):
        raise AssertionError("static candidate changed under hostile LD_PRELOAD")
    return result.stdout, sha256(result.stdout)


def material(report: dict[str, object]) -> dict[str, object]:
    out = dict(report)
    out.pop("candidate_id", None)
    return out


def derive() -> tuple[dict[str, object], bytes]:
    identities, launcher, installer = source_inputs()
    toolchain_before = toolchain_identity()
    fd, snapshot = sealed_source(launcher)
    try:
        with tempfile.TemporaryDirectory(
            prefix="void-e2-dormant-entry-candidate-v1-"
        ) as td:
            root = Path(td)
            binary_a, build_a = compile_one(fd, installer, root, "entry-a")
            binary_b, build_b = compile_one(fd, installer, root, "entry-b")
            if binary_a != binary_b:
                raise AssertionError("two candidate builds differ")
            if build_a != build_b:
                raise AssertionError("two candidate build records differ")
            self_test, self_test_sha = run_self_test(root / "entry-a")
    finally:
        os.close(fd)

    identities_after, launcher_after, installer_after = source_inputs()
    if (
        identities_after != identities
        or launcher_after != launcher
        or installer_after != installer
    ):
        raise AssertionError("source generation changed during derivation")
    toolchain_after = toolchain_identity()
    if toolchain_after != toolchain_before:
        raise AssertionError("toolchain changed during derivation")

    report: dict[str, object] = {
        "schema": "void_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_v1",
        "marker": MARKER,
        "version": 1,
        **identities,
        "source_snapshot": snapshot,
        "compile_contract": {
            "expected_head": EXPECTED_HEAD,
            "apply_confirmation": APPLY_CONFIRM,
            "installer_sha256": sha256(installer),
            "installer_bytes": len(installer),
            "native_candidate_sha256": DORMANT_NATIVE_SHA256,
            "native_candidate_bytes": DORMANT_NATIVE_BYTES,
            "production_default_root": (
                "/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1"
            ),
            "production_python": "/usr/bin/python3",
        },
        "toolchain": toolchain_before,
        "toolchain_revalidated_after_build": True,
        "binary": {
            "bytes": len(binary_a),
            "sha256": sha256(binary_a),
            "two_builds_byte_identical": True,
            **{
                key: value
                for key, value in build_a.items()
                if key not in ("binary_bytes", "binary_sha256", "compile_flags")
            },
        },
        "self_test": {
            "exact_transcript_verified": True,
            "stdout_sha256": self_test_sha,
            "stdout_bytes": len(self_test),
            "stderr_empty": True,
            "hostile_ld_preload_same_transcript": True,
        },
        "authority": {
            "source_only_candidate": True,
            "candidate_report_filesystem_write": True,
            "candidate_accepted": False,
            "native_binary_identity_accepted": False,
            "protected_install_authorized": False,
            "installer_apply_authorized": False,
            "dormant_binder_execution_authorized": False,
            "credential_access": False,
            "private_key_access": False,
            "signing_authorized": False,
            "transaction": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "wc_void_market_activation": False,
            "treasury_liquidity_action": False,
            "funds_movement": False,
            "production_host_evidence_authority": False,
        },
    }
    report["candidate_id"] = CANDIDATE_PREFIX + sha256(
        canonical(material(report)).encode("ascii")
    )
    validate(report)
    return report, binary_a


def validate(report: dict[str, object]) -> None:
    if report.get("marker") != MARKER or report.get("version") != 1:
        raise AssertionError("candidate marker/version invalid")
    candidate_id = report.get("candidate_id")
    if (
        not isinstance(candidate_id, str)
        or not candidate_id.startswith(CANDIDATE_PREFIX)
        or HEX64.fullmatch(candidate_id[len(CANDIDATE_PREFIX):]) is None
    ):
        raise AssertionError("candidate id invalid")
    expected_id = CANDIDATE_PREFIX + sha256(
        canonical(material(report)).encode("ascii")
    )
    if candidate_id != expected_id:
        raise AssertionError("candidate id content binding invalid")

    if report.get("source_parent") != SOURCE_PARENT:
        raise AssertionError("source parent invalid")
    if report.get("source_parent_tree") != SOURCE_PARENT_TREE:
        raise AssertionError("source parent tree invalid")

    launcher = report.get("launcher_source")
    installer = report.get("installer_source")
    if not isinstance(launcher, dict) or launcher.get("git_blob_sha1") != LAUNCHER_BLOB:
        raise AssertionError("launcher source identity invalid")
    if not isinstance(installer, dict) or installer.get("git_blob_sha1") != INSTALLER_BLOB:
        raise AssertionError("installer source identity invalid")

    accepted = report.get("accepted_lock")
    if (
        not isinstance(accepted, dict)
        or accepted.get("git_blob_sha1") != LOCK_BLOB
        or accepted.get("lock_id") != LOCK_ID
        or accepted.get("dormant_candidate_id") != DORMANT_CANDIDATE_ID
        or accepted.get("native_sha256") != DORMANT_NATIVE_SHA256
        or accepted.get("native_bytes") != DORMANT_NATIVE_BYTES
    ):
        raise AssertionError("accepted lock identity invalid")

    snapshot = report.get("source_snapshot")
    if (
        not isinstance(snapshot, dict)
        or snapshot.get("kind") != "sealed_memfd"
        or snapshot.get("write_after_seal_rejected") is not True
        or snapshot.get("build_input_is_checkout_path") is not False
        or snapshot.get("build_input_is_verified_git_object_snapshot") is not True
    ):
        raise AssertionError("sealed source snapshot invalid")

    contract = report.get("compile_contract")
    if (
        not isinstance(contract, dict)
        or contract.get("expected_head") != EXPECTED_HEAD
        or contract.get("apply_confirmation") != APPLY_CONFIRM
        or contract.get("installer_sha256") != installer.get("sha256")
        or contract.get("installer_bytes") != installer.get("bytes")
        or contract.get("native_candidate_sha256") != DORMANT_NATIVE_SHA256
        or contract.get("native_candidate_bytes") != DORMANT_NATIVE_BYTES
    ):
        raise AssertionError("compile contract invalid")

    binary = report.get("binary")
    if not isinstance(binary, dict):
        raise AssertionError("binary report missing")
    for key in (
        "two_builds_byte_identical",
        "elf_magic_verified",
        "elf64_little_endian",
        "machine_x86_64",
        "pt_interp_absent",
        "dynamic_needed_absent",
        "static_link_required",
    ):
        if binary.get(key) is not True:
            raise AssertionError("binary property invalid: " + key)
    if (
        not isinstance(binary.get("bytes"), int)
        or binary["bytes"] < 100_000
        or binary["bytes"] > 2 * 1024 * 1024
        or HEX64.fullmatch(str(binary.get("sha256", ""))) is None
    ):
        raise AssertionError("binary identity invalid")

    self_test = report.get("self_test")
    if (
        not isinstance(self_test, dict)
        or self_test.get("exact_transcript_verified") is not True
        or self_test.get("stderr_empty") is not True
        or self_test.get("hostile_ld_preload_same_transcript") is not True
        or self_test.get("stdout_sha256")
        != sha256(EXPECTED_SELF_TEST.encode("utf-8"))
    ):
        raise AssertionError("self-test evidence invalid")

    authority = report.get("authority")
    if not isinstance(authority, dict):
        raise AssertionError("authority missing")
    if authority.get("source_only_candidate") is not True:
        raise AssertionError("source-only candidate truth invalid")
    if authority.get("candidate_report_filesystem_write") is not True:
        raise AssertionError("report-write truth invalid")
    for key, value in authority.items():
        if key in ("source_only_candidate", "candidate_report_filesystem_write"):
            continue
        if value is not False:
            raise AssertionError("authority overclaim: " + key)


def derive_dir(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=False)
    report, binary = derive()
    report_bytes = (canonical(report) + "\n").encode("ascii")
    (output / "candidate-v1.json").write_bytes(report_bytes)
    candidate = output / "installer-first-entry-v1"
    candidate.write_bytes(binary)
    candidate.chmod(0o555)
    print(MARKER + "_DERIVE_GREEN")
    print("candidate_id=" + str(report["candidate_id"]))
    print("candidate_report_sha256=" + sha256(report_bytes))
    print("candidate_report_bytes=" + str(len(report_bytes)))
    print("native_binary_sha256=" + str(report["binary"]["sha256"]))
    print("native_binary_bytes=" + str(report["binary"]["bytes"]))
    print("sealed_git_object_source_snapshot=true")
    print("three_run_comparison_required=true")
    print("toolchain_root_custody_verified=true")
    print("toolchain_revalidated_after_build=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("installer_apply_authorized=false")
    print("funds_movement=false")


def compare_dir(root: Path) -> None:
    reports = sorted(root.glob("**/candidate-v1.json"))
    if len(reports) != 3:
        raise AssertionError("exactly three hosted candidate reports required")
    binaries = [path.parent / "installer-first-entry-v1" for path in reports]
    if not all(path.is_file() for path in binaries):
        raise AssertionError("hosted candidate binary missing")
    report_bytes = [path.read_bytes() for path in reports]
    binary_bytes = [path.read_bytes() for path in binaries]
    if not (report_bytes[0] == report_bytes[1] == report_bytes[2]):
        raise AssertionError("three hosted candidate reports differ")
    if not (binary_bytes[0] == binary_bytes[1] == binary_bytes[2]):
        raise AssertionError("three hosted candidate binaries differ")
    hosted = json.loads(report_bytes[0].decode("ascii"))
    validate(hosted)
    if sha256(binary_bytes[0]) != hosted["binary"]["sha256"]:
        raise AssertionError("hosted binary digest mismatch")
    if len(binary_bytes[0]) != hosted["binary"]["bytes"]:
        raise AssertionError("hosted binary size mismatch")

    independent_report, independent_binary = derive()
    independent_report_bytes = (canonical(independent_report) + "\n").encode("ascii")
    if independent_report_bytes != report_bytes[0]:
        raise AssertionError("independent candidate report differs")
    if independent_binary != binary_bytes[0]:
        raise AssertionError("independent candidate ELF differs")

    print(MARKER + "_THREE_RUN_GREEN")
    print("three_run_report_bytes_identical=true")
    print("three_run_binary_bytes_identical=true")
    print("comparison_rederived_report=true")
    print("comparison_rederived_elf=true")
    print("sealed_git_object_source_snapshot=true")
    print("toolchain_revalidated_after_build=true")
    print("candidate_id=" + str(hosted["candidate_id"]))
    print("candidate_report_sha256=" + sha256(report_bytes[0]))
    print("candidate_report_bytes=" + str(len(report_bytes[0])))
    print("native_binary_sha256=" + str(hosted["binary"]["sha256"]))
    print("native_binary_bytes=" + str(hosted["binary"]["bytes"]))
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("installer_apply_authorized=false")
    print("funds_movement=false")


def self_test() -> None:
    identities, launcher, installer = source_inputs()
    if identities["first_entry_proof_git_blob_sha1"] != FIRST_ENTRY_PROOF_BLOB:
        raise AssertionError("first-entry proof binding invalid")
    if identities["installer_proof_git_blob_sha1"] != INSTALLER_PROOF_BLOB:
        raise AssertionError("installer proof binding invalid")
    if identities["v2r_qualifier_git_blob_sha1"] != V2R_QUALIFIER_BLOB:
        raise AssertionError("V2R qualifier binding invalid")
    fd, snapshot = sealed_source(launcher)
    try:
        if read_fd(fd, 2 * 1024 * 1024) != launcher:
            raise AssertionError("self-test sealed source changed")
    finally:
        os.close(fd)
    if snapshot["build_input_is_checkout_path"] is not False:
        raise AssertionError("checkout path became build authority")
    if len(installer) < 1:
        raise AssertionError("installer source unavailable")
    toolchain = toolchain_identity()
    if toolchain.get("root_owned_protected") is not True:
        raise AssertionError("toolchain protection invalid")
    print(MARKER + "_SELF_TEST_GREEN")
    print("source_parent_bound=true")
    print("source_parent_tree_bound=true")
    print("launcher_source_blob_bound=true")
    print("installer_source_blob_bound=true")
    print("accepted_v3_lock_bound=true")
    print("dormant_native_identity_bound=true")
    print("first_entry_proof_blob_bound=true")
    print("installer_proof_blob_bound=true")
    print("v2r_qualifier_blob_bound=true")
    print("sealed_git_object_source_snapshot=true")
    print("checkout_path_is_not_build_authority=true")
    print("toolchain_root_custody_verified=true")
    print("expected_head_compile_bound=" + EXPECTED_HEAD)
    print("apply_confirmation_compile_bound=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("installer_apply_authorized=false")
    print("credential_access=false")
    print("signing_authorized=false")
    print("transaction=false")
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
    else:
        assert args.compare_dir is not None
        compare_dir(args.compare_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
