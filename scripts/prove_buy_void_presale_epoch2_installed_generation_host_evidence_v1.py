#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

MARKER = "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V1"
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py"
)
TARGET_BLOB = "190e25659caa5bf8a627e36a7e793d2a68ed4cad"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py"
)
QUALIFIER_BLOB = "a04c2e7665294cdd142426e9eb01ee27c5292b8d"
QUALIFIER_PROOF_REL = (
    "scripts/"
    "prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py"
)
QUALIFIER_PROOF_BLOB = "c14ec00acffbc55630aa68db0013d97cac068ab3"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_native_protected_install_v5.py"
)
INSTALLER_BLOB = "fd7a06490ccf6fb14831d8b0372a892e2764c9dc"
LOCK_REL = "ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json"
LOCK_BLOB = "bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b"

PARENT_PLAN_REL = "ops/security/buy-void-presale-host-evidence-collection-plan-v1.json"
PARENT_PLAN_BLOB = "ad68175e629fd1cf90180db3a904f84834314fdd"
PARENT_PLAN_ID = (
    "voidbuyhostevplan1_"
    "665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab"
)


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, (relative, git_blob(raw), expected)
    return raw


source = pin(TARGET_REL, TARGET_BLOB).decode("utf-8", "strict")
qualifier_source = pin(QUALIFIER_REL, QUALIFIER_BLOB).decode("utf-8", "strict")
qualifier_proof = pin(QUALIFIER_PROOF_REL, QUALIFIER_PROOF_BLOB).decode(
    "utf-8", "strict"
)
pin(PARENT_PLAN_REL, PARENT_PLAN_BLOB)
installer_source = pin(INSTALLER_REL, INSTALLER_BLOB).decode("utf-8", "strict")
pin(LOCK_REL, LOCK_BLOB)
assert 'INSTALLER_SOURCE_GIT_BLOB_SHA1 = "' + INSTALLER_BLOB + '"' in qualifier_source
assert 'LOCK_GIT_BLOB_SHA1 = "' + LOCK_BLOB + '"' in installer_source

compile(source, TARGET_REL, "exec", dont_inherit=True)

bootstrap_guard_index = source.index("import sys as _bootstrap_sys")
first_shadowable_import_index = source.index("import argparse")
assert bootstrap_guard_index >= 0
assert source.index("_bootstrap_sys.flags.isolated != 1") > bootstrap_guard_index
assert source.index("raise SystemExit(2)") < first_shadowable_import_index

for required in (
    'QUALIFIER_BLOB = "' + QUALIFIER_BLOB + '"',
    'QUALIFIER_PROOF_BLOB = "' + QUALIFIER_PROOF_BLOB + '"',
    'INSTALLER_BLOB = "' + INSTALLER_BLOB + '"',
    'LOCK_BLOB = "' + LOCK_BLOB + '"',
    "qualifier.collect(expected_head)",
    '"epoch2_installed_generation_qualified": True',
    '"protected_upgrade_verified": True',
    '"installed_generation_stable": True',
    '"retained_predecessor_verified": True',
    '"native_self_test_execution_performed": True',
    '"native_self_test_descriptor_bound": True',
    '"native_self_test_stable": True',
    '"filesystem_write_performed": False',
    '"runner_execution": False',
    '"live_composition_execution": False',
    '"credential_access": False',
    '"payment_acceptance": False',
    '"public_presale_activation": False',
    '"funds_movement": False',
    '"production_host_evidence_authority": False',
    "stat.S_ISREG(before.st_mode)",
    "stat.S_ISLNK(visible.st_mode)",
    "except (OSError, subprocess.TimeoutExpired) as exc:",
    '"git_execution_failed:" + type(exc).__name__',
    '"core.fsmonitor=false"',
    '"GIT_CONFIG_COUNT": "2"',
    '"GIT_CONFIG_KEY_0": "core.fsmonitor"',
    '"GIT_CONFIG_VALUE_0": "false"',
    '"GIT_CONFIG_KEY_1": "core.hooksPath"',
    '"GIT_CONFIG_VALUE_1": "/dev/null"',
    "sys.flags.isolated != 1",
    "import sys as _bootstrap_sys",
    "_bootstrap_sys.flags.isolated != 1",
    "reason=python_isolated_mode_required",
    "_BOOTSTRAP_NEGATIVE_AUTHORITY_FIELDS",
    "_guard_qualifier_installer_loader(module, expected_head)",
    "os.O_NOFOLLOW",
    "os.O_CLOEXEC",
    "os.O_NONBLOCK",
    "os.fstat(fd)",
    "os.read(fd",
):
    assert required in source, required

