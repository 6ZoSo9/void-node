#!/usr/bin/env python3
"""Build/source proof only; never install or invoke a privileged plan/apply."""
from __future__ import annotations

import ast
import hashlib
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V3"
SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.c"
)
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py"
)
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V2_CREATE_ONLY"
PLAN_PREFIX = "voidbuye2dormantfirstentryinstall2_"
MAX_INSTALLER_BYTES = 2 * 1024 * 1024
FROZEN_SOURCES = {
    (
        "ops/precision/"
        "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c"
    ): (19_450, "19f9baf8d6d707da43dbd0e247667af1a10e46c5"),
    (
        "ops/precision/"
        "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py"
    ): (42_054, "383b84e71b371de65579e4113469e86a59b807ab"),
}
BASE_ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
}


class ProofError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def read_source(relative: str, maximum: int) -> bytes:
    path = ROOT / relative
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        before = os.fstat(fd)
        if (
            not stat.S_ISREG(before.st_mode)
            or before.st_nlink != 1
            or not 0 < before.st_size <= maximum
        ):
            raise ProofError("source_metadata_invalid:" + relative)
        chunks = []
        remaining = before.st_size
        while remaining:
            chunk = os.read(fd, min(remaining, 64 * 1024))
            if not chunk:
                raise ProofError("source_short_read:" + relative)
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            raise ProofError("source_grew:" + relative)
        after = os.fstat(fd)
        visible = path.lstat()
        for field in (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        ):
            if not getattr(before, field) == getattr(after, field) == getattr(visible, field):
                raise ProofError("source_changed:" + relative)
        return b"".join(chunks)
    finally:
        os.close(fd)


def discover_tool(names: tuple[str, ...]) -> str:
    for name in names:
        found = shutil.which(name)
        if found is not None:
            return found
    raise ProofError("required_tool_unavailable:" + ",".join(names))


def run(argv: list[str], *, check: bool = True) -> subprocess.CompletedProcess[bytes]:
    result = subprocess.run(
        argv,
        cwd=ROOT,
        env=BASE_ENV,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=60,
        check=False,
    )
    if check and result.returncode != 0:
        detail = (result.stdout + result.stderr).decode("utf-8", "replace")[-3000:]
        raise ProofError("command_failed:" + repr(argv) + ":" + detail)
    return result


def compile_args(
    compiler: str,
    source: Path,
    output: Path,
    *,
    installer_sha: str,
    installer_bytes: int,
    confirm: str = CONFIRM,
) -> list[str]:
    return [
        compiler, "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", "-static",
        '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_SHA256="' + installer_sha + '"',
        "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_BYTES=" + str(installer_bytes) + "U",
        '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_APPLY_CONFIRM="' + confirm + '"',
        os.fspath(source), "-o", os.fspath(output),
    ]


def source_contract(source_raw: bytes, installer_raw: bytes) -> None:
    source = source_raw.decode("utf-8", "strict")
    for required in (
        '#define MARKER "' + MARKER + '"',
        '"VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V3"',
        '"/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v3"',
        '"/home/zoso/dev/void-node/' + INSTALLER_REL + '"',
        '#define PLAN_PREFIX "' + PLAN_PREFIX + '"',
        'hexn(argv[7],40)',
        'snprintf(r.expected_head,sizeof(r.expected_head),"%s",argv[7])',
        '(char*)"--expected-head",q.expected_head',
        'openroot(FIXED_SELF,true,"bootstrap_self_custody_invalid")',
        'openroot(FIXED_POLICY,false,"bootstrap_policy_custody_invalid")',
        'memfd_create("void-e2-protected-install-v2",MFD_CLOEXEC|MFD_ALLOW_SEALING)',
        'fcntl(fd,F_ADD_SEALS,REQUIRED_SEALS)',
        'seals&REQUIRED_SEALS',
        'sha256fd(fd,h)',
        'strcmp(h,INSTALLER_SHA256)',
        'send(o,buf+off,(size_t)n-off,MSG_MORE)',
        'send(o,NULL,0,0)',
        '"/proc/self/fd/%d",snap',
        '(char*)"-I",(char*)"-B",script',
        'fexecve(py.fd,q.op==OP_PLAN?pa:aa,envp)',
        'if(child_created&&receipt_op==OP_APPLY)',
        'installer_apply_state=unknown_or_partial_if_child_created',
    ):
        if required not in source:
            raise ProofError("source_contract_missing:" + required)
    if "VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD" in source:
        raise ProofError("runtime_head_was_replaced_by_compile_binding")
    tree = ast.parse(installer_raw, filename=INSTALLER_REL)
    compile(tree, INSTALLER_REL, "exec", dont_inherit=True)
    constants = {}
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id in {"CONFIRM_TOKEN", "PLAN_PREFIX"}:
                    constants[target.id] = ast.literal_eval(node.value)
    if constants != {"CONFIRM_TOKEN": CONFIRM, "PLAN_PREFIX": PLAN_PREFIX}:
        raise ProofError("repaired_installer_protocol_mismatch")


