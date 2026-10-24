#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent.parent
TARGET = (
    ROOT
    / "ops/precision/"
      "void_buy_allocation_custody_runtime_v3_"
      "protected_all_process_installer_candidate_v1.py"
)
EXPECTED_SOURCE_BLOB = "5e7bc14863ea9e4ab61a982083ab552258cdd692"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V1"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_"
    "protected_all_process_installer_candidate_v1"
)
assert module.PLAN_GIT_BLOB == (
    "d0d500d5a4715c9319e702350a8851884b4baff8"
)
assert module.PLAN_HEAD == (
    "47a6f1ae0b6f0cebbfa7d6b859436d1e5858eb97"
)
assert module.LOCK_GIT_BLOB == (
    "5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1"
)
assert module.ACCEPTED_SOURCE_GIT_BLOB == (
    "33a7221cad37aec70474b97b26c2b10e2ef60f66"
)
assert module.ACCEPTED_SOURCE_BYTES == 74322
assert module.ACCEPTED_SOURCE_SHA256 == (
    "d5b91c7efa048eb40601d162185563a29916f1ff22a23638c7da5f330b92beba"
)
assert module.INSTALL_ROOT == Path(
    "/opt/void-buy-allocation-custody-procref-v1"
)
assert module.STAGE_ROOT == Path(
    "/opt/.void-buy-allocation-custody-procref-v1.stage-v1"
)
assert module.FINAL_ROOT_MODE == 0o555
assert module.FINAL_SOURCE_MODE == 0o444
assert module.RENAME_NOREPLACE == 1
assert module.PROTECTED_FIRST_ENTRY_REQUIRED is True
assert module.DIRECT_APPLY_CLI is False

source_raw = module.verify_repository_inputs()
assert len(source_raw) == module.ACCEPTED_SOURCE_BYTES
assert module.sha256(source_raw) == module.ACCEPTED_SOURCE_SHA256

plan = module.source_plan()
assert plan["candidate_contract"]["installer_algorithm_implemented"] is True
assert plan["candidate_contract"]["direct_apply_cli"] is False
assert plan["candidate_contract"]["protected_first_entry_required"] is True
assert plan["candidate_contract"]["create_only"] is True
assert plan["candidate_contract"]["kernel_rename_noreplace_required"] is True
assert plan["candidate_contract"]["destination_absent_required"] is True
assert plan["candidate_contract"]["stage_absent_required"] is True
assert plan["candidate_contract"]["same_filesystem_stage_required"] is True
assert plan["candidate_contract"]["truthful_post_publication_failure_receipt_required"] is True
assert plan["authority"]["protected_install_authorized"] is False
assert plan["authority"]["protected_source_installed"] is False
assert plan["authority"]["live_privileged_census_authorized"] is False
assert plan["authority"]["replacement_apply_authorized"] is False
assert plan["authority"]["payment_acceptance"] is False
assert plan["authority"]["public_presale_activation"] is False
assert plan["authority"]["funds_movement"] is False

module.self_test()

cmd = [sys.executable, "-I", "-B", str(TARGET)]

