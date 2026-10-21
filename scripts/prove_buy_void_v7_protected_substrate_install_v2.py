#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import pathlib
import subprocess
import sys

MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V2_PROOF"
ACCEPTANCE_MERGE = "44f7cf576cdc4460397677a27af2f587a33d424d"
ACCEPTANCE_TREE = "24208ee96995ca784234ac8281eb40abaec5735d"
LOCK_ID = "voidv7substratelock1_6014a83805170202a6117b6004b94e1daddb2dd9123c17802002e72c8002a649"
EXPECTED = {
    "ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json": "831f6e3f79a62a334662cebc6d2c39133bc7a309",
    "scripts/materialize_buy_void_v7_protected_substrate_v1.py": "62d7427577a38fbd69c8405b66951cfb46a28b37",
    "ops/precision/void_buy_void_v7_protected_substrate_install_v1.py": "9f7f035b814549dad9cc6eeee3620d2c04b95d8a",
    "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v2.py": "56a7ca798553766af525d9fb1ccbe58b70fe9c1d",
}
INSTALLER_REL = "ops/precision/void_buy_void_v7_protected_substrate_install_v2.py"
WORKFLOW_REL = ".github/workflows/buy-void-v7-protected-substrate-install-v2.yml"

class ProofError(RuntimeError):
    pass

def git_blob(raw: bytes) -> str:
    h = hashlib.sha1(); h.update(b"blob " + str(len(raw)).encode() + b"\0" + raw); return h.hexdigest()

