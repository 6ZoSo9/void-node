// VOID_OX_ALPHA_DURABLE_PUBLICATION_CORE_V7_1A — stage-1 durable publication primitive only.
// Scope guard: no ledger JSON parsing, chain recovery, broker state transitions, provider sending, or
// cross-process singleton ownership belongs here. Linux-only; every child path is addressed through
// /proc/self/fd/<pinned-dir-fd>/... and rootPath is never re-resolved after the pinned open.
// V7_1A_1 repairs: effective-UID fail-closed; caller-byte snapshot before first await; single pinned-FD
// authority; O_NONBLOCK on pre-proof final opens; fixed bounded environment for /usr/bin/ln.
import { spawnSync } from 'node:child_process';
import { open as fsOpen, lstat as fsLstat } from 'node:fs/promises';
import { constants as FS } from 'node:fs';

const CORE_ID = 'VOID_OX_ALPHA_DURABLE_PUBLICATION_CORE_V7_1A';
const MAX_RECORD_BYTES = 256 * 1024;
// Node exposes no fs.constants.O_TMPFILE; the reviewed Linux value is __O_TMPFILE | O_DIRECTORY.
const LINUX_O_TMPFILE = 0o20000000 | FS.O_DIRECTORY;
const LN_PATH = '/usr/bin/ln';
const LN_TIMEOUT_MS = 5000;
const LN_MAX_STDERR_BYTES = 8 * 1024;

function fail(message) { throw new Error(`${CORE_ID}: ${message}`); }
// Fail closed: on Linux the effective UID must be available; no getuid fallback, no silent skips.
function currentEffectiveUidV1() {
  if (typeof process.geteuid !== 'function') fail('process.geteuid is required and missing');
  const uid = process.geteuid();
  if (!Number.isSafeInteger(uid) || uid < 0) fail('process.geteuid returned an invalid effective UID');
  return uid;
}
function requireLinuxV1() { if (process.platform !== 'linux') fail('publication primitive supports Linux only'); }
function validatedLeafV1(sequence) {
  if (!Number.isSafeInteger(sequence) || sequence < 0) fail('sequence must be a safe non-negative integer');
  return `record-${String(sequence).padStart(16, '0')}.json`;
}
function childPathV1(handle, leaf) { return `/proc/self/fd/${handle.fd}/${leaf}`; }
function stampV1(stat) { return [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs]; }
function sameStampV1(a, b) { return a.every((value, index) => value === b[index]); }
function assertRegularPrivateFileV1(stat, expectedNlink, label) {
  if (!stat.isFile()) fail(`${label} is not a regular file`);
  if (Number(stat.uid) !== currentEffectiveUidV1()) fail(`${label} owner is not the current effective UID`);
  if ((Number(stat.mode) & 0o7777) !== 0o600) fail(`${label} mode is not exactly 0600`);
  if (stat.nlink !== expectedNlink) fail(`${label} has nlink ${stat.nlink}, expected ${expectedNlink}`);
}
function assertPinnedObjectV1(directoryHandle) {
  if (directoryHandle === null || typeof directoryHandle !== 'object' || Array.isArray(directoryHandle)) {
    fail('directoryHandle must be the opaque pinned object from openPinnedLedgerDirectoryV1');
  }
  const handle = directoryHandle.handle;
  if (!handle || typeof handle.fd !== 'number' || typeof handle.stat !== 'function' || typeof handle.sync !== 'function') {
    fail('pinned FileHandle is missing or unsuitable');
  }
  return handle;
}
async function revalidatePinnedIdentityV1(directoryHandle) {
  const handle = assertPinnedObjectV1(directoryHandle);
  const stat = await handle.stat({ bigint: true });
  if (!stat.isDirectory()) fail('pinned handle no longer refers to a directory');
  if (stat.dev !== directoryHandle.dev || stat.ino !== directoryHandle.ino) fail('pinned directory dev/ino changed');
  if ((Number(stat.mode) & 0o7777) !== directoryHandle.mode) fail('pinned directory mode changed');
  if (Number(stat.uid) !== currentEffectiveUidV1()) fail('pinned directory ownership changed');
  return handle;
}
// Asserts published-file invariants, reads fully under the 256KiB bound, and proves the stat
// generation (dev/ino/size/mtime/ctime) stayed identical across the whole read window.
async function readVerifiedFinalV1(handle, label) {
  const before = await handle.stat({ bigint: true });
  assertRegularPrivateFileV1(before, 1n, label);
  if (before.size > BigInt(MAX_RECORD_BYTES)) fail(`${label} exceeds the 256KiB bound`);
  const out = Buffer.alloc(Number(before.size));
  let position = 0;
  while (position < out.length) {
    const { bytesRead } = await handle.read(out, position, out.length - position, position);
    if (bytesRead === 0) fail(`${label} ended before its declared size`);
    position += bytesRead;
  }
  const after = await handle.stat({ bigint: true });
  if (!sameStampV1(stampV1(before), stampV1(after))) fail(`${label} changed while being read`);
  return { bytes: out, stat: after };
}

