#!/usr/bin/env python3
from __future__ import annotations

import argparse
import grp
import hashlib
import json
import os
from pathlib import Path
import pwd
import socket
import stat
import subprocess
import sys
import time

MARKER="VOID_APOLLYON_LIVE_CUSTODY_DORMANT_QUALIFICATION_V1"
TARGET_HOST="Xiphos"

TARGET_UNIT="void-apollyon-authorization-custody-v1.target"
SERVICE_UNIT="void-apollyon-authorization-custody-v1.service"
TRAINING_UNIT="void-apollyon-training-bus-isolation-v1.service"

TARGET_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.target")
SERVICE_PATH=Path("/etc/systemd/system/void-apollyon-authorization-custody-v1.service")
HELPER_PATH=Path("/opt/void-apollyon-custody-lifecycle-v1/apollyon_custody_stale_socket_cleanup_v1.py")
NODE_PATH=Path("/opt/void-apollyon-node-runtime-v1/node")
LAUNCHER_PATH=Path("/opt/void-apollyon-custody-service-v2-reviewed-v1/tools/apollyon-authorization-custody-launcher-v2.mjs")
ENV_PATH=Path("/etc/void/apollyon-custody-v1/custody.env")
PUBLIC_KEY_PATH=Path("/etc/void/apollyon-custody-v1/operator-public-key.pem")
SOCKET_PARENT=Path("/run/void-apollyon-custody-v1")
SOCKET_PATH=SOCKET_PARENT/"custody.sock"
CONSUMED=Path("/var/lib/void-apollyon-custody-v1/consumed")

TARGET_BLOB="9daceeb07933a8a5158bc93bbc2760027d79e2d8"
SERVICE_BLOB="83f363b331bc2331416fd1c0ca6d52f53371fef0"
HELPER_BLOB="3cb5f2b85c80b9a26ba5e8d73634c29f584011af"
LAUNCHER_BLOB="d23ff045d8c355401fed499c6bcffd503ba4c7fd"
NODE_BYTES=126595440
NODE_SHA256="7fde7b8afa198da66257f42ee2001d874c7355631e6d1579a5fb5ef1f246df4c"
EXPECTED_PUBLIC_RAW_SHA256="c7aba012afd257699e85b296cc3337cf7b205a869e3f9b37876688c675783134"
SPKI_PREFIX=bytes.fromhex("302a300506032b6570032100")
EXPECTED_EXEC_STOP_POST=(
    "/usr/bin/python3 -I -B "
    "/opt/void-apollyon-custody-lifecycle-v1/"
    "apollyon_custody_stale_socket_cleanup_v1.py --cleanup"
)

class Hold(RuntimeError): pass
def hold(reason:str)->None: raise Hold(reason)

def git_blob(data:bytes)->str:
    h=hashlib.sha1();h.update(f"blob {len(data)}\0".encode("ascii"));h.update(data);return h.hexdigest()

def run(argv:list[str],check=True,timeout=20)->subprocess.CompletedProcess[str]:
    r=subprocess.run(
        argv,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        text=True,check=False,timeout=timeout,
        env={"PATH":"/usr/sbin:/usr/bin:/sbin:/bin","LC_ALL":"C"},
    )
    if check and r.returncode!=0:hold("command_failed:"+Path(argv[0]).name+":"+argv[-1])
    return r

def exact_file(path:Path,mode:int,uid:int=0,gid:int=0,blob:str|None=None)->os.stat_result:
    st=os.lstat(path)
    if (
        not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode) or st.st_nlink!=1 or
        st.st_uid!=uid or st.st_gid!=gid or stat.S_IMODE(st.st_mode)!=mode
    ):hold("file_metadata_invalid:"+str(path))
    if blob is not None and git_blob(path.read_bytes())!=blob:
        hold("file_blob_invalid:"+str(path))
    return st

