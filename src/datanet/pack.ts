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

const PACK_CHUNK_FILE_RE = /^chunk_\d{6}\.bin$/;

export function packFile(inFile: string, opts: PackOpts): ManifestV1 {
  const fd = fs.openSync(
    inFile,
    fs.constants.O_RDONLY | fs.constants.O_NONBLOCK,
  );
  let stageDir: string | undefined;
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) throw new Error(`not a file: ${inFile}`);

    const resolvedOutDir = path.resolve(opts.outDir);
    const outParent = path.dirname(resolvedOutDir);
    const outBase = path.basename(resolvedOutDir) || "datanet-pack";
    fs.mkdirSync(outParent, { recursive: true });
    stageDir = fs.mkdtempSync(path.join(outParent, `.${outBase}.pack-v1-`));

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
      fs.writeFileSync(path.join(stageDir, fname), slice);

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

    fs.writeFileSync(path.join(stageDir, "root.txt"), man.merkleRootHex + "\n");
    fs.writeFileSync(
      path.join(stageDir, "manifest.v1.json"),
      JSON.stringify(man, null, 2),
    );

    // No final pack path is touched until every source read and every staged
    // artifact has completed successfully. Once publication begins, withdraw
    // the old commit markers first so any later filesystem failure is visibly
    // incomplete rather than a mixed generation that still looks published.
    fs.mkdirSync(resolvedOutDir, { recursive: true });
    fs.rmSync(path.join(resolvedOutDir, "manifest.v1.json"), { force: true });
    fs.rmSync(path.join(resolvedOutDir, "root.txt"), { force: true });
    for (const name of fs.readdirSync(resolvedOutDir)) {
      if (PACK_CHUNK_FILE_RE.test(name)) {
        fs.rmSync(path.join(resolvedOutDir, name), { force: true });
      }
    }

    for (const chunk of chunks) {
      fs.renameSync(
        path.join(stageDir, chunk.file),
        path.join(resolvedOutDir, chunk.file),
      );
    }
    fs.renameSync(
      path.join(stageDir, "root.txt"),
      path.join(resolvedOutDir, "root.txt"),
    );
    // The manifest is the final publication marker for the completed pack.
    fs.renameSync(
      path.join(stageDir, "manifest.v1.json"),
      path.join(resolvedOutDir, "manifest.v1.json"),
    );
    return man;
  } finally {
    if (stageDir) fs.rmSync(stageDir, { recursive: true, force: true });
    fs.closeSync(fd);
  }
}
