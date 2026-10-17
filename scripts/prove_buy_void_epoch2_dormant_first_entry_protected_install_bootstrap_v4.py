#!/usr/bin/env python3
from __future__ import annotations

import ast
import errno
import fcntl
import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V4"
INSTALLER_MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_PROTECTED_INSTALL_V3"
)
SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.c"
)
SOURCE_BLOB = "e55442bcc0b98cefa56f683d0570555409de7fb5"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py"
)
INSTALLER_BLOB = "91314d52c7c6b4ca1f3221a5f46278e5f71190eb"
INSTALLER_BYTES = 85752
INSTALLER_SHA256 = (
    "8d3da23d2b55882d5dd5db1b7695bcf20c8519a274ca5cf1d7f82f12d1432ed3"
)
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V3_CREATE_ONLY"
PLAN_PREFIX = "voidbuye2dormantfirstentryinstall3_"
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V4"
)

FROZEN_INPUTS = {
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py":
        "69a018c0eccedf3782055c56725579d02463b05e",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.c":
        "2c3c9ed120cc9949a0528e43be886354aa25da5a",
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2_terminal.py":
        "7b2ddaeddf844d98aa4eb7006ee371ea6a455f57",
    "ops/security/buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v4.json":
        "57ecc08d465fe2a3c395546d349864312cd08a3f",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py":
        "383b84e71b371de65579e4113469e86a59b807ab",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v1.c":
        "243583d4ed0522796b2bbf448abd4e9c28958f50",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c":
        "19f9baf8d6d707da43dbd0e247667af1a10e46c5",
    "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json":
        "f8ff6fbb855aecafc329cd60622cf3af782745a3",
    "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py":
        "f3d6b1559be7490303cf36338c4bfa38fdaa390a",
    "ops/security/buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-candidate-lock-v3.json":
        "64c9a42ca1108a9e8f88218c34d53e50668c653e",
}

BASE_ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
}


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def run(
    argv: list[str],
    *,
    check: bool = True,
    env: dict[str, str] | None = None,
    input_bytes: bytes | None = None,
    timeout: int = 60,
    pass_fds: tuple[int, ...] = (),
    cwd: Path | None = None,
) -> subprocess.CompletedProcess[bytes]:
    merged = dict(BASE_ENV)
    if env:
        merged.update(env)
    kwargs = {
        "cwd": ROOT if cwd is None else cwd,
        "stdout": subprocess.PIPE,
        "stderr": subprocess.PIPE,
        "env": merged,
        "check": False,
        "timeout": timeout,
        "pass_fds": pass_fds,
    }
    if input_bytes is None:
        kwargs["stdin"] = subprocess.DEVNULL
    else:
        kwargs["input"] = input_bytes
    cp = subprocess.run(argv, **kwargs)
    if check and cp.returncode != 0:
        raise AssertionError(
            "command_failed:"
            + repr(argv)
            + ":stdout="
            + cp.stdout.decode("utf-8", "replace")[-2000:]
            + ":stderr="
            + cp.stderr.decode("utf-8", "replace")[-3000:]
        )
    return cp


def sudo(
    argv: list[str],
    *,
    check: bool = True,
    env: dict[str, str] | None = None,
    input_bytes: bytes | None = None,
    timeout: int = 60,
) -> subprocess.CompletedProcess[bytes]:
    command = [] if os.geteuid() == 0 else ["sudo", "-n"]
    if env:
        command += ["/usr/bin/env", *[f"{k}={v}" for k, v in sorted(env.items())]]
    command += argv
    return run(
        command,
        check=check,
        input_bytes=input_bytes,
        timeout=timeout,
    )


def git(args: list[str]) -> str:
    cp = run(
        [
            "/usr/bin/git",
            "--no-replace-objects",
            "-c", "core.fsmonitor=false",
            "-c", "core.hooksPath=/dev/null",
            "-C", os.fspath(ROOT),
            *args,
        ],
        env={
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null",
            "GIT_NO_REPLACE_OBJECTS": "1",
            "GIT_OPTIONAL_LOCKS": "0",
            "GIT_TERMINAL_PROMPT": "0",
            "GIT_NO_LAZY_FETCH": "1",
            "GIT_ALLOW_PROTOCOL": "",
        },
        timeout=30,
    )
    if cp.stderr:
        raise AssertionError("git_stderr")
    return cp.stdout.decode("ascii", "strict").strip()


def exact_file(relative: str, expected_blob: str, maximum: int) -> bytes:
    path = ROOT / relative
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > maximum
    ):
        raise AssertionError("source_metadata_invalid:" + relative)
    raw = path.read_bytes()
    after = path.lstat()
    for field in ("st_dev", "st_ino", "st_size", "st_mtime_ns", "st_ctime_ns"):
        if getattr(before, field) != getattr(after, field):
            raise AssertionError("source_generation_changed:" + relative)
    if git_blob(raw) != expected_blob:
        raise AssertionError("source_blob_mismatch:" + relative)
    if git(["rev-parse", "HEAD:" + relative]) != expected_blob:
        raise AssertionError("source_not_exact_head:" + relative)
    return raw


