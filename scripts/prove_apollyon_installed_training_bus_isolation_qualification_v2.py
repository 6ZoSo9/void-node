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
LAUNCHER_BLOB = "2496644ecc13b425c0885d9e38887d845a5824ef"
LEGACY_LAUNCHER = ROOT / "ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"
LEGACY_LAUNCHER_BLOB = "820f7151c0f83280b7457f841cee14c3b0c274b6"
LEGACY_UPGRADE = ROOT / "ops/xiphos/apollyon_live_custody_reviewed_root_v2_upgrade_v1.py"
LEGACY_UPGRADE_BLOB = "395a2cb3daa5530e1c6291484ac4d85d17b6ba6f"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


assert git_blob(V1.read_bytes()) == V1_BLOB
assert git_blob(RUNNER.read_bytes()) == RUNNER_BLOB
assert git_blob(LAUNCHER.read_bytes()) == LAUNCHER_BLOB
assert git_blob(LEGACY_LAUNCHER.read_bytes()) == LEGACY_LAUNCHER_BLOB
assert git_blob(LEGACY_UPGRADE.read_bytes()) == LEGACY_UPGRADE_BLOB

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
    "mode=live-qualify",
    "host_filesystem_mutation=false",
    "git_mutation=false",
    "git_fetch=false",
    "service_process_action=true",
    "service_start_stop=true",
    "credential_access=false",
    "wallet_or_signer_access=false",
    "transaction_construction=false",
    "transaction_signing=false",
    "transaction_broadcast=false",
    "chain_mutation=false",
    "economic_activation=false",
    "funds_movement=false",
    "authority_receipt_before_service_action=true",
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

# Prove the successor launcher's own authority receipt is complete and emitted
# on stderr before any mutation-capable live execution.
launcher_authority = io.StringIO()
with contextlib.redirect_stderr(launcher_authority):
    launcher._emit_live_authority()
launcher_authority_lines = set(launcher_authority.getvalue().splitlines())
for expected in (
    launcher.MARKER,
    "mode=live",
    "host_filesystem_mutation=true",
    "private_closure_filesystem_mutation=true",
    "git_mutation=false",
    "git_fetch=false",
    "service_process_action=true",
    "service_start_stop=true",
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
    "authority_receipt_before_host_mutation=true",
):
    assert expected in launcher_authority_lines, expected

saved_launcher_geteuid = launcher.os.geteuid
saved_launcher_identity = launcher.assert_installed_launcher_identity
saved_launcher_emit = launcher._emit_live_authority
saved_launcher_acquire = launcher.acquire_training_lifecycle_lock
saved_launcher_release = launcher.release_training_lifecycle_lock
saved_launcher_open_node = launcher.open_trusted_executable
saved_launcher_materialize = launcher.materialize_reviewed_closure
saved_launcher_cleanup = launcher.cleanup_private_tree
saved_launcher_environment = launcher.sanitized_environment
saved_launcher_run = launcher.subprocess.run
saved_preentry = os.environ.get("VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY")
launcher_events = []
node_fixture_fd = -1
try:
    os.environ["VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY"] = (
        launcher.NATIVE_PREENTRY_MARKER
    )
    launcher.os.geteuid = lambda: 0
    launcher.assert_installed_launcher_identity = lambda: (
        launcher_events.append("identity")
    )
    launcher._emit_live_authority = lambda: launcher_events.append("authority")
    launcher.acquire_training_lifecycle_lock = lambda: (
        launcher_events.append("lock") or 77
    )
    launcher.release_training_lifecycle_lock = lambda fd: (
        launcher_events.append("unlock")
    )
    node_fixture_fd = os.open("/dev/null", os.O_RDONLY)
    launcher.open_trusted_executable = lambda *args, **kwargs: (
        launcher_events.append("node") or node_fixture_fd
    )
    launcher.materialize_reviewed_closure = lambda *args, **kwargs: (
        launcher_events.append("materialize") or Path("/fixture/private")
    )
    launcher.cleanup_private_tree = lambda *args, **kwargs: (
        launcher_events.append("cleanup")
    )
    launcher.sanitized_environment = lambda root: (
        launcher_events.append("environment") or {}
    )

    def fake_launcher_run(argv, **kwargs):
        launcher_events.append("runner")
        assert kwargs["pass_fds"] == (node_fixture_fd, 77)
        return SimpleNamespace(returncode=0)

    launcher.subprocess.run = fake_launcher_run
    assert launcher.execute_live([]) == 0
    node_fixture_fd = -1  # execute_live closed the returned descriptor.
    assert launcher_events == [
        "identity",
        "authority",
        "lock",
        "node",
        "materialize",
        "environment",
        "runner",
        "cleanup",
        "unlock",
    ], launcher_events
