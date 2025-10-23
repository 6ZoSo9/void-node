import fs from 'node:fs'
import path from 'node:path'

export type PeerInfo = {
  id: string
  http?: string
  p2p?: string
  capabilities?: string[]
  lastSeen: number
}

export class PeerRegistry {
  private file: string
  private map = new Map<string, PeerInfo>()

  constructor(file = path.join('data','peers.json')) {
    this.file = file
    this.load()
  }

  upsert(p: Partial<PeerInfo> & { id: string }) {
    const prev = this.map.get(p.id) || { id: p.id, lastSeen: 0 }
    const merged: PeerInfo = {
      id: p.id,
      http: p.http ?? prev.http,
      p2p: p.p2p ?? prev.p2p,
      capabilities: p.capabilities ?? prev.capabilities,
      lastSeen: Date.now(),
    }
    this.map.set(p.id, merged)
    this.save()
    return merged
  }

  all(): PeerInfo[] {
    return [...this.map.values()].sort((a,b) => b.lastSeen - a.lastSeen)
  }

  count(): number { return this.map.size }

  remove(id: string) {
    const had = this.map.delete(id)
    if (had) this.save()
    return { removed: had ? 1 : 0, remaining: this.map.size }
  }

  purgeStale(maxAgeMs: number) {
    const now = Date.now()
    let removed = 0
    for (const [id, p] of this.map) {
      if (now - (p.lastSeen || 0) > maxAgeMs) { this.map.delete(id); removed++ }
    }
    if (removed) this.save()
    return { ok:true, removed, remaining: this.map.size }
  }

  private load() {
    try {
      if (!fs.existsSync(this.file)) return
      const arr = JSON.parse(fs.readFileSync(this.file, 'utf8'))
      if (Array.isArray(arr)) {
        for (const p of arr) {
          if (p?.id) this.map.set(p.id, p as PeerInfo)
        }
      }
    } catch {}
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true })
      fs.writeFileSync(this.file, JSON.stringify(this.all(), null, 2))
    } catch {}
  }
}
