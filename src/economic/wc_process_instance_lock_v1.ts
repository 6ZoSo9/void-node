import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";

export const VOID_WC_PROCESS_INSTANCE_LOCK_V1 =
  "VOID_WC_PROCESS_INSTANCE_LOCK_V1";

export interface WcProcessInstanceLockV1 {
  marker: typeof VOID_WC_PROCESS_INSTANCE_LOCK_V1;
  name: string;
  dir: string;
  file: string;
  released_file: string;
  generation: number;
  pid: number;
  process_start_ticks: string;
}

export class WcProcessInstanceLockError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.name = "WcProcessInstanceLockError";
    this.code = code;
  }
}

function fail(code: string): never {
  throw new WcProcessInstanceLockError(code);
}

function safeName(raw: string): string {
  const name = String(raw || "").trim();
  return /^[A-Za-z0-9._-]{1,160}$/.test(name) ? name : "";
}

async function processStartTicks(pid: number): Promise<string | null> {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  const file = `/proc/${pid}/stat`;
  let text: string;
  try {
    text = await fsp.readFile(file, "utf8");
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") return null;
    throw error;
  }
  const end = text.lastIndexOf(")");
  if (end < 0) fail("wc_process_lock_proc_stat_malformed");
  const fields = text.slice(end + 1).trim().split(/\s+/);
  const startTicks = String(fields[19] || "");
  if (!/^[0-9]+$/.test(startTicks)) {
    fail("wc_process_lock_proc_stat_malformed");
  }
  return startTicks;
}

function generationText(generation: number): string {
  if (!Number.isSafeInteger(generation) || generation <= 0) {
    fail("wc_process_lock_generation_invalid");
  }
  return String(generation).padStart(16, "0");
}

function generationFile(
  dir: string,
  name: string,
  generation: number,
): string {
  return path.join(dir, `${name}.${generationText(generation)}.lock`);
}

function releasedFile(
  dir: string,
  name: string,
  generation: number,
): string {
  return path.join(
    dir,
    `${name}.${generationText(generation)}.released`,
  );
}

async function syncDirectoryBestEffort(dir: string): Promise<void> {
  try {
    const handle = await fsp.open(dir, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error: any) {
    console.warn(
      "VOID_WC_PROCESS_INSTANCE_LOCK_DIRECTORY_SYNC_VISIBLE",
      String(error?.message || error),
    );
  }
}

async function durableCreateJson(
  file: string,
  value: Record<string, unknown>,
): Promise<void> {
  const dir = path.dirname(file);
  const temp = path.join(
    dir,
    `.${path.basename(file)}.tmp-${process.pid}-${crypto
      .randomBytes(8)
      .toString("hex")}`,
  );
  let handle: fsp.FileHandle | null = null;
  try {
    handle = await fsp.open(temp, "wx", 0o600);
    await handle.writeFile(JSON.stringify(value) + "\n", "utf8");
    await handle.datasync();
    await handle.close();
    handle = null;

    // Publish only a fully written generation. link(2) is exclusive:
    // an EEXIST means another contender won this immutable generation.
    await fsp.link(temp, file);
    await syncDirectoryBestEffort(dir);
  } finally {
    if (handle) {
      try {
        await handle.close();
      } catch (error: any) {
        console.warn(
          "VOID_WC_PROCESS_INSTANCE_LOCK_HANDLE_CLEANUP_VISIBLE",
          String(error?.message || error),
        );
      }
    }
    try {
      await fsp.unlink(temp);
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") {
        console.warn(
          "VOID_WC_PROCESS_INSTANCE_LOCK_TEMP_CLEANUP_VISIBLE",
          String(error?.message || error),
        );
      }
    }
  }
}

async function readGeneration(
  file: string,
  name: string,
  generation: number,
): Promise<{
  pid: number;
  process_start_ticks: string;
}> {
  let parsed: any;
  try {
    parsed = JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    fail("wc_process_lock_ambiguous_generation");
  }
  const pid = Number(parsed?.pid || 0);
  const ticks = String(parsed?.process_start_ticks || "");
  if (
    parsed?.marker !== VOID_WC_PROCESS_INSTANCE_LOCK_V1 ||
    parsed?.name !== name ||
    Number(parsed?.generation || 0) !== generation ||
    !Number.isSafeInteger(pid) ||
    pid <= 0 ||
    !/^[0-9]+$/.test(ticks)
  ) {
    fail("wc_process_lock_ambiguous_generation");
  }
  return { pid, process_start_ticks: ticks };
}

function parseGeneration(
  entry: string,
  name: string,
): number | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `^${escaped}\\.([0-9]{16})\\.lock$`,
  ).exec(entry);
  if (!match) return null;
  const generation = Number(match[1]);
  return Number.isSafeInteger(generation) && generation > 0
    ? generation
    : null;
}

const locallyReleasedV1 = new Set<string>();

function localGenerationKey(
  dir: string,
  name: string,
  generation: number,
): string {
  return `${path.resolve(dir)}\0${name}\0${generation}`;
}