finally:
    launcher.os.geteuid = saved_launcher_geteuid
    launcher.assert_installed_launcher_identity = saved_launcher_identity
    launcher._emit_live_authority = saved_launcher_emit
    launcher.acquire_training_lifecycle_lock = saved_launcher_acquire
    launcher.release_training_lifecycle_lock = saved_launcher_release
    launcher.open_trusted_executable = saved_launcher_open_node
    launcher.materialize_reviewed_closure = saved_launcher_materialize
    launcher.cleanup_private_tree = saved_launcher_cleanup
    launcher.sanitized_environment = saved_launcher_environment
    launcher.subprocess.run = saved_launcher_run
    if node_fixture_fd >= 0:
        os.close(node_fixture_fd)
    if saved_preentry is None:
        os.environ.pop("VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY", None)
    else:
        os.environ["VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY"] = saved_preentry

# Prove every positive nonzero runner HOLD receives launcher-side
# stop+dormancy attestation before private cleanup and lifecycle unlock.
saved_launcher_geteuid = launcher.os.geteuid
saved_launcher_identity = launcher.assert_installed_launcher_identity
saved_launcher_emit = launcher._emit_live_authority
saved_launcher_acquire = launcher.acquire_training_lifecycle_lock
saved_launcher_release = launcher.release_training_lifecycle_lock
saved_launcher_open_node = launcher.open_trusted_executable
saved_launcher_materialize = launcher.materialize_reviewed_closure
saved_launcher_cleanup = launcher.cleanup_private_tree
saved_launcher_environment = launcher.sanitized_environment
saved_launcher_run = launcher.subprocess.run
saved_launcher_stop_loss = launcher._stop_training_after_runner_loss
saved_preentry = os.environ.get("VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY")
nonzero_events = []
node_fixture_fd = -1
try:
    os.environ["VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY"] = (
        launcher.NATIVE_PREENTRY_MARKER
    )
    launcher.os.geteuid = lambda: 0
    launcher.assert_installed_launcher_identity = lambda: (
        nonzero_events.append("identity")
    )
    launcher._emit_live_authority = lambda: nonzero_events.append("authority")
    launcher.acquire_training_lifecycle_lock = lambda: (
        nonzero_events.append("lock") or 78
    )
    launcher.release_training_lifecycle_lock = lambda fd: (
        nonzero_events.append("unlock")
    )
    node_fixture_fd = os.open("/dev/null", os.O_RDONLY)
    launcher.open_trusted_executable = lambda *args, **kwargs: (
        nonzero_events.append("node") or node_fixture_fd
    )
    launcher.materialize_reviewed_closure = lambda *args, **kwargs: (
        nonzero_events.append("materialize") or Path("/fixture/private")
    )
    launcher.cleanup_private_tree = lambda *args, **kwargs: (
        nonzero_events.append("cleanup")
    )
    launcher.sanitized_environment = lambda root: (
        nonzero_events.append("environment") or {}
    )
    launcher._stop_training_after_runner_loss = lambda: (
        nonzero_events.append("stop_attest") or dict(dormant)
    )

    def fake_nonzero_launcher_run(argv, **kwargs):
        nonzero_events.append("runner")
        assert kwargs["pass_fds"] == (node_fixture_fd, 78)
        return SimpleNamespace(returncode=2)

    launcher.subprocess.run = fake_nonzero_launcher_run
    assert launcher.execute_live([]) == 2
    node_fixture_fd = -1
    assert nonzero_events == [
        "identity",
        "authority",
        "lock",
        "node",
        "materialize",
        "environment",
        "runner",
        "stop_attest",
        "cleanup",
        "unlock",
    ], nonzero_events