def exact_dormant(unit:str,expected_unit_file_state:str|None=None,allow_failed:bool=False)->dict[str,str]:
    r=run([
        "/usr/bin/systemctl","show",unit,"--no-pager",
        "-p","LoadState","-p","ActiveState","-p","SubState",
        "-p","UnitFileState","-p","MainPID",
    ],check=False)
    if r.returncode!=0:hold("unit_state_probe_failed:"+unit)
    props={}
    for line in r.stdout.splitlines():
        if "=" not in line:hold("unit_state_invalid:"+unit)
        k,v=line.split("=",1)
        if k in props:hold("unit_state_duplicate:"+unit)
        props[k]=v
    if props.get("LoadState")!="loaded":hold("unit_not_loaded:"+unit)
    active=props.get("ActiveState")
    if allow_failed:
        if active not in ("inactive","failed"):
            hold("unit_not_safely_dormant:"+unit)
    elif active!="inactive":
        hold("unit_not_inactive:"+unit)
    unit_file_state=props.get("UnitFileState")
    if expected_unit_file_state is not None:
        if unit_file_state!=expected_unit_file_state:
            hold("unit_file_state_unexpected:"+unit)
    elif unit_file_state=="enabled":
        hold("unit_enabled:"+unit)
    if props.get("MainPID") not in ("","0",None):hold("unit_mainpid_nonzero:"+unit)
    return props

def loaded_relations()->None:
    target=run([
        "/usr/bin/systemctl","show",TARGET_UNIT,"--no-pager",
        "-p","Wants","-p","PropagatesStopTo",
    ])
    props={}
    for line in target.stdout.splitlines():
        if "=" in line:
            k,v=line.split("=",1);props[k]=v
    if SERVICE_UNIT not in props.get("Wants","").split():hold("target_wants_missing")
    if SERVICE_UNIT not in props.get("PropagatesStopTo","").split():hold("target_stop_propagation_missing")

    service=run([
        "/usr/bin/systemctl","show",SERVICE_UNIT,"--no-pager",
        "-p","RefuseManualStart","-p","RefuseManualStop","-p","ExecStopPost",
        "-p","RestrictAddressFamilies","-p","NoNewPrivileges",
    ])
    s={}
    for line in service.stdout.splitlines():
        if "=" in line:
            k,v=line.split("=",1);s[k]=v
    if s.get("RefuseManualStart")!="yes" or s.get("RefuseManualStop")!="yes":
        hold("service_manual_refusal_missing")
    if s.get("NoNewPrivileges")!="yes":hold("service_nnp_missing")
    if s.get("RestrictAddressFamilies")!="AF_UNIX":hold("service_address_family_invalid")
    command=s.get("ExecStopPost","")
    for part in ("/usr/bin/python3","-I","-B",os.fspath(HELPER_PATH),"--cleanup"):
        if part not in command:hold("exec_stop_post_invalid")

def verify_public_key()->None:
    exact_file(PUBLIC_KEY_PATH,0o644,0,0)
    data=PUBLIC_KEY_PATH.read_bytes()
    if b"PRIVATE KEY" in data:hold("public_key_contains_private_material")
    r=subprocess.run(
        ["/usr/bin/openssl","pkey","-pubin","-outform","DER"],
        input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
        check=False,timeout=10,env={"PATH":"/usr/bin:/bin","LC_ALL":"C"},
    )
    if r.returncode!=0 or len(r.stdout)!=44 or not r.stdout.startswith(SPKI_PREFIX):
        hold("public_key_invalid")
    if hashlib.sha256(r.stdout[len(SPKI_PREFIX):]).hexdigest()!=EXPECTED_PUBLIC_RAW_SHA256:
        hold("public_key_fingerprint_invalid")

