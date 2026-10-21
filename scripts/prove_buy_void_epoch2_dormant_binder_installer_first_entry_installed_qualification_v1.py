#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import stat
import subprocess
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "installed_qualification_v1.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "f0ca6d231ea787eee6b1f9be84000111ef9055a4"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "protected_install_v5.py"
)
INSTALLER = ROOT / INSTALLER_REL
INSTALLER_BLOB = "ce6930bc1be8239a3171d4922c44b96a50f5778b"
OBSERVER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
OBSERVER_BLOB = "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"
LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json"
)
LOCK_BLOB = "227c2fa449abf1387925373c706ecd07775d5898"
PLANNER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_"
    "current_head_plan_v1.py"
)

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "INSTALLED_QUALIFICATION_V1"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


target_raw = TARGET.read_bytes()
installer_raw = INSTALLER.read_bytes()
observer_raw = (ROOT / OBSERVER_REL).read_bytes()
lock_raw = (ROOT / LOCK_REL).read_bytes()
assert git_blob(target_raw) == TARGET_BLOB
assert git_blob(installer_raw) == INSTALLER_BLOB
assert git_blob(observer_raw) == OBSERVER_BLOB
assert git_blob(lock_raw) == LOCK_BLOB
source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True, optimize=0)

for required in (
    "INSTALLED_QUALIFICATION_V1",
    'INSTALLER_SOURCE_GIT_BLOB_SHA1 = "' + INSTALLER_BLOB + '"',
    "triple_snapshot_required",
    "temporary_git_metadata_write_performed",
    "temporary_git_metadata_cleanup_completed",
    "protected_root_write",
    "repository_worktree_write",
    "launcher_execution",
    "native_execution",
    "binder_execution",
    "credential_access",
    "funds_movement",
    "production_host_evidence_authority",
    "installed_generation_evidence_authority",
    "privileged_execution_authorized",
    "non_executing_current_head_plan",
):
    assert required in source, required

for forbidden in (
    "subprocess.",
    "os.exec",
    "os.system(",
    "systemctl",
    "--apply",
    "--installer-apply",
    "eth_send",
    "CREDENTIALS_DIRECTORY",
    "LoadCredential",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source, filename=TARGET_REL)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "_direct_source_bytes", "_load_installer", "_load_repository_observer",
    "_accepted_lock", "_snapshot_dir", "_snapshot_file",
    "_installed_snapshot", "collect", "emit", "source_plan", "self_test", "main",
):
    assert name in functions, name

snapshot_dir_source = ast.get_source_segment(source, functions["_snapshot_dir"]) or ""
snapshot_file_source = ast.get_source_segment(source, functions["_snapshot_file"]) or ""
for ownership_check in ("before.st_uid != 0", "before.st_gid != 0"):
    assert ownership_check in snapshot_dir_source, ownership_check
    assert ownership_check in snapshot_file_source, ownership_check
assert "stat.S_IMODE(before.st_mode) != 0o755" in snapshot_dir_source
assert "stat.S_IMODE(before.st_mode) != expected_mode" in snapshot_file_source