finally:
    launcher.os.geteuid = saved_launcher_geteuid
    launcher.assert_installed_launcher_identity = saved_launcher_identity
    launcher._emit_live_authority = saved_launcher_emit
    launcher.acquire_training_lifecycle_lock = saved_launcher_acquire
    launcher.release_training_lifecycle_lock = saved_launcher_release
    launcher.open_trusted_executable = saved_launcher_open_node
    launcher.materialize_reviewed_closure = saved_launcher_materialize
    launcher.cleanup_private_tree = saved_launcher_cleanup
    launcher.sanitized_environment = saved_launcher_environment
    launcher.subprocess.run = saved_launcher_run
    launcher._stop_training_after_runner_loss = saved_launcher_stop_loss
    if node_fixture_fd >= 0:
        os.close(node_fixture_fd)
    if saved_preentry is None:
        os.environ.pop("VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY", None)
    else:
        os.environ["VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY"] = saved_preentry

# Prove an interrupted runner wait performs stop-attestation before private
# cleanup and lifecycle unlock, then preserves the operator interruption.
saved_launcher_geteuid = launcher.os.geteuid
saved_launcher_identity = launcher.assert_installed_launcher_identity
saved_launcher_emit = launcher._emit_live_authority
saved_launcher_acquire = launcher.acquire_training_lifecycle_lock
saved_launcher_release = launcher.release_training_lifecycle_lock
saved_launcher_open_node = launcher.open_trusted_executable
saved_launcher_materialize = launcher.materialize_reviewed_closure
saved_launcher_cleanup = launcher.cleanup_private_tree
saved_launcher_environment = launcher.sanitized_environment
saved_launcher_run = launcher.subprocess.run
saved_launcher_stop_loss = launcher._stop_training_after_runner_loss
saved_preentry = os.environ.get("VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY")
interrupt_events = []
node_fixture_fd = -1
try:
    os.environ["VOID_APOLLYON_LIVE_SESSION_NATIVE_PREENTRY"] = (
        launcher.NATIVE_PREENTRY_MARKER
    )
    launcher.os.geteuid = lambda: 0
    launcher.assert_installed_launcher_identity = lambda: (
        interrupt_events.append("identity")
    )
    launcher._emit_live_authority = lambda: interrupt_events.append("authority")
    launcher.acquire_training_lifecycle_lock = lambda: (
        interrupt_events.append("lock") or 79
    )
    launcher.release_training_lifecycle_lock = lambda fd: (
        interrupt_events.append("unlock")
    )
    node_fixture_fd = os.open("/dev/null", os.O_RDONLY)
    launcher.open_trusted_executable = lambda *args, **kwargs: (
        interrupt_events.append("node") or node_fixture_fd
    )
    launcher.materialize_reviewed_closure = lambda *args, **kwargs: (
        interrupt_events.append("materialize") or Path("/fixture/private")
    )
    launcher.cleanup_private_tree = lambda *args, **kwargs: (
        interrupt_events.append("cleanup")
    )
    launcher.sanitized_environment = lambda root: (
        interrupt_events.append("environment") or {}
    )
    launcher._stop_training_after_runner_loss = lambda: (
        interrupt_events.append("stop_attest") or dict(dormant)
    )

    def fake_interrupt_launcher_run(argv, **kwargs):
        interrupt_events.append("runner")
        assert kwargs["pass_fds"] == (node_fixture_fd, 79)
        raise KeyboardInterrupt()

    launcher.subprocess.run = fake_interrupt_launcher_run
    try:
        launcher.execute_live([])
    except KeyboardInterrupt:
        node_fixture_fd = -1
    else:
        raise AssertionError("runner interruption was not preserved")
    assert interrupt_events == [
        "identity",
        "authority",
        "lock",
        "node",
        "materialize",
        "environment",
        "runner",
        "stop_attest",
        "cleanup",
        "unlock",
    ], interrupt_events
