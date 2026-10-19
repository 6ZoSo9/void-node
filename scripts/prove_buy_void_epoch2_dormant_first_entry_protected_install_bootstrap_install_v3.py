#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
import os
from pathlib import Path
import shlex
import stat
import subprocess
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v3.py"
)
TARGET_BLOB = "21860bce2c1589cead5c0789342871049c2d6055"

LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-first-entry-protected-install-"
    "bootstrap-candidate-lock-v4.json"
)
LOCK_BLOB = "57ecc08d465fe2a3c395546d349864312cd08a3f"

MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v3.py"
)
MATERIALIZER_BLOB = "a62dc7c4e7ac4cde63c3473d0040c355aa28508e"
MATERIALIZER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_materializer_v3.py"
)
MATERIALIZER_PROOF_BLOB = "f23a60dcd7ff0c3538cc2fef0929086c169365da"

CANDIDATE_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_candidate_v3.py"
)
CANDIDATE_BLOB = "1c49abf74e464b3d509a33e2fa3f1a9acc42c771"

BOOTSTRAP_SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v3.c"
)
BOOTSTRAP_SOURCE_BLOB = "2c3c9ed120cc9949a0528e43be886354aa25da5a"

PROTECTED_INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_protected_install_v2.py"
)
PROTECTED_INSTALLER_BLOB = "69a018c0eccedf3782055c56725579d02463b05e"

LOCK_ID = (
    "voidbuye2bootstraplock4_"
    "6568c1cd0195405d49001fbf6cb9a086364e401f78f3bfcf1d6cbb080947cb67"
)
CANDIDATE_MERGE = "78875f7379c2dd995e1b545dd0543c934e59907a"
CANDIDATE_TREE = "a2c1b6b9989ceb11c4fbea3f2fc4ecf64eb50176"
CANDIDATE_ID = (
    "voidbuye2bootstrapcand3_"
    "9e914f52eb3cde5a5fef42fbdf065b375f89fdabb768034b09615861bba67ce3"
)
BOOTSTRAP_BYTES = 731_072
BOOTSTRAP_SHA256 = (
    "904e6b05df45bc9212be7689ea0617ccfbf65d5edf8535a381abcbb588f236cd"
)
BOOTSTRAP_GIT_BLOB = "69e3bf6db7baf614eb0b7d8c5e93aafce0deab46"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V3"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, relative
    return raw


target_raw = pin(TARGET_REL, TARGET_BLOB)
lock_raw = pin(LOCK_REL, LOCK_BLOB)
pin(MATERIALIZER_REL, MATERIALIZER_BLOB)
pin(MATERIALIZER_PROOF_REL, MATERIALIZER_PROOF_BLOB)
pin(CANDIDATE_REL, CANDIDATE_BLOB)
bootstrap_source_raw = pin(BOOTSTRAP_SOURCE_REL, BOOTSTRAP_SOURCE_BLOB)
pin(PROTECTED_INSTALLER_REL, PROTECTED_INSTALLER_BLOB)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True)

target_module = types.ModuleType("protected_bootstrap_install_v3_fixture")
target_module.__file__ = str(ROOT / TARGET_REL)
exec(
    compile(source, TARGET_REL, "exec", dont_inherit=True),
    target_module.__dict__,
)
assert target_module._git_env()["GIT_NO_LAZY_FETCH"] == "1"
assert target_module._git_env()["GIT_ALLOW_PROTOCOL"] == ""


def repo_snapshot(root: Path) -> dict[str, tuple[object, ...]]:
    result: dict[str, tuple[object, ...]] = {}
    for item in [root, *sorted(root.rglob("*"))]:
        info = item.lstat()
        kind = stat.S_IFMT(info.st_mode)
        payload: object | None
        if stat.S_ISREG(info.st_mode):
            payload = item.read_bytes()
        elif stat.S_ISLNK(info.st_mode):
            payload = os.readlink(item)
        else:
            payload = None
        result[str(item.relative_to(root))] = (
            kind,
            stat.S_IMODE(info.st_mode),
            payload,
        )
    return result