export async function openPinnedLedgerDirectoryV1(rootPath) {
  requireLinuxV1();
  if (typeof rootPath !== 'string' || rootPath.length === 0) fail('rootPath must be a non-empty string');
  const handle = await fsOpen(rootPath, FS.O_RDONLY | FS.O_DIRECTORY | FS.O_NOFOLLOW);
  try {
    const stat = await handle.stat({ bigint: true });
    if (!stat.isDirectory()) fail('rootPath did not resolve to a real directory');
    if (Number(stat.uid) !== currentEffectiveUidV1()) fail('ledger root is not owned by the current effective UID');
    if ((Number(stat.mode) & 0o7777) !== 0o700) fail('ledger root mode is not exactly 0700');
    // Single FD authority: the FileHandle carries the fd; no separately authoritative fd is exposed.
    return Object.freeze({ handle, dev: stat.dev, ino: stat.ino, uid: Number(stat.uid), mode: Number(stat.mode) & 0o7777 });
  } catch (error) {
    try { await handle.close(); } catch { /* best effort */ }
    throw error;
  }
}

export async function readPublishedRecordBytesV1(directoryHandle, sequence) {
  requireLinuxV1();
  const leaf = validatedLeafV1(sequence);
  const handle = await revalidatePinnedIdentityV1(directoryHandle);
  // Nonblocking open so a swapped-in FIFO or device cannot block before the regular-file proof below.
  const final = await fsOpen(childPathV1(handle, leaf), FS.O_RDONLY | FS.O_NOFOLLOW | FS.O_NONBLOCK);
  try {
    return (await readVerifiedFinalV1(final, 'published record')).bytes;
  } finally {
    try { await final.close(); } catch { /* best effort */ }
  }
}

function runLnHelperV1(stageFd, directoryFd, leaf) {
  return spawnSync(
    LN_PATH,
    ['-L', '-T', '--', '/proc/self/fd/3', `/proc/self/fd/4/${leaf}`],
    {
      stdio: ['ignore', 'ignore', 'pipe', stageFd, directoryFd],
      timeout: LN_TIMEOUT_MS,
      maxBuffer: LN_MAX_STDERR_BYTES,
      encoding: 'utf8',
      windowsHide: true,
      shell: false,
      env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' },
    },
  );
}
function lnFailureV1(result) {
  if (result.error) return `exact-fd ln spawn failed: ${result.error.code ?? 'unknown_error'}`;
  const stderr = String(result.stderr ?? '').trim().slice(0, 512);
  return `exact-fd ln failed: status=${String(result.status)} signal=${String(result.signal ?? 'none')}${stderr ? ` stderr=${stderr}` : ''}`;
}

export async function publishRecordBytesDurableV1(directoryHandle, sequence, recordBytes) {
  requireLinuxV1();
  const leaf = validatedLeafV1(sequence);
  if (!(recordBytes instanceof Uint8Array)) fail('recordBytes must be a Buffer or Uint8Array');
  if (recordBytes.length < 1 || recordBytes.length > MAX_RECORD_BYTES) fail('recordBytes must carry 1..256KiB');
  // Independent snapshot of the caller's bytes before the first await; later caller mutation is irrelevant.
  const bytes = Buffer.from(recordBytes);
  const handle = await revalidatePinnedIdentityV1(directoryHandle);
  let occupied = false;
  try {
    occupied = Boolean(await fsLstat(childPathV1(handle, leaf)));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (occupied) fail('final sequence filename already exists; refusing to overwrite published evidence');

  let stage = null;
  try {
    stage = await fsOpen(`/proc/self/fd/${handle.fd}`, LINUX_O_TMPFILE | FS.O_RDWR, 0o600);
    const stageStat = await stage.stat({ bigint: true });
    assertRegularPrivateFileV1(stageStat, 0n, 'unnamed staging file');
    let written = 0;
    while (written < bytes.length) {
      const { bytesWritten } = await stage.write(bytes, written, bytes.length - written, written);
      if (bytesWritten <= 0) fail('short write to unnamed staging file');
      written += bytesWritten;
    }
    await stage.sync(); // file fsync strictly precedes the publication link
    const ln = runLnHelperV1(stage.fd, handle.fd, leaf);
    // Publication point reached: every later failure throws and leaves the final file in place.
    if (ln.error || ln.signal !== null || ln.status !== 0) fail(lnFailureV1(ln));
    await handle.sync(); // directory fsync AFTER link, BEFORE any success return
    // Nonblocking reopen of the published path before its regular-file proof.
    const reopened = await fsOpen(childPathV1(handle, leaf), FS.O_RDONLY | FS.O_NOFOLLOW | FS.O_NONBLOCK);
    let verified;
    try {
      verified = await readVerifiedFinalV1(reopened, 'published record');
    } finally {
      try { await reopened.close(); } catch { /* best effort */ }
    }
    if (verified.stat.dev !== stageStat.dev || verified.stat.ino !== stageStat.ino) {
      fail('published inode identity does not match the formerly unnamed staging inode');
    }
    if (!verified.bytes.equals(bytes)) fail('published bytes differ from the staged bytes');
    await revalidatePinnedIdentityV1(directoryHandle);
    return Object.freeze({ sequence, name: leaf, dev: verified.stat.dev, ino: verified.stat.ino, size: verified.bytes.length });
  } finally {
    // Pre-link: closing an unpublished unnamed tmpfile discards it (allowed). Post-link: closing the
    // staging fd cannot affect the published inode; no code path ever deletes published evidence.
    if (stage) { try { await stage.close(); } catch { /* best effort */ } }
  }
}
