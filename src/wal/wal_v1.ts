import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import { createHash } from "node:crypto";

type WalEntry = {
  ts: number;                 // ms epoch
  kind: "tx" | "block" | "meta";
  payload: any;               // arbitrary JSON
};

export class WALv1 {
  private dir: string;
  private filePath: string;
  private fd: fs.promises.FileHandle | null = null;
  private bytes = 0;
  private entries = 0;
  private segIndex = 0;

  private fsyncEvery = 1;          // fsync every N appends (N=1 = strongest)
  private _sinceSync = 0;

  // pressure caps (tune live via setter endpoints later)
  public capBytes = 256 * 1024 * 1024;   // 256MB
  public capEntries = 2_000_000;         // safety ceiling

  // stats
  public fsyncTotal = 0;
  public lastReplayMs = -1;

  constructor(rootDir: string){
    this.dir = path.join(rootDir, "wal");
    this.segIndex = Date.now(); // simple unique seed; rotate() can roll segments later
    this.filePath = path.join(this.dir, `journal-${this.segIndex}.ndjson`);
  }

  async open(){
    await fsp.mkdir(this.dir, { recursive: true });
    const exists = await fsp.stat(this.filePath).then(()=>true).catch(()=>false);
    this.fd = await fsp.open(this.filePath, exists ? "a" : "a+");
    if (exists){
      const st = await this.fd.stat();
      this.bytes = st.size;
    }
  }

  private lineFor(e: WalEntry){
    const raw = JSON.stringify(e);
    const h = createHash("sha256").update(raw).digest("hex");
    return JSON.stringify({ h, raw }) + "\n";
  }

  pressure(){
    const b = this.bytes;
    const e = this.entries;
    const bRatio = this.capBytes > 0 ? b / this.capBytes : 0;
    const eRatio = this.capEntries > 0 ? e / this.capEntries : 0;
    return Math.max(bRatio, eRatio); // 0..1+ (>=1 means over-cap)
  }

  overCap(){ return this.bytes >= this.capBytes || this.entries >= this.capEntries; }

  async append(kind: WalEntry["kind"], payload: any){
    if (!this.fd) throw new Error("WAL not open");
    const entry: WalEntry = { ts: Date.now(), kind, payload };
    const line = this.lineFor(entry);
    await this.fd.write(line);
    this.bytes += Buffer.byteLength(line);
    this.entries++;
    if (++this._sinceSync >= this.fsyncEvery){
      await this.fd.sync(); this.fsyncTotal++; this._sinceSync = 0;
    }
  }

  async rotate(){
    if (!this.fd) return;
    await this.fd.sync(); await this.fd.close();
    this.segIndex++;
    this.filePath = path.join(this.dir, `journal-${this.segIndex}.ndjson`);
    this.fd = await fsp.open(this.filePath, "a+");
    this._sinceSync = 0;
  }

  async replay(onEntry:(e:WalEntry)=>Promise<void> | void){
    const t0 = Date.now();
    const files = (await fsp.readdir(this.dir)).filter(f=>f.startsWith("journal-") && f.endsWith(".ndjson")).sort();
    for (const f of files){
      const p = path.join(this.dir, f);
      const rd = fs.createReadStream(p, { encoding: "utf8" });
      let buf = "";
      for await (const chunk of rd){
        buf += chunk;
        let idx;
        while ((idx = buf.indexOf("\n")) >= 0){
          const line = buf.slice(0, idx); buf = buf.slice(idx+1);
          if (!line.trim()) continue;
          try{
            const obj = JSON.parse(line);
            const { h, raw } = obj || {};
            if (typeof raw !== "string" || typeof h !== "string") continue;
            const calc = createHash("sha256").update(raw).digest("hex");
            if (calc !== h) continue; // integrity check fail -> skip
            const entry = JSON.parse(raw) as WalEntry;
            await onEntry(entry);
          }catch{}
        }
      }
    }
    this.lastReplayMs = Date.now() - t0;
  }

  metricsText(){
    return [
      "# HELP void_wal_bytes Total WAL bytes across current segment",
      "# TYPE void_wal_bytes gauge",
      `void_wal_bytes ${this.bytes}`,
      "# HELP void_wal_entries Total WAL entries appended (since open)",
      "# TYPE void_wal_entries counter",
      `void_wal_entries ${this.entries}`,
      "# HELP void_wal_segments_open Current WAL segment index",
      "# TYPE void_wal_segments_open gauge",
      `void_wal_segments_open ${this.segIndex}`,
      "# HELP void_wal_fsync_total Total fsync calls",
      "# TYPE void_wal_fsync_total counter",
      `void_wal_fsync_total ${this.fsyncTotal}`,
      "# HELP void_wal_pressure_ratio Pressure ratio (0..1+, >=1 means over cap)",
      "# TYPE void_wal_pressure_ratio gauge",
      `void_wal_pressure_ratio ${this.pressure()}`,
      "# HELP void_wal_last_replay_ms Last replay duration in ms (-1 if none)",
      "# TYPE void_wal_last_replay_ms gauge",
      `void_wal_last_replay_ms ${this.lastReplayMs}`,
    ].join("\n") + "\n";
  }
}