def proof() -> None:
    source_raw = read_source(SOURCE_REL, 256 * 1024)
    installer_raw = read_source(INSTALLER_REL, MAX_INSTALLER_BYTES)
    for relative, (expected_bytes, expected_blob) in FROZEN_SOURCES.items():
        frozen = read_source(relative, 256 * 1024)
        if len(frozen) != expected_bytes or git_blob(frozen) != expected_blob:
            raise ProofError("frozen_source_changed:" + relative)
    source_contract(source_raw, installer_raw)
    compiler = discover_tool(("cc", "gcc", "clang", "musl-gcc"))
    readelf = discover_tool(("readelf",))
    installer_sha = sha256(installer_raw)
    with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-v3-source-proof-") as td:
        temporary = Path(td)
        source = temporary / "bootstrap.c"
        binary = temporary / "bootstrap"
        source.write_bytes(source_raw)
        args = compile_args(
            compiler, source, binary,
            installer_sha=installer_sha, installer_bytes=len(installer_raw),
        )
        for name, diagnostic in (
            ("INSTALLER_SHA256", b"installer sha required"),
            ("INSTALLER_BYTES", b"installer bytes required"),
            ("APPLY_CONFIRM", b"apply confirm required"),
        ):
            prefix = "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_" + name + "="
            missing_args = [arg for arg in args if not arg.startswith(prefix)]
            rejected = run(missing_args, check=False)
            if rejected.returncode == 0 or diagnostic not in rejected.stderr:
                raise ProofError("required_compile_parameter_not_rejected:" + name)
        built = run(args)
        if built.stdout or built.stderr:
            raise ProofError("static_build_produced_diagnostic")
        headers = run([readelf, "-lW", os.fspath(binary)])
        dynamic = run([readelf, "-dW", os.fspath(binary)])
        if re.search(rb"\bINTERP\b", headers.stdout) or b"NEEDED" in dynamic.stdout:
            raise ProofError("bootstrap_not_static")
        self_test = run([os.fspath(binary), "--self-test"])
        required_self = {
            MARKER + "_SELF_TEST_GREEN",
            "installer_snapshot_sha256=" + installer_sha,
            "installer_snapshot_bytes=" + str(len(installer_raw)),
            "static_native_first_instruction_required=true",
            "exact_installer_snapshot_compile_bound=true",
            "runtime_expected_head_strict_hex_required=true",
            "runtime_expected_head_forwarded_to_authenticated_child=true",
            "sealed_installer_memfd_required=true",
            "fixed_python_policy_bound=true",
            "caller_stdin_must_be_devnull=true",
            "strict_plan_apply_argv=true",
            "child_environment_closed=true",
            "direct_root_python_authoritative=false",
            "protected_install_authorized=false",
            "funds_movement=false",
        }
        if self_test.stderr or not required_self.issubset(set(self_test.stdout.decode().splitlines())):
            raise ProofError("bootstrap_self_test_contract_missing")
        for name, digest, count, confirm in (
            ("empty_size", installer_sha, 0, CONFIRM),
            ("oversized", installer_sha, MAX_INSTALLER_BYTES + 1, CONFIRM),
            ("wrong_confirm", installer_sha, len(installer_raw), "WRONG_CONFIRM"),
            ("malformed_digest", "g" * 64, len(installer_raw), CONFIRM),
        ):
            invalid_binary = temporary / name
            run(compile_args(
                compiler, source, invalid_binary,
                installer_sha=digest, installer_bytes=count, confirm=confirm,
            ))
            rejected = run([os.fspath(invalid_binary), "--self-test"], check=False)
            if rejected.returncode == 0 or rejected.stdout or rejected.stderr:
                raise ProofError("invalid_compile_configuration_not_rejected:" + name)
    if read_source(SOURCE_REL, 256 * 1024) != source_raw:
        raise ProofError("bootstrap_source_changed_during_proof")
    if read_source(INSTALLER_REL, MAX_INSTALLER_BYTES) != installer_raw:
        raise ProofError("installer_source_changed_during_proof")
    print(MARKER + "_SOURCE_PROOF_GREEN")
    print("bootstrap_source_sha256=" + sha256(source_raw))
    print("installer_source_sha256=" + installer_sha)
    print("installer_source_bytes=" + str(len(installer_raw)))
    print("original_v2_bootstrap_and_v1_installer_frozen=true")
    print("compiler_discovered=true")
    print("production_bootstrap_static_build=true")
    print("production_bootstrap_no_pt_interp=true")
    print("production_bootstrap_no_dynamic_needed=true")
    print("required_compile_parameters_rejected_when_absent=true")
    print("native_self_test_passed=true")
    print("native_self_test_reports_exact_repaired_installer_identity=true")
    print("invalid_self_test_configurations_rejected=true")
    print("source_contract_checks_passed=true")
    print("runtime_expected_head_retained=true")
    print("temporary_build_outputs_removed=true")
    print("bootstrap_plan_executed=false")
    print("bootstrap_apply_executed=false")
    print("privileged_fixture_executed=false")
    print("protected_install_executed=false")
    print("candidate_artifact_accepted=false")
    print("full_issue_3413_closure_proven=false")
    print("credential_access=false")
    print("funds_movement=false")


if __name__ == "__main__":
    try:
        if sys.argv[1:] not in ([], ["--self-test"]):
            raise ProofError("only_source_proof_or_self_test_mode_supported")
        proof()
    except (OSError, ValueError, SyntaxError, ProofError, subprocess.SubprocessError) as exc:
        print(MARKER + "_SOURCE_PROOF_HOLD reason=" + str(exc), file=sys.stderr)
        raise SystemExit(2)
