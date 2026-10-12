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

function assertPrivateRequestDirV1(dir: string): void {
  if (typeof process.getuid !== "function") {
    holdHistoryV1("private_posix_identity_unavailable");
  }
  let observed: fs.Stats;
  try { observed = fs.lstatSync(dir); }
  catch { holdHistoryV1("private_directory_metadata_unavailable"); }
  if (!observed.isDirectory() || observed.isSymbolicLink() ||
      observed.uid !== process.getuid() ||
      (observed.mode & 0o7777) !== 0o700) {
    holdHistoryV1("private_directory_owner_or_mode");
  }
}
// Creation mode does not repair an existing public-readable file; refuse
// insecure legacy state instead of silently chmodding historical evidence.
function assertPrivateRequestLeafV1(file: string): void {
  let observed: fs.Stats;
  try { observed = fs.lstatSync(file); }
  catch (error: any) {
    if (error?.code === "ENOENT") return;
    holdHistoryV1("private_leaf_metadata_unavailable");
  }
  if (!observed.isFile() || observed.isSymbolicLink() ||
      observed.nlink !== 1 ||
      observed.uid !== process.getuid() ||
      (observed.mode & 0o7777) !== 0o600) {
    holdHistoryV1("private_existing_leaf_owner_or_mode");
  }
}
function assertPrivateOpenLeafV1(fd: number): void {
  const opened = fs.fstatSync(fd);
  if (!opened.isFile() || opened.nlink !== 1 ||
      opened.uid !== process.getuid() ||
      (opened.mode & 0o7777) !== 0o600) {
    holdHistoryV1("private_open_leaf_owner_or_mode");
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


function immutableRequestBytesForTransitionV1(row: any): string {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    holdHistoryV1("revision_row_not_plain_data");
  }
  const stable = Object.create(null);
  for (const key of Object.keys(row)) {
    if (key === "status" || key === "tx_hash" ||
        key === "payment_submitted_at_ms") continue;
    const descriptor = Object.getOwnPropertyDescriptor(row, key);
    if (!descriptor || !Object.hasOwn(descriptor, "value")) {
      holdHistoryV1("revision_executable_property");
    }
    stable[key] = descriptor.value;
  }
  return REQUEST_HISTORY_JSON_STRINGIFY_V1(stable);
}
// The only allowed same-ID history successor is an immutable original
// whose previously empty transaction hash is first set by the operator.
function validTxHashRevisionV1(before: any, after: any): boolean {
  return before?.request_id === after?.request_id &&
    before?.status === "awaiting_payment_tx_hash" &&
    (before?.tx_hash === "" || before?.tx_hash == null) &&
    after?.status === "payment_submitted_pending_manual_review" &&
    typeof after?.tx_hash === "string" &&
    /^0x[a-fA-F0-9]{64}$/.test(after.tx_hash) &&
    Number.isSafeInteger(after.payment_submitted_at_ms) &&
    after.payment_submitted_at_ms >= Number(before.created_at_ms) &&
    immutableRequestBytesForTransitionV1(before) ===
      immutableRequestBytesForTransitionV1(after);
}
function foldCanonicalRequestRevisionsV1(rows: any[]): any[] {
  const byId = new Map<string, any>();
  for (const row of rows) {
    if (!row || typeof row.request_id !== "string" || !row.request_id) {
      holdHistoryV1("revision_id_invalid");
    }
    const previous = byId.get(row.request_id);
    if (previous !== undefined && !validTxHashRevisionV1(previous, row)) {
      holdHistoryV1("duplicate_id_transition_unqualified");
    }
    byId.set(row.request_id, row);
  }
  return Array.from(byId.values());
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
  // Create private from the first inode; an existing wrong-mode directory
  // is a HOLD, not an invitation to chmod historical customer state.
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  assertPrivateRequestDirV1(dir);
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
    const currentRequestStates =
      foldCanonicalRequestRevisionsV1(durableRequestHistory);
    const projected = applyEvents(currentRequestStates, eventHistory);
    if (!Array.isArray(projected)) {
      throw new Error("buy_void_request_history_projection_unqualified");
    }
    // Never reuse only the first matching request. Old pre-lock versions
    // could create multiple live obligations for one destination. Any such
    // history is ambiguous, even if one row exactly matches this new intent.
    // Walk every projected index rather than a caller-overridable .find().
    let active: any = null;
    const txHashRevision =
      reqObj?.status === "payment_submitted_pending_manual_review";
    const target = String(
      reqObj.void_destination_address || "",
    ).trim().toLowerCase();
    if (!target) holdHistoryV1("request_destination_absent");
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
    if (txHashRevision) {
      // The operator route authenticates its mutation intent separately.
      // The launch lock independently requires an exact same-ID,
      // same-obligation transition and no history-hidden tx hash collision.
      const original = currentRequestStates.find(
        (row: any) => row.request_id === reqObj.request_id,
      );
      if (!original || !active || active.request_id !== reqObj.request_id ||
          !validTxHashRevisionV1(original, reqObj)) {
        holdHistoryV1("operator_revision_not_authorized_by_original");
      }
      for (const row of durableRequestHistory) {
        if (row.request_id !== reqObj.request_id &&
            typeof row.tx_hash === "string" &&
            row.tx_hash.toLowerCase() === reqObj.tx_hash.toLowerCase()) {
          holdHistoryV1("operator_revision_duplicate_tx_hash");
        }
      }
    } else {
      if (reqObj?.status !== "awaiting_payment_tx_hash" ||
          (reqObj?.tx_hash !== "" && reqObj?.tx_hash != null)) {
        holdHistoryV1("public_creation_status_invalid");
      }
      if (currentRequestStates.some(
        (row: any) => row.request_id === reqObj.request_id,
      )) holdHistoryV1("new_request_id_already_durable");
      if (active) {
        const amount = Number(active.usdc_amount ??
          active.requested_amount_usdc ?? 0);
        const chain = String(active.source_chain || "base");
        if (Number.isFinite(amount) &&
            amount === Number(reqObj.usdc_amount) &&
            chain === reqObj.source_chain) {
          assertCurrentAuthority();
          return { dir, reused_request: active, file: null };
        }
        throw new Error(
          "buy_void_request_active_destination_changed_during_lock",
        );
      }
    }

    const json = JSON.stringify(reqObj);
    const ledger = path.join(dir, "requests.jsonl");
    const file = path.join(dir, reqObj.request_id + ".json");
    // Qualify both existing destinations before the first append. Refuse
    // any group/other-readable history rather than publishing new secrets.
    assertPrivateRequestDirV1(dir);
    assertPrivateRequestLeafV1(ledger);
    assertPrivateRequestLeafV1(file);
    if (typeof fs.constants.O_NOFOLLOW !== "number") {
      holdHistoryV1("private_no_follow_unavailable");
    }
    // Last synchronous admission check: no await may intervene.
    assertCurrentAuthority();
    const ledgerFd = fs.openSync(ledger,
      fs.constants.O_WRONLY | fs.constants.O_APPEND |
      fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o600);
    try {
      assertPrivateOpenLeafV1(ledgerFd);
      fs.writeFileSync(ledgerFd, json + "\n");
    } finally {
      fs.closeSync(ledgerFd);
    }
    // The legacy sidecar is still non-atomic relative to the journal.
    // Keep the leaf no-follow and mode 0600; separate crash recovery HOLDs.
    const sidecarFd = fs.openSync(file,
      fs.constants.O_WRONLY | fs.constants.O_CREAT |
      fs.constants.O_NOFOLLOW, 0o600);
    try {
      assertPrivateOpenLeafV1(sidecarFd);
      fs.ftruncateSync(sidecarFd, 0);
      fs.writeFileSync(sidecarFd, JSON.stringify(reqObj, null, 2));
    } finally {
      fs.closeSync(sidecarFd);
    }
    return { dir, file, reused_request: null };
  });
}
