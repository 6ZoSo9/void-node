#!/usr/bin/env python3
from __future__ import annotations

import ast
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shlex
import stat
import subprocess
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v6.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "4ba006e8562ea4ade7010de83d4fb0bbbdd51223"
PREDECESSOR_BLOB = "a6ee24fe7ad41ad7aa0baffa7d20210e06c8e4f2"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_installed_qualification_v6.py"
)
QUALIFIER_BLOB = "f8e25ef310ef4493dd23baee70eef6db84ae68f9"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
INSTALLER_BLOB = "63e1c973978cfcb67105010e4145f01552673bc3"
LAUNCHER_LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v2.json"
)
LAUNCHER_LOCK_BLOB = "227c2fa449abf1387925373c706ecd07775d5898"
LAUNCHER_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_v2.py"
)
LAUNCHER_MATERIALIZER_BLOB = "609cde180490f4f5f53ed7e34d73b95f22313bcd"
NATIVE_LOCK_REL = (
    "ops/security/buy-void-epoch2-dormant-binder-native-candidate-lock-v3.json"
)
NATIVE_LOCK_BLOB = "5aa397be684dd1c87ca84fcb4d70ab3ebc176eb1"
NATIVE_MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_native_v2.py"
)
NATIVE_MATERIALIZER_BLOB = "557eb68453d517d78bb3b6c6d8427df9ed36316f"

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V6"
)
EXPECTED_HEAD = "a" * 40

EXPECTED_LAUNCHER_LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)
EXPECTED_LAUNCHER_CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)
EXPECTED_LAUNCHER_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
EXPECTED_NATIVE_SHA256 = (
    "ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c"
)
EXPECTED_BOOTSTRAP_SHA256 = (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
EXPECTED_BOOTSTRAP_BLOB = "a91707c3e5803071fc73c3451c9bcb3b774f8b48"
EXPECTED_BOOTSTRAP_LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)
EXPECTED_BOOTSTRAP_CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062"
)


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_NO_LAZY_FETCH": "1",
            "GIT_ALLOW_PROTOCOL": "",
        },
    )
    if cp.returncode != 0 or cp.stderr:
        raise AssertionError("git_failed:" + ":".join(args))
    return cp.stdout.strip()


def pin(relative: str, expected: str) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    assert stat.S_ISREG(before.st_mode) and not stat.S_ISLNK(before.st_mode)
    assert before.st_nlink == 1 and before.st_size > 0
    raw = path.read_bytes()
    after = path.lstat()
    for field in (
        "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
        "st_size", "st_mtime_ns", "st_ctime_ns",
    ):
        assert getattr(before, field) == getattr(after, field), (relative, field)
    assert git_blob(raw) == expected, relative
    assert git("rev-parse", "HEAD:" + relative) == expected, relative
    return raw


def fixture_git(root: Path, *args: str, data: bytes | None = None) -> bytes:
    """Only local plumbing/setup for the proof's disposable repository."""
    env = {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C",
        "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null", "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0", "GIT_TERMINAL_PROMPT": "0",
        "GIT_NO_LAZY_FETCH": "1", "GIT_ALLOW_PROTOCOL": "",
        "GIT_AUTHOR_NAME": "Inert proof fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "Inert proof fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
    }
    kwargs = {"input": data} if data is not None else {"stdin": subprocess.DEVNULL}
    cp = subprocess.run(
        ["/usr/bin/git", "--no-pager", "-C", str(root),
         "-c", "core.fsmonitor=false", "-c", "core.hooksPath=/dev/null",
         "-c", "core.untrackedCache=false", "-c", "gc.auto=0", *args],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env, timeout=15,
        check=False, **kwargs,
    )
    assert cp.returncode == 0 and not cp.stderr, (args, cp.returncode, cp.stderr[:1000])
    assert len(cp.stdout) <= 2 * 1024 * 1024
    return cp.stdout


