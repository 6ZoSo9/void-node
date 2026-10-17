#!/usr/bin/env python3
from __future__ import annotations

import ast
from contextlib import ExitStack, redirect_stdout
import fcntl
import hashlib
import importlib.util
import io
import os
from pathlib import Path
import stat
import subprocess
import tempfile
from types import SimpleNamespace
from unittest.mock import patch
import zlib


ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "91314d52c7c6b4ca1f3221a5f46278e5f71190eb"
LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json"
)
LOCK_BLOB = "f8ff6fbb855aecafc329cd60622cf3af782745a3"
RUNTIME_INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
RUNTIME_INSTALLER_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"
MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_"
    "INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V3"
)
GIT = "/usr/bin/git"

CANONICAL_V1_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py"
)
CANONICAL_V1_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"
CANONICAL_V2_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py"
)
CANONICAL_V2_BLOB = "69a018c0eccedf3782055c56725579d02463b05e"
CANONICAL_TERMINAL_REL = (
    "scripts/"
    "prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2_terminal.py"
)
CANONICAL_TERMINAL_BLOB = "7b2ddaeddf844d98aa4eb7006ee371ea6a455f57"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def repository_state(root: Path) -> tuple:
    """Observe fixture bytes and metadata; access time is deliberately excluded."""
    result = []

    def visit(path: Path) -> None:
        st = path.lstat()
        record = (
            str(path.relative_to(root)), st.st_dev, st.st_ino, st.st_mode,
            st.st_uid, st.st_gid, st.st_nlink, st.st_size,
            st.st_mtime_ns, st.st_ctime_ns,
        )
        if stat.S_ISLNK(st.st_mode):
            result.append(record + (os.readlink(path),))
        elif stat.S_ISREG(st.st_mode):
            result.append(record + (hashlib.sha256(path.read_bytes()).hexdigest(),))
        elif stat.S_ISDIR(st.st_mode):
            result.append(record)
            for child in sorted(path.iterdir()):
                visit(child)
        else:
            result.append(record)

    visit(root)
    return tuple(result)


def fixture_git(repo: Path, *args: str) -> bytes:
    env = {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent",
        "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null", "GIT_TERMINAL_PROMPT": "0",
        "GIT_ALLOW_PROTOCOL": "", "GIT_NO_LAZY_FETCH": "1",
        "GIT_AUTHOR_NAME": "VOID synthetic fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "VOID synthetic fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        "GIT_AUTHOR_DATE": "2001-01-01T00:00:00Z",
        "GIT_COMMITTER_DATE": "2001-01-01T00:00:00Z",
    }
    cp = subprocess.run(
        [GIT, "--no-pager", "-c", "core.hooksPath=/dev/null",
         "-c", "core.fsmonitor=false", "-c", "gc.auto=0",
         "-c", "maintenance.auto=false", "-C", str(repo), *args],
        env=env, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=False, timeout=30,
    )
    assert cp.returncode == 0, (args, cp.returncode, cp.stderr[-1000:])
    return cp.stdout


def create_repository(parent: Path, name: str) -> tuple[Path, str, bytes]:
    repo = parent / name
    repo.mkdir()
    fixture_git(repo, "init", "--initial-branch=main")
    raw = b"accepted raw source bytes\n"
    (repo / "source.txt").write_bytes(raw)
    (repo / "keep").mkdir()
    (repo / "keep" / "data.txt").write_bytes(b"kept tree\n")
    (repo / "other").mkdir()
    (repo / "other" / "data.txt").write_bytes(b"other tree\n")
    (repo / "script.sh").write_bytes(b"#!/bin/sh\nexit 0\n")
    (repo / "script.sh").chmod(0o755)
    (repo / "safe-link").symlink_to("source.txt")
    (repo / ".gitignore").write_bytes(b"ignored-fixture.txt\n")
    (repo / ".gitattributes").write_bytes(b"source.txt filter=fixture\n")
    fixture_git(repo, "add", "--all")
    fixture_git(repo, "commit", "-m", "synthetic source generation")
    head = fixture_git(repo, "rev-parse", "HEAD").decode("ascii").strip()
    return repo, head, raw


def unchanged_call(module, repo: Path, operation):
    before = repository_state(repo)
    with patch.object(module, "FIXED_CHECKOUT", repo):
        try:
            return operation()
        finally:
            assert repository_state(repo) == before, "source repository changed"