for forbidden in (
    "qualifier.main(",
    "qualifier.plan(",
    "RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3",
    "eth_sendRawTransaction",
    "os.O_WRONLY",
    "os.O_RDWR",
    "os.O_CREAT",
    "os.O_EXCL",
    "os.mkdir(",
    "os.rename(",
    "os.replace(",
    "os.remove(",
    ".unlink(",
    "systemctl",
    "/usr/bin/sudo",
    "sudo ",
    "socket.",
    "urllib",
    "requests",
    "before.is_file()",
    "before.is_symlink()",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
imports = [node for node in tree.body if isinstance(node, (ast.Import, ast.ImportFrom))]
assert isinstance(imports[0], ast.Import)
assert [(alias.name, alias.asname) for alias in imports[0].names] == [("sys", "_bootstrap_sys")]
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "_require_isolated_python",
    "_harden_installer_git_environment",
    "_guard_qualifier_installer_loader",
    "_load_verified_installer",
    "_guard_installer_git_queries",
    "_verify_checkout_bytes",
    "_read_visible_file",
    "_open_source_parent",
    "_git",
    "checkout_snapshot",
    "exact_git_object",
    "_read_visible_source_exact",
    "load_qualifier",
    "validate_result",
    "collect",
    "self_test",
):
    assert name in functions, name

run_calls: list[str] = []
for name, fn in functions.items():
    for node in ast.walk(fn):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "subprocess"
            and node.func.attr == "run"
        ):
            run_calls.append(name)
assert run_calls == ["_git"], run_calls

collect_source = ast.get_source_segment(source, functions["collect"]) or ""
assert "_require_isolated_python()" in collect_source
assert "os.geteuid() != 0" in collect_source
assert collect_source.index("_require_isolated_python()") < collect_source.index("os.geteuid() != 0")
assert "checkout_snapshot(expected_head)" in collect_source
assert "load_qualifier(expected_head)" in collect_source
assert "qualifier.collect(expected_head)" in collect_source
assert "qualifier.main" not in collect_source
assert "subprocess." not in collect_source

read_source = "\n".join(ast.get_source_segment(source, functions[name]) or "" for name in (
    "_read_visible_source_exact", "_read_visible_file"
))
for required in (
    "os.open(path.name, flags, dir_fd=parent_fd)",
    "os.fstat(fd)",
    "os.read(fd",
    "stat.S_ISREG(before.st_mode)",
    "follow_symlinks=False",
    "direct != expected",
):
    assert required in read_source, required
assert ".read_bytes()" not in read_source

load_source = ast.get_source_segment(source, functions["load_qualifier"]) or ""
assert "_read_visible_source_exact(visible, raw)" in load_source
assert ".read_bytes()" not in load_source
assert "_guard_qualifier_installer_loader(module, expected_head)" in load_source
assert load_source.index("_guard_qualifier_installer_loader(module, expected_head)") < load_source.index("return module")
installer_loader_source = ast.get_source_segment(source, functions["_load_verified_installer"]) or ""
assert installer_loader_source.index("_read_visible_source_exact(visible, raw)") < installer_loader_source.index("exec(compile(")
assert "installer._direct_repo_bytes = guarded_repository_bytes" in installer_loader_source
assert ".read_bytes()" not in installer_loader_source
guard_source = ast.get_source_segment(source, functions["_guard_qualifier_installer_loader"]) or ""
assert "original()" not in guard_source

validate_source = ast.get_source_segment(source, functions["validate_result"]) or ""
for required in (
    '"native_self_test_execution"',
    '"native_self_test_descriptor_bound"',
    '"native_self_test_stable"',
    '"runner_execution"',
    '"live_composition_execution"',
    '"credential_access"',
    '"payment_acceptance"',
    '"public_presale_activation"',
    '"funds_movement"',
    '"production_host_evidence_authority"',
):
    assert required in validate_source, required

# Bind the reviewed qualifier's own fail-closed execution model.
for required in (
    "before = _installed_snapshot(installer, expected_head)",
    'first_output, first_sha = _run_native_self_test(installer, before["native"])',
    "middle = _installed_snapshot(installer, expected_head)",
    'second_output, second_sha = _run_native_self_test(installer, middle["native"])',
    "after = _installed_snapshot(installer, expected_head)",
    'raise QualificationError("installed_generation_changed_during_qualification")',
    'raise QualificationError("native_self_test_output_changed")',
    '"runner_execution": False',
    '"live_composition_execution": False',
    '"credential_access": False',
    '"funds_movement": False',
):
    assert required in qualifier_source, required

