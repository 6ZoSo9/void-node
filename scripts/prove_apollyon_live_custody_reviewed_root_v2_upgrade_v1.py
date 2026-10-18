#!/usr/bin/env python3
from __future__ import annotations
import ast, hashlib, importlib.util, json, subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INSTALLER=ROOT/"ops/xiphos/apollyon_live_custody_reviewed_root_v2_upgrade_v1.py"
MANIFEST=ROOT/"ops/xiphos/apollyon-live-custody-reviewed-root-v2-upgrade-v1.json"

def git_blob(path:Path)->str:
    data=path.read_bytes();h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()

manifest=json.loads(MANIFEST.read_text())
assert manifest["marker"]=="VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1"
assert git_blob(MANIFEST)=="db64dd321936c90159417959505e958a29596368"
assert manifest["from"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v1"
assert manifest["prior_v2"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v2"
assert manifest["to"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v2"
assert manifest["prior_v2_backup_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v2-prior-v1"
assert manifest["from"]["fixed_launcher_blob_sha1"]=="e18124d3109ed63ff50da9c467fb1b798c300460"
assert manifest["prior_v2"]["fixed_launcher_blob_sha1"]=="b96f99d6c513405e6f8b87b8f5c3fb1b1cbbf9c7"
assert manifest["to"]["fixed_launcher_blob_sha1"]=="820f7151c0f83280b7457f841cee14c3b0c274b6"
assert manifest["prior_v2"]["closure"]["ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py"]=="0f9263ddfb2bc6974e77c2d4eb0f1ee93fed52e7"
assert manifest["prior_v2"]["closure"]["tools/apollyon-candidate-training-preclaim-v2.mjs"]=="33a7f0d51d7ce1ab6e7ee48e4e205c0b639cca82"
assert manifest["prior_v2"]["closure"]["tools/apollyon-candidate-training-attempt-claim-contract-v2.mjs"]=="b61f2f0982de47c5e11cc1f82e6ea7946ab4a8b2"
assert manifest["prior_v2"]["closure"]["tools/apollyon-live-custody-service-source-session-binding-v2.mjs"]=="981935515e08634be96446e58922c16be56d33ad"
assert manifest["prior_v2"]["systemd_reviewed_versions"]==manifest["to"]["systemd_reviewed_versions"]==["255.4-1ubuntu8.11","255.4-1ubuntu8.18"]
assert manifest["authority"]["service_action"] is False
assert manifest["authority"]["training_execution"] is False
assert manifest["authority"]["durable_attempt_claim"] is False

source=INSTALLER.read_text()
ast.parse(source)

spec=importlib.util.spec_from_file_location("upgrade_v1",INSTALLER)
assert spec and spec.loader
upgrade=importlib.util.module_from_spec(spec)
spec.loader.exec_module(upgrade)

class _RootFixture:
    def __init__(self,present:bool):
        self.present=present
    def exists(self)->bool:
        return self.present

saved=(
    upgrade.OLD_ROOT,
    upgrade.socket.gethostname,
    upgrade.load_upgrade_manifest,
    upgrade.assert_services_dormant,
    upgrade.launcher_state,
    upgrade.reviewed_v2_root_state,
    upgrade.prior_v2_backup_state,
    upgrade.read_source,
    upgrade.verify_tree,
)
fixture_manifest={
    "from":{"closure":{}},
    "prior_v2":{"closure":{}},
    "to":{"closure":{}},
}
try:
    upgrade.socket.gethostname=lambda:"Xiphos"
    upgrade.load_upgrade_manifest=lambda:fixture_manifest
    upgrade.assert_services_dormant=lambda:None
    upgrade.read_source=lambda *args,**kwargs:b""
    upgrade.OLD_ROOT=_RootFixture(False)
    upgrade.launcher_state=lambda:"prior_v2_exact"
    upgrade.reviewed_v2_root_state=lambda manifest:"prior_v2_exact"
    upgrade.prior_v2_backup_state=lambda manifest:"absent"
    prior_plan=upgrade.plan()
    assert prior_plan["migration_state"]=="prior_v2_pending"
    assert prior_plan["old_root_state"]=="absent"
    assert prior_plan["old_root_verified"] is False
    assert prior_plan["old_root_preserved"] is False

    upgrade.launcher_state=lambda:"old_exact"
    upgrade.reviewed_v2_root_state=lambda manifest:"absent"
    try:
        upgrade.plan()
    except upgrade.Hold as exc:
        assert str(exc)=="legacy_v1_source_root_missing",str(exc)
    else:
        raise AssertionError("legacy-v1 accepted missing old root")

    upgrade.OLD_ROOT=_RootFixture(True)
    upgrade.verify_tree=lambda root,mapping:None
    legacy_plan=upgrade.plan()
    assert legacy_plan["migration_state"]=="legacy_v1_pending"
    assert legacy_plan["old_root_state"]=="old_exact"
    assert legacy_plan["old_root_verified"] is True
    assert legacy_plan["old_root_preserved"] is True

    def _reject_old_root(root,mapping):
        raise upgrade.Hold("fixture_old_root_invalid")
    upgrade.verify_tree=_reject_old_root
    try:
        upgrade.legacy_v1_root_state(fixture_manifest)
    except upgrade.Hold as exc:
        assert str(exc)=="legacy_v1_root_collision",str(exc)
    else:
        raise AssertionError("malformed optional old root accepted")
finally:
    (
        upgrade.OLD_ROOT,
        upgrade.socket.gethostname,
        upgrade.load_upgrade_manifest,
        upgrade.assert_services_dormant,
        upgrade.launcher_state,
        upgrade.reviewed_v2_root_state,
        upgrade.prior_v2_backup_state,
        upgrade.read_source,
        upgrade.verify_tree,
    )=saved
for required in (
    'UPGRADE_MANIFEST_BLOB="db64dd321936c90159417959505e958a29596368"',
    'OLD_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v1")',
    'NEW_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2")',
    'PRIOR_V2_BACKUP_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2-prior-v1")',
    'CURRENT_STAGE=Path("/opt/.void-apollyon-live-custody-binding-v2-reviewed-v2.current-stage-v1")',
    'OLD_LAUNCHER_BLOB="e18124d3109ed63ff50da9c467fb1b798c300460"',
    'PRIOR_V2_LAUNCHER_BLOB="b96f99d6c513405e6f8b87b8f5c3fb1b1cbbf9c7"',
    'NEW_LAUNCHER_BLOB="820f7151c0f83280b7457f841cee14c3b0c274b6"',
    'def parse_service_state(text:str)->dict[str,str]:',
    'def service_state(unit:str)->dict[str,str]:',
    '"/usr/bin/systemctl","show",unit,',
    '"LoadState":"loaded"',
    '"ActiveState":"inactive"',
    '"SubState":"dead"',
    '"MainPID":"0"',
    'def require_exact_dormant_state(state:dict[str,str],label:str)->None:',
    'def legacy_v1_root_state(manifest:dict)->str:',
    'def classify_upgrade_state(launcher:str,root:str,backup:str)->str:',
    'return "prior_v2_pending"',
    'return "prior_v2_launcher_switched"',
    'return "prior_v2_root_swap_resume"',
    'return "current_exact_from_prior_v2"',
    'os.rename(NEW_ROOT,PRIOR_V2_BACKUP_ROOT)',
    'os.rename(CURRENT_STAGE,NEW_ROOT)',
    'verify_tree(PRIOR_V2_BACKUP_ROOT,manifest["prior_v2"]["closure"])',
    'replace_launcher(\n                read_source(LAUNCHER_REL,NEW_LAUNCHER_BLOB),\n                ("prior_v2_exact",),',
    'tree_changed=migrate_prior_v2_tree(manifest)',
    'old_root=legacy_v1_root_state(manifest)',
    'if migration.startswith("legacy_v1") and old_root!="old_exact":',
    'final_old_root=legacy_v1_root_state(manifest)',
    'if final_old_root!=before["old_root_state"]:',
    "verify_tree(NEW_ROOT,manifest[\"to\"][\"closure\"])",
    "os.replace(temp,FIXED_LAUNCHER)",
    '"service_action":False',
    '"training_execution":False',
    '"durable_attempt_claim":False',
):
    assert required in source,required
for forbidden in (
    "subprocess.Popen(","shell=True","PRIVATE KEY-----","eth_sendRawTransaction",
    '"is-active"',
):
    assert forbidden not in source,forbidden

result=subprocess.run(
    ["python3","-I","-B",str(INSTALLER),"--self-test"],
    cwd=ROOT,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,check=False,timeout=30,
)
assert result.returncode==0,result.stderr
for line in (
    "VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1_SELF_TEST_GREEN",
    "legacy_v1_old_root_required_only_for_legacy_source=true",
    "direct_prior_v2_old_root_absence_allowed=true",
    "old_root_collision_rejected=true",
    "prior_v2_migration_source_bound=true",
    "prior_v2_launcher_b96_bound=true",
    "prior_v2_backup_preserved=true",
    "prior_v2_interrupted_states_resumable=true",
    "current_launcher_installed_before_prior_root_swap=true",
    "post_launcher_dormancy_revalidated_before_prior_root_swap=true",
    "exact_inactive_service_states_required=true",
    "transitional_service_states_rejected=true",
    "new_root=/opt/void-apollyon-live-custody-binding-v2-reviewed-v2",
    "prior_v2_backup_root=/opt/void-apollyon-live-custody-binding-v2-reviewed-v2-prior-v1",
    "systemd_8_18_reviewed=true",
    "service_action=false","training_execution=false","durable_attempt_claim=false","funds_movement=false",
):
    assert line in result.stdout,line
print("VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1_PROOF_GREEN")
print("direct_prior_v2_without_legacy_root_proven=true")
print("legacy_v1_missing_old_root_rejected=true")
print("old_root_collision_rejected=true")
print("prior_v2_to_current_v2_migration_proven=true")
print("prior_v2_rollback_root_bound=true")
print("prior_v2_resume_states_bound=true")
print("post_launcher_dormancy_revalidation_bound=true")
print("exact_inactive_service_states_bound=true")
print("transitional_service_states_rejected=true")
