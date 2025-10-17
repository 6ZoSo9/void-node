// src/validators.ts
const LOOSE = process.env.VALIDATION_LOOSE === '1'

type V = { ok: true } | { ok: false, error: string }
const ok = (): V => ({ ok: true })
const bad = (e: string): V => ({ ok: false, error: e })

const HEX = /^[0-9a-f]+$/i
const isHex = (s: string, len?: number) =>
  typeof s === 'string' &&
  s.startsWith('0x') &&
  HEX.test(s.slice(2)) &&
  (len === undefined || s.length === 2 + len)

function validateHello(msg: string): V {
  if (typeof msg !== 'string') return bad('must be string')
  if (msg.length > 1024) return bad('too long')
  return ok()
}

function validateTx(jsonStr: string): V {
  let o: any
  try { o = JSON.parse(jsonStr) } catch { return bad('not JSON') }
  if (typeof o !== 'object' || o === null) return bad('not object')

  if (!isHex(o.hash, 64)) return bad('hash must be 0x + 32 bytes')
  if (!isHex(o.from, 40)) return bad('from must be 0x + 20 bytes')
  if (!isHex(o.to, 40)) return bad('to must be 0x + 20 bytes')
  if (typeof o.nonce !== 'number' || o.nonce < 0) return bad('nonce must be number >= 0')

  if (LOOSE) {
    if (typeof o.sig !== 'string' || !o.sig.length) return bad('sig required')
  } else {
    if (!isHex(o.sig, 130)) return bad('sig looks wrong')
  }
  return ok()
}

const validators: Record<string, (msg: string) => V> = {
  'void/hello': validateHello,
  'void/tx': validateTx
}

export function validateTopic(topic: string, msg: string): V {
  const v = validators[topic]
  return v ? v(msg) : ok()
}

export function hasValidator(topic: string): boolean {
  return Boolean(validators[topic])
}

export function listTopics(): string[] {
  return Object.keys(validators)
}

