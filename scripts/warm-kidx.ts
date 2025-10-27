import { buildAllKidx } from '../src/util/kidx.js'
const base = process.env.DATA_DIR || 'data'
const r = await buildAllKidx(base)
console.log(JSON.stringify(r, null, 2))