for required in (
    "descriptor_bound_native_self_test_required=true",
    "pathname_swap_during_self_test_rejected=true",
    "retained_fd_executed_during_path_swap=true",
    "replacement_path_not_executed=true",
    "runner_execution=false",
    "live_composition_execution=false",
    "credential_access=false",
    "funds_movement=false",
):
    assert required in qualifier_proof, required

spec = importlib.util.spec_from_file_location(
    "void_presale_epoch2_host_evidence_v1",
    ROOT / TARGET_REL,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert module.PARENT_PLAN_ID == PARENT_PLAN_ID
assert module.PARENT_PLAN_ID == json.loads(
    pin(PARENT_PLAN_REL, PARENT_PLAN_BLOB).decode("utf-8", "strict")
)["plan_id"]

module._require_isolated_python()

fake_installer = module.types.ModuleType("fake_installer")
fake_installer.CLEAN_GIT_ENV = dict(module.EXPECTED_DELEGATED_INSTALLER_GIT_ENV)
hardened = module._harden_installer_git_environment(fake_installer)
delegated_env = dict(hardened.CLEAN_GIT_ENV)
assert delegated_env["HOME"] == "/nonexistent"
assert delegated_env["GIT_TERMINAL_PROMPT"] == "0"
assert delegated_env["GIT_ATTR_NOSYSTEM"] == "1"
assert delegated_env["GIT_CONFIG_COUNT"] == "2"
assert delegated_env["GIT_CONFIG_KEY_0"] == "core.fsmonitor"
assert delegated_env["GIT_CONFIG_VALUE_0"] == "false"
assert delegated_env["GIT_CONFIG_KEY_1"] == "core.hooksPath"
assert delegated_env["GIT_CONFIG_VALUE_1"] == "/dev/null"

def expect_source_hold(action, reason: str) -> None:
    try:
        action()
    except module.EvidenceError as exc:
        assert str(exc).startswith(reason), (str(exc), reason)
    else:
        raise AssertionError("source_adversary_accepted:" + reason)


with tempfile.TemporaryDirectory(prefix="void-epoch2-delegated-loader-proof-") as td:
    checkout = Path(td)
    installer_path = checkout / INSTALLER_REL
    lock_path = checkout / LOCK_REL
    installer_path.parent.mkdir(parents=True)
    lock_path.parent.mkdir(parents=True)
    # Synthetic module definitions only: no real installer/qualifier execution.
    fixture = (
        "from pathlib import Path\n"
        "ROOT = Path(__file__).resolve().parents[2]\n"
        "FIXED_CHECKOUT = ROOT\n"
        "MARKER = " + repr(module.EXPECTED_INSTALLER_MARKER) + "\n"
        "LOCK_REL = " + repr(LOCK_REL) + "\n"
        "LOCK_PATH = ROOT / LOCK_REL\n"
        "LOCK_GIT_BLOB_SHA1 = " + repr(LOCK_BLOB) + "\n"
        "NATIVE_SOURCE_REL = 'synthetic/native.c'\n"
        "RUNNER_SOURCE_REL = 'synthetic/runner.mjs'\n"
        "SEALED_V2_REL = 'synthetic/sealed.mjs'\n"
        "QUALIFIER_REL = 'synthetic/qualifier.py'\n"
        "CLEAN_GIT_ENV = " + repr(module.EXPECTED_DELEGATED_INSTALLER_GIT_ENV) + "\n"
        "def _direct_repo_bytes(path):\n"
        "    raise AssertionError('unsafe_original_repository_reader_called')\n"
        "def _run_git(args):\n"
        "    raise AssertionError('original_git_query_called')\n"
    ).encode()
    lock_bytes = b'{"synthetic_accepted_lock":true}\n'
    installer_path.write_bytes(fixture)
    lock_path.write_bytes(lock_bytes)
    saved_checkout, saved_exact = module.FIXED_CHECKOUT, module.exact_git_object
    looked_up = []

    def fixture_git_object(head, relative, blob):
        assert head == "a" * 40
        looked_up.append((relative, blob))
        if (relative, blob) == (INSTALLER_REL, INSTALLER_BLOB):
            return fixture
        assert (relative, blob) == (LOCK_REL, LOCK_BLOB)
        return lock_bytes

    def forbidden_original_loader():
        raise AssertionError("unsafe_original_installer_loader_called")

    try:
        module.FIXED_CHECKOUT = checkout
        module.exact_git_object = fixture_git_object
        fake_qualifier = module.types.ModuleType("fake_qualifier")
        fake_qualifier._load_installer = forbidden_original_loader
        fake_qualifier.INSTALLER_SOURCE = installer_path
        fake_qualifier.INSTALLER_SOURCE_GIT_BLOB_SHA1 = INSTALLER_BLOB
        module._guard_qualifier_installer_loader(fake_qualifier, "a" * 40)
        loaded = fake_qualifier._load_installer()
        assert loaded.CLEAN_GIT_ENV == delegated_env
        assert loaded._direct_repo_bytes(lock_path) == lock_bytes
        assert looked_up == [(INSTALLER_REL, INSTALLER_BLOB), (LOCK_REL, LOCK_BLOB)]
        lookups_before = len(looked_up)
        expect_source_hold(
            lambda: loaded._direct_repo_bytes(checkout / "unreviewed"),
            "installer_repository_path_not_allowed",
        )
        assert len(looked_up) == lookups_before

        for target, expected, read in (
            (installer_path, fixture, fake_qualifier._load_installer),
            (lock_path, lock_bytes, lambda: loaded._direct_repo_bytes(lock_path)),
        ):
            target.unlink()
            alternate = target.with_name("synthetic-sensitive-target")
            alternate.write_bytes(expected)
            target.symlink_to(alternate)
            expect_source_hold(read, "reviewed_source_unavailable")
            target.unlink()
            os.mkfifo(target, 0o600)
            expect_source_hold(read, "reviewed_source_metadata_invalid")
            target.unlink()
            target.write_bytes(b"x" * len(expected))
            expect_source_hold(read, "reviewed_source_bytes_mismatch")
            target.write_bytes(expected)

        fake_qualifier.INSTALLER_SOURCE_GIT_BLOB_SHA1 = "0" * 40
        expect_source_hold(
            lambda: module._guard_qualifier_installer_loader(fake_qualifier, "a" * 40),
            "qualifier_installer_binding_invalid",
        )
    finally:
        module.FIXED_CHECKOUT, module.exact_git_object = saved_checkout, saved_exact

with tempfile.TemporaryDirectory(prefix="void-epoch2-fsmonitor-proof-") as td:
    root = Path(td)
    subprocess.run(
        ["/usr/bin/git", "-C", str(root), "init", "-q"],
        check=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    marker = root / "fsmonitor-executed"
    helper = root / "fsmonitor-helper.sh"
    helper.write_text(
        "#!/bin/sh\nprintf executed > " + str(marker) + "\nexit 0\n",
        encoding="utf-8",
    )
    helper.chmod(0o755)
    subprocess.run(
        ["/usr/bin/git", "-C", str(root), "config", "core.fsmonitor", str(helper)],
        check=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    cp_git = subprocess.run(
        ["/usr/bin/git", "-C", str(root), "status", "--porcelain=v1"],
        env=delegated_env,
        check=False,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=20,
    )
    assert cp_git.returncode == 0, cp_git.stderr
    assert not marker.exists(), "delegated_local_fsmonitor_executed"

with tempfile.TemporaryDirectory(prefix="void-epoch2-clean-filter-proof-") as td:
    root = Path(td)
    checkout = root / "checkout"
    checkout.mkdir()

    def fixture_git(*args):
        return subprocess.run(
            ["/usr/bin/git", "-C", str(checkout), *args],
            env=module.GIT_ENV, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            check=True, timeout=20,
        ).stdout

    def fixture_index_mutation(*args):
        # Fixture setup must not run the hostile filter either.
        return fixture_git("-c", "filter.hostile.process=", "-c", "filter.hostile.clean=",
                           "-c", "filter.hostile.required=false", *args)

    fixture_git("init", "-q", "-b", "main")
    tracked = checkout / "tracked.txt"
    original = b"reviewed fixture\n"
    tracked.write_bytes(original)
    (checkout / "empty.txt").write_bytes(b"")
    fixture_git("add", "--", "tracked.txt", "empty.txt")
    fixture_git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
                "-c", "commit.gpgsign=false", "commit", "-qm", "fixture")
    expected_head = fixture_git("rev-parse", "HEAD").decode().strip()
    marker = root / "filter-executed"
    helper = root / "filter.sh"
    helper.write_text(
        "#!/bin/sh\nprintf executed >> " + str(marker) + "\ncat\n",
        encoding="utf-8",
    )
    helper.chmod(0o700)
    fixture_git("config", "filter.hostile.clean", str(helper))
    (checkout / ".git/info/attributes").write_text("* filter=hostile\n")
    st = tracked.stat()
    os.utime(tracked, ns=(st.st_atime_ns, st.st_mtime_ns + 2000000000))
    # Positive exploit control in this disposable fixture only.
    assert fixture_git("-c", "core.fsmonitor=false", "status", "--porcelain=v1") == b""
    assert marker.exists(), "clean_filter_exploit_control_did_not_execute"
    marker.unlink()

    saved_checkout = module.FIXED_CHECKOUT
    try:
        module.FIXED_CHECKOUT = checkout
        module._verify_checkout_bytes(expected_head)
        assert module.checkout_snapshot(expected_head)["clean"] is True
        assert not marker.exists(), "root_observation_executed_clean_filter"

        # Even a required long-running process filter is never entered.
        fixture_git("config", "filter.hostile.process", str(helper))
        fixture_git("config", "filter.hostile.required", "true")
        module._verify_checkout_bytes(expected_head)
        assert not marker.exists(), "root_observation_executed_process_filter"

        delegated = module.types.ModuleType("synthetic_git_delegate")
        for name, value in (
            ("LOCK_REL", LOCK_REL), ("NATIVE_SOURCE_REL", "native.c"),
            ("RUNNER_SOURCE_REL", "runner.mjs"), ("SEALED_V2_REL", "sealed.mjs"),
            ("QUALIFIER_REL", QUALIFIER_REL),
        ):
            setattr(delegated, name, value)
        original_calls = []
        def original_query(args):
            assert args[0] != "status", "delegated_original_status_called"
            original_calls.append(list(args))
            return expected_head + "\n"
        delegated._run_git = original_query
        module._guard_installer_git_queries(delegated, expected_head)
        assert delegated._run_git(list(module.STATUS_QUERY)) == ""
        assert original_calls == []
        assert delegated._run_git(["rev-parse", "--verify", "HEAD"]).strip() == expected_head
        assert original_calls == [["rev-parse", "--verify", "HEAD"]]
        expect_source_hold(lambda: delegated._run_git(["status"]), "delegated_git_query_not_allowed")
        expect_source_hold(lambda: module._git(list(module.STATUS_QUERY)), "git_query_not_allowed")
        assert not marker.exists(), "delegated_observation_executed_filter"

        # Raw equality cannot be hidden by filters, assume-unchanged, or skip-worktree.
        for flag in ("--assume-unchanged", "--skip-worktree"):
            fixture_index_mutation("update-index", flag, "--", "tracked.txt")
            tracked.write_bytes(b"x" * len(original))
            expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "checkout_worktree_bytes_mismatch")
            expect_source_hold(lambda: delegated._run_git(list(module.STATUS_QUERY)), "checkout_worktree_bytes_mismatch")
            tracked.write_bytes(original)
            fixture_index_mutation("read-tree", "HEAD")
        assert not marker.exists(), "dirty_observation_executed_filter"

        fixture_index_mutation("update-index", "--force-remove", "--", "tracked.txt")
        expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "checkout_index_differs_from_head")
        fixture_index_mutation("read-tree", "HEAD")
        extra = checkout / "untracked.txt"
        extra.write_text("fixture\n")
        expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "checkout_untracked_files")
        extra.unlink()
        tracked.chmod(0o755)
        expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "checkout_worktree_mode_mismatch")
        tracked.chmod(0o644)

        target = root / "synthetic-sensitive-target"
        target.write_bytes(original)
        tracked.unlink()
        tracked.symlink_to(target)
        expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "reviewed_source_unavailable")
        tracked.unlink()
        os.mkfifo(tracked, 0o600)
        expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "reviewed_source_metadata_invalid")
        tracked.unlink()
        tracked.write_bytes(original)
        module._verify_checkout_bytes(expected_head)
        assert not marker.exists()

        saved_git = module._git
        def malformed_tree(args):
            if args[0] == "ls-tree":
                return b"100644 blob " + b"a" * 40 + b" 1\t../escape\0"
            return saved_git(args)
        try:
            module._git = malformed_tree
            expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "checkout_path_invalid")
        finally:
            module._git = saved_git
    finally:
        module.FIXED_CHECKOUT = saved_checkout

