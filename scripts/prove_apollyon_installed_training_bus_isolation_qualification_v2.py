#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import fcntl
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v2.py"
V1 = ROOT / "ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py"
V1_BLOB = "1fdb495aafa136119d50f41410b015930d9fc90d"
RUNNER = ROOT / "tools/apollyon-live-custody-source-session-runner-v2.mjs"
RUNNER_BLOB = "8c2c92055ab05c074653cee971e095934b5cb85c"
LAUNCHER = ROOT / "ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"
LAUNCHER_BLOB = "352bd36f2b07091140b990de4170f708eb11fee6"
LEGACY_LAUNCHER = ROOT / "ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"
LEGACY_LAUNCHER_BLOB = "820f7151c0f83280b7457f841cee14c3b0c274b6"
CANONICAL_INSTALLER = ROOT / "ops/xiphos/apollyon_live_custody_source_session_create_only_install_v1.py"
CANONICAL_INSTALLER_BLOB = "87fa30d10d8d18716cd37ee2d375f0a1d094bdcf"
CANONICAL_UPGRADE = ROOT / "ops/xiphos/apollyon_live_custody_reviewed_root_v2_upgrade_v1.py"
CANONICAL_UPGRADE_BLOB = "95b2f64562e995611807aac7f9b8b044775f203b"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob(V1.read_bytes()) == V1_BLOB
assert git_blob(RUNNER.read_bytes()) == RUNNER_BLOB
assert git_blob(LAUNCHER.read_bytes()) == LAUNCHER_BLOB
assert git_blob(LEGACY_LAUNCHER.read_bytes()) == LEGACY_LAUNCHER_BLOB
assert git_blob(CANONICAL_INSTALLER.read_bytes()) == CANONICAL_INSTALLER_BLOB
assert git_blob(CANONICAL_UPGRADE.read_bytes()) == CANONICAL_UPGRADE_BLOB

spec = importlib.util.spec_from_file_location("qualifier_v2", TARGET)
assert spec and spec.loader
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

launcher_spec = importlib.util.spec_from_file_location("launcher_v2", LAUNCHER)
assert launcher_spec and launcher_spec.loader
launcher = importlib.util.module_from_spec(launcher_spec)
launcher_spec.loader.exec_module(launcher)

mod.self_test()

authority_out = io.StringIO()
with contextlib.redirect_stdout(authority_out):
    mod._emit_live_authority()
authority_lines = authority_out.getvalue().splitlines()
for required in (
    mod.MARKER,
    "mode=live-qualify-retired",
    "host_filesystem_mutation=false",
    "git_mutation=false",
    "git_fetch=false",
    "service_process_action=false",
    "service_start_stop=false",
    "credential_access=false",
    "wallet_or_signer_access=false",
    "transaction_construction=false",
    "transaction_signing=false",
    "transaction_broadcast=false",
    "chain_mutation=false",
    "economic_activation=false",
    "funds_movement=false",
    "authority_receipt_before_retired_hold=true",
):
    assert required in authority_lines, required

original_root = mod.ROOT
original_cache = mod._V1_CACHE
try:
    with tempfile.TemporaryDirectory(prefix="void-apollyon-v2-missing-v1-") as td:
        mod.ROOT = Path(td)
        mod._V1_CACHE = None
        try:
            mod._v1()
        except mod.Hold as exc:
            assert str(exc) == "v1_source_unavailable", str(exc)
        else:
            raise AssertionError("missing V1 dependency did not HOLD")
finally:
    mod.ROOT = original_root
    mod._V1_CACHE = original_cache


def expect_hold(callable_, reason: str) -> None:
    try:
        callable_()
    except mod.Hold as exc:
        assert str(exc) == reason, (str(exc), reason)
    else:
        raise AssertionError("expected HOLD: " + reason)


# Prove catchable termination handlers latch and restore cleanly.
termination_latch = mod.TerminationLatch()
termination_previous = mod._install_termination_handlers(termination_latch)
try:
    termination_latch.handler(int(mod.signal.SIGTERM), None)
    assert termination_latch.signum == int(mod.signal.SIGTERM)
    assert mod._termination_reason(termination_latch) == (
        "termination_signal_received:SIGTERM"
    )
finally:
    mod._restore_termination_handlers(termination_previous)
for key, handler in termination_previous.items():
    assert mod.signal.getsignal(key) == handler


# If the visible launcher path disappears after its descriptor is opened,
# revalidation must become machine-readable HOLD rather than an OSError traceback.
class _VanishingLauncherPath:
    def __init__(self, path: Path):
        self.path = path
        self.calls = 0

    def __fspath__(self) -> str:
        return os.fspath(self.path)

    def lstat(self):
        self.calls += 1
        if self.calls == 1:
            return self.path.lstat()
        raise FileNotFoundError("fixture launcher vanished")


with tempfile.TemporaryDirectory(
    prefix="void-apollyon-launcher-revalidation-v2-"
) as td:
    launcher_fixture = Path(td) / "launcher.py"
    launcher_bytes = b"#!/usr/bin/env python3\n"
    launcher_fixture.write_bytes(launcher_bytes)
    launcher_fixture.chmod(0o600)
    vanishing = _VanishingLauncherPath(launcher_fixture)
    expect_hold(
        lambda: mod._verify_lock_aware_live_launcher_installed(
            vanishing,
            expected_blob=git_blob(launcher_bytes),
            expected_uid=os.geteuid(),
            expected_gid=os.getegid(),
            expected_mode=0o600,
        ),
        "lock_aware_live_launcher_revalidation_failed",
    )
    assert vanishing.calls == 2


