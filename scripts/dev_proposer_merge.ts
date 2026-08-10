/* dev_proposer_merge.ts — v2.6
 * Priority: __void/dev/pick (confirmed POST) -> /tx/dev/pick (GET,POST)
 * Logs statuses; merges picked txs into block.payload.txs and block.txs
 */
import http from "node:http";

function recordScriptsEmptyHandlerVisibilityFailure_scripts_dev_proposer_merge_ts(scope: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn("VOID_SCRIPTS_EMPTY_CATCH_VISIBILITY_PACK_V1_FAILURE_VISIBLE", {
    file: "scripts/dev_proposer_merge.ts",
    scope,
    message,
  });
}

const HTTP_HOST = process.env.HTTP_HOST || "127.0.0.1";
const HTTP_PORT = +(process.env.HTTP_PORT || "4100");
let CAP = Number.isFinite(+process.env.VOID_TX_MERGE_CAP!) ? +process.env.VOID_TX_MERGE_CAP! : 3;

type R = { status:number, body:string, json?:any };
function httpDo(method:"GET"|"POST", path:string, body?:any): Promise<R>{
  return new Promise((resolve)=>{
    const opts:any = {host:HTTP_HOST, port:HTTP_PORT, path, method, headers:{}};
    let payload=""; if (method==="POST") { opts.headers["Content-Type"]="application/json"; payload = body? JSON.stringify(body):""; }
    const req = http.request(opts, (res)=>{
      let buf=""; res.setEncoding("utf8");
      res.on("data",(c)=>buf+=c);
      res.on("end",()=>{ let json:any; try{ json=JSON.parse(buf||"{}"); }catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_dev_proposer_merge_ts("empty-handler-1", err); }; resolve({status:res.statusCode||0, body:buf, json}); });
    });
    req.on("error",()=>resolve({status:-1, body:""}));
    if (method==="POST") req.end(payload); else req.end();
  });
}

let lastProbe=0;
async function tryPickOnce(max:number){
  const probes = [
    {name:"void-pick", path:`/__void/dev/pick?max=${max}&confirm=voidDevPick`},
    {name:"dev-pick",  path:`/tx/dev/pick?max=${max}`},
  ];
  let picked:any[] = []; let from="none"; let statuses:any = {};
  for (const p of probes){
    const g = await httpDo("GET", p.path);  statuses[p.name+"_GET"] = g.status;
    if (Array.isArray(g.json?.picked) && g.json.picked.length){ picked=g.json.picked; from=p.name+"[GET]"; break; }
    const q = await httpDo("POST", p.path, {max}); statuses[p.name+"_POST"]= q.status;
    if (Array.isArray(q.json?.picked) && q.json.picked.length){ picked=q.json.picked; from=p.name+"[POST]"; break; }
  }
  const now=Date.now(); if (now-lastProbe>60000){ lastProbe=now; console.log("[txmerge:v2.6:probe]", statuses); }
  return {from, picked, statuses};
}

function ensure(block:any){ block=block||{}; block.payload=block.payload||{}; block.payload.txs=block.payload.txs||[]; (block as any).txs=(block as any).txs||[]; return block; }

async function merge(block:any){
  const {from, picked, statuses} = await tryPickOnce(CAP);
  block = ensure(block);
  for (const tx of picked){ block.payload.txs.push(tx); (block as any).txs.push(tx); }
  const n = (block && (block.number ?? block.num ?? block.n)) ?? -1;
  console.log("[txmerge:v2.6]", `block=${n} picked=${picked.length} from=${from}`, picked.length? "" : JSON.stringify(statuses));
  return block;
}

async function hook(proto:any, key:string){
  if (!proto || typeof proto[key]!=="function") return false;
  const tag="__void_txmerge_v26_"+key; if ((proto as any)[tag]) return true;
  const orig=proto[key];
  proto[key]=async function wrapped(block:any, ...rest:any[]){ block = await merge(block); return await orig.apply(this, [block, ...rest]); };
  (proto as any)[tag]=true; console.log("[txmerge:v2.6] patch applied on method", key); return true;
}

async function install(){
  let ok=false;
  for (const [spec,method] of [
    ["../src/chain/seg_store.ts","saveBlock"],["../src/chain/seg_store.ts","appendBlock"],
    ["../src/chain/seg_store.js","saveBlock"],["../src/chain/seg_store.js","appendBlock"],
  ]){
    try{ const mod:any = await import(spec); const Seg = mod?.SegStore; if (Seg && await hook(Seg.prototype, method)) ok=true; }catch (err) { recordScriptsEmptyHandlerVisibilityFailure_scripts_dev_proposer_merge_ts("empty-handler-2", err); }
  }
  if (!ok) console.warn("[txmerge:v2.6] WARNING: no save path hooked");
  const getApp=()=> (globalThis as any).__void_http_app || (globalThis as any).app;
  const attachDiag=()=>{
    const app:any=getApp(); if (!app||typeof app.get!=="function") return void setTimeout(attachDiag,500).unref?.();
    app.get("/__void/dev/txmerge/v26/diag", async (_req:any,res:any)=>{
      try{
        const m = await httpDo("GET","/__void/dev/picker/diag");
        const p = await tryPickOnce(0);
        res.json({ok:true, cap:CAP, mempool_len: m.json?.len ?? null, probe: p.statuses});
      }catch(e:any){ res.status(500).json({ok:false, error:String(e?.message||e)}); }
    });
    console.log("[txmerge:v2.6] diag at /__void/dev/txmerge/v26/diag");
  };
  attachDiag();
}
await install();
await import("./dev_proposer.js");
