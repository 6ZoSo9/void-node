import fs from 'node:fs'
import path from 'node:path'
import { writeJSON, readJSON } from '../util/files.js'
import type { Block } from './block.js'

export class ChainStore {
  constructor(private base = 'data') {}
  private blocksDir() { return path.join(this.base, 'blocks') }
  headPath() { return path.join(this.blocksDir(), 'HEAD.json') }
  blockPath(n: number) { return path.join(this.blocksDir(), `${n}.json`) }

  saveBlock(b: Block) {
    writeJSON(this.blockPath(b.number), b)
    writeJSON(this.headPath(), { number: b.number })
  }
  loadHeadNumber(): number {
    const h = readJSON<{number:number}>(this.headPath())
    return h?.number ?? -1
  }
  loadBlock(n: number): Block | null {
    return readJSON<Block>(this.blockPath(n))
  }
}
