#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
from typing import Any

MARKER = "VOID_APOLLYON_CLAIM_PROTECTED_FIRST_ENTRY_STATIC_CANDIDATE_V1"
ROOT = Path(__file__).resolve().parents[2]
SELF_REL = "ops/xiphos/apollyon_claim_protected_first_entry_static_candidate_v1.py"
PARENT_HEAD = "a149fe2fbac4cb8bb11ed049dfb12a1d0110bfae"
PREDECESSOR_PROOF_REL = "scripts/prove_apollyon_claim_protected_first_entry_v1.py"
PREDECESSOR_PROOF_BLOB = "598c195252a17b7e4839763387c1970ea13c3b45"
FIXED_SELF = (
    "/opt/void-apollyon-claim-protected-first-entry-v1/bin/"
    "apollyon_claim_protected_first_entry_v1"
)

PINNED = {
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.c":
        "53f93f3c243bdcb9ef8a694825c355ec67fd567f",
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.h":
        "93ce0ba35d5bfc94261c3d18821e857b96870d32",
    "scripts/apollyon_claim_protected_first_entry_v1_selftest.c":
        "cd6d969cb9578ac32620be60822ff743803146ab",
    "docs/security/apollyon-claim-protected-first-entry-v1.md":
        "c806bb973660be2cc5631fc18552944453d4cbc4",
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.c":
        "475b0e06605a64ba885c027d2163e87ab0fa0cfa",
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.h":
        "858da1f2277864fc67776cfb064822c23c902cd5",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.c":
        "5f80eb9b5d7f0822d88e3ef05f6a565e1b4539c1",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.h":
        "ebdbac74011191ff159d87e75a7237fe808926a6",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.c":
        "4643a5bcdee0f20d5e60c53dcbae0e9b0bc50450",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.h":
        "fcaeda18f03c09b253e45870d0f454183fd9077c",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c":
        "b507d8d5bff32b39be998482efe3c0e8b729cefe",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.h":
        "2ff84bb8f04ba3bc935272175fb8056624e2222a",
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c":
        "ecc262686cdc388d08775c735c68430e737e40d5",
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.h":
        "5355ffd2856e0f0c57f6e52fd1b347441b94e4d7",
    PREDECESSOR_PROOF_REL: PREDECESSOR_PROOF_BLOB,
}

BUILD_SOURCES = [
    "ops/xiphos/apollyon_durable_attempt_claim_native_process_identity_v2.c",
    "ops/xiphos/apollyon_claim_task_singleton_guard_v1.c",
    "ops/xiphos/apollyon_claim_no_clone_lock_v1.c",
    "ops/xiphos/apollyon_claim_self_observed_lock_v1.c",
    "ops/xiphos/apollyon_claim_no_exec_lock_v1.c",
    "ops/xiphos/apollyon_claim_protected_first_entry_v1.c",
    "scripts/apollyon_claim_protected_first_entry_v1_selftest.c",
]

COMPILE_FLAGS = [
    "-std=c11",
    "-O2",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-fno-ident",
    "-fno-pie",
    "-pthread",
    "-Iops/xiphos",
]
LINK_FLAGS = ["-static", "-no-pie", "-Wl,--build-id=none"]

ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "SOURCE_DATE_EPOCH": "0",
    "GIT_CONFIG_NOSYSTEM": "1",
    "GIT_CONFIG_GLOBAL": "/dev/null",
    "GIT_CONFIG_SYSTEM": "/dev/null",
    "GIT_NO_REPLACE_OBJECTS": "1",
    "GIT_OPTIONAL_LOCKS": "0",
    "GIT_TERMINAL_PROMPT": "0",
    "GIT_NO_LAZY_FETCH": "1",
    "GIT_ALLOW_PROTOCOL": "",
}

MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_TOOL_BYTES = 256 * 1024 * 1024
MIN_BINARY_BYTES = 100_000
MAX_BINARY_BYTES = 4 * 1024 * 1024

AUTHORITY = {
    "source_only_candidate": True,
    "candidate_report_filesystem_write": True,
    "static_binary_build_performed": True,
    "candidate_accepted": False,
    "binary_identity_accepted": False,
    "protected_install_authorized": False,
    "xiphos_host_qualification_performed": False,
    "protected_expected_source_origin_proven": False,
    "durable_attempt_claim_authorized": False,
    "durable_attempt_claim_performed": False,
    "trainer_release_authorized": False,
    "training_execution_authorized": False,
    "training_execution_performed": False,
    "credential_access": False,
    "private_key_access": False,
    "signing": False,
    "wallet_access": False,
    "transaction": False,
    "funds_movement": False,
}