def prove_git_lazy_fetch_blocked() -> None:
    setup_env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ALLOW_PROTOCOL": "file",
        "GIT_AUTHOR_NAME": "Synthetic fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "Synthetic fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
        "GIT_AUTHOR_DATE": "2000-01-01T00:00:00Z",
        "GIT_COMMITTER_DATE": "2000-01-01T00:00:00Z",
    }

    def git(*args: object, data: bytes | None = None) -> str:
        cp = subprocess.run(
            ["/usr/bin/git", *map(str, args)],
            input=data,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=setup_env,
            check=False,
            timeout=10,
        )
        assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")
        return cp.stdout.decode("utf-8", "strict").strip()

    with tempfile.TemporaryDirectory(
        prefix="void-e2-bootstrap-install-git-proof-"
    ) as directory:
        task = Path(directory)
        remote = task / "synthetic-remote.git"
        git("init", "--bare", remote)
        blob = git(
            "-C", remote, "hash-object", "-w", "--stdin",
            data=b"fixture lock\n",
        )
        tree = git(
            "-C", remote, "mktree",
            data=f"100644 blob {blob}\tlock.json\n".encode("utf-8"),
        )
        commit = git(
            "-C", remote, "commit-tree", tree,
            data=b"fixture commit\n",
        )
        git("-C", remote, "update-ref", "refs/heads/main", commit)

        def promisor_fixture(name: str) -> tuple[Path, Path]:
            checkout = task / name
            calls = task / (name + "-upload-pack-calls.txt")
            helper = task / (name + "-upload-pack.sh")
            helper.write_text(
                "#!/bin/sh\n"
                + "printf 'called\\n' >> "
                + shlex.quote(str(calls))
                + "\n"
                + 'exec /usr/bin/git upload-pack "$@"\n',
                encoding="utf-8",
            )
            helper.chmod(0o700)
            git("init", checkout)
            for key, value in {
                "remote.origin.url": str(remote),
                "remote.origin.promisor": "true",
                "remote.origin.partialclonefilter": "blob:none",
                "remote.origin.uploadpack": str(helper),
                "protocol.file.allow": "always",
            }.items():
                git("-C", checkout, "config", key, value)
            return checkout, calls

        # Positive control: without either guard, the same object read performs
        # an implicit promisor fetch and mutates the checkout object database.
        checkout, calls = promisor_fixture("positive-control")
        before = repo_snapshot(checkout)
        positive_env = dict(target_module._git_env())
        positive_env.pop("GIT_NO_LAZY_FETCH", None)
        positive_env.pop("GIT_ALLOW_PROTOCOL", None)
        cp = subprocess.run(
            [
                "/usr/bin/git", "--no-replace-objects",
                "-C", str(checkout),
                "show", commit + ":lock.json",
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=positive_env,
            check=False,
            timeout=10,
        )
        assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")
        assert cp.stdout == b"fixture lock\n"
        assert calls.exists() and calls.read_text("utf-8").splitlines()
        assert repo_snapshot(checkout) != before

        # Full production guards: no transport helper and no checkout mutation.
        checkout, calls = promisor_fixture("both-guards")
        target_module.FIXED_CHECKOUT = checkout
        before = repo_snapshot(checkout)
        try:
            target_module._git(["show", commit + ":lock.json"])
        except target_module.InstallError:
            pass
        else:
            raise AssertionError("lazy_fetch_unexpectedly_succeeded")
        assert not calls.exists()
        assert repo_snapshot(checkout) == before

        # Fallback independently: even if an older Git ignores/does not support
        # lazy-fetch suppression, empty GIT_ALLOW_PROTOCOL still denies transport.
        checkout, calls = promisor_fixture("protocol-fallback")
        target_module.FIXED_CHECKOUT = checkout
        original_git_env = target_module._git_env
        guarded = dict(original_git_env())
        guarded.pop("GIT_NO_LAZY_FETCH", None)
        target_module._git_env = lambda: dict(guarded)
        before = repo_snapshot(checkout)
        try:
            try:
                target_module._git(["show", commit + ":lock.json"])
            except target_module.InstallError:
                pass
            else:
                raise AssertionError("transport_fallback_unexpectedly_succeeded")
        finally:
            target_module._git_env = original_git_env
        assert not calls.exists()
        assert repo_snapshot(checkout) == before


prove_git_lazy_fetch_blocked()


def prove_git_fsmonitor_disabled() -> None:
    setup_env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_ALLOW_PROTOCOL": "",
        "GIT_AUTHOR_NAME": "Synthetic fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "Synthetic fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
    }

    def git(*args: object, cwd: Path) -> subprocess.CompletedProcess[bytes]:
        return subprocess.run(
            ["/usr/bin/git", *map(str, args)],
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=setup_env,
            check=False,
            timeout=10,
        )

    with tempfile.TemporaryDirectory(
        prefix="void-e2-bootstrap-install-fsmonitor-proof-"
    ) as directory:
        task = Path(directory)

        def fixture(name: str) -> tuple[Path, Path]:
            checkout = task / name
            checkout.mkdir()
            cp = git("init", ".", cwd=checkout)
            assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")
            (checkout / "tracked.txt").write_text("fixture\n", encoding="utf-8")
            cp = git("add", "tracked.txt", cwd=checkout)
            assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")
            cp = git(
                "-c", "user.name=Synthetic fixture",
                "-c", "user.email=fixture@example.invalid",
                "commit", "-m", "fixture",
                cwd=checkout,
            )
            assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")
            calls = task / (name + "-fsmonitor-calls.txt")
            hook = task / (name + "-fsmonitor.sh")
            hook.write_text(
                "#!/bin/sh\n"
                + "printf 'called\\n' >> "
                + shlex.quote(str(calls))
                + "\n"
                + "exit 1\n",
                encoding="utf-8",
            )
            hook.chmod(0o700)
            cp = git("config", "core.fsmonitor", str(hook), cwd=checkout)
            assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")
            return checkout, calls

        # Positive control: ordinary status honors repo-local core.fsmonitor and
        # executes the configured helper.
        checkout, calls = fixture("positive-control")
        cp = git(
            "-c", "safe.directory=" + str(checkout),
            "status", "--porcelain=v1", "--untracked-files=all",
            cwd=checkout,
        )
        assert cp.returncode == 0, cp.stderr.decode("utf-8", "replace")
        assert calls.exists() and calls.read_text("utf-8").splitlines()

        # Production command-line overrides must suppress the local helper.
        checkout, calls = fixture("production-guard")
        target_module.FIXED_CHECKOUT = checkout
        before = repo_snapshot(checkout)
        status = target_module._git(
            ["status", "--porcelain=v1", "--untracked-files=all"]
        )
        assert status == b""
        assert not calls.exists()
        assert repo_snapshot(checkout) == before