orig_run = mod._run_systemctl
orig_state = mod._service_state
orig_generation = mod._process_generation_present

try:
    mod._run_systemctl = lambda *args, **kwargs: SimpleNamespace(
        returncode=1,
        stdout="",
        stderr="forced stop failure",
    )
    expect_hold(
        lambda: mod._stop_and_verify(4242, 123456, timeout_seconds=0.0),
        "service_stop_command_failed",
    )

    def run_ok(*args, **kwargs):
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    mod._run_systemctl = run_ok
    mod._service_state = lambda: {
        "load_state": "loaded",
        "active_state": "active",
        "sub_state": "running",
        "mainpid": 4242,
        "unit_file_state": "static",
    }
    mod._process_generation_present = lambda pid, ticks: True
    expect_hold(
        lambda: mod._stop_and_verify(4242, 123456, timeout_seconds=0.0),
        "service_shutdown_not_proven",
    )

    mod._service_state = lambda: {
        "load_state": "loaded",
        "active_state": "inactive",
        "sub_state": "dead",
        "mainpid": 0,
        "unit_file_state": "static",
    }
    mod._process_generation_present = lambda pid, ticks: True
    expect_hold(
        lambda: mod._stop_and_verify(4242, 123456, timeout_seconds=0.0),
        "service_shutdown_not_proven",
    )

    mod._service_state = lambda: {
        "load_state": "loaded",
        "active_state": "inactive",
        "sub_state": "exited",
        "mainpid": 0,
        "unit_file_state": "static",
    }
    mod._process_generation_present = lambda pid, ticks: False
    expect_hold(
        lambda: mod._stop_and_verify(4242, 123456, timeout_seconds=0.0),
        "service_shutdown_not_proven",
    )

    mod._service_state = lambda: {
        "load_state": "loaded",
        "active_state": "inactive",
        "sub_state": "dead",
        "mainpid": 0,
        "unit_file_state": "static",
    }
    mod._process_generation_present = lambda pid, ticks: False
    green = mod._stop_and_verify(4242, 123456, timeout_seconds=0.0)
    assert green == {
        "load_state": "loaded",
        "active_state": "inactive",
        "sub_state": "dead",
        "mainpid": 0,
        "unit_file_state": "static",
        "observed_process_generation_absent": True,
        "service_state_snapshot_stable": True,
        "stop_command_succeeded": True,
        "service_enabled": False,
    }

    mod._service_state = lambda: {
        "load_state": "loaded",
        "active_state": "inactive",
        "sub_state": "dead",
        "mainpid": 0,
        "unit_file_state": "enabled",
    }
    mod._process_generation_present = lambda pid, ticks: False
    expect_hold(
        lambda: mod._stop_and_verify(4242, 123456, timeout_seconds=0.0),
        "service_shutdown_not_proven",
    )

    shutdown_states = iter((
        {
            "load_state": "loaded",
            "active_state": "inactive",
            "sub_state": "dead",
            "mainpid": 0,
            "unit_file_state": "static",
        },
        {
            "load_state": "loaded",
            "active_state": "active",
            "sub_state": "running",
            "mainpid": 5252,
            "unit_file_state": "static",
        },
    ))
    mod._service_state = lambda: next(shutdown_states)
    mod._process_generation_present = lambda pid, ticks: False
    expect_hold(
        lambda: mod._stop_and_verify(4242, 123456, timeout_seconds=0.0),
        "service_shutdown_not_proven",
    )
finally:
    mod._run_systemctl = orig_run
    mod._service_state = orig_state
    mod._process_generation_present = orig_generation

# A service state is one systemctl-show snapshot, never four independent reads.
saved_v1 = mod._v1
saved_run = mod._run_systemctl
snapshot_calls = []
snapshot_v1 = SimpleNamespace(UNIT="fixture.service", Hold=mod.Hold)
try:
    mod._v1 = lambda: snapshot_v1

    def snapshot_run(*args, **kwargs):
        snapshot_calls.append((args, kwargs))
        return SimpleNamespace(
            returncode=0,
            stdout=(
                "LoadState=loaded\n"
                "ActiveState=inactive\n"
                "SubState=dead\n"
                "MainPID=0\n"
                "UnitFileState=static\n"
            ),
            stderr="",
        )

    mod._run_systemctl = snapshot_run
    snapshot = mod._service_state()
    assert len(snapshot_calls) == 1
    assert snapshot == {
        "load_state": "loaded",
        "active_state": "inactive",
        "sub_state": "dead",
        "mainpid": 0,
        "unit_file_state": "static",
    }
finally:
    mod._v1 = saved_v1
    mod._run_systemctl = saved_run

