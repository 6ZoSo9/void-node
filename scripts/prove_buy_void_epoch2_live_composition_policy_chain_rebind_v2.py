#!/usr/bin/env python3
"""Focused proof for the V6R2 second-hop policy HEAD rebind."""

from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import os
import pathlib
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_live_composition_policy_chain_rebind_v2.py"
)
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "891cce24244c62756caeba6d2bf702cc92e8a956"


def git_blob(raw: bytes) -> str:
    return hashlib.sha1(
        ("blob " + str(len(raw)) + "\0").encode("ascii") + raw
    ).hexdigest()


raw = TARGET.read_bytes()
assert git_blob(raw) == TARGET_BLOB
source = raw.decode("utf-8")
compile(source, str(TARGET), "exec")

required = (
    'ORIGINAL_HEAD = "65b4515b78e467afb399b510037e8c64256e87a5"',
    'ORIGINAL_POLICY_SHA256 = "dd27149ac4faa950843b16a39824bb77ec88cdab63593d7ee836ca879ddc6cd9"',
    'PREVIOUS_HEAD = "b92ba19cf16ea5f147c441e15de12b9932ca94c3"',
    'PREVIOUS_POLICY_SHA256 = "9d18271055dc430335a6607a426c3082f950148087b87a6bc790a818d8b6286d"',
    'READY_STATE = "EPOCH2_V6R2_POLICY_B92_READY_FOR_CHAIN_REBIND"',
    'GREEN_STATE = "EPOCH2_V6R2_POLICY_HEAD_REBOUND_WITH_65B_AND_B92_POLICIES_RETAINED"',
    "original_policy_retained_required",
    "previous_policy_retention_required",
    "policy_atomic_exchange_required",
    "automatic_rollback_required",
    "filesystem_mutation_performed_at_pre_mutation_boundary=false",
    "policy_publication_performed",
    "native_mutation_authorized=false",
    "runner_mutation_authorized=false",
    "live_execution_authorized=false",
    "credential_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "rpc_call_authorized=false",
    "payment_acceptance_authorized=false",
    "public_presale_activation_authorized=false",
    "wc_void_market_activation_authorized=false",
    "funds_movement_authorized=false",
)
for needle in required:
    assert needle in source, needle

assert "subprocess" not in source
assert "systemctl" not in source
assert "os.system(" not in source

