#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
MATERIALIZER = (
    ROOT
    / "scripts/materialize_buy_void_epoch2_dormant_binder_installer_first_entry_v1.py"
)
LOCK = (
    ROOT
    / "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json"
)
CANDIDATE = (
    ROOT
    / "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_candidate_v1.py"
)
LAUNCHER_SOURCE = (
    ROOT
    / "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1.c"
)
INSTALLER_SOURCE = (
    ROOT
    / "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
PROTECTED_INSTALLER = (
    ROOT
    / "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py"
)

MATERIALIZER_BLOB = "50e8e7ba06740af830cc3c9df34d0ef7739a7e67"
LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"
CANDIDATE_BLOB = "1d15fccf256571c382a09d99c8545d5b24ad2077"
LAUNCHER_SOURCE_BLOB = "5f1195d0c0a328be4334ad5b7f6e32b150776cab"
INSTALLER_SOURCE_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"
PROTECTED_INSTALLER_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"

LOCK_ID = (
    "voidbuye2dormantfirstentrylock1_"
    "bdff90d00036a0e5cebd72dd06aa708842385c3857e4acb3bf9674c2b1e16a85"
)
CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand1_"
    "b7109c847373114e2d5e044928ecc4e30c65ef446880d70d9ec57d5853ad3736"
)
EXPECTED_BYTES = 731_072
EXPECTED_SHA256 = (
    "4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"
)
EXPECTED_REPORT_SHA256 = (
    "a345e861b81cd19288b71122bd353a1d586d070febfc87933ed8181c0d3abebe"
)
MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_"
    "INSTALLER_FIRST_ENTRY_MATERIALIZER_V1_PROOF"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def direct(path: Path, maximum: int) -> bytes:
    before = path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink == 1 and 0 < before.st_size <= maximum
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev",
        "st_ino",
        "st_mode",
        "st_uid",
        "st_gid",
        "st_nlink",
        "st_size",
        "st_mtime_ns",
        "st_ctime_ns",
    ):
        assert getattr(before, field) == getattr(after, field), (path, field)
    assert len(raw) == before.st_size
    return raw


materializer_raw = direct(MATERIALIZER, 256 * 1024)
lock_raw = direct(LOCK, 128 * 1024)
candidate_raw = direct(CANDIDATE, 2 * 1024 * 1024)
launcher_raw = direct(LAUNCHER_SOURCE, 2 * 1024 * 1024)
installer_raw = direct(INSTALLER_SOURCE, 2 * 1024 * 1024)
protected_installer_raw = direct(PROTECTED_INSTALLER, 2 * 1024 * 1024)

assert git_blob(materializer_raw) == MATERIALIZER_BLOB
assert git_blob(lock_raw) == LOCK_BLOB
assert git_blob(candidate_raw) == CANDIDATE_BLOB
assert git_blob(launcher_raw) == LAUNCHER_SOURCE_BLOB
assert git_blob(installer_raw) == INSTALLER_SOURCE_BLOB
assert git_blob(protected_installer_raw) == PROTECTED_INSTALLER_BLOB

consumer_source = protected_installer_raw.decode("utf-8", "strict")
for required in (
    "LAUNCHER_BYTES = 731_072",
    '"4fbf67bff503cead931b59e4364d66ccf2f2d6c0ee40182b6f9498cf96e8f51a"',
    "launcher_raw = _read_exact_candidate(",
    "expected_bytes=LAUNCHER_BYTES",
    "expected_sha256=LAUNCHER_SHA256",
    '"--launcher"',
    "launcher_candidate_verified=true",
    "launcher_execution_authorized=false",
):
    assert required in consumer_source, required

lock = json.loads(lock_raw.decode("utf-8", "strict"))
assert lock["lock_id"] == LOCK_ID
assert lock["candidate_accepted"] is True
assert lock["launcher_binary_identity_accepted"] is True
assert lock["protected_install_authorized"] is False
assert lock["precision_install_authorized"] is False
assert lock["funds_movement_authorized"] is False
report = lock["candidate_report"]
assert report["candidate_id"] == CANDIDATE_ID
assert report["candidate_script_git_blob_sha1"] == CANDIDATE_BLOB
assert report["launcher_source_git_blob_sha1"] == LAUNCHER_SOURCE_BLOB
assert report["installer_source_git_blob_sha1"] == INSTALLER_SOURCE_BLOB
assert report["launcher_binary_bytes"] == EXPECTED_BYTES
assert report["launcher_binary_sha256"] == EXPECTED_SHA256
assert report["semantic_report_validation_fail_closed"] is True