# Source-only modes are inert.
for mode, markers in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "exact_installer_generation_bound=true",
            "triple_snapshot_required=true",
            "installed_payload_execution_absent=true",
            "temporary_git_metadata_truthful=true",
            "protected_root_write=false",
            "repository_worktree_write=false",
            "credential_access=false",
            "funds_movement=false",
            "privileged_execution_authorized=false",
        ),
    ),
    (
        "--source-plan",
        (
            MARKER,
            "mode=source-plan",
            "source_only=true",
            "host_read=false",
            "host_write=false",
            "root_required_for_run=true",
            "triple_snapshot_required=true",
            "temporary_git_metadata_write_possible_on_run=true",
            "temporary_git_metadata_cleanup_required=true",
            "protected_root_write=false",
            "repository_worktree_write=false",
            "launcher_execution=false",
            "native_execution=false",
            "binder_execution=false",
            "credential_access=false",
            "funds_movement=false",
            "privileged_execution_authorized=false",
        ),
    ),
):
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(TARGET), mode],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
        },
    )
    assert cp.returncode == 0, (mode, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    for marker in markers:
        assert marker in lines, (mode, marker)

spec = importlib.util.spec_from_file_location("first_entry_installed_qualification_v1", TARGET)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def write_file(path: Path, raw: bytes, mode: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    path.chmod(mode)


with tempfile.TemporaryDirectory(prefix="void-e2-first-entry-installed-qual-v1-") as td:
    td = Path(td)
    installed = td / "installed"
    bin_dir = installed / "bin"
    input_dir = installed / "input"
    precision_dir = installed / "source" / "ops" / "precision"
    for path in (installed, bin_dir, input_dir, installed / "source", installed / "source" / "ops", precision_dir):
        path.mkdir(exist_ok=True)
        path.chmod(0o755)

    launcher_raw = b"fixture-launcher-v2\n"
    native_raw = b"fixture-native-v2\n"
    runtime_raw = b"fixture-runtime-installer\n"
    policy_raw = b"schema=FIXTURE\npython_sha256=" + b"1" * 64 + b"\npython_bytes=123\n"

    launcher = bin_dir / "launcher"
    native = input_dir / "native"
    runtime = precision_dir / "runtime.py"
    policy = installed / "policy-v1.conf"
    write_file(launcher, launcher_raw, 0o555)
    write_file(native, native_raw, 0o444)
    write_file(runtime, runtime_raw, 0o444)
    write_file(policy, policy_raw, 0o444)

    class FakeInstaller:
        MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V5"
        INSTALL_ROOT = installed
        GREEN_STATE = "DORMANT_FIRST_ENTRY_PROTECTED_ROOT_GREEN"
        LOCK_ID = "voidbuye2fixturelock_" + "a" * 64
        CANDIDATE_ID = "voidbuye2fixturecandidate_" + "b" * 64
        BIN_DIR = "bin"
        INPUT_DIR = "input"
        SOURCE_DIR = "source"
        OPS_DIR = "ops"
        PRECISION_DIR = "precision"
        LAUNCHER_NAME = "launcher"
        NATIVE_NAME = "native"
        RUNTIME_INSTALLER_NAME = "runtime.py"
        POLICY_NAME = "policy-v1.conf"
        LAUNCHER_TARGET = launcher
        NATIVE_TARGET = native
        RUNTIME_INSTALLER_TARGET = runtime
        POLICY_TARGET = policy
        LAUNCHER_BYTES = len(launcher_raw)
        LAUNCHER_SHA256 = hashlib.sha256(launcher_raw).hexdigest()
        NATIVE_BYTES = len(native_raw)
        NATIVE_SHA256 = hashlib.sha256(native_raw).hexdigest()
        RUNTIME_INSTALLER_BYTES = len(runtime_raw)
        RUNTIME_INSTALLER_SHA256 = hashlib.sha256(runtime_raw).hexdigest()
        _GIT_PRIVATE_ACTIVE = 0
        _GIT_PRIVATE_CLEANUP_FAILED = False
        _GIT_PRIVATE_MUTATION_PERFORMED = True

        @staticmethod
        def checkout_snapshot(expected_head):
            return {"head": expected_head, "tree": "c" * 40, "branch": "main", "clean": True}

        @staticmethod
        def accepted_lock(expected_head):
            return {"lock_id": FakeInstaller.LOCK_ID}

        @staticmethod
        def python_snapshot():
            return {"fixed": "/usr/bin/python3", "realpath": "/usr/bin/python3.12",
                     "sha256": "1" * 64, "bytes": 123, "mode": "0755", "uid": 0, "gid": 0}

        @staticmethod
        def build_policy(python):
            return policy_raw

        @staticmethod
        def protected_state(policy_bytes):
            assert policy_bytes == policy_raw
            return FakeInstaller.GREEN_STATE

    class FakeRepository:
        observations = 0

        def __init__(self, expected_head):
            self.expected_head = expected_head
            self._closed = False
            self.git_tool = {"sha256": "2" * 64, "bytes": 456}

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            self._closed = True
            return False

        def checkout(self):
            FakeRepository.observations += 1
            return FakeInstaller.checkout_snapshot(self.expected_head)

        def blob(self, relative, *, expected_blob):
            raw = {INSTALLER_REL: installer_raw, OBSERVER_REL: observer_raw}[relative]
            assert git_blob(raw) == expected_blob
            return raw

    class FakeObserver:
        _RepositorySnapshot = FakeRepository
        cleanup_completed = True

        @staticmethod
        def git_boundary_receipt():
            return {
                "git_boundary_policy": "FIXTURE",
                "temporary_git_metadata_write_required": True,
                "temporary_git_metadata_write_performed": True,
                "temporary_git_metadata_cleanup_completed": FakeObserver.cleanup_completed,
                "source_repository_mutation": False,
                "source_object_fetch": False,
                "repository_config_loaded": False,
                "repository_callback_execution": False,
                "standalone_git_tool_admission": True,
                "native_parent_authority_claimed": False,
            }

    original_loader = module._load_installer
    original_observer_loader = module._load_repository_observer
    original_accepted_lock = module._accepted_lock
    original_geteuid = module.os.geteuid
    original_path_lstat = Path.lstat
    original_fstat = module.os.fstat

    def root_owned_stat(observed):
        values = list(observed)
        values[4] = 0
        values[5] = 0
        return os.stat_result(values)

    def fixture_lstat(self):
        return root_owned_stat(original_path_lstat(self))

    def fixture_fstat(fd):
        return root_owned_stat(original_fstat(fd))

    try:
        module._load_installer = lambda: FakeInstaller
        module._load_repository_observer = lambda: FakeObserver
        module._accepted_lock = lambda installer, repository: {"lock_id": FakeInstaller.LOCK_ID}
        module.os.geteuid = lambda: 0
        Path.lstat = fixture_lstat
        module.os.fstat = fixture_fstat
        result = module.collect("a" * 40)
        assert FakeRepository.observations == 3
        assert result["installed_identity_green"] is True
        assert result["installed_generation_stable"] is True
        assert result["temporary_git_metadata_write_performed"] is True
        assert result["temporary_git_metadata_cleanup_completed"] is True
        assert result["protected_root_write"] is False
        assert result["repository_worktree_write"] is False
        assert result["launcher_execution"] is False
        assert result["native_execution"] is False
        assert result["binder_execution"] is False
        assert result["credential_access"] is False
        assert result["funds_movement"] is False
        # This disposable fixture has no designated-host binding. A GREEN
        # installed generation must never elevate into production-host authority.
        assert result["production_host_evidence_authority"] is False
        assert result["installed_generation_evidence_authority"] is True
        assert result["next_gate"] == "non_executing_current_head_plan"
        assert result["privileged_execution_authorized"] is False

        # Visible installed generation drift must HOLD.
        launcher.chmod(0o755)
        try:
            module.collect("a" * 40)
        except module.QualifyError as exc:
            assert "installed_file_metadata_invalid" in str(exc)
        else:
            raise AssertionError("installed_generation_drift_accepted")
        launcher.chmod(0o555)

        # A stable installed tree cannot authorize a result with failed private
        # metadata cleanup. The real cleanup path is also exercised below.
        FakeObserver.cleanup_completed = False
        try:
            module.collect("a" * 40)
        except module.QualifyError as exc:
            assert str(exc) == "temporary_git_metadata_cleanup_incomplete"
        else:
            raise AssertionError("incomplete_observer_cleanup_accepted")
        finally:
            FakeObserver.cleanup_completed = True

        # Non-root execution is refused before host qualification.
        module.os.geteuid = lambda: 1000
        try:
            module.collect("a" * 40)
        except module.QualifyError as exc:
            assert str(exc) == "root_required_for_installed_qualification"
        else:
            raise AssertionError("nonroot_qualification_accepted")
    finally:
        module._load_installer = original_loader
        module._load_repository_observer = original_observer_loader
        module._accepted_lock = original_accepted_lock
        module.os.geteuid = original_geteuid
        Path.lstat = original_path_lstat
        module.os.fstat = original_fstat


def import_source(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


def fixture_git(checkout: Path, *args: str) -> str:
    # These writes only construct disposable test commits. The production
    # observer still executes its own admitted, sealed Git tool and real parser.
    cp = subprocess.run(
        ["/usr/bin/git", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false",
         "-c", "gc.auto=0", "-c", "maintenance.auto=false", "-C", str(checkout), *args],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        text=True, check=False, timeout=30,
        env={
            "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_AUTHOR_NAME": "VOID fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
            "GIT_COMMITTER_NAME": "VOID fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
            "GIT_AUTHOR_DATE": "2000-01-01T00:00:00Z",
            "GIT_COMMITTER_DATE": "2000-01-01T00:00:00Z",
        },
    )
    assert cp.returncode == 0, (args, cp.stderr)
    return cp.stdout.strip()


def fixture_generation(checkout: Path):
    # Include original .git metadata; atime alone is not a source write.
    result = {}
    for path in sorted(checkout.rglob("*")):
        st = path.lstat()
        result[str(path.relative_to(checkout))] = (
            st.st_ino, st.st_mode, st.st_nlink, st.st_size, st.st_mtime_ns, st.st_ctime_ns,
            hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None,
        )
    return result


def root_entry_proxy(loaded):
    # Emulate only the CLI's root entry admission. Mutating os.geteuid globally
    # would falsify the real observer's memfd owner on ordinary CI runners.
    loaded.os = types.SimpleNamespace(**vars(os))
    loaded.os.geteuid = lambda: 0


def bind_real_qualifier(qualifier, checkout: Path, install_parent: Path):
    root_entry_proxy(qualifier)
    original_installer_loader = qualifier._load_installer
    original_observer_loader = qualifier._load_repository_observer
    observed = {"installers": [], "observers": [], "witnesses": []}

    def load_installer():
        installer = original_installer_loader()
        assert installer._BOOTSTRAP_CONTEXT is None
        installer.INSTALL_PARENT = install_parent
        installer.INSTALL_ROOT = install_parent / installer.INSTALL_NAME
        installer.STAGE_ROOT = install_parent / installer.STAGE_NAME
        installer.LAUNCHER_TARGET = installer.INSTALL_ROOT / installer.BIN_DIR / installer.LAUNCHER_NAME
        installer.NATIVE_TARGET = installer.INSTALL_ROOT / installer.INPUT_DIR / installer.NATIVE_NAME
        installer.RUNTIME_INSTALLER_TARGET = (
            installer.INSTALL_ROOT / installer.SOURCE_DIR / installer.OPS_DIR /
            installer.PRECISION_DIR / installer.RUNTIME_INSTALLER_NAME
        )
        installer.POLICY_TARGET = installer.INSTALL_ROOT / installer.POLICY_NAME
        observed["installers"].append(installer)
        return installer

    def load_observer():
        observer = original_observer_loader()
        observer.FIXED_CHECKOUT = checkout
        repository_type = observer._RepositorySnapshot

        def tracked_repository(expected_head):
            witness = repository_type(expected_head)
            observed["witnesses"].append(witness)
            return witness

        # Only capture the real context for cleanup assertions. No reader,
        # checkout, object parser, Git invocation, or exit method is replaced.
        observer._RepositorySnapshot = tracked_repository
        observed["observers"].append(observer)
        return observer

    qualifier._load_installer = load_installer
    qualifier._load_repository_observer = load_observer
    return observed


def require_real_cleanup(observed):
    assert observed["observers"] and observed["witnesses"]
    for installer in observed["installers"]:
        assert installer._BOOTSTRAP_CONTEXT is None
        assert installer._GIT_PRIVATE_MUTATION_PERFORMED is False
    for observer in observed["observers"]:
        receipt = observer.git_boundary_receipt()
        assert receipt["temporary_git_metadata_write_performed"] is True
        assert receipt["temporary_git_metadata_cleanup_completed"] is True
        assert receipt["standalone_git_tool_admission"] is True
        assert receipt["native_parent_authority_claimed"] is False
        assert receipt["source_repository_mutation"] is False
        assert receipt["repository_callback_execution"] is False
        assert observer._GIT_PRIVATE_ACTIVE == 0
    for witness in observed["witnesses"]:
        assert witness._closed is True and witness._fds == []
        assert witness._private_started is False
        if hasattr(witness, "private"):
            assert not witness.private.exists()


with tempfile.TemporaryDirectory(prefix="void-e2-first-entry-real-observer-v1-") as td:
    td = Path(td)
    checkout = td / "checkout"
    checkout.mkdir()
    install_parent = td / "install-parent"
    install_parent.mkdir(mode=0o755)
    fixture_files = {
        TARGET_REL: target_raw,
        INSTALLER_REL: installer_raw,
        OBSERVER_REL: observer_raw,
        LOCK_REL: lock_raw,
        PLANNER_REL: (ROOT / PLANNER_REL).read_bytes(),
        "fixture.txt": b"accepted fixture generation\n",
    }
    for relative, raw in fixture_files.items():
        write_file(checkout / relative, raw, 0o644)
    fixture_git(checkout, "init", "--initial-branch=main")
    fixture_git(checkout, "add", "--", *fixture_files)
    fixture_git(checkout, "commit", "-m", "Create isolated qualification fixture")
    expected_head = fixture_git(checkout, "rev-parse", "HEAD")

    original_path_lstat = Path.lstat

    def installed_parent_lstat(path):
        observed = original_path_lstat(path)
        # Only the disposable install parent requires root metadata emulation.
        # Source descriptors, repository metadata, and admitted OS tools stay real.
        return root_owned_stat(observed) if path == install_parent else observed

    def real_qualifier():
        qualifier = import_source(checkout / TARGET_REL, "first_entry_real_qualifier_fixture")
        observed = bind_real_qualifier(qualifier, checkout, install_parent)
        return qualifier, observed

    def require_collect_hold(head, reason):
        qualifier, observed = real_qualifier()
        before = fixture_generation(checkout)
        try:
            qualifier.collect(head)
        except qualifier.QualifyError as exc:
            assert reason in str(exc), str(exc)
            assert "authenticated_retained_git_required" not in str(exc)
            assert "authenticated_source_descriptors_required" not in str(exc)
        else:
            raise AssertionError("real_qualifier_expected_hold_missing:" + reason)
        assert fixture_generation(checkout) == before
        require_real_cleanup(observed)
        assert len(observed["witnesses"]) == 1
        assert qualifier._GIT_RECEIPT["temporary_git_metadata_write_performed"] is True
        assert qualifier._GIT_RECEIPT["temporary_git_metadata_cleanup_completed"] is True
        return qualifier, observed

    try:
        Path.lstat = installed_parent_lstat

        # Establish the old seam's two failures using the unchanged real V5.
        qualifier, observed = real_qualifier()
        installer = qualifier._load_installer()
        for operation, reason in (
            (installer.checkout_snapshot, "authenticated_retained_git_required"),
            (installer.accepted_lock, "authenticated_source_descriptors_required"),
        ):
            try:
                operation(expected_head)
            except installer.InstallError as exc:
                assert str(exc) == reason, str(exc)
            else:
                raise AssertionError("native_parent_admission_was_weakened:" + reason)
        assert installer._BOOTSTRAP_CONTEXT is None

        # The exact original lock is parsed through the real retained observer.
        # No fake installer, lock decoder, repository, or Git subprocess is used.
        observer = qualifier._load_repository_observer()
        before = fixture_generation(checkout)
        with observer._RepositorySnapshot(expected_head) as repository:
            assert repository.checkout()["head"] == expected_head
            accepted = qualifier._accepted_lock(installer, repository)
            assert accepted == json.loads(lock_raw)
            assert accepted["lock_id"] == installer.LOCK_ID
            assert accepted["protected_install_authorized"] is False
        assert fixture_generation(checkout) == before
        require_real_cleanup(observed)

        # Real collect passes both former native-parent gates and reaches the
        # deliberately absent disposable install root. A production GREEN is
        # neither manufactured nor needed to prove this integration seam.
        require_collect_hold(expected_head, "protected_first_entry_not_green")

        # The actual planner loads its exact qualifier, which loads both exact
        # dependencies, and reaches the same bounded absent-root result.
        planner = import_source(checkout / PLANNER_REL, "first_entry_real_planner_fixture")
        assert planner.QUALIFIER_BLOB == TARGET_BLOB
        root_entry_proxy(planner)
        original_qualifier_loader = planner.load_qualifier
        planner_observations = []

        def planner_qualifier_loader():
            loaded = original_qualifier_loader()
            planner_observations.append(bind_real_qualifier(loaded, checkout, install_parent))
            return loaded

        planner.load_qualifier = planner_qualifier_loader
        before = fixture_generation(checkout)
        try:
            planner.collect_plan(expected_head)
        except planner.PlanError as exc:
            assert str(exc) == (
                "installed_qualification_hold:QualifyError:protected_first_entry_not_green"
            ), str(exc)
        else:
            raise AssertionError("real_planner_synthesized_installed_authority")
        assert fixture_generation(checkout) == before
        assert len(planner_observations) == 1
        require_real_cleanup(planner_observations[0])

        # Source drift is refused by each real immutable loader before any Git
        # admission. This also exercises the planner's transitive source pin.
        for relative, reason in (
            (INSTALLER_REL, "installer_source_blob_mismatch"),
            (OBSERVER_REL, "repository_observer_source_blob_mismatch"),
        ):
            write_file(checkout / relative, fixture_files[relative] + b"\n# fixture drift\n", 0o644)
            qualifier, observed = real_qualifier()
            try:
                qualifier.collect(expected_head)
            except qualifier.QualifyError as exc:
                assert str(exc) == reason, str(exc)
            else:
                raise AssertionError("modified_dependency_executed:" + relative)
            assert observed["witnesses"] == []
            assert qualifier._GIT_RECEIPT["temporary_git_metadata_write_performed"] is False
            write_file(checkout / relative, fixture_files[relative], 0o644)

        write_file(checkout / TARGET_REL, target_raw + b"\n# fixture drift\n", 0o644)
        try:
            original_qualifier_loader()
        except planner.PlanError as exc:
            assert str(exc) == "repository_source_blob_mismatch:" + TARGET_REL, str(exc)
        else:
            raise AssertionError("planner_modified_qualifier_executed")
        write_file(checkout / TARGET_REL, target_raw, 0o644)

        require_collect_hold("0" * 40, "checkout_head_mismatch")
        write_file(checkout / "fixture.txt", b"uncommitted fixture drift\n", 0o644)
        require_collect_hold(expected_head, "checkout_raw_worktree_bytes_mismatch")
        write_file(checkout / "fixture.txt", fixture_files["fixture.txt"], 0o644)

        # A clean committed lock mutation cannot bypass immutable tree membership.
        write_file(checkout / LOCK_REL, lock_raw + b"\n", 0o644)
        fixture_git(checkout, "add", "--", LOCK_REL)
        fixture_git(checkout, "commit", "-m", "Mutate accepted lock in disposable fixture")
        lock_drift_head = fixture_git(checkout, "rev-parse", "HEAD")
        require_collect_hold(lock_drift_head, "git_object_tree_membership_mismatch:" + LOCK_REL)
        write_file(checkout / LOCK_REL, lock_raw, 0o644)
        fixture_git(checkout, "add", "--", LOCK_REL)
        fixture_git(checkout, "commit", "-m", "Restore accepted fixture lock")
        expected_head = fixture_git(checkout, "rev-parse", "HEAD")

        # The same real context used by collect must recheck its retained
        # checkout on exit and clean its private metadata even when exit rejects.
        qualifier, observed = real_qualifier()
        installer = qualifier._load_installer()
        observer = qualifier._load_repository_observer()
        try:
            with observer._RepositorySnapshot(expected_head) as repository:
                repository.checkout()
                qualifier._accepted_lock(installer, repository)
                write_file(checkout / "fixture.txt", b"generation changed during observation\n", 0o644)
        except observer.InstallError as exc:
            assert str(exc) == "checkout_worktree_changed", str(exc)
        else:
            raise AssertionError("retained_checkout_generation_drift_accepted")
        require_real_cleanup(observed)
    finally:
        Path.lstat = original_path_lstat

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("installer_v5_blob_bound=true")
print("standalone_observer_v6_blob_bound=true")
print("real_dependency_loaders_exercised=true")
print("real_accepted_lock_observation_exercised=true")
print("former_native_parent_gates_preserved=true")
print("real_qualification_reaches_installed_state_gate=true")
print("real_planner_transitive_qualification_exercised=true")
print("real_source_checkout_lock_drift_rejected=true")
print("retained_checkout_exit_drift_rejected=true")
print("real_observer_cleanup_verified=true")
print("production_root_ownership_checks_preserved=true")
print("fixture_root_metadata_emulated=true")
print("triple_installed_snapshot_exercised=true")
print("installed_generation_drift_rejected=true")
print("temporary_git_metadata_truth_preserved=true")
print("temporary_git_metadata_cleanup_required=true")
print("payload_execution_absent=true")
print("protected_root_write=false")
print("repository_worktree_write=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")
print("installed_generation_evidence_authority=true")
print("non_designated_host_authority_rejected=true")
print("privileged_execution_authorized=false")
