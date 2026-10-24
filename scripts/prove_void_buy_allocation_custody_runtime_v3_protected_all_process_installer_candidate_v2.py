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
      "protected_all_process_installer_candidate_v2.py"
)
EXPECTED_SOURCE_BLOB = "6fc600431e122d587661f2413b07d4a540cdc0c9"


def git_blob(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


assert git_blob(TARGET.read_bytes()) == EXPECTED_SOURCE_BLOB

spec = importlib.util.spec_from_file_location(
    "void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v2",
    TARGET,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.MARKER == (
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V2"
)
assert module.SCHEMA == (
    "void_buy_void_custody_runtime_v3_"
    "protected_all_process_installer_candidate_v2"
)
assert module.PLAN_GIT_BLOB == (
    "0fef4e6f76738dd474ea775985b1facdd922bb54"
)
assert module.PLAN_HEAD == (
    "06395abde20620b99808f62fe0d90a3f2e05528e"
)
assert module.LOCK_GIT_BLOB == (
    "5ba0c8d7b1ab8e8384472bb867e0603e6986b9b1"
)
assert module.PREDECESSOR_INSTALLER_LOCK_GIT_BLOB == (
    "a1e1f4887787b408d313e73360966f93a63b2b58"
)
assert module.PREDECESSOR_INSTALLER_HEAD == (
    "395249d8eab96adbdf5b15c6654326bd827aa1a0"
)
assert module.PREDECESSOR_INSTALLER_SOURCE_GIT_BLOB == (
    "9dd33f38fe4c89a5d2beacbc535380346eaea83b"
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
assert plan["candidate_contract"]["builtin_voidfs_required"] is True
assert plan["candidate_contract"]["voidfs_origin_required"] == "built-in"
assert plan["candidate_contract"]["voidfs_public_surface_exact"] == [
    "rename_noreplace"
]
assert plan["candidate_contract"]["ctypes_forbidden"] is True
assert plan["candidate_contract"]["dynamic_symbol_lookup_forbidden"] is True
assert plan["candidate_contract"]["libc_symbol_lookup_fallback"] is False
assert plan["candidate_contract"]["same_parent_fd_publication_required"] is True
assert (
    plan["predecessor_installer_lock"]["git_blob_sha1"]
    == "a1e1f4887787b408d313e73360966f93a63b2b58"
)
assert plan["candidate_contract"]["destination_absent_required"] is True
assert plan["candidate_contract"]["stage_absent_required"] is True
assert plan["candidate_contract"]["same_filesystem_stage_required"] is True
assert plan["candidate_contract"]["truthful_post_publication_failure_receipt_required"] is True
assert plan["candidate_contract"]["stage_generation_unknown_hold_required"] is True
assert (
    plan["candidate_contract"]["retry_after_unknown_stage_requires_operator_inspection"]
    is True
)
assert plan["authority"]["protected_install_authorized"] is False
assert plan["authority"]["protected_source_installed"] is False
assert plan["authority"]["live_privileged_census_authorized"] is False
assert plan["authority"]["replacement_apply_authorized"] is False
assert plan["authority"]["payment_acceptance"] is False
assert plan["authority"]["public_presale_activation"] is False
assert plan["authority"]["funds_movement"] is False

module.self_test()

with tempfile.TemporaryDirectory(
    prefix="void-custody-installer-v2-fifo-read-proof-"
) as tmp:
    parent = Path(tmp)
    leaf = parent / "bound-input"
    backup = parent / "bound-input.original"
    leaf.write_bytes(b"fixture-input\n")

    saved_open = module.os.open
    swapped = {"done": False}

    def fifo_swap_open(path, flags, mode=0o777, *, dir_fd=None):
        if (
            path == "bound-input"
            and dir_fd is not None
            and not swapped["done"]
            and (flags & getattr(os, "O_DIRECTORY", 0)) == 0
        ):
            assert flags & os.O_NOFOLLOW
            assert flags & os.O_NONBLOCK
            swapped["done"] = True
            leaf.rename(backup)
            os.mkfifo(leaf)
            try:
                fd = saved_open(path, flags, mode, dir_fd=dir_fd)
            finally:
                if leaf.exists():
                    leaf.unlink()
                if backup.exists():
                    backup.rename(leaf)
            return fd
        return saved_open(path, flags, mode, dir_fd=dir_fd)

    module.os.open = fifo_swap_open
    try:
        try:
            module._read_bound_regular(leaf, 1024)
        except module.InstallError as exc:
            assert "source_file_rebound" in str(exc), str(exc)
        else:
            raise AssertionError("FIFO substitution was accepted")
    finally:
        module.os.open = saved_open
        if leaf.exists() and not leaf.is_file():
            leaf.unlink()
        if backup.exists():
            if leaf.exists():
                leaf.unlink()
            backup.rename(leaf)

    assert swapped["done"] is True

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
    "_validate_voidfs_module",
    "_require_builtin_voidfs",
    "_bridge_errno",
    "_voidfs_rename_noreplace",
    "voidfs_builtin_module_required",
    "voidfs_module_not_builtin",
    "voidfs_public_surface_invalid",
    "rename_noreplace_bridge_contract_failure",
    "destination_root_present",
    "staging_root_present",
    "stage_initial_rebound",
    "prepublication_stage_generation_unknown",
    "possible_residual_stage",
    "retry_requires_operator_inspection",
    "prepublication_failure_stage_cleanup_incomplete",
    "prepublication_failure_stage_cleanup_error",
    "stage_cross_filesystem",
    "os.O_CREAT",
    "os.O_EXCL",
    "os.O_NOFOLLOW",
    "os.O_NONBLOCK",
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
    "import ctypes",
    "ctypes.",
    '__import__("ctypes")',
    "CDLL",
    "renameat2",
    "dlopen",
    "dlsym",
    "libc.",
):
    assert forbidden not in source, forbidden

assert "_voidfs_rename_noreplace" in source
assert (
    "rename_fn: Callable[[int, str, str], None] = "
    "_voidfs_rename_noreplace"
) in source
assert '"_voidfs" not in _bootstrap_sys.builtin_module_names' in source
assert 'getattr(spec, "origin", None) != "built-in"' in source
assert 'public != ["rename_noreplace"]' in source

production_bridge = source.split(
    "def _voidfs_rename_noreplace(", 1
)[1].split("def _stat_nofollow_at", 1)[0]
assert "os.rename(" not in production_bridge
assert "_fixture_rename_noreplace" not in production_bridge

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
assert stage_create_block.index("stage_created = True") < stage_create_block.index(
    "stage_initial_stat_fn(parent_fd, stage_name)"
)
assert stage_create_block.index("stage_identity =") < stage_create_block.index(
    "stage_fd = os.open("
)

with tempfile.TemporaryDirectory(
    prefix="void-custody-procref-stage-generation-unknown-proof-"
) as tmp:
    parent = Path(tmp) / "opt"
    parent.mkdir(mode=0o755)

    def fail_first_post_mkdir_stat(_fd: int, _name: str):
        raise OSError("proof_first_post_mkdir_identity_failure")

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
            stage_initial_stat_fn=fail_first_post_mkdir_stat,
        )
    except module.StageGenerationUnknownError as exc:
        assert exc.stage_creation_succeeded is True
        assert exc.stage_identity_bound is False
        assert exc.possible_residual_stage is True
        assert exc.retry_requires_operator_inspection is True
        assert exc.stage_name == module.STAGE_NAME
        assert (
            "proof_first_post_mkdir_identity_failure"
            in exc.original_failure_reason
        )
    else:
        raise AssertionError("unbound created stage did not raise dedicated HOLD")
    assert (parent / module.STAGE_NAME).is_dir()
    assert not (parent / module.INSTALL_NAME).exists()

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
assert "source_name: str" in root_verifier
assert "names != [source_name]" in root_verifier
assert "_file_ok(\n            fd,\n            source_name," in root_verifier


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
        rename_fn=module._fixture_rename_noreplace,
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
        rename_fn=module._fixture_rename_noreplace,
    )
    assert result["protected_source_installed"] is False

