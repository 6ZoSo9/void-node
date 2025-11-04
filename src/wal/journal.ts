import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

type WalRecord = { t: string; n: number; payload: any; ts: number }; // n = monotonic seq
type WalMeta = { lastSeq: number; bytes: number; createdAt: number; updatedAt: number };

function crc32(buf: Buffer): number {
  // fast crc32 via node crypto (polyfill-ish): use adler32 as placeholder if needed
  // For now, we use a stable hash32 (xxhash-like) with node's crc32 not native.
  // Replace with real crc32 later if desired.
  const h = crypto.createHash('sha256').update(buf).digest();
  return h.readUInt32LE(0);
}

export class Journal {
  private root: string;
  private logPath: string;
  private metaPath: string;
  private fh: fs.FileHandle | null = null;
  private meta: WalMeta = { lastSeq: 0, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
  private opened = false;

  constructor(rootDir: string) {
    this.root = rootDir;
    this.logPath = path.join(rootDir, 'wal.log');
    this.metaPath = path.join(rootDir, 'wal.meta.json');
  }

  static async open(rootDir: string) {
    const j = new Journal(rootDir);
    await j.init();
    return j;
  }

  private async init() {
    await fs.promises.mkdir(this.root, { recursive: true });
    try {
      const metaRaw = await fs.promises.readFile(this.metaPath, 'utf8');
      this.meta = JSON.parse(metaRaw);
    } catch {
      // first run
      this.meta = { lastSeq: 0, bytes: 0, createdAt: Date.now(), updatedAt: Date.now() };
      await fs.promises.writeFile(this.metaPath, JSON.stringify(this.meta));
    }
    this.fh = await fs.promises.open(this.logPath, 'a+');
    // compute bytes from file stat in case of mismatch
    const st = await this.fh.stat();
    this.meta.bytes = st.size;
    this.opened = true;
  }

  async append(t: string, payload: any): Promise<number> {
    if (!this.opened || !this.fh) throw new Error('journal not open');
    const n = ++this.meta.lastSeq;
    const rec: WalRecord = { t, n, payload, ts: Date.now() };
    const body = Buffer.from(JSON.stringify(rec), 'utf8');
    const len = Buffer.alloc(4); len.writeUInt32LE(body.length, 0);
    const sig = Buffer.alloc(4); sig.writeUInt32LE(crc32(body), 0);
    // frame: [len][body][crc32]
    const frame = Buffer.concat([len, body, sig]);
    await this.fh.write(frame);
    await this.fh.sync(); // durability guarantee
    this.meta.bytes += frame.length;
    this.meta.updatedAt = Date.now();
    await fs.promises.writeFile(this.metaPath, JSON.stringify(this.meta));
    return n;
  }

  async close() {
    if (this.fh) {
      await this.fh.sync();
      await this.fh.close();
      this.fh = null;
    }
    this.opened = false;
  }

  async *replay(options?: { fromSeq?: number }) {
    const from = options?.fromSeq ?? 1;
    const fh = await fs.promises.open(this.logPath, 'r');
    let pos = 0;
    const st = await fh.stat();
    while (pos + 8 <= st.size) {
      const lenBuf = Buffer.alloc(4);
      await fh.read(lenBuf, 0, 4, pos);
      const bodyLen = lenBuf.readUInt32LE(0);
      const bodyBuf = Buffer.alloc(bodyLen);
      await fh.read(bodyBuf, 0, bodyLen, pos + 4);
      const crcBuf = Buffer.alloc(4);
      await fh.read(crcBuf, 0, 4, pos + 4 + bodyLen);
      const their = crcBuf.readUInt32LE(0);
      const ours = crc32(bodyBuf);
      if (their !== ours) {
        // truncated/torn tail → stop here; leave rest for operator to inspect
        break;
      }
      const rec = JSON.parse(bodyBuf.toString('utf8')) as WalRecord;
      if (rec.n >= from) yield rec;
      pos += 8 + bodyLen;
    }
    await fh.close();
  }

  info() {
    return { ...this.meta, path: this.logPath };
  }

  async truncateUpTo(seq: number) {
    // simple compaction: rewrite tail if needed (future: segment-based)
    const tmp = this.logPath + '.tmp';
    const out = await fs.promises.open(tmp, 'w');
    let pos = 0;
    const inF = await fs.promises.open(this.logPath, 'r');
    const st = await inF.stat();
    while (pos + 8 <= st.size) {
      const lenBuf = Buffer.alloc(4);
      await inF.read(lenBuf, 0, 4, pos);
      const bodyLen = lenBuf.readUInt32LE(0);
      const bodyBuf = Buffer.alloc(bodyLen);
      await inF.read(bodyBuf, 0, bodyLen, pos + 4);
      const crcBuf = Buffer.alloc(4);
      await inF.read(crcBuf, 0, 4, pos + 4 + bodyLen);
      const rec = JSON.parse(bodyBuf.toString('utf8')) as WalRecord;
      const frame = Buffer.concat([lenBuf, bodyBuf, crcBuf]);
      if (rec.n > seq) await out.write(frame);
      pos += 8 + bodyLen;
    }
    await out.sync(); await out.close(); await inF.close();
    await fs.promises.rename(tmp, this.logPath);
    const st2 = await fs.promises.stat(this.logPath);
    this.meta.bytes = st2.size;
    await fs.promises.writeFile(this.metaPath, JSON.stringify(this.meta));
  }
}
