#!/usr/bin/env python3
from __future__ import annotations

import fcntl
import hashlib
import os
from pathlib import Path
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "ops/xiphos/apollyon_training_service_lifecycle_lock_v1.py"
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "8a97efa384bb8e8576114f35566a6b9dd9317a8a"

FIXTURE_BYTES = (
    b"[Unit]\n"
    b"Description=VOID hosted lifecycle lock fixture\n"
    b"[Service]\n"
    b"ExecStart=/bin/false\n"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


raw = TARGET.read_bytes()
assert git_blob(raw) == TARGET_BLOB

module = types.ModuleType("apollyon_training_service_lifecycle_lock_v1_verified")
module.__file__ = str(TARGET)
module.__package__ = None
exec(
    compile(
        raw.decode("utf-8", "strict"),
        TARGET_REL,
        "exec",
        dont_inherit=True,
        optimize=0,
    ),
    module.__dict__,
)
module.self_test()

uid = os.getuid()
gid = os.getgid()
fixture_blob = git_blob(FIXTURE_BYTES)


def expect_hold(callable_, reason: str) -> None:
    try:
        callable_()
    except module.Hold as exc:
        assert str(exc) == reason, (str(exc), reason)
    else:
        raise AssertionError("expected HOLD: " + reason)


def create_fixture(base: Path, name: str = "system") -> tuple[Path, Path]:
    lock_root = base / name
    lock_root.mkdir(mode=0o700)
    unit = lock_root / "void-apollyon-training-bus-isolation-v1.service"
    unit.write_bytes(FIXTURE_BYTES)
    unit.chmod(0o644)
    return lock_root, unit


def acquire(lock_root: Path, unit: Path):
    return module._acquire_at(
        lock_root,
        unit,
        fixture_blob,
        uid,
        gid,
        uid,
        gid,
        0o644,
    )


with tempfile.TemporaryDirectory(
    prefix="void-apollyon-training-lifecycle-lock-v1-"
) as td:
    base = Path(td)
    lock_root, unit = create_fixture(base)

    first = acquire(lock_root, unit)
    assert first.identity["lock_root"] == str(lock_root)
    assert first.identity["unit_path"] == str(unit)
    assert first.identity["unit_git_blob_sha1"] == fixture_blob
    assert first.identity["unit_mode"] == "0644"
    assert fcntl.fcntl(first.fd, fcntl.F_GETFD) & fcntl.FD_CLOEXEC
    first.revalidate()

    expect_hold(
        lambda: acquire(lock_root, unit),
        "training_service_lifecycle_lock_busy",
    )
    first.close()

    second = acquire(lock_root, unit)
    second.revalidate()
    second.close()

    expect_hold(
        lambda: module._acquire_at(
            lock_root,
            unit,
            "0" * 40,
            uid,
            gid,
            uid,
            gid,
            0o644,
        ),
        "training_service_lifecycle_unit_identity_invalid",
    )

    unit.chmod(0o664)
    expect_hold(
        lambda: acquire(lock_root, unit),
        "training_service_lifecycle_unit_metadata_invalid",
    )
    unit.chmod(0o644)

    symlink_unit = lock_root / "symlink.service"
    symlink_unit.symlink_to(unit.name)
    expect_hold(
        lambda: module._acquire_at(
            lock_root,
            symlink_unit,
            fixture_blob,
            uid,
            gid,
            uid,
            gid,
            0o644,
        ),
        "training_service_lifecycle_unit_open_failed",
    )

    lock_root.chmod(0o777)
    expect_hold(
        lambda: acquire(lock_root, unit),
        "training_service_lifecycle_lock_root_metadata_invalid",
    )
    lock_root.chmod(0o700)

with tempfile.TemporaryDirectory(
    prefix="void-apollyon-training-lifecycle-root-drift-v1-"
) as td:
    base = Path(td)
    lock_root, unit = create_fixture(base, "root")
    held = acquire(lock_root, unit)
    moved = base / "root-old"
    lock_root.rename(moved)
    replacement = base / "root"
    replacement.mkdir(mode=0o700)
    replacement_unit = (
        replacement / "void-apollyon-training-bus-isolation-v1.service"
    )
    replacement_unit.write_bytes(FIXTURE_BYTES)
    replacement_unit.chmod(0o644)
    expect_hold(
        held.revalidate,
        "training_service_lifecycle_lock_root_generation_changed",
    )
    held.close()

with tempfile.TemporaryDirectory(
    prefix="void-apollyon-training-lifecycle-crash-v1-"
) as td:
    base = Path(td)
    lock_root, unit = create_fixture(base)
    ready_r, ready_w = os.pipe()
    go_r, go_w = os.pipe()
    pid = os.fork()
    if pid == 0:
        try:
            os.close(ready_r)
            os.close(go_w)
            child_lock = acquire(lock_root, unit)
            os.write(ready_w, b"R")
            if os.read(go_r, 1) != b"G":
                os._exit(72)
            # Deliberately bypass Python cleanup. Kernel process teardown must
            # close the lock FD and release flock.
            _ = child_lock
            os._exit(0)
        except BaseException:
            os._exit(73)

    os.close(ready_w)
    os.close(go_r)
    assert os.read(ready_r, 1) == b"R"
    os.close(ready_r)

    expect_hold(
        lambda: acquire(lock_root, unit),
        "training_service_lifecycle_lock_busy",
    )
    assert os.write(go_w, b"G") == 1
    os.close(go_w)
    waited, status = os.waitpid(pid, 0)
    assert waited == pid
    assert os.WIFEXITED(status) and os.WEXITSTATUS(status) == 0

    after_crash = acquire(lock_root, unit)
    after_crash.revalidate()
    after_crash.close()

source = TARGET.read_text(encoding="utf-8")
for required in (
    'LOCK_ROOT: Final = Path("/etc/systemd/system")',
    '"void-apollyon-training-bus-isolation-v1.service"',
    '"62fbabe1cf7ae0d940f5d96e19b06282f841267b"',
    "fcntl.LOCK_EX | fcntl.LOCK_NB",
    "fcntl.FD_CLOEXEC",
    "os.O_DIRECTORY",
    "os.O_NOFOLLOW",
    "training_service_lifecycle_lock_busy",
    "training_service_lifecycle_lock_root_generation_changed",
    "training_service_lifecycle_unit_identity_invalid",
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "subprocess",
    "socket",
    "eth_send",
    "createPrivateKey",
    "os.unlink",
    "os.replace",
    "training_execution=true",
    "funds_movement=true",
):
    assert forbidden not in source, forbidden

print("VOID_APOLLYON_TRAINING_SERVICE_LIFECYCLE_LOCK_V1_PROOF_GREEN")
print("source_blob_bound=true")
print("stable_systemd_directory_lock_domain=true")
print("exact_training_unit_identity_bound=true")
print("same_process_contention_rejected=true")
print("close_release_reacquire_proven=true")
print("cross_process_contention_rejected=true")
print("process_exit_crash_release_proven=true")
print("unit_symlink_rejected=true")
print("unit_mode_drift_rejected=true")
print("unit_blob_drift_rejected=true")
print("lock_root_writable_rejected=true")
print("lock_root_replacement_rejected=true")
print("fd_cloexec_proven=true")
print("filesystem_write_outside_temp=false")
print("service_action=false")
print("training_execution=false")
print("funds_movement=false")
