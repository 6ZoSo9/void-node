import * as fs from 'node:fs'
import * as path from 'node:path'

export function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

/** Atomic write: write -> fsync -> rename -> fsync(dir) */
export function writeFileAtomic(file: string, data: string | Buffer) {
  const dir = path.dirname(file)
  ensureDir(dir)

  const tmp = path.join(
    dir,
    `.${path.basename(file)}.tmp-${process.pid}-${Date.now()}`
  )

  // write and fsync the temp file
  const fd = fs.openSync(tmp, 'w')
  try {
    if (typeof data === 'string') {
      fs.writeSync(fd, data)
    } else {
      fs.writeSync(fd, data, 0, data.length, null)
    }
    // Prefer fdatasync if available
    ;(fs as any).fdatasyncSync ? (fs as any).fdatasyncSync(fd) : fs.fsyncSync(fd)
  } finally {
    fs.closeSync(fd)
  }

  // rename into place (atomic on same filesystem)
  fs.renameSync(tmp, file)

  // best-effort fsync the directory entry
  try {
    const dfd = fs.openSync(dir, 'r')
    try { fs.fsyncSync(dfd) } finally { fs.closeSync(dfd) }
  } catch { /* ignore */ }
}

export function writeJSON(file: string, obj: any) {
  const payload = JSON.stringify(obj, null, 2) + '\n'
  writeFileAtomic(file, payload)
}

export function readJSON<T>(file: string): T | null {
  try {
    if (!fs.existsSync(file)) return null
    const txt = fs.readFileSync(file, 'utf8')
    return JSON.parse(txt) as T
  } catch {
    return null
  }
}
