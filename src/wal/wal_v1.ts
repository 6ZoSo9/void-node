import * as fs from "node:fs";
import * as path from "node:path";

type WalIntent = {
  t: "append";    // intent to write block
  n: number;      // block number
  txRoot?: string;
  hash?: string;
  ts: number;
};
type WalCommit = {
  t: "commit";    // post-save confirmation
  n: number;
  ts: number;
};

export class WALv1 {
  walDir: string;
  walLog: string;
  inflight = new Set<number>();
  counters = {
    appends_total: 0,
    commits_total: 0,
    replays_total: 0,
    inflight_gauge: 0,
    last_uncommitted_number: -1,
  };

  constructor(dataDir: string){
    this.walDir = path.join(dataDir, "wal");
    this.walLog = path.join(this.walDir, "000000.jsonl");
    fs.mkdirSync(this.walDir, {recursive:true});
    if (!fs.existsSync(this.walLog)) fs.writeFileSync(this.walLog, "");
    this.scanInflight();
  }

  private scanInflight(){
    // Simple replay: scan jsonl and rebuild inflight set
    const text = fs.readFileSync(this.walLog, "utf8");
    const lines = text.split(/\r?\n/).filter(Boolean);
    const open = new Set<number>();
    for (const line of lines){
      try{
        const rec = JSON.parse(line) as WalIntent|WalCommit;
        if (rec.t === "append") open.add(rec.n);
        else if (rec.t === "commit") open.delete(rec.n);
      }catch{}
    }
    this.inflight = open;
    this.counters.inflight_gauge = this.inflight.size;
    if (open.size){
      // Highest uncommitted (best-effort)
      this.counters.last_uncommitted_number = Math.max(...Array.from(open.values()));
    }
  }

  append(n:number, txRoot?:string, hash?:string){
    const rec: WalIntent = { t:"append", n, txRoot, hash, ts: Date.now() };
    fs.appendFileSync(this.walLog, JSON.stringify(rec)+"\n");
    this.inflight.add(n);
    this.counters.appends_total++;
    this.counters.inflight_gauge = this.inflight.size;
    if (n > this.counters.last_uncommitted_number) this.counters.last_uncommitted_number = n;
  }

  commit(n:number){
    const rec: WalCommit = { t:"commit", n, ts: Date.now() };
    fs.appendFileSync(this.walLog, JSON.stringify(rec)+"\n");
    this.inflight.delete(n);
    this.counters.commits_total++;
    this.counters.inflight_gauge = this.inflight.size;
    if (!this.inflight.size) this.counters.last_uncommitted_number = -1;
  }

  metricsProm(): string{
    const c = this.counters;
    return [
      `void_wal_appends_total ${c.appends_total}`,
      `void_wal_commits_total ${c.commits_total}`,
      `void_wal_replays_total ${c.replays_total}`,
      `void_wal_inflight_gauge ${c.inflight_gauge}`,
      `void_wal_last_uncommitted_number ${c.last_uncommitted_number}`,
    ].join("\n")+"\n";
  }
}
