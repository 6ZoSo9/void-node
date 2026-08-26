
#!/usr/bin/env python3
from __future__ import annotations
import copy, hashlib, json, os, resource, select, shutil, signal, socket, subprocess, tempfile, time
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
S=ROOT/"scripts"

def limits():
    resource.setrlimit(resource.RLIMIT_CORE,(0,0))
    resource.setrlimit(resource.RLIMIT_NOFILE,(512,512))
    eight=8*1024*1024*1024
    resource.setrlimit(resource.RLIMIT_AS,(eight,eight))

def wait_ready(p,timeout=10):
    deadline=time.monotonic()+timeout;out=[]
    while time.monotonic()<deadline:
        if p.poll() is not None:
            if p.stdout: out.append(p.stdout.read() or "")
            return False,"".join(out)
        ready,_,_=select.select([p.stdout],[],[],0.25)
        if ready:
            line=p.stdout.readline()
            if line:
                out.append(line)
                if "VOID_APOLLYON_OPENROUTER_BROKER_SERVICE_READY_V1" in line:return True,"".join(out)
    return False,"".join(out)

def wait_for_accept_commit(state,timeout=15):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        capsules=list((state/"accepted-results-v1").glob("accepted-result-v1-*.json"))
        results=list((state/"ledger-v1").glob("apollyon-op-v1-*/record-0000000000000003.json"))
        if len(capsules)==1 and len(results)==1:return capsules[0]
        time.sleep(0.05)
    raise SystemExit("HOLD accepted result/capsule did not become durable")

MOCK=r"""import { appendFile } from 'node:fs/promises';
const marker=process.env.VOID_PROOF_FETCH_MARKER,secret=process.env.VOID_PROOF_EXPECTED_SECRET;
function resp(url,v){const b=Buffer.from(JSON.stringify(v));let sent=false;return{url,status:200,headers:{get:n=>String(n).toLowerCase()==='content-length'?String(b.length):null},body:{getReader(){return{async read(){if(sent)return{done:true};sent=true;return{done:false,value:new Uint8Array(b)}},async cancel(){}}}}}}
globalThis.fetch=async(url,o={})=>{if(o?.headers?.authorization!==`Bearer ${secret}`)throw new Error('wrong credential');const m=String(o.method??'GET').toUpperCase();
if(url==='https://openrouter.ai/api/v1/models'&&m==='GET'){await appendFile(marker,'catalog\n');return resp(url,{data:[{id:'stealth/ox-alpha',canonical_slug:'stealth/ox-alpha',context_length:1048576,pricing:{prompt:'0',completion:'0',image:'0'}}]})}
if(url==='https://openrouter.ai/api/v1/chat/completions'&&m==='POST'){await appendFile(marker,'chat\n');const body=JSON.parse(o.body);const n=Number(process.env.VOID_PROOF_CONTENT_BYTES||'0');const content=n>0?'x'.repeat(n):'broker integration proof';return resp(url,{id:'proof',model:body.model,choices:[{finish_reason:'stop',message:{content}}],usage:{prompt_tokens:7,completion_tokens:3},openrouter_metadata:{requested:body.model,endpoints:{available:[{selected:true,model:body.model,provider:'Stealth'}]}}})}
throw new Error(`unexpected ${m} ${url}`)};"""

SIGNER=r"""import { buildOpenRouterBrokerBindingV1 } from '__BINDING_URI__';
import { buildBrokerAdmissionCapabilityV1, buildBrokerReplayCapabilityV1, readBrokerAdmissionMacCredentialV1 } from '__CAPABILITY_URI__';
import { req } from './request.mjs';
let key=null;
try{
  key=await readBrokerAdmissionMacCredentialV1(process.env.CREDENTIALS_DIRECTORY);
  const binding=buildOpenRouterBrokerBindingV1({logicalOperationIntentDigest:req.logical_operation_intent_digest,registrySha256:req.registry_sha256,requestBody:req.request_body,contestant:req.contestant});
  const provenance={binding,model:req.contestant.model,canonicalSlug:req.contestant.canonical_slug,trialId:`voidat1_${'a'.repeat(64)}`,admissionId:`voidaa1_${'b'.repeat(64)}`,admissionReceiptSha256:'c'.repeat(64),promptSha256:'d'.repeat(64)};
  const replayProvenance=process.env.VOID_PROOF_MISMATCH_REPLAY==='1'
    ? {...provenance,admissionId:`voidaa1_${'e'.repeat(64)}`}
    : provenance;
  const cap=buildBrokerAdmissionCapabilityV1(provenance,key);
  const replay=buildBrokerReplayCapabilityV1(replayProvenance,key);
  console.log('VOID_PROOF_SIGNED_REQUEST_JSON='+JSON.stringify({...req,admission_capability:cap,replay_capability:replay}));
}finally{if(key)key.fill(0)}"""