def compile_bootstrap(
    source: Path,
    output: Path,
    *,
    installer_sha: str,
    installer_bytes: int,
    fixture_root: Path | None = None,
    fixture_installer: Path | None = None,
    confirm: str = CONFIRM,
    omit_macro: str | None = None,
) -> subprocess.CompletedProcess[bytes]:
    cc = shutil.which("cc") or "/usr/bin/cc"
    args = [
        cc,
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-O2",
        "-static",
        (
            '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_SHA256="'
            + installer_sha
            + '"'
        ),
        "-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER_BYTES="
        + str(installer_bytes)
        + "U",
        (
            '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_APPLY_CONFIRM="'
            + confirm
            + '"'
        ),
    ]
    if fixture_root is not None:
        args += [
            '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_ROOT="'
            + os.fspath(fixture_root)
            + '"'
        ]
    if fixture_installer is not None:
        args += [
            '-DVOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_INSTALLER="'
            + os.fspath(fixture_installer)
            + '"'
        ]
    if omit_macro is not None:
        args = [arg for arg in args if not arg.startswith("-D" + omit_macro + "=")]
    args += [os.fspath(source), "-o", os.fspath(output)]
    return run(args, check=False)


def require_static(binary: Path) -> None:
    file_cp = run(["/usr/bin/file", os.fspath(binary)])
    if b"statically linked" not in file_cp.stdout:
        raise AssertionError("bootstrap_not_static")
    ph = run(["/usr/bin/readelf", "-lW", os.fspath(binary)])
    if b" INTERP " in ph.stdout or b"Requesting program interpreter" in ph.stdout:
        raise AssertionError("bootstrap_pt_interp_present")
    dyn = run(["/usr/bin/readelf", "-dW", os.fspath(binary)], check=False)
    if b"NEEDED" in dyn.stdout + dyn.stderr:
        raise AssertionError("bootstrap_dynamic_needed_present")


def python_identity() -> tuple[bytes, str]:
    real = Path("/usr/bin/python3").resolve()
    raw = real.read_bytes()
    return raw, sha256(raw)


def install_root_fixture(
    fixture_root: Path,
    bootstrap: Path,
    installer: Path,
    policy: bytes,
) -> tuple[Path, Path]:
    sudo(["/usr/bin/mkdir", "--mode=0755", "--", os.fspath(fixture_root)])
    sudo([
        "/usr/bin/install", "-d", "-o", "root", "-g", "root", "-m", "0755",
        os.fspath(fixture_root),
        os.fspath(fixture_root / "bin"),
    ])
    fixed_self = (
        fixture_root
        / "bin"
        / "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4"
    )
    fixed_installer = fixture_root / "installer.py"
    sudo([
        "/usr/bin/install", "-o", "root", "-g", "root", "-m", "0555",
        os.fspath(bootstrap), os.fspath(fixed_self),
    ])
    sudo([
        "/usr/bin/install", "-o", "root", "-g", "root", "-m", "0444",
        os.fspath(installer), os.fspath(fixed_installer),
    ])
    with tempfile.NamedTemporaryFile(prefix="void-e2-bootstrap-policy-", delete=False) as tf:
        policy_local = Path(tf.name)
        tf.write(policy)
    try:
        sudo([
            "/usr/bin/install", "-o", "root", "-g", "root", "-m", "0444",
            os.fspath(policy_local), os.fspath(fixture_root / "policy-v1.conf"),
        ])
    finally:
        policy_local.unlink(missing_ok=True)
    return fixed_self, fixed_installer


def replace_root_file(local: Path, target: Path, mode: str = "0444") -> None:
    staging = target.parent / (target.name + ".replacement")
    sudo([
        "/usr/bin/install", "-o", "root", "-g", "root", "-m", mode,
        os.fspath(local), os.fspath(staging),
    ])
    sudo(["/usr/bin/mv", "-f", os.fspath(staging), os.fspath(target)])


def sealed_real_installer_source_plan(raw: bytes, expected_lines: set[str]) -> None:
    fd = os.memfd_create(
        "void-bootstrap-v4-real-inner-source-plan",
        flags=os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING,
    )
    try:
        remaining = memoryview(raw)
        while remaining:
            written = os.write(fd, remaining)
            if written <= 0:
                raise AssertionError("real_installer_memfd_write_failed")
            remaining = remaining[written:]
        os.fchmod(fd, 0o444)
        # Linux constants are fixed even when this Python fcntl build omits names.
        seals = (
            getattr(fcntl, "F_SEAL_SEAL", 0x0001)
            | getattr(fcntl, "F_SEAL_SHRINK", 0x0002)
            | getattr(fcntl, "F_SEAL_GROW", 0x0004)
            | getattr(fcntl, "F_SEAL_WRITE", 0x0008)
        )
        fcntl.fcntl(fd, getattr(fcntl, "F_ADD_SEALS", 1033), seals)
        if fcntl.fcntl(fd, getattr(fcntl, "F_GET_SEALS", 1034)) != seals:
            raise AssertionError("real_installer_memfd_seals_missing")
        if os.pread(fd, len(raw) + 1, 0) != raw:
            raise AssertionError("real_installer_memfd_source_identity_changed")
        try:
            os.pwrite(fd, b"X", 0)
        except OSError as exc:
            if exc.errno != errno.EPERM:
                raise AssertionError("real_installer_memfd_write_rejected_unexpectedly") from exc
        else:
            raise AssertionError("real_installer_memfd_write_seal_ineffective")
        with tempfile.TemporaryDirectory(prefix="void-v4-real-source-plan-") as td:
            empty = Path(td)
            cp = run(
                ["/usr/bin/python3", "-I", "-B", f"/proc/self/fd/{fd}", "--source-plan"],
                pass_fds=(fd,),
                cwd=empty,
                timeout=30,
            )
            lines = cp.stdout.decode("utf-8", "strict").splitlines()
            if cp.stderr or len(lines) != len(expected_lines) or set(lines) != expected_lines:
                raise AssertionError("real_installer_sealed_source_plan_output_invalid")
            if tuple(empty.iterdir()):
                raise AssertionError("real_installer_source_plan_changed_empty_cwd")
    finally:
        os.close(fd)