finally:
    launcher.os.geteuid = saved_launcher_geteuid
    launcher.assert_installed_launcher_identity = saved_launcher_identity
    launcher._emit_live_authority = saved_launcher_emit
    launcher.acquire_training_lifecycle_lock = saved_launcher_acquire
    launcher.release_training_lifecycle_lock = saved_launcher_release
    launcher.open_trusted_executable = saved_launcher_open_node
    launcher.materialize_reviewed_closure = saved_launcher_materialize
    launcher.cleanup_private_tree = saved_launcher_cleanup
    launcher.sanitized_environment = saved_launcher_environment
    launcher.subprocess.run = saved_launcher_run
    launcher._stop_training_after_runner_loss = saved_launcher_stop_loss
    if node_fixture_fd >= 0:
        os.close(node_fixture_fd)
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

# Execute the lifecycle with patched host boundaries and assert authority receipt
# is observed before the first start action.
saved_v1 = mod._v1
saved_hostname = mod.socket.gethostname
saved_geteuid = mod.os.geteuid
saved_initial = mod._initial_state_required
saved_effective = mod._verify_effective_unit_contract
saved_launcher = mod._verify_lock_aware_live_launcher_installed
saved_acquire_lock = mod._acquire_training_lifecycle_lock
saved_release_lock = mod._release_training_lifecycle_lock
saved_emit = mod._emit_live_authority
saved_run = mod._run_systemctl
saved_wait_entry = mod._wait_for_reviewed_entrypoint
saved_stop = mod._stop_and_verify
events = []
fixture_v1 = SimpleNamespace(
    TARGET_HOST="fixture-xiphos",
    UNIT="fixture.service",
    ENTRYPOINT_PATH=Path("/opt/fixture/entry"),
    Hold=mod.Hold,
    verify_installed_materials=lambda: {"fixture": True},
    account_ids=lambda: (1000, 1000),
)
fixture_v1.observe_live_generation = lambda pid: (
    events.append("observe")
    or {"live": {"process_start_time_ticks": 123456}}
)
try:
    mod._v1 = lambda: fixture_v1
    mod.socket.gethostname = lambda: "fixture-xiphos"
    mod.os.geteuid = lambda: 0
    mod._verify_lock_aware_live_launcher_installed = lambda: (
        events.append("launcher") or {"fixture_launcher": True}
    )
    mod._acquire_training_lifecycle_lock = lambda: (events.append("lock") or 77)
    mod._release_training_lifecycle_lock = lambda fd: events.append("unlock")
    mod._verify_effective_unit_contract = lambda: (
        events.append("effective")
        or {"fixture_effective_unit": True}
    )
    mod._initial_state_required = lambda: events.append("preflight")
    mod._emit_live_authority = lambda: events.append("authority")

    def lifecycle_run(*args, **kwargs):
        if args and args[0] == "start":
            events.append("start")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    mod._run_systemctl = lifecycle_run
    mod._wait_for_reviewed_entrypoint = lambda: (
        events.append("entrypoint") or 4242
    )
    mod._stop_and_verify = lambda pid, ticks: (
        events.append("stop")
        or {
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
    )
    lifecycle = mod.live_qualify()
    assert events == [
        "lock",
        "launcher",
        "effective",
        "preflight",
        "authority",
        "launcher",
        "effective",
        "start",
        "entrypoint",
        "observe",
        "stop",
        "launcher",
        "effective",
        "unlock",
    ], events
    assert lifecycle["standalone_shutdown_proven"] is True
    assert lifecycle["effective_systemd_unit_contract_stable"] is True
    assert lifecycle["shared_training_service_lifecycle_lock_proven"] is True
    assert lifecycle["lock_aware_live_launcher_identity_proven"] is True
    assert lifecycle["lock_aware_live_launcher_identity_stable"] is True
    assert lifecycle["lock_aware_live_launcher"] == {"fixture_launcher": True}
finally:
    mod._v1 = saved_v1
    mod.socket.gethostname = saved_hostname
    mod.os.geteuid = saved_geteuid
    mod._initial_state_required = saved_initial
    mod._verify_effective_unit_contract = saved_effective
    mod._verify_lock_aware_live_launcher_installed = saved_launcher
    mod._acquire_training_lifecycle_lock = saved_acquire_lock
    mod._release_training_lifecycle_lock = saved_release_lock
    mod._emit_live_authority = saved_emit
    mod._run_systemctl = saved_run
    mod._wait_for_reviewed_entrypoint = saved_wait_entry
    mod._stop_and_verify = saved_stop


legacy_upgrade_source = LEGACY_UPGRADE.read_text(encoding="utf-8")
for required in (
    'OLD_LAUNCHER_BLOB="e18124d3109ed63ff50da9c467fb1b798c300460"',
    'NEW_LAUNCHER_BLOB="820f7151c0f83280b7457f841cee14c3b0c274b6"',
    'if digest==OLD_LAUNCHER_BLOB:return "old_exact"',
    'if digest==NEW_LAUNCHER_BLOB:return "new_exact"',
    'hold("fixed_launcher_collision")',
    'os.replace(temp,FIXED_LAUNCHER)',
):
    assert required in legacy_upgrade_source, required
assert "2496644ecc13b425c0885d9e38887d845a5824ef" not in legacy_upgrade_source

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
    'training_lifecycle_fd=acquire_training_lifecycle_lock()',
    'completed=subprocess.run(',
    'pass_fds=(node_fd,training_lifecycle_fd)',
    'def _stop_training_after_runner_loss(',
    '_stop_training_after_runner_loss()',
    'release_training_lifecycle_lock(training_lifecycle_fd)',
    'replacement_stable_lifecycle_lock_inode=true',
    'runner_abnormal_exit_stop_attestation_required=true',
    'runner_nonzero_exit_stop_attestation_required=true',
    'isinstance(exc,KeyboardInterrupt)',
    'root_only_lifecycle_lock_inode_required=true',
    'except BaseException as exc:',
    'except (OSError,subprocess.SubprocessError) as exc:',
    'def _emit_live_authority()->None:',
    'host_filesystem_mutation=true',
    'service_process_action=true',
    'authority_receipt_before_host_mutation=true',
):
    assert required in launcher_source, required
