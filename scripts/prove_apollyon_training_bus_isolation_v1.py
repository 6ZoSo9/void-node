#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import re
from pathlib import Path
import subprocess
import tempfile


MARKER = "VOID_APOLLYON_TRAINING_BUS_ISOLATION_V1_PROOF_GREEN"
ROOT = Path(__file__).resolve().parents[1]
UNIT = ROOT / "ops/xiphos/void-apollyon-training-bus-isolation-v1.service"
PREENTRY = ROOT / "ops/xiphos/apollyon_training_bus_isolation_preentry_v1.c"

EXPECTED_UNIT_BLOB = "62fbabe1cf7ae0d940f5d96e19b06282f841267b"
EXPECTED_PREENTRY_BLOB = "9503d19c8bc0b4f073ba117f6a547d339b7623d0"

FIXED_PREENTRY = (
    "/opt/void-apollyon-training-bus-isolation-v1/"
    "apollyon_training_bus_isolation_preentry_v1"
)
FIXED_TARGET = (
    "/opt/void-apollyon-training-v1/"
    "apollyon_candidate_training_entrypoint_v1"
)

DENIED_SYSCALLS = {
    "socket",
    "socketpair",
    "connect",
    "accept",
    "accept4",
    "bind",
    "listen",
    "sendto",
    "recvfrom",
    "sendmsg",
    "recvmsg",
    "sendmmsg",
    "recvmmsg",
    "pidfd_getfd",
    "io_uring_setup",
    "io_uring_enter",
    "io_uring_register",
}


