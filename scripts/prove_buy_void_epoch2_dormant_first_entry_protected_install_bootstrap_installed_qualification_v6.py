#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_installed_qualification_v6.py"
TARGET_BLOB = "5f7321725b306184567111c0a7831d08243ad052"
INSTALLER = ROOT / (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
INSTALLER_BLOB = "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"


def blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


target_raw = TARGET.read_bytes()
source = target_raw.decode("utf-8")
assert blob(target_raw) == TARGET_BLOB
assert blob(INSTALLER.read_bytes()) == INSTALLER_BLOB

for required in (
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6",
    'INSTALLER_SOURCE_GIT_BLOB_SHA1 = "438b69e3c0da8549b77f7bdeaa7ed35e7d07ef84"',
    "double_descriptor_bound_bootstrap_self_test_required=true",
    "before_middle_after_stability_required=true",
    "python_and_git_policy_binding_required=true",
    "bootstrap_execution_beyond_self_test=false",
    "inner_installer_execution=false",
    "protected_installer_apply=false",
    "credential_access=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
    "_test_before_exec_hook(path, fd)",
    "pass_fds=(fd,)",
    'executable = f"/proc/self/fd/{fd}"',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "LoadCredential",
    "CREDENTIALS_DIRECTORY",
):
    assert forbidden not in source, forbidden

spec = importlib.util.spec_from_file_location("v6_qualification", TARGET)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

installer = module._load_installer()
assert installer.LOCK_ID == (
    "voidbuye2dormantbootstraplock3_"
    "4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396"
)
assert installer.CANDIDATE_ID == (
    "voidbuye2dormantbootstrapcand3_"
    "1ae4aa35f0796047443851a79351415dc3288aa5a902b6307d365117e70423f2"
)
assert installer.BOOTSTRAP_BYTES == 874_608
assert installer.BOOTSTRAP_SHA256 == (
    "618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c"
)
assert installer.MANIFEST_SHA256 == (
    "8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9"
)
policy = installer.build_policy(
    {"sha256": "1" * 64, "bytes": 123},
    {"sha256": "2" * 64, "bytes": 456},
)
assert policy == (
    "schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6\n"
    "python_sha256=" + "1" * 64 + "\n"
    "python_bytes=123\n"
    "git_sha256=" + "2" * 64 + "\n"
    "git_bytes=456\n"
).encode("ascii")

self_test = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr
for marker in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6_SELF_TEST_GREEN",
    "installer_source_blob_bound=true",
    "accepted_bootstrap_v6_lock_bound=true",
    "installed_three_file_root_required=true",
    "python_and_git_policy_binding_required=true",
    "double_descriptor_bound_bootstrap_self_test_required=true",
    "before_middle_after_stability_required=true",
    "bootstrap_execution_beyond_self_test=false",
    "inner_installer_execution=false",
    "protected_installer_apply=false",
    "filesystem_write=false",
    "credential_access=false",
    "signing=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
):
    assert marker in self_test.stdout.splitlines(), marker

source_plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert source_plan.returncode == 0, source_plan.stderr
for marker in (
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "read_only=true",
    "double_descriptor_bound_bootstrap_self_test_required=true",
    "bootstrap_execution_beyond_self_test=false",
    "inner_installer_execution=false",
    "protected_installer_apply=false",
    "filesystem_write=false",
    "credential_access=false",
    "signing=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
):
    assert marker in source_plan.stdout.splitlines(), marker