DROP_CLIENT=r"""import { createConnection } from 'node:net';
import { encodeBrokerRequestV1 } from './scripts/apollyon_openrouter_broker_ipc_protocol_v1.mjs';
import { req } from './request.mjs';
const s=createConnection({path:process.env.VOID_PROOF_SOCKET});
s.once('connect',()=>s.write(encodeBrokerRequestV1(req),()=>{s.destroy();console.log('VOID_BROKER_DROP_CLIENT_SENT');}));
s.once('error',()=>{});"""

CLIENT=r"""import assert from 'node:assert/strict';
import { runBrokerClientV1 } from './scripts/apollyon_openrouter_broker_client_v1.mjs';
import { req } from './request.mjs';
for(const k of ['OPENROUTER_API_KEY','CREDENTIALS_DIRECTORY','STATE_DIRECTORY'])assert.equal(process.env[k],undefined);
let q=req;
const mode=process.env.VOID_PROOF_REQUEST_MODE||'exact';
if(mode==='bad_registry')q={...req,registry_sha256:'f'.repeat(64)};
if(mode==='unreviewed_contestant')q={...req,request_body:{...req.request_body,model:'stealth/not-reviewed'},contestant:{...req.contestant,model:'stealth/not-reviewed',canonical_slug:'stealth/not-reviewed'}};
if(mode==='changed_prompt')q={...req,request_body:{...req.request_body,messages:[req.request_body.messages[0],{...req.request_body.messages[1],content:req.request_body.messages[1].content+' changed'}]}};
const r=await runBrokerClientV1(process.env.VOID_PROOF_SOCKET,q);
const expected=process.env.VOID_PROOF_EXPECT_STATUS||'ACCEPTED';
assert.equal(r.status,expected,JSON.stringify(r));
if(expected==='ACCEPTED'){
  assert.match(r.operation_id,/^apollyon_op_v1:[0-9a-f]{64}$/);
  assert.match(r.result_digest,/^[0-9a-f]{64}$/);
  assert.match(r.result.broker_admission_capability_id,/^voidobac1_[0-9a-f]{64}$/);
  assert.match(r.result.broker_replay_capability_id,/^voidobrc1_[0-9a-f]{64}$/);
  if(!process.env.VOID_PROOF_ALLOW_LARGE_CONTENT) assert.equal(r.result.content,'broker integration proof');
  assert.equal(r.result.broker_catalog_preflight_v1.pricing_zero,true);
}else{
  assert.ok(['UNCERTAIN_OR_TERMINAL','ADMISSION_HOLD','PROVIDER_HOLD','INTERNAL_HOLD'].includes(r.hold_code));
}
console.log('VOID_BROKER_RESPONSE_JSON='+JSON.stringify(r));
console.log('VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN');"""

tmp=Path(tempfile.mkdtemp(prefix="void-broker-ci-"));listener=server=None
secret="sk-broker-ci-proof-secret-123456789"
admission_key=bytes([0x42])*32

def write_request(value):
    (tmp/"request.mjs").write_text("export const req="+json.dumps(value,separators=(",",":"),ensure_ascii=False)+";\n")

