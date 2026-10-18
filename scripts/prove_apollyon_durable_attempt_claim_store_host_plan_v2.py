#!/usr/bin/env python3
from __future__ import annotations

import ast
import hashlib
import importlib.util
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[1]
PLAN=ROOT/"ops/xiphos/apollyon_durable_attempt_claim_store_host_plan_v2.py"
CONTRACT=ROOT/"tools/apollyon-durable-attempt-claim-store-contract-v2.mjs"
WORKFLOW=ROOT/".github/workflows/apollyon-durable-attempt-claim-store-host-plan-v2.yml"
CANONICALIZER=ROOT/"tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs"
TERMINAL_RECEIPT=ROOT/"tools/apollyon-live-source-session-terminal-receipt-v2.mjs"
SESSION_BINDING=ROOT/"tools/apollyon-live-custody-service-source-session-binding-v2.mjs"
EXPECTED_PLANNER_BLOB_SHA1="9e2a716e43e4a9815f9e8f2c67c0d3e322f8b64d"
EXPECTED_STORE_POLICY_ID=(
    "apollyon_claim_store_policy_v2:"
    "e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137"
)

def git_blob(data:bytes)->str:
    h=hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()

source=PLAN.read_text(encoding="utf-8")
ast.parse(source)

assert git_blob(PLAN.read_bytes())==EXPECTED_PLANNER_BLOB_SHA1
assert git_blob(CONTRACT.read_bytes())=="bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc"
assert git_blob(CANONICALIZER.read_bytes())=="f97fafb0148527ae3a954e2752faef8c7fc9e88e"
assert git_blob(TERMINAL_RECEIPT.read_bytes())=="974a383f4904b6b223a2143d5f7a19322f3d1f66"
assert git_blob(SESSION_BINDING.read_bytes())=="5ee36c89275c29b008094ad030b8664ed9d7b60b"
assert source.index("import sys")<source.index("_require_isolated_python_startup()")<source.index("import argparse")
assert 'flags.isolated!=1' in source
assert 'flags.ignore_environment!=1' in source
assert 'flags.no_user_site!=1' in source
assert 'flags.dont_write_bytecode!=1' in source
assert 'getattr(flags,"safe_path",0)!=1' in source
assert 'PARENT_HEAD="9475035552881f34658a7c8f3a6b336199fda159"' in source
assert 'PARENT_CONTRACT_BLOB_SHA1="bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc"' in source
assert '"e7591d97e95ba4af17097fc89e1e2db612275c84715872153e1ae0a278c01137"' in source
assert '"store_policy_id":PARENT_STORE_POLICY_ID' in source

node_path=shutil.which("node")
assert node_path is not None
node_real=Path(node_path).resolve()
assert node_real.is_file()
policy_script=(
    'import {qualifyApollyonDurableAttemptClaimStorePolicyV2} from "'
    +CONTRACT.resolve().as_uri()
    +'";process.stdout.write('
    'qualifyApollyonDurableAttemptClaimStorePolicyV2().store_policy_id+"\\n");'
)
policy_run=subprocess.run(
    [str(node_real),"--input-type=module","-e",policy_script],
    cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=False,timeout=20,
    env={"PATH":"/usr/bin:/bin","HOME":str(ROOT),"LANG":"C","LC_ALL":"C","TZ":"UTC"},
)
assert policy_run.returncode==0,policy_run.stderr
assert policy_run.stderr=="",policy_run.stderr
assert policy_run.stdout==EXPECTED_STORE_POLICY_ID+"\n",policy_run.stdout

workflow=WORKFLOW.read_text(encoding="utf-8")
assert "  push:\n" in workflow
assert "  workflow_dispatch:\n" in workflow
pull_section=workflow.split("  push:\n",1)[0]
push_section=workflow.split("  push:\n",1)[1].split("  workflow_dispatch:\n",1)[0]
for dependency in (
    "tools/apollyon-durable-attempt-claim-store-contract-v2.mjs",
    "tools/apollyon-candidate-training-attempt-claim-contract-v1.mjs",
    "tools/apollyon-live-source-session-terminal-receipt-v2.mjs",
    "tools/apollyon-live-custody-service-source-session-binding-v2.mjs",
):
    entry='      - "'+dependency+'"'
    assert pull_section.count(entry)==1,(dependency,"pull_request")
    assert push_section.count(entry)==1,(dependency,"push")


