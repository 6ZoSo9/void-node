import fs from "node:fs";
import path from "node:path";

// Server-owned request intake only. This is NOT an operator payment,
// custody/allocation, wallet or transaction writer. An ordered tuple keeps
// the enormous index.ts boot entry below its independent size ceiling.
export const VOID_BUY_VOID_PUBLIC_REQUEST_UNDER_LAUNCH_LOCK_V1 =
  "VOID_BUY_VOID_PUBLIC_REQUEST_UNDER_LAUNCH_LOCK_V1";


const REQUEST_HISTORY_MAX_BYTES_V1 = 64 * 1024 * 1024;
const REQUEST_HISTORY_UTF8_V1 = new TextDecoder("utf-8", { fatal: true });
const REQUEST_HISTORY_DECODE_V1 =
  TextDecoder.prototype.decode.bind(REQUEST_HISTORY_UTF8_V1);
// A post-import String.prototype.split, JSON hook or Reflect.apply override
// cannot be trusted to determine which paid obligations exist on disk.
const REQUEST_HISTORY_APPLY_V1 = Reflect.apply;
const REQUEST_HISTORY_SUBARRAY_V1 = Uint8Array.prototype.subarray;
const REQUEST_HISTORY_JSON_PARSE_V1 = JSON.parse;
const REQUEST_HISTORY_JSON_STRINGIFY_V1 = JSON.stringify;
const REQUEST_HISTORY_SET_PROTO_V1 = Object.setPrototypeOf;

