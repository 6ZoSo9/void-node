#!/usr/bin/env python3
from __future__ import annotations

import sys

def _require_isolated_python() -> None:
    flags = sys.flags
    if not (
        flags.isolated == 1
        and flags.ignore_environment == 1
        and flags.no_user_site == 1
        and flags.dont_write_bytecode == 1
        and getattr(flags, "safe_path", 0) == 1
    ):
        raise SystemExit("HOLD=python_runtime_not_isolated")

_require_isolated_python()

_args = sys.argv[1:]
if _args == []:
    FIXTURE_MODE = False
elif _args == ["--isolated-disposable-fixture"]:
    FIXTURE_MODE = True
else:
    raise SystemExit("usage: prove_buy_void_epoch2_v6r3_plan_first_entry_v1.py [--isolated-disposable-fixture]")

import hashlib
import os
from pathlib import Path
import stat
import subprocess
import tempfile

MARKER = "VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_V1_PROOF"
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/precision/void_buy_void_epoch2_v6r3_plan_first_entry_v1.c"
PLANNER = ROOT / "ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"

PLANNER_GIT_BLOB = "19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff"
PLANNER_SHA256 = "95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627"
PLANNER_BYTES = 49025

FIXED_ROOT = Path("/opt/void-buy-void-epoch2-v6r3-plan-first-entry-v1")
FIXED_SELF = FIXED_ROOT / "void_buy_void_epoch2_v6r3_plan_first_entry_v1"
FIXED_POLICY = FIXED_ROOT / "policy-v1.conf"
FIXED_PLANNER = FIXED_ROOT / "void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"
FIXED_PYTHON_LINK = Path("/usr/bin/python3")
SUDO = "/usr/bin/sudo"
SETPRIV = "/usr/bin/setpriv"
ENV = "/usr/bin/env"
CC = "/usr/bin/cc"
READELF = "/usr/bin/readelf"
FILE = "/usr/bin/file"
PLANNER_MARKER = "VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3"
MAX_SOURCE_BYTES = 4 * 1024 * 1024
MAX_PYTHON_BYTES = 512 * 1024 * 1024

def git_blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()

def stable_bytes(path: Path, maximum: int) -> bytes:
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or not 0 < before.st_size <= maximum
    ):
        raise AssertionError("source_metadata_invalid:" + str(path))
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        fields = (
            "st_dev", "st_ino", "st_mode", "st_uid", "st_gid", "st_nlink",
            "st_size", "st_mtime_ns", "st_ctime_ns",
        )
        if any(getattr(before, field) != getattr(opened, field) for field in fields):
            raise AssertionError("source_rebound:" + str(path))
        chunks: list[bytes] = []
        remaining = opened.st_size
        while remaining:
            chunk = os.read(fd, min(65536, remaining))
            if not chunk:
                raise AssertionError("source_short_read:" + str(path))
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1) != b"":
            raise AssertionError("source_grew:" + str(path))
        after = os.fstat(fd)
        visible = path.lstat()
        if any(
            getattr(opened, field) != getattr(after, field)
            or getattr(after, field) != getattr(visible, field)
            for field in fields
        ):
            raise AssertionError("source_changed:" + str(path))
        return b"".join(chunks)
    finally:
        os.close(fd)

def run(argv: list[str], *, input_bytes: bytes | None = None,
        env: dict[str, str] | None = None, timeout: int = 60) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        argv,
        input=input_bytes,
        stdin=subprocess.DEVNULL if input_bytes is None else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        timeout=timeout,
        check=False,
    )

def require_success(cp: subprocess.CompletedProcess[bytes], label: str) -> None:
    if cp.returncode != 0:
        raise AssertionError(
            label + ": rc=" + str(cp.returncode)
            + "\nstdout=" + cp.stdout.decode("utf-8", "replace")
            + "\nstderr=" + cp.stderr.decode("utf-8", "replace")
        )

def stat_generation(st: os.stat_result) -> tuple[int, ...]:
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_uid, st.st_gid, st.st_nlink,
        st.st_size, st.st_mtime_ns, st.st_ctime_ns,
    )

