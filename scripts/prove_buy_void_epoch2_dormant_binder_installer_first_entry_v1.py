#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import os
import pathlib
import shutil
import subprocess
import tempfile
import textwrap
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = (
    ROOT / "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1.c"
)
WORKFLOW = (
    ROOT / ".github/workflows/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-v1.yml"
)

TARGET_BLOB = "6ebd3d7f7f87250f5583a9a93d07cd46b20e0669"
MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1"
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1"
)
EXPECTED_HEAD = "1" * 40
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_DORMANT_BINDER_V2_CREATE_ONLY"

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()

def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()

def run(
    argv: list[str],
    *,
    check: bool = True,
    env: dict[str, str] | None = None,
    input_text: str | None = None,
    timeout: int = 60,
) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    result = subprocess.run(
        argv,
        input=input_text,
        stdin=None if input_text is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env=merged,
        check=False,
        timeout=timeout,
    )
    if check and result.returncode != 0:
        raise AssertionError(
            f"command failed rc={result.returncode}: {argv!r}\n"
            f"stdout={result.stdout}\nstderr={result.stderr}"
        )
    return result

def sudo(
    argv: list[str],
    *,
    check: bool = True,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    return run(["sudo", "-n", *argv], check=check, input_text=input_text)

def sudo_env(
    env: dict[str, str],
    argv: list[str],
    *,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    assignments = [f"{key}={value}" for key, value in sorted(env.items())]
    return run(["sudo", "-n", "env", *assignments, *argv], check=check)

def install_file(local: pathlib.Path, remote: pathlib.Path, mode: str) -> None:
    sudo([
        "/usr/bin/install", "-o", "root", "-g", "root", "-m", mode,
        str(local), str(remote),
    ])

def write_local(path: pathlib.Path, raw: bytes, mode: int = 0o644) -> None:
    path.write_bytes(raw)
    path.chmod(mode)

def wait_for(path: pathlib.Path, timeout: float = 5.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if path.exists():
            return
        time.sleep(0.01)
    raise AssertionError("timed out waiting for fixture marker")

def compile_candidate(
    *,
    output: pathlib.Path,
    fixture_root: pathlib.Path,
    installer_raw: bytes,
    native_raw: bytes,
) -> None:
    argv = [
        shutil.which("cc") or "cc",
        "-O2", "-std=c11", "-Wall", "-Wextra", "-Werror", "-static",
        f'-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_ROOT="{fixture_root}"',
        f'-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_PYTHON="{fixture_root / "python3"}"',
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_SHA256="'
            + sha256(installer_raw) + '"'
        ),
        (
            "-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_INSTALLER_BYTES="
            + str(len(installer_raw)) + "U"
        ),
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_SHA256="'
            + sha256(native_raw) + '"'
        ),
        (
            "-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_NATIVE_BYTES="
            + str(len(native_raw)) + "U"
        ),
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_EXPECTED_HEAD="'
            + EXPECTED_HEAD + '"'
        ),
        (
            '-DVOID_E2_DORMANT_BINDER_INSTALLER_ENTRY_APPLY_CONFIRM="'
            + CONFIRM + '"'
        ),
        str(TARGET), "-o", str(output),
    ]
    run(argv)

def require_static(binary: pathlib.Path) -> None:
    result = run(["readelf", "-lW", str(binary)])
    assert " INTERP " not in result.stdout
    assert "Requesting program interpreter" not in result.stdout
    dyn = run(["readelf", "-dW", str(binary)], check=False)
    assert "NEEDED" not in dyn.stdout

source_raw = TARGET.read_bytes()
source = source_raw.decode("utf-8")
assert git_blob(source_raw) == TARGET_BLOB

for required in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1",
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1",
    '#error "exact dormant-binder installer SHA-256 must be supplied at build time"',
    '#error "exact dormant-binder native candidate SHA-256 must be supplied at build time"',
    '#error "exact accepted repository head must be supplied at build time"',
    '#error "exact installer confirmation token must be supplied at build time"',
    "dormant_binder_installer_first_entry_stdin_python_source_forbidden",
    "fexecve(python.fd, next_argv, envp)",
    '"/proc/self/fd/%d"',
    '"PATH=/usr/bin:/bin"',
    '"HOME=/root"',
    '"LANG=C"',
    '"LC_ALL=C"',
    '"TZ=UTC"',
    "post_child_generation_revalidation=true",
    "stale_candidate_lock_promoted=false",
):
    assert required in source, required

for forbidden in (
    "voidbuye2dormantbinderlock2_34df",
    "voidbuye2dormantbindercand2_3427",
    "--qualifier-run",
    "OP_QUALIFIER_RUN",
    "PYTHONPATH=",
    "PYTHONHOME=",
    "PYTHONSTARTUP=",
    "PYTHONINSPECT=",
    "PYTHONWARNINGS=",
    "LD_PRELOAD=",
    "LD_LIBRARY_PATH=",
):
    assert forbidden not in source, forbidden