def verify_static_install()->dict[str,int]:
    exact_file(TARGET_PATH,0o644,0,0,TARGET_BLOB)
    exact_file(SERVICE_PATH,0o644,0,0,SERVICE_BLOB)
    exact_file(HELPER_PATH,0o444,0,0,HELPER_BLOB)
    exact_file(LAUNCHER_PATH,0o444,0,0,LAUNCHER_BLOB)
    node=exact_file(NODE_PATH,0o755,0,0)
    if node.st_size!=NODE_BYTES:hold("node_size_invalid")
    h=hashlib.sha256()
    with NODE_PATH.open("rb",buffering=0) as f:
        while True:
            b=f.read(1024*1024)
            if not b:break
            h.update(b)
    if h.hexdigest()!=NODE_SHA256:hold("node_sha256_invalid")
    verify_public_key()
    loaded_relations()
    return {
        "custody_uid":pwd.getpwnam("voidapollyoncustody").pw_uid,
        "custody_gid":grp.getgrnam("voidapollyoncustody").gr_gid,
        "ipc_gid":grp.getgrnam("voidapollyonipc").gr_gid,
        "training_uid":pwd.getpwnam("voidapollyontrain").pw_uid,
    }

def proc_start_ticks(pid:int)->str:
    text=Path(f"/proc/{pid}/stat").read_text(encoding="ascii")
    close=text.rfind(")")
    fields=text[close+2:].split()
    if len(fields)<20 or not fields[19].isdigit():hold("proc_stat_invalid")
    return fields[19]

def proc_status(pid:int)->dict[str,str]:
    out={}
    for line in Path(f"/proc/{pid}/status").read_text(encoding="utf-8").splitlines():
        if ":" in line:
            k,v=line.split(":",1);out[k]=v.strip()
    return out

def no_training_uid_processes(training_uid:int)->bool:
    for p in Path("/proc").iterdir():
        if not p.name.isdigit():continue
        try:
            status=proc_status(int(p.name))
        except (FileNotFoundError,PermissionError,ProcessLookupError):
            continue
        uids=status.get("Uid","").split()
        if any(x.isdigit() and int(x)==training_uid for x in uids):
            return False
    return True

def parse_uid_slots(status:dict[str,str])->tuple[int,int,int,int]:
    raw=status.get("Uid")
    if raw is None:
        hold("process_uid_slots_missing")
    slots=raw.split()
    if len(slots)!=4 or any(not value.isdigit() for value in slots):
        hold("process_uid_slots_invalid")
    values=tuple(int(value,10) for value in slots)
    return values  # type: ignore[return-value]

def uid_process_generations(uid:int)->dict[int,str]:
    try:
        entries=sorted(
            (entry for entry in Path("/proc").iterdir() if entry.name.isdigit()),
            key=lambda entry:int(entry.name,10),
        )
    except OSError as exc:
        raise Hold("custody_uid_process_census_unavailable") from exc
    observed:dict[int,str]={}
    for entry in entries:
        pid=int(entry.name,10)
        try:
            status=proc_status(pid)
        except (FileNotFoundError,ProcessLookupError):
            continue
        except (PermissionError,OSError,UnicodeError) as exc:
            if not entry.exists():
                continue
            raise Hold("custody_uid_process_status_unreadable:"+entry.name) from exc
        try:
            uid_slots=parse_uid_slots(status)
        except Hold:
            if not entry.exists():
                continue
            raise
        if uid not in uid_slots:
            continue
        try:
            start_ticks=proc_start_ticks(pid)
        except (FileNotFoundError,ProcessLookupError):
            continue
        except (PermissionError,OSError,UnicodeError) as exc:
            if not entry.exists():
                continue
            raise Hold("custody_uid_process_generation_unreadable:"+entry.name) from exc
        observed[pid]=start_ticks
    return observed

def exact_live_custody_process_set(
    observed:dict[int,str],pid:int,start_ticks:str
)->bool:
    return observed=={pid:start_ticks}

def require_no_custody_uid_processes(uid:int,reason:str)->None:
    if uid_process_generations(uid):
        hold(reason)

def consumed_snapshot()->list[dict[str,object]]:
    if not CONSUMED.is_dir():hold("consumed_directory_missing")
    rows=[]
    for entry in sorted(CONSUMED.iterdir(),key=lambda p:p.name):
        st=os.lstat(entry)
        rows.append({
            "name":entry.name,"mode":stat.S_IFMT(st.st_mode),
            "size":st.st_size,"mtime_ns":st.st_mtime_ns,"ctime_ns":st.st_ctime_ns,
        })
    return rows