with tempfile.TemporaryDirectory(prefix="void-epoch2-qualifier-fd-proof-") as td:
    root = Path(td)
    expected = b"print('reviewed qualifier')\n"

    regular = root / "qualifier.py"
    regular.write_bytes(expected)
    assert module._read_visible_source_exact(regular, expected) == expected

    sensitive = root / "sensitive-target"
    sensitive.write_bytes(expected)
    symlink = root / "qualifier-symlink.py"
    symlink.symlink_to(sensitive)
    try:
        module._read_visible_source_exact(symlink, expected)
    except module.EvidenceError as exc:
        assert str(exc) == "reviewed_source_unavailable"
    else:
        raise AssertionError("qualifier_symlink_followed")

    fifo = root / "qualifier-fifo.py"
    os.mkfifo(fifo, 0o600)
    try:
        module._read_visible_source_exact(fifo, expected)
    except module.EvidenceError as exc:
        assert str(exc) == "reviewed_source_metadata_invalid"
    else:
        raise AssertionError("qualifier_fifo_accepted")

    wrong = root / "qualifier-wrong.py"
    wrong.write_bytes(b"x" * len(expected))
    try:
        module._read_visible_source_exact(wrong, expected)
    except module.EvidenceError as exc:
        assert str(exc) == "reviewed_source_bytes_mismatch"
    else:
        raise AssertionError("qualifier_wrong_bytes_accepted")

    actual_parent = root / "actual-parent"
    actual_parent.mkdir()
    (actual_parent / "qualifier.py").write_bytes(expected)
    linked_parent = root / "linked-parent"
    linked_parent.symlink_to(actual_parent, target_is_directory=True)
    expect_source_hold(
        lambda: module._read_visible_source_exact(linked_parent / "qualifier.py", expected),
        "reviewed_source_unavailable",
    )

    # Replace the pathname only after the reader retains its FD. No replacement
    # contents may be consumed, and even an identical-byte replacement must HOLD.
    saved_read = module.os.read
    retained_bytes = []
    replaced = False
    def swap_after_open(fd, count):
        global replaced
        if not replaced:
            replacement = regular.with_name("replacement.py")
            replacement.write_bytes(expected)
            replacement.replace(regular)
            replaced = True
        chunk = saved_read(fd, count)
        retained_bytes.append(chunk)
        return chunk
    try:
        module.os.read = swap_after_open
        expect_source_hold(
            lambda: module._read_visible_source_exact(regular, expected),
            "reviewed_source_generation_unstable",
        )
    finally:
        module.os.read = saved_read

    regular.write_bytes(expected)
    read_counts = []
    def grow_after_open(fd, count):
        if not read_counts:
            with regular.open("ab") as handle:
                handle.write(b"x" * 128)
        read_counts.append(count)
        return saved_read(fd, count)
    try:
        module.os.read = grow_after_open
        expect_source_hold(
            lambda: module._read_visible_source_exact(regular, expected),
            "reviewed_source_size_changed",
        )
    finally:
        module.os.read = saved_read
    assert sum(read_counts) <= len(expected) + 1
    assert replaced and b"".join(retained_bytes) == expected

    # A symlink/FIFO must be rejected before any descriptor content read.
    def forbidden_source_read(*_args):
        raise AssertionError("special_file_contents_read")
    try:
        module.os.read = forbidden_source_read
        for target, reason in (
            (symlink, "reviewed_source_unavailable"),
            (fifo, "reviewed_source_metadata_invalid"),
        ):
            expect_source_hold(
                lambda target=target: module._read_visible_source_exact(target, expected),
                reason,
            )
    finally:
        module.os.read = saved_read

