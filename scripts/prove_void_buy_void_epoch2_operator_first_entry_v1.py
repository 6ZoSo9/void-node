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
TARGET = ROOT / "ops/precision/void_buy_void_epoch2_operator_first_entry_v1.c"
INSTALLER = (
    ROOT
    / "ops/precision/void_buy_void_epoch2_live_composition_native_protected_install_v2.py"
)
QUALIFIER = (
    ROOT
    / "ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v2.py"
)

INSTALLER_BLOB = "c565c2f2327586e58100aaad4954602b85e7ebdb"
QUALIFIER_BLOB = "e8807d1acb8c7a81d52bf5b8f32b56c3446e28b5"
INSTALLER_SHA256 = "43d86d44fd47d21765879e149ae8328e1d645a7aa0172d9a180c212c3ca8b1fd"
QUALIFIER_SHA256 = "4f5cbc83cbe7cb2f7bf10b8dd564093d1d5e9af51b69705c1269e7d485d81969"
INSTALLER_BYTES = 46700
QUALIFIER_BYTES = 19661
MARKER = "VOID_BUY_VOID_EPOCH2_OPERATOR_FIRST_ENTRY_V1"
CONFIRM = "INSTALL_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V4_CREATE_ONLY"
PLAN_PREFIX = "voidbuye2nativeinstallplan2_"
EXPECTED_HEAD = "1" * 40
EXPECTED_PLAN_ID = PLAN_PREFIX + "a" * 64


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
    timeout: int = 60,
) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    result = subprocess.run(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
        env=merged,
        timeout=timeout,
        check=False,
    )
    if check and result.returncode != 0:
        raise AssertionError(
            f"command failed rc={result.returncode}: {argv!r}\n"
            f"stdout={result.stdout}\nstderr={result.stderr}"
        )
    return result