def spawn_server(fd,state,creds,marker,mock,content_bytes=0):
    def setup():os.dup2(fd,3);os.set_inheritable(3,True);limits()
    p=subprocess.Popen(["/bin/bash","-lc","export LISTEN_PID=$$; exec node --import "+str(mock)+" "+str(S/"apollyon_openrouter_broker_service_main_v1.mjs")],
        cwd=ROOT,env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","LISTEN_FDS":"1","STATE_DIRECTORY":str(state),
        "CREDENTIALS_DIRECTORY":str(creds),"VOID_PROOF_FETCH_MARKER":str(marker),"VOID_PROOF_EXPECTED_SECRET":secret,"VOID_PROOF_CONTENT_BYTES":str(content_bytes),"NODE_OPTIONS":"--max-old-space-size=1024"},
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,pass_fds=(fd,),preexec_fn=setup)
    ready,prefix=wait_ready(p)
    if not ready:raise SystemExit("HOLD broker not ready\n"+prefix)
    return p

def stop_server(p):
    if p and p.poll() is None:
        p.send_signal(signal.SIGTERM)
        try:p.wait(timeout=5)
        except subprocess.TimeoutExpired:p.kill();p.wait(timeout=5)

def run_client(sock,expected,mode="exact",allow_large=False):
    cp=subprocess.run(["node",str(tmp/"client.mjs")],cwd=tmp,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=60,
        env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","VOID_PROOF_SOCKET":str(sock),
             "VOID_PROOF_EXPECT_STATUS":expected,"VOID_PROOF_REQUEST_MODE":mode,"VOID_PROOF_ALLOW_LARGE_CONTENT":"1" if allow_large else "",
             "NODE_OPTIONS":"--max-old-space-size=1024"},preexec_fn=limits)
    if cp.returncode!=0 or "VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN" not in (cp.stdout or ""):raise SystemExit(cp.stdout)
    line=next((x for x in cp.stdout.splitlines() if x.startswith("VOID_BROKER_RESPONSE_JSON=")),None)
    if line is None:raise SystemExit("HOLD client response JSON missing")
    return json.loads(line.split("=",1)[1])

def sign_request(creds,mismatch_replay=False):
    signer_text=SIGNER.replace("__BINDING_URI__",(S/"apollyon_openrouter_broker_binding_v1.mjs").as_uri()).replace(
        "__CAPABILITY_URI__",(S/"apollyon_openrouter_broker_admission_capability_v1.mjs").as_uri())
    (tmp/"signer.mjs").write_text(signer_text)
    cp=subprocess.run(["node",str(tmp/"signer.mjs")],cwd=tmp,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=30,
        env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","CREDENTIALS_DIRECTORY":str(creds),
             "VOID_PROOF_MISMATCH_REPLAY":"1" if mismatch_replay else "",
             "NODE_OPTIONS":"--max-old-space-size=1024"},preexec_fn=limits)
    if cp.returncode!=0 or "VOID_PROOF_SIGNED_REQUEST_JSON=" not in (cp.stdout or ""):raise SystemExit(cp.stdout)
    line=next(x for x in cp.stdout.splitlines() if x.startswith("VOID_PROOF_SIGNED_REQUEST_JSON="))
    return json.loads(line.split("=",1)[1])


def assert_socket_closes(sock_path,payload,timeout=7):
    s=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);s.settimeout(timeout)
    try:
        s.connect(str(sock_path))
        try:
            if payload:s.sendall(payload)
        except (BrokenPipeError,ConnectionResetError):
            pass
        try:
            data=s.recv(1)
            if data not in (b"",):raise SystemExit("HOLD partial IPC client received unexpected data")
        except (ConnectionResetError,BrokenPipeError):
            pass
        except socket.timeout:
            raise SystemExit("HOLD partial IPC client exceeded reviewed acquisition lifetime")
    finally:s.close()

