#!/usr/bin/env python3
from __future__ import annotations

import hashlib
from pathlib import Path
import stat
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_"
    "MATERIALIZER_V2"
)
MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_v2.py"
)
MATERIALIZER_BLOB = "611e5d54154e3d3d5d9e7ba6c0374d697ecc3ba7"
LOCK_REL = (
    "ops/security/"
    "buy-void-epoch2-dormant-binder-installer-first-entry-"
    "candidate-lock-v2.json"
)
LOCK_BLOB = "227c2fa449abf1387925373c706ecd07775d5898"
CANDIDATE_REL = (
    "scripts/prove_buy_void_epoch2_dormant_binder_"
    "installer_first_entry_candidate_v2.py"
)
CANDIDATE_BLOB = "de2f487c625cf96c812cb6d4246d3d036a589e89"
LAUNCHER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_installer_first_entry_v2.c"
)
LAUNCHER_BLOB = "86dc09e52402c04fb6e4b30a7fcf695833808ca3"
RUNTIME_CHILD_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py"
)
RUNTIME_CHILD_BLOB = "f3d6b1559be7490303cf36338c4bfa38fdaa390a"

LOCK_ID = (
    "voidbuye2dormantfirstentrylock2_"
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543"
)
CANDIDATE_ID = (
    "voidbuye2dormantfirstentrycand2_"
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b"
)
EXPECTED_REPORT_SHA256 = (
    "2eafc4dc83d7d59fbd5e1d7a7fa809661c72e3387ae83e7f3badae78780da6ac"
)
EXPECTED_BYTES = 731_072
EXPECTED_SHA256 = (
    "4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28"
)
EXPECTED_GIT_BLOB = "798907b18c73ee2cc1dea0fe05b36f27ab4137a7"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def pin(relative: str, expected: str) -> bytes:
    raw = (ROOT / relative).read_bytes()
    assert git_blob(raw) == expected, relative
    return raw


materializer_raw = pin(MATERIALIZER_REL, MATERIALIZER_BLOB)
pin(LOCK_REL, LOCK_BLOB)
pin(CANDIDATE_REL, CANDIDATE_BLOB)
pin(LAUNCHER_REL, LAUNCHER_BLOB)
pin(RUNTIME_CHILD_REL, RUNTIME_CHILD_BLOB)

source = materializer_raw.decode("utf-8", "strict")
compile(source, MATERIALIZER_REL, "exec", dont_inherit=True)

for required in (
    'LOCK_BLOB = "' + LOCK_BLOB + '"',
    "voidbuye2dormantfirstentrylock2_",
    "89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543",
    "voidbuye2dormantfirstentrycand2_",
    "b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b",
    'CANDIDATE_BLOB = "' + CANDIDATE_BLOB + '"',
    'EXPECTED_REPORT_BYTES = 6131',
    EXPECTED_REPORT_SHA256,
    'EXPECTED_BINARY_BYTES = 731_072',
    EXPECTED_SHA256,
    EXPECTED_GIT_BLOB,
    '"candidate_lock_v2"',
    '"CANDIDATE_LOCK_V2"',
    '"version": 2',
    '"runtime_head_contract_accepted": True',
    '"canonical_main_candidate_authority": True',
    '"superseded_v1_lock_install_authority": False',
    '"runtime_expected_head_compile_bound": False',
    '"runtime_expected_head_strict_lowercase_hex": True',
    '"runtime_expected_head_forwarded_unchanged": True',
    '"repository_head_not_embedded_in_launcher": True',
    '"frozen_child_launcher_path_compatible": True',
    'load_candidate_from_worktree(worktree)',
    'report, binary = module.derive()',
    'os.O_EXCL',
    'os.O_NOFOLLOW',
    'os.fsync(fd)',
    'os.fsync(parent_fd)',
    'output_descriptor_readback_mismatch',
    'output_visible_generation_changed',
    'output_failure_destructive_cleanup=false',
    'protected_install_authorized=false',
    'precision_install_authorized=false',
    'native_or_binder_live_execution_authorized=false',
    'funds_movement=false',
):
    assert required in source, required

for forbidden in (
    "systemctl",
    "eth_sendRawTransaction",
    "payment_acceptance=true",
    "public_presale_activation=true",
    "wc_void_market_activation=true",
    "funds_movement=true",
    "os.unlink(",
    "Path.unlink(",
    "shutil.rmtree",
):
    assert forbidden not in source, forbidden