function holdHistoryV1(reason: string): never {
  throw new Error("buy_void_request_history_under_lock_" + reason);
}
// A missing/empty request JSONL cannot be mistaken for a fresh store if
// operator history or a per-request sidecar survives from a prior generation.
function assertNoSurvivingRequestHistoryV1(dir: string): void {
  let entries: string[];
  try { entries = fs.readdirSync(dir); }
  catch { holdHistoryV1("directory_listing_unavailable"); }
  for (const entry of entries) {
    if (entry === "operator-events.jsonl" ||
        path.extname(entry) === ".json") {
      holdHistoryV1("missing_or_empty_with_surviving_history");
    }
  }
}
function sameHistoryFileV1(left: any, right: any): boolean {
  return left.dev === right.dev && left.ino === right.ino &&
    left.size === right.size && left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs && left.uid === right.uid &&
    left.gid === right.gid && left.mode === right.mode &&
    left.nlink === right.nlink;
}
// The legacy request reader can catch a JSON.parse error and silently drop
// that line. Never admit a second paid obligation from such partial history.
// Read exactly the already-persisted JSONL under the same launch lock and
// require every durable request ID to survive the legacy reader's projection.
function assertCompleteRequestHistoryUnderLockV1(
  dir: string, observed: unknown,
): any[] {
  if (!Array.isArray(observed)) holdHistoryV1("reader_not_array");
  const ledger = path.join(dir, "requests.jsonl");
  let visible: any;
  try {
    visible = fs.lstatSync(ledger, { bigint: true });
  } catch (error: any) {
    if (error?.code !== "ENOENT") holdHistoryV1("metadata_unavailable");
    if (observed.length !== 0) holdHistoryV1("missing_with_observed_rows");
    assertNoSurvivingRequestHistoryV1(dir);
    return [];
  }
  if (!visible.isFile() || visible.isSymbolicLink() ||
      visible.nlink !== 1n || visible.size < 0n ||
      visible.size > BigInt(REQUEST_HISTORY_MAX_BYTES_V1)) {
    holdHistoryV1("leaf_unqualified");
  }
  let fd: number | null = null;
  try {
    fd = fs.openSync(ledger, fs.constants.O_RDONLY |
      (fs.constants.O_NOFOLLOW || 0));
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!opened.isFile() || !sameHistoryFileV1(visible, opened)) {
      holdHistoryV1("identity_changed_before_read");
    }
    const limit = Number(opened.size);
    const buffer = Buffer.alloc(limit + 1);
    let count = 0;
    while (count < buffer.length) {
      const read = fs.readSync(fd, buffer, count,
        buffer.length - count, count);
      if (read === 0) break;
      count += read;
    }
    const closedRead = fs.fstatSync(fd, { bigint: true });
    const visibleAfter = fs.lstatSync(ledger, { bigint: true });
    if (count !== limit || !sameHistoryFileV1(opened, closedRead) ||
        !sameHistoryFileV1(closedRead, visibleAfter)) {
      holdHistoryV1("changed_during_read");
    }
    if (limit === 0) {
      if (observed.length !== 0) holdHistoryV1("empty_with_observed_rows");
      assertNoSurvivingRequestHistoryV1(dir);
      return [];
    }
    // Derive every row boundary from immutable numeric octets, never a
    // mutable String.prototype.split/slice/endsWith call. Independently
    // reject BOM, CR, unterminated or empty frames and invalid UTF-8.
    if (buffer[limit - 1] !== 0x0a ||
        (limit >= 3 && buffer[0] === 0xef &&
         buffer[1] === 0xbb && buffer[2] === 0xbf)) {
      holdHistoryV1("framing_invalid");
    }
    const presentIds = new Set<string>();
    for (let i = 0; i < observed.length; i += 1) {
      if (!Object.hasOwn(observed, i)) holdHistoryV1("reader_sparse");
      const row = observed[i];
      if (!row || typeof row !== "object" || Array.isArray(row) ||
          typeof row.request_id !== "string") {
        holdHistoryV1("reader_row_invalid");
      }
      presentIds.add(row.request_id);
    }
    const durableRows: any[] = [];
    let frameStart = 0;
    for (let cursor = 0; cursor < limit; cursor += 1) {
      const octet = buffer[cursor];
      if (octet === 0x0d) holdHistoryV1("framing_invalid");
      if (octet !== 0x0a) continue;
      if (cursor === frameStart || durableRows.length >= 100_000) {
        holdHistoryV1("empty_or_excess_rows");
      }
      let line: string;
      try {
        const frame = REQUEST_HISTORY_APPLY_V1(
          REQUEST_HISTORY_SUBARRAY_V1, buffer, [frameStart, cursor],
        ) as Uint8Array;
        line = REQUEST_HISTORY_DECODE_V1(frame);
      } catch { holdHistoryV1("utf8_invalid"); }
      let row: any;
      try {
        row = REQUEST_HISTORY_JSON_PARSE_V1(line, (_key, value) => {
          if (value !== null && typeof value === "object") {
            REQUEST_HISTORY_SET_PROTO_V1(value, null);
          }
          return value;
        });
      } catch { holdHistoryV1("malformed_row"); }
      if (!row || typeof row !== "object" || Array.isArray(row) ||
          REQUEST_HISTORY_JSON_STRINGIFY_V1(row) !== line ||
          typeof row.request_id !== "string" || !row.request_id ||
          !presentIds.has(row.request_id)) {
        holdHistoryV1("noncanonical_or_omitted_row");
      }
      durableRows.push(row);
      frameStart = cursor + 1;
    }
    if (frameStart !== limit) holdHistoryV1("framing_invalid");
    return durableRows;
  } catch (error: any) {
    if (String(error?.message || "").startsWith(
      "buy_void_request_history_under_lock_")) throw error;
    holdHistoryV1("read_unavailable");
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); }
      catch { holdHistoryV1("descriptor_close_uncertain"); }
    }
  }
  // Express the impossible fall-through explicitly to TypeScript. Every
  // successful read already returned its immutable snapshot above.
  holdHistoryV1("unreachable_after_cleanup");
}

export type BuyVoidPublicRequestLaunchLockCallbacksV1 = readonly [
  withLaunchMutation: (
    request: any,
    operation: (assertCurrentAuthority: () => unknown) => Promise<any>,
  ) => Promise<any>,
  readRequests: () => Promise<any[]>,
  readEvents: () => Promise<any[]>,
  applyEvents: (requests: any[], events: any[]) => any[],
  isTerminal: (status: unknown) => boolean,
  launchMatches: (request: any) => boolean,
];