def wait_unit(unit:str,state:str,timeout_s:float=8.0)->dict[str,str]:
    deadline=time.monotonic()+timeout_s
    last={}
    while time.monotonic()<deadline:
        r=run([
            "/usr/bin/systemctl","show",unit,"--no-pager",
            "-p","LoadState","-p","ActiveState","-p","SubState","-p","MainPID",
        ],check=False)
        props={}
        if r.returncode==0:
            for line in r.stdout.splitlines():
                if "=" in line:
                    k,v=line.split("=",1);props[k]=v
            last=props
            if props.get("LoadState")=="loaded" and props.get("ActiveState")==state:
                return props
        time.sleep(0.1)
    hold("unit_transition_timeout:"+unit+":"+state+":"+json.dumps(last,sort_keys=True))

def wait_socket(present:bool,timeout_s:float=8.0)->None:
    deadline=time.monotonic()+timeout_s
    while time.monotonic()<deadline:
        exists=SOCKET_PATH.exists()
        if exists==present:return
        time.sleep(0.05)
    hold("socket_transition_timeout:"+("present" if present else "absent"))

def assert_socket_parent_empty()->None:
    if not SOCKET_PARENT.is_dir():
        hold("socket_parent_missing")
    names=sorted(entry.name for entry in os.scandir(SOCKET_PARENT))
    if names:
        hold("socket_parent_not_empty:"+",".join(names))

def live_observation(ids:dict[str,int])->dict[str,object]:
    service=wait_unit(SERVICE_UNIT,"active")
    target=wait_unit(TARGET_UNIT,"active")
    raw=service.get("MainPID","")
    if not raw.isdigit() or int(raw)<=0:hold("custody_mainpid_invalid")
    pid=int(raw)
    start_ticks=proc_start_ticks(pid)
    exe=Path(os.path.realpath(f"/proc/{pid}/exe"))
    if exe!=NODE_PATH:hold("custody_node_executable_mismatch")
    status=proc_status(pid)
    uid_slots=status.get("Uid","").split()
    gid_slots=status.get("Gid","").split()
    if uid_slots!=[str(ids["custody_uid"])]*4:hold("custody_uid_slots_invalid")
    if gid_slots!=[str(ids["custody_gid"])]*4:hold("custody_gid_slots_invalid")
    groups=[int(x) for x in status.get("Groups","").split() if x.isdigit()]
    if ids["ipc_gid"] not in groups:hold("custody_ipc_group_missing")
    for cap in ("CapInh","CapPrm","CapEff","CapAmb"):
        rawcap=status.get(cap)
        if rawcap is None or int(rawcap,16)!=0:hold("custody_capability_nonzero:"+cap)
    if status.get("NoNewPrivs")!="1":hold("custody_no_new_privileges_missing")

    cmd=Path(f"/proc/{pid}/cmdline").read_bytes()
    if not cmd.endswith(b"\0"):hold("custody_cmdline_invalid")
    argv=cmd[:-1].decode("utf-8").split("\0")
    if len(argv)!=12:hold("custody_argv_length_invalid")
    if Path(os.path.realpath(argv[0]))!=NODE_PATH:hold("custody_argv_node_invalid")
    if argv[1]!=os.fspath(LAUNCHER_PATH):hold("custody_argv_launcher_invalid")

    wait_socket(True)
    st=os.lstat(SOCKET_PATH)
    if (
        not stat.S_ISSOCK(st.st_mode) or st.st_uid!=ids["custody_uid"] or
        st.st_gid!=ids["ipc_gid"] or stat.S_IMODE(st.st_mode)!=0o660 or st.st_nlink!=2
    ):hold("live_socket_metadata_invalid")
    probe=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM)
    try:
        probe.settimeout(1.0)
        if probe.connect_ex(os.fspath(SOCKET_PATH))!=0:hold("live_socket_connect_failed")
    finally:
        probe.close()

    if not no_training_uid_processes(ids["training_uid"]):
        hold("training_uid_process_observed")
    custody_processes=uid_process_generations(ids["custody_uid"])
    if not exact_live_custody_process_set(custody_processes,pid,start_ticks):
        hold("custody_uid_process_exclusivity_failed")

    return {
        "pid":pid,"start_ticks":start_ticks,
        "custody_uid_process_count":len(custody_processes),
        "custody_uid_process_exclusivity_proven":True,
        "socket_dev":st.st_dev,"socket_ino":st.st_ino,
        "target_active":target.get("ActiveState")=="active",
        "service_active":service.get("ActiveState")=="active",
        "socket_nlink":st.st_nlink,
    }