# Prove the retained descriptor is execution authority and pathname drift is rejected.
with tempfile.TemporaryDirectory(
    prefix="void-e2-bootstrap-v6-qualification-path-swap-"
) as td:
    root = Path(td)
    bin_dir = root / "bin"
    bin_dir.mkdir()
    visible = bin_dir / "bootstrap"
    original = Path("/usr/bin/true")
    replacement = Path("/usr/bin/false")
    shutil.copyfile(original, visible)
    os.chmod(visible, 0o555)
    before = visible.lstat()
    raw = visible.read_bytes()
    expected = {
        **module._record(before),
        "sha256": hashlib.sha256(raw).hexdigest(),
        "git_blob_sha1": blob(raw),
    }
    fixture = types.SimpleNamespace(
        INSTALL_ROOT=root,
        BIN_DIR="bin",
        BOOTSTRAP_NAME="bootstrap",
        BOOTSTRAP_SHA256=hashlib.sha256(raw).hexdigest(),
    )

    def swap(path: Path, fd: int) -> None:
        assert path == visible
        assert os.fstat(fd).st_ino == before.st_ino
        staged = root / "replacement"
        shutil.copyfile(replacement, staged)
        os.chmod(staged, 0o555)
        os.replace(staged, visible)

    try:
        module._run_bootstrap_self_test(
            fixture,
            expected,
            _test_before_exec_hook=swap,
        )
    except module.QualifyError as exc:
        assert str(exc) == "bootstrap_generation_changed_during_self_test"
    else:
        raise AssertionError("visible bootstrap path substitution accepted")

    # The retained descriptor executed /usr/bin/true. A pathname-following
    # execution would have used /usr/bin/false; generation drift is still HOLD.
    assert visible.read_bytes() == replacement.read_bytes()


# Explicitly simulated collector control flow; retained-FD swap proof above is real.
import contextlib
import copy
import io
import types
from unittest import mock


