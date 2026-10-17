#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT / "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_install_v6.py"
TARGET_BLOB = "c9dd842b620f2ed7c3fdd5876c222a419b6b0c68"

LOCK = ROOT / "ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json"
LOCK_BLOB = "f5b03c6b81016edf21f605099e0ef8976f40e107"
MANIFEST = ROOT / "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
MANIFEST_BLOB = "6e0630af72111bd9976dcc38cdcdada1904dd067"


def blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


target_raw = TARGET.read_bytes()
source = target_raw.decode("utf-8")
assert blob(target_raw) == TARGET_BLOB
assert blob(LOCK.read_bytes()) == LOCK_BLOB
assert blob(MANIFEST.read_bytes()) == MANIFEST_BLOB

for required in (
    'MARKER = (',
    '"PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6"',
    '"PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"',
    'PLAN_PREFIX = "voidbuye2bootstrapinstall6_"',
    '"PROTECTED_BOOTSTRAP_V6_CREATE_ONLY"',
    'LOCK_GIT_BLOB_SHA1 = "f5b03c6b81016edf21f605099e0ef8976f40e107"',
    '"5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"',
    '"13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062"',
    '"aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"',
    '"c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"',
    '"a91707c3e5803071fc73c3451c9bcb3b774f8b48"',
    '"python_sha256="',
    '"git_sha256="',
    '"source-generation-v3.conf"',
    'RENAME_NOREPLACE = 1',
    'raise PublishedInstallError(',
    '"published_needs_inspection:"',
    '"stage_generation_changed_before_cleanup"',
    '"prepublication_failure_and_stage_cleanup_failed:"',
    '"bootstrap_execution_authorized": False',
    '"inner_installer_execution_authorized": False',
    '"credential_access_authorized": False',
    '"transaction_authorized": False',
    '"funds_movement_authorized": False',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "LoadCredential",
    "CREDENTIALS_DIRECTORY",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source)
apply_defs = [
    node for node in tree.body
    if isinstance(node, ast.FunctionDef) and node.name == "apply"
]
assert len(apply_defs) == 1
apply_def = apply_defs[0]

rename_calls = [
    node for node in ast.walk(apply_def)
    if isinstance(node, ast.Call)
    and isinstance(node.func, ast.Name)
    and node.func.id == "_renameat2"
]
assert len(rename_calls) == 1
assert any(
    isinstance(arg, ast.Name) and arg.id == "RENAME_NOREPLACE"
    for arg in rename_calls[0].args
)

# No execution primitive for the bootstrap/inner installer may exist in apply.
apply_text = ast.get_source_segment(source, apply_def) or ""
for forbidden in ("execve(", "fexecve(", "systemctl", "subprocess.run("):
    assert forbidden not in apply_text, forbidden