class CandidateError(RuntimeError):
    pass


def hold(reason: str) -> None:
    raise CandidateError(reason)


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def run(
    argv: list[str],
    *,
    cwd: Path = ROOT,
    timeout: int = 90,
) -> subprocess.CompletedProcess[bytes]:
    try:
        cp = subprocess.run(
            argv,
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=ENV,
            timeout=timeout,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise CandidateError("command_execution_failed:" + argv[0]) from exc
    return cp


def git(*args: str) -> str:
    cp = run(["/usr/bin/git", "-C", os.fspath(ROOT), *args], timeout=30)
    if cp.returncode != 0 or cp.stderr:
        hold("git_command_failed:" + args[0])
    try:
        return cp.stdout.decode("utf-8", "strict").strip()
    except UnicodeError as exc:
        raise CandidateError("git_output_invalid") from exc


def stable_file(relative: str, expected_blob: str | None = None) -> bytes:
    path = ROOT / relative
    try:
        before = path.lstat()
    except OSError as exc:
        raise CandidateError("source_unavailable:" + relative) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_SOURCE_BYTES
    ):
        hold("source_metadata_invalid:" + relative)
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
        "st_size", "st_mtime_ns", "st_ctime_ns",
    ):
        if getattr(before, field) != getattr(after, field):
            hold("source_generation_changed:" + relative)
    if len(raw) != before.st_size:
        hold("source_short_read:" + relative)
    blob = git_blob(raw)
    if expected_blob is not None and blob != expected_blob:
        hold("source_blob_mismatch:" + relative)
    if git("rev-parse", "HEAD:" + relative) != blob:
        hold("source_not_exact_head:" + relative)
    return raw


def tool_identity(alias: str) -> dict[str, object]:
    alias_path = Path(alias)
    try:
        alias_st = alias_path.lstat()
    except OSError as exc:
        raise CandidateError("tool_alias_unavailable:" + alias) from exc
    if alias_st.st_uid != 0 or (
        stat.S_ISREG(alias_st.st_mode)
        and stat.S_IMODE(alias_st.st_mode) & 0o022
    ):
        hold("tool_alias_custody_invalid:" + alias)
    if not (stat.S_ISREG(alias_st.st_mode) or stat.S_ISLNK(alias_st.st_mode)):
        hold("tool_alias_type_invalid:" + alias)

    real = Path(os.path.realpath(alias_path))
    st = real.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
        or st.st_size < 1
        or st.st_size > MAX_TOOL_BYTES
    ):
        hold("tool_target_custody_invalid:" + alias)
    raw = real.read_bytes()
    return {
        "alias": alias,
        "realpath": os.fspath(real),
        "bytes": len(raw),
        "sha256": sha256(raw),
        "mode": format(stat.S_IMODE(st.st_mode), "04o"),
        "uid": st.st_uid,
        "gid": st.st_gid,
    }


def source_generation() -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    for relative in sorted(PINNED):
        raw = stable_file(relative, PINNED[relative])
        result.append({
            "path": relative,
            "git_blob_sha1": PINNED[relative],
            "bytes": len(raw),
            "sha256": sha256(raw),
        })
    return result


def repository_lineage() -> dict[str, str]:
    head = git("rev-parse", "--verify", "HEAD^{commit}")
    cp = run([
        "/usr/bin/git", "-C", os.fspath(ROOT),
        "merge-base", "--is-ancestor", PARENT_HEAD, head,
    ], timeout=30)
    if cp.returncode != 0 or cp.stdout or cp.stderr:
        hold("accepted_parent_not_ancestor")
    return {"head": head, "accepted_parent": PARENT_HEAD}


def inspect_static(path: Path) -> dict[str, object]:
    program = run(["/usr/bin/readelf", "-lW", os.fspath(path)])
    dynamic = run(["/usr/bin/readelf", "-dW", os.fspath(path)])
    header = run(["/usr/bin/readelf", "-hW", os.fspath(path)])
    if program.returncode != 0 or program.stderr:
        hold("readelf_program_failed")
    if dynamic.returncode != 0 or dynamic.stderr:
        hold("readelf_dynamic_failed")
    if header.returncode != 0 or header.stderr:
        hold("readelf_header_failed")
    ptext = program.stdout.decode("utf-8", "strict")
    dtext = dynamic.stdout.decode("utf-8", "strict")
    htext = header.stdout.decode("utf-8", "strict")
    if " INTERP " in ptext or "Requesting program interpreter" in ptext:
        hold("candidate_interp_present")
    if "NEEDED" in dtext:
        hold("candidate_dynamic_needed_present")
    if "Type:" not in htext or "EXEC (Executable file)" not in htext:
        hold("candidate_elf_type_invalid")
    if "Machine:" not in htext or "X86-64" not in htext:
        hold("candidate_machine_invalid")
    return {
        "elf_static_no_interp": True,
        "elf_dynamic_needed_absent": True,
        "elf_type_exec": True,
        "elf_machine_x86_64": True,
    }


