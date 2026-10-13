import * as path from "node:path";
import { MAX_PACK_CHUNK_BYTES, packFile } from "../datanet/pack.js";

function die(msg: string): never {
  console.error(msg);
  process.exit(2);
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  return undefined;
}

async function main() {
  const cmd = process.argv[2] || "";
  if (cmd !== "datanet") {
    die("usage: voidctl datanet pack --in <file> [--out <dir>] [--chunk-bytes <n>]");
  }
  const sub = process.argv[3] || "";
  if (sub !== "pack") {
    die("usage: voidctl datanet pack --in <file> [--out <dir>] [--chunk-bytes <n>]");
  }

  const infile = arg("--in");
  if (!infile) die("[ERR] missing --in <file>");

  const out = arg("--out") || path.resolve("datanet_out");
  const chunkBytes = Number(arg("--chunk-bytes") || (1024 * 1024));
  if (\n    !Number.isSafeInteger(chunkBytes) ||\n    chunkBytes <= 0 ||\n    chunkBytes > MAX_PACK_CHUNK_BYTES\n  ) {\n    die(\n      `[ERR] invalid --chunk-bytes: expected a positive safe integer <= ${MAX_PACK_CHUNK_BYTES}`,\n    );\n  }

  const man = packFile(infile, { chunkBytes, outDir: out });
  console.log(`[ok] packed -> ${out}`);
  console.log(`[ok] size=${man.sizeBytes} chunkBytes=${man.chunkBytes} chunks=${man.chunks.length}`);
  console.log(`[ok] root=${man.merkleRootHex}`);
}

main().catch((e) => die(`[ERR] ${e?.message || e}`));