with tempfile.TemporaryDirectory(prefix="void-epoch2-shadow-import-proof-") as td:
    shadow_root = Path(td)
    shadow_wrapper = shadow_root / "collector.py"
    shadow_wrapper.write_text(source, encoding="utf-8")
    shadow_marker = shadow_root / "shadow-import-executed"
    for shadow_name in ("hashlib", "argparse"):
        (shadow_root / (shadow_name + ".py")).write_text(
            "open(" + repr(str(shadow_marker)) + ", 'w').write('executed')\n",
            encoding="utf-8",
        )
    future_marker = shadow_root / "future-import-executed"
    (shadow_root / "__future__.py").write_text(
        "open(" + repr(str(future_marker)) + ", 'w').write('executed')\n"
        "annotations = None\n",
        encoding="utf-8",
    )
    cp_unisolated = subprocess.run(
        [
            "/usr/bin/python3",
            "-B",
            str(shadow_wrapper),
            "--run",
            "--expected-head",
            "a" * 40,
        ],
        cwd=shadow_root,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert cp_unisolated.returncode == 2
    assert cp_unisolated.stderr == ""
    assert "status=HOLD" in cp_unisolated.stdout
    assert "reason=python_isolated_mode_required" in cp_unisolated.stdout
    assert "epoch2_installed_generation_qualified=false" in cp_unisolated.stdout
    assert "filesystem_write_performed=false" in cp_unisolated.stdout
    assert "network_contact=false" in cp_unisolated.stdout
    assert "funds_movement=false" in cp_unisolated.stdout
    assert not future_marker.exists(), "checkout_local_future_import_executed"
    assert not shadow_marker.exists(), "checkout_local_shadow_import_executed"

original_subprocess_run = module.subprocess.run

captured_git_commands: list[list[str]] = []

def _capture_git_command(args, **_kwargs):
    captured_git_commands.append(list(args))
    return subprocess.CompletedProcess(
        args=args,
        returncode=0,
        stdout=b"",
        stderr=b"",
    )

module.subprocess.run = _capture_git_command
assert module._git(["ls-files", "--stage", "-z"]) == b""
assert len(captured_git_commands) == 1
captured = captured_git_commands[0]
assert captured.count("core.fsmonitor=false") == 1
fsmonitor_index = captured.index("core.fsmonitor=false")
assert fsmonitor_index > 0
assert captured[fsmonitor_index - 1] == "-c"
assert captured.index("ls-files") > fsmonitor_index

def _raise_git_oserror(*_args, **_kwargs):
    raise OSError("synthetic_git_spawn_failure")

def _raise_git_timeout(*_args, **_kwargs):
    raise subprocess.TimeoutExpired(cmd=["/usr/bin/git"], timeout=20)

try:
    module.subprocess.run = _raise_git_oserror
    try:
        module._git(["rev-parse", "HEAD"])
    except module.EvidenceError as exc:
        assert str(exc) == "git_execution_failed:OSError"
    else:
        raise AssertionError("git_spawn_failure_not_normalized")

    module.subprocess.run = _raise_git_timeout
    try:
        module._git(["rev-parse", "HEAD"])
    except module.EvidenceError as exc:
        assert str(exc) == "git_execution_failed:TimeoutExpired"
    else:
        raise AssertionError("git_timeout_not_normalized")
finally:
    module.subprocess.run = original_subprocess_run

base = {
    "marker": "VOID_BUY_VOID_EPOCH2_NATIVE_INSTALLED_QUALIFICATION_V5",
    "version": 5,
    "read_only": True,
    "root_execution_required": True,
    "accepted_lock_id": "lock",
    "candidate_id": "candidate",
    "expected_head": "a" * 40,
    "protected_upgrade_verified": True,
    "installed_generation_stable": True,
    "predecessor_generation_retained": True,
    "predecessor_generation_stable": True,
    "node_generation_bound": True,
    "checkout_generation_bound": True,
    "git_generation_bound": True,
    "setpriv_generation_bound": True,
    "native_self_test_execution": True,
    "native_self_test_descriptor_bound": True,
    "native_self_test_stable": True,
    "native_self_test_sha256": "sha256:x",
    "native_sha256": "n",
    "native_bytes": 1,
    "runner_sha256": "r",
    "runner_bytes": 1,
    "policy_sha256": "p",
    "predecessor_native_sha256": "pn",
    "predecessor_native_bytes": 1,
    "predecessor_runner_sha256": "pr",
    "predecessor_runner_bytes": 1,
    "predecessor_policy_sha256": "pp",
    "predecessor_policy_bytes": 1,
    "node_sha256": "node",
    "node_bytes": 1,
    "runner_execution": False,
    "live_composition_execution": False,
    "credential_access": False,
    "private_key_access": False,
    "signing": False,
    "transaction": False,
    "payment_acceptance": False,
    "public_presale_activation": False,
    "wc_void_market_activation": False,
    "treasury_liquidity_action": False,
    "funds_movement": False,
    "production_host_evidence_authority": False,
    "next_action": "hold",
}
assert module.validate_result(dict(base), "a" * 40)["installed_generation_stable"] is True

for key in (
    "native_self_test_execution",
    "native_self_test_descriptor_bound",
    "installed_generation_stable",
):
    forged = dict(base)
    forged[key] = False
    try:
        module.validate_result(forged, "a" * 40)
    except module.EvidenceError:
        pass
    else:
        raise AssertionError("missing_required_true_accepted:" + key)

for key in (
    "runner_execution",
    "live_composition_execution",
    "credential_access",
    "payment_acceptance",
    "public_presale_activation",
    "funds_movement",
    "production_host_evidence_authority",
):
    forged = dict(base)
    forged[key] = True
    try:
        module.validate_result(forged, "a" * 40)
    except module.EvidenceError:
        pass
    else:
        raise AssertionError("authority_overclaim_accepted:" + key)

cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(ROOT / TARGET_REL), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert cp.returncode == 0, cp.stderr
assert cp.stderr == ""
for marker in (
    MARKER + "_SELF_TEST_GREEN",
    "parent_host_evidence_plan_bound=true",
    "exact_qualifier_source_and_proof_bound=true",
    "checkout_observation_avoids_content_filters=true",
    "delegated_original_status_bypassed=true",
    "raw_tree_index_worktree_equality_required=true",
    "root_required_for_future_run=true",
    "python_isolated_mode_required_for_future_run=true",
    "delegated_installer_git_fsmonitor_disabled=true",
    "delegated_installer_git_hooks_disabled=true",
    "delegated_installer_source_descriptor_bound=true",
    "delegated_installer_original_loader_bypassed=true",
    "delegated_accepted_lock_descriptor_bound=true",
    "reviewed_source_ancestor_symlinks_rejected=true",
    "unisolated_future_module_blocked=true",
    "installed_generation_before_middle_after_stability_required=true",
    "double_descriptor_bound_native_self_test_required=true",
    "native_self_test_execution_performed_by_future_host_run=true",
    "runner_execution=false",
    "live_composition_execution=false",
    "filesystem_write_performed=false",
    "service_mutation=false",
    "network_contact=false",
    "credential_access=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert marker in cp.stdout.splitlines(), marker

print(MARKER + "_PROOF_GREEN")
print("parent_host_evidence_plan_bound=true")
print("exact_v5_qualifier_source_bound=true")
print("exact_v5_qualifier_proof_bound=true")
print("delegates_only_to_qualifier_collect=true")
print("before_middle_after_generation_stability_inherited=true")
print("double_descriptor_bound_native_self_test_inherited=true")
print("pathname_swap_adversary_inherited=true")
print("required_true_field_downgrade_rejected=true")
print("authority_overclaim_rejected=true")
print("python_isolated_mode_enforced=true")
print("preimport_python_isolation_enforced=true")
print("qualifier_source_descriptor_bound=true")
print("qualifier_source_symlink_rejected_before_read=true")
print("qualifier_source_fifo_rejected_without_blocking=true")
print("qualifier_source_exact_bytes_required=true")
print("unisolated_shadow_module_blocked=true")
print("unisolated_future_module_blocked=true")
print("delegated_installer_source_descriptor_bound=true")
print("delegated_installer_original_loader_bypassed=true")
print("delegated_installer_symlink_fifo_rejected=true")
print("delegated_accepted_lock_descriptor_bound=true")
print("delegated_accepted_lock_symlink_fifo_rejected=true")
print("delegated_repository_path_allowlist_enforced=true")
print("reviewed_source_ancestor_symlinks_rejected=true")
print("reviewed_source_path_swap_rejected=true")
print("reviewed_source_growth_bounded=true")
print("delegated_installer_git_fsmonitor_disabled=true")
print("delegated_installer_git_hooks_disabled=true")
print("delegated_local_fsmonitor_execution_rejected=true")
print("git_fsmonitor_disabled=true")
print("git_spawn_failure_maps_to_hold=true")
print("git_timeout_maps_to_hold=true")
print("clean_filter_exploit_control_reproduced=true")
print("root_checkout_clean_process_filters_not_executed=true")
print("delegated_checkout_clean_process_filters_not_executed=true")
print("delegated_original_status_bypassed=true")
print("raw_worktree_bytes_and_executable_mode_required=true")
print("index_and_untracked_changes_rejected=true")
print("assume_unchanged_skip_worktree_cannot_hide_changes=true")
print("filesystem_write_performed=false")
print("runner_execution=false")
print("live_composition_execution=false")
print("service_mutation=false")
print("network_contact=false")
print("credential_access=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