source_plan = subprocess.run(
    cmd + ["--source-plan"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert source_plan.returncode == 0, source_plan.stderr + source_plan.stdout
parsed = json.loads(source_plan.stdout)
assert parsed["candidate_contract"]["direct_apply_cli"] is False
assert parsed["candidate_contract"]["protected_first_entry_required"] is True
assert parsed["authority"]["protected_install_authorized"] is False
assert parsed["authority"]["funds_movement"] is False

apply_attempt = subprocess.run(
    cmd + ["--apply"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert apply_attempt.returncode != 0

without_b = subprocess.run(
    [sys.executable, "-I", str(TARGET), "--source-plan"],
    cwd="/",
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=30,
    env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LC_ALL": "C"},
)
assert without_b.returncode == 2
assert (
    "reason=python_isolated_unoptimized_no_bytecode_mode_required"
    in without_b.stdout
)

source = TARGET.read_text(encoding="utf-8")

for required in (
    "_apply_create_only_internal",
    "install_accepted_source_create_only_after_protected_first_entry",
    "_verify_root",
    "_renameat2_noreplace",
    "RENAME_NOREPLACE",
    "destination_root_present",
    "staging_root_present",
    "stage_initial_rebound",
    "prepublication_failure_stage_cleanup_incomplete",
    "prepublication_failure_stage_cleanup_error",
    "stage_cross_filesystem",
    "os.O_CREAT",
    "os.O_EXCL",
    "os.O_NOFOLLOW",
    "os.fsync(file_fd)",
    "os.fsync(stage_fd)",
    "parent_fsync_fn(parent_fd)",
    "published_install_needs_inspection",
    "forced_rename_failure_cleanup_proven=true",
    "postpublication_failure_preserves_final_root=true",
    "direct_apply_cli",
    "protected_first_entry_required",
    "protected_installer_first_entry_verified",
    "parameterized_internal_receipt_never_claims_protected_install",
    "fixed_entrypoint_accepted_source_mismatch",
    "fixed_entrypoint_internal_receipt_invalid",
    "protected_install_authorized",
    "live_privileged_census_authorized",
    "replacement_apply_authorized",
):
    assert required in source, required

for forbidden in (
    'group.add_argument("--apply"',
    'parser.add_argument("--apply"',
    "subprocess",
    "systemctl",
    "socket.",
    "requests.",
    "urllib",
    "wallet",
    "private_key",
    "eth_send",
):
    assert forbidden not in source, forbidden

assert source.index("os.fsync(file_fd)") < source.index(
    "rename_fn(parent_fd, stage_name, install_name)"
)
assert source.index("os.fsync(stage_fd)") < source.index(
    "rename_fn(parent_fd, stage_name, install_name)"
)
assert source.index(
    "rename_fn(parent_fd, stage_name, install_name)"
) < source.index("parent_fsync_fn(parent_fd)")
assert source.index("os.fchmod(stage_fd, 0o700)") < source.index(
    "os.unlink(source_name, dir_fd=stage_fd)"
)

stage_create_block = source.split("os.mkdir(stage_name, 0o700, dir_fd=parent_fd)", 1)[1].split(
    "file_fd = os.open(", 1
)[0]
assert stage_create_block.index("stage_identity =") < stage_create_block.index(
    "stage_fd = os.open("
)

with tempfile.TemporaryDirectory(
    prefix="void-custody-procref-installer-cleanup-proof-"
) as tmp:
    parent = Path(tmp) / "opt"
    parent.mkdir(mode=0o755)

    def fail_rename(_fd: int, _source: str, _target: str) -> None:
        raise module.InstallError("proof_injected_rename_failure")

    saved_cleanup = module._cleanup_stage
    module._cleanup_stage = lambda *_args, **_kwargs: False
    try:
        try:
            module._apply_create_only_internal(
                parent=parent,
                install_name=module.INSTALL_NAME,
                stage_name=module.STAGE_NAME,
                source_name=module.SOURCE_NAME,
                source_raw=source_raw,
                expected_uid=os.geteuid(),
                expected_gid=os.getegid(),
                require_root_parent=False,
                rename_fn=fail_rename,
            )
        except module.InstallError as exc:
            assert "prepublication_failure_stage_cleanup_incomplete" in str(exc)
        else:
            raise AssertionError("cleanup failure did not become explicit HOLD")
    finally:
        module._cleanup_stage = saved_cleanup
        parent_fd, _ = module._open_bound_directory(parent)
        try:
            saved_cleanup(
                parent_fd,
                stage_name=module.STAGE_NAME,
                source_name=module.SOURCE_NAME,
                stage_identity=(
                    lambda st: (st.st_dev, st.st_ino)
                )(os.stat(
                    module.STAGE_NAME,
                    dir_fd=parent_fd,
                    follow_symlinks=False,
                )),
            )
        finally:
            os.close(parent_fd)

root_verifier = source.split("def _verify_root(", 1)[1].split(
    "def _renameat2_noreplace(", 1
)[0]
assert "finally:" in root_verifier
assert "os.close(fd)" in root_verifier


internal_fn = source.split("def _apply_create_only_internal(", 1)[1].split(
    "def install_accepted_source_create_only_after_protected_first_entry(", 1
)[0]
assert '"protected_source_installed": False' in internal_fn

fixed_fn = source.split(
    "def install_accepted_source_create_only_after_protected_first_entry()", 1
)[1].split("def source_plan()", 1)[0]
for exact in (
    "accepted = verify_repository_inputs()",
    "len(accepted) != ACCEPTED_SOURCE_BYTES",
    "sha256(accepted) != ACCEPTED_SOURCE_SHA256",
    "git_blob(accepted) != ACCEPTED_SOURCE_GIT_BLOB",
    "parent=INSTALL_PARENT",
    "install_name=INSTALL_NAME",
    "stage_name=STAGE_NAME",
    "source_name=SOURCE_NAME",
    "source_raw=accepted",
    "expected_uid=0",
    "expected_gid=0",
    "require_root_parent=True",
    '"protected_source_installed": True',
    '"fixed_destination_bound": True',
    '"accepted_source_identity_bound": True',
    '"root_identity_bound": True',
):
    assert exact in fixed_fn, exact

captured = {}
saved_getuid = module.os.getuid
saved_geteuid = module.os.geteuid
saved_getgid = module.os.getgid
saved_getegid = module.os.getegid
saved_verify = module.verify_repository_inputs
saved_internal = module._apply_create_only_internal
try:
    module.os.getuid = lambda: 0
    module.os.geteuid = lambda: 0
    module.os.getgid = lambda: 0
    module.os.getegid = lambda: 0
    module.verify_repository_inputs = lambda: source_raw

    def capture_internal(**kwargs):
        captured.update(kwargs)
        return {
            "publication": True,
            "publication_state": "published_verified",
            "parent_fsync_completed": True,
            "final_verification_completed": True,
            "create_only": True,
            "rename_noreplace_used": True,
            "fixture_or_internal_publication": True,
            "protected_source_installed": False,
            "live_privileged_census_executed": False,
            "replacement_apply_authorized": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "funds_movement": False,
        }

    module._apply_create_only_internal = capture_internal
    fixed_receipt = (
        module.install_accepted_source_create_only_after_protected_first_entry()
    )
finally:
    module.os.getuid = saved_getuid
    module.os.geteuid = saved_geteuid
    module.os.getgid = saved_getgid
    module.os.getegid = saved_getegid
    module.verify_repository_inputs = saved_verify
    module._apply_create_only_internal = saved_internal

assert captured == {
    "parent": module.INSTALL_PARENT,
    "install_name": module.INSTALL_NAME,
    "stage_name": module.STAGE_NAME,
    "source_name": module.SOURCE_NAME,
    "source_raw": source_raw,
    "expected_uid": 0,
    "expected_gid": 0,
    "require_root_parent": True,
}
assert fixed_receipt["protected_source_installed"] is True
assert fixed_receipt["fixture_or_internal_publication"] is False
assert fixed_receipt["fixed_destination_bound"] is True
assert fixed_receipt["accepted_source_identity_bound"] is True
assert fixed_receipt["root_identity_bound"] is True

with tempfile.TemporaryDirectory(
    prefix="void-custody-procref-wrong-payload-proof-"
) as tmp:
    parent = Path(tmp) / "opt"
    parent.mkdir(mode=0o755)
    wrong = source_raw + b"\n# wrong payload\n"
    result = module._apply_create_only_internal(
        parent=parent,
        install_name=module.INSTALL_NAME,
        stage_name=module.STAGE_NAME,
        source_name=module.SOURCE_NAME,
        source_raw=wrong,
        expected_uid=os.geteuid(),
        expected_gid=os.getegid(),
        require_root_parent=False,
    )
    assert result["protected_source_installed"] is False

with tempfile.TemporaryDirectory(
    prefix="void-custody-procref-wrong-destination-proof-"
) as tmp:
    parent = Path(tmp) / "opt"
    parent.mkdir(mode=0o755)
    result = module._apply_create_only_internal(
        parent=parent,
        install_name="wrong-install-root",
        stage_name=".wrong-stage-root",
        source_name="wrong-source.py",
        source_raw=source_raw,
        expected_uid=os.geteuid(),
        expected_gid=os.getegid(),
        require_root_parent=False,
    )
    assert result["protected_source_installed"] is False

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V1_PROOF_GREEN"
)
print("exact_source_blob_asserted=true")
print("accepted_plan_exact=true")
print("accepted_lock_exact=true")
print("accepted_source_exact=true")
print("installer_algorithm_implemented=true")
print("fixed_least_authority_install_entrypoint=true")
print("parameterized_internal_receipt_never_claims_protected_install=true")
print("wrong_payload_cannot_claim_protected_install=true")
print("wrong_destination_cannot_claim_protected_install=true")
print("fixed_entrypoint_exact_arguments_proven=true")
print("direct_apply_cli=false")
print("protected_first_entry_required=true")
print("create_only=true")
print("destination_collision_rejected=true")
print("stage_identity_bound_immediately_after_create=true")
print("cleanup_failure_explicit_hold=true")
print("forced_rename_failure_cleanup_proven=true")
print("kernel_rename_noreplace_required=true")
print("source_fsync_before_publication=true")
print("stage_directory_fsync_before_publication=true")
print("parent_fsync_after_publication=true")
print("exact_post_publication_verification_required=true")
print("final_root_descriptor_close_deterministic=true")
print("truthful_post_publication_failure_receipt=true")
print("postpublication_failure_preserves_final_root=true")
print("without_dash_b_bootstrap_hold=true")
print("protected_install_authorized=false")
print("protected_source_installed=false")
print("live_privileged_census_authorized=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