def historical_observer(raw: bytes, root: Path):
    """Authenticate/extract only the predecessor's actual Git observation code."""
    assert git_blob(raw) == PREDECESSOR_BLOB
    selected = []
    for node in ast.parse(raw).body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id in {"GIT_ENV", "HEX40"}
            for target in node.targets
        ):
            selected.append(node)
        elif isinstance(node, ast.ClassDef) and node.name == "PlanError":
            selected.append(node)
        elif isinstance(node, ast.FunctionDef) and node.name in {"git", "checkout_snapshot"}:
            selected.append(node)
    assert len(selected) == 5
    observer = types.ModuleType("authenticated_predecessor_git_observer")
    observer.__dict__.update({"ROOT": root, "Path": Path, "re": re, "subprocess": subprocess})
    exec(compile(ast.Module(body=selected, type_ignores=[]), PREDECESSOR_BLOB, "exec"), observer.__dict__)
    return observer


def prove_raw_checkout(module, predecessor_raw: bytes) -> list[str]:
    """Real private Git; callbacks write inert markers, never accepted executables."""
    cases: list[str] = []
    original_root = module.ROOT
    with tempfile.TemporaryDirectory(prefix="void-e2-v6-plan-git-") as temporary:
        private = Path(temporary)
        repo = private / "repo"
        repo.mkdir()
        template = private / "empty-template"
        template.mkdir()
        fixture_git(repo, "init", "-q", "--initial-branch=main", "--template=" + str(template))
        (repo / ".git/info").mkdir(exist_ok=True)
        accepted = b"ACCEPTED\n"
        altered = b"ALTERED_PRIVATE_INERT_CONTENT\n"
        files = {
            ".gitignore": b"ignored-output\n",
            "payload.txt": accepted,
            "executable.sh": b"#!/bin/sh\nexit 0\n",
            "included/data.txt": b"included\n",
            "excluded/data.txt": b"excluded\n",
        }
        for name, content in files.items():
            path = repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        (repo / "executable.sh").chmod(0o755)
        (repo / "link").symlink_to("payload.txt")
        fixture_git(repo, "add", "--", *files, "link")
        fixture_git(repo, "-c", "commit.gpgsign=false", "commit", "-q", "-m", "inert fixture")
        head = fixture_git(repo, "rev-parse", "HEAD").decode().strip()
        tree_id = fixture_git(repo, "rev-parse", "HEAD^{tree}").decode().strip()
        expected = {"head": head, "tree": tree_id, "branch": "main"}
        baseline_index = (repo / ".git/index").read_bytes()
        base_config = (
            "[core]\nrepositoryFormatVersion = 0\nbare = false\nfileMode = true\n"
            "logAllRefUpdates = false\nfsmonitor = false\nhooksPath = /dev/null\n"
        )
        config = repo / ".git/config"
        attributes = repo / ".git/info/attributes"
        marker = private / "callback-marker"
        old = historical_observer(predecessor_raw, repo)
        module.ROOT = repo

        def marks() -> list[str]:
            return marker.read_text().splitlines() if marker.exists() else []

        def reset() -> None:
            config.write_text(base_config)
            (repo / ".git/index").write_bytes(baseline_index)
            for path in (attributes, repo / ".git/info/sparse-checkout", repo / "untracked", repo / "ignored-output"):
                path.unlink(missing_ok=True)
            for name, content in files.items():
                path = repo / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content)
                path.chmod(0o755 if name == "executable.sh" else 0o644)
            (repo / "link").unlink(missing_ok=True)
            (repo / "link").symlink_to("payload.txt")

        def check(name: str, *, accept: bool) -> None:
            before_marks = marks()
            before_index = (repo / ".git/index").read_bytes()
            try:
                actual = module.checkout_snapshot(head)
            except module.PlanError:
                assert not accept, name
            else:
                assert accept, (name, actual)
                assert set(actual) == {"head", "tree", "branch", "generation_sha256"}, (name, actual)
                assert {key: actual[key] for key in expected} == expected, (name, actual)
                assert re.fullmatch(r"[0-9a-f]{64}", actual["generation_sha256"]), name
            assert marks() == before_marks, (name, "callback executed")
            assert (repo / ".git/index").read_bytes() == before_index, (name, "index mutated")
            cases.append(name)

        def historical_control(kind: str) -> None:
            before = marks()
            try:
                observed = old.checkout_snapshot(head)
            except old.PlanError as exc:
                raise AssertionError((kind, str(exc), old.git(
                    "status", "--porcelain=v1", "--untracked-files=all",
                ))) from exc
            assert observed == expected
            delta = marks()[len(before):]
            assert delta and set(delta) == {kind}, (kind, delta)

        try:
            reset()
            check("normal_raw_clean_executable_and_symlink", accept=True)
            fsmonitor = private / "inert-fsmonitor.sh"
            fsmonitor.write_text(
                "#!/bin/sh\nprintf 'fsmonitor\\n' >> " + shlex.quote(str(marker))
                + "\nprintf 'fixture-token\\000'\n"
            )
            fsmonitor.chmod(0o755)
            fixture_git(repo, "config", "core.fsmonitor", shlex.quote(str(fsmonitor)))
            historical_control("fsmonitor")
            check("configured_fsmonitor_not_executed", accept=True)

            reset()
            (repo / "payload.txt").write_bytes(altered)
            check("changed_raw_bytes", accept=False)
            clean = private / "inert-clean.py"
            clean.write_text(
                "import sys\nfrom pathlib import Path\nsys.stdin.buffer.read()\n"
                "with Path(" + repr(str(marker)) + ").open('a') as marker: marker.write('clean\\n')\n"
                "sys.stdout.buffer.write(" + repr(accepted) + ")\n"
            )
            attributes.write_text("payload.txt filter=proofmask\n")
            fixture_git(repo, "config", "filter.proofmask.required", "true")
            fixture_git(repo, "config", "filter.proofmask.clean", shlex.join([
                "/usr/bin/python3", "-I", "-S", "-B", str(clean),
            ]))
            # Clear the payload's cached stat data so Git must compare converted
            # content; otherwise its size shortcut can skip the historical bug.
            fixture_git(repo, "update-index", "--cacheinfo", "100644," + git_blob(accepted) + ",payload.txt")
            historical_control("clean")
            check("clean_filter_false_clean_rejected", accept=False)

            process = private / "inert-process.py"
            process.write_text(
                "import sys\nfrom pathlib import Path\nsource=sys.stdin.buffer\nout=sys.stdout.buffer\n"
                "def group():\n"
                " result=[]\n"
                " for _ in range(32):\n"
                "  header=source.read(4)\n"
                "  if not header: return None\n"
                "  assert len(header)==4\n"
                "  n=int(header,16)\n"
                "  if n==0: return result\n"
                "  assert 4<=n<=65520\n"
                "  item=source.read(n-4);assert len(item)==n-4\n"
                "  result.append(item)\n"
                " raise AssertionError('too many packets')\n"
                "def send(items):\n"
                " for item in items: out.write(format(len(item)+4,'04x').encode()+item)\n"
                " out.write(b'0000');out.flush()\n"
                "assert group()==[b'git-filter-client\\n',b'version=2\\n']\n"
                "send([b'git-filter-server\\n',b'version=2\\n'])\n"
                "assert b'capability=clean\\n' in group()\n"
                "send([b'capability=clean\\n'])\n"
                "for _ in range(8):\n"
                " headers=group()\n"
                " if headers is None: break\n"
                " assert b'command=clean\\n' in headers and group() is not None\n"
                " with Path(" + repr(str(marker)) + ").open('a') as marker: marker.write('process\\n')\n"
                " send([b'status=success\\n']);send([" + repr(accepted) + "]);send([])\n"
            )
            fixture_git(repo, "config", "filter.proofmask.process", shlex.join([
                "/usr/bin/python3", "-I", "-S", "-B", str(process),
            ]))
            fixture_git(repo, "update-index", "--cacheinfo", "100644," + git_blob(accepted) + ",payload.txt")
            historical_control("process")
            check("process_filter_false_clean_rejected", accept=False)

            reset()
            changed_oid = fixture_git(repo, "hash-object", "-w", "--stdin", data=altered).decode().strip()
            fixture_git(repo, "update-index", "--cacheinfo", "100644," + changed_oid + ",payload.txt")
            check("staged_index_delta", accept=False)
            for flag, name in (("--assume-unchanged", "assume_unchanged"), ("--skip-worktree", "skip_worktree")):
                reset()
                fixture_git(repo, "update-index", flag, "--", "payload.txt")
                check(name, accept=False)
            reset()
            accepted_oid = git_blob(accepted)
            unmerged = (
                "0 " + "0" * 40 + "\tpayload.txt\n"
                + "100644 " + accepted_oid + " 1\tpayload.txt\n"
                + "100644 " + changed_oid + " 2\tpayload.txt\n"
            ).encode()
            fixture_git(repo, "update-index", "--index-info", data=unmerged)
            check("unmerged_index", accept=False)
            reset()
            fixture_git(repo, "sparse-checkout", "set", "--cone", "--sparse-index", "included")
            sparse = fixture_git(repo, "ls-files", "--stage", "--sparse", "-z")
            assert any(row.startswith(b"040000 ") for row in sparse.split(b"\0")), sparse
            check("sparse_directory_index", accept=False)
            reset()
            config.write_text(base_config + "fileMode = false\n")
            (repo / "executable.sh").chmod(0o644)
            check("executable_mode_change_despite_config", accept=False)
            reset()
            (repo / "link").unlink()
            (repo / "link").symlink_to("executable.sh")
            check("symlink_text_change", accept=False)
            reset()
            (repo / "untracked").write_bytes(b"inert\n")
            check("ordinary_untracked_file", accept=False)
            reset()
            (repo / "ignored-output").write_bytes(b"inert\n")
            check("standard_ignored_untracked_file", accept=True)
        finally:
            module.ROOT = original_root
    assert not private.exists()
    assert len(cases) == 14, cases
    return cases