def pick(base: pathlib.Path, overlay: pathlib.Path, rel: str) -> pathlib.Path:
    candidate = overlay / rel
    return candidate if candidate.exists() else base / rel

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-root", type=pathlib.Path, required=True)
    ap.add_argument("--overlay-root", type=pathlib.Path, required=True)
    ns = ap.parse_args()
    base, overlay = ns.base_root.resolve(), ns.overlay_root.resolve()

    for rel, expected in EXPECTED.items():
        raw = pick(base, overlay, rel).read_bytes()
        if git_blob(raw) != expected:
            raise ProofError("accepted_dependency_blob_mismatch:" + rel)

    lock = json.loads(pick(base, overlay, next(iter(EXPECTED))).read_text())
    if lock.get("lock_id") != LOCK_ID:
        raise ProofError("accepted_lock_id_mismatch")
    for key in (
        "protected_substrate_install_authorized",
        "protected_installer_apply_authorized",
        "receipt_publication_authorized",
        "provider_rpc_contact_authorized",
        "credential_access_authorized",
        "private_key_access_authorized",
        "signing_authorized",
        "transaction_authorized",
        "public_presale_activation_authorized",
        "wc_void_market_activation_authorized",
        "funds_movement_authorized",
    ):
        if lock.get(key) is not False:
            raise ProofError("accepted_lock_authority_changed:" + key)

    installer = pick(base, overlay, INSTALLER_REL)
    source = installer.read_text()
    ast.parse(source, filename=INSTALLER_REL)

    required = (
        'ACCEPTANCE_MERGE = "' + ACCEPTANCE_MERGE + '"',
        'ACCEPTANCE_TREE = "' + ACCEPTANCE_TREE + '"',
        'CONFIRM_TOKEN = "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V2_CREATE_ONLY"',
        'PLAN_PREFIX = "voidv7substrateinstallplan2_"',
        'RENAME_NOREPLACE = 1',
        'accepted_v1_lock_install_authority=false',
        'operation_bound_plan_id_required=true',
        'explicit_create_only_confirmation_required=true',
        'resumable_exact_components=true',
        'mismatched_component_holds=true',
        'partial_publication_possible=true',
        'no_rollback_after_publication=true',
        'root_required_for_apply',
        'expected_plan_id_mismatch',
        'staging_root_preexisting:',
        'source_release_changed_during_copy',
        'protected_source_target_generation_mismatch',
        'tree_node_not_root_owned:',
        'tree_node_writable:',
        'git_is_ancestor(ROOT, ACCEPTANCE_MERGE, expected_head)',
        'git_bytes(ROOT, "show", expected_head + ":" + LOCK_REL)',
        '_CREATED_STAGES',
        '_WRITE_PERFORMED',
        '_PUBLISHED',
        'accepted_v1_merge_tree_bound=true',
        'strict_symlink_target_required=true',
        'publication_bookkeeping_precedes_parent_fsync=true',
        'git_text(ROOT, "rev-parse", ACCEPTANCE_MERGE + "^{tree}")',
        '_strict_internal_symlink',
        'path.resolve(strict=True)',
        '_record_publication_after_rename',
    )
    for value in required:
        if value not in source:
            raise ProofError("required_installer_contract_missing:" + value)

    rename_start = source.index("def _rename_noreplace(")
    record_at = source.index("_record_publication_after_rename(stage, label)", rename_start)
    fsync_at = source.index("os.fsync(parent_fd)", rename_start)
    if not (rename_start < record_at < fsync_at):
        raise ProofError("publication_bookkeeping_order_invalid")

    workflow = pick(base, overlay, WORKFLOW_REL).read_text()
    for required_workflow in (
        "proposal_scope_exact=true",
        "44f7cf576cdc4460397677a27af2f587a33d424d",
        "git diff --name-only",
        "git diff --check",
        "pull_request.base.sha",
        "github.event.before",
    ):
        if required_workflow not in workflow:
            raise ProofError("workflow_scope_binding_missing:" + required_workflow)

    for forbidden in (
        "eth_sendRawTransaction", "eth_sendTransaction", "systemctl restart",
        "systemctl start", "curl ", "wget ", "git push", "git fetch",
        "public_presale_activation=true", "wc_void_market_activation=true",
        "wallet_or_signer_access=true", "credential_access=true",
    ):
        if forbidden in source:
            raise ProofError("forbidden_surface_present:" + forbidden)

    for args, marker in (
        ([sys.executable, "-I", "-B", str(installer), "--self-test"],
         "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V2_SELF_TEST_GREEN"),
        ([sys.executable, "-I", "-B", str(installer), "--source-plan"],
         "accepted_v1_lock_install_authority=false"),
    ):
        cp = subprocess.run(args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE, text=True, check=False, timeout=30)
        if cp.returncode != 0 or cp.stderr != "" or marker not in cp.stdout.splitlines():
            raise ProofError("installer_nonoperational_mode_failed:" + marker)

    print(MARKER + "_GREEN")
    print("accepted_v1_merge_bound=true")
    print("accepted_v1_lock_preserved_install_authority_false=true")
    print("accepted_materializer_bound=true")
    print("accepted_v1_fail_closed_installer_bound=true")
    print("installed_qualification_v2_bound=true")
    print("operation_bound_plan_id_required=true")
    print("explicit_create_only_confirmation_required=true")
    print("resumable_exact_components=true")
    print("mismatched_component_holds=true")
    print("rename_noreplace_publication_required=true")
    print("accepted_v1_merge_tree_bound=true")
    print("strict_symlink_target_required=true")
    print("publication_bookkeeping_precedes_parent_fsync=true")
    print("proposal_scope_exact=true")
    print("root_owned_nonwritable_source_copy_required=true")
    print("source_symlink_containment_required=true")
    print("partial_publication_truthful=true")
    print("no_rollback_after_publication=true")
    print("source_only_proof=true")
    print("protected_filesystem_mutation=false")
    print("service_mutation=false")
    print("credential_access=false")
    print("signing=false")
    print("transaction=false")
    print("funds_movement=false")

if __name__ == "__main__":
    try:
        main()
    except (ProofError, OSError, ValueError, SyntaxError, subprocess.SubprocessError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("protected_filesystem_mutation=false")
        print("service_mutation=false")
        print("transaction=false")
        print("funds_movement=false")
        raise SystemExit(2)
