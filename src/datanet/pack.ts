import * as fs from "node:fs";
import * as path from "node:path";
import { sha256, merkleRoot, hex } from "./merkle.js";

export type PackOpts = {
  chunkBytes: number;
  outDir: string;
};

export type ManifestV1 = {
  version: 1;
  createdAt: string;
  sourcePath: string;
  sizeBytes: number;
  chunkBytes: number;
  chunks: Array<{
    index: number;
    offset: number;
    size: number;
    leafHashHex: string;
    file: string;
  }>;
  merkleRootHex: string;
};

export function packFile(inFile: string, opts: PackOpts): ManifestV1 {
  const fd = fs.openSync(
    inFile,
    fs.constants.O_RDONLY | fs.constants.O_NONBLOCK,
  );
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) throw new Error(`not a file: ${inFile}`);

    fs.mkdirSync(opts.outDir, { recursive: true });

    const chunks: ManifestV1["chunks"] = [];
    const leaves: Buffer[] = [];
    let offset = 0;
    let index = 0;

    while (offset < st.size) {
      const want = Math.min(opts.chunkBytes, st.size - offset);
      const buf = Buffer.allocUnsafe(want);
      const got = fs.readSync(fd, buf, 0, want, offset);
      if (got !== want) {
        throw new Error(
          `short read while packing ${inFile}: offset=${offset} expected=${want} got=${got}`,
        );
      }
      const slice = buf;

      const leaf = sha256(slice);
      leaves.push(leaf);

      const leafHex = hex(leaf);
      const fname = `chunk_${String(index).padStart(6, "0")}.bin`;
      const fpath = path.join(opts.outDir, fname);
      fs.writeFileSync(fpath, slice);

      chunks.push({
        index,
        offset,
        size: slice.length,
        leafHashHex: leafHex,
        file: fname,
      });

      offset += slice.length;
      index += 1;
    }

    const root = merkleRoot(leaves);

    const man: ManifestV1 = {
      version: 1,
      createdAt: new Date().toISOString(),
      sourcePath: path.resolve(inFile),
      sizeBytes: st.size,
      chunkBytes: opts.chunkBytes,
      chunks,
      merkleRootHex: hex(root),
    };

    fs.writeFileSync(path.join(opts.outDir, "manifest.v1.json"), JSON.stringify(man, null, 2));
    fs.writeFileSync(path.join(opts.outDir, "root.txt"), man.merkleRootHex + "\n");
    return man;
  } finally {
    fs.closeSync(fd);
  }
}
