#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import stat
import tempfile

MARKER = "VOID_APOLLYON_XIPHOS_BUILD_QUALIFICATION_V1_PROOF_GREEN"
ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "ops/xiphos/apollyon_xiphos_build_qualification_v1.py"
EXPECTED_RUNNER_GIT_BLOB = "df100566567bcc1bb722e48b0509d38493f9e675"


def git_blob_sha1(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def load_runner():
    data = RUNNER.read_bytes()
    metadata = RUNNER.lstat()
    if (
        not stat.S_ISREG(metadata.st_mode)
        or RUNNER.is_symlink()
        or metadata.st_nlink != 1
        or git_blob_sha1(data) != EXPECTED_RUNNER_GIT_BLOB
    ):
        raise AssertionError("runner identity mismatch")
    spec = importlib.util.spec_from_file_location("apollyon_xiphos_build_q_v1", RUNNER)
    if spec is None or spec.loader is None:
        raise AssertionError("runner import spec unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, data.decode("utf-8")


def prove_static_boundary(source: str) -> None:
    required = (
        'TARGET_HOST = "Xiphos"',
        'CC = Path("/usr/bin/cc")',
        'SYSTEMD_ANALYZE = Path("/usr/bin/systemd-analyze")',
        'NVIDIA_SMI = Path("/usr/bin/nvidia-smi")',
        'with tempfile.TemporaryDirectory(',
        '"persistent_filesystem_write": False',
        '"network_calls": False',
        '"verified_source_snapshot": True',
        '"source_snapshot_integrity_revalidated": True',
        'preentry_source_snapshot.write_bytes(preentry_source_bytes)',
        'entrypoint_source_snapshot.write_bytes(entrypoint_source_bytes)',
        'source=preentry_source_snapshot',
        'source=entrypoint_source_snapshot',
        'preentry_source_snapshot.read_bytes() != preentry_source_bytes',
        'entrypoint_source_snapshot.read_bytes() != entrypoint_source_bytes',
        '"service_mutation": False',
        '"systemd_mutation": False',
        '"account_mutation": False',
        '"training_execution": False',
        '"funds_movement": False',
        'group.add_argument("--run", action="store_true")',
    )
    for value in required:
        if value not in source:
            raise AssertionError("runner missing boundary: " + value)

    forbidden = (
        "urllib",
        "requests",
        "http://",
        "https://",
        "socket.create_connection",
        "socket.socket(",
        "socket.getaddrinfo(",
        "urlopen(",
        '"curl"',
        '"wget"',
        "subprocess.Popen",
        'Path("/etc/',
        'Path("/opt/',
        'Path("/var/lib/',
        '"sudo"',
        '"systemctl"',
        '"useradd"',
        '"groupadd"',
        '"install"',
        '"cp"',
        '"mv"',
        '"rm"',
        "os.chown",
        "os.chmod",
        "os.rename",
        "shutil.move",
    )
    for value in forbidden:
        if value in source:
            raise AssertionError("runner gained forbidden primitive: " + value)


def prove_self_test(module) -> None:
    stdout = io.StringIO()
    stderr = io.StringIO()
    with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
        rc = module.self_test()
    if rc != 0 or stderr.getvalue() != "":
        raise AssertionError("runner self-test failed")
    output = stdout.getvalue()
    for value in (
        "VOID_XIPHOS_APOLLYON_BUILD_QUALIFICATION_V1_SELF_TEST=GREEN",
        "persistent_filesystem_write=false",
        "sudo_required=false",
        "network_calls=false",
        "service_mutation=false",
        "account_mutation=false",
        "training_execution=false",
        "funds_movement=false",
    ):
        if value not in output:
            raise AssertionError("self-test missing: " + value)


def prove_wrong_host_hold(module) -> None:
    original = module.socket.gethostname
    module.socket.gethostname = lambda: "not-xiphos"
    try:
        try:
            module.qualify()
        except module.Hold as exc:
            if str(exc) != "wrong_host:not-xiphos":
                raise AssertionError("wrong host produced wrong HOLD") from exc
        else:
            raise AssertionError("wrong host unexpectedly admitted")
    finally:
        module.socket.gethostname = original


def prove_locked_builds(module) -> tuple[dict, dict, Path]:
    temporary = tempfile.TemporaryDirectory(
        prefix="void-apollyon-xiphos-build-proof-v1-"
    )
    work = Path(temporary.name)
    preentry = module.qualify_binary(
        source=module.PREENTRY_SOURCE,
        name="preentry",
        expected_bytes=module.EXPECTED_PREENTRY_BYTES,
        expected_sha=module.EXPECTED_PREENTRY_SHA256,
        self_test_marker=module.PREENTRY_SELF_TEST_MARKER,
        work=work,
    )
    entrypoint = module.qualify_binary(
        source=module.ENTRYPOINT_SOURCE,
        name="entrypoint",
        expected_bytes=module.EXPECTED_ENTRYPOINT_BYTES,
        expected_sha=module.EXPECTED_ENTRYPOINT_SHA256,
        self_test_marker=module.ENTRYPOINT_SELF_TEST_MARKER,
        work=work,
    )
    for label, result in (("preentry", preentry), ("entrypoint", entrypoint)):
        if not result["local_reproducible"]:
            raise AssertionError(label + " build not reproducible")
        if not result["expected_identity_match"]:
            raise AssertionError(label + " locked identity mismatch")
        if not result["self_test_green"]:
            raise AssertionError(label + " self-test failed")
    return preentry, entrypoint, temporary


def prove_systemd_parser(module, preentry: dict, entrypoint: dict, work: Path) -> None:
    unit_bytes = module.read_exact(module.UNIT, module.EXPECTED_UNIT_BLOB)
    result = module.verify_adjusted_unit(
        unit_bytes.decode("utf-8"),
        work,
        preentry["binary_path_for_adjusted_verify"],
        entrypoint["binary_path_for_adjusted_verify"],
    )
    if result["major"] != 255:
        raise AssertionError("hosted proof requires systemd major 255")
    if not result["adjusted_verify_green"]:
        raise AssertionError(
            "adjusted exact unit did not parse: "
            + str(result["adjusted_verify_stderr_tail"])
        )


def write_fake_nvidia_smi(path: Path, *, busy: bool) -> None:
    process_line = (
        'echo "4242, foreign-compute, 512"\n'
        if busy
        else ':\n'
    )
    path.write_text(
        "#!/bin/sh\n"
        "case \"$*\" in\n"
        "  *--query-gpu=*) "
        'echo "0, Fixture GPU, 12227, 34, 11741, 0, 39, P8" ;;\n'
        "  *--query-compute-apps=*) "
        + process_line.replace("\n", " ;;\n  ", 1)
        + "  *) exit 64 ;;\n"
        "esac\n",
        encoding="utf-8",
    )
    path.chmod(0o755)


def prove_gpu_gate(module) -> None:
    original = module.NVIDIA_SMI
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-xiphos-gpu-fixture-v1-"
    ) as temporary:
        fixture = Path(temporary) / "nvidia-smi"
        write_fake_nvidia_smi(fixture, busy=False)
        module.NVIDIA_SMI = fixture
        free = module.gpu_state()
        if not free["gpu_compute_free"] or free["compute_processes"]:
            raise AssertionError("free GPU fixture rejected")

        write_fake_nvidia_smi(fixture, busy=True)
        busy = module.gpu_state()
        if busy["gpu_compute_free"] or len(busy["compute_processes"]) != 1:
            raise AssertionError("busy GPU fixture admitted")
    module.NVIDIA_SMI = original


def main() -> None:
    module, source = load_runner()
    prove_static_boundary(source)
    prove_self_test(module)
    prove_wrong_host_hold(module)
    preentry, entrypoint, temporary = prove_locked_builds(module)
    try:
        prove_systemd_parser(module, preentry, entrypoint, Path(temporary.name))
    finally:
        temporary.cleanup()
    prove_gpu_gate(module)

    print(MARKER)
    print("source_only=true")
    print("fixed_host=Xiphos")
    print("ephemeral_temp_write_only=true")
    print("persistent_filesystem_write=false")
    print("network_calls=false")
    print("sudo_required=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("account_mutation=false")
    print("training_execution=false")
    print("attempt_claim=false")
    print("candidate_weight_mutation=false")
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("funds_movement=false")


if __name__ == "__main__":
    main()
