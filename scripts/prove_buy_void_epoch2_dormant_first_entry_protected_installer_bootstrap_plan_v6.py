#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import types

ROOT = Path(__file__).resolve().parents[1]

TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_installer_bootstrap_plan_v6.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "d80cf0a527e7bb948ef2e395edeae7b5eae9afa4"

QUALIFIER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_installed_qualification_v6.py"
)
QUALIFIER_BLOB = "e16b0ce71a4522b21762fa824c96aefb58e3a25b"
INSTALLER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_install_v6.py"
)
INSTALLER_BLOB = "c9dd842b620f2ed7c3fdd5876c222a419b6b0c68"
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
):
    assert required in source, required

for forbidden in (
    "qualifier.collect(",
    "--installer-apply",
    "sudo",
    "subprocess.Popen",
    "os.system(",
    "os.execv",
    "os.execve",
    "os.fexecve",
):
    assert forbidden not in source, forbidden

tree = ast.parse(source, filename=TARGET_REL)
functions = {
    node.name: node
    for node in tree.body
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
}
for name in (
    "git",
    "repository_blob",
    "stable_artifact",
    "_safe_tool",
    "checkout_snapshot",
    "load_qualifier",
    "source_dependencies",
    "collect_plan",
    "emit_plan",
    "source_plan",
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
assert run_calls == ["git"], run_calls

module = types.ModuleType("void_e2_bootstrap_plan_v6_verified")
module.__file__ = str(TARGET)
module.__package__ = None
exec(
    compile(target_raw, TARGET_REL, "exec", dont_inherit=True, optimize=0),
    module.__dict__,
)

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
    }
    module.source_dependencies = lambda: {
        "launcher_lock": {"lock_id": EXPECTED_LAUNCHER_LOCK_ID},
        "native_lock": {"lock_id": "native"},
    }
    module.load_qualifier = lambda: fake_qualifier

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
            "ino": 2 if label == "accepted_launcher" else 3,
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
