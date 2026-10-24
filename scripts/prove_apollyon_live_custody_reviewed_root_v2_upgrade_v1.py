#!/usr/bin/env python3
from __future__ import annotations
import ast, hashlib, importlib.util, json, subprocess, sys, tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INSTALLER=ROOT/"ops/xiphos/apollyon_live_custody_reviewed_root_v2_upgrade_v1.py"
MANIFEST=ROOT/"ops/xiphos/apollyon-live-custody-reviewed-root-v2-upgrade-v1.json"

def git_blob(path:Path)->str:
    data=path.read_bytes();h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()

manifest=json.loads(MANIFEST.read_text())
assert manifest["marker"]=="VOID_APOLLYON_LIVE_CUSTODY_REVIEWED_ROOT_V2_UPGRADE_V1"
assert git_blob(MANIFEST)=="e78f1709c81775b881ab8f54291bd470ff9e1353"
assert manifest["from"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v1"
assert manifest["prior_v2"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v2"
assert manifest["prior_current"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v2"
assert manifest["to"]["reviewed_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v2"
assert manifest["prior_v2_backup_root"]=="/opt/void-apollyon-live-custody-binding-v2-reviewed-v2-prior-v1"
assert manifest["from"]["fixed_launcher_blob_sha1"]=="e18124d3109ed63ff50da9c467fb1b798c300460"
assert manifest["prior_v2"]["fixed_launcher_blob_sha1"]=="b96f99d6c513405e6f8b87b8f5c3fb1b1cbbf9c7"
assert manifest["prior_current"]["fixed_launcher_blob_sha1"]=="820f7151c0f83280b7457f841cee14c3b0c274b6"
assert manifest["prior_current"]["fixed_launcher_source_rel"]=="ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"
assert manifest["to"]["fixed_launcher_blob_sha1"]=="352bd36f2b07091140b990de4170f708eb11fee6"
assert manifest["to"]["fixed_launcher_source_rel"]=="ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"
assert manifest["prior_current"]["closure"]==manifest["to"]["closure"]
assert manifest["to"]["closure"]["ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"]=="820f7151c0f83280b7457f841cee14c3b0c274b6"
assert manifest["prior_v2"]["closure"]["ops/xiphos/apollyon_installed_training_bus_isolation_qualification_v1.py"]=="0f9263ddfb2bc6974e77c2d4eb0f1ee93fed52e7"
assert manifest["prior_v2"]["closure"]["tools/apollyon-candidate-training-preclaim-v2.mjs"]=="33a7f0d51d7ce1ab6e7ee48e4e205c0b639cca82"
assert manifest["prior_v2"]["closure"]["tools/apollyon-candidate-training-attempt-claim-contract-v2.mjs"]=="b61f2f0982de47c5e11cc1f82e6ea7946ab4a8b2"
assert manifest["prior_v2"]["closure"]["tools/apollyon-live-custody-service-source-session-binding-v2.mjs"]=="981935515e08634be96446e58922c16be56d33ad"
assert manifest["prior_v2"]["systemd_reviewed_versions"]==manifest["prior_current"]["systemd_reviewed_versions"]==manifest["to"]["systemd_reviewed_versions"]==["255.4-1ubuntu8.11","255.4-1ubuntu8.18"]
assert manifest["authority"]["service_action"] is False
assert manifest["authority"]["training_execution"] is False
assert manifest["authority"]["durable_attempt_claim"] is False

source=INSTALLER.read_text()
ast.parse(source)

# upgrade: root-capable CLI must reject non-isolated Python before loading
# attacker-controlled checkout-local standard-module substitutes. This checks
# post-interpreter pre-import behavior, NOT Python startup hooks like .pth/sitecustomize.
with tempfile.TemporaryDirectory(prefix="void-apollyon-upgrade-isolation-") as td:
    temp = Path(td)
    copied = temp / "privileged_cli.py"
    copied.write_bytes(INSTALLER.read_bytes())
    sentinel = temp / "checkout-json-shadow-executed"
    (temp / "json.py").write_text(
        "from pathlib import Path\nPath(" + repr(str(sentinel)) + ").write_text('executed')\n",
        encoding="utf-8",
    )
    clean_env = {
        "PATH": "/usr/sbin:/usr/bin:/sbin:/bin",
        "LANG": "C", "LC_ALL": "C", "TZ": "UTC",
    }
    for argv in (
        [sys.executable, "-B", str(copied), "--self-test"],
        [sys.executable, "-I", str(copied), "--self-test"],
    ):
        denied = subprocess.run(
            argv, cwd=temp, env=clean_env,
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, text=True, check=False, timeout=10,
        )
        assert denied.returncode == 2, (argv, denied.stdout, denied.stderr)
        assert "HOLD=python_runtime_not_isolated" in denied.stderr, denied.stderr
        assert not sentinel.exists(), "checkout-local json.py was loaded before guard"

assert source.index("_require_isolated_python()") < source.index("import argparse")
assert "flags.isolated == 1" in source
assert "flags.dont_write_bytecode == 1" in source
assert 'getattr(flags, "safe_path", 0) == 1' in source


spec=importlib.util.spec_from_file_location("upgrade_v1",INSTALLER)
assert spec and spec.loader
upgrade=importlib.util.module_from_spec(spec)
spec.loader.exec_module(upgrade)

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
    "prior_current":{"closure":{}},
    "to":{"closure":{}},
}
try:
    with tempfile.TemporaryDirectory(prefix="void-apollyon-direct-prior-v2-") as td:
        old_root=Path(td)/"reviewed-v1"
        upgrade.OLD_ROOT=old_root
        upgrade.socket.gethostname=lambda:"Xiphos"
        upgrade.load_upgrade_manifest=lambda:fixture_manifest
        upgrade.assert_services_dormant=lambda:None
        upgrade.read_source=lambda *args,**kwargs:b""
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

        old_root.mkdir(mode=0o755)
        upgrade.verify_tree=lambda root,mapping:None
        legacy_plan=upgrade.plan()
        assert legacy_plan["migration_state"]=="legacy_v1_pending"
        assert legacy_plan["old_root_state"]=="old_exact"
        assert legacy_plan["old_root_verified"] is True
        assert legacy_plan["old_root_preserved"] is True

        old_root.rmdir()
        old_root.symlink_to(Path(td)/"missing-reviewed-v1",target_is_directory=True)
        upgrade.verify_tree=saved[-1]
        try:
            upgrade.legacy_v1_root_state(fixture_manifest)
        except upgrade.Hold as exc:
            assert str(exc)=="legacy_v1_root_collision",str(exc)
        else:
            raise AssertionError("dangling old-root symlink accepted as absence")
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

# Reject dangling rename targets before any destructive rename.
saved_paths=(upgrade.NEW_ROOT,upgrade.PRIOR_V2_BACKUP_ROOT)
try:
    with tempfile.TemporaryDirectory(prefix="void-apollyon-upgrade-targets-") as td:
        root=Path(td)
        upgrade.NEW_ROOT=root/"reviewed-v2"
        upgrade.PRIOR_V2_BACKUP_ROOT=root/"reviewed-v2-prior"
        upgrade.NEW_ROOT.symlink_to(root/"missing-current",target_is_directory=True)
        try:
            upgrade.reviewed_v2_root_state(fixture_manifest)
        except upgrade.Hold as exc:
            assert str(exc)=="reviewed_v2_root_collision",str(exc)
        else:
            raise AssertionError("dangling NEW_ROOT accepted as absence")
        upgrade.NEW_ROOT.unlink()
        upgrade.PRIOR_V2_BACKUP_ROOT.symlink_to(
            root/"missing-backup",target_is_directory=True
        )
        try:
            upgrade.prior_v2_backup_state(fixture_manifest)
        except upgrade.Hold as exc:
            assert str(exc)=="prior_v2_backup_collision",str(exc)
        else:
            raise AssertionError(
                "dangling PRIOR_V2_BACKUP_ROOT accepted as absence"
            )
finally:
    upgrade.NEW_ROOT,upgrade.PRIOR_V2_BACKUP_ROOT=saved_paths

# Execute the prior-V2 apply path and prove stage construction precedes launcher
# replacement. A staging failure must occur before any launcher/service/root
# mutation-capable helper is reached.
saved_apply=(
    upgrade.os.geteuid,
    upgrade.plan,
    upgrade.load_upgrade_manifest,
    upgrade.prepare_current_stage,
    upgrade.launcher_state,
    upgrade.replace_launcher,
    upgrade.read_source,
    upgrade.assert_services_dormant,
    upgrade.assert_no_inflight_live_session_processes,
    upgrade.migrate_prior_v2_tree,
    upgrade.legacy_v1_root_state,
    upgrade.verify_tree,
    upgrade.prior_v2_backup_state,
)
events=[]
try:
    upgrade.os.geteuid=lambda:0
    upgrade.plan=lambda:{
        "migration_state":"prior_v2_pending",
        "old_root_state":"absent",
    }
    upgrade.load_upgrade_manifest=lambda:fixture_manifest
    upgrade.prepare_current_stage=lambda mapping:events.append("stage")
    upgrade.launcher_state=lambda:"prior_v2_exact"
    upgrade.replace_launcher=lambda *args,**kwargs:(
        events.append("replace") or True
    )
    upgrade.read_source=lambda *args,**kwargs:b"launcher"
    upgrade.assert_services_dormant=lambda:events.append("dormant")
    upgrade.assert_no_inflight_live_session_processes=lambda *args,**kwargs:(
        events.append("quiescence") or {
            "root_owned_live_session_processes_absent":True,
            "two_pass_process_census":True,
        }
    )
    upgrade.migrate_prior_v2_tree=lambda manifest:(
        events.append("migrate") or True
    )
    upgrade.legacy_v1_root_state=lambda manifest:"absent"
    upgrade.verify_tree=lambda *args,**kwargs:events.append("verify")
    upgrade.prior_v2_backup_state=lambda manifest:"prior_v2_exact"

    applied=upgrade.apply()
    assert events[:5]==["stage","replace","quiescence","dormant","migrate"],events
    assert applied["fixed_launcher_replaced"] is True
    assert applied["reviewed_v2_tree_replaced"] is True

    events.clear()
    def fail_stage(mapping):
        events.append("stage")
        raise upgrade.Hold("fixture_stage_failed")
    upgrade.prepare_current_stage=fail_stage
    try:
        upgrade.apply()
    except upgrade.Hold as exc:
        assert str(exc)=="fixture_stage_failed",str(exc)
    else:
        raise AssertionError("stage failure unexpectedly accepted")
    assert events==["stage"],events

    # Execute the already-current-root launcher-only retirement path. It must
    # replace only the fixed launcher, never stage or rename the reviewed root.
    events.clear()
    upgrade.plan=lambda:{
        "migration_state":"prior_current_pending",
        "old_root_state":"absent",
    }
    upgrade.prepare_current_stage=lambda mapping:events.append("UNEXPECTED_STAGE")
    upgrade.launcher_state=lambda:"prior_current_exact"
    upgrade.replace_launcher=lambda *args,**kwargs:(
        events.append(("replace",args[1])) or True
    )
    upgrade.read_source=lambda rel,blob:(
        events.append(("read_source",rel,blob)) or b"retired-launcher"
    )
    upgrade.assert_services_dormant=lambda:events.append("dormant")
    upgrade.migrate_prior_v2_tree=lambda manifest:(
        events.append("UNEXPECTED_MIGRATE") or True
    )
    upgrade.legacy_v1_root_state=lambda manifest:"absent"
    upgrade.verify_tree=lambda *args,**kwargs:events.append("verify")
    upgrade.prior_v2_backup_state=lambda manifest:"absent"

    retired=upgrade.apply()
    assert "UNEXPECTED_STAGE" not in events,events
    assert "UNEXPECTED_MIGRATE" not in events,events
    assert events[0]==(
        "read_source",
        upgrade.LAUNCHER_REL,
        upgrade.NEW_LAUNCHER_BLOB,
    ),events
    assert events[1]==("replace",("prior_current_exact",)),events
    assert events[2]=="quiescence",events
    assert events.count("quiescence")==2,events
    assert events.count("dormant")==2,events
    assert events.count("verify")==2,events
    assert retired["fixed_launcher_replaced"] is True
    assert retired["launcher_quiescence_proven"] is True
    assert retired["reviewed_v2_tree_replaced"] is False
    assert retired["prior_v2_backup_preserved"] is False
finally:
    (
        upgrade.os.geteuid,
        upgrade.plan,
        upgrade.load_upgrade_manifest,
        upgrade.prepare_current_stage,
        upgrade.launcher_state,
        upgrade.replace_launcher,
        upgrade.read_source,
        upgrade.assert_services_dormant,
        upgrade.assert_no_inflight_live_session_processes,
        upgrade.migrate_prior_v2_tree,
        upgrade.legacy_v1_root_state,
        upgrade.verify_tree,
        upgrade.prior_v2_backup_state,
    )=saved_apply

for required in (
    'UPGRADE_MANIFEST_BLOB="e78f1709c81775b881ab8f54291bd470ff9e1353"',
    'OLD_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v1")',
    'NEW_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2")',
    'PRIOR_V2_BACKUP_ROOT=Path("/opt/void-apollyon-live-custody-binding-v2-reviewed-v2-prior-v1")',
    'CURRENT_STAGE=Path("/opt/.void-apollyon-live-custody-binding-v2-reviewed-v2.current-stage-v1")',
    'OLD_LAUNCHER_BLOB="e18124d3109ed63ff50da9c467fb1b798c300460"',
    'PRIOR_V2_LAUNCHER_BLOB="b96f99d6c513405e6f8b87b8f5c3fb1b1cbbf9c7"',
    'PRIOR_CURRENT_LAUNCHER_BLOB="820f7151c0f83280b7457f841cee14c3b0c274b6"',
    'NEW_LAUNCHER_BLOB="352bd36f2b07091140b990de4170f708eb11fee6"',
    'LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_lifecycle_lock_v1.py"',
    'REVIEWED_ROOT_LAUNCHER_REL="ops/xiphos/apollyon_live_custody_source_session_launcher_v2.py"',
    'def parse_service_state(text:str)->dict[str,str]:',
    'def service_state(unit:str)->dict[str,str]:',
    '"/usr/bin/systemctl","show",unit,',
    '"LoadState":"loaded"',
    '"ActiveState":"inactive"',
    '"SubState":"dead"',
    '"MainPID":"0"',
    'def require_exact_dormant_state(state:dict[str,str],label:str)->None:',
    'def census_inflight_live_session_processes(',
    'def assert_no_inflight_live_session_processes(',
    'hold("inflight_live_session_process_present")',
    '"post_swap_launcher_quiescence_required":True',
    '"launcher_quiescence_proven":launcher_quiescence_proven',
    'def legacy_v1_root_state(manifest:dict)->str:',
    'def path_is_absent(path:Path,label:str)->bool:',
    'def reviewed_v2_root_state(manifest:dict)->str:',
    'def prior_v2_backup_state(manifest:dict)->str:',
    'def classify_upgrade_state(launcher:str,root:str,backup:str)->str:',
    'return "prior_v2_pending"',
    'return "prior_current_pending"',
    'return "prior_v2_launcher_switched"',
    'return "prior_v2_root_swap_resume"',
    'return "current_exact_from_prior_v2"',
    'os.rename(NEW_ROOT,PRIOR_V2_BACKUP_ROOT)',
    'os.rename(CURRENT_STAGE,NEW_ROOT)',
    'verify_tree(PRIOR_V2_BACKUP_ROOT,manifest["prior_v2"]["closure"])',
    'prepare_current_stage(manifest["to"]["closure"])',
    'replace_launcher(\n                read_source(LAUNCHER_REL,NEW_LAUNCHER_BLOB),\n                ("prior_v2_exact",),',
    'tree_changed=migrate_prior_v2_tree(manifest)',
    'elif migration=="prior_current_pending":',
    '("prior_current_exact",),',
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
    '"is-active"',"NEW_ROOT.exists()","PRIOR_V2_BACKUP_ROOT.exists()",
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
    "dangling_new_root_symlink_rejected=true",
    "dangling_prior_v2_backup_symlink_rejected=true",
    "prior_v2_migration_source_bound=true",
    "prior_current_launcher_retirement_source_bound=true",
    "prior_current_launcher_only_migration=true",
    "retired_fixed_launcher_blob_bound=true",
    "post_swap_inflight_process_quiescence_required=true",
    "root_owned_process_census_two_pass=true",
    "prior_v2_launcher_b96_bound=true",
    "prior_v2_backup_preserved=true",
    "prior_v2_interrupted_states_resumable=true",
    "current_stage_prepared_before_prior_launcher_swap=true",
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
print("dangling_old_root_symlink_rejected=true")
print("dangling_new_root_symlink_rejected=true")
print("dangling_prior_v2_backup_symlink_rejected=true")
print("current_stage_prepared_before_prior_launcher_swap=true")
print("stage_failure_precedes_launcher_swap=true")
print("prior_v2_to_current_v2_migration_proven=true")
print("prior_current_launcher_retirement_proven=true")
print("prior_current_reviewed_root_unchanged=true")
print("retired_fixed_launcher_blob_bound=true")
print("post_swap_inflight_process_quiescence_required=true")
print("root_owned_process_census_two_pass=true")
print("prior_v2_rollback_root_bound=true")
print("prior_v2_resume_states_bound=true")
print("post_launcher_dormancy_revalidation_bound=true")
print("exact_inactive_service_states_bound=true")
print("transitional_service_states_rejected=true")
print("isolated_python_preimport_guard=true")
print("nonisolated_checkout_module_not_executed=true")
