// wal_v1.js — constructable, bootsafe shim (additive replacement)
// Goal: NEVER wedge boot. Provide the surface area index.ts expects.
// This is intentionally conservative: best-effort file writes, no throws.

import fs from "node:fs";
import path from "node:path";

function safeMkdirp(dir){
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
}
function safeStat(p){
  try { return fs.statSync(p); } catch { return null; }
}

export class WALv1 {
  constructor(dataDir){
    this.dir = String(dataDir || ".");
    safeMkdirp(this.dir);

    this.file = path.join(this.dir, "wal_v1.ndjson");
    this.counters = {
      intents_total: 0,
      commits_total: 0,
      replays_total: 0,
      errors_total: 0,
    };

    this.__lastSeq = 0;
    this.__lastCommit = -1;
    this.__synthetic_seq = 0;
    this.__enabled = true;
  }

  // --- core API used by wrappers ---
  append(n, txRoot, hash){
    try{
      this.counters.intents_total++;
      this.__lastSeq++;
      this.__synthetic_seq = this.__lastSeq;

      const rec = {
        t: Date.now(),
        seq: this.__lastSeq,
        n: (Number.isFinite(+n) ? +n : null),
        txRoot: (txRoot ?? null),
        hash: (hash ?? null),
        kind: "intent"
      };
      // Best-effort append; ignore failures
      fs.appendFileSync(this.file, JSON.stringify(rec) + "\n");
    }catch{
      try { this.counters.errors_total++; } catch {}
    }
  }

  commit(n){
    try{
      this.counters.commits_total++;
      const nn = Number.isFinite(+n) ? +n : null;
      this.__lastCommit = (nn ?? this.__lastCommit);

      const rec = { t: Date.now(), seq: this.__lastSeq, n: nn, kind: "commit" };
      fs.appendFileSync(this.file, JSON.stringify(rec) + "\n");
    }catch{
      try { this.counters.errors_total++; } catch {}
    }
  }

  // --- optional helpers (some mounts call these) ---
  infoJson(){
    const st = safeStat(this.file);
    return {
      dir: this.dir,
      file: this.file,
      bytes: st ? st.size : 0,
      lastSeq: this.__lastSeq || 0,
      lastCommit: this.__lastCommit,
      synthetic_seq: this.__synthetic_seq || 0,
      enabled: this.__enabled ? 1 : 0,
      ...this.counters
    };
  }

  metricsProm(){
    const j = this.infoJson();
    const lines = [];
    lines.push("# HELP void_wal_enabled 1 if WAL shim is enabled");
    lines.push("# TYPE void_wal_enabled gauge");
    lines.push(`void_wal_enabled ${j.enabled||0}`);

    lines.push("# HELP void_wal_bytes WAL file size in bytes");
    lines.push("# TYPE void_wal_bytes gauge");
    lines.push(`void_wal_bytes ${j.bytes||0}`);

    lines.push("# HELP void_wal_last_seq Last WAL sequence number");
    lines.push("# TYPE void_wal_last_seq gauge");
    lines.push(`void_wal_last_seq ${j.lastSeq||0}`);

    lines.push("# HELP void_wal_last_commit Last committed block number (best-effort)");
    lines.push("# TYPE void_wal_last_commit gauge");
    lines.push(`void_wal_last_commit ${Number.isFinite(+j.lastCommit) ? +j.lastCommit : -1}`);

    lines.push("# HELP void_wal_intents_total Total intent appends");
    lines.push("# TYPE void_wal_intents_total counter");
    lines.push(`void_wal_intents_total ${j.intents_total||0}`);

    lines.push("# HELP void_wal_commits_total Total commits");
    lines.push("# TYPE void_wal_commits_total counter");
    lines.push(`void_wal_commits_total ${j.commits_total||0}`);

    lines.push("# HELP void_wal_replays_total Total replays (preview/run)");
    lines.push("# TYPE void_wal_replays_total counter");
    lines.push(`void_wal_replays_total ${j.replays_total||0}`);

    lines.push("# HELP void_wal_errors_total Total WAL errors (best-effort)");
    lines.push("# TYPE void_wal_errors_total counter");
    lines.push(`void_wal_errors_total ${j.errors_total||0}`);

    return lines.join("\n") + "\n";
  }

  replayPreview(){
    try { this.counters.replays_total++; } catch {}
    return { ok: true, planned: 0, note: "shim" };
  }

  async replayRun(){
    try { this.counters.replays_total++; } catch {}
    return { ok: true, applied: 0, note: "shim" };
  }

  close(){ /* noop */ }
}

// Default export for any default-import sites
export default WALv1;