if (
    not isinstance(INSTALLER_BLOB, str)
    or len(INSTALLER_BLOB) != 40
    or any(ch not in "0123456789abcdef" for ch in INSTALLER_BLOB)
    or not isinstance(INSTALLER_SHA256, str)
    or len(INSTALLER_SHA256) != 64
    or any(ch not in "0123456789abcdef" for ch in INSTALLER_SHA256)
    or not isinstance(INSTALLER_BYTES, int)
    or isinstance(INSTALLER_BYTES, bool)
    or INSTALLER_BYTES < 1
):
    raise AssertionError("repaired_installer_identity_not_finalized")

frozen_raw = {
    relative: exact_file(relative, blob, 256 * 1024)
    for relative, blob in FROZEN_INPUTS.items()
}

source_raw = exact_file(SOURCE_REL, SOURCE_BLOB, 256 * 1024)
source_text = source_raw.decode("utf-8", "strict")
canonical_source = frozen_raw[
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.c"
].decode("utf-8", "strict")
for old, new in (
    ("PROTECTED_INSTALL_BOOTSTRAP_V3", "PROTECTED_INSTALL_BOOTSTRAP_V4"),
    ("PROTECTED_INSTALL_BOOTSTRAP_POLICY_V3", "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V4"),
    ("protected-install-bootstrap-v3", "protected-install-bootstrap-v4"),
    ("protected_install_bootstrap_v3", "protected_install_bootstrap_v4"),
    ("protected_install_v2.py", "protected_install_v3.py"),
    ("voidbuye2dormantfirstentryinstall2_", "voidbuye2dormantfirstentryinstall3_"),
    ("void-e2-protected-install-v2", "void-e2-protected-install-v3"),
    (
        "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V2_CREATE_ONLY",
        "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V3_CREATE_ONLY",
    ),
):
    if canonical_source.count(old) != 1:
        raise AssertionError("canonical_bootstrap_generation_substitution_ambiguous:" + old)
    canonical_source = canonical_source.replace(old, new)
if canonical_source.encode("utf-8") != source_raw:
    raise AssertionError("canonical_bootstrap_behavior_changed")
if (
    "send(o,buf+off,(size_t)n-off,MSG_MORE)" not in source_text
    or "send(o,NULL,0,0)" not in source_text
    or "bootstrap_hash_finalize_failed" not in source_text
):
    raise AssertionError("af_alg_stream_finalization_contract_missing")
if "VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_EXPECTED_HEAD" in source_text:
    raise AssertionError("compile_time_expected_head_still_present")
for required in (
    'hexn(argv[7],40)',
    'snprintf(r.expected_head,sizeof(r.expected_head),"%s",argv[7])',
    '(char*)"--expected-head",q.expected_head',
):
    if required not in source_text:
        raise AssertionError("runtime_expected_head_contract_missing:" + required)
installer_raw = exact_file(INSTALLER_REL, INSTALLER_BLOB, 256 * 1024)
if len(installer_raw) != INSTALLER_BYTES or sha256(installer_raw) != INSTALLER_SHA256:
    raise AssertionError("repaired_installer_identity_mismatch")
installer_text = installer_raw.decode("utf-8", "strict")
installer_ast = ast.parse(installer_text)
installer_assignments = {}
for node in installer_ast.body:
    if isinstance(node, ast.Assign) and len(node.targets) == 1:
        target = node.targets[0]
        if isinstance(target, ast.Name):
            try:
                installer_assignments[target.id] = ast.literal_eval(node.value)
            except (ValueError, TypeError):
                pass
for name, expected in {
    "MARKER": INSTALLER_MARKER,
    "CONFIRM_TOKEN": CONFIRM,
    "PLAN_PREFIX": PLAN_PREFIX,
    "LOCK_GIT_BLOB_SHA1": "f8ff6fbb855aecafc329cd60622cf3af782745a3",
    "RUNTIME_INSTALLER_GIT_BLOB_SHA1": "f3d6b1559be7490303cf36338c4bfa38fdaa390a",
    "RUNTIME_INSTALLER_BYTES": 57255,
    "RUNTIME_INSTALLER_SHA256":
        "602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9",
    "INSTALL_NAME": "void-buy-void-epoch2-dormant-binder-installer-first-entry-v1",
    "GIT_BOUNDARY_POLICY": "private_metadata_pinned_objects_raw_checkout_v3",
}.items():
    if installer_assignments.get(name) != expected:
        raise AssertionError("authenticated_child_binding_invalid:" + name)

installer_functions = {
    node.name: node
    for node in installer_ast.body
    if isinstance(node, ast.FunctionDef)
}
for node in installer_ast.body:
    targets = (
        node.targets if isinstance(node, ast.Assign)
        else [node.target] if isinstance(node, ast.AnnAssign)
        else []
    )
    if any(isinstance(target, ast.Name) and target.id == "ROOT" for target in targets):
        raise AssertionError("authenticated_child_module_root_resolution_present")
if "_git" in installer_functions or "_git_env" in installer_functions:
    raise AssertionError("authenticated_child_legacy_git_helper_present")