for required in (
    'TARGET_HOST="Xiphos"',
    'CLAIM_SERVICE_USER="voidapollyonclaim"',
    'CLAIM_PUBLISHER_USER="voidapollyonclaimpub"',
    'CLAIM_IPC_GROUP="voidapollyonclaimipc"',
    'CLAIM_STATE_ROOT=Path("/var/lib/void-apollyon-attempt-claim-v2")',
    'CLAIM_SOCKET_PARENT=Path("/run/void-apollyon-attempt-claim-v2")',
    'CLAIM_SERVICE_UNIT=Path("/etc/systemd/system/void-apollyon-attempt-claim-v2.service")',
    'CLAIM_SERVICE_SOURCE_ROOT=Path("/opt/void-apollyon-attempt-claim-v2-reviewed-v1")',
    'CLAIM_PUBLISHER_SOURCE_ROOT=Path("/opt/void-apollyon-attempt-claim-publisher-v2-reviewed-v1")',
    '"candidate_slots_selected_in_plan":True',
    '"candidate_slots_globally_distinct":True',
    '"candidate_slots_revalidation_required_before_provisioning":True',
    '"candidate_slots_live_process_recensus_required_before_provisioning":True',
    '"candidate_slots_host_user_namespace_recensus_required_before_provisioning":True',
    '"candidate_slots_provisioning_ready":False',
    '"live_process_identity_authority":{',
    '"all_four_uid_slots_consumed":True',
    '"all_four_gid_slots_consumed":True',
    '"supplementary_groups_consumed":True',
    '"candidate_slots_clear_in_final_process_census":True',
    'hold("root_required_for_host_process_census")',
    'lease_code="host_pid_namespace_lease_mismatch"',
    'lease_code="host_user_namespace_lease_mismatch"',
    '"host_user_namespace_external_lease_required":True',
    '"pid1_user_namespace_matches_self":True',
    'census_live_process_credentials(PROC_ROOT)',
    '"store_policy_id":PARENT_STORE_POLICY_ID',
    '"source_generation":source_generation',
    '"source_generation_authenticated":True',
    '"reviewed_source_head_external_lease_required":True',
    'GIT_BIN=Path("/usr/bin/git")',
    'run_git(["rev-parse","HEAD"])',
    'raw_commit_ancestry_contains(observed_head,PARENT_HEAD)',
    'run_git(["cat-file","-p",commit])',
    '"local_identity_authority":{',
    '"libc_nss_lookup_used":False',
    '"remote_nss_provider_allowed":False',
    '"identity_resolution_external_network_calls":False',
    '"claim_identity_provisioned":False',
    '"protected_claim_store_proven":False',
    '"durable_attempt_claim_performed":False',
    '"training_execution_performed":False',
    '"next_gate":"apollyon_durable_attempt_claim_store_service_source_candidate_v2"',
):
    assert required in source,required

for forbidden in (
    "os.system(",
    "os.mkdir(",
    ".mkdir(",
    "write_text(",
    "write_bytes(",
    "os.chown(",
    "os.chmod(",
    "os.unlink(",
    "os.rename(",
    "os.replace(",
    "shutil.",
    "systemctl",
    "useradd",
    "groupadd",
    "import pwd",
    "import grp",
    "pwd.",
    "grp.",
    "shell=True",
    "GIT_ALLOW_PROTOCOL",
):
    assert forbidden not in source,forbidden
assert source.count("subprocess.run(")==1
assert 'env=GIT_ENV' in source
assert '"GIT_CONFIG_NOSYSTEM":"1"' in source
assert '"GIT_CONFIG_GLOBAL":"/dev/null"' in source
assert '"GIT_TERMINAL_PROMPT":"0"' in source
assert '"GIT_NO_REPLACE_OBJECTS":"1"' in source
assert '"GIT_NO_LAZY_FETCH":"1"' in source
assert 'run_git(["cat-file","-t",commit])' in source
assert 'pending.popleft()' in source
assert 'from collections import deque' in source

