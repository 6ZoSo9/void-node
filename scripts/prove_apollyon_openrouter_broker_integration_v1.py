#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, resource, select, shutil, signal, socket, subprocess, tempfile, time
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
if(url==='https://openrouter.ai/api/v1/chat/completions'&&m==='POST'){await appendFile(marker,'chat\n');const body=JSON.parse(o.body);return resp(url,{id:'proof',model:body.model,choices:[{finish_reason:'stop',message:{content:'broker integration proof'}}],usage:{prompt_tokens:7,completion_tokens:3},openrouter_metadata:{requested:body.model,endpoints:{available:[{selected:true,model:body.model,provider:'Stealth'}]}}})}
throw new Error(`unexpected ${m} ${url}`)};"""

REQUEST=r"""export const req={marker:'VOID_APOLLYON_OPENROUTER_BROKER_REQUEST_V1',version:1,request_id:`voidobr1_${'1'.repeat(64)}`,logical_operation_intent_digest:'2'.repeat(64),registry_sha256:'__REGISTRY_SHA__',
request_body:{model:'stealth/ox-alpha',messages:[{role:'system',content:'public'},{role:'user',content:'public'}],max_tokens:4096,stream:false,provider:{allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0},zdr:false}},
contestant:{model:'stealth/ox-alpha',canonical_slug:'stealth/ox-alpha',status:'qualified',scored_trial_eligible:false,zero_price_required:true,min_context_length:1048576,max_tokens_cap:32768,retention_class:'retained',privacy_class:'retained_public_only',provider_policy:{allow_fallbacks:false,require_parameters:true,data_collection:null,zdr:false,only:[]}},timeout_ms:120000};"""

ISSUER=r"""import { buildOpenRouterBrokerBindingV1 } from '__BINDING_URI__';
import { publishBrokerAdmissionCapabilityV1 } from '__CAPABILITY_URI__';
import { openPinnedLedgerDirectoryV1 } from '__PUBLISH_URI__';
import { req } from './request.mjs';
const root=await openPinnedLedgerDirectoryV1(process.env.VOID_PROOF_ADMISSION_ROOT);
try{
  const binding=buildOpenRouterBrokerBindingV1({logicalOperationIntentDigest:req.logical_operation_intent_digest,registrySha256:req.registry_sha256,requestBody:req.request_body,contestant:req.contestant});
  const cap=await publishBrokerAdmissionCapabilityV1(root,{binding,model:req.contestant.model,canonicalSlug:req.contestant.canonical_slug,trialId:`voidat1_${'a'.repeat(64)}`,admissionId:`voidaa1_${'b'.repeat(64)}`,admissionReceiptSha256:'c'.repeat(64),promptSha256:'d'.repeat(64)});
  console.log('VOID_PROOF_CAPABILITY_ID='+cap.capabilityId);
}finally{await root.handle.close().catch(()=>{})}"""

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
assert.equal(r.status,expected);
if(expected==='ACCEPTED'){
  assert.match(r.operation_id,/^apollyon_op_v1:[0-9a-f]{64}$/);
  assert.match(r.result_digest,/^[0-9a-f]{64}$/);
  assert.match(r.result.broker_admission_capability_id,/^voidobac1_[0-9a-f]{64}$/);
  assert.equal(r.result.content,'broker integration proof');
  assert.equal(r.result.broker_catalog_preflight_v1.pricing_zero,true);
}else{
  assert.ok(['UNCERTAIN_OR_TERMINAL','ADMISSION_HOLD'].includes(r.hold_code));
}
console.log('VOID_BROKER_RESPONSE_JSON='+JSON.stringify(r));
console.log('VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN');"""

tmp=Path(tempfile.mkdtemp(prefix="void-broker-ci-"));listener=server=None
secret="sk-broker-ci-proof-secret-123456789"

def spawn_server(fd,state,creds,marker,mock):
    def setup():os.dup2(fd,3);os.set_inheritable(3,True);limits()
    p=subprocess.Popen(["/bin/bash","-lc","export LISTEN_PID=$$; exec node --import "+str(mock)+" "+str(S/"apollyon_openrouter_broker_service_main_v1.mjs")],
        cwd=ROOT,env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","LISTEN_FDS":"1","STATE_DIRECTORY":str(state),
        "CREDENTIALS_DIRECTORY":str(creds),"VOID_PROOF_FETCH_MARKER":str(marker),"VOID_PROOF_EXPECTED_SECRET":secret,"NODE_OPTIONS":"--max-old-space-size=1024"},
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,pass_fds=(fd,),preexec_fn=setup)
    ready,prefix=wait_ready(p)
    if not ready:raise SystemExit("HOLD broker not ready\n"+prefix)
    return p

