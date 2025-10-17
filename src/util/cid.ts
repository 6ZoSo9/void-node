import crypto from 'node:crypto'

export async function sha256Hex(buf: Buffer | Uint8Array): Promise<string> {
  const hash = crypto.createHash('sha256')
  hash.update(buf)
  return hash.digest('hex')
}

// CID v0-style (hex) for now
export async function cidForBytes(bytes: Buffer | Uint8Array): Promise<string> {
  return sha256Hex(bytes)
}

