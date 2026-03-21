import * as fs from "node:fs";
import * as path from "node:path";

export type WalRecord =
  | { t:"appendBlock"; number:number; ts:number; payloadHash:string }
  | { t:"setHead"; number:number; ts:number }
  | { t:"noop"; ts:number };

export class WAL {
  private walDir: string;
  private filePath: string;
  private fd: number | null = null;

  constructor(rootDir: string) {
    this.walDir = path.join(rootDir, "wal");
    this.filePath = path.join(this.walDir, "wal.jsonl");
    fs.mkdirSync(this.walDir, { recursive: true });
  }

  async open() {
    if (this.fd !== null) return;
    this.fd = fs.openSync(this.filePath, "a");
  }

  async append(rec: WalRecord) {
    if (this.fd === null) await this.open();
    const line = JSON.stringify(rec) + "\n";
    fs.writeFileSync(this.fd!, line);
    fs.fdatasyncSync(this.fd!);
  }

  // On startup we scan the WAL; callers decide how to reconcile.
  scan(): WalRecord[] {
    if (!fs.existsSync(this.filePath)) return [];
    const text = fs.readFileSync(this.filePath, "utf8");
    if (!text) return [];
    return text.split("\n").filter(Boolean).map(l=>{
      try { return JSON.parse(l) as WalRecord; } catch { return {t:"noop", ts: Date.now()} as WalRecord; }
    });
  }

  rotate(): void {
    const ts = Date.now();
    if (!fs.existsSync(this.filePath)) return;
    const to = this.filePath.replace(/\.jsonl$/, `.${ts}.jsonl`);
    fs.renameSync(this.filePath, to);
  }
}
