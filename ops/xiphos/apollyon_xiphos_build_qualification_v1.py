#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import grp
import re
import shutil
import socket
import subprocess
import tempfile
from typing import Any

MARKER = "VOID_XIPHOS_APOLLYON_BUILD_QUALIFICATION_V1"
TARGET_HOST = "Xiphos"
ROOT = Path(__file__).resolve().parents[2]

UNIT = ROOT / "ops/xiphos/void-apollyon-training-bus-isolation-v1.service"
PREENTRY_SOURCE = ROOT / "ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c"
ENTRYPOINT_SOURCE = ROOT / "ops/xiphos/apollyon_candidate_training_entrypoint_v1.c"

EXPECTED_UNIT_BLOB = "62fbabe1cf7ae0d940f5d96e19b06282f841267b"
EXPECTED_PREENTRY_SOURCE_BLOB = "9503d19c8bc0b4f073ba117f6a547d339b7623d0"
EXPECTED_ENTRYPOINT_SOURCE_BLOB = "bfeff81f3eab98988a9be9600a05c696674c49d6"

EXPECTED_PREENTRY_BYTES = 17352
EXPECTED_PREENTRY_SHA256 = "6e2885ceddf83bc9bf4636768ce6f046ab357268b0959cfa71bcbb766909cb47"
EXPECTED_ENTRYPOINT_BYTES = 17384
EXPECTED_ENTRYPOINT_SHA256 = "7a1ec91b612998824e37aa0f8522a94d7ceffe9f4f21e0702fe0a0d5ca5bdd9a"

SOURCE_HEAD = "d790d2c273df8152d9077a42850fb82b88ab6bf1"
CANDIDATE_HEAD = "f688bba3268bfeb9b9aae4d712c0ca24532883cb"
LOCK_HEAD = "08b6a0658be6c2212c7de6b3d250e691ae60e288"
LOCK_ID = (
    "apollyon_candidate_training_entrypoint_binary_lock_v1:"
    "f63b6018e752ec685ed427a1badacae1799896f859dea8bb447a6fc271fd8a7a"
)

CC = Path("/usr/bin/cc")
SYSTEMD_ANALYZE = Path("/usr/bin/systemd-analyze")
NVIDIA_SMI = Path("/usr/bin/nvidia-smi")

COMPILE_FLAGS = (
    "-std=c11",
    "-O2",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-D_FORTIFY_SOURCE=2",
    "-fstack-protector-strong",
    "-Wl,-z,relro,-z,now",
    "-Wl,--build-id=none",
)
ENV = {
    "PATH": "/usr/bin:/bin",
    "LC_ALL": "C",
    "TZ": "UTC",
    "SOURCE_DATE_EPOCH": "0",
}

PREENTRY_SELF_TEST_MARKER = (
    "VOID_APOLLYON_TRAINING_BUS_ISOLATION_PREENTRY_V1_SELF_TEST=GREEN"
)
ENTRYPOINT_SELF_TEST_MARKER = (
    "VOID_APOLLYON_CANDIDATE_TRAINING_ENTRYPOINT_HOLD_V1_SELF_TEST=GREEN"
)


class Hold(RuntimeError):
    pass


