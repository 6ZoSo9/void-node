import { TxIndex } from '../src/chain/txindex.js'
const dir = process.env.INDEX_DIR || 'data/index'
const keep = Number(process.env.KEEP_LAST || 3)
const idx = new TxIndex(dir)
console.log(idx.gc(keep))
