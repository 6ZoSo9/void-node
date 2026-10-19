#!/usr/bin/env python3
"""Disposable filesystem adversaries for fixture-only Xiphos custody observer."""
import hashlib
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/xiphos/apollyon_training_start_consumption_directory_custody_candidate_v1.py"
PINS = {
    "ops/xiphos/apollyon_training_start_consumption_directory_custody_candidate_v1.py":
        "42408e7a65e3565a8a98cb4e23985c3ca76045bc",
    "tools/apollyon-training-start-consumption-protected-writer-v1.mjs":
        "473b4148e6bcb755bb8bf7c6af890150a9f43efe",
    "tools/apollyon-training-start-store-revalidation-request-v1.mjs":
        "be9347a157c7e220aa65cf3dad1c8b7781904277",
}


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


for relative, expected in PINS.items():
    observed = git_blob((ROOT / relative).read_bytes())
    assert observed == expected, (relative, observed, expected)

spec = importlib.util.spec_from_file_location(
    "apollyon_training_start_fixture_custody_v1", SOURCE,
)
assert spec is not None and spec.loader is not None
mod = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = mod
spec.loader.exec_module(mod)

uid = os.geteuid()
gid = os.getegid()
assert uid > 0 and gid > 0, "proof must run non-root"
assert mod.FIXED_ROOT == "/var/lib/void-apollyon-attempt-claim-v2"
assert mod.CONSUMPTION_LEAF == "training-start-consumption-v1"


def fixture(parent: str):
    root = Path(parent) / "claim-root"
    root.mkdir(mode=0o700)
    root.chmod(0o700)
    leaf = root / mod.CONSUMPTION_LEAF
    leaf.mkdir(mode=0o700)
    leaf.chmod(0o700)
    return root, leaf


def observe(root):
    return mod.observe_fixture_only(
        root, uid=uid, gid=gid, trusted_ancestors=False,
    )


def expect_hold(fn, code: str):
    try:
        fn()
    except mod.Hold as exc:
        assert str(exc) == code, (str(exc), code)
    else:
        raise AssertionError("unexpected success instead of " + code)


def fd_set():
    return sorted(os.listdir("/proc/self/fd"))


with tempfile.TemporaryDirectory(prefix="apollyon-consumption-custody-v1-") as td:
    root, leaf = fixture(td)
    before = fd_set()
    receipt = observe(root)
    assert fd_set() == before
    assert receipt["status"] == "fixture_directory_custody_observed_no_host_authority"
    assert receipt["fixture_only"] is True
    assert receipt["fixture_descriptor_stable"] is True
    assert receipt["fixture_visible_generation_stable"] is True
    assert receipt["trusted_ancestor_custody_proven"] is False
    assert receipt["fixture_root_identity"]["inode"] == root.stat().st_ino
    assert receipt["fixture_consumption_directory_identity"]["inode"] == leaf.stat().st_ino
    assert receipt["fixed_consumption_directory"] == (
        mod.FIXED_ROOT + "/" + mod.CONSUMPTION_LEAF
    )
    assert receipt["next_gate"] == (
        "apollyon_training_start_protected_store_revalidator_v1"
    )
    assert receipt["fixture_custody_receipt_id"].startswith(
        "apollyon_consumption_directory_fixture_custody_v1:"
    )
    assert observe(root)["fixture_custody_receipt_id"] == receipt["fixture_custody_receipt_id"]
    for key in (
        "protected_store_origin_proven",
        "current_store_generation_revalidation_performed",
        "generation_lineage_revalidation_performed",
        "authorization_winner_reread_performed",
        "durable_claim_record_reread_performed",
        "consumption_slot_classification_performed",
        "writer_directory_capability_origin_proven",
        "writer_invocation_authorized",
        "consumption_publication_authorized",
        "trainer_release_authorized",
        "training_execution_authorized",
        "credential_access",
        "signing",
        "transaction",
        "funds_movement",
    ):
        assert receipt[key] is False, key

    # Wrong ownership/mode never fabricates successful protected store origin.
    root.chmod(0o750)
    for _ in range(5):
        expect_hold(lambda: observe(root), "fixture_root_metadata_invalid")
    assert fd_set() == before, "rejected root leaked traversal FDs"
    root.chmod(0o700)
    leaf.chmod(0o750)
    expect_hold(lambda: observe(root), "consumption_directory_metadata_invalid")
    assert fd_set() == before
    leaf.chmod(0o700)

    expect_hold(
        lambda: mod.observe_fixture_only(root, uid=0, gid=gid),
        "fixture_owner_identity_invalid",
    )
    expect_hold(
        lambda: mod.observe_fixture_only(root, uid=uid, gid=0),
        "fixture_owner_identity_invalid",
    )
    expect_hold(
        lambda: mod.observe_fixture_only(root, uid=uid, gid=gid,
                                        trusted_ancestors=True),
        "fixture_ancestor_custody_untrusted",
    )
    assert fd_set() == before

with tempfile.TemporaryDirectory(prefix="apollyon-custody-symlink-v1-") as td:
    root, leaf = fixture(td)
    outside = Path(td) / "outside"
    outside.mkdir(mode=0o700)
    leaf.rmdir()
    leaf.symlink_to(outside, target_is_directory=True)
    expect_hold(lambda: observe(root), "consumption_directory_not_direct")
    assert outside.is_dir()