def expect_hold(module, repo: Path, head: str, operation=None) -> str:
    if operation is None:
        operation = lambda: module.checkout_snapshot(head)
    try:
        unchanged_call(module, repo, operation)
    except module.InstallError as exc:
        assert str(exc), "HOLD must identify a failure"
        return str(exc)
    raise AssertionError("unsafe or unsupported source state accepted")


def prove_git_child_resource_limits(module, source_tree: ast.Module) -> None:
    resource = module.resource
    parent_limits = {
        which: resource.getrlimit(which)
        for which in (resource.RLIMIT_AS, resource.RLIMIT_CPU)
    }
    assert 0 < module.GIT_CHILD_ADDRESS_SPACE_BYTES <= 2 * 1024 * 1024 * 1024
    assert 0 < module.GIT_CHILD_CPU_SECONDS <= 60
    unlimited = resource.RLIM_INFINITY
    cases = (
        ({resource.RLIMIT_AS: (unlimited, unlimited), resource.RLIMIT_CPU: (unlimited, unlimited)},
         {resource.RLIMIT_AS: module.GIT_CHILD_ADDRESS_SPACE_BYTES,
          resource.RLIMIT_CPU: module.GIT_CHILD_CPU_SECONDS}),
        ({resource.RLIMIT_AS: (1024, 2048), resource.RLIMIT_CPU: (7, 9)},
         {resource.RLIMIT_AS: 1024, resource.RLIMIT_CPU: 7}),
        ({resource.RLIMIT_AS: (unlimited, 4096), resource.RLIMIT_CPU: (unlimited, 5)},
         {resource.RLIMIT_AS: 4096, resource.RLIMIT_CPU: 5}),
        ({resource.RLIMIT_AS: (0, unlimited), resource.RLIMIT_CPU: (0, unlimited)},
         {resource.RLIMIT_AS: 0, resource.RLIMIT_CPU: 0}),
    )
    for inherited, expected in cases:
        seen = {}
        view = SimpleNamespace(**vars(resource))
        view.getrlimit = lambda which: inherited[which]
        view.setrlimit = lambda which, value: seen.setdefault(which, value)
        with patch.object(module, "resource", view):
            module._git_child_limits()
        assert seen == {which: (value, value) for which, value in expected.items()}
    assert all(resource.getrlimit(which) == value for which, value in parent_limits.items())
    popen_calls = [
        node for node in ast.walk(source_tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id == "subprocess" and node.func.attr == "Popen"
    ]
    assert popen_calls
    for call in popen_calls:
        assert any(
            item.arg == "preexec_fn" and isinstance(item.value, ast.Name)
            and item.value.id == "_git_child_limits" for item in call.keywords
        )


def prove_git_boundary(module) -> None:
    with tempfile.TemporaryDirectory(prefix="void-e2-installer-v3-git-proof-") as td:
        root = Path(td)
        repo, head, raw = create_repository(root, "clean-loose")
        (repo / "ignored-fixture.txt").write_bytes(b"ignored inert input\n")
        snapshot = unchanged_call(module, repo, lambda: module.checkout_snapshot(head))
        assert snapshot["head"] == head and snapshot["branch"] == "main"
        assert snapshot["clean"] is True
        assert snapshot["git_boundary_policy"] == module.GIT_BOUNDARY_POLICY
        assert unchanged_call(
            module, repo,
            lambda: module._git_object(
                head, "source.txt", expected_blob=git_blob(raw),
                expected_bytes=len(raw),
                expected_sha256=hashlib.sha256(raw).hexdigest(),
            ),
        ) == raw
        expect_hold(
            module, repo, head,
            lambda: module._git_object(head, "keep/data.txt", expected_blob=git_blob(raw)),
        )
        expect_hold(module, repo, "0" * 40)
        def check_private_environment():
            with module._RepositorySnapshot(head) as view:
                environment = view._environment()
                for key, expected in {
                    "GIT_ALLOW_PROTOCOL": "", "GIT_NO_LAZY_FETCH": "1",
                    "GIT_OPTIONAL_LOCKS": "0", "GIT_NO_REPLACE_OBJECTS": "1",
                    "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
                    "GIT_CONFIG_NOSYSTEM": "1", "GIT_TERMINAL_PROMPT": "0",
                    "GIT_ATTR_NOSYSTEM": "1",
                }.items():
                    assert environment.get(key) == expected, key
                assert environment["GIT_DIR"] != str(repo / ".git")
                assert environment["GIT_INDEX_FILE"] == "/proc/self/fd/" + str(view.index_fd)
                assert fcntl.fcntl(view.index_fd, getattr(fcntl, "F_GET_SEALS", 1034)) & 15 == 15
        unchanged_call(module, repo, check_private_environment)

        # The local configuration is inert fixture data. Every named helper is a
        # nonexistent path; this proof never supplies or runs a helper program.
        helper_root = "/__void_fixture_nonexistent_helpers__"
        assert not Path(helper_root).exists()
        fixture_git(repo, "config", "core.fsmonitor", helper_root + "/fsmonitor")
        fixture_git(repo, "config", "core.hooksPath", helper_root + "/hooks")
        fixture_git(repo, "config", "filter.fixture.clean", helper_root + "/filter")
        fixture_git(repo, "config", "filter.fixture.required", "true")
        fixture_git(repo, "config", "include.path", helper_root + "/config")
        # An unsupported source-repository format would make ordinary Git
        # reads fail. Successful private reads demonstrate config isolation.
        fixture_git(repo, "config", "core.repositoryFormatVersion", "99")
        assert unchanged_call(
            module, repo, lambda: module.checkout_snapshot(head)
        ) == snapshot
        (repo / "source.txt").write_bytes(b"different raw source bytes\n")
        expect_hold(module, repo, head)

        repo, head, raw = create_repository(root, "clean-packed")
        fixture_git(repo, "repack", "-ad")
        fixture_git(repo, "prune-packed")
        fixture_git(repo, "pack-refs", "--all", "--prune")
        assert not (repo / ".git" / "refs" / "heads" / "main").exists()
        assert list((repo / ".git" / "objects" / "pack").glob("*.pack"))
        assert unchanged_call(
            module, repo, lambda: module.checkout_snapshot(head)
        )["clean"] is True
        assert unchanged_call(
            module, repo,
            lambda: module._git_object(head, "source.txt", expected_blob=git_blob(raw)),
        ) == raw

        for name, mutate in (
            ("dirty-worktree", lambda r: (r / "source.txt").write_bytes(b"dirty\n")),
            ("dirty-index", lambda r: (
                (r / "source.txt").write_bytes(b"staged\n"),
                fixture_git(r, "add", "source.txt"),
            )),
            ("untracked", lambda r: (r / "extra.txt").write_bytes(b"untracked\n")),
            ("assume-unchanged", lambda r: fixture_git(
                r, "update-index", "--assume-unchanged", "source.txt"
            )),
            ("skip-worktree", lambda r: fixture_git(
                r, "update-index", "--skip-worktree", "source.txt"
            )),
            ("executable-bit", lambda r: (r / "script.sh").chmod(0o644)),
            ("owner-executable-bit", lambda r: (r / "script.sh").chmod(0o655)),
            ("tracked-symlink", lambda r: (
                (r / "safe-link").unlink(),
                (r / "safe-link").symlink_to("keep/data.txt"),
            )),
        ):
            repo, head, _ = create_repository(root, name)
            mutate(repo)
            expect_hold(module, repo, head)

        repo, head, _ = create_repository(root, "split-index")
        fixture_git(repo, "update-index", "--split-index")
        shared = list((repo / ".git").glob("sharedindex.*"))
        assert shared, "split-index fixture did not create shared index"
        old_ns = 946684800000000000
        for path in shared:
            os.utime(path, ns=(old_ns, old_ns))
        expect_hold(module, repo, head)
        assert all(path.stat().st_mtime_ns == old_ns for path in shared)

        repo, head, _ = create_repository(root, "sparse-index")
        fixture_git(repo, "sparse-checkout", "init", "--cone", "--sparse-index")
        fixture_git(repo, "sparse-checkout", "set", "keep")
        expect_hold(module, repo, head)

        repo, head, raw = create_repository(root, "missing-blob")
        blob = git_blob(raw)
        (repo / ".git" / "objects" / blob[:2] / blob[2:]).unlink()
        expect_hold(
            module, repo, head,
            lambda: module._git_object(head, "source.txt", expected_blob=blob),
        )

        # Keep the filename/OID of an existing child tree while replacing its
        # valid compressed content. Index and worktree agree with the altered
        # listing, so flattening a tree without authenticating it is insufficient.
        repo, head, raw = create_repository(root, "corrupt-child-tree")
        tree_oid = fixture_git(repo, "rev-parse", head + ":keep").decode("ascii").strip()
        tree_raw = fixture_git(repo, "cat-file", "tree", tree_oid)
        old_entry = b"data.txt\0" + bytes.fromhex(git_blob(b"kept tree\n"))
        new_entry = b"data.txt\0" + bytes.fromhex(git_blob(raw))
        assert tree_raw.count(old_entry) == 1
        altered_tree = tree_raw.replace(old_entry, new_entry)
        (repo / "keep" / "data.txt").write_bytes(raw)
        fixture_git(repo, "add", "keep/data.txt")
        tree_file = repo / ".git" / "objects" / tree_oid[:2] / tree_oid[2:]
        tree_file.chmod(0o600)
        tree_file.write_bytes(zlib.compress(
            b"tree " + str(len(altered_tree)).encode("ascii") + b"\0" + altered_tree
        ))
        expect_hold(module, repo, head)

        # An ordinary temporary worktree file changes immediately after its
        # real hash/stat observation. This fault is injected by the harness;
        # the installer must detect it at the final generation recheck.
        repo, head, _ = create_repository(root, "changed-after-inspection")
        git_before = repository_state(repo / ".git")
        changed = []
        original_observe = module._RepositorySnapshot._worktree_file
        def observe_then_change(snapshot, relative, mode, expected):
            result = original_observe(snapshot, relative, mode, expected)
            if not changed:
                path = repo / os.fsdecode(relative)
                with path.open("ab") as output:
                    output.write(b"# fixture mutation after completed inspection\n")
                changed.append((path, expected))
            return result
        with patch.object(module, "FIXED_CHECKOUT", repo), patch.object(
            module._RepositorySnapshot, "_worktree_file", observe_then_change
        ):
            try:
                module.checkout_snapshot(head)
            except module.InstallError as exc:
                assert str(exc) == "checkout_worktree_changed", str(exc)
            else:
                raise AssertionError("earlier tracked-file generation drift accepted")
        assert len(changed) == 1
        assert git_blob(changed[0][0].read_bytes()) != changed[0][1]
        assert repository_state(repo / ".git") == git_before

        repo, head, _ = create_repository(root, "redirected-metadata")
        (repo / ".git").rename(root / "redirected-metadata-git")
        (repo / ".git").symlink_to(root / "redirected-metadata-git", target_is_directory=True)
        expect_hold(module, repo, head)


def prove_git_failure_boundaries(module) -> None:
    with tempfile.TemporaryDirectory(prefix="void-e2-installer-v3-io-proof-") as td:
        repo, head, _ = create_repository(Path(td), "repository")
        for method in ("_reference_snapshot", "_recheck"):
            for kind in (OSError, subprocess.SubprocessError, MemoryError):
                def fail(*args, kind=kind, **kwargs):
                    raise kind("inert fixture failure")
                with patch.object(module._RepositorySnapshot, method, fail):
                    reason = expect_hold(module, repo, head)
                assert reason == "repository_reader_resource_or_io_failed:" + kind.__name__, reason

        def cleanup_failure():
            with module._RepositorySnapshot(head) as view:
                original_cleanup = view._temporary.cleanup
                def finish_then_report_failure():
                    original_cleanup()
                    raise OSError("inert fixture cleanup error report")
                view._temporary.cleanup = finish_then_report_failure
        reason = expect_hold(module, repo, head, cleanup_failure)
        assert reason == "repository_private_cleanup_failed", reason


def run_final_receipt(module, operation) -> tuple[int, str]:
    output = io.StringIO()
    with patch.object(module, "main", operation), redirect_stdout(output):
        result = module.entrypoint()
    return result, output.getvalue()


def prove_canonical_terminal_scenarios() -> None:
    # Import only the exact reviewed canonical fixture implementation. Its
    # admitted source target is rebound to V3; no canonical file is modified.
    path = ROOT / CANONICAL_TERMINAL_REL
    assert git_blob(path.read_bytes()) == CANONICAL_TERMINAL_BLOB
    spec = importlib.util.spec_from_file_location("canonical_v2_terminal_fixture", path)
    assert spec is not None and spec.loader is not None
    terminal = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(terminal)
    terminal.V1 = ROOT / CANONICAL_V1_REL
    terminal.V2 = TARGET
    cases = (
        ("success", False),
        ("success", True),
        ("postpublication_failure", False),
        ("postpublication_failure", True),
        ("postpublication_fsync_failure", True),
        ("prepublication_failure", False),
        ("prepublication_failure", True),
        ("stage_substitution", False),
        ("stage_unknown_entry", False),
        ("stage_child_symlink", False),
        ("stage_open_failure", False),
        ("preexisting_stage", False),
    )
    for scenario, close_failure in cases:
        with tempfile.TemporaryDirectory(prefix="void-e2-inner-v3-terminal-") as td:
            fixture = terminal.Fixture(Path(td), scenario, close_failure)
            m = fixture.module
            if scenario == "preexisting_stage":
                m.STAGE_ROOT.mkdir(mode=0o755)
                (m.STAGE_ROOT / "unowned").write_bytes(b"preserve\n")
                fixture.before_failure_tree = terminal.tree(m.STAGE_ROOT)
            rc, lines = fixture.run()
            for line in (
                "launcher_execution=false", "native_execution=false",
                "binder_execution=false", "credential_access=false",
                "private_key_access=false", "signing=false",
                "transaction=false", "rpc_call=false", "funds_movement=false",
            ):
                assert line in lines, (scenario, line)

            published = scenario in (
                "success", "postpublication_failure", "postpublication_fsync_failure",
            )
            if published:
                assert fixture.renames == 1
                assert m.INSTALL_ROOT.is_dir() and not m.STAGE_ROOT.exists()
                for relative, raw in fixture.payload.items():
                    assert (m.INSTALL_ROOT / relative).read_bytes() == raw
                assert "publication=true" in lines and "publication=false" not in lines
                if scenario == "success" and not close_failure:
                    assert rc == 0 and "status=GREEN" in lines
                    assert "install_parent_close_completed=true" in lines
                else:
                    assert rc == 2 and "status=HOLD" in lines and "status=GREEN" not in lines
                    assert "receipt_boundary=FINAL_FAILURE_RECEIPT" in lines
                    assert "publication_state=published_needs_inspection" in lines
                    assert "post_publication_rollback=false" in lines
                    close_state = "false" if close_failure else "true"
                    assert "install_parent_close_completed=" + close_state in lines
                    if close_failure:
                        assert "close_failure_reason=fixture parent close failure" in lines
                    if scenario == "success":
                        assert "failure_phase=install_parent_close" in lines
                        assert "final_verification_completed=true" in lines
                    else:
                        assert "failure_phase=post_publication_verification" in lines
                        assert "final_verification_completed=false" in lines
                        expected_reason = (
                            "fixture postpublication verification failure"
                            if scenario == "postpublication_failure"
                            else "fixture published parent fsync failure"
                        )
                        assert "original_failure_reason=" + expected_reason in lines
                    fsync_state = "false" if scenario == "postpublication_fsync_failure" else "true"
                    assert "parent_fsync_completed=" + fsync_state in lines
            else:
                assert fixture.renames == 0 and not m.INSTALL_ROOT.exists()
                assert rc == 2 and "publication=false" in lines and "publication=true" not in lines
                if scenario == "prepublication_failure":
                    assert not m.STAGE_ROOT.exists()
                    assert "prepublication_cleanup_attempted=true" in lines
                    assert "prepublication_cleanup_green=true" in lines
                    if close_failure:
                        assert "reason=install_parent_close_failed_before_publication" in lines
                elif scenario == "preexisting_stage":
                    assert terminal.tree(m.STAGE_ROOT) == fixture.before_failure_tree
                    assert "prepublication_cleanup_attempted=false" in lines
                else:
                    assert m.STAGE_ROOT.is_dir()
                    assert "prepublication_cleanup_green=false" in lines
                    if scenario in ("stage_substitution", "stage_unknown_entry"):
                        assert terminal.tree(m.STAGE_ROOT) == fixture.before_failure_tree
                    elif scenario == "stage_child_symlink":
                        assert (m.STAGE_ROOT / m.BIN_DIR).is_symlink()
                        assert terminal.tree(fixture.root / "outside-bin") == fixture.before_failure_tree
                    if scenario == "stage_substitution":
                        for relative, raw in fixture.payload.items():
                            assert (fixture.root / "saved-created-stage" / relative).read_bytes() == raw



def prove_existing_target_not_replaced(module) -> None:
    with tempfile.TemporaryDirectory(prefix="void-e2-installer-v3-noreplace-proof-") as td:
        root = Path(td)
        (root / "stage").mkdir()
        (root / "occupied").mkdir()
        (root / "occupied" / "sentinel").write_bytes(b"existing generation\n")
        before = repository_state(root)
        fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC)
        try:
            try:
                module._renameat2(fd, "stage", "occupied", module.RENAME_NOREPLACE)
            except module.InstallError:
                pass
            else:
                raise AssertionError("RENAME_NOREPLACE replaced existing generation")
        finally:
            os.close(fd)
        assert repository_state(root) == before


