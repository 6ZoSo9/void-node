#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V5_PROOF"
V5 = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_install_v5.py"
Q4 = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v4.py"
V5_BLOB = "632f3371ad3095e6a8fdf338b24c34431abe7d2c"
Q4_BLOB = "69b1ff028487a139470671cf0afb8937a299897d"


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw)
    return h.hexdigest()


def run(*argv: str) -> str:
    cp = subprocess.run(
        list(argv),
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=120,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
        },
    )
    if cp.returncode != 0 or cp.stderr != "":
        raise AssertionError(
            "command_failed:" + " ".join(argv)
            + ":rc=" + str(cp.returncode)
            + ":stderr=" + cp.stderr
        )
    return cp.stdout


v5_raw = V5.read_bytes()
q4_raw = Q4.read_bytes()
assert git_blob(v5_raw) == V5_BLOB
assert git_blob(q4_raw) == Q4_BLOB
v5 = v5_raw.decode("utf-8")
q4 = q4_raw.decode("utf-8")
ast.parse(v5, filename=str(V5))
ast.parse(q4, filename=str(Q4))

required_v5 = (
    'SCHEMA = "void_buy_void_v7_protected_substrate_install_plan_v5"',
    'PLAN_PREFIX = "voidv7substrateinstallplan5_"',
    'CONFIRM_TOKEN = "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V5_CREATE_ONLY"',
    'LIVE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)',
    'SOURCE_RELEASE = pathlib.Path("/opt/void-v7-source-release-full-history-v1")',
    'V4_INSTALLER_BLOB = "4448acb51cbc15d845550a55cd11c38f4185a7b3"',
    'FULL_HISTORY_INSTALLER_BLOB = "a4d5762fe0e1c41b0919b8abb827123e556552ca"',
    'QUALIFIER_BLOB = "69b1ff028487a139470671cf0afb8937a299897d"',
    'def full_history_content_digest(',
    'def verify_live_release() -> tuple[str, int, int]:',
    'allow_shallow=True',
    'live_release_shallow_mismatch',
    'full_history_content_sha256_mismatch',
    '"expected_full_history_content_sha256": expected_full_history_content_sha256',
    'parser.add_argument("--expected-full-history-content-sha256", default="")',
    'expected_full_history_content_sha256_required',
    'or before.st_nlink != 1',
    'trusted_full_history_content_sha256_required=true',
    'live_shallow_release_cross_binding_required=true',
    'live_release_acl_aware_tree_custody_required=true',
    'protected_full_history_replica_source_required=true',
    'full_history_regular_single_link_required=true',
    'live_runtime_release_mutation=false',
    'RUN_INSTALLED_QUALIFICATION_V4',
    'PROTECTED_SUBSTRATE_CREATE_ONLY_INSTALL_V5_GREEN',
)
for needle in required_v5:
    assert needle in v5, needle

for forbidden in (
    "import subprocess",
    "/usr/bin/git",
    "FIXED_GIT",
    "git_text(",
    "git_bytes(",
    "git_is_ancestor(",
):
    assert forbidden not in v5, forbidden

required_q4 = (
    'MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V4"',
    'LIVE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)',
    'FULL_HISTORY_RELEASE = pathlib.Path("/opt/void-v7-source-release-full-history-v1")',
    'SOURCE = pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")',
    'def _content_digest(',
    'def _git_tree_oid_from_worktree(',
    'def _direct_main_ref(',
    'live_shallow_release_cross_binding_green=true',
    'live_release_acl_aware_tree_custody_green=true',
    'full_history_provenance_digest_green=true',
    'protected_source_full_history_digest_green=true',
    'external_repository_observer=false',
    'expected_full_history_content_sha256_required',
)
for needle in required_q4:
    assert needle in q4, needle

for forbidden in (
    "import subprocess",
    "/usr/bin/git",
    "FIXED_GIT",
    "FIXED_NODE",
):
    assert forbidden not in q4, forbidden

# V5 must copy the protected source from the full-history release, never the live
# shallow runtime release.
publish_body = v5[v5.index("def _publish_source("):v5.index("def _publish_binary(")]
assert "_copy_tree(SOURCE_RELEASE, SOURCE_STAGE)" in publish_body
assert "LIVE_RELEASE" not in publish_body
assert "def _publish_source(expected_digest: tuple[str, int, int], expected_full_history_content_sha256: str)" in publish_body
assert "verify_source_release(expected_full_history_content_sha256)" in publish_body
assert "verify_source_release()" not in publish_body

# The trusted full-history digest participates in plan identity and is replayed
# through both plan and apply.
collect_body = v5[v5.index("def collect_plan("):v5.index("def _copy_regular(")]
assert '"expected_full_history_content_sha256": expected_full_history_content_sha256' in collect_body
apply_body = v5[v5.index("def apply("):v5.index("def main(")]
assert apply_body.count("expected_full_history_content_sha256") >= 3
assert '_publish_source(result["source_digest"], expected_full_history_content_sha256)' in apply_body
assert 'next_action=RUN_INSTALLED_QUALIFICATION_V3' not in apply_body
assert 'next_action=RUN_INSTALLED_QUALIFICATION_V4' in apply_body

v5_self = run(sys.executable, "-I", "-B", str(V5), "--self-test")
assert "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V5_SELF_TEST_GREEN" in v5_self.splitlines()
assert "installed_qualifier_v4_bound=true" in v5_self.splitlines()

v5_plan = run(sys.executable, "-I", "-B", str(V5), "--source-plan")
assert "mode=source-plan" in v5_plan.splitlines()
assert "trusted_full_history_content_sha256_required=true" in v5_plan.splitlines()
assert "live_shallow_release_cross_binding_required=true" in v5_plan.splitlines()
assert "live_release_acl_aware_tree_custody_required=true" in v5_plan.splitlines()
assert "protected_full_history_replica_source_required=true" in v5_plan.splitlines()
assert "live_runtime_release_mutation=false" in v5_plan.splitlines()
assert "funds_movement=false" in v5_plan.splitlines()

q4_self = run(sys.executable, "-I", "-B", str(Q4), "--self-test")
assert "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V4_SELF_TEST_GREEN" in q4_self.splitlines()
assert "content_digest_matches_replica_v1_contract=true" in q4_self.splitlines()
assert "acl_aware_whole_tree_nonwritability_required=true" in q4_self.splitlines()
assert "digest_self_test_does_not_weaken_production_acl_gate=true" in q4_self.splitlines()
assert "external_repository_observer=false" in q4_self.splitlines()

q4_plan = run(sys.executable, "-I", "-B", str(Q4), "--source-plan")
assert "mode=source-plan" in q4_plan.splitlines()
assert "trusted_full_history_content_sha256_required=true" in q4_plan.splitlines()
assert "host_write=false" in q4_plan.splitlines()
assert "funds_movement=false" in q4_plan.splitlines()

print(MARKER + "_GREEN")
print("v5_blob=" + V5_BLOB)
print("qualifier_v4_blob=" + Q4_BLOB)
print("live_shallow_release_is_cross_binding_only=true")
print("full_history_replica_is_protected_source_authority=true")
print("trusted_full_history_digest_participates_in_plan_id=true")
print("first_install_publish_replays_trusted_full_history_digest=true")
print("successful_apply_advances_to_qualifier_v4=true")
print("self_test_and_source_plan_phase_contracts_distinct=true")
print("qualifier_v4_reauthenticates_full_history_digest=true")
print("external_repository_observer=false")
print("protected_filesystem_mutation=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("funds_movement=false")