source = materializer_raw.decode("utf-8", "strict")
for required in (
    'CANDIDATE_MERGE = "9eebcd1bb15ea0b853c3c7cfe0ffd8dd60030a30"',
    'LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"',
    'CANDIDATE_BLOB = "1d15fccf256571c382a09d99c8545d5b24ad2077"',
    'EXPECTED_BINARY_BYTES = 731_072',
    '"worktree",',
    '"add",',
    '"--detach",',
    'load_candidate_from_worktree(worktree)',
    'report, binary = module.derive()',
    'write_create_only(args.derive, binary)',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
    'os.O_DIRECTORY',
    'os.fsync(fd)',
    'os.fsync(parent_fd)',
    'output_descriptor_readback_mismatch',
    'output_visible_generation_changed',
    'output_failure_destructive_cleanup=false',
    'protected_install_authorized=false',
    'precision_install_authorized=false',
    'native_or_binder_live_execution_authorized=false',
    'funds_movement=false',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "payment_acceptance=true",
    "public_presale_activation=true",
    "wc_void_market_activation=true",
    "funds_movement=true",
    "os.unlink(",
    "Path.unlink(",
):
    assert forbidden not in source, forbidden

python = "/usr/bin/python3"
self_test = subprocess.run(
    [python, "-I", "-B", str(MATERIALIZER), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=60,
)
assert self_test.returncode == 0, self_test.stderr
for line in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_MATERIALIZER_V1_SELF_TEST_GREEN",
    "accepted_first_entry_lock_bound=true",
    "candidate_merge_exact=true",
    "candidate_tool_verified_before_execution=true",
    "candidate_rederived_at_locked_merge=true",
    "create_only_output=true",
    "output_descriptor_readback=true",
    "output_parent_directory_fsync=true",
    "output_failure_destructive_cleanup=false",
    "launcher_binary_identity_accepted=true",
    "protected_install_authorized=false",
    "precision_install_authorized=false",
    "native_or_binder_live_execution_authorized=false",
    "funds_movement=false",
):
    assert line in self_test.stdout.splitlines(), line

with tempfile.TemporaryDirectory(
    prefix="void-e2-first-entry-materializer-proof-"
) as td:
    root = Path(td)
    first = root / "launcher-a"
    second = root / "launcher-b"

    outputs: list[bytes] = []
    for target in (first, second):
        cp = subprocess.run(
            [python, "-I", "-B", str(MATERIALIZER), "--derive", str(target)],
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=300,
        )
        assert cp.returncode == 0, cp.stderr
        lines = cp.stdout.splitlines()
        for line in (
            "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_MATERIALIZER_V1_DERIVE_GREEN",
            "candidate_report_sha256=" + EXPECTED_REPORT_SHA256,
            "candidate_id=" + CANDIDATE_ID,
            "launcher_binary_bytes=" + str(EXPECTED_BYTES),
            "launcher_binary_sha256=" + EXPECTED_SHA256,
            "accepted_lock_id=" + LOCK_ID,
            "output_descriptor_readback=true",
            "output_parent_directory_fsync=true",
            "output_failure_destructive_cleanup=false",
            "launcher_binary_identity_accepted=true",
            "protected_install_authorized=false",
            "precision_install_authorized=false",
            "native_or_binder_live_execution_authorized=false",
            "funds_movement=false",
        ):
            assert line in lines, line
        st = target.lstat()
        assert stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode)
        assert st.st_nlink == 1
        assert stat.S_IMODE(st.st_mode) == 0o555
        assert st.st_size == EXPECTED_BYTES
        raw = target.read_bytes()
        assert len(raw) == EXPECTED_BYTES
        assert hashlib.sha256(raw).hexdigest() == EXPECTED_SHA256
        outputs.append(raw)

    assert outputs[0] == outputs[1]

    readelf = subprocess.run(
        ["/usr/bin/readelf", "-lW", str(first)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
    )
    assert readelf.returncode == 0, readelf.stderr
    assert " INTERP " not in readelf.stdout
    assert "Requesting program interpreter" not in readelf.stdout

    dynamic = subprocess.run(
        ["/usr/bin/readelf", "-dW", str(first)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
    )
    assert "NEEDED" not in dynamic.stdout + dynamic.stderr

    duplicate = subprocess.run(
        [python, "-I", "-B", str(MATERIALIZER), "--derive", str(first)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=300,
    )
    assert duplicate.returncode == 2
    duplicate_lines = duplicate.stdout.splitlines()
    assert "reason=output_exists" in duplicate_lines
    assert "protected_install_authorized=false" in duplicate_lines
    assert "funds_movement=false" in duplicate_lines

print(MARKER + "_GREEN")
print("materializer_blob_bound=true")
print("accepted_first_entry_lock_bound=true")
print("candidate_tool_blob_bound=true")
print("launcher_source_blob_bound=true")
print("installer_source_blob_bound=true")
print("protected_installer_consumer_bound=true")
print("candidate_rederived_at_locked_merge=true")
print("two_materializations_byte_identical=true")
print("accepted_binary_bytes=" + str(EXPECTED_BYTES))
print("accepted_binary_sha256=" + EXPECTED_SHA256)
print("static_no_pt_interp_verified=true")
print("dynamic_needed_absent=true")
print("create_only_output_replay_rejected=true")
print("output_descriptor_readback=true")
print("output_parent_directory_fsync=true")
print("output_failure_destructive_cleanup=false")
print("artifact_publication_only=true")
print("protected_install_authorized=false")
print("precision_install_authorized=false")
print("native_or_binder_live_execution_authorized=false")
print("funds_movement=false")