def stop_and_attest(ids:dict[str,int])->dict[str,object]:
    run(["/usr/bin/systemctl","stop",TARGET_UNIT])
    wait_unit(TARGET_UNIT,"inactive")
    wait_unit(SERVICE_UNIT,"inactive")
    wait_socket(False)
    assert_socket_parent_empty()
    if not no_training_uid_processes(ids["training_uid"]):
        hold("training_uid_process_after_stop")
    require_no_custody_uid_processes(
        ids["custody_uid"],"custody_uid_process_after_stop"
    )
    return {
        "target_inactive":True,"service_inactive":True,"socket_absent":True,
        "custody_uid_process_count":0,
    }

def plan()->dict:
    if socket.gethostname().casefold()!=TARGET_HOST.casefold():hold("wrong_host")
    ids=verify_static_install()
    exact_dormant(TARGET_UNIT,"disabled")
    exact_dormant(SERVICE_UNIT,"static")
    exact_dormant(TRAINING_UNIT,allow_failed=True)
    if SOCKET_PATH.exists():hold("preexisting_socket_path")
    assert_socket_parent_empty()
    require_no_custody_uid_processes(
        ids["custody_uid"],"preexisting_custody_uid_process"
    )
    if not no_training_uid_processes(ids["training_uid"]):hold("preexisting_training_uid_process")
    return {
        "marker":MARKER,"mode":"--plan","target_host":TARGET_HOST,
        "static_install_verified":True,"target_dormant":True,"service_dormant":True,
        "socket_absent":True,"training_uid_processes_absent":True,
        "custody_uid_processes_absent":True,
        "planned_cycles":2,"target_start_stop":False,"service_direct_action":False,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"RUN_TWO_CYCLE_DORMANT_QUALIFICATION",
    }

def qualify()->dict:
    if os.geteuid()!=0:hold("run_requires_root")
    before=plan()
    ids=verify_static_install()
    consumed_before=consumed_snapshot()
    observations=[]
    target_maybe_started=False
    error=None
    try:
        for cycle in (1,2):
            require_no_custody_uid_processes(
                ids["custody_uid"],"prestart_custody_uid_process"
            )
            target_maybe_started=True
            run(["/usr/bin/systemctl","start",TARGET_UNIT])
            live=live_observation(ids)
            live["cycle"]=cycle
            observations.append({"live":live})
            stopped=stop_and_attest(ids)
            observations[-1]["stopped"]=stopped
            target_maybe_started=False
        first_generation=(observations[0]["live"]["pid"],observations[0]["live"]["start_ticks"])
        second_generation=(observations[1]["live"]["pid"],observations[1]["live"]["start_ticks"])
        if first_generation==second_generation:
            hold("custody_process_generation_not_renewed")
        if consumed_snapshot()!=consumed_before:
            hold("consumed_state_changed")
    except BaseException as exc:
        error=exc
    finally:
        if target_maybe_started:
            stop=run(["/usr/bin/systemctl","stop",TARGET_UNIT],check=False)
            try:
                wait_unit(TARGET_UNIT,"inactive",5.0)
                wait_unit(SERVICE_UNIT,"inactive",5.0)
                wait_socket(False,5.0)
                assert_socket_parent_empty()
            except BaseException as cleanup_exc:
                if error is None:error=cleanup_exc
            if stop.returncode!=0 and error is None:
                error=Hold("emergency_target_stop_failed")
    if error is not None:raise error

    exact_dormant(TARGET_UNIT,"disabled");exact_dormant(SERVICE_UNIT,"static")
    if SOCKET_PATH.exists():hold("final_socket_present")
    assert_socket_parent_empty()
    if consumed_snapshot()!=consumed_before:hold("final_consumed_state_changed")
    if not no_training_uid_processes(ids["training_uid"]):hold("final_training_uid_process")
    require_no_custody_uid_processes(
        ids["custody_uid"],"final_custody_uid_process"
    )

    return {
        **before,"mode":"--run","cycles_completed":2,
        "cycle_observations":observations,
        "target_start_stop":True,"service_direct_action":False,
        "socket_cleanup_proven":True,"restart_safe_second_cycle_proven":True,
        "consumed_state_unchanged":True,"training_uid_processes_absent":True,
        "custody_uid_process_exclusivity_proven":True,
        "custody_uid_processes_absent_after_cycles":True,
        "training_execution":False,"durable_attempt_claim":False,
        "operator_private_key_access":False,"funds_movement":False,
        "next_action":"LIVE_CUSTODY_DORMANT_QUALIFICATION_GREEN",
    }