def emitted_plan(module, result: dict[str, object]) -> dict[str, str]:
    """Round-trip the actual emitted preimage, not a separately built projection."""
    stream = io.StringIO()
    with contextlib.redirect_stdout(stream):
        module.emit_plan(result)
    rows = [line.split("=", 1) for line in stream.getvalue().splitlines() if "=" in line]
    fields = dict(rows)
    assert len(fields) == len(rows), "duplicate emitted keys"
    body = json.loads(fields["plan_body_json"])
    assert body == result["body"]
    assert fields["plan_body_json"] == module.canonical(body).decode("ascii")
    assert fields["plan_id"] == module.PLAN_PREFIX + module.sha256(module.canonical(body))
    assert fields["plan_id"] == result["plan_id"]
    assert json.loads(fields["bootstrap_argv_json"]) == body["bootstrap_argv"]
    assert json.loads(fields["qualification_contract_json"]) == body["qualification_contract"]
    return fields


target_raw = pin(TARGET_REL, TARGET_BLOB)
for relative, expected in (
    (QUALIFIER_REL, QUALIFIER_BLOB),
    (INSTALLER_REL, INSTALLER_BLOB),
    (LAUNCHER_LOCK_REL, LAUNCHER_LOCK_BLOB),
    (LAUNCHER_MATERIALIZER_REL, LAUNCHER_MATERIALIZER_BLOB),
    (NATIVE_LOCK_REL, NATIVE_LOCK_BLOB),
    (NATIVE_MATERIALIZER_REL, NATIVE_MATERIALIZER_BLOB),
):
    pin(relative, expected)