canonical_installer_ast = ast.parse(frozen_raw[
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py"
])
canonical_source_plan = next(
    node for node in canonical_installer_ast.body
    if isinstance(node, ast.FunctionDef) and node.name == "source_plan"
)
if (
    "source_plan" not in installer_functions
    or ast.dump(installer_functions["source_plan"], include_attributes=False)
    != ast.dump(canonical_source_plan, include_attributes=False)
):
    raise AssertionError("canonical_inert_source_plan_changed")

snapshot_classes = [
    node for node in installer_ast.body
    if isinstance(node, ast.ClassDef) and node.name == "_RepositorySnapshot"
]
if len(snapshot_classes) != 1:
    raise AssertionError("authenticated_child_repository_snapshot_missing")
snapshot_methods = {
    node.name: node
    for node in snapshot_classes[0].body
    if isinstance(node, ast.FunctionDef)
}
for method in (
    "__enter__", "__exit__", "checkout", "blob", "_run", "_environment",
    "_reference_snapshot", "_index_snapshot", "_objects_snapshot", "_objects",
    "_worktree_file", "_recheck", "_close",
):
    if method not in snapshot_methods:
        raise AssertionError("authenticated_child_snapshot_method_missing:" + method)
worktree_source = ast.get_source_segment(installer_text, snapshot_methods["_worktree_file"]) or ""
if 'bool(before.st_mode & stat.S_IXUSR) != (mode == b"100755")' not in worktree_source:
    raise AssertionError("authenticated_child_git_owner_execute_contract_invalid")

for wrapper, method in (("checkout_snapshot", "checkout"), ("_git_object", "blob")):
    function = installer_functions.get(wrapper)
    if function is None or len(function.body) != 1 or not isinstance(function.body[0], ast.With):
        raise AssertionError("authenticated_child_snapshot_wrapper_invalid:" + wrapper)
    context = function.body[0]
    if len(context.items) != 1 or len(context.body) != 1:
        raise AssertionError("authenticated_child_snapshot_wrapper_invalid:" + wrapper)
    item = context.items[0]
    call = item.context_expr
    returned = context.body[0]
    if (
        not isinstance(call, ast.Call)
        or not isinstance(call.func, ast.Name) or call.func.id != "_RepositorySnapshot"
        or len(call.args) != 1 or not isinstance(call.args[0], ast.Name)
        or call.args[0].id != "expected_head" or call.keywords
        or not isinstance(item.optional_vars, ast.Name)
        or not isinstance(returned, ast.Return)
        or not isinstance(returned.value, ast.Call)
        or not isinstance(returned.value.func, ast.Attribute)
        or not isinstance(returned.value.func.value, ast.Name)
        or returned.value.func.value.id != item.optional_vars.id
        or returned.value.func.attr != method
    ):
        raise AssertionError("authenticated_child_snapshot_wrapper_invalid:" + wrapper)
    if method == "checkout" and (returned.value.args or returned.value.keywords):
        raise AssertionError("authenticated_child_checkout_wrapper_arguments_invalid")
    if method == "blob":
        passed = returned.value
        if (
            len(passed.args) != 1 or not isinstance(passed.args[0], ast.Name)
            or passed.args[0].id != "relative"
            or {kw.arg for kw in passed.keywords} != {
                "expected_blob", "expected_bytes", "expected_sha256"
            }
            or any(not isinstance(kw.value, ast.Name) or kw.value.id != kw.arg
                   for kw in passed.keywords)
        ):
            raise AssertionError("authenticated_child_blob_wrapper_arguments_invalid")

private_config = installer_assignments.get("GIT_PRIVATE_CONFIG")
if not isinstance(private_config, bytes):
    raise AssertionError("authenticated_child_private_git_configuration_missing")
for required in (
    b"fsmonitor = false\n", b"hooksPath = /dev/null\n",
    b"attributesFile = /dev/null\n", b"excludesFile = /dev/null\n",
    b"untrackedCache = false\n", b"splitIndex = false\n",
):
    if required not in private_config:
        raise AssertionError("authenticated_child_private_git_configuration_invalid")
environment_source = ast.get_source_segment(installer_text, snapshot_methods["_environment"]) or ""
for required in (
    '"GIT_DIR": str(self.private)',
    '"GIT_OBJECT_DIRECTORY": str(self.private / "objects")',
    '"GIT_NO_LAZY_FETCH": "1"',
    '"GIT_ALLOW_PROTOCOL": ""',
):
    if required not in environment_source:
        raise AssertionError("authenticated_child_snapshot_environment_invalid:" + required)

run_method = snapshot_methods["_run"]
operation_vectors = []
for node in ast.walk(run_method):
    if (
        isinstance(node, ast.Assign) and len(node.targets) == 1
        and isinstance(node.targets[0], ast.Name) and node.targets[0].id == "args"
    ):
        operation_vectors.append(tuple(ast.literal_eval(node.value)))
if set(operation_vectors) != {
    ("cat-file", "--batch"),
    ("ls-files", "--stage", "--sparse", "-v", "-z", "--full-name"),
    ("ls-files", "--others", "--exclude-standard", "-z", "--full-name", "--exclude=/.git/"),
} or len(operation_vectors) != 3:
    raise AssertionError("authenticated_child_git_operation_vectors_invalid")
subprocess_calls = [
    node for node in ast.walk(installer_ast)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
    and isinstance(node.func.value, ast.Name) and node.func.value.id == "subprocess"
]
if (
    len(subprocess_calls) != 1
    or subprocess_calls[0].func.attr != "Popen"
    or subprocess_calls[0] not in list(ast.walk(run_method))
):
    raise AssertionError("authenticated_child_git_process_boundary_invalid")

head = git(["rev-parse", "--verify", "HEAD"])
if len(head) != 40:
    raise AssertionError("head_invalid")