def git_blob_sha1(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def parse_unit(text: str) -> dict[str, list[str]]:
    section = None
    result: dict[str, list[str]] = {}
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith(";"):
            continue
        if line.startswith("[") and line.endswith("]"):
            section = line[1:-1]
            continue
        if section != "Service":
            continue
        if "=" not in line:
            raise AssertionError("service directive without equals")
        key, value = line.split("=", 1)
        result.setdefault(key, []).append(value)
    return result


def one(values: dict[str, list[str]], key: str) -> str:
    actual = values.get(key)
    if actual is None or len(actual) != 1:
        raise AssertionError(f"{key} must occur exactly once")
    return actual[0]


def prove_unit(text: str) -> None:
    values = parse_unit(text)

    expected_single = {
        "Type": "simple",
        "User": "voidapollyontrain",
        "Group": "voidapollyontrain",
        "WorkingDirectory": "/var/lib/void-apollyon-training-v1",
        "ExecStart": FIXED_PREENTRY,
        "NoNewPrivileges": "yes",
        "UMask": "0077",
        "PrivateNetwork": "yes",
        "RestrictAddressFamilies": "none",
        "SystemCallArchitectures": "native",
        "SystemCallErrorNumber": "EPERM",
        "StandardInput": "null",
        "StandardOutput": "journal",
        "StandardError": "journal",
        "FileDescriptorStoreMax": "0",
        "NotifyAccess": "none",
        "RestrictNamespaces": "yes",
        "RestrictSUIDSGID": "yes",
        "LockPersonality": "yes",
        "PrivateTmp": "yes",
        "ProtectSystem": "strict",
        "ProtectHome": "yes",
        "ProtectKernelTunables": "yes",
        "ProtectKernelModules": "yes",
        "ProtectKernelLogs": "yes",
        "ProtectControlGroups": "yes",
        "ProtectProc": "invisible",
        "ProcSubset": "pid",
        "Restart": "no",
    }
    for key, expected in expected_single.items():
        if one(values, key) != expected:
            raise AssertionError(f"{key} mismatch")

    if one(values, "CapabilityBoundingSet") != "":
        raise AssertionError("capability bounding set must be empty")
    if one(values, "AmbientCapabilities") != "":
        raise AssertionError("ambient capabilities must be empty")

    filters = values.get("SystemCallFilter", [])
    if filters != [
        "@system-service",
        "~socket socketpair connect accept accept4 bind listen sendto recvfrom "
        "sendmsg recvmsg sendmmsg recvmmsg pidfd_getfd io_uring_setup "
        "io_uring_enter io_uring_register",
    ]:
        raise AssertionError("system call filter mismatch")
    denied = set(filters[1][1:].split())
    if denied != DENIED_SYSCALLS:
        raise AssertionError("network/descriptor syscall deny set mismatch")

    if values.get("ReadOnlyPaths") != [
        "/opt/void-apollyon-training-v1",
        "/opt/void-apollyon-training-bus-isolation-v1",
        "/var/lib/void-apollyon-training-v1/input",
    ]:
        raise AssertionError("read-only path policy mismatch")
    if values.get("ReadWritePaths") != [
        "/var/lib/void-apollyon-training-v1/output",
    ]:
        raise AssertionError("read-write path policy mismatch")

    for forbidden in (
        "Sockets",
        "OpenFile",
        "PAMName",
        "PassEnvironment",
        "EnvironmentFile",
    ):
        if forbidden in values:
            raise AssertionError(f"forbidden descriptor/ambient input: {forbidden}")

    if one(values, "ExecStart").startswith(("+", "!", "-", ":")):
        raise AssertionError("ExecStart privilege/behavior prefix forbidden")


def prove_preentry(source: str) -> None:
    required = (
        '#define MARKER "VOID_APOLLYON_TRAINING_BUS_ISOLATION_PREENTRY_V1"',
        f'#define TARGET "{FIXED_TARGET}"',
        "SYS_close_range",
        "CLOSE_RANGE_UNSHARE",
        "PR_SET_NO_NEW_PRIVS",
        "PR_GET_NO_NEW_PRIVS",
        "assert_no_extra_fds",
        "execve(TARGET, child_argv, child_env)",
        "setuid_setgid_rejected=true",
        "training_execution=false",
    )
    for value in required:
        if value not in source:
            raise AssertionError(f"preentry missing {value}")

    forbidden = (
        "system(",
        "popen(",
        "execlp(",
        "execvp(",
        "/bin/sh",
        "DBUS_SYSTEM_BUS_ADDRESS",
        "DBUS_SESSION_BUS_ADDRESS",
    )
    for value in forbidden:
        if value in source:
            raise AssertionError(f"preentry gained forbidden primitive {value}")



def verify_systemd_v255_parser(unit_text: str) -> None:
    version = subprocess.run(
        ["systemd-analyze", "--version"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=15,
    )
    if version.returncode != 0:
        raise AssertionError("systemd-analyze --version failed")
    first = version.stdout.splitlines()[0] if version.stdout.splitlines() else ""
    match = re.match(r"^systemd\s+([0-9]+)(?:\s|$)", first)
    if match is None or int(match.group(1)) != 255:
        raise AssertionError("focused parser proof requires systemd major 255")

    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-training-systemd-v255-"
    ) as td:
        root = Path(td)
        executable = root / "preentry"
        executable.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
        executable.chmod(0o755)
        work = root / "work"
        training = root / "training"
        isolation = root / "isolation"
        input_dir = root / "input"
        output_dir = root / "output"
        for directory in (work, training, isolation, input_dir, output_dir):
            directory.mkdir()

        validation = unit_text
        replacements = {
            "User=voidapollyontrain": "User=root",
            "Group=voidapollyontrain": "Group=root",
            "WorkingDirectory=/var/lib/void-apollyon-training-v1":
                f"WorkingDirectory={work}",
            f"ExecStart={FIXED_PREENTRY}": f"ExecStart={executable}",
            "ReadOnlyPaths=/opt/void-apollyon-training-v1":
                f"ReadOnlyPaths={training}",
            "ReadOnlyPaths=/opt/void-apollyon-training-bus-isolation-v1":
                f"ReadOnlyPaths={isolation}",
            "ReadOnlyPaths=/var/lib/void-apollyon-training-v1/input":
                f"ReadOnlyPaths={input_dir}",
            "ReadWritePaths=/var/lib/void-apollyon-training-v1/output":
                f"ReadWritePaths={output_dir}",
        }
        for old, new in replacements.items():
            if old not in validation:
                raise AssertionError(f"systemd parser fixture missing {old}")
            validation = validation.replace(old, new)

        unit = root / "void-apollyon-training-bus-isolation-v1.service"
        unit.write_text(validation, encoding="utf-8")
        result = subprocess.run(
            ["systemd-analyze", "verify", str(unit)],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=30,
        )
        transcript = result.stdout + "\n" + result.stderr
        parse_failures = (
            "Failed to parse",
            "Unknown key",
            "Unknown lvalue",
            "Failed to parse boolean value",
        )
        if result.returncode != 0 or any(x in transcript for x in parse_failures):
            raise AssertionError(
                "systemd v255 parser rejected isolation unit: " +
                transcript[-2000:]
            )


def compile_and_self_test() -> None:
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-training-bus-isolation-v1-"
    ) as td:
        binary = Path(td) / "preentry"
        command = [
            "cc",
            "-std=c11",
            "-O2",
            "-Wall",
            "-Wextra",
            "-Werror",
            "-D_FORTIFY_SOURCE=2",
            "-fstack-protector-strong",
            "-Wl,-z,relro,-z,now",
            "-Wl,--build-id=none",
            "-o",
            str(binary),
            str(PREENTRY),
        ]
        subprocess.run(command, check=True, timeout=30)
        result = subprocess.run(
            [str(binary), "--self-test"],
            check=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=15,
        )
        if result.returncode != 0:
            raise AssertionError(
                "preentry self-test failed: " + result.stderr[-1000:]
            )
        required = (
            "VOID_APOLLYON_TRAINING_BUS_ISOLATION_PREENTRY_V1_SELF_TEST=GREEN",
            "close_range_unshare_required=true",
            "all_inherited_fds_ge_3_closed=true",
            "no_new_privileges_required=true",
            "target_root_custody_required=true",
            "setuid_setgid_rejected=true",
            "training_execution=false",
        )
        for value in required:
            if value not in result.stdout:
                raise AssertionError(f"self-test missing {value}")