source = target_raw.decode("utf-8", "strict")
compile(source, TARGET_REL, "exec", dont_inherit=True, optimize=0)

for required in (
    "PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V6",
    "voidbuye2protectedbootstrapplan6_",
    QUALIFIER_BLOB,
    INSTALLER_BLOB,
    LAUNCHER_LOCK_BLOB,
    LAUNCHER_MATERIALIZER_BLOB,
    NATIVE_LOCK_BLOB,
    NATIVE_MATERIALIZER_BLOB,
    '"installed_qualification_performed": False',
    '"installed_qualification_required_before_bootstrap_plan": True',
    '"descriptor_bound_source_execution_required": True',
    '"--installer-plan"',
    '"--launcher"',
    '"--native"',
    '"--expected-head"',
    '"bootstrap_execution_performed": False',
    '"protected_installer_apply_performed": False',
    '"filesystem_write": False',
    "qualification_contract_json=",
    "bootstrap_argv_json=",
    "plan_body_json=",
):
    assert required in source, required

for forbidden in (
    "qualifier.collect(",
    "--installer-apply",
    "sudo",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source, filename=TARGET_REL)
function_nodes = [
    node for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
]
function_names = [node.name for node in function_nodes]
assert len(function_names) == len(set(function_names)), "duplicate_top_level_function"
assert function_names.count("main") == 1, "main_entrypoint_count_invalid"