export async function persistBuyVoidPublicRequestUnderLaunchLockV1(
  reqObj: any,
  callbacks: BuyVoidPublicRequestLaunchLockCallbacksV1,
): Promise<{ dir: string; file: string | null; reused_request: any | null }> {
  const dir = String(process.env.VOID_BUY_REQUEST_DIR ||
    ".runtime/public-buy-void-requests-v1");
  const [
    withLaunchMutation, readRequests, readEvents, applyEvents,
    isTerminal, launchMatches,
  ] = callbacks;
  if (typeof dir !== "string" || !dir || dir.includes("\0")) {
    throw new Error("buy_void_request_directory_not_configured");
  }
  // Directory creation already preceded the original launch write lock.
  // The canonical launch lock callback independently revalidates the request.
  fs.mkdirSync(dir, { recursive: true });
  return withLaunchMutation(reqObj, async (assertCurrentAuthority) => {
    // The canonical launch gate first checks authority before invoking the
    // callback, but these two history reads are awaited. They can outlive the
    // gate generation / TTL. Require its original under-lock revalidator.
    if (typeof assertCurrentAuthority !== "function") {
      throw new Error("buy_void_request_launch_revalidator_missing");
    }
    // Recheck reviewed operator/request history inside the EXISTING
    // cross-process authority lock, before any JSONL or sidecar append.
    const requestHistory = await readRequests();
    const eventHistory = await readEvents();
    // Expired launch authority takes precedence after awaited reads; never
    // interpret the filesystem when the original lock lease has lapsed.
    assertCurrentAuthority();
    const durableRequestHistory =
      assertCompleteRequestHistoryUnderLockV1(dir, requestHistory);
    // A tolerant reader might return one row while omitting a different
    // durable row with the *same request_id*. Only the independently parsed
    // complete JSONL snapshot may drive destination admission.
    const projected = applyEvents(durableRequestHistory, eventHistory);
    if (!Array.isArray(projected)) {
      throw new Error("buy_void_request_history_projection_unqualified");
    }
    // Never reuse only the first matching request. Old pre-lock versions
    // could create multiple live obligations for one destination. Any such
    // history is ambiguous, even if one row exactly matches this new intent.
    // Walk every projected index rather than a caller-overridable .find().
    let active: any = null;
    const target = String(
      reqObj.void_destination_address || "",
    ).trim().toLowerCase();
    for (let i = 0; i < projected.length; i += 1) {
      if (!Object.hasOwn(projected, i)) {
        throw new Error("buy_void_request_history_projection_sparse");
      }
      const other = projected[i];
      if (!other || typeof other !== "object" || Array.isArray(other)) {
        throw new Error("buy_void_request_history_projection_row_invalid");
      }
      const destination = String(
        other.void_destination_address ||
        other.delivery_address ||
        other.delivery_wallet ||
        "",
      ).trim().toLowerCase();
      if (destination !== target ||
          isTerminal(other.effective_status || other.status) ||
          !launchMatches(other)) continue;
      if (active !== null) {
        throw new Error("buy_void_request_multiple_active_destination_under_lock");
      }
      active = other;
    }
    if (active) {
      const amount = Number(active.usdc_amount ??
        active.requested_amount_usdc ?? 0);
      const chain = String(active.source_chain || "base");
      if (Number.isFinite(amount) &&
          amount === Number(reqObj.usdc_amount) &&
          chain === reqObj.source_chain) {
        // Do not report a successful reused request after a lease expires
        // during asynchronous history reads.
        assertCurrentAuthority();
        return { dir, reused_request: active, file: null };
      }
      throw new Error("buy_void_request_active_destination_changed_during_lock");
    }

    const json = JSON.stringify(reqObj);
    // Last synchronous admission check immediately before the append:
    // nothing may await between this and the byte write under the lock.
    assertCurrentAuthority();
    fs.appendFileSync(path.join(dir, "requests.jsonl"), json + "\n");
    const file = path.join(dir, reqObj.request_id + ".json");
    fs.writeFileSync(file, JSON.stringify(reqObj, null, 2));
    return { dir, file, reused_request: null };
  });
}
