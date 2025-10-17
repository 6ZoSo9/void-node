// src/chain/mempool.ts
export type Tx = {
  body: any
  hash: string
  signature: string
}

export class Mempool {
  private byHash = new Map<string, Tx>()

  add (tx: Tx): boolean {
    if (this.byHash.has(tx.hash)) return false
    this.byHash.set(tx.hash, tx)
    return true
  }

  has (hash: string): boolean {
    return this.byHash.has(hash)
  }

  all (): Tx[] {
    return [...this.byHash.values()]
  }

  size (): number {
    return this.byHash.size
  }
}

