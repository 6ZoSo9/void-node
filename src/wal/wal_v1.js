// Safe stub ESM module.
// index.ts expects `new WALv1(dataDir())`. Some builds import "./wal/wal_v1.js" dynamically.
// This stub must NEVER throw, and must NOT import ./wal_v1.ts (it may not exist on this branch).

export const WAL_V1_STUB = true;

// Minimal no-op WAL that won’t crash if called.
export class WALv1 {
  constructor(dir) {
    this.dir = String(dir ?? "");
    this.enabled = false;
  }
  // common-ish no-op surface area
  open() { return this; }
  close() {}
  stop() {}
  start() {}
  flush() {}
  sync() {}
  append() {}
  write() {}
  read() { return null; }
  replay() { return { ok: true, applied: 0 }; }
  recover() { return { ok: true }; }
  status() { return { ok: true, enabled: false, dir: this.dir }; }
  metrics() { return { ok: true }; }
}

export default { WALv1, WAL_V1_STUB };
