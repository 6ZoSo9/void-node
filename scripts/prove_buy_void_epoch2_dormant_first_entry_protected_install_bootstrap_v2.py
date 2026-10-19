#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[1]

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_V2"
SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c"
)
SOURCE_BLOB = "19f9baf8d6d707da43dbd0e247667af1a10e46c5"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py"
)
INSTALLER_BLOB = "383b84e71b371de65579e4113469e86a59b807ab"
INSTALLER_BYTES = 42_054
INSTALLER_SHA256 = (
    "e80b68e19d1498d57cffe2cd05a15cb22a6c2f1acb639175e2be2a2f1c18c9ef"
)
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V1_CREATE_ONLY"
PLAN_PREFIX = "voidbuye2dormantfirstentryinstall1_"
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V2"
)

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
) -> subprocess.CompletedProcess[bytes]:
    merged = dict(BASE_ENV)
    if env:
        merged.update(env)
    kwargs = {
        "cwd": ROOT,
        "stdout": subprocess.PIPE,
        "stderr": subprocess.PIPE,
        "env": merged,
        "check": False,
        "timeout": timeout,
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
    command = ["sudo", "-n"]
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
        ["/usr/bin/git", "--no-replace-objects", "-C", os.fspath(ROOT), *args],
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
            + CONFIRM
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
    sudo(["/usr/bin/rm", "-rf", os.fspath(fixture_root)], check=False)
    sudo([
        "/usr/bin/install", "-d", "-o", "root", "-g", "root", "-m", "0755",
        os.fspath(fixture_root),
        os.fspath(fixture_root / "bin"),
    ])
    fixed_self = (
        fixture_root
        / "bin"
        / "void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2"
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


source_raw = exact_file(SOURCE_REL, SOURCE_BLOB, 256 * 1024)
source_text = source_raw.decode("utf-8", "strict")
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
    raise AssertionError("merged_installer_identity_mismatch")
installer_text = installer_raw.decode("utf-8", "strict")
for required in (
    "def checkout_snapshot(expected_head: str)",
    'head = _git(["rev-parse", "--verify", "HEAD^{commit}"]).decode().strip()',
    'branch = _git(["symbolic-ref", "--short", "-q", "HEAD"]).decode().strip()',
    'status = _git(["status", "--porcelain=v1", "--untracked-files=all"])',
    "if head != expected_head:",
    'raise InstallError("checkout_head_mismatch")',
    'if branch != "main":',
    'raise InstallError("checkout_branch_not_main")',
    'if status != b"":',
    'raise InstallError("checkout_not_clean")',
    "accepted_lock(expected_head)",
):
    if required not in installer_text:
        raise AssertionError("authenticated_child_checkout_contract_missing:" + required)

head = git(["rev-parse", "--verify", "HEAD"])
if len(head) != 40:
    raise AssertionError("head_invalid")

with tempfile.TemporaryDirectory(prefix="void-e2-bootstrap-proof-") as td:
    temp = Path(td)
    source = temp / "bootstrap.c"
    source.write_bytes(source_raw)

    missing = run(
        [
            shutil.which("cc") or "/usr/bin/cc",
            "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", "-static",
            os.fspath(source), "-o", os.fspath(temp / "missing"),
        ],
        check=False,
    )
    if missing.returncode == 0:
        raise AssertionError("required_generation_macros_not_required")

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

    fixture_root = Path(
        "/root/void-e2-first-entry-protected-install-bootstrap-v2-proof-"
        + str(os.getpid())
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

        for malformed in ("f" * 39, "A" * 40, "g" * 40):
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

        marker.unlink(missing_ok=True)
        bad_confirm = list(apply_argv)
        bad_confirm[-1] = "WRONG_CONFIRM"
        wrong = sudo(bad_confirm, check=False)
        if (
            wrong.returncode == 0
            or b"bootstrap_arguments_invalid" not in wrong.stderr
            or b"installer_python_started=false" not in wrong.stderr
            or marker.exists()
        ):
            raise AssertionError("wrong_confirmation_not_rejected_prechild")

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

        marker.unlink(missing_ok=True)
        proc = subprocess.Popen(
            ["sudo", "-n", *plan_argv],
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=BASE_ENV,
        )
        deadline = time.monotonic() + 5.0
        while not marker.exists() and time.monotonic() < deadline:
            time.sleep(0.01)
        if not marker.exists():
            proc.kill()
            proc.wait()
            raise AssertionError("midchild_marker_timeout")
        replace_root_file(mutated_local, fixed_installer)
        stdout, stderr = proc.communicate(timeout=10)
        if (
            proc.returncode == 0
            or b"FIXTURE_PROTECTED_INSTALL_PLAN_GREEN" not in stdout
            or b"bootstrap_installer_visible_generation_changed_after_child" not in stderr
            or b"privileged_first_entry_authenticated=false" not in stderr
        ):
            raise AssertionError("midchild_visible_installer_drift_not_held")
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
        sudo(["/usr/bin/rm", "-rf", os.fspath(fixture_root)], check=False)

print(MARKER + "_PROOF_GREEN")
print("merged_3391_installer_blob_bound=true")
print("merged_3391_installer_sha256_bound=true")
print("af_alg_multichunk_sha256_finalization_required=true")
print("required_compile_generation_macros=true")
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
print("caller_stdin_rejected_prechild=true")
print("wrong_confirmation_rejected_prechild=true")
print("prelaunch_installer_substitution_rejected=true")
print("python_policy_mismatch_rejected_prechild=true")
print("hostile_loader_python_environment_removed=true")
print("midchild_visible_installer_drift_withholds_green=true")
print("sealed_snapshot_child_survives_visible_replacement=true")
print("strict_plan_apply_argv=true")
print("direct_root_python_authoritative=false")
print("real_3391_apply_executed=false")
print("precision_filesystem_mutation=false")
print("protected_install_authorized=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
