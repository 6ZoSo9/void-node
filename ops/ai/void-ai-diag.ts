#!/usr/bin/env tsx
import fs from "node:fs/promises";
import path from "node:path";
const HTTP="127.0.0.1:4100", FHTTP="127.0.0.1:4101";
const now=()=>Math.floor(Date.now()/1000);
async function get(u:string){ const r=await fetch("http://"+u); if(!r.ok) throw new Error(u+":"+r.status); return r.text(); }
async function j(u:string){ const t=await get(u); try{ return JSON.parse(t);}catch{ return null; } }

async function main(){
  const t0=Date.now();
  let ok=true, notes:string[]=[];

  // 1) heads
  const headTxt = parseInt((await get(`${HTTP}/head.txt`)).split("\n")[0]||"-1",10);
  const fHeadTxt = parseInt((await get(`${FHTTP}/head.txt`)).split("\n")[0]||"-1",10);
  if (headTxt<0){ ok=false; notes.push("proposer head <0"); }

  // 2) drift (follower view)
  const driftProm = await get(`${FHTTP}/metrics/drift6`);
  const drift = Number((/^\s*void_follower_drift\s+([-\d.]+)/m.exec(driftProm)||[])[1]||"NaN");
  const headLocal = Number((/^\s*void_follower_head_local\s+([-\d.]+)/m.exec(driftProm)||[])[1]||"NaN");
  const headPeer  = Number((/^\s*void_follower_head_peer\s+([-\d.]+)/m.exec(driftProm)||[])[1]||"NaN");
  if (!Number.isFinite(drift)) { ok=false; notes.push("no drift6"); }

  // 3) header parity / freshness
  const h2 = await get(`${HTTP}/__void/metrics/header3.prom`);
  const match = Number((/^\s*void_header3_last_mismatch\s+([-\d.]+)/m.exec(h2)||[])[1]||"-1");
  const hAge = Number((/^\s*void_header3_last_age_seconds\s+([-\d.]+)/m.exec(h2)||[])[1]||"9999");
  if (hAge>30){ ok=false; notes.push(`header3 stale ${hAge}s`); }
  if (match >= 0){ ok=false; notes.push(`header3 last mismatch @${match}`); }

  // 4) proposer status
  const p = await j(`${HTTP}/proposer/auto/status2`) || {};
  if (p.enabled!==1) { ok=false; notes.push("proposer auto disabled"); }

  // 5) txroot health & setter
  const txH = await get(`${HTTP}/health/txroot3?format=prom`).catch(()=>"#");
  const txHealth = Number((/^\s*void_txroot_health\s+([-\d.]+)/m.exec(txH)||[])[1]||"0");
  if (txHealth!==1){ ok=false; notes.push("txroot health != 1"); }

  const setter = await get(`${HTTP}/__void/metrics/txroot4/setter.prom`).catch(()=>"#");
  const setRate = Number((/^\s*void_txroot_set_rate_1m\s+([-\d.]+)/m.exec(setter)||[])[1]||"0");
  if (setRate<0.2){ notes.push(`setter slow ${setRate.toFixed(2)}/s`); }

  // 6) seals health (optional)
  const seals = await get(`${HTTP}/metrics/void/seals`).catch(()=>"#");
  const sHealth = Number((/^\s*void_seals_health\s+([-\d.]+)/m.exec(seals)||[])[1]||"1");
  if (sHealth!==1){ ok=false; notes.push("seals health != 1"); }

  // Score
  const score = ok ? 1 : 0;

  // Emit textfile for Prom node_exporter textfile collector
  const promOut = [
    '# HELP void_ai_health overall health (1=OK,0=bad)',
    '# TYPE void_ai_health gauge',
    `void_ai_health{env="dev"} ${score}`,
    '# HELP void_ai_info key numbers',
    '# TYPE void_ai_info gauge',
    `void_ai_info{key="head"} ${headTxt}`,
    `void_ai_info{key="follower_head"} ${fHeadTxt}`,
    `void_ai_info{key="drift"} ${Number.isFinite(drift)?drift:-9999}`,
    `void_ai_info{key="header3_age_s"} ${hAge}`,
    `void_ai_info{key="txroot_set_rate_1m"} ${setRate}`,
  ].join("\n")+"\n";
  await fs.writeFile("/var/lib/node_exporter/textfile/void_ai.prom", promOut);

  // JSON explain
  const report = {
    ts: now(), ms: Date.now()-t0,
    heads: {proposer: headTxt, follower: fHeadTxt, peerFromFollower: headPeer, followerLocal: headLocal},
    drift, header3: {age_s: hAge, lastMismatch: match}, proposer: p,
    txroot: {health: txHealth, setter_rate_1m: setRate}, seals: {health: sHealth},
    ok, notes
  };
  const outDir = path.join("ops","reports"); await fs.mkdir(outDir,{recursive:true});
  await fs.writeFile(path.join(outDir,`ai-diag.${Date.now()}.json`), JSON.stringify(report,null,2));
  console.log(JSON.stringify({ok, notes, score, headTxt, drift, hAge, setRate},null,2));
}
main().catch(e=>{ console.error(e.stack||e); process.exit(1); });
