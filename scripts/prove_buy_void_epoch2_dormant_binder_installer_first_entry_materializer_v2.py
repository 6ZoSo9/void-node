#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import contextlib
import io
import json
import os
import hashlib
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import types
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "MATERIALIZER_V2"
)
MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_v2.py"
)
MATERIALIZER_BLOB = "16c0c8aef7451cc849ad1dc0a0f69698e6d471bd"
LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v2.json"
)
LOCK_BLOB = "227c2fa449abf1387925373c706ecd07775d5898"
CANDIDATE_REL = (
    "scripts/prove_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_candidate_v2.py"
)
CANDIDATE_BLOB = "de2f487c625cf96c812cb6d4246d3d036a589e89"
LAUNCHER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_v2.c"
)
LAUNCHER_BLOB = "86dc09e52402c04fb6e4b30a7fcf695833808ca3"
RUNTIME_CHILD_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
RUNTIME_CHILD_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"

LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)
CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)
EXPECTED_REPORT_SHA256 = (
    "2eafc4dc83d7d59fbd5e1d7a7fa809661c72e3387ae83e7f3badae78780da6ac"
)
EXPECTED_BYTES = 731_072
EXPECTED_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
EXPECTED_GIT_BLOB = "798907b18c73ee2cc1dea0fe05b36f27ab4137a7"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, relative
    return raw


parser = argparse.ArgumentParser()
parser.add_argument("--fixtures-only", action="store_true")
args = parser.parse_args()
materializer_raw = pin(MATERIALIZER_REL, MATERIALIZER_BLOB)
if not args.fixtures_only:
    pin(LOCK_REL, LOCK_BLOB)
    pin(CANDIDATE_REL, CANDIDATE_BLOB)
    pin(LAUNCHER_REL, LAUNCHER_BLOB)
    pin(RUNTIME_CHILD_REL, RUNTIME_CHILD_BLOB)

source = materializer_raw.decode("utf-8", "strict")
tree = ast.parse(source, MATERIALIZER_REL)
compile(tree, MATERIALIZER_REL, "exec", dont_inherit=True)


def assigned_literal(name: str):
    values = []
    for node in tree.body:
        if not isinstance(node, ast.Assign):
            continue
        if any(isinstance(target, ast.Name) and target.id == name for target in node.targets):
            values.append(ast.literal_eval(node.value))
    assert len(values) == 1, name
    return values[0]


assert assigned_literal("LOCK_BLOB") == LOCK_BLOB
assert assigned_literal("LOCK_ID") == LOCK_ID
assert assigned_literal("CANDIDATE_BLOB") == CANDIDATE_BLOB
assert assigned_literal("EXPECTED_CANDIDATE_ID") == CANDIDATE_ID
assert assigned_literal("EXPECTED_REPORT_BYTES") == 6131
assert assigned_literal("EXPECTED_REPORT_SHA256") == EXPECTED_REPORT_SHA256
assert assigned_literal("EXPECTED_BINARY_BYTES") == EXPECTED_BYTES
assert assigned_literal("EXPECTED_BINARY_SHA256") == EXPECTED_SHA256
assert assigned_literal("EXPECTED_BINARY_GIT_BLOB_SHA1") == EXPECTED_GIT_BLOB

for required in (
    '"candidate_lock_v2"',
    '"CANDIDATE_LOCK_V2"',
    '"version": 2',
    '"runtime_head_contract_accepted": True',
    '"canonical_main_candidate_authority": True',
    '"superseded_v1_lock_install_authority": False',
    '"runtime_expected_head_compile_bound": False',
    '"runtime_expected_head_strict_lowercase_hex": True',
    '"runtime_expected_head_forwarded_unchanged": True',
    '"repository_head_not_embedded_in_launcher": True',
    '"frozen_child_launcher_path_compatible": True',
    'load_candidate_from_worktree(worktree)',
    'report, binary = module.derive()',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
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
    "shutil.rmtree",
):
    assert forbidden not in source, forbidden