def prove_plan_contract(module) -> None:
    checkout = {"head": "1" * 40, "tree": "2" * 40, "branch": "main", "clean": True}
    tool = {"path": "/fixture/tool", "sha256": "3" * 64, "bytes": 19}
    substitutions = {
        "accepted_lock": lambda *args: {},
        "_read_exact_candidate": lambda *args, **kwargs: b"inert candidate\n",
        "checkout_snapshot": lambda *args: checkout,
        "_tool_snapshot": lambda *args, **kwargs: tool,
        "python_snapshot": lambda: tool,
        "_git_object": lambda *args, **kwargs: b"inert source\n",
        "protected_state": lambda *args: module.READY_STATE,
    }
    with ExitStack() as stack:
        for name, value in substitutions.items():
            stack.enter_context(patch.object(module, name, value))
        plan = module.collect_plan(Path("/fixture/launcher"), Path("/fixture/native"), "1" * 40)
        assert plan["body"]["schema"] == (
            "void_buy_void_epoch2_dormant_binder_installer_first_entry_install_plan_v3"
        )
        assert plan["body"]["version"] == 3
        assert plan["body"]["temporary_git_metadata_write_required"] is True
        assert plan["body"]["git_boundary_policy"] == module.GIT_BOUNDARY_POLICY
        assert plan["body"]["repository_config_loaded"] is False
        assert plan["body"]["repository_callback_execution"] is False
        assert plan["body"]["source_object_fetch_authorized"] is False
        assert plan["plan_id"] == module.PLAN_PREFIX + module.sha256(module.canonical_json(plan["body"]))
        class FlushedOutput(io.StringIO):
            flush_count = 0
            def flush(self):
                self.flush_count += 1
                super().flush()
        out = FlushedOutput()
        def after_authority(*args):
            before = set(out.getvalue().splitlines())
            assert out.flush_count >= 1
            assert "authority_boundary=PRE_MUTATION" in before
            assert "temporary_git_metadata_write_authorized=true" in before
            assert "source_repository_mutation=false" in before
            assert "source_object_fetch=false" in before
            assert "protected_state_mutation=false" in before
            assert "filesystem_write_scope=temporary_private_git_metadata_only" in before
            return plan
        with redirect_stdout(out), patch.object(module, "collect_plan", after_authority):
            module.plan(Path("/fixture/launcher"), Path("/fixture/native"), "1" * 40)
        lines = set(out.getvalue().splitlines())
        assert "read_only=true" not in lines
        assert "filesystem_write=false" not in lines
        assert "source_repository_mutation=false" in lines
        assert "protected_state_mutation=false" in lines
        assert "temporary_git_metadata_mutation_performed=true" in lines
        assert "temporary_git_metadata_cleanup_completed=true" in lines
        def failed_collection(*args):
            raise module.InstallError("inert plan collection failure")
        with patch.object(module, "collect_plan", failed_collection):
            rc, failure_output = run_final_receipt(
                module,
                lambda: module.plan(Path("/fixture/launcher"), Path("/fixture/native"), "1" * 40),
            )
        assert rc == 2
        failure_lines = set(failure_output.splitlines())
        assert "status=HOLD" in failure_lines
        assert "temporary_git_metadata_mutation_performed=unknown" in failure_lines
        assert "temporary_git_metadata_cleanup_completed=unknown" in failure_lines
        assert "filesystem_write=false" not in failure_lines


