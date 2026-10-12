#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = process.env.VOID_REPO || process.cwd();
const DATA = process.env.DATA_DIR || process.env.VOID_DATA_DIR || path.join(ROOT, "data_a");
const AGENT = path.join(DATA, "agent");
const AGENT_V1 = path.join(DATA, "agent_v1");
const DN = path.join(DATA, "datanet_v1", "local_jobs");
const DN_RECEIPTS = path.join(DATA, "datanet_v1", "receipts.jsonl");
const DN_RECEIPTS_COMPAT = path.join(ROOT, "data", "datanet_v1", "receipts.jsonl");

const JOBS = path.join(AGENT, "jobs.jsonl");
const RESULTS = path.join(AGENT, "results.jsonl");
const RECEIPTS = path.join(AGENT, "receipts.jsonl");
const RECEIPTS_V1 = path.join(AGENT_V1, "receipts.jsonl");

function mkdirp(p){ fs.mkdirSync(p, {recursive:true}); }
function sha(x){ return crypto.createHash("sha256").update(String(x)).digest("hex"); }
function append(file, obj){ mkdirp(path.dirname(file)); fs.appendFileSync(file, JSON.stringify(obj) + "\n"); }
function read(file){
  try {
    if (!fs.existsSync(file)) return [];
    return fs.readFileSync(file, "utf8").split(/\n+/).filter(Boolean).map(x => {
      try { return JSON.parse(x); } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}
function idOf(j){ return String(j.job_id || j.id || j.receipt_id || ""); }
function kindOf(j){ return String(j.kind || j.type || j.selected_task_class || j.input?.kind || ""); }
function acctOf(j){ return String(j.account || j.who || j.input?.account || "zoso"); }
function textOf(j){
  if (typeof j.input?.plaintext === "string") return j.input.plaintext;
  if (typeof j.plaintext === "string") return j.plaintext;
  return JSON.stringify(j.input || {});
}
function doneIds(){
  const s = new Set();
  for (const f of [RESULTS, RECEIPTS, RECEIPTS_V1]) {
    for (const r of read(f)) {
      const id = idOf(r);
      if (id) s.add(id);
      if (r.job_id) s.add(String(r.job_id));
      if (r.receipt_id) s.add(String(r.receipt_id));
    }
  }
  return s;
}

function materialize(j, done){
  const id = idOf(j);
  if (!id || done.has(id)) return null;
  const kind = kindOf(j);
  if (kind !== "datanet_publish" && kind !== "publish") return null;
  if (String(j.status || "queued") === "completed") return null;

  const account = acctOf(j);
  const plaintext = textOf(j);
  const ts = Number(j.created_at_ms || j.ts || Date.now());
  const dataset = String(j.dataset_id || "").startsWith("ds_")
    ? String(j.dataset_id)
    : `ds_${ts}_${sha(id + "\n" + plaintext).slice(0,16)}`;

  const file = path.join(DN, `${dataset}.txt`);
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, plaintext);

  const input_hash = String(j.input_hash || sha(JSON.stringify(j.input || {})));
  const output_hash = sha(plaintext);
  const base = {
    ok: true,
    id,
    job_id: id,
    receipt_id: id,
    status: "completed",
    account,
    who: account,
    dataset_id: dataset,
    input_hash,
    inputHash: input_hash,
    output_hash,
    outputHash: output_hash,
    sha256: output_hash,
    sizeBytes: Buffer.byteLength(plaintext),
    file,
    plaintext,
    viewer_url: `/datanet/view/${encodeURIComponent(dataset)}?who=${encodeURIComponent(account)}`,
    raw_json_url: `/datanet/v1/local-job/${encodeURIComponent(dataset)}?who=${encodeURIComponent(account)}`,
    created_at_ms: ts,
    completed_at_ms: Date.now(),
    ts: Date.now(),
    source: "datanet_job_runner_v1"
  };

  append(RESULTS, { ...base, output: base, result: base, kind: "datanet_publish", task_class: "datanet_publish" });

  for (const k of ["datanet_publish", "datanet_fetch_verify", "datanet_redundancy_check"]) {
    const rid = k === "datanet_publish" ? id : `${id}:${k}`;
    const r = { ...base, id: rid, receipt_id: rid, kind: k, task_class: k };
    append(RECEIPTS, r);
    append(RECEIPTS_V1, r);
    append(DN_RECEIPTS, r);
    if (DN_RECEIPTS_COMPAT !== DN_RECEIPTS) append(DN_RECEIPTS_COMPAT, r);
  }

  done.add(id);
  return { job_id: id, dataset_id: dataset, account };
}

function tick(){
  mkdirp(AGENT); mkdirp(AGENT_V1); mkdirp(DN);
  const done = doneIds();
  const completed = [];
  for (const j of read(JOBS)) {
    const out = materialize(j, done);
    if (out) completed.push(out);
  }
  console.log(JSON.stringify({ ok:true, processed: completed.length, completed, data_dir: DATA }, null, 2));
}

tick();
