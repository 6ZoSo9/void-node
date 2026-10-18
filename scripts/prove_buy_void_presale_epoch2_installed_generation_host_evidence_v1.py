#!/usr/bin/env python3
from __future__ import annotations

import ast
import ctypes
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
assert set(sys.argv[1:]) <= {"--require-kernel-uid-drop"}
REQUIRE_KERNEL_UID_DROP = "--require-kernel-uid-drop" in sys.argv[1:]


def mapped_id(kind: str, value: int) -> bool:
    return any(
        int(parts[0]) <= value < int(parts[0]) + int(parts[2])
        for line in Path("/proc/self/" + kind + "_map").read_text().splitlines()
        if len(parts := line.split()) == 3
    )


KERNEL_UID_DROP_AVAILABLE = os.geteuid() == 0 and mapped_id("uid", 1000) and mapped_id("gid", 1000)
libc = ctypes.CDLL(None, use_errno=True)
libc.syscall.restype = ctypes.c_long
LANDLOCK_AVAILABLE = os.uname().machine == "x86_64" and libc.syscall(444, 0, 0, 1) >= 3
KERNEL_READ_BOUNDARY_EXECUTED = KERNEL_UID_DROP_AVAILABLE and LANDLOCK_AVAILABLE
if REQUIRE_KERNEL_UID_DROP:
    assert KERNEL_UID_DROP_AVAILABLE, "required_kernel_uid_drop_fixture_unavailable"
    assert LANDLOCK_AVAILABLE, "required_landlock_fixture_unavailable"

MARKER = "VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V1"
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_presale_epoch2_installed_generation_host_evidence_v1.py"
)
TARGET_BLOB = "a8a8654bca0b789bc07b03e078a357ca2b7eb933"

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
    '"--exclude-standard"',
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
compile(module.GIT_READ_SANDBOX, "git_read_sandbox", "exec", dont_inherit=True)
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
            ["/usr/bin/git", "-C", str(checkout), "-c", "safe.directory=" + str(checkout), *args],
            env=module.GIT_ENV, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            check=True, timeout=20,
        ).stdout

    def fixture_index_mutation(*args):
        # Fixture setup must not run the hostile filter either.
        return fixture_git("-c", "core.excludesFile=/dev/null",
                           "-c", "filter.hostile.process=", "-c", "filter.hostile.clean=",
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

    excludes_fifo = root / "synthetic-user-excludes"
    os.mkfifo(excludes_fifo, 0o600)
    fixture_git("config", "core.excludesFile", str(excludes_fifo))
    try:
        subprocess.run(
            ["/usr/bin/git", "-C", str(checkout), "-c", "safe.directory=" + str(checkout),
             "ls-files", "--others", "--exclude-standard", "-z"],
            env=module.GIT_ENV, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=0.25, check=True,
        )
    except subprocess.TimeoutExpired:
        pass
    else:
        raise AssertionError("configured_excludes_fifo_control_did_not_block")

    saved_checkout = module.FIXED_CHECKOUT
    saved_uid, saved_gid = module.RUNTIME_UID, module.RUNTIME_GID
    saved_fixture_geteuid = module.os.geteuid
    saved_sandbox = module.GIT_READ_SANDBOX
    if not LANDLOCK_AVAILABLE:
        # Disposable Git fixture only; runtime has no unsupported-kernel fallback.
        # Hosted CI requires Landlock above and cannot enter this test branch.
        module.GIT_READ_SANDBOX = "import json,os,sys; a=json.loads(sys.argv[1])['argv']; os.execve(a[0],a,os.environ)"
    if KERNEL_UID_DROP_AVAILABLE:
        # Only the disposable repository/marker fixture is handed to UID 1000.
        for fixture_path in (root, *root.rglob("*")):
            os.chown(fixture_path, module.RUNTIME_UID, module.RUNTIME_GID)
    elif os.geteuid() != 0:
        module.RUNTIME_UID, module.RUNTIME_GID = os.geteuid(), os.getegid()
    else:
        # Root-only user namespaces cannot map UID 1000 or call setgroups.
        # These fixtures still test raw-byte/filter behavior; CI separately
        # requires actual kernel demotion and cannot take this fallback.
        module.os.geteuid = lambda: module.RUNTIME_UID
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
            original_calls.append(list(args))
            raise AssertionError("delegated_original_git_called")
        delegated._run_git = original_query
        module._guard_installer_git_queries(delegated, expected_head)
        assert delegated._run_git(list(module.STATUS_QUERY)) == ""
        assert original_calls == []
        assert delegated._run_git(["rev-parse", "--verify", "HEAD"]).strip() == expected_head
        assert delegated._run_git(["branch", "--show-current"]).strip() == "main"
        assert original_calls == []
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
        alternate = root / "alternate-worktree"
        alternate.mkdir()
        fixture_git("config", "core.worktree", str(alternate))
        # The unbound old query misses this real checkout's untracked file.
        assert fixture_git("ls-files", "--others", "--full-name", "-z") == b""
        expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "checkout_untracked_files")
        expect_source_hold(lambda: delegated._run_git(list(module.STATUS_QUERY)), "checkout_untracked_files")
        fixture_git("config", "--unset", "core.worktree")
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

        local_excludes_fifo = root / "synthetic-local-excludes"
        os.mkfifo(local_excludes_fifo, 0o600)
        if KERNEL_UID_DROP_AVAILABLE:
            os.chown(local_excludes_fifo, module.RUNTIME_UID, module.RUNTIME_GID)
        local_excludes = checkout / ".git/info/exclude"
        local_excludes.unlink()
        local_excludes.symlink_to(local_excludes_fifo)
        try:
            subprocess.run(
                ["/usr/bin/git", "-C", str(checkout), "-c", "safe.directory=" + str(checkout),
                 "-c", "core.excludesFile=/dev/null", "ls-files", "--others", "--exclude-standard", "-z"],
                env=module.GIT_ENV, stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=0.25, check=True,
            )
        except subprocess.TimeoutExpired:
            pass
        else:
            raise AssertionError("local_excludes_fifo_control_did_not_block")
        module._verify_checkout_bytes(expected_head)
        assert delegated._run_git(list(module.STATUS_QUERY)) == ""

        local_excludes.unlink()
        local_excludes.write_text("ignored-fixture.log\n")
        ignored = checkout / "ignored-fixture.log"
        ignored.write_text("synthetic ignored data\n")
        expect_source_hold(lambda: module._verify_checkout_bytes(expected_head), "checkout_untracked_files")
        expect_source_hold(lambda: delegated._run_git(list(module.STATUS_QUERY)), "checkout_untracked_files")
        ignored.unlink()
    finally:
        module.FIXED_CHECKOUT = saved_checkout
        module.RUNTIME_UID, module.RUNTIME_GID = saved_uid, saved_gid
        module.os.geteuid = saved_fixture_geteuid
        module.GIT_READ_SANDBOX = saved_sandbox

