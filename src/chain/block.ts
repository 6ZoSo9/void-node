import * as crypto from 'node:crypto'
import { merkleRoot } from '../util/merkle.js'

export type Block = {
  number: number
  parentHash: string
  timestamp: number
  txRoot: string
  blobRoot: string
  txs: any[]
  blobs: { cid: string, size: number }[]
  proposer: string
  sig: string // node signature over header fields
}

export function blockHash(b: Block): string {
  const header = JSON.stringify({
    number: b.number,
    parentHash: b.parentHash,
    timestamp: b.timestamp,
    txRoot: b.txRoot,
    blobRoot: b.blobRoot,
    proposer: b.proposer
  })
  return crypto.createHash('sha256').update(header).digest('hex')
}

export function computeRoots(txs: any[], blobs: {cid:string,size:number}[]) {
  const txLeafBytes = txs.map(t => Buffer.from(JSON.stringify(t)))
  const blobLeafBytes = blobs.map(b => Buffer.from(b.cid, 'utf8'))
  return {
    txRoot: merkleRoot(txLeafBytes),
    blobRoot: merkleRoot(blobLeafBytes)
  }
}
