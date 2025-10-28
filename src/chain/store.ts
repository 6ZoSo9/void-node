// src/chain/store.ts
import { SegStore } from "./seg_store.js";
import type { Block } from "./block.js";

/** Thin compatibility wrapper retained for legacy imports. */
export class Store {
  private seg: SegStore;
  constructor(root: string) { this.seg = new SegStore(root, { sparseEvery: 256 }); }
  loadHeadNumber(): number { return this.seg.loadHeadNumber(); }
  loadBlock(n: number): Block | null { return this.seg.loadBlock(n); }
  saveBlock(b: Block) { this.seg.saveBlock(b); }
}