launcher_acquire_index = launcher_source.index(
    "training_lifecycle_fd=acquire_training_lifecycle_lock()"
)
launcher_runner_index = launcher_source.index(
    "completed=subprocess.run(", launcher_acquire_index
)
launcher_release_index = launcher_source.index(
    "release_training_lifecycle_lock(training_lifecycle_fd)",
    launcher_runner_index,
)
assert launcher_acquire_index < launcher_runner_index < launcher_release_index
exception_index = launcher_source.index("except BaseException as exc:")
exception_cleanup_index = launcher_source.index(
    "_stop_training_after_runner_loss()", exception_index
)
interrupt_index = launcher_source.index(
    "isinstance(exc,KeyboardInterrupt)", exception_cleanup_index
)
timeout_index = launcher_source.index(
    "isinstance(exc,subprocess.TimeoutExpired)", interrupt_index
)
assert (
    exception_index < exception_cleanup_index < interrupt_index <
    timeout_index < launcher_release_index
)
nonzero_index = launcher_source.index("if completed.returncode!=0:")
nonzero_cleanup_index = launcher_source.index(
    "_stop_training_after_runner_loss()", nonzero_index
)
signal_index = launcher_source.index(
    "if completed.returncode<0:", nonzero_cleanup_index
)
assert (
    nonzero_index < nonzero_cleanup_index < signal_index <
    launcher_release_index
)

source = TARGET.read_text(encoding="utf-8")
lock_index = source.index("lifecycle_lock_fd = _acquire_training_lifecycle_lock()")
initial_launcher_index = source.index(
    "launcher_identity = _verify_lock_aware_live_launcher_installed()",
    lock_index,
)
release_index = source.index(
    "_release_training_lifecycle_lock(lifecycle_lock_fd)",
    initial_launcher_index,
)
assert lock_index < initial_launcher_index < release_index

locked_function_index = source.index("def _live_qualify_locked(")
before_start_launcher_index = source.index(
    "before_start_launcher = _verify_lock_aware_live_launcher_installed()",
    locked_function_index,
)
start_index = source.index(
    '_run_systemctl("start", v1.UNIT)',
    before_start_launcher_index,
)
final_launcher_index = source.index(
    "final_launcher = _verify_lock_aware_live_launcher_installed()",
    start_index,
)
assert (
    locked_function_index < before_start_launcher_index <
    start_index < final_launcher_index
)

