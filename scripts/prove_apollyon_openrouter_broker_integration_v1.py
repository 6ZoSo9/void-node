#!/usr/bin/env python3
from __future__ import annotations
import os, resource, select, shutil, signal, socket, subprocess, tempfile, time
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

MOCK=r"""import { appendFile } from 'node:fs/promises';
const marker=process.env.VOID_PROOF_FETCH_MARKER,secret=process.env.VOID_PROOF_EXPECTED_SECRET;
function resp(url,v){const b=Buffer.from(JSON.stringify(v));let sent=false;return{url,status:200,headers:{get:n=>String(n).toLowerCase()==='content-length'?String(b.length):null},body:{getReader(){return{async read(){if(sent)return{done:true};sent=true;return{done:false,value:new Uint8Array(b)}},async cancel(){}}}}}}
globalThis.fetch=async(url,o={})=>{if(o?.headers?.authorization!==`Bearer ${secret}`)throw new Error('wrong credential');const m=String(o.method??'GET').toUpperCase();
if(url==='https://openrouter.ai/api/v1/models'&&m==='GET'){await appendFile(marker,'catalog\n');return resp(url,{data:[{id:'stealth/ox-alpha',canonical_slug:'stealth/ox-alpha',context_length:1048576,pricing:{prompt:'0',completion:'0',image:'0'}}]})}
if(url==='https://openrouter.ai/api/v1/chat/completions'&&m==='POST'){await appendFile(marker,'chat\n');const body=JSON.parse(o.body);return resp(url,{id:'proof',model:body.model,choices:[{finish_reason:'stop',message:{content:'broker integration proof'}}],usage:{},openrouter_metadata:{requested:body.model,endpoints:{available:[{selected:true,model:body.model,provider:'Stealth'}]}}})}
throw new Error(`unexpected ${m} ${url}`)};"""

CLIENT=r"""import assert from 'node:assert/strict';
import { runBrokerClientV1 } from './scripts/apollyon_openrouter_broker_client_v1.mjs';
const req={marker:'VOID_APOLLYON_OPENROUTER_BROKER_REQUEST_V1',version:1,request_id:`voidobr1_${'1'.repeat(64)}`,logical_operation_intent_digest:'2'.repeat(64),registry_sha256:'3'.repeat(64),
request_body:{model:'stealth/ox-alpha',messages:[{role:'system',content:'public'},{role:'user',content:'public'}],max_tokens:4096,stream:false,provider:{allow_fallbacks:false,require_parameters:true,max_price:{prompt:0,completion:0},zdr:false}},
contestant:{model:'stealth/ox-alpha',canonical_slug:'stealth/ox-alpha',status:'qualified',scored_trial_eligible:false,zero_price_required:true,min_context_length:1048576,max_tokens_cap:32768,retention_class:'retained',privacy_class:'retained_public_only',provider_policy:{allow_fallbacks:false,require_parameters:true,data_collection:null,zdr:false,only:[]}},timeout_ms:120000};
for(const k of ['OPENROUTER_API_KEY','CREDENTIALS_DIRECTORY','STATE_DIRECTORY'])assert.equal(process.env[k],undefined);
const r=await runBrokerClientV1(process.env.VOID_PROOF_SOCKET,req);assert.equal(r.status,'ACCEPTED');assert.match(r.operation_id,/^apollyon_op_v1:[0-9a-f]{64}$/);assert.match(r.result_digest,/^[0-9a-f]{64}$/);assert.equal(r.result.broker_catalog_preflight_v1.pricing_zero,true);
const r2=await runBrokerClientV1(process.env.VOID_PROOF_SOCKET,req);assert.equal(r2.status,'HOLD');assert.equal(r2.hold_code,'UNCERTAIN_OR_TERMINAL');
console.log('VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN');"""

tmp=Path(tempfile.mkdtemp(prefix="void-broker-ci-"));listener=server=None
secret="sk-broker-ci-proof-secret-123456789"
try:
    (tmp/"state").mkdir(mode=0o700);(tmp/"creds").mkdir(mode=0o700);(tmp/"run").mkdir(mode=0o700)
    # The synthetic client imports ./scripts/... relative to its own temporary
    # location. Stage the exact candidate client and its local IPC dependency
    # into that throwaway namespace; do not change candidate source.
    (tmp/"scripts").mkdir(mode=0o700)
    shutil.copy2(
        S/"apollyon_openrouter_broker_client_v1.mjs",
        tmp/"scripts"/"apollyon_openrouter_broker_client_v1.mjs",
    )
    shutil.copy2(
        S/"apollyon_openrouter_broker_ipc_protocol_v1.mjs",
        tmp/"scripts"/"apollyon_openrouter_broker_ipc_protocol_v1.mjs",
    )
    (tmp/"creds"/"openrouter_api_key").write_text(secret+"\n");os.chmod(tmp/"creds"/"openrouter_api_key",0o600)
    marker=tmp/"calls.txt";marker.write_text("");mock=tmp/"mock.mjs";mock.write_text(MOCK);client=tmp/"client.mjs";client.write_text(CLIENT)
    sock=tmp/"run"/"broker.sock";listener=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);listener.bind(str(sock));listener.listen(16);listener.set_inheritable(True);fd=listener.fileno()
    def setup():os.dup2(fd,3);os.set_inheritable(3,True);limits()
    server=subprocess.Popen(["/bin/bash","-lc","export LISTEN_PID=$$; exec node --import "+str(mock)+" "+str(S/"apollyon_openrouter_broker_service_main_v1.mjs")],
        cwd=ROOT,env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","LISTEN_FDS":"1","STATE_DIRECTORY":str(tmp/"state"),
        "CREDENTIALS_DIRECTORY":str(tmp/"creds"),"VOID_PROOF_FETCH_MARKER":str(marker),"VOID_PROOF_EXPECTED_SECRET":secret,"NODE_OPTIONS":"--max-old-space-size=1024"},
        stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,pass_fds=(fd,),preexec_fn=setup)
    ready,prefix=wait_ready(server)
    if not ready:raise SystemExit("HOLD broker not ready\n"+prefix)
    cp=subprocess.run(["node",str(client)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=60,
        env={"PATH":os.environ.get("PATH",""),"HOME":str(Path.home()),"LANG":"C.UTF-8","LC_ALL":"C.UTF-8","VOID_PROOF_SOCKET":str(sock),"NODE_OPTIONS":"--max-old-space-size=1024"},preexec_fn=limits)
    if cp.returncode!=0 or "VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN" not in (cp.stdout or ""):raise SystemExit(cp.stdout)
    calls=marker.read_text().strip().splitlines()
    if calls!=["catalog","chat"]:raise SystemExit(f"HOLD fetch order {calls}")
    print("VOID_OPENROUTER_BROKER_INTEGRATION_V1_PROOF_GREEN fetch_order=catalog,chat")
finally:
    if server and server.poll() is None:
        server.send_signal(signal.SIGTERM)
        try:server.wait(timeout=5)
        except subprocess.TimeoutExpired:server.kill();server.wait(timeout=5)
    if listener:
        try:listener.close()
        except:pass
    shutil.rmtree(tmp,ignore_errors=True)
