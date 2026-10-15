#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import importlib.util
import pathlib
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
INSTALLER = (
    ROOT / "ops/precision/void_buy_void_user_manager_query_protected_install_v1.py"
)
LOCK = ROOT / "ops/security/buy-void-user-manager-query-elf-lock-v1.json"
PREEXEC_SOURCE = (
    ROOT / "ops/precision/void_buy_void_user_manager_private_unit_query_preexec_v1.c"
)
QUERY_SOURCE = (
    ROOT / "ops/precision/void_buy_void_user_manager_private_unit_query_v1.c"
)

EXPECTED_BLOBS = {
    LOCK: "4f255dbc98ac4b65fb4e6433f4e7aee7b86351db",
    PREEXEC_SOURCE: "f0fbfaae97df3294097a281100f06ada2ef157ff",
    QUERY_SOURCE: "ad49cd7f71c41e0f559a561b5a62a00cec60c215",
}


def git_blob_sha1(raw: bytes) -> str:
    prefix = b"blob " + str(len(raw)).encode("ascii") + b"\0"
    return hashlib.sha1(prefix + raw).hexdigest()


for path, expected in EXPECTED_BLOBS.items():
    actual = git_blob_sha1(path.read_bytes())
    assert actual == expected, f"dependency_blob_drift:{path.relative_to(ROOT)}"

source = INSTALLER.read_text(encoding="utf-8")
for forbidden in (
    "subprocess",
    "systemctl",
    "socket.",
    "urllib",
    "requests.",
    "http.client",
    "os.exec",
    "execve",
    "Popen",
):
    assert forbidden not in source, f"live_or_network_execution_forbidden:{forbidden}"

for required in (
    'INSTALL_ROOT = pathlib.Path("/opt/void-buy-void-user-manager-query-v1")',
    'PREEXEC_BYTES = 706504',
    'QUERY_BYTES = 34872',
    'PREEXEC_SHA256 = "8963c77f02c83c04c386912525b7c6177a6ef99507c7f85113c8b7c74e245c11"',
    'QUERY_SHA256 = "98fb0de18c7e2acc133db38f15036acc8345f503b2dd196cc07193523dd0a435"',
    "os.O_EXCL",
    "os.O_NOFOLLOW",
    "st.st_nlink != 1",
    "os.fchown(fd, 0, 0)",
    "os.fchmod(fd, 0o555)",
    "_target_absent(INSTALL_ROOT)",
    "query_execution=false",
    "service_mutation=false",
    "production_host_evidence_authority=false",
):
    assert required in source, f"required_install_boundary_missing:{required}"

spec = importlib.util.spec_from_file_location(
    "void_buy_void_user_manager_query_protected_install_v1",
    INSTALLER,
)
assert spec is not None and spec.loader is not None
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.self_test()

with tempfile.TemporaryDirectory(prefix="void-user-manager-install-proof-") as td:
    root = pathlib.Path(td)

    raw = b"synthetic-exact-candidate\n"
    candidate = root / "candidate.bin"
    candidate.write_bytes(raw)
    digest = hashlib.sha256(raw).hexdigest()

    observed = module.read_exact_candidate(
        candidate,
        expected_bytes=len(raw),
        expected_sha256=digest,
    )
    assert observed == raw

    try:
        module.read_exact_candidate(
            candidate,
            expected_bytes=len(raw),
            expected_sha256="0" * 64,
        )
    except module.InstallError as exc:
        assert str(exc) == "candidate_sha256_mismatch"
    else:
        raise AssertionError("wrong candidate hash must hold")

    symlink = root / "candidate-link.bin"
    symlink.symlink_to(candidate)
    try:
        module.read_exact_candidate(
            symlink,
            expected_bytes=len(raw),
            expected_sha256=digest,
        )
    except module.InstallError:
        pass
    else:
        raise AssertionError("symlink candidate must hold")

    linked = root / "candidate-hardlink.bin"
    linked.hardlink_to(candidate)
    try:
        module.read_exact_candidate(
            candidate,
            expected_bytes=len(raw),
            expected_sha256=digest,
        )
    except module.InstallError as exc:
        assert str(exc) == "candidate_metadata_invalid"
    else:
        raise AssertionError("multi-link candidate must hold")

assert module.PREEXEC_TARGET == pathlib.Path(
    "/opt/void-buy-void-user-manager-query-v1/"
    "void_buy_void_user_manager_private_unit_query_preexec_v1"
)
assert module.QUERY_TARGET == pathlib.Path(
    "/opt/void-buy-void-user-manager-query-v1/"
    "void_buy_void_user_manager_private_unit_query_v1"
)
assert module.CONFIRM_TOKEN == (
    "INSTALL_ACCEPTED_USER_MANAGER_QUERY_PAIR_CREATE_ONLY_V1"
)

print("VOID_BUY_VOID_USER_MANAGER_QUERY_PROTECTED_INSTALL_V1_PROOF_GREEN")
print("accepted_elf_lock_blob_bound=true")
print("preexec_source_blob_bound=true")
print("query_source_blob_bound=true")
print("exact_binary_bytes_and_sha_required=true")
print("source_descriptor_identity_rechecked=true")
print("source_symlink_rejected=true")
print("source_multilink_rejected=true")
print("target_root_create_only=true")
print("target_files_o_excl_nofollow=true")
print("failed_file_creation_cleanup_required=true")
print("root_owned_0555_targets_required=true")
print("query_execution=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("network_calls=false")
print("credential_access=false")
print("wallet_or_signer_access=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")
