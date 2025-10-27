// Tiny CLI for quick pokes:
// Examples:
//   npm run cli -- health
//   npm run cli -- sub void/tx
//   npm run cli -- pub void/tx '{"kind":"tx","hash":"0x1"}'
//   npm run cli -- put-blob ./README.md

import { readFile } from 'node:fs/promises'

const base = process.env.BASE || 'http://127.0.0.1:4101'

async function main() {
  const [cmd, ...rest] = process.argv.slice(2)
  if (!cmd) return usage()

  if (cmd === 'health')  return j(await fetchJSON('/health'))
  if (cmd === 'peers')   return j(await fetchJSON('/peers'))
  if (cmd === 'topics')  { console.log('topics are implicit (subscribe via /sub)'); return }

  if (cmd === 'sub') {
    const topic = rest[0] || 'void/tx'
    return j(await postJSON('/sub', { topic }))
  }

  if (cmd === 'pub') {
    const topic = rest[0]
    const payload = rest[1] ? JSON.parse(rest[1]) : { ping: Date.now() }
    return j(await postJSON('/pub', { topic, msg: JSON.stringify(payload) }))
  }

  if (cmd === 'tx') {
    const payload = rest[0] ? JSON.parse(rest[0]) : { hash:'0x1', from:'0xA', to:'0xB', nonce:1, sig:'deadbeef' }
    return j(await postJSON('/tx', payload))
  }

  if (cmd === 'put-blob') {
    const file = rest[0]
    if (!file) { console.error('put-blob <path>'); process.exit(1) }
    const data = await readFile(file)
    const base64 = Buffer.from(data).toString('base64')
    return j(await postJSON('/blob/put', { base64 }))
  }

  if (cmd === 'start-proposer') {
    const intervalMs = Number(rest[0] || 5000)
    return j(await postJSON(`/blocks/start?intervalMs=${intervalMs}`, {}))
  }

  usage()
}

function usage() {
  console.log(`Usage:
  BASE=${base} npm run cli -- health
  npm run cli -- peers
  npm run cli -- sub <topic>
  npm run cli -- pub <topic> '<json>'
  npm run cli -- tx '<json>'
  npm run cli -- put-blob <path>
  npm run cli -- start-proposer [intervalMs]
  `)
}

async function fetchJSON(p: string) { const r = await fetch(base + p); return r.json() }
async function postJSON(p: string, body: any) {
  const r = await fetch(base + p, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) })
  return r.json()
}
function j(x: any) { console.log(JSON.stringify(x, null, 2)) }

main().catch(e => { console.error(e); process.exit(1) })