def directory_custody_identity(st: os.stat_result) -> tuple[int, ...]:
    # Child creation/removal legitimately changes directory size/mtime/ctime.
    # Bind only the directory's object/custody identity here; exact entries and
    # every created child generation are verified separately before cleanup.
    return (
        st.st_dev, st.st_ino, st.st_mode, st.st_uid, st.st_gid, st.st_nlink,
    )

planner_raw = stable_bytes(PLANNER, MAX_SOURCE_BYTES)
assert len(planner_raw) == PLANNER_BYTES
assert hashlib.sha256(planner_raw).hexdigest() == PLANNER_SHA256
assert git_blob(planner_raw) == PLANNER_GIT_BLOB

source_raw = stable_bytes(SOURCE, MAX_SOURCE_BYTES)
source = source_raw.decode("utf-8", "strict")
for required in (
    '#define VOID_E2_V6R3_PLAN_FIRST_ENTRY_ROOT "/opt/void-buy-void-epoch2-v6r3-plan-first-entry-v1"',
    '#define FIXED_PYTHON_LINK "/usr/bin/python3"',
    '#define PLANNER_GIT_BLOB "' + PLANNER_GIT_BLOB + '"',
    '#define PLANNER_SHA256 "' + PLANNER_SHA256 + '"',
    "#define PLANNER_BYTES 49025U",
    "#define REQUIRED_UID 1000U",
    "#define REQUIRED_GID 1000U",
    "root_static_first_entry_required",
    "setgroups(0,NULL)",
    "setresgid((gid_t)REQUIRED_GID",
    "setresuid((uid_t)REQUIRED_UID",
    "PR_SET_DUMPABLE",
    "revalidate_fixed_generation(",
    "reserve_standard_fds();",
    "standard_fds_reserved_before_trusted_opens=true",
    "planner_child_fd_identity_invalid",
    "python_child_fd_identity_invalid",
    "memfd_create(",
    "MFD_ALLOW_SEALING",
    "F_ADD_SEALS",
    "F_SEAL_WRITE",
    "planner_sealed_snapshot_invalid",
    "python_sealed_snapshot_invalid",
    "O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK",
    '"/proc/self/fd/3"',
    "fexecve(python_fd,child_argv,child_env);",
    '"-I"', '"-B"', '"-S"', "PR_SET_NO_NEW_PRIVS",
    "caller_stdin_python_source_authority=false",
    "SYS_close_range",
    "CLOSE_RANGE_UNSHARE",
    "assert_no_unneeded_fds",
    "inherited_fd_survived_close_range",
    'require_devnull_descriptor(STDIN_FILENO,"devnull_stdin_descriptor_invalid")',
):
    assert required in source, required
for forbidden in ("system(", "popen(", "execvp(", "execlp("):
    assert forbidden not in source, forbidden