sealed_real_installer_source_plan(installer_raw, {
    INSTALLER_MARKER,
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "accepted_lock_id=" + installer_assignments["LOCK_ID"],
    "candidate_id=" + installer_assignments["CANDIDATE_ID"],
    "install_root=/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1",
    "create_only=true",
    "rename_noreplace_required=true",
    "launcher_execution_authorized=false",
    "native_execution_authorized=false",
    "binder_execution_authorized=false",
    "credential_access_authorized=false",
    "private_key_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "payment_acceptance_authorized=false",
    "public_presale_activation_authorized=false",
    "wc_void_market_activation_authorized=false",
    "treasury_liquidity_action_authorized=false",
    "funds_movement_authorized=false",
    "production_host_evidence_authority=false",
})

with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-proof-") as td:
    temp = Path(td)
    source = temp / "bootstrap.c"
    source.write_bytes(source_raw)

    for macro, diagnostic in (
        ("INSTALLER_SHA256", b"installer sha required"),
        ("INSTALLER_BYTES", b"installer bytes required"),
        ("APPLY_CONFIRM", b"apply confirm required"),
    ):
        missing = compile_bootstrap(
            source, temp / ("missing-" + macro.lower()),
            installer_sha=INSTALLER_SHA256,
            installer_bytes=INSTALLER_BYTES,
            omit_macro="VOID_E2_DORMANT_FIRST_ENTRY_BOOTSTRAP_" + macro,
        )
        if missing.returncode == 0 or diagnostic not in missing.stderr:
            raise AssertionError("required_generation_macro_not_required:" + macro)

    production = temp / "production-bootstrap"
    prod_cp = compile_bootstrap(
        source,
        production,
        installer_sha=INSTALLER_SHA256,
        installer_bytes=INSTALLER_BYTES,
    )
    if prod_cp.returncode != 0:
        raise AssertionError(
            "production_compile_failed:"
            + prod_cp.stderr.decode("utf-8", "replace")[-3000:]
        )
    if prod_cp.stdout or prod_cp.stderr:
        raise AssertionError("production_compile_produced_output")
    require_static(production)
    self_test = run([os.fspath(production), "--self-test"])
    if self_test.stderr:
        raise AssertionError("self_test_stderr")
    required_self = {
        MARKER + "_SELF_TEST_GREEN",
        "installer_snapshot_sha256=" + INSTALLER_SHA256,
        "installer_snapshot_bytes=" + str(INSTALLER_BYTES),
        "static_native_first_instruction_required=true",
        "exact_installer_snapshot_compile_bound=true",
        "runtime_expected_head_strict_hex_required=true",
        "runtime_expected_head_forwarded_to_authenticated_child=true",
        "sealed_installer_memfd_required=true",
        "fixed_python_policy_bound=true",
        "caller_stdin_must_be_devnull=true",
        "strict_plan_apply_argv=true",
        "child_environment_closed=true",
        "direct_root_python_authoritative=false",
        "protected_install_authorized=false",
        "funds_movement=false",
    }
    if not required_self.issubset(set(self_test.stdout.decode().splitlines())):
        raise AssertionError("self_test_markers_missing")

    for name, digest, count, confirmation in (
        ("zero-bytes", INSTALLER_SHA256, 0, CONFIRM),
        ("oversize", INSTALLER_SHA256, 2 * 1024 * 1024 + 1, CONFIRM),
        ("bad-digest", "g" * 64, INSTALLER_BYTES, CONFIRM),
        ("bad-confirm", INSTALLER_SHA256, INSTALLER_BYTES, "WRONG_CONFIRM"),
    ):
        invalid_binary = temp / ("invalid-self-test-" + name)
        invalid_compile = compile_bootstrap(
            source, invalid_binary,
            installer_sha=digest, installer_bytes=count, confirm=confirmation,
        )
        if invalid_compile.returncode != 0 or invalid_compile.stdout or invalid_compile.stderr:
            raise AssertionError("invalid_binding_fixture_compile_failed:" + name)
        invalid_run = run([os.fspath(invalid_binary), "--self-test"], check=False)
        if invalid_run.returncode == 0 or invalid_run.stdout or invalid_run.stderr:
            raise AssertionError("invalid_binding_self_test_not_silent_rejection:" + name)

    fixture_root = Path(
        "/root/void-e2-first-entry-protected-install-bootstrap-v4-proof-"
        + temp.name
    )
    fixture_installer_local = temp / "fixture-installer.py"
    marker = temp / "child-started"
    fixture_source = f"""#!/usr/bin/env python3
import argparse
import os
import pathlib
import time

marker = pathlib.Path({os.fspath(marker)!r})
p = argparse.ArgumentParser()
mode = p.add_mutually_exclusive_group(required=True)
mode.add_argument("--plan", action="store_true")
mode.add_argument("--apply", action="store_true")
p.add_argument("--launcher", required=True)
p.add_argument("--native", required=True)
p.add_argument("--expected-head", required=True)
p.add_argument("--expected-plan-id", default="")
p.add_argument("--confirm", default="")
a = p.parse_args()
for forbidden in (
    "LD_PRELOAD", "LD_LIBRARY_PATH", "LD_AUDIT", "LD_DEBUG",
    "PYTHONPATH", "PYTHONHOME", "PYTHONSTARTUP", "PYTHONINSPECT",
    "PYTHONWARNINGS", "PYTHONBREAKPOINT",
):
    assert forbidden not in os.environ, forbidden
assert os.environ == {{
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
}}
assert a.expected_head in {{"1" * 40, "2" * 40}}
print("FIXTURE_EXPECTED_HEAD=" + a.expected_head)
assert a.launcher == "/tmp/accepted-launcher"
assert a.native == "/tmp/accepted-native"
marker.write_text("started\\n", encoding="utf-8")
time.sleep(0.45)
if a.plan:
    assert a.expected_plan_id == ""
    assert a.confirm == ""
    print("FIXTURE_PROTECTED_INSTALL_PLAN_GREEN")
else:
    assert a.expected_plan_id == {PLAN_PREFIX + "a" * 64!r}
    assert a.confirm == {CONFIRM!r}
    print("FIXTURE_PROTECTED_INSTALL_APPLY_GREEN")
""".encode("utf-8")
    fixture_installer_local.write_bytes(fixture_source)
    fixture_installer_local.chmod(0o644)

    fixture_binary = temp / "fixture-bootstrap"
    fixture_cp = compile_bootstrap(
        source,
        fixture_binary,
        installer_sha=sha256(fixture_source),
        installer_bytes=len(fixture_source),
        fixture_root=fixture_root,
        fixture_installer=fixture_root / "installer.py",
    )
    if fixture_cp.returncode != 0 or fixture_cp.stdout or fixture_cp.stderr:
        raise AssertionError(
            "fixture_compile_failed:"
            + fixture_cp.stderr.decode("utf-8", "replace")[-3000:]
        )
    require_static(fixture_binary)

    python_raw, python_sha = python_identity()
    policy = (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + python_sha + "\n"
        + "python_bytes=" + str(len(python_raw)) + "\n"
    ).encode("ascii")

    fixed_self, fixed_installer = install_root_fixture(
        fixture_root,
        fixture_binary,
        fixture_installer_local,
        policy,
    )

    plan_argv = [
        os.fspath(fixed_self),
        "--installer-plan",
        "--launcher", "/tmp/accepted-launcher",
        "--native", "/tmp/accepted-native",
        "--expected-head", "1" * 40,
    ]
    apply_argv = [
        os.fspath(fixed_self),
        "--installer-apply",
        "--launcher", "/tmp/accepted-launcher",
        "--native", "/tmp/accepted-native",
        "--expected-head", "1" * 40,
        "--expected-plan-id", PLAN_PREFIX + "a" * 64,
        "--confirm", CONFIRM,
    ]

    try:
        marker.unlink(missing_ok=True)
        good_plan = sudo(plan_argv)
        out = good_plan.stdout.decode("utf-8", "strict")
        if (
            "FIXTURE_PROTECTED_INSTALL_PLAN_GREEN" not in out
            or "FIXTURE_EXPECTED_HEAD=" + "1" * 40 not in out
            or MARKER + "_GREEN" not in out
            or "privileged_first_entry_authenticated=true" not in out
            or "expected_head_forwarded=true" not in out
            or "expected_head_authenticated_by_child=true" not in out
            or "installer_snapshot_sealed=true" not in out
            or "installer_apply_performed=false" not in out
        ):
            raise AssertionError("fixture_plan_not_green")
        if not marker.exists():
            raise AssertionError("fixture_child_not_executed")

        marker.unlink(missing_ok=True)
        alternate = list(plan_argv)
        alternate[-1] = "2" * 40
        alternate_run = sudo(alternate)
        alternate_out = alternate_run.stdout.decode("utf-8", "strict")
        if (
            "FIXTURE_EXPECTED_HEAD=" + "2" * 40 not in alternate_out
            or MARKER + "_GREEN" not in alternate_out
            or "expected_head_forwarded=true" not in alternate_out
            or "expected_head_authenticated_by_child=true" not in alternate_out
            or not marker.exists()
        ):
            raise AssertionError("alternate_runtime_expected_head_not_forwarded")

        for malformed in ("", "f" * 39, "f" * 41, "A" * 40, "g" * 40):
            marker.unlink(missing_ok=True)
            bad_head = list(plan_argv)
            bad_head[-1] = malformed
            bad_head_run = sudo(bad_head, check=False)
            if (
                bad_head_run.returncode == 0
                or b"bootstrap_arguments_invalid" not in bad_head_run.stderr
                or b"installer_python_started=false" not in bad_head_run.stderr
                or marker.exists()
            ):
                raise AssertionError("malformed_runtime_expected_head_not_rejected")

        marker.unlink(missing_ok=True)
        copied_self = fixture_root / "bin" / "copied-bootstrap-v4"
        sudo([
            "/usr/bin/install", "-o", "root", "-g", "root", "-m", "0555",
            os.fspath(fixed_self), os.fspath(copied_self),
        ])
        wrong_self = sudo([os.fspath(copied_self), *plan_argv[1:]], check=False)
        if (
            wrong_self.returncode == 0
            or b"bootstrap_fixed_self_path_required" not in wrong_self.stderr
            or b"installer_python_started=false" not in wrong_self.stderr
            or marker.exists()
        ):
            raise AssertionError("copied_bootstrap_path_not_rejected_prechild")

        marker.unlink(missing_ok=True)
        sudo(["/usr/bin/chmod", "0775", os.fspath(fixed_self)])
        try:
            writable_self = sudo(plan_argv, check=False)
            if (
                writable_self.returncode == 0
                or b"bootstrap_self_custody_invalid" not in writable_self.stderr
                or b"installer_python_started=false" not in writable_self.stderr
                or marker.exists()
            ):
                raise AssertionError("group_writable_bootstrap_not_rejected_prechild")
        finally:
            sudo(["/usr/bin/chmod", "0555", os.fspath(fixed_self)])

        marker.unlink(missing_ok=True)
        stdin_attack = sudo(
            plan_argv,
            check=False,
            input_bytes=b"print('ATTACK')\n",
        )
        if (
            stdin_attack.returncode == 0
            or b"bootstrap_stdin_must_be_devnull" not in stdin_attack.stderr
            or b"installer_python_started=false" not in stdin_attack.stderr
            or marker.exists()
        ):
            raise AssertionError("caller_stdin_not_rejected_prechild")

        for rejected_confirm in (
            "WRONG_CONFIRM",
            "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY",
            "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V2_CREATE_ONLY",
        ):
            marker.unlink(missing_ok=True)
            bad_confirm = list(apply_argv)
            bad_confirm[-1] = rejected_confirm
            wrong = sudo(bad_confirm, check=False)
            if (
                wrong.returncode == 0
                or b"bootstrap_arguments_invalid" not in wrong.stderr
                or b"installer_python_started=false" not in wrong.stderr
                or marker.exists()
            ):
                raise AssertionError("wrong_confirmation_not_rejected_prechild")

        for previous_prefix in (
            "voidbuye2dormantfirstentryinstall1_",
            "voidbuye2dormantfirstentryinstall2_",
        ):
            marker.unlink(missing_ok=True)
            old_plan = list(apply_argv)
            old_plan[9] = previous_prefix + "a" * 64
            old_plan_run = sudo(old_plan, check=False)
            if (
                old_plan_run.returncode == 0
                or b"bootstrap_arguments_invalid" not in old_plan_run.stderr
                or b"installer_python_started=false" not in old_plan_run.stderr
                or marker.exists()
            ):
                raise AssertionError("previous_plan_prefix_not_rejected_prechild")

        mutated_local = temp / "mutated-installer.py"
        mutated_local.write_text("raise SystemExit('mutated')\n", encoding="utf-8")
        replace_root_file(mutated_local, fixed_installer)
        marker.unlink(missing_ok=True)
        prelaunch = sudo(plan_argv, check=False)
        if (
            prelaunch.returncode == 0
            or b"bootstrap_installer_size_mismatch" not in prelaunch.stderr
            or b"installer_python_started=false" not in prelaunch.stderr
            or marker.exists()
        ):
            raise AssertionError("prelaunch_installer_substitution_not_rejected")
        replace_root_file(fixture_installer_local, fixed_installer)

        same_size_local = temp / "same-size-installer.py"
        same_size_raw = fixture_source.replace(
            b"FIXTURE_PROTECTED_INSTALL_PLAN_GREEN",
            b"FIXTURE_PROTECTED_INSTALL_PLAN_ROGUE",
        )
        if same_size_raw == fixture_source or len(same_size_raw) != len(fixture_source):
            raise AssertionError("same_size_substitution_fixture_invalid")
        same_size_local.write_bytes(same_size_raw)
        replace_root_file(same_size_local, fixed_installer)
        marker.unlink(missing_ok=True)
        wrong_digest = sudo(plan_argv, check=False)
        if (
            wrong_digest.returncode == 0
            or b"bootstrap_installer_sha256_mismatch" not in wrong_digest.stderr
            or b"installer_python_started=false" not in wrong_digest.stderr
            or marker.exists()
        ):
            raise AssertionError("same_size_installer_substitution_not_rejected")
        replace_root_file(fixture_installer_local, fixed_installer)

        bad_policy = (
            "schema=" + POLICY_SCHEMA + "\n"
            + "python_sha256=" + "0" * 64 + "\n"
            + "python_bytes=" + str(len(python_raw)) + "\n"
        ).encode("ascii")
        bad_policy_local = temp / "bad-policy"
        bad_policy_local.write_bytes(bad_policy)
        replace_root_file(bad_policy_local, fixture_root / "policy-v1.conf")
        marker.unlink(missing_ok=True)
        py_bad = sudo(plan_argv, check=False)
        if (
            py_bad.returncode == 0
            or b"bootstrap_python_sha256_mismatch" not in py_bad.stderr
            or b"installer_python_started=false" not in py_bad.stderr
            or marker.exists()
        ):
            raise AssertionError("python_policy_mismatch_not_rejected_prechild")
        good_policy_local = temp / "good-policy"
        good_policy_local.write_bytes(policy)
        replace_root_file(good_policy_local, fixture_root / "policy-v1.conf")

        marker.unlink(missing_ok=True)
        hostile = sudo(
            plan_argv,
            env={
                "LD_PRELOAD": "/definitely/not/a/library.so",
                "LD_LIBRARY_PATH": "/tmp/evil",
                "LD_AUDIT": "/tmp/evil-audit.so",
                "PYTHONPATH": "/tmp/evil-python",
                "PYTHONHOME": "/tmp/evil-home",
                "PYTHONSTARTUP": "/tmp/evil-startup",
                "PYTHONINSPECT": "1",
                "PYTHONWARNINGS": "error",
                "PYTHONBREAKPOINT": "evil.breakpoint",
            },
        )
        if (
            b"FIXTURE_PROTECTED_INSTALL_PLAN_GREEN" not in hostile.stdout
            or b"privileged_first_entry_authenticated=true" not in hostile.stdout
        ):
            raise AssertionError("closed_child_environment_not_proven")

        for operation, argv, child_green in (
            ("plan", plan_argv, b"FIXTURE_PROTECTED_INSTALL_PLAN_GREEN"),
            ("apply", apply_argv, b"FIXTURE_PROTECTED_INSTALL_APPLY_GREEN"),
        ):
            marker.unlink(missing_ok=True)
            proc = subprocess.Popen(
                ([] if os.geteuid() == 0 else ["sudo", "-n"]) + argv,
                cwd=ROOT,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=BASE_ENV,
            )
            try:
                deadline = time.monotonic() + 5.0
                while not marker.exists() and time.monotonic() < deadline:
                    time.sleep(0.01)
                if not marker.exists():
                    raise AssertionError("midchild_marker_timeout:" + operation)
                replace_root_file(mutated_local, fixed_installer)
                stdout, stderr = proc.communicate(timeout=10)
                if (
                    proc.returncode == 0
                    or child_green not in stdout
                    or (MARKER + "_GREEN").encode("ascii") in stdout
                    or b"bootstrap_installer_visible_generation_changed_after_child" not in stderr
                    or b"privileged_first_entry_authenticated=false" not in stderr
                    or b"installer_python_started=true" not in stderr
                ):
                    raise AssertionError("midchild_visible_installer_drift_not_held:" + operation)
                if operation == "apply" and (
                    b"installer_apply_state=unknown_or_partial_if_child_created" not in stderr
                    or b"installer_apply_performed=false" in stderr
                ):
                    raise AssertionError("canonical_apply_partial_state_receipt_lost")
            finally:
                if proc.poll() is None:
                    proc.kill()
                    proc.wait(timeout=10)
                replace_root_file(fixture_installer_local, fixed_installer)

        marker.unlink(missing_ok=True)
        good_apply = sudo(apply_argv)
        apply_out = good_apply.stdout.decode("utf-8", "strict")
        if (
            "FIXTURE_PROTECTED_INSTALL_APPLY_GREEN" not in apply_out
            or "operation=installer_apply" not in apply_out
            or "installer_apply_child_exit_success=true" not in apply_out
            or "privileged_first_entry_authenticated=true" not in apply_out
        ):
            raise AssertionError("fixture_apply_handoff_not_green")
    finally:
        sudo(["/usr/bin/rm", "-rf", "--", os.fspath(fixture_root)], check=False)

