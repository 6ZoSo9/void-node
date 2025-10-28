import * as fs from 'node:fs'
import * as crypto from 'node:crypto'
const file = process.argv[2] || '.nodekey'
const priv = crypto.createPrivateKey(fs.readFileSync(file,'utf8'))
const pub = crypto.createPublicKey(priv)
const der = pub.export({type:'spki', format:'der'}) as Buffer
const id = crypto.createHash('sha256').update(der).digest('hex').slice(0,16)
console.log(id)