spec=importlib.util.spec_from_file_location("claim_store_host_plan_v2",PLAN)
assert spec is not None and spec.loader is not None
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

# A reviewed ancestor one edge away must not be starved by a long unrelated
# second-parent merge lineage. A genuinely over-limit search must still HOLD.
synthetic_root="a"*40
synthetic_reviewed="b"*40
synthetic_side="c"*40
synthetic_missing="d"*40
saved_commit_parents=module.raw_commit_parents
def synthetic_merge_parents(commit:str)->list[str]:
    if commit==synthetic_root:
        return [synthetic_reviewed,synthetic_side]
    if commit==synthetic_side:
        return [f"{1:040x}"]
    if commit==synthetic_reviewed:
        return []
    try:
        serial=int(commit,16)
    except ValueError:
        return []
    if 1<=serial<5000:
        return [f"{serial+1:040x}"]
    return []
module.raw_commit_parents=synthetic_merge_parents
try:
    assert module.raw_commit_ancestry_contains(
        synthetic_root,synthetic_reviewed,max_commits=4
    ) is True
    assert module.raw_commit_ancestry_contains(
        synthetic_root,synthetic_side,max_commits=4
    ) is True
    try:
        module.raw_commit_ancestry_contains(
            synthetic_root,synthetic_missing,max_commits=4
        )
    except module.Hold as exc:
        assert str(exc)=="source_git_ancestry_limit_exceeded",str(exc)
    else:
        raise AssertionError("over-limit ancestry must HOLD")
finally:
    module.raw_commit_parents=saved_commit_parents