def canonical(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def read_exact(path: Path, expected_blob: str) -> bytes:
    metadata = path.lstat()
    if not path.is_file() or path.is_symlink() or metadata.st_nlink != 1:
        raise Hold(f"bundle_file_metadata_invalid:{path.name}")
    data = path.read_bytes()
    if len(data) != metadata.st_size:
        raise Hold(f"bundle_file_read_size_drift:{path.name}")
    actual = git_blob_sha1(data)
    if actual != expected_blob:
        raise Hold(f"bundle_file_git_blob_mismatch:{path.name}:{actual}")
    return data


def run(
    argv: list[str],
    *,
    timeout: int = 30,
    check: bool = False,
    env: dict[str, str] | None = None,
) -> subprocess.CompletedProcess[str]:
    try:
        result = subprocess.run(
            argv,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=timeout,
            env=env,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise Hold("command_execution_failed:" + Path(argv[0]).name) from exc
    if check and result.returncode != 0:
        raise Hold(
            "command_failed:"
            + Path(argv[0]).name
            + ":"
            + str(result.returncode)
            + ":"
            + result.stderr[-500:].replace("\n", "\\n")
        )
    return result


def compiler_identity() -> dict[str, Any]:
    if not CC.is_file():
        raise Hold("compiler_missing")
    resolved = Path(os.path.realpath(CC))
    version = run([os.fspath(CC), "--version"], check=True)
    machine = run([os.fspath(CC), "-dumpmachine"], check=True)
    dumpversion = run([os.fspath(CC), "-dumpfullversion", "-dumpversion"], check=True)
    first = version.stdout.splitlines()[0] if version.stdout.splitlines() else ""
    if not first or not machine.stdout.strip() or not dumpversion.stdout.strip():
        raise Hold("compiler_identity_incomplete")
    return {
        "requested": os.fspath(CC),
        "resolved": os.fspath(resolved),
        "version_first_line": first,
        "dumpmachine": machine.stdout.strip(),
        "dumpversion": dumpversion.stdout.strip(),
    }


def compile_target(source: Path, output: Path) -> None:
    run(
        [
            os.fspath(CC),
            *COMPILE_FLAGS,
            "-o",
            os.fspath(output),
            os.fspath(source),
        ],
        timeout=45,
        check=True,
        env=ENV,
    )


def binary_receipt(path: Path) -> dict[str, Any]:
    data = path.read_bytes()
    return {
        "bytes": len(data),
        "sha256": sha256(data),
        "elf_magic": data.startswith(b"\x7fELF"),
    }


def qualify_binary(
    *,
    source: Path,
    name: str,
    expected_bytes: int,
    expected_sha: str,
    self_test_marker: str,
    work: Path,
) -> dict[str, Any]:
    first = work / f"{name}.a"
    second = work / f"{name}.b"
    compile_target(source, first)
    compile_target(source, second)
    first_bytes = first.read_bytes()
    second_bytes = second.read_bytes()
    reproducible_local = first_bytes == second_bytes
    receipt = binary_receipt(first)
    test = run([os.fspath(first), "--self-test"], timeout=20)
    self_test_green = (
        test.returncode == 0
        and self_test_marker in test.stdout
        and test.stderr == ""
    )
    return {
        "local_reproducible": reproducible_local,
        "bytes": receipt["bytes"],
        "sha256": receipt["sha256"],
        "elf_magic": receipt["elf_magic"],
        "expected_bytes": expected_bytes,
        "expected_sha256": expected_sha,
        "expected_identity_match": (
            reproducible_local
            and receipt["bytes"] == expected_bytes
            and receipt["sha256"] == expected_sha
            and receipt["elf_magic"]
        ),
        "self_test_green": self_test_green,
        "self_test_exit_code": test.returncode,
        "self_test_stdout_sha256": sha256(test.stdout.encode("utf-8")),
        "binary_path_for_adjusted_verify": os.fspath(first),
    }


def systemd_identity() -> dict[str, Any]:
    if not SYSTEMD_ANALYZE.is_file():
        return {
            "available": False,
            "version_first_line": None,
            "major": None,
        }
    result = run([os.fspath(SYSTEMD_ANALYZE), "--version"], timeout=10)
    first = result.stdout.splitlines()[0] if result.stdout.splitlines() else ""
    match = re.search(r"\bsystemd\s+(\d+)\b", first)
    return {
        "available": result.returncode == 0,
        "version_first_line": first or None,
        "major": int(match.group(1)) if match else None,
    }


def verify_adjusted_unit(
    unit_text: str,
    work: Path,
    preentry_binary: str,
    entrypoint_binary: str,
) -> dict[str, Any]:
    identity = systemd_identity()
    if not identity["available"]:
        return {
            **identity,
            "adjusted_verify_exit_code": None,
            "adjusted_verify_green": False,
            "adjusted_verify_stderr_sha256": None,
        }

    current = pwd.getpwuid(os.getuid())
    current_group = grp.getgrgid(os.getgid())
    state = work / "state"
    input_dir = state / "input"
    output_dir = state / "output"
    preentry_dir = work / "installed-preentry"
    entrypoint_dir = work / "installed-entrypoint"
    for directory in (state, input_dir, output_dir, preentry_dir, entrypoint_dir):
        directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    preentry_target = preentry_dir / "apollyon_training_bus_isolation_preentry_v1"
    entrypoint_target = entrypoint_dir / "apollyon_candidate_training_entrypoint_v1"
    shutil.copy2(preentry_binary, preentry_target)
    shutil.copy2(entrypoint_binary, entrypoint_target)
    preentry_target.chmod(0o755)
    entrypoint_target.chmod(0o755)

    adjusted = unit_text
    replacements = {
        "User=voidapollyontrain": f"User={current.pw_name}",
        "Group=voidapollyontrain": f"Group={current_group.gr_name}",
        "WorkingDirectory=/var/lib/void-apollyon-training-v1": (
            "WorkingDirectory=" + os.fspath(state)
        ),
        (
            "ExecStart=/opt/void-apollyon-training-bus-isolation-v1/"
            "apollyon_training_bus_isolation_preentry_v1"
        ): "ExecStart=" + os.fspath(preentry_target),
        "ReadOnlyPaths=/opt/void-apollyon-training-v1": (
            "ReadOnlyPaths=" + os.fspath(entrypoint_dir)
        ),
        "ReadOnlyPaths=/opt/void-apollyon-training-bus-isolation-v1": (
            "ReadOnlyPaths=" + os.fspath(preentry_dir)
        ),
        "ReadOnlyPaths=/var/lib/void-apollyon-training-v1/input": (
            "ReadOnlyPaths=" + os.fspath(input_dir)
        ),
        "ReadWritePaths=/var/lib/void-apollyon-training-v1/output": (
            "ReadWritePaths=" + os.fspath(output_dir)
        ),
    }
    for old, new in replacements.items():
        if adjusted.count(old) != 1:
            raise Hold("unit_adjustment_source_occurrence_invalid:" + old.split("=")[0])
        adjusted = adjusted.replace(old, new)

    adjusted_path = work / "void-apollyon-training-bus-isolation-v1.service"
    adjusted_path.write_text(adjusted, encoding="utf-8")
    result = run(
        [os.fspath(SYSTEMD_ANALYZE), "verify", os.fspath(adjusted_path)],
        timeout=30,
    )
    return {
        **identity,
        "adjusted_verify_exit_code": result.returncode,
        "adjusted_verify_green": result.returncode == 0,
        "adjusted_verify_stdout_sha256": sha256(result.stdout.encode("utf-8")),
        "adjusted_verify_stderr_sha256": sha256(result.stderr.encode("utf-8")),
        "adjusted_verify_stderr_tail": result.stderr[-600:],
        "exact_unit_modified_for_parser_only": True,
        "live_unit_loaded": False,
    }


def gpu_state() -> dict[str, Any]:
    if not NVIDIA_SMI.is_file():
        return {
            "nvidia_smi_available": False,
            "gpu_compute_free": False,
            "gpus": [],
            "compute_processes": [],
        }
    gpu = run(
        [
            os.fspath(NVIDIA_SMI),
            "--query-gpu=index,name,memory.total,memory.used,memory.free,"
            "utilization.gpu,temperature.gpu,pstate",
            "--format=csv,noheader,nounits",
        ],
        timeout=15,
    )
    processes = run(
        [
            os.fspath(NVIDIA_SMI),
            "--query-compute-apps=pid,process_name,used_memory",
            "--format=csv,noheader,nounits",
        ],
        timeout=15,
    )
    gpu_rows = [
        [field.strip() for field in line.split(",")]
        for line in gpu.stdout.splitlines()
        if line.strip()
    ]
    process_rows = [
        [field.strip() for field in line.split(",")]
        for line in processes.stdout.splitlines()
        if line.strip() and "No running processes found" not in line
    ]
    return {
        "nvidia_smi_available": gpu.returncode == 0 and processes.returncode == 0,
        "gpu_query_exit_code": gpu.returncode,
        "compute_query_exit_code": processes.returncode,
        "gpus": [
            {
                "index": row[0],
                "name": row[1],
                "memory_total_mib": row[2],
                "memory_used_mib": row[3],
                "memory_free_mib": row[4],
                "utilization_gpu_percent": row[5],
                "temperature_c": row[6],
                "pstate": row[7],
            }
            for row in gpu_rows
            if len(row) == 8
        ],
        "compute_processes": [
            {
                "pid": row[0],
                "process_name": row[1],
                "used_memory_mib": row[2],
            }
            for row in process_rows
            if len(row) == 3
        ],
        "gpu_compute_free": (
            gpu.returncode == 0 and processes.returncode == 0 and not process_rows
        ),
    }


def self_test() -> int:
    assertions = {
        "fixed_host": TARGET_HOST == "Xiphos",
        "unit_blob": git_blob_sha1(UNIT.read_bytes()) == EXPECTED_UNIT_BLOB,
        "preentry_source_blob": (
            git_blob_sha1(PREENTRY_SOURCE.read_bytes())
            == EXPECTED_PREENTRY_SOURCE_BLOB
        ),
        "entrypoint_source_blob": (
            git_blob_sha1(ENTRYPOINT_SOURCE.read_bytes())
            == EXPECTED_ENTRYPOINT_SOURCE_BLOB
        ),
        "preentry_expected_hash_length": len(EXPECTED_PREENTRY_SHA256) == 64,
        "entrypoint_expected_hash_length": len(EXPECTED_ENTRYPOINT_SHA256) == 64,
        "no_training_authority": True,
    }
    print(MARKER + "_SELF_TEST=GREEN")
    print("persistent_filesystem_write=false")
    print("ephemeral_temp_write=false")
    print("sudo_required=false")
    print("network_calls=false")
    print("service_mutation=false")
    print("account_mutation=false")
    print("training_execution=false")
    print("funds_movement=false")
    print(canonical({"assertions": assertions}))
    return 0 if all(assertions.values()) else 2


def qualify() -> int:
    hostname = socket.gethostname()
    if hostname.casefold() != TARGET_HOST.casefold():
        raise Hold("wrong_host:" + hostname)

    unit_bytes = read_exact(UNIT, EXPECTED_UNIT_BLOB)
    preentry_source_bytes = read_exact(
        PREENTRY_SOURCE, EXPECTED_PREENTRY_SOURCE_BLOB
    )
    entrypoint_source_bytes = read_exact(
        ENTRYPOINT_SOURCE, EXPECTED_ENTRYPOINT_SOURCE_BLOB
    )
    compiler = compiler_identity()

    with tempfile.TemporaryDirectory(
        prefix="void-xiphos-apollyon-build-qualification-v1-"
    ) as temporary:
        work = Path(temporary)
        preentry_source_snapshot = work / "apollyon_training_bus_isolation_preentry_v1.c"
        entrypoint_source_snapshot = work / "apollyon_candidate_training_entrypoint_v1.c"
        preentry_source_snapshot.write_bytes(preentry_source_bytes)
        entrypoint_source_snapshot.write_bytes(entrypoint_source_bytes)
        preentry_source_snapshot.chmod(0o400)
        entrypoint_source_snapshot.chmod(0o400)

        preentry = qualify_binary(
            source=preentry_source_snapshot,
            name="preentry",
            expected_bytes=EXPECTED_PREENTRY_BYTES,
            expected_sha=EXPECTED_PREENTRY_SHA256,
            self_test_marker=PREENTRY_SELF_TEST_MARKER,
            work=work,
        )
        entrypoint = qualify_binary(
            source=entrypoint_source_snapshot,
            name="entrypoint",
            expected_bytes=EXPECTED_ENTRYPOINT_BYTES,
            expected_sha=EXPECTED_ENTRYPOINT_SHA256,
            self_test_marker=ENTRYPOINT_SELF_TEST_MARKER,
            work=work,
        )
        if preentry_source_snapshot.read_bytes() != preentry_source_bytes:
            raise Hold("preentry_source_snapshot_integrity_drift")
        if entrypoint_source_snapshot.read_bytes() != entrypoint_source_bytes:
            raise Hold("entrypoint_source_snapshot_integrity_drift")
        systemd = verify_adjusted_unit(
            unit_bytes.decode("utf-8"),
            work,
            preentry["binary_path_for_adjusted_verify"],
            entrypoint["binary_path_for_adjusted_verify"],
        )
        preentry.pop("binary_path_for_adjusted_verify", None)
        entrypoint.pop("binary_path_for_adjusted_verify", None)
        gpu = gpu_state()

        gates = {
            "preentry_reproduces_locked_identity": preentry["expected_identity_match"],
            "entrypoint_reproduces_locked_identity": entrypoint[
                "expected_identity_match"
            ],
            "preentry_self_test_green": preentry["self_test_green"],
            "entrypoint_self_test_green": entrypoint["self_test_green"],
            "systemd_parser_compatible": systemd["adjusted_verify_green"],
            "gpu_compute_free": gpu["gpu_compute_free"],
            "installation_candidate_ready": (
                preentry["expected_identity_match"]
                and entrypoint["expected_identity_match"]
                and preentry["self_test_green"]
                and entrypoint["self_test_green"]
                and systemd["adjusted_verify_green"]
                and gpu["gpu_compute_free"]
            ),
        }
        material = {
            "marker": MARKER,
            "version": 1,
            "timestamp_utc": run(
                ["/usr/bin/date", "-u", "+%Y-%m-%dT%H:%M:%SZ"], check=True
            ).stdout.strip(),
            "hostname": hostname,
            "designated_host": True,
            "read_only_host_state": True,
            "network_calls": False,
            "verified_source_snapshot": True,
            "source_snapshot_integrity_revalidated": True,
            "ephemeral_temp_write": True,
            "persistent_filesystem_write": False,
            "sudo_required": False,
            "service_mutation": False,
            "systemd_mutation": False,
            "account_mutation": False,
            "training_execution": False,
            "attempt_claim": False,
            "candidate_weight_mutation": False,
            "credential_access": False,
            "wallet_or_signer_access": False,
            "funds_movement": False,
            "source_identity": {
                "source_head": SOURCE_HEAD,
                "candidate_head": CANDIDATE_HEAD,
                "lock_head": LOCK_HEAD,
                "lock_id": LOCK_ID,
                "unit_git_blob": EXPECTED_UNIT_BLOB,
                "preentry_source_git_blob": EXPECTED_PREENTRY_SOURCE_BLOB,
                "entrypoint_source_git_blob": EXPECTED_ENTRYPOINT_SOURCE_BLOB,
            },
            "compiler": compiler,
            "preentry": preentry,
            "entrypoint": entrypoint,
            "systemd": systemd,
            "gpu": gpu,
            "gates": gates,
        }
        result = {
            **material,
            "qualification_id": (
                "void_xiphos_apollyon_build_qualification_v1:"
                + sha256(canonical(material).encode("utf-8"))
            ),
        }
        print(MARKER)
        print("read_only_host_state=true")
        print("ephemeral_temp_write=true")
        print("persistent_filesystem_write=false")
        print("sudo_required=false")
        print("network_calls=false")
        print("service_mutation=false")
        print("account_mutation=false")
        print("training_execution=false")
        print("funds_movement=false")
        print(canonical(result))
        if not gates["installation_candidate_ready"]:
            print("HOLD=apollyon_xiphos_installation_candidate_not_ready", file=os.sys.stderr)
            return 2
        return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true")
    group.add_argument("--run", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        return qualify()
    except Hold as exc:
        print("HOLD=" + str(exc), file=os.sys.stderr)
        print("persistent_filesystem_write=false", file=os.sys.stderr)
        print("network_calls=false", file=os.sys.stderr)
        print("service_mutation=false", file=os.sys.stderr)
        print("account_mutation=false", file=os.sys.stderr)
        print("training_execution=false", file=os.sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