# Effective systemd authority is one exact property snapshot plus reviewed
# manager UnitPath/dependency closure.
saved_v1 = mod._v1
saved_run = mod._run_systemctl
saved_dependencies = mod._assert_no_training_dependency_directories
effective_v1 = SimpleNamespace(
    UNIT="fixture.service",
    UNIT_PATH=Path("/etc/systemd/system/fixture.service"),
    PREENTRY_PATH=Path("/opt/fixture/preentry"),
    Hold=mod.Hold,
)
effective_props = {
    "FragmentPath": "/etc/systemd/system/fixture.service",
    "DropInPaths": "",
    "NeedDaemonReload": "no",
    "ExecStart": (
        "{ path=/opt/fixture/preentry ; argv[]=/opt/fixture/preentry ; "
        "ignore_errors=no ; start_time=[n/a] ; stop_time=[n/a] ; "
        "pid=0 ; code=(null) ; status=0/0 }"
    ),
    "RequiredBy": "",
    "WantedBy": "",
    "UpheldBy": "",
    "BoundBy": "",
    "TriggeredBy": "",
    "ConflictedBy": "",
    "StopPropagatedFrom": "",
}
unit_path_value = ["/etc/systemd/system"]
dependency_roots = []
try:
    mod._v1 = lambda: effective_v1

    def effective_run(*args, **kwargs):
        if args[:2] == ("show", "fixture.service"):
            return SimpleNamespace(
                returncode=0,
                stdout="".join(
                    key + "=" + effective_props[key] + "\n"
                    for key in (
                        "FragmentPath",
                        "DropInPaths",
                        "NeedDaemonReload",
                        "ExecStart",
                        "RequiredBy",
                        "WantedBy",
                        "UpheldBy",
                        "BoundBy",
                        "TriggeredBy",
                        "ConflictedBy",
                        "StopPropagatedFrom",
                    )
                ),
                stderr="",
            )
        if args == ("show", "--property=UnitPath", "--value"):
            return SimpleNamespace(
                returncode=0,
                stdout=unit_path_value[0] + "\n",
                stderr="",
            )
        raise AssertionError(("unexpected systemctl fixture", args, kwargs))

    mod._run_systemctl = effective_run
    mod._assert_no_training_dependency_directories = (
        lambda roots: dependency_roots.append(tuple(roots))
    )
    effective = mod._verify_effective_unit_contract()
    assert effective == {
        "fragment_path": "/etc/systemd/system/fixture.service",
        "drop_in_paths_empty": True,
        "need_daemon_reload": False,
        "exec_start": "/opt/fixture/preentry",
        "reviewed_unit_path": ["/etc/systemd/system"],
        "dependency_directories_empty": True,
        "reverse_lifecycle_dependencies_empty": True,
    }
    assert dependency_roots == [("/etc/systemd/system",)]

    effective_props["FragmentPath"] = "/run/systemd/system/fixture.service"
    expect_hold(
        mod._verify_effective_unit_contract,
        "effective_unit_fragment_invalid",
    )
    effective_props["FragmentPath"] = "/etc/systemd/system/fixture.service"

    effective_props["DropInPaths"] = "/etc/systemd/system/fixture.service.d/10.conf"
    expect_hold(
        mod._verify_effective_unit_contract,
        "effective_unit_dropins_present",
    )
    effective_props["DropInPaths"] = ""

    effective_props["NeedDaemonReload"] = "yes"
    expect_hold(
        mod._verify_effective_unit_contract,
        "effective_unit_needs_daemon_reload",
    )
    effective_props["NeedDaemonReload"] = "no"

    effective_props["ExecStart"] = (
        "{ path=/opt/fixture/other ; argv[]=/opt/fixture/other ; "
        "ignore_errors=no }"
    )
    expect_hold(
        mod._verify_effective_unit_contract,
        "effective_unit_execstart_invalid",
    )
    effective_props["ExecStart"] = (
        "{ path=/opt/fixture/preentry ; argv[]=/opt/fixture/preentry ; "
        "ignore_errors=no }"
    )

    effective_props["WantedBy"] = "foreign.service"
    expect_hold(
        mod._verify_effective_unit_contract,
        "effective_unit_reverse_lifecycle_dependency_present:WantedBy",
    )
    effective_props["WantedBy"] = ""

    unit_path_value[0] = "/unreviewed/systemd/system"
    expect_hold(
        mod._verify_effective_unit_contract,
        "effective_unit_path_unreviewed",
    )
    unit_path_value[0] = "/etc/systemd/system"
finally:
    mod._v1 = saved_v1
    mod._run_systemctl = saved_run
    mod._assert_no_training_dependency_directories = saved_dependencies

with tempfile.TemporaryDirectory(
    prefix="void-apollyon-v2-dependency-dir-"
) as td:
    hostile_root = Path(td)
    wants = hostile_root / "fixture.service.wants"
    wants.mkdir()
    (wants / "foreign.service").write_text("x", encoding="ascii")
    saved_v1 = mod._v1
    try:
        mod._v1 = lambda: effective_v1
        expect_hold(
            lambda: mod._assert_no_training_dependency_directories(
                (str(hostile_root),)
            ),
            "effective_unit_unreviewed_dependency_entry",
        )
    finally:
        mod._v1 = saved_v1

# Prove the installed-launcher identity gate accepts only the exact retained
# successor bytes and rejects the legacy/unreviewed generation.
with tempfile.TemporaryDirectory(
    prefix="void-apollyon-lock-aware-launcher-v2-"
) as td:
    installed = Path(td) / "apollyon_live_custody_source_session_launcher_v2.py"
    successor_bytes = LAUNCHER.read_bytes()
    installed.write_bytes(successor_bytes)
    installed.chmod(0o600)
    accepted = mod._verify_lock_aware_live_launcher_installed(
        installed,
        expected_blob=LAUNCHER_BLOB,
        expected_uid=os.geteuid(),
        expected_gid=os.getegid(),
        expected_mode=0o600,
    )
    assert accepted["git_blob_sha1"] == LAUNCHER_BLOB
    installed.write_bytes(LEGACY_LAUNCHER.read_bytes())
    expect_hold(
        lambda: mod._verify_lock_aware_live_launcher_installed(
            installed,
            expected_blob=LAUNCHER_BLOB,
            expected_uid=os.geteuid(),
            expected_gid=os.getegid(),
            expected_mode=0o600,
        ),
        "lock_aware_live_launcher_identity_mismatch",
    )

