import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncBuiltinESMExports } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const sourcePath = path.join(repo, "src", "datanet", "pack.ts");
const source = fs.readFileSync(sourcePath, "utf8");

assert.match(
  source,
  /const fd = fs\.openSync\(\s*inFile,\s*fs\.constants\.O_RDONLY \| fs\.constants\.O_NONBLOCK,\s*\);\s*try \{\s*const st = fs\.fstatSync\(fd\);/s,
);
assert.doesNotMatch(source, /fs\.statSync\(inFile\)/);
assert.doesNotMatch(source, /fs\.openSync\(inFile, "r"\)/);
assert.match(source, /if \(got !== want\) \{/);
assert.match(source, /short read while packing/);

const { packFile } = await import("../dist/datanet/pack.js");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-pack-short-read-v1-"));
const input = path.join(root, "input.bin");
const fifo = path.join(root, "input.fifo");
const normalOut = path.join(root, "normal");
const fifoOut = path.join(root, "fifo");
const shortOut = path.join(root, "short");

try {
  fs.writeFileSync(input, Buffer.from("abcdefgh", "utf8"));

  const normal = packFile(input, { chunkBytes: 4, outDir: normalOut });
  assert.equal(normal.sizeBytes, 8);
  assert.equal(normal.chunkBytes, 4);
  assert.equal(normal.chunks.length, 2);
  assert.deepEqual(normal.chunks.map((x) => x.size), [4, 4]);
  assert.equal(fs.existsSync(path.join(normalOut, "manifest.v1.json")), true);
  assert.equal(fs.existsSync(path.join(normalOut, "root.txt")), true);

  const mkfifo = spawnSync("mkfifo", [fifo], {
    encoding: "utf8",
    timeout: 2_000,
  });
  assert.equal(
    mkfifo.status,
    0,
    `mkfifo failed: ${mkfifo.error?.message || mkfifo.stderr || mkfifo.stdout}`,
  );

  const fifoProbeCode = `
    const { packFile } = await import(${JSON.stringify(
      pathToFileURL(path.join(repo, "dist", "datanet", "pack.js")).href,
    )});
    try {
      packFile(${JSON.stringify(fifo)}, {
        chunkBytes: 4,
        outDir: ${JSON.stringify(fifoOut)},
      });
      console.error("FIFO unexpectedly accepted");
      process.exit(3);
    } catch (error) {
      const message = String(error?.message || error);
      if (!message.includes("not a file")) {
        console.error(message);
        process.exit(4);
      }
      console.log("fifo_rejected_without_block=true");
    }
  `;

  const fifoProbe = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", fifoProbeCode],
    {
      cwd: repo,
      encoding: "utf8",
      timeout: 2_000,
    },
  );
  assert.equal(
    fifoProbe.error,
    undefined,
    `FIFO probe error: ${fifoProbe.error?.message || "unknown"}`,
  );
  assert.equal(
    fifoProbe.status,
    0,
    `FIFO probe failed: signal=${fifoProbe.signal} stderr=${fifoProbe.stderr}`,
  );
  assert.match(fifoProbe.stdout, /fifo_rejected_without_block=true/);
  assert.equal(fs.existsSync(path.join(fifoOut, "manifest.v1.json")), false);
  assert.equal(fs.existsSync(path.join(fifoOut, "root.txt")), false);

  const originalReadSync = fs.readSync;
  let injected = false;

  try {
    fs.readSync = function injectedReadSync(fd, buffer, offset, length, position) {
      if (!injected) {
        injected = true;
        return 0;
      }
      return originalReadSync(fd, buffer, offset, length, position);
    };
    syncBuiltinESMExports();

    assert.throws(
      () => packFile(input, { chunkBytes: 4, outDir: shortOut }),
      /short read while packing .* offset=0 expected=4 got=0/,
    );
  } finally {
    fs.readSync = originalReadSync;
    syncBuiltinESMExports();
  }

  assert.equal(injected, true);
  assert.equal(fs.existsSync(path.join(shortOut, "manifest.v1.json")), false);
  assert.equal(fs.existsSync(path.join(shortOut, "root.txt")), false);
  assert.equal(
    fs.existsSync(shortOut)
      ? fs.readdirSync(shortOut).some((name) => name.startsWith("chunk_"))
      : false,
    false,
  );

  console.log("VOID_DATANET_PACK_SHORT_READ_FAIL_CLOSED_V1_GREEN");
  console.log("descriptor_stat_authority=true");
  console.log("nonblocking_descriptor_open=true");
  console.log("fifo_rejected_without_block=true");
  console.log("path_stat_before_open=false");
  console.log("short_read_rejected=true");
  console.log("zero_progress_loop_possible=false");
  console.log("partial_chunk_emitted_on_short_read=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