with tempfile.TemporaryDirectory(prefix="void-epoch2-v6r3-plan-first-entry-proof-") as td:
    temp = Path(td)
    temp.chmod(0o755)
    binary = temp / "launcher"
    cp = run(
        [CC, "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", "-static",
         os.fspath(SOURCE), "-o", os.fspath(binary)],
        timeout=120,
    )
    require_success(cp, "launcher_compile")

    cp = run([FILE, os.fspath(binary)])
    require_success(cp, "launcher_file")
    assert b"statically linked" in cp.stdout.lower()

    cp = run([READELF, "-l", os.fspath(binary)])
    require_success(cp, "launcher_readelf")
    assert b" INTERP " not in cp.stdout

    cp = run([os.fspath(binary), "--self-test"])
    require_success(cp, "launcher_self_test")
    self_lines = set(cp.stdout.decode("utf-8", "strict").splitlines())
    for line in (
        "VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_V1_SELF_TEST_GREEN",
        "planner_git_blob=" + PLANNER_GIT_BLOB,
        "planner_sha256=" + PLANNER_SHA256,
        "planner_bytes=49025",
        "root_static_first_entry_required=true",
        "standard_fds_reserved_before_trusted_opens=true",
        "mapped_planner_fd3_revalidated=true",
        "runtime_uid_gid_1000_required=true",
        "permanent_uid_gid_drop_before_python=true",
        "runtime_dumpable_disabled_before_python=true",
        "planner_retained_descriptor_required=true",
        "planner_sealed_memfd_execution=true",
        "python_sealed_memfd_fexecve=true",
        "sealed_memfd_write_rejected=true",
        "python_retained_descriptor_fexecve_required=true",
        "isolated_python_required=true",
        "python_site_import_disabled=true",
        "caller_stdin_python_source_authority=false",
        "filesystem_write=false",
        "credential_access=false",
        "signing=false",
        "transaction=false",
        "funds_movement=false",
    ):
        assert line in self_lines, line

    if not FIXTURE_MODE:
        print(MARKER + "_SOURCE_CHECK_GREEN")
        print("privileged_fixture_executed=false")
        print("protected_install_authorized=false")
        print("host_plan_authorized=false")
        print("credential_access=false")
        print("signing=false")
        print("transaction=false")
        print("funds_movement=false")
        raise SystemExit(0)

    cp = run([SUDO, "-n", "true"])
    require_success(cp, "passwordless_sudo_required")
    assert Path(SETPRIV).is_file(), "setpriv_unavailable"
    assert FIXED_PYTHON_LINK.exists(), "fixed_python_link_missing"

    run_root = Path("/run")
    run_st = run_root.lstat()
    assert stat.S_ISDIR(run_st.st_mode) and not stat.S_ISLNK(run_st.st_mode)
    assert run_st.st_uid == 0 and run_st.st_gid == 0
    assert (run_st.st_mode & 0o022) == 0

    fixture_root = run_root / (
        "void-epoch2-v6r3-plan-first-entry-ci-"
        + str(os.getpid()) + "-" + hashlib.sha256(source_raw).hexdigest()[:12]
    )
    assert not fixture_root.exists() and not fixture_root.is_symlink(), "fixture_root_preexisting"

    FIXED_ROOT = fixture_root
    FIXED_SELF = FIXED_ROOT / "void_buy_void_epoch2_v6r3_plan_first_entry_v1"
    FIXED_POLICY = FIXED_ROOT / "policy-v1.conf"
    FIXED_PLANNER = FIXED_ROOT / "void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py"

    fixture_binary = temp / "launcher-fixture"
    root_define = '-DVOID_E2_V6R3_PLAN_FIRST_ENTRY_ROOT="' + os.fspath(FIXED_ROOT) + '"'
    cp = run(
        [CC, "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", "-static",
         root_define, os.fspath(SOURCE), "-o", os.fspath(fixture_binary)],
        timeout=120,
    )
    require_success(cp, "fixture_launcher_compile")

    fixture_created = False
    fixture_root_identity: tuple[int, ...] | None = None
    installed_generations: dict[Path, tuple[int, ...]] = {}

    python_real = Path(os.path.realpath(FIXED_PYTHON_LINK))
    python_raw = stable_bytes(python_real, MAX_PYTHON_BYTES)
    python_sha = hashlib.sha256(python_raw).hexdigest()

    policy = temp / "policy-v1.conf"
    policy.write_text(
        "\n".join((
            "schema=VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_POLICY_V1",
            "planner_git_blob=" + PLANNER_GIT_BLOB,
            "planner_sha256=" + PLANNER_SHA256,
            "planner_bytes=" + str(PLANNER_BYTES),
            "python_realpath=" + os.fspath(python_real),
            "python_sha256=" + python_sha,
            "python_bytes=" + str(len(python_raw)),
            "runtime_uid=1000",
            "runtime_gid=1000",
            "",
        )),
        encoding="ascii",
    )

    sentinel_root = temp / "sentinels"
    sentinel_root.mkdir(mode=0o777)
    sentinel_root.chmod(0o777)
    evil_dir = temp / "evil-pythonpath"
    evil_module = evil_dir / "hashlib.py"
    evil_sentinel = sentinel_root / "pythonpath-sentinel"
    preload_source = temp / "preload.c"
    preload_so = temp / "preload.so"
    preload_sentinel = sentinel_root / "preload-sentinel"
    dynamic_source = temp / "dynamic.c"
    dynamic_binary = temp / "dynamic"

    try:
        for sentinel in (evil_sentinel, preload_sentinel):
            try: sentinel.unlink()
            except FileNotFoundError: pass
        evil_dir.mkdir(mode=0o755, exist_ok=True)
        evil_dir.chmod(0o755)
        evil_module.write_text(
            "from pathlib import Path\n"
            "Path(" + repr(os.fspath(evil_sentinel)) + ").write_text('x')\n"
            "raise RuntimeError('hostile PYTHONPATH imported')\n",
            encoding="utf-8",
        )
        evil_module.chmod(0o644)

        preload_source.write_text(
            "#include <fcntl.h>\n#include <stdlib.h>\n#include <unistd.h>\n"
            "__attribute__((constructor)) static void p(void){"
            "const char*m=getenv(\"VOID_PRELOAD_MARKER\");if(!m)return;"
            "int f=open(m,O_WRONLY|O_CREAT|O_TRUNC,0600);"
            "if(f>=0){write(f,\"x\",1);close(f);}}\n",
            encoding="utf-8",
        )
        dynamic_source.write_text("int main(void){return 0;}\n", encoding="utf-8")
        cp = run([CC, "-shared", "-fPIC", os.fspath(preload_source), "-o", os.fspath(preload_so)])
        require_success(cp, "preload_compile")
        cp = run([CC, os.fspath(dynamic_source), "-o", os.fspath(dynamic_binary)])
        require_success(cp, "dynamic_control_compile")
        poison = dict(os.environ)
        poison["LD_PRELOAD"] = os.fspath(preload_so)
        poison["VOID_PRELOAD_MARKER"] = os.fspath(preload_sentinel)
        cp = run([os.fspath(dynamic_binary)], env=poison)
        require_success(cp, "dynamic_preload_positive_control")
        assert preload_sentinel.exists(), "dynamic preload positive control missing"
        preload_sentinel.unlink()
        cp = run([os.fspath(binary), "--self-test"], env=poison)
        require_success(cp, "static_launcher_preload_test")
        assert not preload_sentinel.exists(), "static launcher executed hostile preload"

        # The privileged fixture is create-only at a unique /run path.  Never
        # preclean, chmod/chown a global ancestor, or overwrite a preexisting root.
        assert not FIXED_ROOT.exists() and not FIXED_ROOT.is_symlink(), "fixture_root_preexisting"
        require_success(
            run([SUDO, "-n", "install", "-d", "-o", "root", "-g", "root", "-m", "0755",
                 os.fspath(FIXED_ROOT)]),
            "fixture_root_create_only",
        )
        fixture_created = True
        root_st = FIXED_ROOT.lstat()
        assert stat.S_ISDIR(root_st.st_mode) and not stat.S_ISLNK(root_st.st_mode)
        assert root_st.st_uid == 0 and root_st.st_gid == 0
        assert stat.S_IMODE(root_st.st_mode) == 0o755
        fixture_root_identity = directory_custody_identity(root_st)

        for source_path, target_path, mode in (
            (fixture_binary, FIXED_SELF, "0555"),
            (PLANNER, FIXED_PLANNER, "0444"),
            (policy, FIXED_POLICY, "0444"),
        ):
            assert not target_path.exists() and not target_path.is_symlink(), (
                "fixture_target_preexisting:" + os.fspath(target_path)
            )
            require_success(
                run([SUDO, "-n", "install", "-o", "root", "-g", "root", "-m", mode,
                     os.fspath(source_path), os.fspath(target_path)]),
                "fixture_install_create_only:" + os.fspath(target_path),
            )
            target_st = target_path.lstat()
            assert stat.S_ISREG(target_st.st_mode) and not stat.S_ISLNK(target_st.st_mode)
            assert target_st.st_nlink == 1
            assert target_st.st_uid == 0 and target_st.st_gid == 0
            assert stat.S_IMODE(target_st.st_mode) == int(mode, 8)
            installed_generations[target_path] = stat_generation(target_st)

        assert set(os.listdir(FIXED_ROOT)) == {
            FIXED_SELF.name, FIXED_PLANNER.name, FIXED_POLICY.name,
        }

        attack_source = b'raise SystemExit("CALLER_STDIN_EXECUTED")\n'
        exec_argv = [
            SUDO, "-n", ENV,
            "PYTHONPATH=" + os.fspath(evil_dir), "PYTHONINSPECT=1",
            "LD_PRELOAD=" + os.fspath(preload_so),
            "VOID_PRELOAD_MARKER=" + os.fspath(preload_sentinel),
            os.fspath(FIXED_SELF), "--plan",
        ]
        cp = run(exec_argv, input_bytes=attack_source, timeout=90)
        combined = cp.stdout + cp.stderr
        assert cp.returncode == 2, combined.decode("utf-8", "replace")
        assert (PLANNER_MARKER + "\n").encode("ascii") in cp.stdout
        assert b"status=HOLD" in cp.stdout
        assert b"reason=git_failed:rev-parse" in cp.stdout
        assert b"reason=nonroot_required_for_plan" not in cp.stdout
        assert b"reason=exact_runtime_identity_required_for_host_plan" not in cp.stdout
        assert b"CALLER_STDIN_EXECUTED" not in combined
        assert (MARKER + "_HOLD").encode("ascii") not in cp.stderr
        assert b"planner_python_started=false" not in cp.stderr
        assert not evil_sentinel.exists(), "hostile PYTHONPATH imported by isolated child"
        assert not preload_sentinel.exists(), "hostile LD_PRELOAD propagated to Python child"

        # Actual native closed-stdin adversary: fd0 must be reserved before any
        # trusted open, and the authenticated planner must still execute from fd3.
        cp = run([
            SUDO, "-n", "/bin/sh", "-c",
            'exec 0<&-; exec "$1" --plan',
            "void-closed-stdin", os.fspath(FIXED_SELF),
        ], timeout=90)
        closed_combined = cp.stdout + cp.stderr
        assert cp.returncode == 2, closed_combined.decode("utf-8", "replace")
        assert (PLANNER_MARKER + "\n").encode("ascii") in cp.stdout
        assert b"status=HOLD" in cp.stdout
        assert b"reason=git_failed:rev-parse" in cp.stdout
        assert (MARKER + "_HOLD").encode("ascii") not in cp.stderr
        assert b"planner_python_started=false" not in cp.stderr

        cp = run([
            SUDO, "-n", os.fspath(fixture_binary), "--plan",
        ])
        assert cp.returncode == 2
        assert b"reason=launcher_fixed_path_required" in cp.stderr
        assert b"planner_python_started=false" in cp.stderr

        cp = run([
            SUDO, "-n", SETPRIV,
            "--reuid=1000", "--regid=1000", "--clear-groups", "--",
            os.fspath(FIXED_SELF), "--plan",
        ])
        assert cp.returncode == 2
        assert b"reason=root_static_first_entry_required" in cp.stderr
        assert b"planner_python_started=false" in cp.stderr
        assert PLANNER_MARKER.encode("ascii") not in cp.stdout

        tampered = bytearray(planner_raw); tampered[0] ^= 1
        assert len(tampered) == PLANNER_BYTES
        tampered_path = temp / "planner-tampered.py"
        tampered_path.write_bytes(tampered)
        require_success(
            run([SUDO, "-n", "install", "-o", "root", "-g", "root", "-m", "0444",
                 os.fspath(tampered_path), os.fspath(FIXED_PLANNER)]),
            "tampered_planner_install",
        )
        tampered_st = FIXED_PLANNER.lstat()
        assert stat.S_ISREG(tampered_st.st_mode) and tampered_st.st_uid == 0
        installed_generations[FIXED_PLANNER] = stat_generation(tampered_st)
        cp = run(exec_argv, input_bytes=attack_source)
        assert cp.returncode == 2
        assert b"reason=planner_identity_invalid" in cp.stderr
        assert b"planner_python_started=false" in cp.stderr
        assert PLANNER_MARKER.encode("ascii") not in cp.stdout

        require_success(
            run([SUDO, "-n", "install", "-o", "root", "-g", "root", "-m", "0444",
                 os.fspath(PLANNER), os.fspath(FIXED_PLANNER)]),
            "planner_restore",
        )
        restored_st = FIXED_PLANNER.lstat()
        assert stat.S_ISREG(restored_st.st_mode) and restored_st.st_uid == 0
        installed_generations[FIXED_PLANNER] = stat_generation(restored_st)
    finally:
        # Remove only the exact disposable generations created above.  If any
        # generation or directory shape changed, fail closed and leave it for
        # runner teardown rather than deleting unknown content.
        if fixture_created:
            root_now = FIXED_ROOT.lstat()
            assert fixture_root_identity is not None
            assert directory_custody_identity(root_now) == fixture_root_identity, (
                "fixture_root_custody_identity_changed"
            )
            assert set(os.listdir(FIXED_ROOT)) == {
                FIXED_SELF.name, FIXED_PLANNER.name, FIXED_POLICY.name,
            }, "fixture_root_entries_changed"
            for target in (FIXED_PLANNER, FIXED_POLICY, FIXED_SELF):
                current = target.lstat()
                assert stat_generation(current) == installed_generations[target], (
                    "fixture_target_generation_changed:" + os.fspath(target)
                )
                require_success(
                    run([SUDO, "-n", "rm", "--", os.fspath(target)]),
                    "fixture_generation_bound_remove:" + os.fspath(target),
                )
            require_success(
                run([SUDO, "-n", "rmdir", "--", os.fspath(FIXED_ROOT)]),
                "fixture_generation_bound_rmdir",
            )
        try: evil_module.unlink()
        except FileNotFoundError: pass
        try: evil_dir.rmdir()
        except OSError: pass
        for sentinel in (evil_sentinel, preload_sentinel):
            try: sentinel.unlink()
            except FileNotFoundError: pass