def regression_fixtures() -> int:
    """Exercise only owned temporary files and inert process results."""
    inert = b"\x7fELF" + b"nonexecutable fixture bytes\n" * 8

    def fresh():
        m = types.ModuleType("materializer_v2_reconciliation_fixture")
        m.__file__ = str(ROOT / MATERIALIZER_REL)
        exec(compile(materializer_raw, MATERIALIZER_REL, "exec", dont_inherit=True), m.__dict__)
        m.os = types.SimpleNamespace(**os.__dict__)
        m.subprocess = types.SimpleNamespace(**subprocess.__dict__)
        m.tempfile = types.SimpleNamespace(**tempfile.__dict__)
        m.EXPECTED_BINARY_BYTES = len(inert)
        m.EXPECTED_BINARY_SHA256 = hashlib.sha256(inert).hexdigest()
        m.EXPECTED_BINARY_GIT_BLOB_SHA1 = git_blob(inert)
        return m

    def holds(m, action, reason):
        try:
            action()
        except (m.MaterializeError, OSError) as exc:
            assert reason in m._failure_reason(exc), (reason, str(exc))
        else:
            raise AssertionError("expected HOLD:" + reason)

    count = 0
    with tempfile.TemporaryDirectory(prefix="void-e2-materializer-v2-regressions-") as td:
        owned = Path(td)
        m = fresh()
        target = owned / "normal"
        m.write_create_only(target, inert)
        assert m.MUTATION_STATE["output_verified"]
        assert target.read_bytes() == inert and stat.S_IMODE(target.stat().st_mode) == 0o555
        before = m._stat_identity(target.stat())
        holds(m, lambda: m.write_create_only(target, inert), "output_exists")
        assert m._stat_identity(target.stat()) == before and target.read_bytes() == inert
        count += 2

        for case in ("parent", "leaf", "late_bytes", "readback", "fsync", "close"):
            m = fresh()
            parent = owned / case
            parent.mkdir()
            target = parent / "artifact"
            descriptor = None
            fired = False
            def capture_write(fd, data):
                nonlocal descriptor
                descriptor = fd
                return os.write(fd, data)
            def intercept_sync(fd):
                nonlocal fired
                if case == "fsync":
                    raise OSError("inert fsync failure")
                if (stat.S_ISDIR(os.fstat(fd).st_mode) and not fired
                        and case in ("parent", "leaf", "late_bytes")):
                    fired = True
                    if case == "parent":
                        parent.rename(owned / "parent-original")
                        parent.mkdir()
                        (parent / "operator-entry").write_bytes(b"preserve")
                    elif case == "leaf":
                        target.rename(parent / "original")
                        target.write_bytes(b"replacement remains")
                    elif case == "late_bytes":
                        assert descriptor is not None
                        old = os.fstat(descriptor)
                        os.pwrite(descriptor, b"!", 4)
                        os.utime(descriptor, ns=(old.st_atime_ns, old.st_mtime_ns + 1_000_000))
                return os.fsync(fd)
            def intercept_read(fd, length):
                nonlocal fired
                if case == "readback" and not fired:
                    fired = True
                    os.pwrite(fd, b"?", 4)
                return os.read(fd, length)
            def intercept_close(fd):
                nonlocal fired
                os.close(fd)
                if not fired:
                    fired = True
                    raise OSError("inert close failure")
            m.os.write = capture_write
            m.os.fsync = intercept_sync
            m.os.read = intercept_read
            if case == "close":
                m.os.close = intercept_close
            reason = {
                "parent": "output_parent_changed_after_publication",
                "leaf": "output_visible_generation_changed",
                "late_bytes": "output_final_generation_changed",
                "readback": "output_descriptor_readback_mismatch",
                "fsync": "OSError",
                "close": "OSError",
            }[case]
            holds(m, lambda: m.write_create_only(target, inert), reason)
            assert m.MUTATION_STATE["output_created"] and not m.MUTATION_STATE["output_verified"]
            if case == "parent":
                assert (owned / "parent-original" / "artifact").read_bytes() == inert
                assert (parent / "operator-entry").read_bytes() == b"preserve"
            elif case == "leaf":
                assert target.read_bytes() == b"replacement remains"
                assert (parent / "original").read_bytes() == inert
            else:
                assert target.exists()
            count += 1

        # Run the actual derivation control flow with inert Git/helper results.
        # No accepted helper, compiler, launcher or live Git subprocess is run.
        for case in ("ok", "remove_failed", "registry_left", "add_failed", "add_timeout", "temp_failed"):
            m = fresh()
            home = owned / ("cleanup-" + case)
            home.mkdir()
            temp = home / "owned-temp"
            worktree = temp / "candidate-worktree"
            output = home / "output"
            registered = False
            commands = []
            class Receipt(io.StringIO):
                flushed = False
                def flush(self):
                    self.flushed = True
                    super().flush()
            receipt = Receipt()
            def make_temp(**kwargs):
                assert receipt.flushed
                assert "temporary_filesystem_write_authorized=true" in receipt.getvalue().splitlines()
                assert "git_worktree_mutation_authorized=true" in receipt.getvalue().splitlines()
                temp.mkdir(mode=0o700)
                return str(temp)
            m.tempfile.mkdtemp = make_temp
            m.accepted_lock = lambda: {}
            m.verify_candidate_merge = lambda: None
            report = {
                "candidate_id": m.EXPECTED_CANDIDATE_ID,
                "repository_head": m.CANDIDATE_MERGE,
                "repository_tree": m.CANDIDATE_TREE,
            }
            report_bytes = m.canonical(report)
            m.EXPECTED_REPORT_BYTES = len(report_bytes)
            m.EXPECTED_REPORT_SHA256 = hashlib.sha256(report_bytes).hexdigest()
            m.EXPECTED_REPORT_GIT_BLOB_SHA1 = git_blob(report_bytes)
            m.load_candidate_from_worktree = lambda path: types.SimpleNamespace(
                derive=lambda: (report, inert))
            def inert_git(argv, **kwargs):
                nonlocal registered
                command = argv[4:]
                commands.append(command)
                body = b""
                code = 0
                if command[:2] == ["worktree", "add"]:
                    worktree.mkdir()
                    registered = True
                    if case == "add_timeout":
                        raise subprocess.TimeoutExpired(argv, 60)
                    if case == "add_failed":
                        code = 1
                elif command == ["rev-parse", "HEAD"]:
                    body = m.CANDIDATE_MERGE.encode()
                elif command == ["rev-parse", "HEAD^{tree}"]:
                    body = m.CANDIDATE_TREE.encode()
                elif command[0] == "status":
                    pass
                elif command == ["worktree", "list", "--porcelain", "-z"]:
                    body = (("worktree " + str(worktree) + "\0").encode() if registered else b"")
                elif command == ["worktree", "remove", "--force", str(worktree)]:
                    if case == "remove_failed":
                        code = 1
                    else:
                        worktree.rmdir()
                        registered = case == "registry_left"
                else:
                    raise AssertionError(command)
                return subprocess.CompletedProcess(argv, code, body, b"")
            m.subprocess.run = inert_git
            real_rmdir = Path.rmdir
            def temp_failure(path):
                if case == "temp_failed" and path == temp:
                    raise OSError("inert temp cleanup failure")
                return real_rmdir(path)
            with mock.patch.object(Path, "rmdir", temp_failure):
                with mock.patch.object(sys, "argv", [str(ROOT / MATERIALIZER_REL), "--derive", str(output)]):
                    with contextlib.redirect_stdout(receipt):
                        if case == "ok":
                            assert m.main() == 0
                        else:
                            reason = {
                                "remove_failed": "primary=none:cleanup=git_command_failed:worktree",
                                "registry_left": "primary=none:cleanup=worktree_cleanup_incomplete",
                                "add_failed": "primary=candidate_worktree_add_failed:cleanup=worktree_cleanup_generation_unverified",
                                "add_timeout": "primary=TimeoutExpired:cleanup=worktree_cleanup_generation_unverified",
                                "temp_failed": "primary=none:cleanup=OSError",
                            }[case]
                            holds(m, m.main, reason)
            assert ["worktree", "list", "--porcelain", "-z"] in commands
            if case == "ok":
                assert output.read_bytes() == inert and not temp.exists()
                assert m.MUTATION_STATE["git_worktree_cleanup_verified"]
                assert m.MUTATION_STATE["temporary_directory_cleanup_verified"]
            else:
                assert not output.exists()
                assert not m.MUTATION_STATE["output_creation_attempted"]
                assert not m.MUTATION_STATE["temporary_directory_cleanup_verified"]
                assert m.MUTATION_STATE["git_worktree_mutation_possible"]
                assert m.MUTATION_STATE["temporary_filesystem_mutation_possible"]
            count += 1

        # Real CLI refusal before Git or derivation, with truthful HOLD state.
        existing = owned / "existing-cli"
        existing.write_bytes(b"unchanged")
        cp = subprocess.run(
            ["/usr/bin/python3", "-I", "-B", str(ROOT / MATERIALIZER_REL), "--derive", str(existing)],
            cwd=owned, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            text=True, timeout=20, check=False,
        )
        assert cp.returncode == 2 and not cp.stderr, (cp.returncode, cp.stderr)
        for line in (
            "status=HOLD", "reason=output_exists",
            "temporary_filesystem_write_authorized=true", "git_worktree_mutation_authorized=true",
            "temporary_filesystem_mutation_possible=false", "git_worktree_mutation_possible=false",
            "output_created=false", "output_verified=false",
            "protected_installer_consumer_bound=false", "output_failure_destructive_cleanup=false",
        ):
            assert line in cp.stdout.splitlines(), line
        assert existing.read_bytes() == b"unchanged"
        count += 1
    return count