spec = importlib.util.spec_from_file_location("v6_install", TARGET)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def prove_tool_snapshot_alias_handling(module):
    import os as host_os
    import stat as host_stat
    from types import SimpleNamespace
    from unittest.mock import patch

    cases = []
    payload = b"fixture-python-executable\n"
    fixed = pathlib.Path("/fixture/python3")
    linked_target = pathlib.Path("/fixture/python3.12")
    retargeted_path = pathlib.Path("/fixture/python3.13")

    def metadata(mode, *, ino=30, uid=0, gid=0, size=None):
        return SimpleNamespace(
            st_mode=mode,
            st_dev=1,
            st_ino=ino,
            st_uid=uid,
            st_gid=gid,
            st_nlink=1,
            st_size=len(payload) if size is None else size,
            st_mtime_ns=100,
            st_ctime_ns=100,
        )

    def run_case(
        name, *, linked=False, alias_changes=None, target_changes=None,
        ancestor_changes=None, retarget=None, expected_error=None
    ):
        alias = metadata(
            host_stat.S_IFLNK | 0o777, ino=20, size=len("python3.12")
        ) if linked else metadata(host_stat.S_IFREG | 0o555)
        target = metadata(host_stat.S_IFREG | 0o555) if linked else alias
        for key, value in (alias_changes or {}).items():
            setattr(alias, key, value)
        for key, value in (target_changes or {}).items():
            setattr(target, key, value)
        root = metadata(host_stat.S_IFDIR | 0o755, ino=1, size=4096)
        ancestor = metadata(host_stat.S_IFDIR | 0o755, ino=2, size=4096)
        for key, value in (ancestor_changes or {}).items():
            setattr(ancestor, key, value)
        canonical = linked_target if linked else fixed
        visible = {"/": root, "/fixture": ancestor, str(fixed): alias}
        visible[str(canonical)] = target
        state = {"offset": 0, "opened": 0, "closed": 0, "retargeted": False}
        fixture_fd = 71

        def fake_lstat(path):
            path = str(path)
            assert path in visible, (name, "unexpected_metadata_path", path)
            return visible[path]

        def fake_realpath(path):
            if pathlib.Path(path) == fixed:
                if state["retargeted"] and retarget == "realpath":
                    return str(retargeted_path)
                return str(canonical)
            assert pathlib.Path(path) == canonical, (name, "unexpected_realpath", str(path))
            return str(canonical)

        def fake_open(path, flags):
            assert str(path) == str(canonical), (name, "unexpected_open", str(path))
            assert flags == (
                host_os.O_RDONLY | host_os.O_CLOEXEC | host_os.O_NOFOLLOW
            ), (name, "unexpected_open_flags", flags)
            state["opened"] += 1
            assert state["opened"] == 1, (name, "multiple_opens")
            return fixture_fd

        def fake_fstat(fd):
            assert fd == fixture_fd, (name, "unexpected_fstat_fd", fd)
            return target

        def fake_read(fd, count):
            assert fd == fixture_fd, (name, "unexpected_read_fd", fd)
            chunk = payload[state["offset"]:state["offset"] + count]
            state["offset"] += len(chunk)
            if chunk and retarget and not state["retargeted"]:
                state["retargeted"] = True
                if retarget == "alias_metadata":
                    visible[str(fixed)] = SimpleNamespace(
                        **{**vars(alias), "st_ino": alias.st_ino + 1}
                    )
            return chunk

        def fake_close(fd):
            assert fd == fixture_fd, (name, "unexpected_close_fd", fd)
            state["closed"] += 1

        # Replace this imported module's os namespace, not the process-wide os
        # module, so an unintended operation cannot fall through to a host path.
        fixture_os = SimpleNamespace(
            path=SimpleNamespace(realpath=fake_realpath),
            open=fake_open,
            fstat=fake_fstat,
            read=fake_read,
            close=fake_close,
            O_RDONLY=host_os.O_RDONLY,
            O_CLOEXEC=host_os.O_CLOEXEC,
            O_NOFOLLOW=host_os.O_NOFOLLOW,
        )
        with (
            patch.object(module, "os", fixture_os),
            patch.object(module.pathlib.Path, "lstat", fake_lstat),
        ):
            try:
                observed = module._tool_snapshot(fixed, 1024)
            except module.InstallError as exc:
                assert expected_error is not None, (
                    name, "unexpected_rejection", str(exc)
                )
                assert str(exc) == expected_error + ":" + str(
                    pathlib.Path("/fixture")
                    if expected_error == "trusted_directory_invalid"
                    else fixed
                ), (name, str(exc))
            else:
                assert expected_error is None, (name, "unexpected_acceptance")
                assert observed == {
                    "fixed": str(fixed),
                    "realpath": str(canonical),
                    "bytes": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                    "uid": 0,
                    "gid": 0,
                    "mode": format(host_stat.S_IMODE(target.st_mode), "04o"),
                }, (name, observed)
                assert state["offset"] == len(payload), (name, "incomplete_hash")
        assert state["opened"] == state["closed"], (name, "descriptor_leak")
        if expected_error in {"tool_alias_invalid", "tool_target_invalid", "trusted_directory_invalid"}:
            assert state["opened"] == 0, (name, "rejection_after_open")
        else:
            assert state["opened"] == 1, (name, "snapshot_not_exercised")
        cases.append(name)

    run_case("root_regular_0555")
    run_case("root_regular_0755", alias_changes={"st_mode": host_stat.S_IFREG | 0o755})
    run_case("root_symlink_0777", linked=True)
    for linked in (False, True):
        for field in ("st_uid", "st_gid"):
            run_case(
                "untrusted_alias_" + str(linked) + "_" + field,
                linked=linked, alias_changes={field: 1000},
                expected_error="tool_alias_invalid",
            )
    for mode in (host_stat.S_IFDIR | 0o755, host_stat.S_IFIFO | 0o600):
        run_case(
            "wrong_alias_type_" + str(mode),
            alias_changes={"st_mode": mode}, expected_error="tool_alias_invalid",
        )
    for writable in (0o020, 0o002):
        run_case(
            "writable_regular_alias_" + str(writable),
            alias_changes={"st_mode": host_stat.S_IFREG | 0o755 | writable},
            expected_error="tool_alias_invalid",
        )
    for field in ("st_uid", "st_gid"):
        run_case(
            "untrusted_target_" + field, linked=True,
            target_changes={field: 1000}, expected_error="tool_target_invalid",
        )
    for mode in (
        host_stat.S_IFREG | 0o644,
        host_stat.S_IFREG | 0o775,
        host_stat.S_IFREG | 0o757,
        host_stat.S_IFLNK | 0o777,
    ):
        run_case(
            "invalid_target_mode_" + str(mode), linked=True,
            target_changes={"st_mode": mode}, expected_error="tool_target_invalid",
        )
    run_case(
        "writable_target_ancestry", linked=True,
        ancestor_changes={"st_mode": host_stat.S_IFDIR | 0o775},
        expected_error="trusted_directory_invalid",
    )
    for retarget in ("alias_metadata", "realpath"):
        run_case(
            "symlink_retarget_during_read_" + retarget, linked=True,
            retarget=retarget, expected_error="tool_alias_changed",
        )

    return len(cases)