def stop_server(p):
    if p and p.poll() is None:
        p.send_signal(signal.SIGTERM)
        try:p.wait(timeout=5)
        except subprocess.TimeoutExpired:p.kill();p.wait(timeout=5)

def run_client(sock,expected,mode="exact"):
    cp=subprocess.run(["node",str(tmp/"client.mjs")],cwd=tmp,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=60,
        env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","VOID_PROOF_SOCKET":str(sock),
             "VOID_PROOF_EXPECT_STATUS":expected,"VOID_PROOF_REQUEST_MODE":mode,"NODE_OPTIONS":"--max-old-space-size=1024"},preexec_fn=limits)
    if cp.returncode!=0 or "VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN" not in (cp.stdout or ""):raise SystemExit(cp.stdout)
    line=next((x for x in cp.stdout.splitlines() if x.startswith("VOID_BROKER_RESPONSE_JSON=")),None)
    if line is None:raise SystemExit("HOLD client response JSON missing")
    return json.loads(line.split("=",1)[1])

def issue_capability(state_dir):
    admission=state_dir/"broker-admission-authority-v1"
    issuer_text=ISSUER.replace("__BINDING_URI__",(S/"apollyon_openrouter_broker_binding_v1.mjs").as_uri()).replace(
        "__CAPABILITY_URI__",(S/"apollyon_openrouter_broker_admission_capability_v1.mjs").as_uri()).replace(
        "__PUBLISH_URI__",(S/"apollyon_execution_ledger_publish_v1.mjs").as_uri())
    (tmp/"issuer.mjs").write_text(issuer_text)
    cp=subprocess.run(["node",str(tmp/"issuer.mjs")],cwd=tmp,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=30,
        env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","VOID_PROOF_ADMISSION_ROOT":str(admission),"NODE_OPTIONS":"--max-old-space-size=1024"},preexec_fn=limits)
    if cp.returncode!=0 or "VOID_PROOF_CAPABILITY_ID=" not in (cp.stdout or ""):raise SystemExit(cp.stdout)
    return next(x.split("=",1)[1] for x in cp.stdout.splitlines() if x.startswith("VOID_PROOF_CAPABILITY_ID="))

try:
    state=tmp/"state";live_state=tmp/"state-live";creds=tmp/"creds";run_dir=tmp/"run"
    state.mkdir(mode=0o700);live_state.mkdir(mode=0o700);creds.mkdir(mode=0o700);run_dir.mkdir(mode=0o700)
    (tmp/"scripts").mkdir(mode=0o700)
    shutil.copy2(S/"apollyon_openrouter_broker_client_v1.mjs",tmp/"scripts"/"apollyon_openrouter_broker_client_v1.mjs")
    shutil.copy2(S/"apollyon_openrouter_broker_ipc_protocol_v1.mjs",tmp/"scripts"/"apollyon_openrouter_broker_ipc_protocol_v1.mjs")
    (creds/"openrouter_api_key").write_text(secret+"\n");os.chmod(creds/"openrouter_api_key",0o600)
    marker=tmp/"calls.txt";marker.write_text("")
    mock=tmp/"mock.mjs";mock.write_text(MOCK)
    registry=json.loads((ROOT/"public"/"apollyon-openrouter-contestants-v1.json").read_text())
    registry_sha=hashlib.sha256(json.dumps(registry,sort_keys=True,separators=(",",":"),ensure_ascii=False).encode("utf-8")).hexdigest()
    reviewed_contestants=[entry for entry in registry.get("contestants",[]) if entry.get("model")=="stealth/ox-alpha"]
    if len(reviewed_contestants)!=1:raise SystemExit("HOLD reviewed stealth/ox-alpha registry entry is not unique")
    reviewed_contestant=reviewed_contestants[0]
    if reviewed_contestant.get("status")!="qualified":raise SystemExit("HOLD reviewed stealth/ox-alpha is not qualified")
    request_value={
        "marker":"VOID_APOLLYON_OPENROUTER_BROKER_REQUEST_V1",
        "version":1,
        "request_id":"voidobr1_"+("1"*64),
        "logical_operation_intent_digest":"2"*64,
        "registry_sha256":registry_sha,
        "request_body":{
            "model":"stealth/ox-alpha",
            "messages":[
                {"role":"system","content":"public"},
                {"role":"user","content":"public"},
            ],
            "max_tokens":4096,
            "stream":False,
            "provider":{
                "allow_fallbacks":False,
                "require_parameters":True,
                "max_price":{"prompt":0,"completion":0},
                "zdr":False,
            },
        },
        "contestant":reviewed_contestant,
        "timeout_ms":120000,
    }
    (tmp/"request.mjs").write_text(
        "export const req="+json.dumps(request_value,separators=(",",":"),ensure_ascii=False)+";\n"
    )
    (tmp/"drop-client.mjs").write_text(DROP_CLIENT)
    (tmp/"client.mjs").write_text(CLIENT)

    sock=run_dir/"broker.sock";listener=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);listener.bind(str(sock));listener.listen(16);listener.set_inheritable(True);fd=listener.fileno()

    server=spawn_server(fd,live_state,creds,marker,mock)
    run_client(sock,"HOLD","bad_registry")
    if marker.read_text().strip():raise SystemExit("HOLD bad registry touched provider network")
    run_client(sock,"HOLD","unreviewed_contestant")
    if marker.read_text().strip():raise SystemExit("HOLD unreviewed contestant touched provider network")
    run_client(sock,"HOLD")
    if marker.read_text().strip():raise SystemExit("HOLD missing admission capability touched provider network")
    if list((live_state/"ledger-v1").glob("apollyon-op-v1-*")):
        raise SystemExit("HOLD unauthorized fresh request created operation namespace")
    live_cap=issue_capability(live_state)
    live=run_client(sock,"ACCEPTED")
    live_calls=marker.read_text().strip().splitlines()
    if live_calls!=["catalog","chat"]:raise SystemExit(f"HOLD live first-delivery order {live_calls}")
    if live["result"]["broker_admission_capability_id"]!=live_cap:raise SystemExit("HOLD live broker capability id mismatch")
    run_client(sock,"HOLD","changed_prompt")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD changed work triggered provider network")
    live_capsules=list((live_state/"accepted-results-v1").glob("accepted-result-v1-*.json"))
    live_results=list((live_state/"ledger-v1").glob("apollyon-op-v1-*/record-0000000000000003.json"))
    if len(live_capsules)!=1 or len(live_results)!=1:raise SystemExit("HOLD live first-delivery durable evidence missing")
    live_capsule=json.loads(live_capsules[0].read_text())
    if live_capsule.get("result_digest")!=live.get("result_digest"):raise SystemExit("HOLD live result digest differs from capsule")
    if live_capsule.get("result")!=live.get("result"):raise SystemExit("HOLD live result differs from capsule")
    stop_server(server);server=None
    marker.write_text("")

    server=spawn_server(fd,state,creds,marker,mock)
    run_client(sock,"HOLD")
    if marker.read_text().strip():raise SystemExit("HOLD response-loss state missing capability touched provider network")
    if list((state/"ledger-v1").glob("apollyon-op-v1-*")):
        raise SystemExit("HOLD response-loss unauthorized request created operation namespace")
    state_cap=issue_capability(state)

    drop=subprocess.run(["node",str(tmp/"drop-client.mjs")],cwd=tmp,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=20,
        env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","VOID_PROOF_SOCKET":str(sock),"NODE_OPTIONS":"--max-old-space-size=1024"},preexec_fn=limits)
    if drop.returncode!=0 or "VOID_BROKER_DROP_CLIENT_SENT" not in (drop.stdout or ""):raise SystemExit(drop.stdout)
    capsule_path=wait_for_accept_commit(state)
    stop_server(server);server=None
    calls=marker.read_text().strip().splitlines()
    if calls!=["catalog","chat"]:raise SystemExit(f"HOLD first execution order {calls}")

    server=spawn_server(fd,state,creds,marker,mock)
    admission_caps=list((state/"broker-admission-authority-v1").glob("broker-admission-v1-*.json"))
    if len(admission_caps)!=1:raise SystemExit("HOLD expected one durable admission capability before terminal replay")
    admission_caps[0].unlink()
    replay=run_client(sock,"ACCEPTED")
    calls=marker.read_text().strip().splitlines()
    if calls!=["catalog","chat"]:raise SystemExit(f"HOLD ACCEPTED replay touched provider network {calls}")
    if replay["result"]["broker_admission_capability_id"]!=state_cap:raise SystemExit("HOLD replay broker capability id mismatch")

    capsule_bytes=capsule_path.read_bytes()
    capsule=json.loads(capsule_bytes.decode("utf-8"))

    capsule_path.unlink()
    missing=run_client(sock,"HOLD")
    if missing.get("result") is not None or missing.get("result_digest") is not None:raise SystemExit("HOLD missing capsule leaked ACCEPTED result")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD missing capsule triggered provider network")
    capsule_path.write_bytes(capsule_bytes);os.chmod(capsule_path,0o600)

    capsule_obj=json.loads(capsule_bytes.decode("utf-8"))
    capsule_path.write_text(json.dumps(capsule_obj,indent=2)+"\n");os.chmod(capsule_path,0o600)
    noncanonical=run_client(sock,"HOLD")
    if noncanonical.get("result") is not None or noncanonical.get("result_digest") is not None:raise SystemExit("HOLD noncanonical capsule leaked ACCEPTED result")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD noncanonical capsule triggered provider network")
    capsule_path.write_bytes(capsule_bytes);os.chmod(capsule_path,0o600)

    backup=capsule_path.with_name(capsule_path.name+".proof-backup")
    capsule_path.rename(backup);os.symlink(backup.name,capsule_path)
    symlinked=run_client(sock,"HOLD")
    if symlinked.get("result") is not None or symlinked.get("result_digest") is not None:raise SystemExit("HOLD symlink capsule leaked ACCEPTED result")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD symlink capsule triggered provider network")
    capsule_path.unlink();backup.rename(capsule_path)

    if capsule.get("marker")!="VOID_APOLLYON_ACCEPTED_RESULT_CAPSULE_V1":raise SystemExit("HOLD capsule marker")
    if capsule.get("result_digest")!=replay.get("result_digest"):raise SystemExit("HOLD replay digest differs from durable capsule")
    if capsule.get("result")!=replay.get("result"):raise SystemExit("HOLD replay result differs from durable capsule")
    if (capsule_path.stat().st_mode & 0o777)!=0o600:raise SystemExit("HOLD capsule mode is not 0600")

    capsule["result_digest"]="f"*64
    capsule_path.write_text(json.dumps(capsule,separators=(",",":"))+"\n");os.chmod(capsule_path,0o600)
    held=run_client(sock,"HOLD")
    if held.get("result") is not None or held.get("result_digest") is not None:raise SystemExit("HOLD mismatched capsule leaked ACCEPTED result")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD mismatched capsule triggered provider network")

    capsule_path.write_bytes(capsule_bytes);os.chmod(capsule_path,0o600)
    stop_server(server);server=None
    record3_paths=list((state/"ledger-v1").glob("apollyon-op-v1-*/record-0000000000000003.json"))
    if len(record3_paths)!=1:raise SystemExit("HOLD exact ACCEPTED record3 path missing")
    record3_paths[0].unlink()
    server=spawn_server(fd,state,creds,marker,mock)
    uncertain=run_client(sock,"HOLD")
    if uncertain.get("result") is not None or uncertain.get("result_digest") is not None:raise SystemExit("HOLD UNCERTAIN capsule promoted consumer result")
    if marker.read_text().strip().splitlines()!=["catalog","chat"]:raise SystemExit("HOLD UNCERTAIN capsule triggered provider network")

    print("VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN admission_provenance=true unauthorized_namespace_creation=false accepted_replay_without_admission_capability=true no_cap_hold=true bad_registry_hold=true unreviewed_contestant_hold=true changed_work_hold=true first_delivery=true response_loss_replay=true missing_capsule_hold=true noncanonical_capsule_hold=true symlink_capsule_hold=true tamper_hold=true uncertain_capsule_hold=true fetch_order=catalog,chat")
finally:
    stop_server(server)
    if listener:
        try:listener.close()
        except:pass
    shutil.rmtree(tmp,ignore_errors=True)
