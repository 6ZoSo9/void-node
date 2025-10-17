// src/peerstore.ts
import fs from 'node:fs'
import path from 'node:path'

export type PeerEntry = {
  addr: string          // "host:port"
  lastSeen?: number
  successes?: number
  failures?: number
}

export class PeerStore {
  private file: string
  private map = new Map<string, PeerEntry>()
  private dirty = false

  constructor(filePath?: string) {
    this.file = filePath ?? path.join(process.cwd(), '.peerstore.json')
    this.load()
  }

  private load() {
    try {
      if (!fs.existsSync(this.file)) return
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8')) as PeerEntry[]
      for (const p of raw) if (p?.addr) this.map.set(p.addr, p)
    } catch (e) {
      console.warn(`[peerstore] failed to load ${this.file}:`, (e as Error).message)
    }
  }

  list(): PeerEntry[] {
    return [...this.map.values()]
  }

  add(addr: string) {
    const ex = this.map.get(addr)
    if (!ex) {
      this.map.set(addr, { addr, successes: 0, failures: 0 })
      this.dirty = true
    }
  }

  markSeen(addr: string) {
    const e = this.map.get(addr) ?? { addr }
    e.lastSeen = Date.now()
    this.map.set(addr, e)
    this.dirty = true
  }

  markSuccess(addr: string) {
    const e = this.map.get(addr) ?? { addr }
    e.successes = (e.successes ?? 0) + 1
    e.lastSeen = Date.now()
    this.map.set(addr, e)
    this.dirty = true
  }

  markFailure(addr: string) {
    const e = this.map.get(addr) ?? { addr }
    e.failures = (e.failures ?? 0) + 1
    this.map.set(addr, e)
    this.dirty = true
  }

  flush() {
    if (!this.dirty) return
    try {
      const arr = [...this.map.values()]
      fs.writeFileSync(this.file, JSON.stringify(arr, null, 2))
      this.dirty = false
    } catch (e) {
      console.warn(`[peerstore] failed to save ${this.file}:`, (e as Error).message)
    }
  }
}