python = "/usr/bin/python3"
self_test = subprocess.run(
    [python, "-I", "-B", str(ROOT / MATERIALIZER_REL), "--self-test"],
    cwd=ROOT,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    check=False,
    timeout=90,
)
assert self_test.returncode == 0, self_test.stderr
for line in (
    MARKER + "_SELF_TEST_GREEN",
    "accepted_first_entry_lock_v2_bound=true",
    "runtime_head_contract_accepted=true",
    "superseded_v1_lock_install_authority=false",
    "candidate_merge_exact=true",
    "candidate_tool_verified_before_execution=true",
    "candidate_rederived_at_locked_merge=true",
    "create_only_output=true",
    "output_descriptor_readback=true",
    "output_parent_directory_fsync=true",
    "output_failure_destructive_cleanup=false",
    "launcher_binary_identity_accepted=true",
    "protected_install_authorized=false",
    "precision_install_authorized=false",
    "native_or_binder_live_execution_authorized=false",
    "funds_movement=false",
):
    assert line in self_test.stdout.splitlines(), line

with tempfile.TemporaryDirectory(
    prefix="void-e2-first-entry-materializer-v2-proof-"
) as td:
    root = Path(td)
    first = root / "launcher-v2-a"
    second = root / "launcher-v2-b"

    outputs: list[bytes] = []
    for target in (first, second):
        cp = subprocess.run(
            [
                python, "-I", "-B", str(ROOT / MATERIALIZER_REL),
                "--derive", str(target),
            ],
            cwd=ROOT,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            timeout=300,
        )
        assert cp.returncode == 0, cp.stderr
        lines = cp.stdout.splitlines()
        for line in (
            MARKER + "_DERIVE_GREEN",
            "candidate_report_sha256=" + EXPECTED_REPORT_SHA256,
            "candidate_id=" + CANDIDATE_ID,
            "launcher_binary_bytes=" + str(EXPECTED_BYTES),
            "launcher_binary_sha256=" + EXPECTED_SHA256,
            "accepted_lock_id=" + LOCK_ID,
            "runtime_head_contract_accepted=true",
            "superseded_v1_lock_install_authority=false",
            "output_descriptor_readback=true",
            "output_parent_directory_fsync=true",
            "output_failure_destructive_cleanup=false",
            "launcher_binary_identity_accepted=true",
            "protected_install_authorized=false",
            "precision_install_authorized=false",
            "native_or_binder_live_execution_authorized=false",
            "funds_movement=false",
        ):
            assert line in lines, line

        st = target.lstat()
        assert stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode)
        assert st.st_nlink == 1
        assert stat.S_IMODE(st.st_mode) == 0o555
        assert st.st_size == EXPECTED_BYTES
        raw = target.read_bytes()
        assert len(raw) == EXPECTED_BYTES
        assert hashlib.sha256(raw).hexdigest() == EXPECTED_SHA256
        assert git_blob(raw) == EXPECTED_GIT_BLOB
        outputs.append(raw)

    assert outputs[0] == outputs[1]

    readelf = subprocess.run(
        ["/usr/bin/readelf", "-lW", str(first)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
    )
    assert readelf.returncode == 0, readelf.stderr
    assert " INTERP " not in readelf.stdout
    assert "Requesting program interpreter" not in readelf.stdout

    dynamic = subprocess.run(
        ["/usr/bin/readelf", "-dW", str(first)],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
    )
    assert "NEEDED" not in dynamic.stdout + dynamic.stderr

    duplicate = subprocess.run(
        [
            python, "-I", "-B", str(ROOT / MATERIALIZER_REL),
            "--derive", str(first),
        ],
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=300,
    )
    assert duplicate.returncode == 2
    assert "reason=output_exists" in duplicate.stdout.splitlines()
    assert "protected_install_authorized=false" in duplicate.stdout.splitlines()
    assert "funds_movement=false" in duplicate.stdout.splitlines()

print(MARKER + "_PROOF_GREEN")
print("materializer_blob_bound=true")
print("accepted_first_entry_lock_v2_bound=true")
print("candidate_tool_blob_bound=true")
print("launcher_source_blob_bound=true")
print("runtime_child_source_blob_bound=true")
print("runtime_head_contract_accepted=true")
print("candidate_rederived_at_locked_merge=true")
print("two_materializations_byte_identical=true")
print("accepted_binary_bytes=" + str(EXPECTED_BYTES))
print("accepted_binary_sha256=" + EXPECTED_SHA256)
print("accepted_binary_git_blob=" + EXPECTED_GIT_BLOB)
print("static_no_pt_interp_verified=true")
print("dynamic_needed_absent=true")
print("create_only_output_replay_rejected=true")
print("output_descriptor_readback=true")
print("output_parent_directory_fsync=true")
print("output_failure_destructive_cleanup=false")
print("artifact_publication_only=true")
print("protected_install_authorized=false")
print("precision_install_authorized=false")
print("native_or_binder_live_execution_authorized=false")
print("funds_movement=false")
