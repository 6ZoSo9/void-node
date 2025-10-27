import * as crypto from 'node:crypto'

function h(b: Buffer): Buffer {
  return crypto.createHash('sha256').update(b).digest()
}

export function merkleRoot(leaves: Buffer[]): string {
  if (leaves.length === 0) return ''.padStart(64, '0')
  let level = leaves.map(h)
  while (level.length > 1) {
    const next: Buffer[] = []
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i]
      const b = i + 1 < level.length ? level[i + 1] : level[i]
      next.push(h(Buffer.concat([a, b])))
    }
    level = next
  }
  return level[0].toString('hex')
}