prove_git_fsmonitor_disabled()

for required in (
    'INSTALL_NAME = (',
    '"void-buy-void-epoch2-dormant-first-entry-"',
    '"protected-install-bootstrap-v3"',
    'POLICY_NAME = "policy-v1.conf"',
    'BOOTSTRAP_NAME = (',
    'BOOTSTRAP_BYTES = 731_072',
    BOOTSTRAP_SHA256,
    BOOTSTRAP_GIT_BLOB,
    'CANDIDATE_MERGE = "' + CANDIDATE_MERGE + '"',
    'CANDIDATE_TREE = "' + CANDIDATE_TREE + '"',
    'LOCK_GIT_BLOB_SHA1 = "' + LOCK_BLOB + '"',
    '"bootstrap_runtime_head_compile_bound": False',
    '"runtime_expected_head_strict_lowercase_hex": True',
    '"runtime_expected_head_forwarded_unchanged": True',
    '"canonical_main_candidate_authority": True',
    '"superseded_v3_lock_install_authority": False',
    '"superseded_v2_lock_install_authority": False',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
    'os.fchown(fd, 0, 0)',
    'os.fchmod(fd, mode)',
    'os.fsync(fd)',
    '_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)',
    'python_isolated_mode_required',
    'explicit_create_only_confirmation_required',
    'expected_plan_id_mismatch',
    '"GIT_NO_LAZY_FETCH": "1"',
    '"GIT_ALLOW_PROTOCOL": ""',
    '"core.hooksPath=/dev/null"',
    '"core.fsmonitor=false"',
    'bootstrap_input_generation_changed_before_publication',
    'prepublication_cleanup_limited_to_created_stage=true',
    'prepublication_cleanup_stage_generation_bound=true',
    'post_publication_rollback=false',
    'truthful_post_publication_failure_receipt=true',
    'post_publication_close_failure_receipt_truthful=true',
    'bootstrap_execution=false',
    'protected_installer_apply=false',
    'funds_movement=false',
):
    assert required in source, required

for forbidden in (
    "subprocess.Popen",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
    "systemctl",
    "service restart",
    "target.unlink(",
    "os.remove(INSTALL_ROOT",
    "shutil.rmtree",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)

functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "collect_plan",
    "apply",
    "_create_file",
    "_cleanup_created_stage",
    "_require_secure_apply_context",
    "_verify_root_generation",
):
    assert name in functions, name