def build_once(root: Path, name: str) -> bytes:
    output = root / name
    cp = run([
        "/usr/bin/gcc",
        *COMPILE_FLAGS,
        *BUILD_SOURCES,
        *LINK_FLAGS,
        "-o",
        os.fspath(output),
    ])
    if cp.returncode != 0:
        raise CandidateError(
            "candidate_compile_failed:"
            + cp.stderr.decode("utf-8", "replace")[-2000:]
        )
    if cp.stdout or cp.stderr:
        hold("candidate_compile_unexpected_output")
    raw = output.read_bytes()
    if (
        len(raw) < MIN_BINARY_BYTES
        or len(raw) > MAX_BINARY_BYTES
        or not raw.startswith(b"\x7fELF")
    ):
        hold("candidate_binary_shape_invalid")
    inspect_static(output)
    if FIXED_SELF.encode("ascii") not in raw:
        hold("production_fixed_self_not_embedded")
    return raw


def candidate_material(report: dict[str, Any]) -> dict[str, Any]:
    value = json.loads(json.dumps(report))
    value.pop("candidate_id", None)
    return value


def validate(report: dict[str, Any], binary: bytes) -> None:
    expected_keys = {
        "marker", "version", "repository", "predecessor", "candidate_tool",
        "source_generation", "compile_contract", "toolchain", "binary",
        "candidate_semantics", "authority", "next_gate", "candidate_id",
    }
    if set(report) != expected_keys:
        hold("candidate_report_keys_invalid")
    if report.get("marker") != MARKER or report.get("version") != 1:
        hold("candidate_report_identity_invalid")
    expected_id = (
        "apollyon_claim_protected_first_entry_static_candidate_v1:"
        + sha256(canonical(candidate_material(report)))
    )
    if report.get("candidate_id") != expected_id:
        hold("candidate_id_invalid")

    if report.get("repository") != repository_lineage():
        hold("candidate_repository_generation_invalid")

    predecessor = report.get("predecessor", {})
    if predecessor != {
        "proof_path": PREDECESSOR_PROOF_REL,
        "proof_git_blob_sha1": PREDECESSOR_PROOF_BLOB,
        "protected_first_entry_source_accepted": True,
        "static_first_instruction_predecessor_hold_preserved": True,
    }:
        hold("predecessor_proof_binding_invalid")

    self_raw = stable_file(SELF_REL)
    if report.get("candidate_tool") != {
        "path": SELF_REL,
        "git_blob_sha1": git_blob(self_raw),
        "bytes": len(self_raw),
        "sha256": sha256(self_raw),
    }:
        hold("candidate_tool_binding_invalid")

    if report.get("source_generation") != source_generation():
        hold("candidate_source_generation_invalid")

    compiled = report.get("compile_contract", {})
    if compiled != {
        "fixed_self": FIXED_SELF,
        "required_uid": 0,
        "required_gid": 0,
        "production_defaults_used": True,
        "compile_flags": COMPILE_FLAGS,
        "link_flags": LINK_FLAGS,
        "compile_time_test_overrides": False,
    }:
        hold("compile_contract_invalid")

    version = run(["/usr/bin/gcc", "--version"])
    machine = run(["/usr/bin/gcc", "-dumpmachine"])
    fullversion = run(["/usr/bin/gcc", "-dumpfullversion", "-dumpversion"])
    if (
        version.returncode != 0 or version.stderr
        or machine.returncode != 0 or machine.stderr
        or fullversion.returncode != 0 or fullversion.stderr
    ):
        hold("compiler_identity_query_failed")
    expected_toolchain = {
        "gcc": tool_identity("/usr/bin/gcc"),
        "readelf": tool_identity("/usr/bin/readelf"),
        "gcc_version_line": version.stdout.decode("utf-8", "strict").splitlines()[0],
        "gcc_dumpmachine": machine.stdout.decode("ascii", "strict").strip(),
        "gcc_dumpversion": fullversion.stdout.decode("ascii", "strict").strip(),
        "toolchain_revalidated_after_build": True,
    }
    if report.get("toolchain") != expected_toolchain:
        hold("candidate_toolchain_generation_invalid")

    observed = report.get("binary", {})
    expected_binary_keys = {
        "bytes",
        "sha256",
        "git_blob_sha1",
        "three_builds_byte_identical",
        "elf_static_no_interp",
        "elf_dynamic_needed_absent",
        "elf_type_exec",
        "elf_machine_x86_64",
        "production_fixed_self_embedded",
        "validator_reinspected_supplied_binary",
        "validator_independent_rebuild_byte_identical",
    }
    if (
        not isinstance(observed, dict)
        or set(observed) != expected_binary_keys
    ):
        hold("candidate_binary_keys_invalid")
    if (
        observed.get("bytes") != len(binary)
        or observed.get("sha256") != sha256(binary)
        or observed.get("git_blob_sha1") != git_blob(binary)
        or observed.get("three_builds_byte_identical") is not True
        or observed.get("elf_static_no_interp") is not True
        or observed.get("elf_dynamic_needed_absent") is not True
        or observed.get("elf_type_exec") is not True
        or observed.get("elf_machine_x86_64") is not True
        or observed.get("production_fixed_self_embedded") is not True
        or observed.get("validator_reinspected_supplied_binary") is not True
        or observed.get("validator_independent_rebuild_byte_identical") is not True
    ):
        hold("candidate_binary_identity_invalid")
    if (
        len(binary) < MIN_BINARY_BYTES
        or len(binary) > MAX_BINARY_BYTES
        or not binary.startswith(b"\x7fELF")
        or FIXED_SELF.encode("ascii") not in binary
    ):
        hold("candidate_supplied_binary_shape_invalid")
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-static-candidate-validate-v1-"
    ) as td:
        validation_root = Path(td)
        supplied = validation_root / "supplied"
        supplied.write_bytes(binary)
        supplied.chmod(0o555)
        static = inspect_static(supplied)
        if static != {
            "elf_static_no_interp": True,
            "elf_dynamic_needed_absent": True,
            "elf_type_exec": True,
            "elf_machine_x86_64": True,
        }:
            hold("candidate_supplied_binary_static_identity_invalid")
        rebuild_root = validation_root / "rebuild"
        rebuild_root.mkdir(mode=0o700)
        rebuilt = build_once(rebuild_root, "candidate")
        if rebuilt != binary:
            hold("candidate_independent_rebuild_mismatch")

    if report.get("candidate_semantics") != {
        "static_first_instruction_candidate_evidence": True,
        "binary_identity_acceptance_required_next": True,
        "protected_install_and_host_qualification_required_next": True,
        "protected_expected_source_origin_proven": False,
    }:
        hold("candidate_semantics_invalid")

    if report.get("authority") != AUTHORITY:
        hold("candidate_authority_invalid")
    if report.get("next_gate") != (
        "apollyon_claim_protected_first_entry_static_candidate_lock_v1"
    ):
        hold("candidate_next_gate_invalid")