async function currentGeneration(
  dir: string,
  name: string,
): Promise<number> {
  const entries = await fsp.readdir(dir);
  let max = 0;
  for (const entry of entries) {
    const generation = parseGeneration(entry, name);
    if (generation !== null && generation > max) max = generation;
  }
  return max;
}

async function cleanupOlder(
  dir: string,
  name: string,
  keepGeneration: number,
): Promise<void> {
  let entries: string[];
  try {
    entries = await fsp.readdir(dir);
  } catch {
    return;
  }
  const prefix = `${name}.`;
  for (const entry of entries) {
    if (!entry.startsWith(prefix)) continue;
    const lockGeneration = parseGeneration(entry, name);
    const releaseMatch = new RegExp(
      `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.([0-9]{16})\\.released$`,
    ).exec(entry);
    const generation =
      lockGeneration ??
      (releaseMatch ? Number(releaseMatch[1]) : null);
    if (
      generation === null ||
      !Number.isSafeInteger(generation) ||
      generation >= keepGeneration
    ) {
      continue;
    }
    try {
      await fsp.unlink(path.join(dir, entry));
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") {
        console.warn(
          "VOID_WC_PROCESS_INSTANCE_LOCK_OLD_GENERATION_CLEANUP_VISIBLE",
          String(error?.message || error),
        );
      }
    }
  }
}

export async function acquireWcProcessInstanceLockV1(
  dirRaw: string,
  nameRaw: string,
): Promise<WcProcessInstanceLockV1> {
  if (process.platform !== "linux") {
    fail("wc_process_lock_linux_identity_required");
  }
  const name = safeName(nameRaw);
  if (!name) fail("wc_process_lock_name_invalid");
  const dir = path.resolve(dirRaw);
  await fsp.mkdir(dir, { recursive: true, mode: 0o700 });

  const ownTicks = await processStartTicks(process.pid);
  if (!ownTicks) fail("wc_process_lock_owner_identity_unavailable");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = await currentGeneration(dir, name);
    if (current > 0) {
      const currentFile = generationFile(dir, name, current);
      const currentReleased = releasedFile(dir, name, current);
      const record = await readGeneration(
        currentFile,
        name,
        current,
      );
      const diskReleased = await fsp
        .access(currentReleased)
        .then(() => true)
        .catch(() => false);
      const localReleased = locallyReleasedV1.has(
        localGenerationKey(dir, name, current),
      );

      if (!diskReleased && !localReleased) {
        const liveTicks = await processStartTicks(record.pid);
        if (
          liveTicks !== null &&
          liveTicks === record.process_start_ticks
        ) {
          fail("wc_process_lock_busy");
        }
        // Dead owner or PID reuse: advance to a new immutable generation.
        // The stale generation is never deleted as part of the authority decision.
      }
    }

    const next = current + 1;
    const file = generationFile(dir, name, next);
    const released = releasedFile(dir, name, next);
    try {
      await durableCreateJson(file, {
        marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
        version: 1,
        name,
        generation: next,
        pid: process.pid,
        process_start_ticks: ownTicks,
        created_at_ms: Date.now(),
      });
    } catch (error: any) {
      if (String(error?.code || "") === "EEXIST") continue;
      throw error;
    }

    // If another contender somehow advanced the generation before this
    // publication became visible, only the highest generation is authoritative.
    const after = await currentGeneration(dir, name);
    if (after !== next) {
      locallyReleasedV1.add(localGenerationKey(dir, name, next));
      continue;
    }

    await cleanupOlder(dir, name, next);
    return {
      marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
      name,
      dir,
      file,
      released_file: released,
      generation: next,
      pid: process.pid,
      process_start_ticks: ownTicks,
    };
  }

  fail("wc_process_lock_contention_retry_exhausted");
}

export async function releaseWcProcessInstanceLockV1(
  lock: WcProcessInstanceLockV1,
): Promise<void> {
  if (
    lock?.marker !== VOID_WC_PROCESS_INSTANCE_LOCK_V1 ||
    !safeName(lock?.name || "") ||
    !Number.isSafeInteger(lock?.generation) ||
    lock.generation <= 0
  ) {
    fail("wc_process_lock_release_identity_invalid");
  }
  const key = localGenerationKey(
    lock.dir,
    lock.name,
    lock.generation,
  );
  locallyReleasedV1.add(key);
  try {
    await durableCreateJson(lock.released_file, {
      marker: VOID_WC_PROCESS_INSTANCE_LOCK_V1,
      version: 1,
      name: lock.name,
      generation: lock.generation,
      pid: lock.pid,
      process_start_ticks: lock.process_start_ticks,
      released_at_ms: Date.now(),
    });
  } catch (error: any) {
    if (String(error?.code || "") !== "EEXIST") {
      // Fail-safe: local release still prevents same-process self-wedge;
      // other processes continue to treat the live generation as busy.
      console.warn(
        "VOID_WC_PROCESS_INSTANCE_LOCK_RELEASE_DURABILITY_HOLD",
        String(error?.message || error),
      );
    }
  }
}

export async function wcProcessStartTicksForProofV1(
  pid: number,
): Promise<string | null> {
  return processStartTicks(pid);
}