assert module.parse_login_defs(
    "SYS_UID_MIN 100\nSYS_UID_MAX 999\nSYS_GID_MIN 200\nSYS_GID_MAX 888\n"
)=={
    "SYS_UID_MIN":100,"SYS_UID_MAX":999,
    "SYS_GID_MIN":200,"SYS_GID_MAX":888,
}
assert module.choose_highest_free(100,106,{106,104,101},3)==[105,103,102]
assert module.parse_nsswitch_local_files_only(
    "passwd: files\ngroup: files\nhosts: files dns\n"
)=={"passwd":["files"],"group":["files"]}
for bad,reason in (
    ("passwd: files sss\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
    ("passwd: ldap\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
    ("passwd: compat\ngroup: files\n","nsswitch_identity_source_not_files_only:passwd"),
):
    try:
        module.parse_nsswitch_local_files_only(bad)
    except module.Hold as exc:
        assert str(exc)==reason
    else:
        raise AssertionError("unsafe NSS profile must HOLD")
passwd_rows=module.parse_passwd_file(
    "root:x:0:0:root:/root:/bin/bash\n"
    "zoso:x:1000:1000:ZoSo:/home/zoso:/bin/bash\n"
)
group_rows=module.parse_group_file(
    "root:x:0:\n"
    "zoso:x:1000:\n"
)
assert module.existing_user("zoso",passwd_rows)=={"name":"zoso","uid":1000,"gid":1000}
assert module.existing_group("zoso",group_rows)=={"name":"zoso","gid":1000}


def fixture_proc_stat(pid:int,start_ticks:int)->bytes:
    tail=["S"]+["0"]*18+[str(start_ticks)]
    return (str(pid)+" (fixture) "+" ".join(tail)+"\n").encode("ascii")

def fixture_proc_status(
    pid:int,
    uids:tuple[int,int,int,int],
    gids:tuple[int,int,int,int],
    groups:tuple[int,...],
)->bytes:
    return (
        "Name:\tfixture\n"
        "Pid:\t"+str(pid)+"\n"
        "Uid:\t"+" ".join(str(value) for value in uids)+"\n"
        "Gid:\t"+" ".join(str(value) for value in gids)+"\n"
        "Groups:\t"+" ".join(str(value) for value in groups)+"\n"
    ).encode("ascii")

def write_fixture_process(
    root:Path,
    pid:int,
    *,
    uids:tuple[int,int,int,int]=(601,602,603,604),
    gids:tuple[int,int,int,int]=(701,702,703,704),
    groups:tuple[int,...]=(801,802),
    start_ticks:int=100,
)->Path:
    proc=root/str(pid)
    proc.mkdir(parents=True)
    (proc/"stat").write_bytes(fixture_proc_stat(pid,start_ticks))
    (proc/"status").write_bytes(fixture_proc_status(pid,uids,gids,groups))
    return proc

with tempfile.TemporaryDirectory(prefix="apollyon-proc-census-") as td:
    proc_root=Path(td)
    write_fixture_process(proc_root,41)
    uid_values,gid_values,evidence=module.census_live_process_credentials(proc_root)
    assert {601,602,603,604}<=uid_values
    assert {701,702,703,704,801,802}<=gid_values
    assert evidence["numeric_pid_entries_observed"]==1
    assert evidence["stable_process_generations_observed"]==1
    # Real/effective/saved/fs UID and GID slots plus supplementary groups all
    # participate in candidate exclusion.
    unavailable=uid_values|gid_values
    assert module.choose_highest_free(600,605,unavailable,1)==[605]
    assert module.choose_highest_free(700,705,unavailable,1)==[705]

with tempfile.TemporaryDirectory(prefix="apollyon-proc-malformed-") as td:
    proc_root=Path(td)
    proc=proc_root/"42"
    proc.mkdir()
    (proc/"stat").write_bytes(fixture_proc_stat(42,100))
    (proc/"status").write_bytes(
        b"Pid:\t42\nUid:\t1 1 1 1\nGid:\t2 2 2 2\n"
    )
    try:
        module.read_stable_process_credentials(proc_root,42)
    except module.Hold as exc:
        assert str(exc)=="process_status_required_field_missing",str(exc)
    else:
        raise AssertionError("malformed still-existing process status must HOLD")

with tempfile.TemporaryDirectory(prefix="apollyon-proc-unreadable-") as td:
    proc_root=Path(td)
    proc=proc_root/"43"
    proc.mkdir()
    (proc/"stat").write_bytes(fixture_proc_stat(43,100))
    (proc/"status").mkdir()
    try:
        module.read_stable_process_credentials(proc_root,43)
    except module.Hold as exc:
        assert str(exc)=="process_status_unreadable:43",str(exc)
    else:
        raise AssertionError("unreadable still-existing process status must HOLD")

with tempfile.TemporaryDirectory(prefix="apollyon-proc-disappeared-") as td:
    proc_root=Path(td)
    assert module.read_stable_process_credentials(proc_root,44) is None

with tempfile.TemporaryDirectory(prefix="apollyon-proc-generation-change-") as td:
    proc_root=Path(td)
    write_fixture_process(proc_root,45,start_ticks=100)
    saved_reader=module.read_proc_start_ticks
    ticks=iter((100,101))
    module.read_proc_start_ticks=lambda _root,_pid: next(ticks)
    try:
        try:
            module.read_stable_process_credentials(proc_root,45)
        except module.Hold as exc:
            assert str(exc)=="process_generation_changed_during_census:45",str(exc)
        else:
            raise AssertionError("PID generation change must HOLD")
    finally:
        module.read_proc_start_ticks=saved_reader

for bad in (
    b"42 35 0:31 / /proc rw,nosuid - proc proc rw,hidepid=2\n",
    b"42 35 0:31 / /proc rw,nosuid - tmpfs tmpfs rw\n",
):
    try:
        module.parse_proc_mountinfo_host_view(bad,Path("/proc"))
    except module.Hold:
        pass
    else:
        raise AssertionError("non-authoritative procfs view must HOLD")
assert module.parse_dev_ino_lease("12:34")== (12,34)
assert module.parse_dev_ino_lease(
    "56:78","host_user_namespace_lease_invalid"
)==(56,78)
for bad in ("", "0:1", "1:0", "1", "a:b"):
    try:
        module.parse_dev_ino_lease(bad)
    except module.Hold as exc:
        assert str(exc)=="host_pid_namespace_lease_invalid"
    else:
        raise AssertionError("invalid PID namespace lease must HOLD")
    try:
        module.parse_dev_ino_lease(
            bad,"host_user_namespace_lease_invalid"
        )
    except module.Hold as exc:
        assert str(exc)=="host_user_namespace_lease_invalid"
    else:
        raise AssertionError("invalid user namespace lease must HOLD")

class FakeNamespaceStat:
    def __init__(self,dev:int,ino:int)->None:
        self.st_dev=dev
        self.st_ino=ino

assert module.verify_namespace_lease(
    FakeNamespaceStat(12,34),
    FakeNamespaceStat(12,34),
    (12,34),
    mismatch_code="synthetic_namespace_mismatch",
    lease_code="synthetic_namespace_lease_mismatch",
)==(12,34)
try:
    module.verify_namespace_lease(
        FakeNamespaceStat(56,78),
        FakeNamespaceStat(56,79),
        (56,78),
        mismatch_code="synthetic_user_namespace_mismatch",
        lease_code="synthetic_user_namespace_lease_mismatch",
    )
except module.Hold as exc:
    assert str(exc)=="synthetic_user_namespace_mismatch"
else:
    raise AssertionError("user namespace mismatch must HOLD")

saved_geteuid=module.os.geteuid
saved_stat=module.os.stat
module.os.geteuid=lambda:0
def namespace_mismatch_stat(path):
    text=str(path)
    if text.endswith("/self/ns/pid") or text.endswith("/1/ns/pid"):
        return FakeNamespaceStat(12,34)
    if text.endswith("/self/ns/user"):
        return FakeNamespaceStat(56,78)
    if text.endswith("/1/ns/user"):
        return FakeNamespaceStat(56,79)
    return saved_stat(path)
module.os.stat=namespace_mismatch_stat
try:
    try:
        module.require_authoritative_process_view("12:34","56:78")
    except module.Hold as exc:
        assert str(exc)=="not_in_pid1_user_namespace",str(exc)
    else:
        raise AssertionError(
            "euid0 with host PID namespace but mismatched user namespace must HOLD"
        )
finally:
    module.os.geteuid=saved_geteuid
    module.os.stat=saved_stat


git_env={
    "PATH":"/usr/bin:/bin",
    "HOME":"/nonexistent",
    "LANG":"C",
    "LC_ALL":"C",
    "GIT_CONFIG_NOSYSTEM":"1",
    "GIT_CONFIG_GLOBAL":"/dev/null",
    "GIT_TERMINAL_PROMPT":"0",
    "GIT_OPTIONAL_LOCKS":"0",
    "GIT_NO_REPLACE_OBJECTS":"1",
    "GIT_NO_LAZY_FETCH":"1",
}
head_run=subprocess.run(
    ["/usr/bin/git","-C",str(ROOT),"rev-parse","HEAD"],
    stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=False,timeout=10,env=git_env,
)
assert head_run.returncode==0,head_run.stderr
CURRENT_HEAD=head_run.stdout.strip()
assert len(CURRENT_HEAD)==40 and all(ch in "0123456789abcdef" for ch in CURRENT_HEAD)
source_generation=module.verify_source_generation(CURRENT_HEAD)
assert source_generation["source_head"]==CURRENT_HEAD
assert source_generation["parent_head"]=="9475035552881f34658a7c8f3a6b336199fda159"
assert source_generation["parent_head_ancestor"] is True
assert source_generation["planner_git_blob_sha1"]==EXPECTED_PLANNER_BLOB_SHA1
assert source_generation["parent_contract_git_blob_sha1"]=="bd5572a99ffe0f2cfa43b7d680bbd5077771c6bc"
assert source_generation["source_generation_authenticated"] is True
assert source_generation["isolated_python_startup_proven"] is True
assert source_generation["reviewed_source_head_external_lease_required"] is True
assert source_generation["fixed_git_retained_ancestry_protected"] is True
assert source_generation["git_replace_objects_disabled"] is True
assert source_generation["git_lazy_fetch_disabled"] is True
assert source_generation["raw_commit_object_types_verified"] is True
assert source_generation["raw_commit_ancestry_verified"] is True
assert source_generation["git_network_access_performed"] is False

try:
    module.verify_source_generation("0"*40)
except module.Hold as exc:
    assert str(exc)=="source_head_mismatch"
else:
    raise AssertionError("wrong reviewed source head must HOLD")

with tempfile.TemporaryDirectory(prefix="apollyon-untrusted-git-parent-") as td:
    root=Path(td)
    fake_usr=root/"usr"
    fake_bin=fake_usr/"bin"
    fake_bin.mkdir(parents=True)
    fake_git=fake_bin/"git"
    fake_git.write_bytes(b"not-a-real-git\n")
    fake_git.chmod(0o755)
    fake_bin.chmod(0o777)
    saved_git=module.GIT_BIN
    try:
        module.GIT_BIN=fake_git
        try:
            module.require_fixed_git_binary()
        except module.Hold as exc:
            assert str(exc)=="source_git_binary_ancestor_untrusted",str(exc)
        else:
            raise AssertionError("writable Git executable ancestry must HOLD")
    finally:
        module.GIT_BIN=saved_git

with tempfile.TemporaryDirectory(prefix="apollyon-substituted-planner-") as td:
    substituted=Path(td)/"planner.py"
    substituted.write_bytes(PLAN.read_bytes()+b"\n# substituted\n")
    try:
        module.require_tracked_source_file(
            substituted,EXPECTED_PLANNER_BLOB_SHA1,"synthetic_substituted_planner"
        )
    except module.Hold as exc:
        assert str(exc)=="synthetic_substituted_planner"
    else:
        raise AssertionError("substituted planner bytes must HOLD")

def fixture_git(root:Path,*args:str)->str:
    result=subprocess.run(
        ["/usr/bin/git","-C",str(root),*args],
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=10,env=git_env,
    )
    assert result.returncode==0,(args,result.stdout,result.stderr)
    return result.stdout.strip()

with tempfile.TemporaryDirectory(prefix="apollyon-git-replace-adversary-") as td:
    fixture=Path(td)
    fixture_git(fixture,"init","-q")
    fixture_git(fixture,"config","user.name","VOID CI")
    fixture_git(fixture,"config","user.email","void-ci@example.invalid")
    fixture_plan=fixture/module.PLANNER_REL
    fixture_contract=fixture/module.PARENT_CONTRACT_REL
    fixture_plan.parent.mkdir(parents=True,exist_ok=True)
    fixture_contract.parent.mkdir(parents=True,exist_ok=True)
    fixture_plan.write_bytes(PLAN.read_bytes())
    fixture_contract.write_bytes(CONTRACT.read_bytes())
    fixture_git(fixture,"add",module.PLANNER_REL.as_posix(),module.PARENT_CONTRACT_REL.as_posix())
    fixture_git(fixture,"commit","-q","-m","fixture parent")
    fixture_parent=fixture_git(fixture,"rev-parse","HEAD")

    (fixture/"fixture.txt").write_text("reviewed child\n",encoding="utf-8")
    fixture_git(fixture,"add","fixture.txt")
    fixture_git(fixture,"commit","-q","-m","fixture reviewed head")
    fixture_reviewed=fixture_git(fixture,"rev-parse","HEAD")

    fixture_plan.write_bytes(PLAN.read_bytes()+b"\n# malicious replacement planner\n")
    fixture_git(fixture,"add",module.PLANNER_REL.as_posix())
    fixture_git(fixture,"commit","-q","-m","fixture malicious replacement")
    fixture_malicious=fixture_git(fixture,"rev-parse","HEAD")
    fixture_git(fixture,"replace",fixture_reviewed,fixture_malicious)
    fixture_git(fixture,"reset","--soft",fixture_reviewed)

    saved_root=module.SOURCE_ROOT
    saved_path=module.SOURCE_PATH
    saved_parent=module.PARENT_HEAD
    try:
        module.SOURCE_ROOT=fixture
        module.SOURCE_PATH=fixture_plan
        module.PARENT_HEAD=fixture_parent
        try:
            module.verify_source_generation(fixture_reviewed)
        except module.Hold as exc:
            assert str(exc)=="source_planner_worktree_blob_mismatch",str(exc)
        else:
            raise AssertionError("Git replacement + substituted planner must HOLD")

        fixture_git(fixture,"replace","-d",fixture_reviewed)
        fixture_plan.write_bytes(PLAN.read_bytes())
        grafts=fixture/".git"/"info"/"grafts"
        grafts.parent.mkdir(parents=True,exist_ok=True)
        grafts.write_text(fixture_reviewed+" "+fixture_malicious+"\n",encoding="ascii")
        module.PARENT_HEAD=fixture_malicious
        try:
            module.verify_source_generation(fixture_reviewed)
        except module.Hold as exc:
            assert str(exc)=="source_parent_not_ancestor",str(exc)
        else:
            raise AssertionError("Git graft must not manufacture reviewed parent ancestry")

        tree_sha=fixture_git(fixture,"rev-parse",fixture_reviewed+"^{tree}")
        fake_blob_payload=(
            "tree "+tree_sha+"\n"
            "parent "+fixture_parent+"\n"
            "author VOID CI <void-ci@example.invalid> 0 +0000\n"
            "committer VOID CI <void-ci@example.invalid> 0 +0000\n"
            "\n"
            "blob masquerading as commit\n"
        )
        fake_blob=subprocess.run(
            ["/usr/bin/git","-C",str(fixture),"hash-object","-w","--stdin"],
            input=fake_blob_payload,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            text=True,check=False,timeout=10,env=git_env,
        )
        assert fake_blob.returncode==0,fake_blob.stderr
        fake_blob_sha=fake_blob.stdout.strip()
        assert len(fake_blob_sha)==40

        malformed_commit_payload=(
            "tree "+tree_sha+"\n"
            "parent "+fake_blob_sha+"\n"
            "author VOID CI <void-ci@example.invalid> 1 +0000\n"
            "committer VOID CI <void-ci@example.invalid> 1 +0000\n"
            "\n"
            "malformed parent type\n"
        )
        malformed_commit=subprocess.run(
            ["/usr/bin/git","-C",str(fixture),"hash-object","-t","commit","-w","--stdin"],
            input=malformed_commit_payload,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
            text=True,check=False,timeout=10,env=git_env,
        )
        assert malformed_commit.returncode==0,malformed_commit.stderr
        malformed_commit_sha=malformed_commit.stdout.strip()
        try:
            module.raw_commit_ancestry_contains(malformed_commit_sha,fixture_parent)
        except module.Hold as exc:
            assert str(exc)=="source_git_commit_object_type_invalid",str(exc)
        else:
            raise AssertionError("non-commit parent object must HOLD during ancestry walk")
    finally:
        module.SOURCE_ROOT=saved_root
        module.SOURCE_PATH=saved_path
        module.PARENT_HEAD=saved_parent
try:
    module.parse_login_defs(
        "SYS_UID_MIN 100\nSYS_UID_MIN 101\nSYS_UID_MAX 999\n"
        "SYS_GID_MIN 100\nSYS_GID_MAX 999\n"
    )
except module.Hold as exc:
    assert str(exc)=="login_defs_duplicate:SYS_UID_MIN"
else:
    raise AssertionError("duplicate login.defs key must HOLD")
try:
    module.choose_highest_free(100,101,{100,101},1)
except module.Hold as exc:
    assert str(exc)=="candidate_selection_exhausted"
else:
    raise AssertionError("exhausted candidate range must HOLD")

nonisolated=subprocess.run(
    ["python3","-B",str(PLAN),"--self-test"],
    cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=False,timeout=20,
)
assert nonisolated.returncode==2
assert "HOLD=python_runtime_not_isolated" in nonisolated.stderr

r=subprocess.run(
    ["python3","-I","-B",str(PLAN),"--self-test"],
    cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=False,timeout=20,
)
assert r.returncode==0,r.stderr
for line in (
    "VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2_SELF_TEST_GREEN",
    "read_only=true",
    "fixed_identity_names_bound=true",
    "fixed_paths_bound=true",
    "candidate_slot_selection_deterministic=true",
    "nsswitch_passwd_group_files_only_required=true",
    "libc_nss_lookup_used=false",
    "remote_nss_provider_rejected=true",
    "identity_resolution_external_network_calls=false",
    "candidate_slot_revalidation_required=true",
    "root_host_process_census_required=true",
    "host_pid_namespace_external_lease_required=true",
    "host_user_namespace_external_lease_required=true",
    "host_root_user_namespace_binding_required=true",
    "all_uid_gid_slots_and_supplementary_groups_consumed=true",
    "candidate_live_process_recensus_required_before_provisioning=true",
    "candidate_slots_provisioning_ready=false",
    "stable_store_policy_id_bound=true",
    "source_generation_authentication_required=true",
    "isolated_python_startup_required=true",
    "reviewed_source_head_external_lease_required=true",
    "host_installation_performed=false",
    "durable_attempt_claim=false",
    "training_execution=false",
):
    assert line in r.stdout,line

negative=subprocess.run(
    ["python3","-I","-B",str(PLAN),"--run","--expected-parent-head",
     "9475035552881f34658a7c8f3a6b336199fda159",
     "--expected-source-head",CURRENT_HEAD,
     "--expected-host-pid-namespace-dev-ino","1:1",
     "--expected-host-user-namespace-dev-ino","1:1"],
    cwd=ROOT,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
    text=True,check=False,timeout=20,
)
assert negative.returncode==2
assert "HOLD=wrong_host" in negative.stderr
for line in (
    "read_only=true",
    "filesystem_write=false",
    "account_mutation=false",
    "systemd_mutation=false",
    "service_action=false",
    "durable_attempt_claim=false",
    "training_execution=false",
):
    assert line in negative.stderr,line

print("VOID_APOLLYON_DURABLE_ATTEMPT_CLAIM_STORE_HOST_PLAN_V2_PROOF_GREEN")
print("parent_contract_exact_blob_bound=true")
print("hosted_live_run_negative_only=true")
print("nsswitch_passwd_group_files_only_required=true")
print("libc_nss_lookup_used=false")
print("remote_nss_provider_rejected=true")
print("candidate_slot_revalidation_required=true")
print("root_host_process_census_required=true")
print("host_pid_namespace_external_lease_required=true")
print("host_user_namespace_external_lease_required=true")
print("host_root_user_namespace_binding_required=true")
print("euid0_user_namespace_mismatch_rejected=true")
print("all_uid_gid_slots_and_supplementary_groups_consumed=true")
print("malformed_unreadable_process_status_fails_closed=true")
print("disappeared_pid_skipped=true")
print("pid_generation_change_rejected=true")
print("candidate_live_process_recensus_required_before_provisioning=true")
print("candidate_slots_provisioning_ready=false")
print("store_policy_id_rederived_from_parent_contract=true")
print("store_policy_esm_dependency_closure_exact=true")
print("store_policy_import_trigger_symmetry=true")
print("isolated_python_startup_required=true")
print("nonisolated_python_invocation_rejected=true")
print("live_source_head_and_blob_authenticated=true")
print("wrong_source_head_rejected=true")
print("substituted_planner_rejected=true")
print("git_replace_objects_disabled=true")
print("git_lazy_fetch_disabled=true")
print("fixed_git_retained_ancestry_protected=true")
print("writable_git_ancestor_rejected=true")
print("git_commit_object_types_verified=true")
print("git_replace_substitution_adversary_rejected=true")
print("git_graft_ancestry_adversary_rejected=true")
print("noncommit_parent_object_rejected=true")
print("raw_commit_ancestry_verified=true")
print("reviewed_source_head_external_lease_required=true")
print("stable_store_policy_id="+EXPECTED_STORE_POLICY_ID)
print("persistent_filesystem_write=false")
print("account_mutation=false")
print("systemd_mutation=false")
print("service_action=false")
print("durable_attempt_claim=false")
print("training_execution=false")