def derive() -> tuple[dict[str, Any], bytes]:
    repository = repository_lineage()
    sources_before = source_generation()
    self_raw = stable_file(SELF_REL)

    gcc_before = tool_identity("/usr/bin/gcc")
    readelf_before = tool_identity("/usr/bin/readelf")
    version = run(["/usr/bin/gcc", "--version"])
    machine = run(["/usr/bin/gcc", "-dumpmachine"])
    fullversion = run(["/usr/bin/gcc", "-dumpfullversion", "-dumpversion"])
    if (
        version.returncode != 0 or version.stderr
        or machine.returncode != 0 or machine.stderr
        or fullversion.returncode != 0 or fullversion.stderr
    ):
        hold("compiler_identity_query_failed")

    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-protected-first-entry-static-candidate-v1-"
    ) as td:
        temp = Path(td)
        builds: list[bytes] = []
        for index in range(3):
            trial = temp / ("trial-" + str(index))
            trial.mkdir(mode=0o700)
            builds.append(build_once(trial, "candidate"))
    if not (builds[0] == builds[1] == builds[2]):
        hold("candidate_three_builds_differ")
    binary = builds[0]

    if source_generation() != sources_before:
        hold("source_generation_changed_during_build")
    if tool_identity("/usr/bin/gcc") != gcc_before:
        hold("compiler_changed_during_build")
    if tool_identity("/usr/bin/readelf") != readelf_before:
        hold("readelf_changed_during_build")

    static = {
        "elf_static_no_interp": True,
        "elf_dynamic_needed_absent": True,
        "elf_type_exec": True,
        "elf_machine_x86_64": True,
    }
    report: dict[str, Any] = {
        "marker": MARKER,
        "version": 1,
        "repository": repository,
        "predecessor": {
            "proof_path": PREDECESSOR_PROOF_REL,
            "proof_git_blob_sha1": PREDECESSOR_PROOF_BLOB,
            "protected_first_entry_source_accepted": True,
            "static_first_instruction_predecessor_hold_preserved": True,
        },
        "candidate_tool": {
            "path": SELF_REL,
            "git_blob_sha1": git_blob(self_raw),
            "bytes": len(self_raw),
            "sha256": sha256(self_raw),
        },
        "source_generation": sources_before,
        "compile_contract": {
            "fixed_self": FIXED_SELF,
            "required_uid": 0,
            "required_gid": 0,
            "production_defaults_used": True,
            "compile_flags": COMPILE_FLAGS,
            "link_flags": LINK_FLAGS,
            "compile_time_test_overrides": False,
        },
        "toolchain": {
            "gcc": gcc_before,
            "readelf": readelf_before,
            "gcc_version_line": version.stdout.decode("utf-8", "strict").splitlines()[0],
            "gcc_dumpmachine": machine.stdout.decode("ascii", "strict").strip(),
            "gcc_dumpversion": fullversion.stdout.decode("ascii", "strict").strip(),
            "toolchain_revalidated_after_build": True,
        },
        "binary": {
            "bytes": len(binary),
            "sha256": sha256(binary),
            "git_blob_sha1": git_blob(binary),
            "three_builds_byte_identical": True,
            **static,
            "production_fixed_self_embedded": True,
            "validator_reinspected_supplied_binary": True,
            "validator_independent_rebuild_byte_identical": True,
        },
        "candidate_semantics": {
            "static_first_instruction_candidate_evidence": True,
            "binary_identity_acceptance_required_next": True,
            "protected_install_and_host_qualification_required_next": True,
            "protected_expected_source_origin_proven": False,
        },
        "authority": AUTHORITY,
        "next_gate": "apollyon_claim_protected_first_entry_static_candidate_lock_v1",
    }
    report["candidate_id"] = (
        "apollyon_claim_protected_first_entry_static_candidate_v1:"
        + sha256(canonical(candidate_material(report)))
    )
    validate(report, binary)
    return report, binary