def is_main_guard(node: ast.AST) -> bool:
    if not isinstance(node, ast.If) or not isinstance(node.test, ast.Compare):
        return False
    test = node.test
    return (
        isinstance(test.left, ast.Name)
        and test.left.id == "__name__"
        and len(test.ops) == 1
        and isinstance(test.ops[0], ast.Eq)
        and len(test.comparators) == 1
        and isinstance(test.comparators[0], ast.Constant)
        and test.comparators[0].value == "__main__"
    )

main_guards = [node for node in tree.body if is_main_guard(node)]
assert len(main_guards) == 1, "duplicate_or_missing_main_guard"
assert tree.body[-1] is main_guards[0], "entry_guard_not_terminal"

functions = {node.name: node for node in function_nodes}
for name in (
    "git",
    "git_bytes",
    "repository_blob",
    "stable_artifact",
    "_safe_tool",
    "checkout_snapshot",
    "_parse_tree",
    "_parse_index",
    "plan_id_for_body",
    "load_qualifier",
    "source_dependencies",
    "collect_plan",
    "emit_plan",
    "source_plan",
    "self_test",
):
    assert name in functions, name

process_calls: list[tuple[str, str]] = []
for name, fn in functions.items():
    for node in ast.walk(fn):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and isinstance(node.func.value, ast.Name)
            and node.func.value.id == "subprocess"
            and node.func.attr in {"run", "Popen", "call", "check_call", "check_output"}
        ):
            process_calls.append((name, node.func.attr))
assert process_calls == [("git_bytes", "Popen")], process_calls

module = types.ModuleType("void_e2_bootstrap_plan_v6_verified")
module.__file__ = str(TARGET)
module.__package__ = None
exec(
    compile(target_raw, TARGET_REL, "exec", dont_inherit=True, optimize=0),
    module.__dict__,
)

# These tests call only actual observers in a private repository. The current
# process UID is immaterial here; the existing controlled collect_plan mocks
# below independently retain the nonroot admission regression.
predecessor_raw = fixture_git(ROOT, "cat-file", "blob", PREDECESSOR_BLOB)
raw_checkout_cases = prove_raw_checkout(module, predecessor_raw)