print(
    "VOID_BUY_VOID_CUSTODY_RUNTIME_V3_"
    "PROTECTED_ALL_PROCESS_INSTALLER_CANDIDATE_V2_PROOF_GREEN"
)
print("exact_source_blob_asserted=true")
print("accepted_plan_exact=true")
print("accepted_lock_exact=true")
print("predecessor_installer_lock_exact=true")
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
print("bound_stage_cleanup_before_publication=true")
print("stage_identity_bound_on_first_successful_post_create_read=true")
print("stage_generation_unknown_hold=true")
print("possible_residual_stage_reported=true")
print("retry_after_unknown_stage_requires_operator_inspection=true")
print("first_post_mkdir_identity_failure_regression=true")
print("cleanup_failure_explicit_hold=true")
print("forced_rename_failure_cleanup_proven=true")
print("kernel_rename_noreplace_required=true")
print("builtin_voidfs_required=true")
print("voidfs_contract_validator_tested=true")
print("ctypes_forbidden=true")
print("dynamic_symbol_lookup_forbidden=true")
print("libc_symbol_lookup_fallback=false")
print("same_parent_fd_publication_required=true")
print("production_voidfs_bridge_no_os_rename_fallback=true")
print("fixed_entrypoint_no_bridge_override=true")
print("source_fsync_before_publication=true")
print("stage_directory_fsync_before_publication=true")
print("parent_fsync_after_publication=true")
print("exact_post_publication_verification_required=true")
print("final_root_descriptor_close_deterministic=true")
print("internal_final_source_name_parameterized=true")
print("truthful_post_publication_failure_receipt=true")
print("postpublication_failure_preserves_final_root=true")
print("hosted_postpublication_fixture_bridge_explicit=true")
print("repository_input_fifo_substitution_nonblocking_rejected=true")
print("without_dash_b_bootstrap_hold=true")
print("protected_install_authorized=false")
print("protected_source_installed=false")
print("live_privileged_census_authorized=false")
print("replacement_apply_authorized=false")
print("runtime_integration=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