tool_alias_cases = prove_tool_snapshot_alias_handling(module)

assert module.build_policy(
    {"sha256": "1" * 64, "bytes": 123},
    {"sha256": "2" * 64, "bytes": 456},
) == (
    "schema=VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6\n"
    "python_sha256=" + "1" * 64 + "\n"
    "python_bytes=123\n"
    "git_sha256=" + "2" * 64 + "\n"
    "git_bytes=456\n"
).encode("ascii")

# Wrong confirmation must fail before collect_plan/candidate/host generation reads.
original_collect = module.collect_plan
def forbidden_collect(*args, **kwargs):
    raise AssertionError("collect_plan_reached_before_confirmation")
module.collect_plan = forbidden_collect
try:
    try:
        module.apply(
            pathlib.Path("/nonexistent/bootstrap"),
            pathlib.Path("/nonexistent/manifest"),
            "1" * 40,
            "voidbuye2bootstrapinstall6_" + "2" * 64,
            "WRONG_CONFIRM",
        )
    except module.InstallError as exc:
        assert str(exc) == "explicit_create_only_confirmation_required"
    else:
        raise AssertionError("wrong confirmation accepted")
finally:
    module.collect_plan = original_collect

self_test = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert self_test.returncode == 0, self_test.stderr
for marker in (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6_SELF_TEST_GREEN",
    "accepted_bootstrap_v6_lock_bound=true",
    "accepted_bootstrap_v6_binary_bound=true",
    "source_generation_v3_manifest_bound=true",
    "python_and_git_host_policy_bound=true",
    "create_only_publication=true",
    "rename_noreplace_exercised=true",
    "post_publication_rollback=false",
    "bootstrap_execution=false",
    "inner_installer_execution=false",
    "credential_access=false",
    "signing=false",
    "transaction=false",
    "rpc_call=false",
    "funds_movement=false",
):
    assert marker in self_test.stdout.splitlines(), marker

source_plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
)
assert source_plan.returncode == 0, source_plan.stderr
for marker in (
    "mode=source-plan",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "create_only=true",
    "rename_noreplace_required=true",
    "python_and_git_host_policy_required=true",
    "bootstrap_execution_authorized=false",
    "inner_installer_execution_authorized=false",
    "credential_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "funds_movement_authorized=false",
):
    assert marker in source_plan.stdout.splitlines(), marker

print("VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_INSTALL_V6_PROOF_GREEN")
print("target_blob_bound=true")
print("accepted_bootstrap_v6_lock_bound=true")
print("source_generation_v3_manifest_bound=true")
print("accepted_bootstrap_v6_binary_bound=true")
print("python_and_git_host_policy_bound=true")
print("tool_alias_regression_cases=" + str(tool_alias_cases))
print("root_owned_python_symlink_accepted=true")
print("unsafe_tool_aliases_and_targets_rejected=true")
print("tool_alias_generation_drift_rejected=true")
print("wrong_confirmation_precedes_host_reads=true")
print("single_rename_noreplace_publication=true")
print("generation_bound_stage_cleanup_required=true")
print("prepublication_cleanup_failure_fail_closed=true")
print("post_publication_failure_truth_monotonic=true")
print("post_publication_rollback=false")
print("bootstrap_execution=false")
print("inner_installer_execution=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("rpc_call=false")
print("funds_movement=false")
