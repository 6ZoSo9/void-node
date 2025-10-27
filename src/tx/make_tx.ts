import * as fs from 'node:fs'
import * as crypto from 'node:crypto'

const KEY_FILE = process.env.TX_KEY_FILE || '.tx-key.pem'

// create or reuse an ed25519 key used to sign client txs
function loadOrCreateKey (): crypto.KeyObject {
  if (fs.existsSync(KEY_FILE)) {
    return crypto.createPrivateKey(fs.readFileSync(KEY_FILE))
  }
  const { privateKey } = crypto.generateKeyPairSync('ed25519')
  fs.writeFileSync(KEY_FILE, privateKey.export({ type: 'pkcs8', format: 'pem' }))
  return privateKey
}

const priv = loadOrCreateKey()
const pub = crypto.createPublicKey(priv)

// derive a 32-byte hex-ish “address” from the public key (last 32 bytes of SPKI)
const spki = pub.export({ type: 'spki', format: 'der' })
const from = '0x' + spki.subarray(-32).toString('hex')

// allow custom data via CLI arg, default to {note:'hi'}
let data: unknown = { note: 'hi' }
if (process.argv[2]) {
  try { data = JSON.parse(process.argv[2]) } catch {}
}

const to = process.env.TX_TO || ('0x' + '22'.repeat(20))
const nonce = Number(process.env.TX_NONCE || 1)

const body = { from, to, nonce, data }
const canon = JSON.stringify(body, Object.keys(body).sort())
const signature = crypto.sign(null, Buffer.from(canon), priv).toString('base64')
const hash = crypto.createHash('sha256').update(Buffer.from(canon)).digest('hex')

// print the tx JSON to stdout for piping into curl
process.stdout.write(JSON.stringify({ body, hash, signature }))