fixture_count = regression_fixtures()
print("bounded_fixture_cases=" + str(fixture_count))
for fact in (
    "final_absolute_output_parent_and_leaf_bound=true",
    "final_output_file_generation_drift_rejected=true",
    "output_io_and_close_failure_holds=true",
    "checked_worktree_cleanup_before_publication=true",
    "partial_add_and_timeout_cleanup_checked=true",
    "primary_and_cleanup_failure_reported=true",
    "cleanup_failure_blocks_publication=true",
    "pre_mutation_authority_flushed=true",
    "hold_mutation_state_truthful=true",
):
    print(fact)
if args.fixtures_only:
    print(MARKER + "_FIXTURES_GREEN")
    print("full_materialization_performed=false")
    print("protected_installer_consumer_bound=false")
    print("funds_movement=false")
    raise SystemExit(0)


python = "/usr/bin/python3"
self_test = subprocess.run(
    [python, "-I", "-B", str(ROOT / MATERIALIZER_REL), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=90,
)
assert self_test.returncode == 0, self_test.stderr
for line in (
    MARKER + "_SELF_TEST_GREEN",
    "accepted_first_entry_lock_v2_bound=true",
    "runtime_head_contract_accepted=true",
    "superseded_v1_lock_install_authority=false",
    "candidate_merge_exact=true",
    "candidate_tool_verification_required=true",
    "candidate_rederivation_required=true",
    "create_only_output_required=true",
    "output_descriptor_readback_required=true",
    "output_parent_directory_fsync_required=true",
    "output_visible_parent_and_leaf_binding_required=true",
    "worktree_cleanup_verification_required=true",
    "candidate_rederivation_completed=false",
    "output_created=false",
    "output_verified=false",
    "output_failure_destructive_cleanup=false",
    "launcher_binary_identity_accepted=true",
    "protected_install_authorized=false",
    "precision_install_authorized=false",
    "native_or_binder_live_execution_authorized=false",
    "funds_movement=false",
):
    assert line in self_test.stdout.splitlines(), line

with tempfile.TemporaryDirectory(
    prefix="void-e2-first-entry-materializer-v2-proof-"
) as td:
    root = Path(td)
    first = root / "launcher-v2-a"
    second = root / "launcher-v2-b"

    outputs: list[bytes] = []
    for target in (first, second):
        cp = subprocess.run(
            [
                python, "-I", "-B", str(ROOT / MATERIALIZER_REL),
                "--derive", str(target),
            ],
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
            MARKER + "_DERIVE_GREEN",
            "candidate_report_sha256=" + EXPECTED_REPORT_SHA256,
            "candidate_id=" + CANDIDATE_ID,
            "launcher_binary_bytes=" + str(EXPECTED_BYTES),
            "launcher_binary_sha256=" + EXPECTED_SHA256,
            "accepted_lock_id=" + LOCK_ID,
            "candidate_rederived_at_locked_merge=true",
            "output_visible_parent_and_leaf_verified=true",
            "git_worktree_cleanup_verified=true",
            "temporary_directory_cleanup_verified=true",
            "candidate_rederivation_completed=true",
            "output_created=true",
            "output_verified=true",
            "protected_installer_consumer_bound=false",
            "runtime_head_contract_accepted=true",
            "superseded_v1_lock_install_authority=false",
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
        assert git_blob(raw) == EXPECTED_GIT_BLOB
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
        [
            python, "-I", "-B", str(ROOT / MATERIALIZER_REL),
            "--derive", str(first),
        ],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=300,
    )
    assert duplicate.returncode == 2
    assert "reason=output_exists" in duplicate.stdout.splitlines()
    assert "protected_install_authorized=false" in duplicate.stdout.splitlines()
    assert "funds_movement=false" in duplicate.stdout.splitlines()

print(MARKER + "_PROOF_GREEN")
print("materializer_blob_bound=true")
print("accepted_first_entry_lock_v2_bound=true")
print("candidate_tool_blob_bound=true")
print("launcher_source_blob_bound=true")
print("runtime_child_source_blob_bound=true")
print("runtime_head_contract_accepted=true")
print("candidate_rederived_at_locked_merge=true")
print("two_materializations_byte_identical=true")
print("accepted_binary_bytes=" + str(EXPECTED_BYTES))
print("accepted_binary_sha256=" + EXPECTED_SHA256)
print("accepted_binary_git_blob=" + EXPECTED_GIT_BLOB)
print("static_no_pt_interp_verified=true")
print("dynamic_needed_absent=true")
print("create_only_output_replay_rejected=true")
print("output_descriptor_readback=true")
print("output_parent_directory_fsync=true")
print("output_failure_destructive_cleanup=false")
print("artifact_publication_only=true")
print("protected_installer_consumer_bound=false")
print("protected_install_authorized=false")
print("precision_install_authorized=false")
print("native_or_binder_live_execution_authorized=false")
print("funds_movement=false")