def self_test()->None:
    own=Path(__file__).read_text(encoding="utf-8")
    for required in (
        'run(["/usr/bin/systemctl","start",TARGET_UNIT])',
        'run(["/usr/bin/systemctl","stop",TARGET_UNIT])',
        'wait_socket(False)',
        'assert_socket_parent_empty()',
        'target_maybe_started=True',
        'active not in ("inactive","failed")',
        'st.st_nlink!=2',
        'consumed_snapshot()!=consumed_before',
        'custody_process_generation_not_renewed',
        'training_uid_process_observed',
        'custody_uid_process_exclusivity_failed',
        'preexisting_custody_uid_process',
        'prestart_custody_uid_process',
        'custody_uid_process_after_stop',
        'final_custody_uid_process',
        'exact_dormant(TARGET_UNIT,"disabled")',
        'exact_dormant(SERVICE_UNIT,"static")',
    ):
        assert required in own,required
    assert exact_live_custody_process_set({101:"77"},101,"77")
    assert not exact_live_custody_process_set({},101,"77")
    assert not exact_live_custody_process_set({101:"77",102:"88"},101,"77")
    assert parse_uid_slots({"Uid":"123 123 123 123"})==(123,123,123,123)
    forbidden_parts=(
        ("systemctl",'","',"start",'",SERVICE_UNIT'),
        ("systemctl",'","',"stop",'",SERVICE_UNIT'),
        ("PRIVATE ","KEY-----"),
        ("crypto",".sign"),
        ("eth_sendRaw","Transaction"),
    )
    for parts in forbidden_parts:
        forbidden="".join(parts)
        assert forbidden not in own,forbidden
    print(MARKER+"_SELF_TEST_GREEN")
    print("two_cycle_target_start_stop=true")
    print("direct_service_action=false")
    print("socket_cleanup_required_each_cycle=true")
    print("custody_uid_process_exclusivity_required=true")
    print("custody_uid_zero_one_zero_each_cycle=true")
    print("second_custody_uid_process_rejected=true")
    print("target_unit_file_state_disabled_required=true")
    print("service_unit_file_state_static_required=true")
    print("consumed_state_unchanged_required=true")
    print("training_execution=false")
    print("durable_attempt_claim=false")
    print("funds_movement=false")

def main()->int:
    ap=argparse.ArgumentParser();g=ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--self-test",action="store_true");g.add_argument("--plan",action="store_true");g.add_argument("--run",action="store_true")
    args=ap.parse_args()
    try:
        if args.self_test:self_test();return 0
        out=qualify() if args.run else plan()
        print(json.dumps(out,sort_keys=True,separators=(",",":")));return 0
    except (Hold,OSError,KeyError,ValueError,subprocess.SubprocessError) as exc:
        print("HOLD="+str(exc),file=sys.stderr)
        print("direct_service_action=false",file=sys.stderr)
        print("training_execution=false",file=sys.stderr)
        print("durable_attempt_claim=false",file=sys.stderr)
        print("operator_private_key_access=false",file=sys.stderr)
        print("funds_movement=false",file=sys.stderr)
        return 2
if __name__=="__main__":raise SystemExit(main())