# Prove the replacement-stable root-only lock inode is exclusive,
# close-released, shared by qualifier/launcher, and independent of unit-file
# replacement.
with tempfile.TemporaryDirectory(prefix="void-apollyon-lifecycle-lock-v2-") as td:
    lock_root = Path(td) / "preentry-root"
    lock_root.mkdir(mode=0o700)
    lock_file = lock_root / ".training-service-lifecycle-v1.lock"
    lock_file.write_bytes(b"")
    lock_file.chmod(0o600)
    unit = lock_root / "training.service"
    unit.write_text("reviewed unit\n", encoding="ascii")

    lock_fd = mod._acquire_training_lifecycle_lock(
        lock_file,
        expected_uid=os.geteuid(),
        expected_gid=os.getegid(),
        expected_mode=0o600,
    )
    replacement_unit = lock_root / ".training.service.new"
    replacement_unit.write_text("reviewed unit\n", encoding="ascii")
    os.replace(replacement_unit, unit)

    contender = os.open(lock_file, os.O_RDONLY)
    try:
        try:
            fcntl.flock(contender, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            pass
        else:
            raise AssertionError(
                "lock inode split after sibling unit-file replacement"
            )
    finally:
        os.close(contender)

    try:
        try:
            launcher.acquire_training_lifecycle_lock(
                lock_file,
                require_root_custody=False,
                expected_mode=0o600,
            )
        except launcher.Hold as exc:
            assert str(exc) == (
                "apollyon_live_session_launcher_training_lifecycle_busy"
            ), str(exc)
        else:
            raise AssertionError(
                "launcher acquired qualifier-held lifecycle inode"
            )
    finally:
        mod._release_training_lifecycle_lock(lock_fd)

    launcher_fd = launcher.acquire_training_lifecycle_lock(
        lock_file,
        require_root_custody=False,
        expected_mode=0o600,
    )
    try:
        expect_hold(
            lambda: mod._acquire_training_lifecycle_lock(
                lock_file,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                expected_mode=0o600,
            ),
            "training_service_lifecycle_busy",
        )
    finally:
        launcher.release_training_lifecycle_lock(launcher_fd)

    qualifier_fd = mod._acquire_training_lifecycle_lock(
        lock_file,
        expected_uid=os.geteuid(),
        expected_gid=os.getegid(),
        expected_mode=0o600,
    )
    mod._release_training_lifecycle_lock(qualifier_fd)

# Prove visible lock-path loss after descriptor open or after flock becomes
# machine-readable HOLD rather than an OSError traceback.  In both cases the
# already-open descriptor remains valid, which isolates the pathname
# revalidation boundary reported by review.
with tempfile.TemporaryDirectory(
    prefix="void-apollyon-lock-path-loss-after-open-v2-"
) as td:
    lock_file = Path(td) / ".training-service-lifecycle-v1.lock"
    lock_file.write_bytes(b"")
    lock_file.chmod(0o600)
    saved_open = mod.os.open

    def open_then_unlink(path, flags, *args, **kwargs):
        fd = saved_open(path, flags, *args, **kwargs)
        Path(path).unlink()
        return fd

    try:
        mod.os.open = open_then_unlink
        expect_hold(
            lambda: mod._acquire_training_lifecycle_lock(
                lock_file,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                expected_mode=0o600,
            ),
            "training_service_lifecycle_lock_revalidation_failed",
        )
    finally:
        mod.os.open = saved_open

with tempfile.TemporaryDirectory(
    prefix="void-apollyon-lock-path-loss-after-flock-v2-"
) as td:
    lock_file = Path(td) / ".training-service-lifecycle-v1.lock"
    lock_file.write_bytes(b"")
    lock_file.chmod(0o600)
    saved_flock = mod.fcntl.flock

    def flock_then_unlink(fd, operation):
        result = saved_flock(fd, operation)
        lock_file.unlink()
        return result

    try:
        mod.fcntl.flock = flock_then_unlink
        expect_hold(
            lambda: mod._acquire_training_lifecycle_lock(
                lock_file,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                expected_mode=0o600,
            ),
            "training_service_lifecycle_lock_revalidation_failed",
        )
    finally:
        mod.fcntl.flock = saved_flock

# On hosted runners, prove a root-owned 0600 lock inode cannot be opened by the
# ordinary runner account. Future host install must create this inode once and
# preserve it across launcher/unit refreshes.
if os.geteuid() != 0:
    sudo = shutil.which("sudo")
    assert sudo is not None
    with tempfile.TemporaryDirectory(
        prefix="void-apollyon-root-only-lock-v2-"
    ) as td:
        protected = Path(td) / ".training-service-lifecycle-v1.lock"
        protected.write_bytes(b"")
        protected.chmod(0o600)
        subprocess.run(
            [sudo, "-n", "chown", "0:0", os.fspath(protected)],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            os.open(protected, os.O_RDONLY)
        except PermissionError:
            pass
        else:
            raise AssertionError("non-root process opened root-only lock inode")

# Prove the lock survives launcher-parent loss because the Node runner inherits
# the same lock-inode open file description through pass_fds.
node = shutil.which("node")
assert node is not None
with tempfile.TemporaryDirectory(
    prefix="void-apollyon-inherited-lifecycle-lock-v2-"
) as td:
    lock_file = Path(td) / ".training-service-lifecycle-v1.lock"
    lock_file.write_bytes(b"")
    lock_file.chmod(0o600)
    launcher_fd = launcher.acquire_training_lifecycle_lock(
        lock_file,
        require_root_custody=False,
        expected_mode=0o600,
    )
    holder = subprocess.Popen(
        [node, "-e", "setInterval(()=>{},1000)"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        env={"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LC_ALL": "C"},
        pass_fds=(launcher_fd,),
    )
    launcher.release_training_lifecycle_lock(launcher_fd)
    try:
        expect_hold(
            lambda: mod._acquire_training_lifecycle_lock(
                lock_file,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                expected_mode=0o600,
            ),
            "training_service_lifecycle_busy",
        )
    finally:
        holder.terminate()
        holder.wait(timeout=10)
    qualifier_fd = mod._acquire_training_lifecycle_lock(
        lock_file,
        expected_uid=os.geteuid(),
        expected_gid=os.getegid(),
        expected_mode=0o600,
    )
    mod._release_training_lifecycle_lock(qualifier_fd)

# Prove abnormal Node-runner loss triggers stop plus two stable exact-dormant
# snapshots before the launcher can proceed to release its lifecycle lock.
saved_training_run = launcher._run_training_systemctl
saved_training_state = launcher._training_service_state
cleanup_events = []
dormant = {
    "LoadState": "loaded",
    "ActiveState": "inactive",
    "SubState": "dead",
    "MainPID": "0",
    "UnitFileState": "static",
}
try:
    launcher._run_training_systemctl = lambda args, check=True: (
        cleanup_events.append(("systemctl", tuple(args), check))
        or SimpleNamespace(returncode=0, stdout="", stderr="")
    )
    states = iter((dict(dormant), dict(dormant)))
    launcher._training_service_state = lambda: (
        cleanup_events.append(("state",))
        or next(states)
    )
    attested = launcher._stop_training_after_runner_loss(0.0)
    assert attested == dormant
    assert cleanup_events[0] == (
        "systemctl",
        ("stop", launcher.TRAINING_UNIT),
        False,
    )
    assert cleanup_events.count(("state",)) == 2

    launcher._training_service_state = lambda: {
        "LoadState": "loaded",
        "ActiveState": "active",
        "SubState": "running",
        "MainPID": "4242",
        "UnitFileState": "static",
    }
    try:
        launcher._stop_training_after_runner_loss(0.0)
    except launcher.Hold as exc:
        assert str(exc) == (
            "apollyon_live_session_launcher_training_shutdown_unproven"
        ), str(exc)
    else:
        raise AssertionError("active service accepted after runner loss")
finally:
    launcher._run_training_systemctl = saved_training_run
    launcher._training_service_state = saved_training_state

# Prove the lock-aware launcher rejects manager-derived reverse activation
# paths before invoking the reviewed Node runner.
saved_launcher_systemctl = launcher._run_training_systemctl
try:
    empty_reverse = "".join(
        name + "=\n"
        for name in launcher.TRAINING_REVERSE_LIFECYCLE_PROPERTIES
    )
    launcher._run_training_systemctl = lambda args, check=True: (
        SimpleNamespace(returncode=0, stdout=empty_reverse, stderr="")
    )
    reverse_clean = (
        launcher._verify_training_reverse_lifecycle_dependencies_absent()
    )
    assert set(reverse_clean) == set(
        launcher.TRAINING_REVERSE_LIFECYCLE_PROPERTIES
    )
    assert all(value == "" for value in reverse_clean.values())

    hostile_reverse = "".join(
        name + "=" + ("foreign.service" if name == "WantedBy" else "") + "\n"
        for name in launcher.TRAINING_REVERSE_LIFECYCLE_PROPERTIES
    )
    launcher._run_training_systemctl = lambda args, check=True: (
        SimpleNamespace(returncode=0, stdout=hostile_reverse, stderr="")
    )
    try:
        launcher._verify_training_reverse_lifecycle_dependencies_absent()
    except launcher.Hold as exc:
        assert str(exc) == (
            "apollyon_live_session_launcher_training_"
            "reverse_dependency_present:WantedBy"
        ), str(exc)
    else:
        raise AssertionError("launcher accepted reverse WantedBy dependency")
finally:
    launcher._run_training_systemctl = saved_launcher_systemctl


# Prove the successor launcher live path is retired fail-closed. The helper
# primitives remain source-bound below, but live execution must not reach them.
launcher_authority = io.StringIO()
with contextlib.redirect_stderr(launcher_authority):
    launcher._emit_live_authority()
launcher_authority_lines = set(launcher_authority.getvalue().splitlines())
for expected in (
    launcher.MARKER,
    "mode=live-retired",
    "host_filesystem_mutation=false",
    "private_closure_filesystem_mutation=false",
    "git_mutation=false",
    "git_fetch=false",
    "service_process_action=false",
    "service_start_stop=false",
    "systemd_mutation=false",
    "credential_access=false",
    "operator_private_key_access=false",
    "wallet_or_signer_access=false",
    "transaction_construction=false",
    "transaction_signing=false",
    "transaction_broadcast=false",
    "chain_mutation=false",
    "economic_activation=false",
    "funds_movement=false",
    "authority_receipt_before_retired_hold=true",
):
    assert expected in launcher_authority_lines, expected

saved_launcher_geteuid = launcher.os.geteuid
saved_launcher_acquire = launcher.acquire_training_lifecycle_lock
saved_launcher_open_node = launcher.open_trusted_executable
saved_launcher_materialize = launcher.materialize_reviewed_closure
saved_launcher_run = launcher.subprocess.run
saved_launcher_handlers = launcher._install_runner_termination_handlers
saved_launcher_identity = launcher.assert_installed_launcher_identity
saved_preentry = os.environ.get("VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY")
try:
    os.environ["VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY"] = (
        launcher.NATIVE_PREENTRY_MARKER
    )
    launcher.os.geteuid = lambda: 0

    def forbidden_launcher_helper(*_args, **_kwargs):
        raise AssertionError("retired live launcher reached mutation/spawn helper")

    launcher.acquire_training_lifecycle_lock = forbidden_launcher_helper
    launcher.open_trusted_executable = forbidden_launcher_helper
    launcher.materialize_reviewed_closure = forbidden_launcher_helper
    launcher.subprocess.run = forbidden_launcher_helper
    launcher._install_runner_termination_handlers = forbidden_launcher_helper
    launcher.assert_installed_launcher_identity = forbidden_launcher_helper

    try:
        launcher.execute_live(["--fixture-live"])
    except launcher.Hold as exc:
        assert str(exc) == (
            "apollyon_live_session_launcher_activation_retired_"
            "atomic_ownership_required"
        ), str(exc)
    else:
        raise AssertionError("retired live launcher returned success")

    # Exercise the public CLI contract with the real retired authority emitter.
    saved_argv = list(launcher.sys.argv)
    retired_stderr = io.StringIO()
    try:
        launcher.sys.argv = ["launcher", "--fixture-live"]
        with contextlib.redirect_stderr(retired_stderr):
            assert launcher.cli() == 2
    finally:
        launcher.sys.argv = saved_argv
    retired_lines = set(retired_stderr.getvalue().splitlines())
    for expected in (
        launcher.MARKER,
        "mode=live-retired",
        "host_filesystem_mutation=false",
        "private_closure_filesystem_mutation=false",
        "service_process_action=false",
        "service_start_stop=false",
        "authority_receipt_before_retired_hold=true",
        "HOLD=apollyon_live_session_launcher_activation_retired_"
        "atomic_ownership_required",
        "live_activation_retired=true",
        "durable_attempt_claim=false",
        "training_execution=false",
        "funds_movement=false",
    ):
        assert expected in retired_lines, expected
finally:
    launcher.os.geteuid = saved_launcher_geteuid
    launcher.acquire_training_lifecycle_lock = saved_launcher_acquire
    launcher.open_trusted_executable = saved_launcher_open_node
    launcher.materialize_reviewed_closure = saved_launcher_materialize
    launcher.subprocess.run = saved_launcher_run
    launcher._install_runner_termination_handlers = saved_launcher_handlers
    launcher.assert_installed_launcher_identity = saved_launcher_identity
    if saved_preentry is None:
        os.environ.pop("VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY", None)
    else:
        os.environ["VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY"] = saved_preentry

# Prove launcher main translates operational filesystem/subprocess failures into
# the machine-readable Hold contract rather than leaking a traceback.
saved_execute_live = launcher.execute_live
saved_argv = list(launcher.sys.argv)
try:
    launcher.sys.argv = ["launcher", "--fixture-live"]

    def raise_missing(_argv):
        raise FileNotFoundError("fixture-missing")

    launcher.execute_live = raise_missing
    try:
        launcher.main()
    except launcher.Hold as exc:
        assert str(exc) == (
            "apollyon_live_session_launcher_operational_failure:"
            "FileNotFoundError"
        ), str(exc)
    else:
        raise AssertionError("launcher operational failure escaped Hold")
finally:
    launcher.execute_live = saved_execute_live
    launcher.sys.argv = saved_argv

# Prove V2 standalone activation is retired fail-closed. Any attempt to
# acquire the lifecycle lock or invoke systemctl from this path is a test failure.
saved_v1 = mod._v1
saved_hostname = mod.socket.gethostname
saved_geteuid = mod.os.geteuid
saved_emit = mod._emit_live_authority
saved_run = mod._run_systemctl
saved_acquire_lock = mod._acquire_training_lifecycle_lock
retired_events = []

fixture_v1 = SimpleNamespace(TARGET_HOST="fixture-xiphos")
try:
    mod._v1 = lambda: fixture_v1
    mod.socket.gethostname = lambda: "fixture-xiphos"
    mod.os.geteuid = lambda: 0
    mod._emit_live_authority = lambda: retired_events.append("authority")

    def forbidden_systemctl(*args, **kwargs):
        raise AssertionError(
            "retired standalone V2 qualifier invoked systemctl: "
            + repr((args, kwargs))
        )

    def forbidden_lock():
        raise AssertionError(
            "retired standalone V2 qualifier acquired lifecycle lock"
        )

    mod._run_systemctl = forbidden_systemctl
    mod._acquire_training_lifecycle_lock = forbidden_lock

    try:
        mod.live_qualify()
    except mod.Hold as exc:
        assert str(exc) == (
            "standalone_live_qualify_retired_use_lock_aware_launcher"
        ), str(exc)
    else:
        raise AssertionError("retired standalone V2 qualifier returned success")
    assert retired_events == ["authority"], retired_events

    # Exercise the CLI contract with the real authority emitter. The retired
    # mode must return 2 and state that no service/process action occurred.
    retired_stdout = io.StringIO()
    retired_stderr = io.StringIO()
    saved_argv = list(mod.os.sys.argv)
    mod._emit_live_authority = saved_emit
    try:
        mod.os.sys.argv = ["qualifier-v2", "--live-qualify"]
        with contextlib.redirect_stdout(retired_stdout), contextlib.redirect_stderr(
            retired_stderr
        ):
            assert mod.main() == 2
    finally:
        mod.os.sys.argv = saved_argv
        mod._emit_live_authority = lambda: retired_events.append("authority")
    retired_stdout_lines = set(retired_stdout.getvalue().splitlines())
    retired_stderr_lines = set(retired_stderr.getvalue().splitlines())
    for expected in (
        mod.MARKER,
        "mode=live-qualify-retired",
        "service_process_action=false",
        "service_start_stop=false",
        "authority_receipt_before_retired_hold=true",
    ):
        assert expected in retired_stdout_lines, expected
    for expected in (
        "HOLD=standalone_live_qualify_retired_use_lock_aware_launcher",
        "service_process_action=false",
        "service_start_stop=false",
        "standalone_live_qualify_retired=true",
        "training_execution=false",
        "attempt_claim=false",
        "funds_movement=false",
    ):
        assert expected in retired_stderr_lines, expected

    retired_events.clear()
    try:
        mod._live_qualify_locked(
            fixture_v1,
            "fixture-xiphos",
            {"fixture_launcher": True},
            mod.TerminationLatch(),
        )
    except mod.Hold as exc:
        assert str(exc) == (
            "standalone_live_qualify_retired_use_lock_aware_launcher"
        ), str(exc)
    else:
        raise AssertionError("private retired V2 qualifier returned success")
    assert retired_events == [], retired_events
finally:
    mod._v1 = saved_v1
    mod.socket.gethostname = saved_hostname
    mod.os.geteuid = saved_geteuid
    mod._emit_live_authority = saved_emit
    mod._run_systemctl = saved_run
    mod._acquire_training_lifecycle_lock = saved_acquire_lock


canonical_installer_source = CANONICAL_INSTALLER.read_text(encoding="utf-8")
for required in (
    'LIVE_LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"',
    'LIVE_LAUNCHER_BLOB="352bd36f2b07091140b990de4170f708eb11fee6"',
    'live_launcher=read_source(LIVE_LAUNCHER_REL,LIVE_LAUNCHER_BLOB)',
    'install_file(LIVE_LAUNCHER,live_launcher,0o444,0,0)',
):
    assert required in canonical_installer_source, required

canonical_upgrade_source = CANONICAL_UPGRADE.read_text(encoding="utf-8")
for required in (
    'PRIOR_CURRENT_LAUNCHER_BLOB="820f7151c0f83280b7457f841cee14c3b0c274b6"',
    'NEW_LAUNCHER_BLOB="352bd36f2b07091140b990de4170f708eb11fee6"',
    'LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"',
    'REVIEWED_ROOT_LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"',
    'return "prior_current_pending"',
    'next_action="APPLY_CANONICAL_FIXED_LAUNCHER_RETIREMENT"',
    '("prior_current_exact",),',
    'verify_tree(NEW_ROOT,manifest["to"]["closure"])',
    'os.replace(temp,FIXED_LAUNCHER)',
    'def census_inflight_live_session_processes(',
    'def assert_no_inflight_live_session_processes(',
    'hold("inflight_live_session_process_present")',
    '"post_swap_launcher_quiescence_required":True',
    '"launcher_quiescence_proven":launcher_quiescence_proven',
):
    assert required in canonical_upgrade_source, required

runner_source = RUNNER.read_text(encoding="utf-8")
assert git_blob(RUNNER.read_bytes()) == RUNNER_BLOB
assert "training_service_shared_lifecycle_lock_required" not in runner_source

launcher_source = LAUNCHER.read_text(encoding="utf-8")
for required in (
    'TRAINING_LIFECYCLE_LOCK_PATH=(',
    'TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service"',
    'def acquire_training_lifecycle_lock(',
    'not stat.S_ISREG(before.st_mode)',
    'before.st_nlink!=1',
    'before.st_size!=0',
    'expected_mode:int=0o600',
    'fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)',
    'def _require_training_dormant_before_runner(',
    'def _stop_training_after_runner_loss(',
    'TRAINING_REVERSE_LIFECYCLE_PROPERTIES=(',
    'def _verify_training_reverse_lifecycle_dependencies_absent(',
    'class LauncherTerminationLatch:',
    'RUNNER_TERMINATION_SIGNALS=(signal.SIGHUP,signal.SIGTERM)',
    'def _install_runner_termination_handlers(',
    'def _restore_runner_termination_handlers(',
    'def _emit_live_authority()->None:',
    '"mode=live-retired"',
    '"host_filesystem_mutation=false"',
    '"private_closure_filesystem_mutation=false"',
    '"service_process_action=false"',
    '"service_start_stop=false"',
    '"authority_receipt_before_retired_hold=true"',
    '"apollyon_live_session_launcher_activation_retired_"',
    '"atomic_ownership_required"',
    'print("live_activation_retired=true")',
    'print("runner_invocation_from_live_path=false")',
):
    assert required in launcher_source, required

launcher_live_index = launcher_source.index("def execute_live(argv:list[str])->int:")
launcher_self_test_index = launcher_source.index(
    "def self_test()->None:", launcher_live_index
)
launcher_live_section = launcher_source[
    launcher_live_index:launcher_self_test_index
]
authority_index = launcher_live_section.index("_emit_live_authority()")
retired_hold_index = launcher_live_section.index(
    '"apollyon_live_session_launcher_activation_retired_"'
)
assert authority_index < retired_hold_index

for forbidden_live in (
    "assert_installed_launcher_identity(",
    "acquire_training_lifecycle_lock(",
    "open_trusted_executable(",
    "materialize_reviewed_closure(",
    "_verify_training_reverse_lifecycle_dependencies_absent(",
    "_require_training_dormant_before_runner(",
    "_install_runner_termination_handlers(",
    "subprocess.run(",
    "_stop_training_after_runner_loss(",
    "_run_training_systemctl(",
):
    assert forbidden_live not in launcher_live_section, forbidden_live

source = TARGET.read_text(encoding="utf-8")
live_index = source.index("def live_qualify() -> dict[str, Any]:")
locked_index = source.index("def _live_qualify_locked(", live_index)
self_test_index = source.index("def self_test() -> None:", locked_index)
retired_section = source[live_index:self_test_index]

for required in (
    'V1_BLOB = "1fdb495aafa136119d50f41410b015930d9fc90d"',
    '"standalone_live_qualification_retired": True',
    '"standalone_service_start_stop_required": False',
    '"stop_command_success_required": False',
    '"inactive_dead_mainpid_zero_required": False',
    '"observed_process_generation_disappearance_required": False',
    '"mode=live-qualify-retired"',
    '"service_process_action=false"',
    '"service_start_stop=false"',
    'hold("standalone_live_qualify_retired_use_lock_aware_launcher")',
    'LOCK_AWARE_LAUNCHER_BLOB = "352bd36f2b07091140b990de4170f708eb11fee6"',
    'TRAINING_LIFECYCLE_LOCK_PATH = (',
    'not stat.S_ISREG(before.st_mode)',
    'before.st_nlink != 1',
    'before.st_size != 0',
    'expected_mode: int = 0o600',
    'fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)',
    '"training_service_lifecycle_lock_revalidation_failed"',
    'hold("effective_unit_unreviewed_dependency_entry")',
    'raise Hold("v1_source_unavailable")',
):
    assert required in source, required

for forbidden_retired in (
    '_run_systemctl("start"',
    '_run_systemctl("stop"',
    '_acquire_training_lifecycle_lock()',
    '_stop_and_verify(',
    '_wait_for_reviewed_entrypoint()',
    '"standalone_shutdown_proven": True',
    '"service_action_performed": True',
):
    assert forbidden_retired not in retired_section, forbidden_retired

for forbidden in (
    "torch",
    "transformers",
    "unsloth",
    "PeftModel",
    "Trainer(",
    '"training_execution": True',
    '"attempt_claim": True',
    "createPrivateKey",
    "crypto.sign",
    "eth_send",
):
    assert forbidden not in source, forbidden

print("VOID_APOLLYON_INSTALLED_TRAINING_BUS_ISOLATION_QUALIFICATION_V2_PROOF_GREEN")
print("v1_source_blob_bound=true")
print("missing_v1_dependency_hold=true")
print("standalone_v2_live_qualify_retired=true")
print("standalone_v2_service_action=false")
print("standalone_v2_systemctl_start_absent=true")
print("standalone_v2_systemctl_stop_absent=true")
print("standalone_v2_lifecycle_lock_not_acquired=true")
print("standalone_v2_foreign_generation_stop_race_eliminated=true")
print("retired_live_authority_service_action_false=true")
print("retired_live_cli_hold_contract=true")
print("launcher_live_activation_retired=true")
print("launcher_service_action=false")
print("launcher_lifecycle_lock_not_acquired=true")
print("launcher_private_closure_not_materialized=true")
print("launcher_runner_spawn_absent=true")
print("launcher_systemd_action_absent=true")
print("launcher_foreign_generation_stop_race_eliminated=true")
print("launcher_pre_spawn_signal_window_eliminated=true")
print("launcher_retired_authority_receipt_verified=true")
print("launcher_retired_cli_hold_contract=true")
print("no_reviewed_training_service_activator=true")
print("replacement_stable_lifecycle_lock_inode=true")
print("root_only_lifecycle_lock_inode=true")
print("unprivileged_lifecycle_lock_open_rejected=true")
print("unit_file_replacement_does_not_split_lock=true")
print("accepted_runner_blob_unchanged=true")
print("legacy_launcher_source_unchanged=true")
print("canonical_installer_selects_retired_launcher=true")
print("canonical_upgrade_retires_prior_current_launcher=true")
print("canonical_upgrade_post_swap_quiescence_bound=true")
print("v1_observe_live_pid_receipt_unchanged=true")
print("training_execution=false")
print("attempt_claim=false")
print("funds_movement=false")