def run_cases(module, actual_installer):
    case_names = (
        'one_observation_through_both_self_tests',
        'middle_snapshot_drift',
        'self_test_output_drift',
        'final_repository_fence_failure',
        'private_cleanup_failure',
        'self_test_io_failure',
        'nonroot_refusal_before_observation',
    )
    for case in case_names:
        events = []
        state = {'writes': False, 'cleaned': True}
        expected_head = '1' * 40
        shared = object()
        snapshot = {
            'bootstrap': {'fixture': 'inert'},
            'protected_state': actual_installer.GREEN_STATE,
            'policy_sha256': '2' * 64,
            'policy_bytes': 200,
            'python': {'sha256': '3' * 64, 'bytes': 300},
            'git_tool': {'sha256': '4' * 64, 'bytes': 400},
        }

        class Reader:
            def __init__(self, head):
                assert head == expected_head
                events.append('reader_constructed')

            def __enter__(self):
                events.append('reader_entered')
                state['writes'] = True
                return shared

            def __exit__(self, kind, error, traceback):
                events.append('reader_exited')
                if case == 'private_cleanup_failure':
                    state['cleaned'] = False
                    raise actual_installer.InstallError('fixture_cleanup_failure')
                if case == 'final_repository_fence_failure' and kind is None:
                    raise actual_installer.InstallError('fixture_final_fence_failure')
                return False

        def receipt():
            return {
                'git_boundary_policy': actual_installer.GIT_BOUNDARY_POLICY,
                'temporary_git_metadata_write_required': True,
                'temporary_git_metadata_write_performed': state['writes'],
                'temporary_git_metadata_cleanup_completed': state['cleaned'],
                'source_repository_mutation': False,
                'source_object_fetch': False,
                'repository_config_loaded': False,
                'repository_callback_execution': False,
                'standalone_git_tool_admission': True,
                'native_parent_authority_claimed': False,
            }

        fixture_installer = types.SimpleNamespace(
            **{name: getattr(actual_installer, name) for name in (
                'InstallError', 'LOCK_ID', 'CANDIDATE_ID', 'BOOTSTRAP_SHA256',
                'BOOTSTRAP_BYTES', 'BOOTSTRAP_GIT_BLOB_SHA1', 'MANIFEST_SHA256',
                'MANIFEST_BYTES', 'MANIFEST_GIT_BLOB_SHA1',
            )},
            _RepositorySnapshot=Reader,
            git_boundary_receipt=receipt,
        )

        def observed(installer, head, *, repository=None):
            assert installer is fixture_installer and head == expected_head
            assert repository is shared
            events.append('snapshot')
            value = copy.deepcopy(snapshot)
            if case == 'middle_snapshot_drift' and events.count('snapshot') == 2:
                value['policy_bytes'] += 1
            return value

        def self_test(installer, expected):
            assert installer is fixture_installer and expected == snapshot['bootstrap']
            events.append('self_test')
            if case == 'self_test_io_failure':
                raise OSError('fixture_self_test_io_failure')
            if case == 'self_test_output_drift' and events.count('self_test') == 2:
                return 'changed', 'changed'
            return 'inert-fixture', 'sha256:' + '5' * 64

        output = io.StringIO()
        error = None
        result = None
        uid = 1000 if case == 'nonroot_refusal_before_observation' else 0
        with mock.patch.object(module, '_load_installer', return_value=fixture_installer), \
                mock.patch.object(module, '_installed_snapshot', side_effect=observed), \
                mock.patch.object(module, '_run_bootstrap_self_test', side_effect=self_test), \
                mock.patch.object(module.os, 'geteuid', return_value=uid), \
                contextlib.redirect_stdout(output):
            try:
                result = module.collect(expected_head)
            except module.QualifyError as exc:
                error = str(exc)
        if case == 'nonroot_refusal_before_observation':
            assert error == 'root_required_for_installed_qualification'
            assert events == [] and output.getvalue() == ''
            assert module._GIT_RECEIPT['temporary_git_metadata_write_performed'] is False
            continue
        assert events.count('reader_constructed') == 1
        assert events.count('reader_entered') == 1
        assert events.count('reader_exited') == 1
        assert events[-1] == 'reader_exited'
        assert 'authority_boundary=PRE_GIT_OBSERVATION' in output.getvalue().splitlines()
        assert module._GIT_RECEIPT['temporary_git_metadata_write_performed'] is True
        assert module._GIT_RECEIPT['temporary_git_metadata_cleanup_completed'] is (case != 'private_cleanup_failure')
        if case == 'one_observation_through_both_self_tests':
            assert error is None
            assert events == ['reader_constructed', 'reader_entered', 'snapshot', 'self_test',
                              'snapshot', 'self_test', 'snapshot', 'reader_exited']
            assert result['read_only'] is False and result['filesystem_write'] is True
            assert result['protected_filesystem_mutation'] is False
            assert result['source_repository_mutation'] is False
            assert result['temporary_git_metadata_cleanup_completed'] is True
            emitted = io.StringIO()
            with contextlib.redirect_stdout(emitted):
                module.emit(result)
            assert 'temporary_git_metadata_cleanup_completed=true' in emitted.getvalue().splitlines()
            assert 'read_only=false' in emitted.getvalue().splitlines()
        else:
            assert result is None and error is not None
            expected = {
                'middle_snapshot_drift': 'installed_generation_changed_during_qualification',
                'self_test_output_drift': 'bootstrap_self_test_output_changed',
                'final_repository_fence_failure': 'installed_repository_observation_failed:fixture_final_fence_failure',
                'private_cleanup_failure': 'installed_repository_observation_failed:fixture_cleanup_failure',
                'self_test_io_failure': 'installed_qualification_io_failed:OSError',
            }[case]
            assert error == expected, (case, error)
    return len(case_names)


qualifier_control_case_count = run_cases(module, installer)

print("VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6_PROOF_GREEN")
print("target_blob_bound=true")
print("installer_v6_blob_bound=true")
print("accepted_bootstrap_v6_lock_bound=true")
print("accepted_bootstrap_v6_binary_bound=true")
print("source_generation_v3_manifest_bound=true")
print("python_and_git_policy_binding_required=true")
print("retained_bootstrap_fd_execution_required=true")
print("visible_path_swap_rejected_after_retained_fd_execution=true")
print("before_middle_after_stability_required=true")
print("double_self_test_required=true")
print("bootstrap_execution_beyond_self_test=false")
print("inner_installer_execution=false")
print("protected_installer_apply=false")
print("production_filesystem_write=false")
print("fixture_filesystem_mutation=true")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
print("qualifier_control_flow_cases=" + str(qualifier_control_case_count))
print("single_repository_observation_through_both_self_tests_proven=true")
print("final_repository_fence_failure_rejected=true")
print("private_cleanup_failure_reported=true")
print("temporary_metadata_receipts_truthful=true")
print("qualification_root_admission_simulated=true")
print("actual_installed_root_qualification=false")