def sudo(argv: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run(["sudo", "-n", *argv], check=check)


def sudo_env(
    env: dict[str, str],
    argv: list[str],
    *,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    assignments = [f"{key}={value}" for key, value in sorted(env.items())]
    return run(["sudo", "-n", "env", *assignments, *argv], check=check)


def install_file(local: pathlib.Path, remote: pathlib.Path, mode: str) -> None:
    sudo(["install", "-o", "root", "-g", "root", "-m", mode, str(local), str(remote)])


def write_local(path: pathlib.Path, text: str, mode: int = 0o644) -> None:
    path.write_text(text, encoding="utf-8")
    path.chmod(mode)


def compile_candidate(
    *,
    source: pathlib.Path,
    output: pathlib.Path,
    fixture_root: pathlib.Path | None = None,
    installer_sha: str | None = None,
    installer_bytes: int | None = None,
    qualifier_sha: str | None = None,
    qualifier_bytes: int | None = None,
) -> None:
    argv = [
        shutil.which("cc") or "cc",
        "-O2",
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-static",
    ]
    if fixture_root is not None:
        argv += [
            f'-DVOID_E2_OPERATOR_ROOT="{fixture_root}"',
            f'-DVOID_E2_OPERATOR_PYTHON="{fixture_root / "python3"}"',
        ]
    if installer_sha is not None:
        argv += [
            f'-DVOID_E2_OPERATOR_INSTALLER_SHA256="{installer_sha}"',
            f"-DVOID_E2_OPERATOR_INSTALLER_BYTES={installer_bytes}U",
        ]
    if qualifier_sha is not None:
        argv += [
            f'-DVOID_E2_OPERATOR_QUALIFIER_SHA256="{qualifier_sha}"',
            f"-DVOID_E2_OPERATOR_QUALIFIER_BYTES={qualifier_bytes}U",
        ]
    argv += [str(source), "-o", str(output)]
    run(argv)


def require_static_elf(binary: pathlib.Path) -> None:
    header = run(["readelf", "-lW", str(binary)]).stdout
    assert " INTERP " not in header and "Requesting program interpreter" not in header
    dynamic = run(["readelf", "-dW", str(binary)], check=False)
    assert " NEEDED " not in dynamic.stdout


def wait_for(path: pathlib.Path, seconds: float = 5.0) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if path.exists():
            return
        time.sleep(0.02)
    raise AssertionError(f"timed out waiting for {path}")


source_raw = TARGET.read_bytes()
source = source_raw.decode("utf-8")
installer_raw = INSTALLER.read_bytes()
qualifier_raw = QUALIFIER.read_bytes()

assert git_blob(installer_raw) == INSTALLER_BLOB
assert git_blob(qualifier_raw) == QUALIFIER_BLOB
assert len(installer_raw) == INSTALLER_BYTES
assert len(qualifier_raw) == QUALIFIER_BYTES
assert sha256(installer_raw) == INSTALLER_SHA256
assert sha256(qualifier_raw) == QUALIFIER_SHA256

for required in [
    'VOID_BUY_VOID_EPOCH2_OPERATOR_FIRST_ENTRY_V1',
    'VOID_BUY_VOID_EPOCH2_OPERATOR_FIRST_ENTRY_POLICY_V1',
    '#define VOID_E2_OPERATOR_PYTHON "/usr/bin/python3"',
    '#define FIXED_PYTHON VOID_E2_OPERATOR_PYTHON',
    'FIXED_INSTALLER VOID_E2_OPERATOR_SOURCE_ROOT',
    'FIXED_QUALIFIER VOID_E2_OPERATOR_SOURCE_ROOT',
    'FIXED_NATIVE_INPUT VOID_E2_OPERATOR_INPUT_ROOT',
    'FIXED_RUNNER_INPUT VOID_E2_OPERATOR_INPUT_ROOT',
    'INSTALL_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V4_CREATE_ONLY',
    'voidbuye2nativeinstallplan2_',
    'strcmp(argv[1], "--installer-plan") == 0',
    'strcmp(argv[1], "--installer-apply") == 0',
    'strcmp(argv[1], "--qualifier-run") == 0',
    'fexecve(python.fd, next_argv, envp)',
    '"/proc/self/fd/%d"',
    '"PATH=/usr/bin:/bin"',
    '"HOME=/root"',
    '"LANG=C"',
    '"LC_ALL=C"',
    '"TZ=UTC"',
    'revalidate_retained_regular(',
    'revalidate_retained_python(',
    'receipt_operation = request.operation;',
    'receipt_child_created = true;',
    'child_process_created=%s',
    'unknown_or_partial_if_child_created',
    'privileged_first_entry_authenticated=true',
]:
    assert required in source, required

for forbidden in [
    "/home/zoso/dev/void-node",
    "PYTHONPATH=",
    "PYTHONHOME=",
    "PYTHONSTARTUP=",
    "PYTHONINSPECT=",
    "PYTHONWARNINGS=",
    "PYTHONBREAKPOINT=",
    "LD_PRELOAD=",
    "LD_LIBRARY_PATH=",
    "LD_AUDIT=",
    "GCONV_PATH=",
    "eth_sendRawTransaction",
]:
    assert forbidden not in source, forbidden

with tempfile.TemporaryDirectory(prefix="void-e2-operator-first-entry-proof-") as tmp:
    temp = pathlib.Path(tmp)
    production = temp / "production-preentry"
    compile_candidate(source=TARGET, output=production)
    require_static_elf(production)
    self_test = run([str(production), "--self-test"])
    assert f"{MARKER}_SELF_TEST_GREEN" in self_test.stdout
    assert "fixed_operation_allowlist=true" in self_test.stdout
    assert "child_environment_closed=true" in self_test.stdout
    assert "prefork_operation_receipts_strict_false=true" in self_test.stdout
    assert "postfork_selected_operation_receipt_conservative=true" in self_test.stdout
    assert "installer_apply_performed=false" in self_test.stdout
    assert "installed_qualifier_run_performed=false" in self_test.stdout

    initial_opt = os.lstat("/opt")
    fixture_root = pathlib.Path(
        f"/root/void-buy-void-epoch2-operator-first-entry-proof-{os.getpid()}"
    )
    local_installer = temp / "installer_fixture.py"
    local_qualifier = temp / "qualifier_fixture.py"
    invocation_marker = temp / "fixture-invoked.txt"
    abnormal_control = temp / "fixture-abnormal-child"

    installer_fixture = textwrap.dedent(
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
        modes = parser.add_mutually_exclusive_group(required=True)
        modes.add_argument("--plan", action="store_true")
        modes.add_argument("--apply", action="store_true")
        parser.add_argument("--native", required=True)
        parser.add_argument("--runner", required=True)
        parser.add_argument("--expected-head", required=True)
        parser.add_argument("--expected-plan-id", default="")
        parser.add_argument("--confirm", default="")
        args = parser.parse_args()
        marker.write_text("installer\\n", encoding="utf-8")
        assert pathlib.Path(args.native).name == "void_buy_void_epoch2_live_composition_native_v4"
        assert pathlib.Path(args.runner).name == "void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
        assert args.expected_head == {"1"*40!r}
        if args.plan:
            time.sleep(0.35)
            print("FIXTURE_INSTALLER_PLAN_GREEN")
        else:
            assert args.expected_plan_id == {EXPECTED_PLAN_ID!r}
            assert args.confirm == {CONFIRM!r}
            if abnormal.exists():
                os.kill(os.getpid(), signal.SIGKILL)
            time.sleep(0.35)
            print("FIXTURE_INSTALLER_APPLY_GREEN")
        """
    )
    qualifier_fixture = textwrap.dedent(
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
        parser.add_argument("--run", action="store_true", required=True)
        parser.add_argument("--expected-head", required=True)
        args = parser.parse_args()
        marker.write_text("qualifier\\n", encoding="utf-8")
        assert args.expected_head == {"1"*40!r}
        if abnormal.exists():
            os.kill(os.getpid(), signal.SIGKILL)
        time.sleep(0.35)
        print("FIXTURE_QUALIFIER_GREEN")
        """
    )
    write_local(local_installer, installer_fixture)
    write_local(local_qualifier, qualifier_fixture)
    fixture_installer_raw = local_installer.read_bytes()
    fixture_qualifier_raw = local_qualifier.read_bytes()

    test_binary_local = temp / "fixture-preentry"
    compile_candidate(
        source=TARGET,
        output=test_binary_local,
        fixture_root=fixture_root,
        installer_sha=sha256(fixture_installer_raw),
        installer_bytes=len(fixture_installer_raw),
        qualifier_sha=sha256(fixture_qualifier_raw),
        qualifier_bytes=len(fixture_qualifier_raw),
    )
    require_static_elf(test_binary_local)

    python_target = pathlib.Path("/usr/bin/python3").resolve()
    python_raw = python_target.read_bytes()
    policy_local = temp / "policy-v1.conf"
    write_local(
        policy_local,
        (
            "schema=VOID_BUY_VOID_EPOCH2_OPERATOR_FIRST_ENTRY_POLICY_V1\n"
            f"python_sha256={sha256(python_raw)}\n"
            f"python_bytes={len(python_raw)}\n"
        ),
    )
    dummy_native = temp / "void_buy_void_epoch2_live_composition_native_v4"
    dummy_runner = temp / "void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
    dummy_native.write_bytes(b"fixture-native\n")
    dummy_runner.write_bytes(b"fixture-runner\n")

    preentry = fixture_root / "bin/void_buy_void_epoch2_operator_first_entry_v1"
    installer_remote = (
        fixture_root
        / "source/ops/precision/void_buy_void_epoch2_live_composition_native_protected_install_v2.py"
    )
    qualifier_remote = (
        fixture_root
        / "source/ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v2.py"
    )
    native_remote = fixture_root / "input/void_buy_void_epoch2_live_composition_native_v4"
    runner_remote = (
        fixture_root
        / "input/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs"
    )
    python_link = fixture_root / "python3"

    try:
        sudo(["rm", "-rf", str(fixture_root)])
        for directory in [
            fixture_root,
            fixture_root / "bin",
            fixture_root / "source",
            fixture_root / "source/ops",
            fixture_root / "source/ops/precision",
            fixture_root / "input",
        ]:
            sudo(["mkdir", "-p", str(directory)])
            sudo(["chown", "root:root", str(directory)])
            sudo(["chmod", "0755", str(directory)])

        install_file(test_binary_local, preentry, "0555")
        install_file(policy_local, fixture_root / "policy-v1.conf", "0444")
        install_file(local_installer, installer_remote, "0444")
        install_file(local_qualifier, qualifier_remote, "0444")
        install_file(dummy_native, native_remote, "0444")
        install_file(dummy_runner, runner_remote, "0444")
        sudo(["ln", "-s", "/usr/bin/python3", str(python_link)])

        plan = sudo(
            [str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD]
        )
        assert "FIXTURE_INSTALLER_PLAN_GREEN" in plan.stdout
        assert f"{MARKER}_GREEN" in plan.stdout
        assert "operation=installer_plan" in plan.stdout
        assert "privileged_first_entry_authenticated=true" in plan.stdout

        apply = sudo(
            [
                str(preentry),
                "--installer-apply",
                "--expected-head",
                EXPECTED_HEAD,
                "--expected-plan-id",
                EXPECTED_PLAN_ID,
                "--confirm",
                CONFIRM,
            ]
        )
        assert "FIXTURE_INSTALLER_APPLY_GREEN" in apply.stdout
        assert f"{MARKER}_GREEN" in apply.stdout
        assert "operation=installer_apply" in apply.stdout

        qualifier_run = sudo(
            [str(preentry), "--qualifier-run", "--expected-head", EXPECTED_HEAD]
        )
        assert "FIXTURE_QUALIFIER_GREEN" in qualifier_run.stdout
        assert f"{MARKER}_GREEN" in qualifier_run.stdout
        assert "operation=qualifier_run" in qualifier_run.stdout

        if invocation_marker.exists():
            invocation_marker.unlink()
        wrong_confirm = sudo(
            [
                str(preentry),
                "--installer-apply",
                "--expected-head",
                EXPECTED_HEAD,
                "--expected-plan-id",
                EXPECTED_PLAN_ID,
                "--confirm",
                "WRONG_CONFIRMATION",
            ],
            check=False,
        )
        assert wrong_confirm.returncode == 2
        assert "operator_first_entry_confirmation_or_arguments_invalid" in wrong_confirm.stderr
        assert "child_process_created=false" in wrong_confirm.stderr
        assert "installer_apply_performed=false" in wrong_confirm.stderr
        assert "installed_qualifier_run_performed=false" in wrong_confirm.stderr
        assert "unknown_or_partial_if_child_created" not in wrong_confirm.stderr
        assert not invocation_marker.exists()

        arbitrary = sudo(
            [
                str(preentry),
                "--installer-plan",
                "--expected-head",
                EXPECTED_HEAD,
                "--native",
                "/tmp/caller-selected",
            ],
            check=False,
        )
        assert arbitrary.returncode == 2
        assert "operator_first_entry_arguments_invalid" in arbitrary.stderr
        assert not invocation_marker.exists()

        mutated_installer = temp / "mutated-installer.py"
        mutated_installer.write_bytes(fixture_installer_raw + b"\n# mutation\n")
        install_file(mutated_installer, installer_remote, "0444")
        substituted_source = sudo(
            [str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
            check=False,
        )
        assert substituted_source.returncode == 2
        assert "operator_first_entry_installer_identity_mismatch" in substituted_source.stderr
        install_file(local_installer, installer_remote, "0444")

        sudo(["rm", str(python_link)])
        sudo(["ln", "-s", "/bin/false", str(python_link)])
        substituted_python = sudo(
            [str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
            check=False,
        )
        assert substituted_python.returncode == 2
        assert "operator_first_entry_python_identity_mismatch" in substituted_python.stderr
        sudo(["rm", str(python_link)])
        sudo(["ln", "-s", "/usr/bin/python3", str(python_link)])

        if invocation_marker.exists():
            invocation_marker.unlink()
        race = subprocess.Popen(
            [
                "sudo",
                "-n",
                str(preentry),
                "--installer-plan",
                "--expected-head",
                EXPECTED_HEAD,
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
        )
        wait_for(invocation_marker)
        replacement = temp / "installer-replacement.py"
        replacement.write_bytes(fixture_installer_raw)
        install_file(replacement, installer_remote.with_suffix(".replacement"), "0444")
        sudo(["mv", "-f", str(installer_remote.with_suffix(".replacement")), str(installer_remote)])
        race_stdout, race_stderr = race.communicate(timeout=20)
        assert race.returncode == 2
        assert "FIXTURE_INSTALLER_PLAN_GREEN" in race_stdout
        assert f"{MARKER}_GREEN" not in race_stdout
        assert "operator_first_entry_installer_generation_changed" in race_stderr
        install_file(local_installer, installer_remote, "0444")

        if invocation_marker.exists():
            invocation_marker.unlink()
        abnormal_control.write_text("kill\n", encoding="utf-8")
        abnormal_apply = sudo(
            [
                str(preentry),
                "--installer-apply",
                "--expected-head",
                EXPECTED_HEAD,
                "--expected-plan-id",
                EXPECTED_PLAN_ID,
                "--confirm",
                CONFIRM,
            ],
            check=False,
        )
        abnormal_control.unlink()
        assert abnormal_apply.returncode == 2
        assert "operator_first_entry_child_not_cleanly_exited" in abnormal_apply.stderr
        assert "child_process_created=true" in abnormal_apply.stderr
        assert (
            "installer_apply_state=unknown_or_partial_if_child_created"
            in abnormal_apply.stderr
        )
        assert "installer_apply_performed=false" not in abnormal_apply.stderr
        assert "installed_qualifier_run_performed=false" in abnormal_apply.stderr

        if invocation_marker.exists():
            invocation_marker.unlink()
        qualifier_race = subprocess.Popen(
            [
                "sudo",
                "-n",
                str(preentry),
                "--qualifier-run",
                "--expected-head",
                EXPECTED_HEAD,
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="strict",
        )
        wait_for(invocation_marker)
        qualifier_replacement = temp / "qualifier-replacement.py"
        qualifier_replacement.write_bytes(fixture_qualifier_raw)
        install_file(
            qualifier_replacement,
            qualifier_remote.with_suffix(".replacement"),
            "0444",
        )
        sudo([
            "mv",
            "-f",
            str(qualifier_remote.with_suffix(".replacement")),
            str(qualifier_remote),
        ])
        qualifier_stdout, qualifier_stderr = qualifier_race.communicate(timeout=20)
        assert qualifier_race.returncode == 2
        assert "FIXTURE_QUALIFIER_GREEN" in qualifier_stdout
        assert f"{MARKER}_GREEN" not in qualifier_stdout
        assert "operator_first_entry_qualifier_generation_changed" in qualifier_stderr
        assert "child_process_created=true" in qualifier_stderr
        assert (
            "installed_qualifier_run_state=unknown_or_partial_if_child_created"
            in qualifier_stderr
        )
        assert "installed_qualifier_run_performed=false" not in qualifier_stderr
        assert "installer_apply_performed=false" in qualifier_stderr
        install_file(local_qualifier, qualifier_remote, "0444")

        preload_marker = temp / "ld-preload-marker"
        preload_c = temp / "preload.c"
        preload_so = temp / "preload.so"
        write_local(
            preload_c,
            (
                "#include <stdio.h>\n"
                "__attribute__((constructor)) static void mark(void){"
                f'FILE*f=fopen("{preload_marker}","w");'
                'if(f){fputs("loaded\\n",f);fclose(f);}}\n'
            ),
        )
        run(
            [
                shutil.which("cc") or "cc",
                "-shared",
                "-fPIC",
                str(preload_c),
                "-o",
                str(preload_so),
            ]
        )
        if preload_marker.exists():
            preload_marker.unlink()
        run(["/usr/bin/true"], env={"LD_PRELOAD": str(preload_so)})
        assert preload_marker.exists(), "dynamic LD_PRELOAD control did not execute"
        preload_marker.unlink()
        protected_preload = sudo_env(
            {"LD_PRELOAD": str(preload_so)},
            [str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
        )
        assert f"{MARKER}_GREEN" in protected_preload.stdout
        assert not preload_marker.exists(), "LD_PRELOAD reached static preentry or Python child"

        python_marker = temp / "pythonpath-marker"
        evil_dir = temp / "evil-pythonpath"
        evil_dir.mkdir()
        write_local(
            evil_dir / "sitecustomize.py",
            f"path={str(python_marker)!r}\nopen(path,'w',encoding='utf-8').write('loaded\\n')\n",
        )
        if python_marker.exists():
            python_marker.unlink()
        run(
            ["/usr/bin/python3", "-c", "pass"],
            env={"PYTHONPATH": str(evil_dir)},
        )
        assert python_marker.exists(), "PYTHONPATH control did not execute sitecustomize"
        python_marker.unlink()
        protected_python_env = sudo_env(
            {
                "PYTHONPATH": str(evil_dir),
                "PYTHONHOME": "/definitely/not/a/python/home",
                "PYTHONSTARTUP": str(evil_dir / "sitecustomize.py"),
                "PYTHONINSPECT": "1",
                "PYTHONWARNINGS": "error",
                "PYTHONBREAKPOINT": "evil.breakpoint",
                "LD_LIBRARY_PATH": "/definitely/not/a/library/path",
                "LD_AUDIT": "/definitely/not/an/audit.so",
                "GCONV_PATH": "/definitely/not/a/gconv/path",
            },
            [str(preentry), "--installer-plan", "--expected-head", EXPECTED_HEAD],
        )
        assert f"{MARKER}_GREEN" in protected_python_env.stdout
        assert not python_marker.exists(), "caller Python environment reached protected child"

    finally:
        sudo(["rm", "-rf", str(fixture_root)], check=False)

    final_opt = os.lstat("/opt")
    for field in ("st_dev", "st_ino", "st_uid", "st_gid", "st_mode"):
        assert getattr(final_opt, field) == getattr(initial_opt, field), field

print("VOID_BUY_VOID_EPOCH2_OPERATOR_FIRST_ENTRY_V1_PROOF_GREEN")
print("production_static_no_pt_interp=true")
print("host_opt_identity_unchanged=true")
print("fixed_operation_allowlist_proven=true")
print("caller_selected_paths_rejected=true")
print("wrong_apply_confirmation_rejected_before_child=true")
print("installer_source_identity_bound=true")
print("qualifier_source_identity_bound=true")
print("python_generation_policy_bound=true")
print("protected_source_path_substitution_rejected=true")
print("python_path_substitution_rejected=true")
print("retained_source_exec_survives_path_swap_but_parent_green_rejected=true")
print("ld_preload_dynamic_control_executes=true")
print("ld_preload_cannot_reach_static_preentry_or_python_child=true")
print("pythonpath_dynamic_control_executes=true")
print("caller_python_environment_cannot_reach_child=true")
print("final_parent_green_requires_post_child_revalidation=true")
print("prefork_operation_receipts_strict_false=true")
print("postfork_apply_receipt_conservative=true")
print("postfork_qualifier_receipt_conservative=true")
print("abnormal_child_receipt_conservative=true")
print("live_host_installation=false")
print("installer_apply_performed=false")
print("installed_qualifier_run_performed=false")
print("credential_content_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
