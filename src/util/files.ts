import fs from 'node:fs'
import path from 'node:path'

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true })
}

export function writeJSON(file: string, obj: any) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, JSON.stringify(obj, null, 2))
}

export function readJSON<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T
}