# The source cannot accidentally build without a concrete accepted generation.
missing_generation = run(
    [
        shutil.which("cc") or "cc",
        "-O2", "-std=c11", "-Wall", "-Wextra", "-Werror", "-static",
        str(TARGET), "-o", os.devnull,
    ],
    check=False,
)
assert missing_generation.returncode != 0
assert "must be supplied at build time" in missing_generation.stderr

with tempfile.TemporaryDirectory(
    prefix="void-e2-dormant-binder-first-entry-proof-"
) as td:
    temp = pathlib.Path(td)
    fixture_root = pathlib.Path(
        f"/root/void-e2-dormant-binder-first-entry-proof-{os.getpid()}"
    )
    binary_local = temp / "preentry"
    installer_local = temp / "installer.py"
    native_local = temp / "native-candidate"
    invocation_marker = temp / "invoked"
    abnormal_control = temp / "abnormal"

    installer_text = textwrap.dedent(
        f"""\
        #!/usr/bin/env python3
        import argparse
        import os
        import pathlib
        import signal
        import time

        marker = pathlib.Path({str(invocation_marker)!r})
        abnormal = pathlib.Path({str(abnormal_control)!r})
        parser = argparse.ArgumentParser()
        mode = parser.add_mutually_exclusive_group(required=True)
        mode.add_argument("--plan", action="store_true")
        mode.add_argument("--apply", action="store_true")
        parser.add_argument("--native", required=True)
        parser.add_argument("--expected-head", required=True)
        parser.add_argument("--confirm", default="")
        args = parser.parse_args()
        marker.write_text("invoked\\n", encoding="utf-8")
        assert pathlib.Path(args.native) == pathlib.Path(
            {str(fixture_root / "input/void_buy_void_epoch2_dormant_binder_native_candidate_v2")!r}
        )
        assert args.expected_head == {EXPECTED_HEAD!r}
        if args.plan:
            assert args.confirm == ""
            time.sleep(0.35)
            print("FIXTURE_DORMANT_BINDER_INSTALLER_PLAN_GREEN")
        else:
            assert args.confirm == {CONFIRM!r}
            if abnormal.exists():
                os.kill(os.getpid(), signal.SIGKILL)
            time.sleep(0.35)
            print("FIXTURE_DORMANT_BINDER_INSTALLER_APPLY_GREEN")
        """
    ).encode("utf-8")
    native_raw = b"VOID_DORMANT_BINDER_SYNTHETIC_NATIVE_V2\n"
    write_local(installer_local, installer_text)
    write_local(native_local, native_raw)

    compile_candidate(
        output=binary_local,
        fixture_root=fixture_root,
        installer_raw=installer_text,
        native_raw=native_raw,
    )
    require_static(binary_local)

    self_test = run([str(binary_local), "--self-test"])
    for marker in (
        MARKER + "_SELF_TEST_GREEN",
        "static_native_first_instruction_required=true",
        "caller_stdin_never_python_source=true",
        "caller_stdin_must_be_devnull=true",
        "installer_generation_compile_bound=true",
        "native_candidate_generation_compile_bound=true",
        "expected_head_compile_bound=true",
        "apply_confirmation_compile_bound=true",
        "python_generation_root_policy_bound=true",
        "stale_candidate_lock_promoted=false",
        "protected_install_authorized=false",
    ):
        assert marker in self_test.stdout, marker

    python_real = pathlib.Path("/usr/bin/python3").resolve()
    python_raw = python_real.read_bytes()
    policy_local = temp / "policy-v1.conf"
    policy_local.write_text(
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + sha256(python_raw) + "\n"
        + "python_bytes=" + str(len(python_raw)) + "\n",
        encoding="utf-8",
    )

    preentry = (
        fixture_root / "bin/"
        "void_buy_void_epoch2_dormant_binder_installer_first_entry_v1"
    )
    installer_remote = (
        fixture_root / "source/ops/precision/"
        "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
    )
    native_remote = (
        fixture_root / "input/"
        "void_buy_void_epoch2_dormant_binder_native_candidate_v2"
    )
    python_link = fixture_root / "python3"

    try:
        sudo(["/usr/bin/rm", "-rf", str(fixture_root)])
        for directory in (
            fixture_root,
            fixture_root / "bin",
            fixture_root / "source",
            fixture_root / "source/ops",
            fixture_root / "source/ops/precision",
            fixture_root / "input",
        ):
            sudo(["/usr/bin/mkdir", "-p", str(directory)])
            sudo(["/usr/bin/chown", "root:root", str(directory)])
            sudo(["/usr/bin/chmod", "0755", str(directory)])

        install_file(binary_local, preentry, "0555")
        install_file(policy_local, fixture_root / "policy-v1.conf", "0444")
        install_file(installer_local, installer_remote, "0444")
        install_file(native_local, native_remote, "0444")
        sudo(["/usr/bin/ln", "-s", "/usr/bin/python3", str(python_link)])

        plan = sudo([str(preentry), "--installer-plan"])
        assert "FIXTURE_DORMANT_BINDER_INSTALLER_PLAN_GREEN" in plan.stdout
        assert MARKER + "_GREEN" in plan.stdout
        assert "operation=installer_plan" in plan.stdout
        assert "privileged_first_entry_authenticated=true" in plan.stdout
        assert "installer_apply_performed=false" in plan.stdout

        apply = sudo([
            str(preentry), "--installer-apply", "--confirm", CONFIRM
        ])
        assert "FIXTURE_DORMANT_BINDER_INSTALLER_APPLY_GREEN" in apply.stdout
        assert MARKER + "_GREEN" in apply.stdout
        assert "operation=installer_apply" in apply.stdout
        assert "installer_apply_child_exit_success=true" in apply.stdout

        if invocation_marker.exists():
            invocation_marker.unlink()
        wrong_confirm = sudo(
            [str(preentry), "--installer-apply", "--confirm", "WRONG_CONFIRM"],
            check=False,
        )
        assert wrong_confirm.returncode == 2
        assert "arguments_invalid" in wrong_confirm.stderr
        assert "child_process_created=false" in wrong_confirm.stderr
        assert "installer_apply_performed=false" in wrong_confirm.stderr
        assert not invocation_marker.exists()

        if invocation_marker.exists():
            invocation_marker.unlink()
        arbitrary_stdin = sudo(
            [str(preentry), "--installer-plan"],
            check=False,
            input_text="print('ATTACKER_ROOT_PYTHON_EXECUTED')\n",
        )
        assert arbitrary_stdin.returncode == 2
        assert "stdin_python_source_forbidden" in arbitrary_stdin.stderr
        assert "child_process_created=false" in arbitrary_stdin.stderr
        assert not invocation_marker.exists()

        mutated_installer = temp / "mutated-installer.py"
        mutated_installer.write_bytes(installer_text + b"# mutation\n")
        install_file(mutated_installer, installer_remote, "0444")
        bad_installer = sudo([str(preentry), "--installer-plan"], check=False)
        assert bad_installer.returncode == 2
        assert "installer_identity_mismatch" in bad_installer.stderr
        assert "child_process_created=false" in bad_installer.stderr
        install_file(installer_local, installer_remote, "0444")

        mutated_native = temp / "mutated-native"
        mutated_native.write_bytes(native_raw + b"mutation\n")
        install_file(mutated_native, native_remote, "0444")
        bad_native = sudo([str(preentry), "--installer-plan"], check=False)
        assert bad_native.returncode == 2
        assert "native_input_identity_mismatch" in bad_native.stderr
        assert "child_process_created=false" in bad_native.stderr
        install_file(native_local, native_remote, "0444")

        sudo(["/usr/bin/rm", str(python_link)])
        sudo(["/usr/bin/ln", "-s", "/bin/false", str(python_link)])
        bad_python = sudo([str(preentry), "--installer-plan"], check=False)
        assert bad_python.returncode == 2
        assert "python_identity_mismatch" in bad_python.stderr
        assert "child_process_created=false" in bad_python.stderr
        sudo(["/usr/bin/rm", str(python_link)])
        sudo(["/usr/bin/ln", "-s", "/usr/bin/python3", str(python_link)])

        # The source is descriptor-retained: replacing the visible pathname
        # while the child runs cannot change executed bytes, but parent GREEN
        # is refused after visible-generation revalidation.
        if invocation_marker.exists():
            invocation_marker.unlink()
        race = subprocess.Popen(
            ["sudo", "-n", str(preentry), "--installer-plan"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
        )
        wait_for(invocation_marker)
        replacement = temp / "installer-replacement.py"
        replacement.write_bytes(installer_text)
        install_file(
            replacement,
            installer_remote.with_suffix(".replacement"),
            "0444",
        )
        sudo([
            "/usr/bin/mv", "-f",
            str(installer_remote.with_suffix(".replacement")),
            str(installer_remote),
        ])
        race_stdout, race_stderr = race.communicate(timeout=20)
        assert race.returncode == 2
        assert "FIXTURE_DORMANT_BINDER_INSTALLER_PLAN_GREEN" in race_stdout
        assert MARKER + "_GREEN" not in race_stdout
        assert "installer_generation_changed" in race_stderr
        assert "child_process_created=true" in race_stderr
        install_file(installer_local, installer_remote, "0444")

        abnormal_control.write_text("1\n", encoding="utf-8")
        abnormal = sudo(
            [str(preentry), "--installer-apply", "--confirm", CONFIRM],
            check=False,
        )
        abnormal_control.unlink()
        assert abnormal.returncode == 2
        assert "child_not_cleanly_exited" in abnormal.stderr
        assert "child_process_created=true" in abnormal.stderr
        assert (
            "installer_apply_state=unknown_or_partial_if_child_created"
            in abnormal.stderr
        )
        assert "installer_apply_performed=false" not in abnormal.stderr

        preload_marker = temp / "preload-marker"
        preload_c = temp / "preload.c"
        preload_so = temp / "preload.so"
        preload_c.write_text(
            "#include <stdio.h>\n"
            "__attribute__((constructor)) static void mark(void){"
            f'FILE*f=fopen("{preload_marker}","w");'
            'if(f){fputs("loaded\\n",f);fclose(f);}}\n',
            encoding="utf-8",
        )
        run([
            shutil.which("cc") or "cc",
            "-shared", "-fPIC", str(preload_c), "-o", str(preload_so),
        ])
        run(["/usr/bin/true"], env={"LD_PRELOAD": str(preload_so)})
        assert preload_marker.exists()
        preload_marker.unlink()
        protected_loader = sudo_env(
            {
                "LD_PRELOAD": str(preload_so),
                "LD_LIBRARY_PATH": "/definitely/not/a/library/path",
                "LD_AUDIT": "/definitely/not/an/audit.so",
            },
            [str(preentry), "--installer-plan"],
        )
        assert MARKER + "_GREEN" in protected_loader.stdout
        assert not preload_marker.exists()

        python_marker = temp / "pythonpath-marker"
        evil_dir = temp / "evil-pythonpath"
        evil_dir.mkdir()
        (evil_dir / "sitecustomize.py").write_text(
            f"open({str(python_marker)!r},'w').write('loaded\\n')\n",
            encoding="utf-8",
        )
        run([
            "/usr/bin/python3", "-c", "pass"
        ], env={"PYTHONPATH": str(evil_dir)})
        assert python_marker.exists()
        python_marker.unlink()
        protected_python = sudo_env(
            {
                "PYTHONPATH": str(evil_dir),
                "PYTHONHOME": "/definitely/not/a/python/home",
                "PYTHONSTARTUP": str(evil_dir / "sitecustomize.py"),
                "PYTHONINSPECT": "1",
                "PYTHONWARNINGS": "error",
                "PYTHONBREAKPOINT": "evil.breakpoint",
            },
            [str(preentry), "--installer-plan"],
        )
        assert MARKER + "_GREEN" in protected_python.stdout
        assert not python_marker.exists()

    finally:
        sudo(["/usr/bin/rm", "-rf", str(fixture_root)], check=False)

# Trigger parity is exact and per-event; execution-command occurrences do not count.
workflow = WORKFLOW.read_text(encoding="utf-8")
trigger = workflow.split("\npermissions:", 1)[0]
expected_paths = {
    ".github/workflows/buy-void-epoch2-dormant-binder-installer-first-entry-v1.yml",
    "docs/operators/buy-void-epoch2-dormant-binder-installer-first-entry-v1.md",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_v1.c",
    "scripts/prove_buy_void_epoch2_dormant_binder_installer_first_entry_v1.py",
}
for event,tail in (
    ("pull_request","  push:\n"),
    ("push","  workflow_dispatch:\n"),
):
    block = trigger.split("  "+event+":\n",1)[1].split(tail,1)[0]
    paths = {
        line.strip()[3:-1]
        for line in block.splitlines()
        if line.strip().startswith('- "')
    }
    assert paths == expected_paths,(event,paths)

print("VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_V1_PROOF_GREEN")
print("static_native_first_instruction=true")
print("generation_macros_required_no_defaults=true")
print("stale_candidate_lock_promoted=false")
print("caller_stdin_python_rejected_before_child=true")
print("wrong_confirmation_rejected_before_child=true")
print("installer_source_generation_bound_before_python=true")
print("native_candidate_generation_bound_before_python=true")
print("python_generation_bound_before_payload=true")
print("retained_installer_descriptor_execution=true")
print("post_child_generation_revalidation=true")
print("abnormal_apply_receipt_conservative=true")
print("ld_preload_dynamic_control_executes=true")
print("ld_preload_cannot_reach_static_preentry_or_python_child=true")
print("pythonpath_dynamic_control_executes=true")
print("caller_python_environment_cannot_reach_child=true")
print("protected_install_authorized=false")
print("precision_apply_performed=false")
print("credential_content_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