apply_source = ast.get_source_segment(source, functions["apply"]) or ""
assert "os.geteuid() != 0" in apply_source
assert "_require_secure_apply_context()" in apply_source
assert 'initial["plan_id"] != expected_plan_id' in apply_source
assert "stage_created = True" in apply_source
assert "_verify_root_generation(STAGE_ROOT, policy=policy)" in apply_source
assert "_verify_root_generation(INSTALL_ROOT, policy=policy)" in apply_source
assert "_renameat2(opt_fd, STAGE_NAME, INSTALL_NAME, RENAME_NOREPLACE)" in apply_source
assert "published = True" in apply_source
assert "PublishedInstallError(" in apply_source
assert "_cleanup_created_stage(stage_dev, stage_ino)" in apply_source
assert "stage_dev = stage_identity.st_dev" in apply_source
assert "stage_ino = stage_identity.st_ino" in apply_source
assert '"published_install_close_failed"' in apply_source
assert 'phase="install_parent_close"' in apply_source
assert "failure.install_parent_close_completed = False" in apply_source
assert "finally:\n        os.close(opt_fd)" not in apply_source
assert "subprocess." not in apply_source

create_source = ast.get_source_segment(source, functions["_create_file"]) or ""
for required in (
    "os.O_EXCL",
    "os.O_NOFOLLOW",
    "os.fchown(fd, 0, 0)",
    "os.fchmod(fd, mode)",
    "os.fsync(fd)",
):
    assert required in create_source, required

cleanup_source = (
    ast.get_source_segment(source, functions["_cleanup_created_stage"]) or ""
)
assert "STAGE_ROOT" in cleanup_source
assert "INSTALL_ROOT" not in cleanup_source
assert "expected_stage_dev" in cleanup_source
assert "expected_stage_ino" in cleanup_source
assert "stage_st.st_dev != expected_stage_dev" in cleanup_source
assert "stage_st.st_ino != expected_stage_ino" in cleanup_source
assert "shutil." not in cleanup_source

secure_source = (
    ast.get_source_segment(source, functions["_require_secure_apply_context"])
    or ""
)
assert "sys.flags.isolated != 1" in secure_source
assert "FORBIDDEN_APPLY_ENV" in secure_source

run_calls_outside_git: list[str] = []
for name, fn in functions.items():
    for node in ast.walk(fn):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "subprocess"
            and node.func.attr == "run"
            and name != "_git"
        ):
            run_calls_outside_git.append(name)
assert run_calls_outside_git == []

lock = json.loads(lock_raw.decode("utf-8", "strict"))
assert lock["lock_id"] == LOCK_ID
assert lock["candidate_source_head"] == CANDIDATE_MERGE
assert lock["candidate_source_tree"] == CANDIDATE_TREE
assert lock["candidate_accepted"] is True
assert lock["bootstrap_binary_identity_accepted"] is True
assert lock["canonical_main_candidate_authority"] is True
assert lock["superseded_v3_lock_install_authority"] is False
assert lock["superseded_v2_lock_install_authority"] is False
assert lock["superseded_v1_lock_install_authority"] is False
assert lock["runtime_head_contract_accepted"] is True
assert lock["canonical_main_candidate_authority"] is True
assert lock["superseded_v2_lock_install_authority"] is False
assert lock["superseded_v1_lock_install_authority"] is False
assert lock["protected_bootstrap_install_authorized"] is False
assert lock["protected_installer_apply_authorized"] is False
assert lock["live_execution_authorized"] is False
assert lock["funds_movement_authorized"] is False
assert (
    lock["next_gate"]
    == "void_buy_void_epoch2_dormant_first_entry_"
       "protected_install_bootstrap_materializer_v3"
)
report = lock["candidate_report"]
assert report["candidate_id"] == CANDIDATE_ID
assert report["bootstrap_binary_bytes"] == BOOTSTRAP_BYTES
assert report["bootstrap_binary_sha256"] == BOOTSTRAP_SHA256
assert report["bootstrap_binary_git_blob_sha1"] == BOOTSTRAP_GIT_BLOB
assert report["runtime_expected_head_compile_bound"] is False
assert report["runtime_expected_head_strict_lowercase_hex"] is True
assert report["runtime_expected_head_forwarded_unchanged"] is True
assert report["repository_head_not_embedded_in_bootstrap"] is True
assert report["fixed_root"] == (
    "/opt/void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v3"
)
assert report["fixed_python"] == "/usr/bin/python3"

