import * as fs from 'node:fs'
import * as crypto from 'node:crypto'
const out = process.argv[2] || '.nodekey'
const { privateKey } = crypto.generateKeyPairSync('ed25519')
fs.writeFileSync(out, privateKey.export({type:'pkcs8', format:'pem'}), {mode:0o600})
console.log('wrote', out)