def prove_confirmation_and_source_plan(module) -> None:
    # Any attempt to consult root privilege, context, candidates or protected
    # state before the confirmation would fail this test independently.
    os_view = SimpleNamespace(**vars(module.os))
    os_view.geteuid = lambda: (_ for _ in ()).throw(AssertionError("root read before confirmation"))
    denied = lambda *args, **kwargs: (_ for _ in ()).throw(AssertionError("input access before confirmation"))
    with patch.object(module, "os", os_view), patch.object(
        module, "collect_plan", denied
    ), patch.object(module, "_require_secure_apply_context", denied):
        rc, stdout = run_final_receipt(
            module,
            lambda: module.apply(
                Path("/fixture/never-read-launcher"), Path("/fixture/never-read-native"),
                "1" * 40, module.PLAN_PREFIX + "2" * 64, "WRONG_CONFIRM",
            ),
        )
    assert rc == 2
    lines = set(stdout.splitlines())
    for fact in (
        MARKER, "mode=apply", "authority_boundary=PRE_MUTATION",
        "filesystem_mutation_performed_at_pre_mutation_boundary=false",
        "status=HOLD", "reason=explicit_create_only_confirmation_required", "publication=false",
    ):
        assert fact in lines, (fact, stdout)
    # Execute the actual complete source through the same sealed-descriptor
    # path shape used by the native bootstrap. This inert mode must not derive
    # a repository root from __file__ or call host plan/apply.
    raw = TARGET.read_bytes()
    source_fd = os.memfd_create("void-inner-v3-source-plan-proof", os.MFD_ALLOW_SEALING)
    try:
        offset = 0
        while offset < len(raw):
            count = os.write(source_fd, raw[offset:])
            assert count > 0
            offset += count
        seals = 0x0001 | 0x0002 | 0x0004 | 0x0008
        fcntl.fcntl(source_fd, getattr(fcntl, "F_ADD_SEALS", 1033), seals)
        assert fcntl.fcntl(source_fd, getattr(fcntl, "F_GET_SEALS", 1034)) & seals == seals
        cp = subprocess.run(
            ["/usr/bin/python3", "-I", "-B", "/proc/self/fd/" + str(source_fd), "--source-plan"],
            pass_fds=(source_fd,), cwd="/tmp", stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            check=False, timeout=30,
            env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"},
        )
    finally:
        os.close(source_fd)
    assert cp.returncode == 0, cp.stderr
    lines = set(cp.stdout.splitlines())
    for fact in (
        MARKER, "mode=source-plan", "source_only=true", "host_read=false",
        "host_write=false", "create_only=true", "rename_noreplace_required=true",
        "launcher_execution_authorized=false", "native_execution_authorized=false",
        "binder_execution_authorized=false", "credential_access_authorized=false",
        "signing_authorized=false", "transaction_authorized=false",
        "rpc_call_authorized=false", "funds_movement_authorized=false",
    ):
        assert fact in lines, (fact, cp.stdout)