if KERNEL_READ_BOUNDARY_EXECUTED:
    with tempfile.TemporaryDirectory(prefix="void-epoch2-root-git-include-proof-") as td:
        root = Path(td)
        checkout = root / "checkout"
        checkout.mkdir()
        subprocess.run(["/usr/bin/git", "-C", str(checkout), "init", "-q", "-b", "main"],
                       env=module.GIT_ENV, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        fifo = root / "root-only-include"
        os.mkfifo(fifo, 0o600)
        user_fifo = root / "query-uid-include"
        os.mkfifo(user_fifo, 0o600)
        os.chown(user_fifo, 1000, 1000)
        config = checkout / ".git/config"
        original_config = config.read_text()
        config.write_text(original_config + "\n[include]\npath = " + str(fifo) + "\n")
        for fixture_path in (root, *checkout.rglob("*"), checkout):
            os.chown(fixture_path, 1000, 1000)
        # A root Git query really opens the synthetic root-only FIFO and stalls.
        try:
            subprocess.run(["/usr/bin/git", "-C", str(checkout), "-c",
                            "safe.directory=" + str(checkout), "-c", "core.fsmonitor=false",
                            "rev-parse", "--is-inside-work-tree"], env=module.GIT_ENV,
                           stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE, timeout=0.25, check=False)
        except subprocess.TimeoutExpired:
            pass
        else:
            raise AssertionError("root_config_fifo_exploit_control_did_not_block")
        saved_checkout, saved_git_path = module.FIXED_CHECKOUT, module.FIXED_GIT
        try:
            module.FIXED_CHECKOUT = checkout
            # The repaired Git cannot open the root-owned mode-0600 FIFO. Git
            # may either reject an unreadable include or ignore it, by version.
            try:
                result = module._git(["rev-parse", "--is-inside-work-tree"])
            except module.EvidenceError as exc:
                assert str(exc).startswith("git_command_failed:"), str(exc)
            else:
                assert result == b"true\n"

            config.write_text(original_config + "\n[include]\npath = " + str(user_fifo) + "\n")
            # The same demoted identity can open this FIFO without Landlock.
            # No credentials or non-fixture files are used in the control.
            try:
                subprocess.run(
                    ["/usr/bin/setpriv", "--no-new-privs", "--reuid=1000", "--regid=1000",
                     "--clear-groups", "--inh-caps=-all", "--ambient-caps=-all", "--bounding-set=-all",
                     "/usr/bin/git", "--git-dir=" + str(checkout / ".git"),
                     "--work-tree=" + str(checkout), "-c", "safe.directory=" + str(checkout),
                     "rev-parse", "--is-inside-work-tree"], env=module.GIT_ENV,
                    stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                    timeout=0.25, check=False,
                )
            except subprocess.TimeoutExpired:
                pass
            else:
                raise AssertionError("query_uid_config_fifo_control_did_not_block")
            for query in (["rev-parse", "--is-inside-work-tree"], ["rev-parse", "--verify", "HEAD"]):
                try:
                    module._git(query)
                except module.EvidenceError as exc:
                    assert str(exc).startswith("git_command_failed:"), str(exc)
            delegated = module.types.ModuleType("synthetic_confined_delegate")
            for name in ("LOCK_REL", "NATIVE_SOURCE_REL", "RUNNER_SOURCE_REL", "SEALED_V2_REL", "QUALIFIER_REL"):
                setattr(delegated, name, "fixture")
            delegated._run_git = lambda _args: (_ for _ in ()).throw(AssertionError("unsandboxed_delegate"))
            module._guard_installer_git_queries(delegated, "a" * 40)
            try:
                delegated._run_git(["rev-parse", "--verify", "HEAD"])
            except module.EvidenceError as exc:
                assert str(exc).startswith("git_command_failed:"), str(exc)

            probe = root / "git-identity-probe.py"
            probe.write_text(
                "#!/usr/bin/python3 -I\n"
                "import json,os\n"
                "from pathlib import Path\n"
                "status=dict(line.split(':',1) for line in Path('/proc/self/status').read_text().splitlines() if ':' in line)\n"
                "denied=False\n"
                "try:\n"
                "    fd=os.open(" + repr(str(fifo)) + ",os.O_RDONLY|os.O_NONBLOCK)\n"
                "except PermissionError:\n"
                "    denied=True\n"
                "else:\n"
                "    os.close(fd)\n"
                "user_denied=False\n"
                "try:\n"
                "    fd=os.open(" + repr(str(user_fifo)) + ",os.O_RDONLY|os.O_NONBLOCK)\n"
                "except PermissionError:\n"
                "    user_denied=True\n"
                "else:\n"
                "    os.close(fd)\n"
                "print(json.dumps({'uid':os.getuid(),'euid':os.geteuid(),'gid':os.getgid(),'egid':os.getegid(),'groups':os.getgroups(),'nnp':int(status['NoNewPrivs']), 'caps':[int(status[k],16) for k in ('CapInh','CapPrm','CapEff','CapBnd','CapAmb')], 'root_only_include_denied':denied, 'query_uid_include_denied':user_denied}))\n"
            )
            probe.chmod(0o755)
            module.FIXED_GIT = probe
            identity = json.loads(module._git(["rev-parse", "HEAD"]))
            assert identity == {"uid":1000,"euid":1000,"gid":1000,"egid":1000,
                                "groups":[],"nnp":1,"caps":[0,0,0,0,0],
                                "root_only_include_denied":True,
                                "query_uid_include_denied":True}, identity
            # Inode allowlists reject metadata symlinks/hardlinks before Git.
            config.write_text(original_config)
            for link_kind in ("symlink", "hardlink"):
                outside = root / (link_kind + "-outside-fixture")
                outside.write_text("synthetic data only\n")
                os.chown(outside, 1000, 1000)
                metadata = checkout / ".git/objects/unsafe-fixture"
                if link_kind == "symlink":
                    metadata.symlink_to(outside)
                else:
                    os.link(outside, metadata)
                expect_source_hold(lambda: module._git(["rev-parse", "HEAD"]),
                                   "git_command_failed:125:git_read_boundary_failed\n")
                metadata.unlink()

            saved_sandbox = module.GIT_READ_SANDBOX
            try:
                for guarded_line in ("abi = libc.syscall(444, 0, 0, 1)",
                                     "if libc.syscall(446, rules_fd, 0) != 0:"):
                    replacement = "abi = -1" if guarded_line.startswith("abi") else "if True:"
                    assert module.GIT_READ_SANDBOX.count(guarded_line) == 1
                    module.GIT_READ_SANDBOX = saved_sandbox.replace(guarded_line, replacement)
                    expect_source_hold(lambda: module._git(["rev-parse", "HEAD"]),
                                       "git_command_failed:125:git_read_boundary_failed\n")
                    module.GIT_READ_SANDBOX = saved_sandbox
            finally:
                module.GIT_READ_SANDBOX = saved_sandbox
        finally:
            module.FIXED_CHECKOUT, module.FIXED_GIT = saved_checkout, saved_git_path

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
original_geteuid = module.os.geteuid

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
module.os.geteuid = lambda: 0
assert module._git(["ls-files", "--stage", "-z"]) == b""
assert len(captured_git_commands) == 1
captured = captured_git_commands[0]
assert captured[:8] == [
    "/usr/bin/setpriv", "--no-new-privs", "--reuid=1000", "--regid=1000",
    "--clear-groups", "--inh-caps=-all", "--ambient-caps=-all", "--bounding-set=-all",
]
assert captured[8:12] == ["/usr/bin/python3", "-I", "-B", "-c"]
assert captured[12] == module.GIT_READ_SANDBOX
request = json.loads(captured[13])
assert request["checkout"] == str(module.FIXED_CHECKOUT)
captured = request["argv"]
assert captured[0] == "/usr/bin/git"
assert "--git-dir=" + str(module.FIXED_CHECKOUT / ".git") in captured
assert "--work-tree=" + str(module.FIXED_CHECKOUT) in captured
assert captured.count("core.fsmonitor=false") == 1
fsmonitor_index = captured.index("core.fsmonitor=false")
assert fsmonitor_index > 0
assert captured[fsmonitor_index - 1] == "-c"
assert captured.index("ls-files") > fsmonitor_index
assert captured.count("core.excludesFile=/dev/null") == 1
assert captured.index("core.excludesFile=/dev/null") < captured.index("ls-files")
module.os.geteuid = lambda: 1000
module._git(["rev-parse", "HEAD"])
assert captured_git_commands[-1][:4] == ["/usr/bin/python3", "-I", "-B", "-c"]
module.os.geteuid = lambda: 1001
expect_source_hold(lambda: module._git(["rev-parse", "HEAD"]), "checkout_query_uid_invalid")
assert len(captured_git_commands) == 2
module.os.geteuid = lambda: 0

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
    module.os.geteuid = original_geteuid

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
    "git_metadata_queries_drop_root_privileges=true",
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
print("root_git_query_uid_gid_and_capability_drop_required=true")
print("unexpected_query_uid_rejected=true")
print("configured_excludes_fifo_control_reproduced=true")
print("configured_global_excludes_file_bypassed=true")
print("local_excludes_fifo_control_reproduced=true")
print("repository_local_excludes_not_read=true")
print("ignored_untracked_files_rejected=true")
print("configured_worktree_cannot_redirect_observation=true")
print("delegated_original_metadata_queries_bypassed=true")
print("kernel_git_uid_drop_executed=" + str(KERNEL_READ_BOUNDARY_EXECUTED).lower())
print("root_only_git_config_include_denied=" + str(KERNEL_READ_BOUNDARY_EXECUTED).lower())
print("kernel_git_read_boundary_executed=" + str(KERNEL_READ_BOUNDARY_EXECUTED).lower())
print("query_uid_config_include_denied=" + str(KERNEL_READ_BOUNDARY_EXECUTED).lower())
print("kernel_metadata_links_and_sandbox_failures_hold=" + str(KERNEL_READ_BOUNDARY_EXECUTED).lower())
print("filesystem_write_performed=false")
print("runner_execution=false")
print("live_composition_execution=false")
print("service_mutation=false")
print("network_contact=false")
print("credential_access=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