for required in (
    'V1_BLOB = "1fdb495aafa136119d50f41410b015930d9fc90d"',
    "start_attempted = True",
    '_run_systemctl("stop", _v1().UNIT, check=False)',
    "result.returncode != 0",
    'state.get("active_state") == "inactive"',
    'state.get("sub_state") == "dead"',
    'state.get("mainpid") == 0',
    'state.get("unit_file_state") == "static"',
    "generation_present is False",
    'argv: list[str] = ["show", v1.UNIT]',
    '"service_state_snapshot_stable": True',
    '"standalone_shutdown_proven": True',
    '"observed_process_generation_absent_after_qualification": True',
    '"service_unit_file_state_after_qualification": "static"',
    '"same_process_composition_receipt_changed": False',
    '"authority_receipt_before_service_action=true"',
    '"FragmentPath"',
    '"DropInPaths"',
    '"NeedDaemonReload"',
    '"ExecStart"',
    '"effective_systemd_unit_contract_stable": True',
    '"shared_training_service_lifecycle_lock_proven": True',
    '"lock_aware_live_launcher_identity_proven": True',
    '"lock_aware_live_launcher_identity_stable": True',
    '"lock_aware_live_launcher_revalidation_failed"',
    'LOCK_AWARE_LAUNCHER_BLOB = "2496644ecc13b425c0885d9e38887d845a5824ef"',
    'TRAINING_LIFECYCLE_LOCK_PATH = (',
    'not stat.S_ISREG(before.st_mode)',
    'before.st_nlink != 1',
    'before.st_size != 0',
    'expected_mode: int = 0o600',
    'fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)',
    'hold("effective_unit_unreviewed_dependency_entry")',
    'raise Hold("v1_source_unavailable")',
):
    assert required in source, required

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
print("authority_receipt_before_service_action=true")
print("authority_call_order_executed=true")
print("single_systemctl_state_snapshot=true")
print("state_change_between_snapshots_rejected=true")
print("final_service_state_revalidation=true")
print("effective_systemd_unit_properties_bound=true")
print("effective_systemd_unit_revalidated_before_start=true")
print("effective_systemd_unit_revalidated_before_success=true")
print("qualifier_lifecycle_flock_exclusive=true")
print("launcher_qualifier_shared_flock_exclusive=true")
print("launcher_wraps_unchanged_runner_under_lock=true")
print("launcher_lock_inherited_by_node_runner=true")
print("replacement_stable_lifecycle_lock_inode=true")
print("root_only_lifecycle_lock_inode=true")
print("unprivileged_lifecycle_lock_open_rejected=true")
print("unit_file_replacement_does_not_split_lock=true")
print("runner_abnormal_exit_stop_attested=true")
print("runner_interrupt_stop_attested=true")
print("runner_positive_nonzero_stop_attested=true")
print("launcher_authority_receipt_contents_verified=true")
print("launcher_authority_call_order_executed=true")
print("launcher_operational_errors_hold=true")
print("accepted_runner_blob_unchanged=true")
print("legacy_launcher_source_unchanged=true")
print("lock_aware_live_launcher_installed_required=true")
print("launcher_identity_revalidation_failure_hold=true")
print("launcher_validated_after_lifecycle_lock=true")
print("launcher_revalidated_before_start=true")
print("launcher_revalidated_before_success=true")
print("legacy_upgrade_refuses_lock_aware_successor=true")
print("shared_training_service_lifecycle_serialized=true")
print("unreviewed_systemd_unit_path_rejected=true")
print("unreviewed_dependency_entry_rejected=true")
print("nonzero_stop_rejected=true")
print("active_after_stop_rejected=true")
print("old_pid_generation_survival_rejected=true")
print("nondead_substate_rejected=true")
print("inactive_dead_mainpid_zero_accepted=true")
print("reenabled_service_rejected=true")
print("v1_observe_live_pid_receipt_unchanged=true")
print("training_execution=false")
print("attempt_claim=false")
print("funds_movement=false")