def main() -> None:
    raw = TARGET.read_bytes()
    assert git_blob(raw) == TARGET_BLOB, "installer source identity drift"
    assert git_blob((ROOT / LOCK_REL).read_bytes()) == LOCK_BLOB
    assert git_blob((ROOT / RUNTIME_INSTALLER_REL).read_bytes()) == RUNTIME_INSTALLER_BLOB
    assert git_blob((ROOT / CANONICAL_V1_REL).read_bytes()) == CANONICAL_V1_BLOB
    assert git_blob((ROOT / CANONICAL_V2_REL).read_bytes()) == CANONICAL_V2_BLOB
    source = raw.decode("utf-8")
    source_tree = ast.parse(source)
    spec = importlib.util.spec_from_file_location("void_e2_first_entry_install_v3", TARGET)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    predecessor_spec = importlib.util.spec_from_file_location(
        "canonical_inner_v2_lineage", ROOT / CANONICAL_V2_REL
    )
    assert predecessor_spec is not None and predecessor_spec.loader is not None
    predecessor = importlib.util.module_from_spec(predecessor_spec)
    predecessor_spec.loader.exec_module(predecessor)
    for name in (
        "LOCK_REL", "LOCK_GIT_BLOB_SHA1", "LOCK_ID", "CANDIDATE_ID",
        "LAUNCHER_BYTES", "LAUNCHER_SHA256", "NATIVE_BYTES", "NATIVE_SHA256",
        "RUNTIME_INSTALLER_REL", "RUNTIME_INSTALLER_GIT_BLOB_SHA1",
        "RUNTIME_INSTALLER_BYTES", "RUNTIME_INSTALLER_SHA256", "POLICY_SCHEMA",
        "INSTALL_PARENT", "INSTALL_NAME", "INSTALL_ROOT", "STAGE_NAME", "STAGE_ROOT",
        "LAUNCHER_TARGET", "POLICY_TARGET", "RUNTIME_INSTALLER_TARGET", "NATIVE_TARGET",
        "FIXED_GIT", "FIXED_PYTHON", "FIXED_CHECKOUT",
    ):
        assert getattr(module, name) == getattr(predecessor, name), name
    assert module.MARKER == MARKER
    assert module.CONFIRM_TOKEN == "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V3_CREATE_ONLY"
    assert module.PLAN_PREFIX == "voidbuye2dormantfirstentryinstall3_"
    assert module.INSTALL_ROOT == Path("/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1")
    assert module.POLICY_SCHEMA.endswith("FIRST_ENTRY_POLICY_V1")
    assert module.LOCK_GIT_BLOB_SHA1 == LOCK_BLOB
    assert module.RUNTIME_INSTALLER_GIT_BLOB_SHA1 == RUNTIME_INSTALLER_BLOB
    for forbidden in (
        "systemctl", "eth_sendRawTransaction", "eth_sendTransaction",
        "requests.", "urllib.request", "socket.",
    ):
        assert forbidden not in source, forbidden
    with redirect_stdout(io.StringIO()):
        module.self_test()
    prove_confirmation_and_source_plan(module)
    prove_existing_target_not_replaced(module)
    prove_canonical_terminal_scenarios()
    prove_plan_contract(module)
    prove_git_child_resource_limits(module, source_tree)
    prove_git_boundary(module)
    prove_git_failure_boundaries(module)
    print(MARKER + "_PROOF_GREEN")
    for fact in (
        "installer_source_blob_bound=true",
        "accepted_first_entry_lock_blob_bound=true",
        "runtime_installer_source_blob_bound=true",
        "wrong_confirmation_precedes_candidate_and_root_access=true",
        "canonical_terminal_fixture_blob_bound=true",
        "canonical_terminal_cases=12",
        "frozen_canonical_v1_and_v2_sources_preserved=true",
        "sealed_source_plan_import_green=true",
        "substituted_stage_generation_cleanup_refused=true",
        "post_publication_close_failure_receipt_truthful=true",
        "post_publication_original_and_close_failures_preserved=true",
        "unknown_symlink_and_unidentified_stage_cleanup_refused=true",
        "rename_noreplace_kernel_behavior_exercised=true",
        "existing_target_not_overwritten=true",
        "exact_runtime_namespace_bound=true",
        "v3_plan_schema_and_identity_bound=true",
        "plan_temporary_filesystem_scope_truthful=true",
        "clean_loose_and_packed_checkouts_accepted=true",
        "raw_worktree_index_and_head_equality_required=true",
        "unsupported_index_flags_hold=true",
        "split_index_source_mtime_unchanged=true",
        "missing_source_object_hold=true",
        "source_path_membership_required=true",
        "corrupt_child_tree_object_hold=true",
        "earlier_tracked_file_generation_drift_hold=true",
        "fixture_injected_worktree_change_detected=true",
        "inert_repository_configuration_ignored=true",
        "git_child_resource_limits_clamp_without_parent_mutation=true",
        "git_resource_io_and_cleanup_failures_hold=true",
        "plan_authority_flushed_before_collection=true",
        "failed_plan_temporary_mutation_scope_not_falsely_denied=true",
        "ordinary_reads_preserve_source_repository_bytes_and_metadata=true",
        "fixture_filesystem_write=true",
        "fixture_apply_exercised=true",
        "production_apply_executed=false",
        "production_host_evidence_authority=false",
        "launcher_execution=false", "native_execution=false", "binder_execution=false",
        "credential_access=false", "private_key_access=false", "signing=false",
        "transaction=false", "rpc_call=false", "funds_movement=false",
    ):
        print(fact)


if __name__ == "__main__":
    main()
