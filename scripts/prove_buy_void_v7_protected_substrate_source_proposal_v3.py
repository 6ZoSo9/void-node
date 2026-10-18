#!/usr/bin/env python3
from __future__ import annotations
import argparse, ast, hashlib, json, pathlib
MARKER="VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_SOURCE_PROPOSAL_V3_PROOF"
LOCK_ID="voidv7substratelock1_6014a83805170202a6117b6004b94e1daddb2dd9123c17802002e72c8002a649"
LOCK_BLOB="831f6e3f79a62a334662cebc6d2c39133bc7a309"
MAT_BLOB="62d7427577a38fbd69c8405b66951cfb46a28b37"
INSTALLER_BLOB="9f7f035b814549dad9cc6eeee3620d2c04b95d8a"
class E(RuntimeError): pass
def gblob(raw: bytes) -> str:
    h=hashlib.sha1(); h.update(b"blob "+str(len(raw)).encode()+b"\0"+raw); return h.hexdigest()
def main() -> None:
    ap=argparse.ArgumentParser(); ap.add_argument("--overlay",type=pathlib.Path,required=True); ns=ap.parse_args()
    root=ns.overlay
    lockp=root/"ops/security/buy-void-v7-protected-substrate-candidate-lock-v1.json"
    mat=root/"scripts/materialize_buy_void_v7_protected_substrate_v1.py"
    inst=root/"ops/precision/void_buy_void_v7_protected_substrate_install_v1.py"
    qual=root/"ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v2.py"
    for path,blob in ((lockp,LOCK_BLOB),(mat,MAT_BLOB),(inst,INSTALLER_BLOB)):
        if gblob(path.read_bytes())!=blob: raise E("preserved_v1_blob_mismatch:"+path.name)
    lock=json.loads(lockp.read_text())
    if lock.get("lock_id")!=LOCK_ID: raise E("candidate_lock_id_invalid")
    if lock.get("protected_substrate_install_authorized") is not False: raise E("candidate_lock_install_authority_invalid")
    for path in (mat,inst,qual): ast.parse(path.read_text())
    installer=inst.read_text()
    for required in ("protected_substrate_install_not_authorized_by_lock","v1_candidate_lock_does_not_authorize_install_apply"):
        if required not in installer: raise E("installer_fail_closed_contract_missing:"+required)
    q=qual.read_text()
    mat_text=mat.read_text()
    for required in (
        "canonical-producer-source-custody-v1.cjs",
        "protected_source_not_byte_identical_to_active_release",
        'require_clean_main_generation(SOURCE_RELEASE, "source_release")',
        'require_clean_main_generation(SOURCE, "protected_source")',
        '"symbolic-ref", "--short", "-q", "HEAD"',
        '"status", "--porcelain=v1", "--untracked-files=all"',
        '"GIT_OPTIONAL_LOCKS": "0"',
        '"GIT_NO_LAZY_FETCH": "1"',
        '"GIT_ALLOW_PROTOCOL": ""',
        "source_generation_changed_during_qualification",
    ):
        if required not in q: raise E("qualifier_v3_hardening_missing:"+required)
    for forbidden in ("eth_sendRawTransaction","eth_sendTransaction","systemctl restart","wallet_or_signer_access=true","public_presale_activation=true"):
        if forbidden in q or forbidden in mat_text: raise E("forbidden_runtime_surface:"+forbidden)
    print(MARKER+"_GREEN")
    print("candidate_lock_install_authority=false")
    print("installer_apply_fail_closed=true")
    print("canonical_source_custody_reused=true")
    print("byte_identity_to_active_release_required=true")
    print("both_protected_git_generations_clean_main_required=true")
    print("git_observation_no_optional_locks=true")
    print("git_lazy_fetch_disabled=true")
    print("provider_rpc_contact=false")
    print("transaction_authority=false")
    print("funds_movement=false")
if __name__=="__main__":
    try: main()
    except (E,OSError,ValueError,SyntaxError) as exc:
        print(MARKER); print("status=HOLD"); print("reason="+str(exc)); raise SystemExit(2)