def assert_many_partial_close(sock_path,count=12,timeout=7):
    clients=[]
    try:
        for _ in range(count):
            s=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);s.settimeout(0.25);s.connect(str(sock_path))
            try:s.sendall(b"{")
            except (BrokenPipeError,ConnectionResetError):pass
            clients.append(s)
        deadline=time.monotonic()+timeout;pending=set(range(len(clients)))
        while pending and time.monotonic()<deadline:
            for i in list(pending):
                try:
                    b=clients[i].recv(1)
                    if b==b"":pending.remove(i)
                except (ConnectionResetError,BrokenPipeError):
                    pending.remove(i)
                except socket.timeout:
                    pass
            time.sleep(0.05)
        if pending:raise SystemExit(f"HOLD incomplete IPC clients exceeded lifetime count={len(pending)}")
    finally:
        for s in clients:
            try:s.close()
            except:pass

try:
    state=tmp/"state";live_state=tmp/"state-live";large_ok_state=tmp/"state-large-ok";oversize_state=tmp/"state-oversize";broker_creds=tmp/"broker-creds";signer_creds=tmp/"signer-creds";run_dir=tmp/"run"
    for d in [state,live_state,large_ok_state,oversize_state,broker_creds,signer_creds,run_dir]:d.mkdir(mode=0o700)
    (tmp/"scripts").mkdir(mode=0o700)
    shutil.copy2(S/"apollyon_openrouter_broker_client_v1.mjs",tmp/"scripts"/"apollyon_openrouter_broker_client_v1.mjs")
    shutil.copy2(S/"apollyon_openrouter_broker_ipc_protocol_v1.mjs",tmp/"scripts"/"apollyon_openrouter_broker_ipc_protocol_v1.mjs")
    (broker_creds/"openrouter_api_key").write_text(secret+"\n");os.chmod(broker_creds/"openrouter_api_key",0o600)
    for d in [broker_creds,signer_creds]:
        (d/"apollyon_openrouter_admission_mac_v1").write_bytes(admission_key)
        os.chmod(d/"apollyon_openrouter_admission_mac_v1",0o600)
    if (signer_creds/"openrouter_api_key").exists():raise SystemExit("HOLD signer credential set unexpectedly contains provider key")

    marker=tmp/"calls.txt";marker.write_text("")
    mock=tmp/"mock.mjs";mock.write_text(MOCK)
    registry=json.loads((ROOT/"public"/"apollyon-openrouter-contestants-v1.json").read_text())
    registry_sha=hashlib.sha256(json.dumps(registry,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode("utf-8")).hexdigest()
    reviewed=[x for x in registry.get("contestants",[]) if x.get("model")=="stealth/ox-alpha"]
    if len(reviewed)!=1 or reviewed[0].get("status")!="qualified":raise SystemExit("HOLD reviewed stealth/ox-alpha registry entry invalid")
    contestant=reviewed[0]
    base={
        "marker":"VOID_APOLLYON_OPENROUTER_BROKER_REQUEST_V1","version":1,
        "request_id":"voidobr1_"+("1"*64),"logical_operation_intent_digest":"2"*64,
        "registry_sha256":registry_sha,
        "request_body":{"model":"stealth/ox-alpha","messages":[{"role":"system","content":"public"},{"role":"user","content":"public"}],
            "max_tokens":4096,"stream":False,"provider":{"allow_fallbacks":False,"require_parameters":True,"max_price":{"prompt":0,"completion":0},"zdr":False}},
        "contestant":contestant,"admission_capability":None,"replay_capability":None,"timeout_ms":120000,
    }
    write_request(base)
    (tmp/"drop-client.mjs").write_text(DROP_CLIENT);(tmp/"client.mjs").write_text(CLIENT)

    sock=run_dir/"broker.sock";listener=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);listener.bind(str(sock));listener.listen(16);listener.set_inheritable(True);fd=listener.fileno()

    server=spawn_server(fd,live_state,broker_creds,marker,mock)
    assert_socket_closes(sock,b'{"marker":')
    assert_socket_closes(sock,b'x'*((4*1024*1024)-1))
    assert_many_partial_close(sock,12)
    if marker.read_text().strip():raise SystemExit("HOLD partial IPC lifetime probes touched provider network")
    run_client(sock,"HOLD","bad_registry")
    run_client(sock,"HOLD","unreviewed_contestant")
    run_client(sock,"HOLD")
    if marker.read_text().strip():raise SystemExit("HOLD unauthorized fresh request touched provider network")
    if list((live_state/"ledger-v1").glob("apollyon-op-v1-*")):raise SystemExit("HOLD unauthorized fresh request created operation namespace")
    if (live_state/"broker-admission-authority-v1").exists():raise SystemExit("HOLD legacy shared admission directory was created")

    signed=sign_request(signer_creds)
    mismatched_pair=sign_request(signer_creds,mismatch_replay=True)
    write_request(mismatched_pair)
    mismatched_hold=run_client(sock,"HOLD")
    if mismatched_hold.get("hold_code")!="ADMISSION_HOLD":raise SystemExit("HOLD mismatched valid capability pair did not admission-HOLD")
    if marker.read_text().strip():raise SystemExit("HOLD mismatched valid capability pair touched provider network")
    if list((live_state/"ledger-v1").glob("apollyon-op-v1-*")):raise SystemExit("HOLD mismatched valid capability pair created namespace")
    replay_only=copy.deepcopy(signed);replay_only["admission_capability"]=None
    write_request(replay_only);run_client(sock,"HOLD")
    if marker.read_text().strip():raise SystemExit("HOLD replay-only capability authorized fresh provider work")
    if list((live_state/"ledger-v1").glob("apollyon-op-v1-*")):raise SystemExit("HOLD replay-only capability created fresh namespace")
    forged=copy.deepcopy(signed);forged["admission_capability"]["authority_mac_sha256"]="0"*64
    write_request(forged)
    run_client(sock,"HOLD")
    if marker.read_text().strip():raise SystemExit("HOLD forged inline capability touched provider network")
    if list((live_state/"ledger-v1").glob("apollyon-op-v1-*")):raise SystemExit("HOLD forged inline capability created operation namespace")

    write_request(signed)
    live=run_client(sock,"ACCEPTED")
    live_calls=marker.read_text().strip().splitlines()
    if live_calls!=["catalog","chat"]:raise SystemExit(f"HOLD live first-delivery order {live_calls}")
    live_cap=signed["admission_capability"]["capability_id"];live_replay=signed["replay_capability"]["capability_id"]
    if live["result"]["broker_admission_capability_id"]!=live_cap:raise SystemExit("HOLD live broker capability id mismatch")
    if live["result"]["broker_replay_capability_id"]!=live_replay:raise SystemExit("HOLD live broker replay capability id mismatch")
    replay_only=copy.deepcopy(signed);replay_only["admission_capability"]=None;write_request(replay_only)
    replay_live=run_client(sock,"ACCEPTED")
    if replay_live["result_digest"]!=live["result_digest"]:raise SystemExit("HOLD replay-only read changed accepted digest")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD replay-only ACCEPTED touched provider network")
    forged_replay=copy.deepcopy(replay_only);forged_replay["replay_capability"]["authority_mac_sha256"]="0"*64;write_request(forged_replay)
    forged_read=run_client(sock,"HOLD")
    if forged_read.get("result") is not None:raise SystemExit("HOLD forged replay capability disclosed accepted result")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD forged replay touched provider network")
    write_request(signed);run_client(sock,"HOLD","changed_prompt")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD changed work triggered provider network")
    live_capsules=list((live_state/"accepted-results-v1").glob("accepted-result-v1-*.json"))
    live_results=list((live_state/"ledger-v1").glob("apollyon-op-v1-*/record-0000000000000003.json"))
    if len(live_capsules)!=1 or len(live_results)!=1:raise SystemExit("HOLD live first-delivery durable evidence missing")
    live_capsule=json.loads(live_capsules[0].read_text())
    if live_capsule.get("result_digest")!=live.get("result_digest") or live_capsule.get("result")!=live.get("result"):raise SystemExit("HOLD live capsule differs")
    stop_server(server);server=None;marker.write_text("")

    write_request(base)
    server=spawn_server(fd,state,broker_creds,marker,mock)
    run_client(sock,"HOLD")
    if marker.read_text().strip():raise SystemExit("HOLD response-loss missing capability touched provider network")
    if list((state/"ledger-v1").glob("apollyon-op-v1-*")):raise SystemExit("HOLD response-loss unauthorized request created namespace")
    state_signed=sign_request(signer_creds);state_cap=state_signed["admission_capability"]["capability_id"];write_request(state_signed)

    drop=subprocess.run(["node",str(tmp/"drop-client.mjs")],cwd=tmp,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=20,
        env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","VOID_PROOF_SOCKET":str(sock),"NODE_OPTIONS":"--max-old-space-size=1024"},preexec_fn=limits)
    if drop.returncode!=0 or "VOID_BROKER_DROP_CLIENT_SENT" not in (drop.stdout or ""):raise SystemExit(drop.stdout)
    capsule_path=wait_for_accept_commit(state)
    stop_server(server);server=None
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD response-loss first execution order")

    write_request(base)
    server=spawn_server(fd,state,broker_creds,marker,mock)
    denied_replay=run_client(sock,"HOLD")
    if denied_replay.get("result") is not None:raise SystemExit("HOLD uncredentialed ACCEPTED replay disclosed result")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD denied ACCEPTED replay touched provider network")
    replay_only=copy.deepcopy(state_signed);replay_only["admission_capability"]=None;write_request(replay_only)
    replay=run_client(sock,"ACCEPTED")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD authorized ACCEPTED replay touched provider network")
    if replay["result"]["broker_admission_capability_id"]!=state_cap:raise SystemExit("HOLD replay capability id mismatch")
    if (state/"broker-admission-authority-v1").exists():raise SystemExit("HOLD legacy shared admission directory exists")

    capsule_bytes=capsule_path.read_bytes();capsule=json.loads(capsule_bytes.decode("utf-8"))
    capsule_hex=capsule_path.name.removeprefix("accepted-result-v1-").removesuffix(".json")
    stage_path=capsule_path.with_name(f".accepted-result-stage-v1-{capsule_hex}.json")
    final_stat=os.stat(capsule_path);stage_stat=os.stat(stage_path)
    if final_stat.st_dev!=stage_stat.st_dev or final_stat.st_ino!=stage_stat.st_ino or final_stat.st_nlink!=2:
        raise SystemExit("HOLD retained accepted-result stage/final alias topology missing")

    capsule_path.unlink()
    write_request(replay_only)
    missing=run_client(sock,"HOLD")
    if missing.get("result") is not None or missing.get("result_digest") is not None:raise SystemExit("HOLD missing capsule leaked result")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD missing capsule triggered provider network")
    os.link(stage_path,capsule_path);os.chmod(capsule_path,0o600)
    restored_final=os.stat(capsule_path);restored_stage=os.stat(stage_path)
    if restored_final.st_dev!=restored_stage.st_dev or restored_final.st_ino!=restored_stage.st_ino or restored_final.st_nlink!=2:
        raise SystemExit("HOLD retained accepted-result alias restore changed generation")

    capsule_obj=json.loads(capsule_bytes.decode("utf-8"));capsule_path.write_text(json.dumps(capsule_obj,indent=2)+"\n");os.chmod(capsule_path,0o600)
    noncanonical=run_client(sock,"HOLD")
    if noncanonical.get("result") is not None or marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD noncanonical capsule failure")
    capsule_path.write_bytes(capsule_bytes);os.chmod(capsule_path,0o600)

    backup=capsule_path.with_name(capsule_path.name+".proof-backup");capsule_path.rename(backup);os.symlink(backup.name,capsule_path)
    symlinked=run_client(sock,"HOLD")
    if symlinked.get("result") is not None or marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD symlink capsule failure")
    capsule_path.unlink();backup.rename(capsule_path)

    if capsule.get("marker")!="VOID_APOLLYON_ACCEPTED_RESULT_CAPSULE_V1" or capsule.get("result_digest")!=replay.get("result_digest") or capsule.get("result")!=replay.get("result"):raise SystemExit("HOLD replay/capsule binding")
    capsule["result_digest"]="f"*64;capsule_path.write_text(json.dumps(capsule,separators=(",",":"))+"\n");os.chmod(capsule_path,0o600)
    held=run_client(sock,"HOLD")
    if held.get("result") is not None or marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD tampered capsule failure")

    capsule_path.write_bytes(capsule_bytes);os.chmod(capsule_path,0o600);stop_server(server);server=None
    record3=list((state/"ledger-v1").glob("apollyon-op-v1-*/record-0000000000000003.json"))
    if len(record3)!=1:raise SystemExit("HOLD exact ACCEPTED record missing")
    record3[0].unlink()
    write_request(state_signed)
    server=spawn_server(fd,state,broker_creds,marker,mock)
    recovered_uncertain=run_client(sock,"ACCEPTED")
    if recovered_uncertain.get("result_digest")!=replay.get("result_digest"):raise SystemExit("HOLD complete UNCERTAIN capsule recovery digest drift")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD complete UNCERTAIN recovery reexecuted provider")
    stop_server(server);server=None
    record3=list((state/"ledger-v1").glob("apollyon-op-v1-*/record-0000000000000003.json"))
    if len(record3)!=1:raise SystemExit("HOLD recovered ACCEPTED record missing")
    record3[0].unlink()
    bad_capsule=json.loads(capsule_bytes.decode("utf-8"));bad_capsule["result_digest"]="e"*64
    capsule_path.write_text(json.dumps(bad_capsule,separators=(",",":"))+"\n");os.chmod(capsule_path,0o600)
    server=spawn_server(fd,state,broker_creds,marker,mock);write_request(state_signed)
    uncertain_bad=run_client(sock,"HOLD")
    if uncertain_bad.get("result") is not None or marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD mismatched UNCERTAIN capsule recovery failure")

    stop_server(server);server=None
    marker.write_text("");write_request(base)
    server=spawn_server(fd,large_ok_state,broker_creds,marker,mock,content_bytes=1_500_000)
    large_signed=sign_request(signer_creds);write_request(large_signed)
    large_ok=run_client(sock,"ACCEPTED",allow_large=True)
    if len(large_ok["result"]["content"])!=1_500_000:raise SystemExit("HOLD bounded large result length drift")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD bounded large result provider order")
    large_replay=copy.deepcopy(large_signed);large_replay["admission_capability"]=None;write_request(large_replay)
    large_ok_replay=run_client(sock,"ACCEPTED",allow_large=True)
    if large_ok_replay["result_digest"]!=large_ok["result_digest"]:raise SystemExit("HOLD bounded large replay digest drift")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD bounded large replay reexecuted")
    stop_server(server);server=None

    marker.write_text("");write_request(base)
    server=spawn_server(fd,oversize_state,broker_creds,marker,mock,content_bytes=2_300_000)
    over_signed=sign_request(signer_creds);write_request(over_signed)
    run_client(sock,"HOLD")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD oversize first attempt order")
    if list((oversize_state/"accepted-results-v1").glob("accepted-result-v1-*.json")):raise SystemExit("HOLD oversize result created accepted capsule")
    run_client(sock,"HOLD")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD oversize retry reexecuted provider")

    print("VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN inline_signed_capability=true replay_read_capability=true replay_capability_zero_send=true dual_capability_provenance_coupled=true mismatched_valid_hmac_pair_hold=true ordinary_client_without_replay_hold=true forged_replay_hold=true shared_admission_directory=false unauthorized_namespace_creation=false accepted_replay_requires_replay_capability=true bad_registry_hold=true unreviewed_contestant_hold=true changed_work_hold=true first_delivery=true response_loss_replay=true missing_capsule_hold=true retained_stage_alias=true retained_alias_restore_same_generation=true noncanonical_capsule_hold=true symlink_capsule_hold=true tamper_hold=true uncertain_complete_capsule_recovery=true uncertain_mismatch_hold=true partial_ipc_lifetime_bounded=true incomplete_clients_bounded=true accepted_result_capacity_domain=true oversize_no_resend=true fetch_order=catalog,chat")
finally:
    stop_server(server)
    if listener:
        try:listener.close()
        except:pass
    shutil.rmtree(tmp,ignore_errors=True)