print(MARKER + "_GREEN")
print("planner_git_blob=" + PLANNER_GIT_BLOB)
print("planner_sha256=" + PLANNER_SHA256)
print("planner_bytes=" + str(PLANNER_BYTES))
print("native_static_first_instruction=true")
print("native_no_pt_interp=true")
print("native_ld_preload_blocked_before_main=true")
print("fixed_root_custody_required=true")
print("privileged_fixture_explicit_opt_in=true")
print("isolated_disposable_fixture_root=true")
print("preexisting_fixture_root_rejected=true")
print("generation_bound_nonrecursive_cleanup=true")
print("closed_stdin_first_entry_green=true")
print("root_static_first_entry_required=true")
print("standard_fds_reserved_before_trusted_opens=true")
print("mapped_planner_fd3_revalidated=true")
print("inherited_fds_ge5_closed_and_censused=true")
print("devnull_stdin_descriptor_revalidated=true")
print("runtime_uid_gid_1000_required=true")
print("permanent_uid_gid_drop_before_python=true")
print("planner_runtime_uid_gid_1000_proven=true")
print("runtime_dumpable_disabled_before_python=true")
print("protected_generations_revalidated_after_uid_drop=true")
print("planner_root_owned_fixed_path_required=true")
print("planner_sha256_and_size_bound_before_python=true")
print("planner_retained_fd_execution=true")
print("planner_sealed_memfd_execution=true")
print("python_sealed_memfd_fexecve=true")
print("sealed_memfd_write_rejected=true")
print("authenticated_original_paths_not_execution_authority_after_snapshot=true")
print("python_root_owned_generation_policy_bound=true")
print("python_retained_fd_fexecve=true")
print("isolated_python_i_b_s=true")
print("python_site_import_disabled=true")
print("caller_stdin_python_source_rejected=true")
print("hostile_pythonpath_not_imported=true")
print("hostile_ld_preload_not_propagated_to_python=true")
print("nonroot_direct_launcher_rejected_before_python=true")
print("same_size_planner_substitution_rejected_before_python=true")
print("wrong_launcher_path_rejected_before_python=true")
print("source_only=true")
print("protected_install_authorized=false")
print("host_plan_authorized=false")
print("service_mutation=false")
print("credential_access=false")
print("private_key_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("treasury_liquidity_action=false")
print("funds_movement=false")