print(MARKER + "_PROOF_GREEN")
print("repaired_v3_installer_blob_bound=true")
print("repaired_v3_installer_sha256_bound=true")
print("historical_v1_installer_and_v1_v2_bootstrap_sources_preserved=true")
print("canonical_v2_installer_and_v3_bootstrap_sources_preserved=true")
print("canonical_v2_terminal_proof_preserved=true")
print("canonical_v3_bootstrap_behavior_preserved=true")
print("accepted_payload_lock_and_runtime_installer_preserved=true")
print("canonical_v2_bootstrap_lock_v3_preserved=true")
print("canonical_v3_bootstrap_lock_v4_preserved=true")
print("authenticated_child_v3_confirmation_and_plan_prefix_bound=true")
print("authenticated_child_private_repository_snapshot_source_bound=true")
print("authenticated_child_snapshot_wrappers_bound=true")
print("authenticated_child_closed_git_operation_vectors_bound=true")
print("authenticated_child_git_owner_execute_contract_bound=true")
print("authenticated_child_module_root_resolution_absent=true")
print("canonical_inert_source_plan_preserved=true")
print("real_v3_installer_sealed_memfd_source_identity_verified=true")
print("real_v3_installer_memfd_write_seal_verified=true")
print("real_v3_installer_source_plan_executed=true")
print("real_v3_installer_host_plan_executed=false")
print("installed_payload_namespace_unchanged=true")
print("af_alg_multichunk_sha256_finalization_required=true")
print("required_compile_generation_macros=true")
print("invalid_compile_bindings_rejected_by_self_test=true")
print("production_bootstrap_static=true")
print("production_bootstrap_no_pt_interp=true")
print("production_bootstrap_no_dynamic_needed=true")
print("exact_installer_snapshot_compile_bound=true")
print("compile_time_expected_head_required=false")
print("runtime_expected_head_strict_hex_required=true")
print("runtime_expected_head_forwarded_to_authenticated_child=true")
print("authenticated_child_checkout_head_contract_bound=true")
print("alternate_runtime_expected_head_forwarded=true")
print("malformed_runtime_expected_head_rejected_prechild=true")
print("sealed_installer_memfd_required=true")
print("fixed_python_policy_bound=true")
print("copied_bootstrap_path_rejected_prechild=true")
print("group_writable_bootstrap_rejected_prechild=true")
print("caller_stdin_rejected_prechild=true")
print("wrong_confirmation_rejected_prechild=true")
print("previous_installer_confirmation_rejected_prechild=true")
print("previous_installer_plan_prefix_rejected_prechild=true")
print("prelaunch_installer_substitution_rejected=true")
print("same_size_installer_substitution_rejected=true")
print("python_policy_mismatch_rejected_prechild=true")
print("hostile_loader_python_environment_removed=true")
print("midchild_visible_installer_drift_withholds_green=true")
print("sealed_snapshot_child_survives_visible_replacement=true")
print("canonical_apply_partial_state_receipt_preserved=true")
print("strict_plan_apply_argv=true")
print("direct_root_python_authoritative=false")
print("real_v3_installer_apply_executed=false")
print("full_issue_3413_closure_proven=false")
print("prechild_immutable_dependency_manifest_verified=false")
print("private_parent_proof_verified=false")
print("candidate_artifact_accepted=false")
print("production_host_evidence_authority=false")
print("precision_filesystem_mutation=false")
print("protected_install_authorized=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