def derive_dir(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=False)
    report, binary = derive()
    (output / "candidate-v1.json").write_bytes(canonical(report) + b"\n")
    target = output / "apollyon-claim-protected-first-entry-static-v1"
    target.write_bytes(binary)
    target.chmod(0o555)
    print(MARKER + "_DERIVE_GREEN")
    print("candidate_id=" + report["candidate_id"])
    print("binary_sha256=" + report["binary"]["sha256"])
    print("binary_bytes=" + str(report["binary"]["bytes"]))
    print("three_builds_byte_identical=true")
    print("static_no_interp=true")
    print("validator_reinspected_supplied_binary=true")
    print("validator_independent_rebuild_byte_identical=true")
    print("production_defaults_used=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("xiphos_host_qualification_performed=false")
    print("durable_attempt_claim_performed=false")
    print("training_execution_performed=false")
    print("funds_movement=false")


def self_test() -> None:
    repository_lineage()
    generation = source_generation()
    stable_file(SELF_REL)
    tool_identity("/usr/bin/gcc")
    tool_identity("/usr/bin/readelf")
    if len(generation) != len(PINNED):
        hold("source_generation_count_invalid")
    if any(flag.startswith("-DVOID_APOLLYON_") for flag in COMPILE_FLAGS):
        hold("test_override_compile_flag_present")
    if FIXED_SELF != (
        "/opt/void-apollyon-claim-protected-first-entry-v1/bin/"
        "apollyon_claim_protected_first_entry_v1"
    ):
        hold("production_fixed_self_drift")
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_parent_bound=true")
    print("predecessor_proof_blob_bound=true")
    print("source_generation_exact_head_bound=true")
    print("production_fixed_self_default_bound=true")
    print("production_uid_gid_defaults_bound=true")
    print("static_three_build_derivation_required=true")
    print("validator_reinspection_and_rebuild_required=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive-dir", type=Path)
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            derive_dir(args.derive_dir)
    except CandidateError as exc:
        print(MARKER, file=os.sys.stderr)
        print("status=HOLD", file=os.sys.stderr)
        print("reason=" + str(exc), file=os.sys.stderr)
        print("candidate_accepted=false", file=os.sys.stderr)
        print("protected_install_authorized=false", file=os.sys.stderr)
        print("durable_attempt_claim_performed=false", file=os.sys.stderr)
        print("training_execution_performed=false", file=os.sys.stderr)
        print("funds_movement=false", file=os.sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