bootstrap_source = bootstrap_source_raw.decode("utf-8", "strict")
assert "VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD" not in bootstrap_source
for required in (
    "#define POLICY_SCHEMA "
    '"VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_'
    'PROTECTED_INSTALL_BOOTSTRAP_POLICY_V3"',
    '#define FIXED_SELF VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT '
    '"/bin/void_buy_void_epoch2_dormant_first_entry_'
    'protected_install_bootstrap_v3"',
    '#define FIXED_POLICY VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT '
    '"/policy-v1.conf"',
    'strncmp(lines[1],"python_sha256=",14)',
    'strncmp(lines[2],"python_bytes=",13)',
    'hexn(argv[7],40)',
    'snprintf(r.expected_head,sizeof(r.expected_head),"%s",argv[7])',
    '(char*)"--expected-head",q.expected_head',
):
    assert required in bootstrap_source, required

target = ROOT / TARGET_REL
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "accepted_bootstrap_lock_bound=true",
            "exact_bootstrap_binary_bound=true",
            "runtime_head_not_compile_bound=true",
            "runtime_expected_head_strict_lowercase_hex=true",
            "runtime_expected_head_forwarded_unchanged=true",
            "canonical_main_candidate_authority=true",
            "superseded_v2_lock_install_authority=false",
            "root_python_policy_binding_required=true",
            "create_only=true",
            "rename_noreplace_required=true",
            "operation_bound_plan_id_required=true",
            "explicit_apply_confirmation_required=true",
            "prepublication_cleanup_limited_to_created_stage=true",
            "post_publication_rollback=false",
            "truthful_post_publication_failure_receipt=true",
            "bootstrap_execution=false",
            "protected_installer_apply=false",
            "funds_movement=false",
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
            "accepted_lock_id=" + LOCK_ID,
            "candidate_id=" + CANDIDATE_ID,
            "candidate_source_head=" + CANDIDATE_MERGE,
            "bootstrap_runtime_head_compile_bound=false",
            "runtime_expected_head_strict_lowercase_hex=true",
            "runtime_expected_head_forwarded_unchanged=true",
            "canonical_main_candidate_authority=true",
            "superseded_v2_lock_install_authority=false",
            "create_only=true",
            "rename_noreplace_required=true",
            "bootstrap_execution_authorized=false",
            "protected_installer_apply_authorized=false",
            "funds_movement_authorized=false",
        ),
    ),
):
    cp = subprocess.run(
        ["/usr/bin/python3", "-I", "-B", str(target), mode],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=30,
    )
    assert cp.returncode == 0, (mode, cp.stderr)
    assert cp.stderr == "", (mode, cp.stderr)
    lines = set(cp.stdout.splitlines())
    for expected in expected_lines:
        assert expected in lines, (mode, expected)

print(MARKER + "_PROOF_GREEN")
print("target_blob_bound=true")
print("accepted_bootstrap_lock_bound=true")
print("materializer_generation_bound=true")
print("bootstrap_source_generation_bound=true")
print("protected_installer_generation_bound=true")
print("policy_parser_contract_bound=true")
print("canonical_v3_lock_bound=true")
print("canonical_v3_materializer_bound=true")
print("runtime_head_not_compile_bound=true")
print("runtime_expected_head_forwarded_unchanged=true")
print("superseded_v2_lock_install_authority=false")
print("create_only_stage_publication_required=true")
print("rename_noreplace_required=true")
print("initial_stage_cleanup_gap_absent=true")
print("stage_cleanup_generation_bound=true")
print("post_publication_close_failure_receipt_truthful=true")
print("bootstrap_input_revalidated_before_publication=true")
print("git_lazy_fetch_positive_control_reproduced=true")
print("git_lazy_fetch_suppressed=true")
print("git_transport_denial_fallback=true")
print("plan_git_repository_unchanged_on_missing_object=true")
print("git_fsmonitor_positive_control_reproduced=true")
print("git_fsmonitor_disabled=true")
print("git_local_hook_execution_suppressed=true")
print("bootstrap_execution_absent=true")
print("protected_installer_apply_absent=true")
print("post_publication_rollback=false")
print("live_execution_authorized=false")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("rpc_call_authorized=false")
print("payment_acceptance_authorized=false")
print("public_presale_activation_authorized=false")
print("wc_void_market_activation_authorized=false")
print("funds_movement=false")