# Source-only surfaces execute with no host qualification or bootstrap action.
for mode, expected_lines in (
    (
        "--self-test",
        (
            MARKER + "_SELF_TEST_GREEN",
            "nonroot_plan_required=true",
            "merged_v6_qualifier_bound=true",
            "qualification_root_execution_separate=true",
            "qualification_descriptor_bound_source_execution_required=true",
            "installed_qualification_performed=false",
            "operation_bound_plan_id=true",
            "structured_bootstrap_argv_only=true",
            "bootstrap_execution_performed=false",
            "protected_installer_apply_performed=false",
            "filesystem_write=false",
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
            "qualifier_git_blob_sha1=" + QUALIFIER_BLOB,
            "launcher_lock_git_blob_sha1=" + LAUNCHER_LOCK_BLOB,
            "launcher_materializer_git_blob_sha1=" + LAUNCHER_MATERIALIZER_BLOB,
            "native_lock_git_blob_sha1=" + NATIVE_LOCK_BLOB,
            "native_materializer_git_blob_sha1=" + NATIVE_MATERIALIZER_BLOB,
            "installed_qualification_performed=false",
            "bootstrap_execution_performed=false",
            "protected_installer_apply_performed=false",
            "filesystem_write=false",
            "funds_movement=false",
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
    for expected in expected_lines:
        assert expected in lines, (mode, expected)


# Missing plan arguments must produce the canonical HOLD and complete no-authority
# footer, regardless of the module's import/CLI entrypoint generation.
cp = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"},
)
assert cp.returncode == 2, cp.stderr
assert cp.stderr == "", cp.stderr
negative_lines = cp.stdout.splitlines()
assert negative_lines.count(MARKER) == 1, negative_lines
for required in (
    "status=HOLD",
    "reason=plan_arguments_required",
    "read_only=true",
    "installed_qualification_performed=false",
    "bootstrap_execution_performed=false",
    "protected_installer_apply_performed=false",
    "filesystem_write=false",
    "service_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert negative_lines.count(required) == 1, required


class FakeInstaller:
    LOCK_ID = EXPECTED_BOOTSTRAP_LOCK_ID
    CANDIDATE_ID = EXPECTED_BOOTSTRAP_CANDIDATE_ID
    BOOTSTRAP_BYTES = 874_608
    BOOTSTRAP_SHA256 = EXPECTED_BOOTSTRAP_SHA256
    BOOTSTRAP_GIT_BLOB_SHA1 = EXPECTED_BOOTSTRAP_BLOB
    MANIFEST_BYTES = 2382
    MANIFEST_SHA256 = (
        "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
    )
    MANIFEST_GIT_BLOB_SHA1 = "6e0630af72111bd9976dcc38cdcdada1904dd067"
    POLICY_SCHEMA = (
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"
    )
    INSTALL_ROOT = Path(
        "/opt/void-buy-void-epoch2-dormant-first-entry-"
        "protected-install-bootstrap-v6"
    )
    BIN_DIR = "bin"
    BOOTSTRAP_NAME = (
        "void_buy_void_epoch2_dormant_first_entry_"
        "protected_install_bootstrap_v6"
    )


fake_qualifier = types.SimpleNamespace(
    MARKER=(
        "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
        "PROTECTED_INSTALL_BOOTSTRAP_INSTALLED_QUALIFICATION_V6"
    ),
    INSTALLER_SOURCE_GIT_BLOB_SHA1=INSTALLER_BLOB,
    _load_installer=lambda: FakeInstaller,
)

orig_checkout = module.checkout_snapshot
orig_dependencies = module.source_dependencies
orig_qualifier = module.load_qualifier
orig_artifact = module.stable_artifact
orig_tool = module._safe_tool
orig_geteuid = module.os.geteuid

try:
    module.checkout_snapshot = lambda head: {
        "head": head,
        "tree": "b" * 40,
        "branch": "main",
        "generation_sha256": "c" * 64,
    }
    module.source_dependencies = lambda: {
        "launcher_lock": {"lock_id": EXPECTED_LAUNCHER_LOCK_ID},
        "native_lock": {"lock_id": "native"},
    }
    module.load_qualifier = lambda: fake_qualifier

    artifact_inode = 2

    def fake_artifact(
        path: Path,
        *,
        expected_bytes: int,
        expected_sha256: str,
        expected_git_blob: str | None,
        label: str,
    ) -> dict[str, object]:
        return {
            "path": str(path),
            "bytes": expected_bytes,
            "sha256": expected_sha256,
            "git_blob_sha1": expected_git_blob or "f" * 40,
            "mode": "0555",
            "uid": 1000,
            "gid": 1000,
            "dev": 1,
            "ino": artifact_inode if label == "accepted_launcher" else 3,
        }

    module.stable_artifact = fake_artifact
    module._safe_tool = lambda path, label, maximum: {
        "path": str(path),
        "resolved_path": str(path),
        "bytes": 123 if label == "qualification_python" else 456,
        "sha256": "1" * 64 if label == "qualification_python" else "2" * 64,
        "mode": "0755",
        "uid": 0,
        "gid": 0,
        "dev": 4,
        "ino": 5 if label == "qualification_python" else 6,
    }
    module.os.geteuid = lambda: 1000

    launcher = Path("/tmp/accepted-launcher")
    native = Path("/tmp/accepted-native")
    result = module.collect_plan(launcher, native, EXPECTED_HEAD)
    repeat = module.collect_plan(launcher, native, EXPECTED_HEAD)
    assert result == repeat
    assert result["plan_id"].startswith("voidbuye2protectedbootstrapplan6_")
    body = result["body"]
    assert body["version"] == 6
    assert body["installed_qualification_performed"] is False
    assert body["installed_qualification_required_before_bootstrap_plan"] is True
    assert body["bootstrap_execution_performed"] is False
    assert body["protected_installer_apply_performed"] is False
    assert body["filesystem_write"] is False
    assert body["accepted_launcher"]["sha256"] == EXPECTED_LAUNCHER_SHA256
    assert body["accepted_native"]["sha256"] == EXPECTED_NATIVE_SHA256
    assert body["expected_installed_bootstrap"]["lock_id"] == EXPECTED_BOOTSTRAP_LOCK_ID
    assert body["expected_installed_bootstrap"]["candidate_id"] == EXPECTED_BOOTSTRAP_CANDIDATE_ID
    assert body["expected_installed_bootstrap"]["sha256"] == EXPECTED_BOOTSTRAP_SHA256

    q = body["qualification_contract"]
    assert q["qualifier_git_blob_sha1"] == QUALIFIER_BLOB
    assert q["qualifier_installer_git_blob_sha1"] == INSTALLER_BLOB
    assert q["root_execution_required"] is True
    assert q["read_only_required"] is True
    assert q["descriptor_bound_source_execution_required"] is True
    assert q["required_result"]["installed_identity_green"] is True
    assert q["required_result"]["bootstrap_self_test_count"] == 2
    assert q["required_result"]["bootstrap_execution_beyond_self_test"] is False
    assert q["required_result"]["filesystem_write"] is False

    expected_bootstrap = str(FakeInstaller.INSTALL_ROOT / FakeInstaller.BIN_DIR / FakeInstaller.BOOTSTRAP_NAME)
    assert body["bootstrap_argv"] == [
        expected_bootstrap,
        "--installer-plan",
        "--launcher",
        str(launcher),
        "--native",
        str(native),
        "--expected-head",
        EXPECTED_HEAD,
    ]

    emitted = emitted_plan(module, result)
    artifact_inode = 4
    changed_inode = module.collect_plan(launcher, native, EXPECTED_HEAD)
    changed_emission = emitted_plan(module, changed_inode)
    assert changed_inode["plan_id"] != result["plan_id"]
    assert changed_emission["plan_body_json"] != emitted["plan_body_json"]
    assert json.loads(changed_emission["plan_body_json"])["accepted_launcher"]["ino"] == 4
    assert json.loads(emitted["plan_body_json"])["accepted_launcher"]["ino"] == 2
    assert changed_emission["bootstrap_argv_json"] == emitted["bootstrap_argv_json"]
    assert changed_emission["qualification_contract_json"] == emitted["qualification_contract_json"]
    artifact_inode = 2

    changed_path = module.collect_plan(
        Path("/tmp/accepted-launcher-2"),
        native,
        EXPECTED_HEAD,
    )
    assert changed_path["plan_id"] != result["plan_id"]

    module.os.geteuid = lambda: 0
    try:
        module.collect_plan(launcher, native, EXPECTED_HEAD)
    except module.PlanError as exc:
        assert str(exc) == "nonroot_plan_required"
    else:
        raise AssertionError("root planner accepted")
finally:
    module.checkout_snapshot = orig_checkout
    module.source_dependencies = orig_dependencies
    module.load_qualifier = orig_qualifier
    module.stable_artifact = orig_artifact
    module._safe_tool = orig_tool
    module.os.geteuid = orig_geteuid

print(MARKER + "_PROOF_GREEN")
print("single_main_entrypoint_and_guard=true")
print("canonical_missing_arguments_hold=true")
print("target_blob_bound=true")
print("merged_v6_qualifier_bound=true")
print("v6_installer_blob_bound=true")
print("launcher_lock_and_materializer_bound=true")
print("launcher_v2_runtime_head_authority_bound=true")
print("native_lock_and_materializer_bound=true")
print("nonroot_plan_required=true")
print("root_qualification_kept_separate=true")
print("qualification_descriptor_bound_source_execution_required=true")
print("installed_qualification_performed=false")
print("operation_bound_plan_id=true")
print("plan_id_artifact_path_sensitive=true")
print("plan_body_emitted_complete=true")
print("emitted_plan_id_recomputed=true")
print("emitted_plan_artifact_inode_sensitive=true")
print("raw_checkout_fixture_cases=" + str(len(raw_checkout_cases)))
print("historical_git_callback_controls=3")
print("repaired_observer_git_callbacks_not_executed=true")
print("raw_checkout_index_and_worktree_rejections_verified=true")
print("git_fixture_disposable_repository=true")
print("git_fixture_temporary_filesystem_write=true")
print("git_fixture_host_plan_performed=false")
print("structured_bootstrap_argv_only=true")
print("bootstrap_execution_absent=true")
print("protected_installer_apply_absent=true")
print("filesystem_write=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