def main() -> None:
    unit_bytes = UNIT.read_bytes()
    preentry_bytes = PREENTRY.read_bytes()
    if git_blob_sha1(unit_bytes) != EXPECTED_UNIT_BLOB:
        raise AssertionError("unit Git blob mismatch")
    if git_blob_sha1(preentry_bytes) != EXPECTED_PREENTRY_BLOB:
        raise AssertionError("preentry Git blob mismatch")

    unit_text = unit_bytes.decode("utf-8")
    source = preentry_bytes.decode("utf-8")
    prove_unit(unit_text)
    prove_preentry(source)
    verify_systemd_v255_parser(unit_text)

    invalid_v255 = unit_text.replace(
        "ProtectControlGroups=yes",
        "ProtectControlGroups=strict",
    )
    try:
        verify_systemd_v255_parser(invalid_v255)
    except AssertionError:
        pass
    else:
        raise AssertionError(
            "systemd-v255-invalid ProtectControlGroups value unexpectedly admitted"
        )

    weakened = unit_text.replace(
        "RestrictAddressFamilies=none",
        "RestrictAddressFamilies=AF_UNIX",
    )
    try:
        prove_unit(weakened)
    except AssertionError:
        pass
    else:
        raise AssertionError("AF_UNIX weakening unexpectedly admitted")

    weakened = unit_text.replace(
        "FileDescriptorStoreMax=0",
        "FileDescriptorStoreMax=1",
    )
    try:
        prove_unit(weakened)
    except AssertionError:
        pass
    else:
        raise AssertionError("fd-store weakening unexpectedly admitted")

    weakened = unit_text.replace(
        "SystemCallArchitectures=native",
        "SystemCallArchitectures=",
    )
    try:
        prove_unit(weakened)
    except AssertionError:
        pass
    else:
        raise AssertionError("alternate ABI weakening unexpectedly admitted")

    compile_and_self_test()

    print(MARKER)
    print("source_only=true")
    print("unit_install_performed=false")
    print("service_start_performed=false")
    print("training_execution=false")
    print("attempt_claim=false")
    print("systemd_v255_parser_verified=true")
    print("protect_control_groups_boolean_required=true")
    print("inherited_fd_close_boundary_source_proven=true")
    print("all_socket_families_denied_by_reviewed_unit_source=true")
    print("socketpair_scm_rights_io_uring_pidfd_acquisition_denied_in_source=true")
    print("live_systemd_enforcement_proven=false")
    print("installed_preentry_binary_identity_proven=false")
    print("inherited_system_bus_descriptor_absence_proven=false")


if __name__ == "__main__":
    main()