with tempfile.TemporaryDirectory(prefix="apollyon-custody-root-symlink-v1-") as td:
    root, leaf = fixture(td)
    alias = Path(td) / "linked-root"
    alias.symlink_to(root, target_is_directory=True)
    expect_hold(lambda: observe(alias), "fixture_ancestor_not_direct_directory")

with tempfile.TemporaryDirectory(prefix="apollyon-custody-acl-v1-") as td:
    root, leaf = fixture(td)
    real_getxattr = mod.os.getxattr
    hit = [0]

    def injected_acl(fd: int, name: str, *args, **kwargs):
        if (
            name == "system.posix_acl_access"
            and os.fstat(fd).st_ino == leaf.stat().st_ino
        ):
            hit[0] += 1
            return b"synthetic extended ACL"
        return real_getxattr(fd, name, *args, **kwargs)

    mod.os.getxattr = injected_acl
    baseline = fd_set()
    try:
        expect_hold(
            lambda: observe(root), "consumption_directory_extended_acl_present",
        )
    finally:
        mod.os.getxattr = real_getxattr
    assert hit[0] == 1
    assert fd_set() == baseline

with tempfile.TemporaryDirectory(prefix="apollyon-custody-drift-v1-") as td:
    root, leaf = fixture(td)
    real_open = mod.os.open
    moved = root / "old-consumption-directory"
    substituted = [False]

    def open_then_substitute(path, flags, *args, **kwargs):
        fd = real_open(path, flags, *args, **kwargs)
        if path == mod.CONSUMPTION_LEAF and not substituted[0]:
            substituted[0] = True
            leaf.rename(moved)
            leaf.mkdir(mode=0o700)
            leaf.chmod(0o700)
        return fd

    baseline = fd_set()
    mod.os.open = open_then_substitute
    try:
        expect_hold(
            lambda: observe(root), "consumption_directory_generation_changed",
        )
    finally:
        mod.os.open = real_open
    assert substituted[0]
    assert fd_set() == baseline

with tempfile.TemporaryDirectory(prefix="apollyon-custody-close-v1-") as td:
    root, leaf = fixture(td)
    real_close = mod.os.close
    attempts = []
    baseline = fd_set()
    target_ino = leaf.stat().st_ino

    def close_then_fail(fd: int) -> None:
        info = os.fstat(fd)
        real_close(fd)
        if info.st_ino == target_ino:
            attempts.append("child")
            raise OSError(5, "simulated EIO after real close")
        if info.st_ino == root.stat().st_ino:
            attempts.append("root")

    mod.os.close = close_then_fail
    try:
        expect_hold(lambda: observe(root), "fixture_directory_close_uncertain")
    finally:
        mod.os.close = real_close
    assert attempts == ["child", "root"], attempts
    assert fd_set() == baseline

# A production path must be rejected before *any* host filesystem open.
real_open = mod.os.open
calls = [0]


def no_host_open(*args, **kwargs):
    calls[0] += 1
    raise AssertionError("production host path opened")


mod.os.open = no_host_open
try:
    expect_hold(lambda: observe(Path(mod.FIXED_ROOT)),
                "fixture_production_root_forbidden")
finally:
    mod.os.open = real_open
assert calls[0] == 0
expect_hold(
    lambda: mod.observe_fixture_only(Path("relative")),
    "fixture_owner_identity_invalid" if False else "fixture_root_must_be_absolute",
)

# Non-isolated startup may find checkout-local modules. The first source code
# line rejects it before importing json/argparse; true startup isolation must
# still be supplied by a trusted, fixed interpreter launcher.
with tempfile.TemporaryDirectory(prefix="apollyon-custody-import-v1-") as td:
    copied = Path(td) / SOURCE.name
    shutil.copyfile(SOURCE, copied)
    sentinel = Path(td) / "untrusted-json-imported"
    (Path(td) / "json.py").write_text(
        "from pathlib import Path\n"
        + "Path(" + repr(str(sentinel)) + ").write_text('unsafe')\n",
        encoding="utf-8",
    )
    denied = subprocess.run(
        [sys.executable, "-B", str(copied), "--self-test"],
        capture_output=True, text=True, check=False, timeout=10,
    )
    assert denied.returncode == 2
    assert "HOLD=isolated_python_required" in denied.stderr
    assert not sentinel.exists()
    accepted = subprocess.run(
        [sys.executable, "-I", "-B", str(copied), "--self-test"],
        capture_output=True, text=True, check=False, timeout=10,
    )
    assert accepted.returncode == 0, accepted.stderr
    assert mod.MARKER + "_SELF_TEST_GREEN" in accepted.stdout

live = subprocess.run(
    [sys.executable, "-I", "-B", str(SOURCE), "--live-read"],
    capture_output=True, text=True, check=False, timeout=10,
)
assert live.returncode == 2
assert "HOLD=installed_host_origin_not_authorized" in live.stderr

print(mod.MARKER + "_PROOF_GREEN")
print("synthetic_fixture_directory_custody_observed=true")
print("fixed_root_descriptor_generation_checked=true")
print("consumption_directory_descriptor_generation_checked=true")
print("acl_and_symlink_adversaries_rejected=true")
print("visible_directory_replacement_rejected=true")
print("rejected_directory_fd_cleanup_verified=true")
print("isolated_python_preimport_guard=true")
print("live_host_entrypoint_disabled=true")
print("production_path_not_opened=true")
print("protected_store_origin_proven=false")
print("current_store_generation_revalidation_performed=false")
print("writer_invocation_authorized=false")
print("training_execution_authorized=false")
print("funds_movement=false")