self_test = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--self-test"],
    cwd=ROOT,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    timeout=30,
)
assert self_test.returncode == 0, (self_test.stdout, self_test.stderr)
for line in (
    "VOID_BUY_VOID_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V2_SELF_TEST_GREEN",
    "original_65b_policy_identity_bound=true",
    "previous_b92_policy_identity_bound=true",
    "two_predecessor_retention_required=true",
    "atomic_cross_directory_policy_exchange_exercised=true",
    "automatic_rollback_required=true",
    "publication_aware_failure_receipt=true",
    "credential_access_authorized=false",
    "signing_authorized=false",
    "transaction_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in self_test.stdout.splitlines(), line

source_plan = subprocess.run(
    ["/usr/bin/python3", "-I", "-B", str(TARGET), "--source-plan"],
    cwd=ROOT,
    text=True,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    timeout=30,
)
assert source_plan.returncode == 0, (source_plan.stdout, source_plan.stderr)
for line in (
    "mode=source-plan",
    "host_read=false",
    "host_write=false",
    "original_head=65b4515b78e467afb399b510037e8c64256e87a5",
    "previous_head=b92ba19cf16ea5f147c441e15de12b9932ca94c3",
    "original_policy_retained_required=true",
    "previous_policy_retention_required=true",
    "policy_atomic_exchange_required=true",
    "live_execution_authorized=false",
    "credential_access_authorized=false",
    "funds_movement_authorized=false",
):
    assert line in source_plan.stdout.splitlines(), line

spec = importlib.util.spec_from_file_location("chain_rebind_v2", TARGET)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

assert module.ORIGINAL_BACKUP_NAME == (
    ".void-buy-void-epoch2-live-composition-v3.policy-predecessor-65b4515b"
)
assert module.PREVIOUS_BACKUP_NAME == (
    ".void-buy-void-epoch2-live-composition-v3.policy-predecessor-b92ba19c"
)

# Precision's source checkout may legitimately be mode 0664. Source authority is
# the exact retained generation plus the pinned Git blob, not an incidental
# worktree write bit. Symlinks and wrong bytes must still fail closed.
with tempfile.TemporaryDirectory(prefix="void-e2-chain-source-mode-proof-") as td:
    parent = pathlib.Path(td)
    exact = parent / "dependency.py"
    exact_raw = b"VALUE = 1\n"
    exact.write_bytes(exact_raw)
    exact.chmod(0o664)
    exact_blob = git_blob(exact_raw)
    assert module._read_bound_source(exact, exact_blob) == exact_raw

    try:
        module._read_bound_source(exact, "0" * 40)
    except module.RebindError as exc:
        assert str(exc) == "source_git_blob_mismatch:dependency.py"
    else:
        raise AssertionError("wrong source blob did not HOLD")

    symlink = parent / "dependency-link.py"
    symlink.symlink_to(exact.name)
    try:
        module._read_bound_source(symlink, exact_blob)
    except module.RebindError as exc:
        assert str(exc) == "source_metadata_invalid:dependency-link.py"
    else:
        raise AssertionError("symlink source did not HOLD")


class FakeInstaller:
    def __init__(self, parent: pathlib.Path) -> None:
        self.INSTALL_PARENT = parent

    def _trusted_root_directory(self, _path: pathlib.Path) -> None:
        return None


with tempfile.TemporaryDirectory(prefix="void-e2-chain-rebind-proof-") as td:
    parent = pathlib.Path(td)
    fake = FakeInstaller(parent)
    previous_policy = b"previous-policy"
    new_policy = b"new-policy"
    original = parent / module.ORIGINAL_BACKUP_NAME
    previous = parent / module.PREVIOUS_BACKUP_NAME
    stage = parent / module.STAGE_NAME

    events: list[object] = []
    module._verify_original_backup = lambda _i: events.append("original")
    module._verify_v4_predecessor = lambda _i: events.append("v4")
    module._verify_previous_backup = lambda _i: events.append("previous")
    module._verify_current_with_policy = (
        lambda _i, policy: events.append(("current", policy))
    )

    original.write_text("witness", encoding="utf-8")
    state = module.protected_state(
        fake,
        previous_policy=previous_policy,
        new_policy=new_policy,
    )
    assert state == module.READY_STATE
    assert ("current", previous_policy) in events
    assert "original" in events and "v4" in events
    assert "previous" not in events

    events.clear()
    previous.write_text("witness", encoding="utf-8")
    state = module.protected_state(
        fake,
        previous_policy=previous_policy,
        new_policy=new_policy,
    )
    assert state == module.GREEN_STATE
    assert ("current", new_policy) in events
    assert "original" in events and "v4" in events and "previous" in events

    events.clear()
    stage.write_text("witness", encoding="utf-8")
    try:
        module.protected_state(
            fake,
            previous_policy=previous_policy,
            new_policy=new_policy,
        )
    except module.RebindError as exc:
        assert str(exc) == "policy_chain_rebind_stage_present"
    else:
        raise AssertionError("stage conflict did not HOLD")
    stage.unlink()

    previous.unlink()
    original.unlink()
    try:
        module.protected_state(
            fake,
            previous_policy=previous_policy,
            new_policy=new_policy,
        )
    except module.RebindError as exc:
        assert str(exc) == "original_65b_policy_backup_missing"
    else:
        raise AssertionError("missing original witness did not HOLD")

receipt = module._failure_receipt(
    failure_phase="post_backup_revalidation",
    policy_exchange_performed=True,
    rollback_attempted=True,
    rollback_green=False,
    final_state_verified=False,
    final_state="UNKNOWN",
)
assert receipt["policy_publication_performed"] is True
assert receipt["automatic_rollback_green"] is False
assert receipt["final_state_verified"] is False

print("VOID_BUY_VOID_EPOCH2_V6R2_POLICY_CHAIN_REBIND_V2_PROOF_GREEN")
print("target_blob_bound=true")
print("group_writable_exact_git_bound_source_accepted=true")
print("wrong_source_blob_rejected=true")
print("symlink_source_rejected=true")
print("ready_requires_exact_b92_live_policy=true")
print("green_requires_current_policy_and_b92_backup=true")
print("original_65b_backup_required_in_both_states=true")
print("foreign_stage_rejected=true")
print("publication_truth_monotonic=true")
print("native_runner_execution_absent=true")
print("credential_access_authorized=false")
print("signing_authorized=false")
print("transaction_authorized=false")
print("funds_movement_authorized=false")
