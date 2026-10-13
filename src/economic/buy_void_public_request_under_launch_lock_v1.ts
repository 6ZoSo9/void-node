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

const REQUEST_HISTORY_KEYS_V1 = Object.keys;
const REQUEST_HISTORY_OWN_NAMES_V1 = Object.getOwnPropertyNames;
const REQUEST_HISTORY_OWN_SYMBOLS_V1 = Object.getOwnPropertySymbols;
const REQUEST_HISTORY_OWN_DESCRIPTOR_V1 = Object.getOwnPropertyDescriptor;
const REQUEST_HISTORY_GET_PROTO_V1 = Object.getPrototypeOf;
const REQUEST_HISTORY_CREATE_V1 = Object.create;
const REQUEST_HISTORY_IS_ARRAY_V1 = Array.isArray;
const REQUEST_HISTORY_HAS_OWN_V1 = Object.hasOwn;
const REQUEST_HISTORY_ARRAY_PUSH_V1 = Array.prototype.push;
const REQUEST_HISTORY_WEAK_SET_V1 = WeakSet;
const REQUEST_HISTORY_WEAK_HAS_V1 = WeakSet.prototype.has;
const REQUEST_HISTORY_WEAK_ADD_V1 = WeakSet.prototype.add;
const REQUEST_HISTORY_WEAK_DELETE_V1 = WeakSet.prototype.delete;
const REQUEST_HISTORY_FINITE_V1 = Number.isFinite;
const REQUEST_HISTORY_STRING_V1 = String;
const REQUEST_HISTORY_NUMBER_V1 = Number;
const REQUEST_HISTORY_STRING_TRIM_V1 = String.prototype.trim;
const REQUEST_HISTORY_STRING_LOWER_V1 = String.prototype.toLowerCase;

function requestHistoryTrimLowerV1(value: unknown): string {
  const raw = REQUEST_HISTORY_STRING_V1(value ?? "");
  const trimmed = REQUEST_HISTORY_APPLY_V1(
    REQUEST_HISTORY_STRING_TRIM_V1, raw, [],
  ) as string;
  return REQUEST_HISTORY_APPLY_V1(
    REQUEST_HISTORY_STRING_LOWER_V1, trimmed, [],
  ) as string;
}

function requestHistoryLowerV1(value: unknown): string {
  return REQUEST_HISTORY_APPLY_V1(
    REQUEST_HISTORY_STRING_LOWER_V1,
    REQUEST_HISTORY_STRING_V1(value ?? ""),
    [],
  ) as string;
}

// A new buyer request is admitted only from this closed, owned, detached
// snapshot. Even a captured native JSON.stringify invokes an inherited
// Object.prototype.toJSON on a plain object; null-prototype deep copying
// prevents one ambient hook from changing admitted amount or destination.
// This is NOT a new payment, signer or wallet authority.
function detachCanonicalRequestDataV1(input: unknown): any {
  const seen = new REQUEST_HISTORY_WEAK_SET_V1<object>();
  let visited = 0;
  const visit = (value: unknown, depth: number): unknown => {
    if (++visited > 8192 || depth > 24) {
      holdHistoryV1("request_snapshot_bounds");
    }
    if (value === null || typeof value === "string" ||
        typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!REQUEST_HISTORY_FINITE_V1(value)) holdHistoryV1("request_snapshot_number_invalid");
      return value;
    }
    if (!value || typeof value !== "object") {
      holdHistoryV1("request_snapshot_value_invalid");
    }
    if (REQUEST_HISTORY_APPLY_V1(
      REQUEST_HISTORY_WEAK_HAS_V1, seen, [value],
    )) holdHistoryV1("request_snapshot_cycle");
    const array = REQUEST_HISTORY_IS_ARRAY_V1(value);
    const prototype = REQUEST_HISTORY_GET_PROTO_V1(value);
    if (array ? prototype !== Array.prototype && prototype !== null
              : prototype !== Object.prototype && prototype !== null) {
      holdHistoryV1("request_snapshot_prototype_invalid");
    }
    const keys = REQUEST_HISTORY_KEYS_V1(value);
    const names = REQUEST_HISTORY_OWN_NAMES_V1(value);
    if (keys.length > 2048 || REQUEST_HISTORY_OWN_SYMBOLS_V1(value).length) {
      holdHistoryV1("request_snapshot_properties_invalid");
    }
    REQUEST_HISTORY_APPLY_V1(
      REQUEST_HISTORY_WEAK_ADD_V1, seen, [value],
    );
    let detached: any;
    if (array) {
      if (value.length > 2048 || names.length !== keys.length + 1) {
        holdHistoryV1("request_snapshot_array_invalid");
      }
      detached = [];
      REQUEST_HISTORY_SET_PROTO_V1(detached, null);
      for (let i = 0; i < value.length; i += 1) {
        const descriptor = REQUEST_HISTORY_OWN_DESCRIPTOR_V1(value, String(i));
        if (!descriptor || !REQUEST_HISTORY_HAS_OWN_V1(descriptor, "value")) {
          holdHistoryV1("request_snapshot_sparse_or_accessor_array");
        }
        detached[i] = visit(descriptor.value, depth + 1);
      }
      if (keys.length !== value.length) {
        holdHistoryV1("request_snapshot_array_extra_keys");
      }
    } else {
      if (names.length !== keys.length) {
        holdHistoryV1("request_snapshot_hidden_properties");
      }
      detached = REQUEST_HISTORY_CREATE_V1(null);
      // The mutable Array.prototype iterator is NOT a trust boundary.
      // Numeric own-index traversal preserves every captured economic key.
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (key === "toJSON" || key === "__proto__" ||
            key === "constructor" || key === "prototype") {
          holdHistoryV1("request_snapshot_forbidden_key");
        }
        const descriptor = REQUEST_HISTORY_OWN_DESCRIPTOR_V1(value, key);
        if (!descriptor || !REQUEST_HISTORY_HAS_OWN_V1(descriptor, "value")) {
          holdHistoryV1("request_snapshot_accessor");
        }
        detached[key] = visit(descriptor.value, depth + 1);
      }
      // Prove the detached own keyset and order exactly match the reviewed
      // input regardless of any post-import Array iterator interference.
      const copiedKeys = REQUEST_HISTORY_KEYS_V1(detached);
      if (copiedKeys.length !== keys.length) {
        holdHistoryV1("request_snapshot_keyset_mismatch");
      }
      for (let i = 0; i < keys.length; i += 1) {
        if (copiedKeys[i] !== keys[i] ||
            !REQUEST_HISTORY_HAS_OWN_V1(detached, keys[i])) {
          holdHistoryV1("request_snapshot_keyset_mismatch");
        }
      }
    }
    REQUEST_HISTORY_APPLY_V1(
      REQUEST_HISTORY_WEAK_DELETE_V1, seen, [value],
    );
    return detached;
  };
  const snapshot = visit(input, 0);
  if (!snapshot || typeof snapshot !== "object" ||
      REQUEST_HISTORY_IS_ARRAY_V1(snapshot)) {
    holdHistoryV1("request_snapshot_root_invalid");
  }
  return snapshot;
}

function holdHistoryV1(reason: string): never {
  throw new Error("buy_void_request_history_under_lock_" + reason);
}
// A missing/empty request JSONL cannot be mistaken for a fresh store if
// operator history or a per-request sidecar survives from a prior generation.
function assertNoSurvivingRequestHistoryV1(dir: string): void {
  let entries: string[];
  try { entries = fs.readdirSync(dir); }
  catch { holdHistoryV1("directory_listing_unavailable"); }
  // An ambient Array.prototype[Symbol.iterator] hook can hide orphan
  // customer sidecars from an otherwise-correct directory listing.
  for (let i = 0; i < entries.length; i += 1) {
    if (!REQUEST_HISTORY_HAS_OWN_V1(entries, String(i))) {
      holdHistoryV1("directory_listing_sparse");
    }
    const entry = entries[i];
    if (typeof entry !== "string" ||
        entry === "operator-events.jsonl" ||
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
// Pin the verified private directory inode for history and publication.
// /proc/self/fd child paths cannot follow a replacement directory pathname.
function assertPinnedPrivateRequestDirV1(dir: string, fd: number): void {
  let visible: fs.Stats;
  let opened: fs.Stats;
  try {
    visible = fs.lstatSync(dir);
    opened = fs.fstatSync(fd);
  } catch { holdHistoryV1("pinned_directory_identity_unavailable"); }
  if (!visible.isDirectory() || visible.isSymbolicLink() ||
      !opened.isDirectory() ||
      visible.dev !== opened.dev || visible.ino !== opened.ino ||
      visible.uid !== opened.uid || visible.gid !== opened.gid ||
      visible.mode !== opened.mode ||
      opened.uid !== process.getuid?.() ||
      (opened.mode & 0o7777) !== 0o700) {
    holdHistoryV1("pinned_directory_rebound");
  }
}
function assertPrivateRequestLeafV1(file: string): fs.BigIntStats | null {
  let observed: fs.BigIntStats;
  try { observed = fs.lstatSync(file, { bigint: true }); }
  catch (error: any) {
    if (error?.code === "ENOENT") return null;
    holdHistoryV1("private_leaf_metadata_unavailable");
  }
  if (!observed.isFile() || observed.isSymbolicLink() ||
      observed.nlink !== 1n ||
      observed.uid !== BigInt(process.getuid?.() ?? -1) ||
      (observed.mode & 0o7777n) !== 0o600n) {
    holdHistoryV1("private_existing_leaf_owner_or_mode");
  }
  return observed;
}
function assertPrivateOpenLeafV1(fd: number): fs.BigIntStats {
  const opened = fs.fstatSync(fd, { bigint: true });
  if (!opened.isFile() || opened.nlink !== 1n ||
      opened.uid !== BigInt(process.getuid?.() ?? -1) ||
      (opened.mode & 0o7777n) !== 0o600n) {
    holdHistoryV1("private_open_leaf_owner_or_mode");
  }
  return opened;
}
// An opened request sidecar must remain the visible, single-link private
// inode that was qualified. Creation is exclusive when preflight was absent.
// This rejects same-UID replacements instead of truncating a substitute file.
function assertPrivateSidecarIdentityV1(
  file: string, fd: number, expected: fs.BigIntStats | null,
): fs.BigIntStats {
  const opened = assertPrivateOpenLeafV1(fd);
  if (expected && !sameHistoryFileV1(expected, opened)) {
    holdHistoryV1("sidecar_changed_before_open");
  }
  let visible: fs.BigIntStats;
  try { visible = fs.lstatSync(file, { bigint: true }); }
  catch { holdHistoryV1("sidecar_visibility_unavailable"); }
  if (!visible.isFile() || visible.isSymbolicLink() ||
      opened.dev !== visible.dev || opened.ino !== visible.ino ||
      opened.uid !== visible.uid || opened.gid !== visible.gid ||
      opened.mode !== visible.mode || opened.nlink !== visible.nlink) {
    holdHistoryV1("sidecar_visible_inode_changed");
  }
  return opened;
}
function assertPrivateSidecarStillVisibleV1(
  file: string, expected: fs.BigIntStats,
): void {
  let visible: fs.BigIntStats;
  try { visible = fs.lstatSync(file, { bigint: true }); }
  catch { holdHistoryV1("sidecar_postwrite_visibility_unavailable"); }
  if (!visible.isFile() || visible.isSymbolicLink() ||
      expected.dev !== visible.dev || expected.ino !== visible.ino ||
      expected.uid !== visible.uid || expected.gid !== visible.gid ||
      expected.mode !== visible.mode || expected.nlink !== visible.nlink) {
    holdHistoryV1("sidecar_visible_inode_changed");
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
type PinnedRequestHistoryV1 = {
  rows: any[];
  fd: number | null;
  identity: fs.BigIntStats | null;
};
// Keep the *same* verified existing journal FD from strict read to append.
// An absent journal is created later by O_EXCL under the launch lock.
function assertCompleteRequestHistoryUnderLockV1(
  dir: string, observed: unknown,
): PinnedRequestHistoryV1 {
  if (!REQUEST_HISTORY_IS_ARRAY_V1(observed)) {
    holdHistoryV1("reader_not_array");
  }
  const ledger = path.join(dir, "requests.jsonl");
  let visible: any;
  try {
    visible = fs.lstatSync(ledger, { bigint: true });
  } catch (error: any) {
    if (error?.code !== "ENOENT") holdHistoryV1("metadata_unavailable");
    if (observed.length !== 0) holdHistoryV1("missing_with_observed_rows");
    assertNoSurvivingRequestHistoryV1(dir);
    return { rows: [], fd: null, identity: null };
  }
  if (!visible.isFile() || visible.isSymbolicLink() ||
      visible.nlink !== 1n || visible.size < 0n ||
      visible.size > BigInt(REQUEST_HISTORY_MAX_BYTES_V1)) {
    holdHistoryV1("leaf_unqualified");
  }
  let fd: number | null = null;
  let retainForAppend = false;
  try {
    fd = fs.openSync(ledger, fs.constants.O_RDWR |
      fs.constants.O_APPEND | (fs.constants.O_NOFOLLOW || 0));
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
      retainForAppend = true;
      return { rows: [], fd, identity: closedRead };
    }
    // Derive every row boundary from immutable numeric octets, never a
    // mutable String.prototype.split/slice/endsWith call. Independently
    // reject BOM, CR, unterminated or empty frames and invalid UTF-8.
    if (buffer[limit - 1] !== 0x0a ||
        (limit >= 3 && buffer[0] === 0xef &&
         buffer[1] === 0xbb && buffer[2] === 0xbf)) {
      holdHistoryV1("framing_invalid");
    }
    const presentIds: Record<string, true> =
      REQUEST_HISTORY_CREATE_V1(null);
    for (let i = 0; i < observed.length; i += 1) {
      if (!REQUEST_HISTORY_HAS_OWN_V1(observed, String(i))) {
        holdHistoryV1("reader_sparse");
      }
      const row = observed[i];
      if (!row || typeof row !== "object" ||
          REQUEST_HISTORY_IS_ARRAY_V1(row) ||
          typeof row.request_id !== "string") {
        holdHistoryV1("reader_row_invalid");
      }
      presentIds[row.request_id] = true;
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
      if (!row || typeof row !== "object" ||
          REQUEST_HISTORY_IS_ARRAY_V1(row) ||
          REQUEST_HISTORY_JSON_STRINGIFY_V1(row) !== line ||
          typeof row.request_id !== "string" || !row.request_id ||
          !REQUEST_HISTORY_HAS_OWN_V1(presentIds, row.request_id)) {
        holdHistoryV1("noncanonical_or_omitted_row");
      }
      REQUEST_HISTORY_APPLY_V1(
        REQUEST_HISTORY_ARRAY_PUSH_V1, durableRows, [row],
      );
      frameStart = cursor + 1;
    }
    if (frameStart !== limit) holdHistoryV1("framing_invalid");
    retainForAppend = true;
    return { rows: durableRows, fd, identity: closedRead };
  } catch (error: any) {
    if (String(error?.message || "").startsWith(
      "buy_void_request_history_under_lock_")) throw error;
    holdHistoryV1("read_unavailable");
  } finally {
    if (fd !== null && !retainForAppend) {
      try { fs.closeSync(fd); }
      catch { holdHistoryV1("descriptor_close_uncertain"); }
    }
  }
  // Express the impossible fall-through explicitly to TypeScript. Every
  // successful read already returned its immutable snapshot above.
  holdHistoryV1("unreachable_after_cleanup");
}


function immutableRequestBytesForTransitionV1(row: any): string {
  if (!row || typeof row !== "object" || REQUEST_HISTORY_IS_ARRAY_V1(row)) {
    holdHistoryV1("revision_row_not_plain_data");
  }
  // Parsed historical rows are ordinary nested objects. Capturing stringify
  // alone does not prevent an ambient inherited toJSON function from
  // changing their payment terms. Deep detach before canonical comparison.
  const detached = detachCanonicalRequestDataV1(row);
  const keys = REQUEST_HISTORY_KEYS_V1(detached);
  const stable = REQUEST_HISTORY_CREATE_V1(null);
  // Do not for..of the mutable Array.prototype iterator. A same-process
  // hook can omit "payment_instructions" while preserving keys.length and
  // make an operator recipient substitution appear immutable.
  for (let i = 0; i < keys.length; i += 1) {
    if (!REQUEST_HISTORY_HAS_OWN_V1(keys, String(i))) {
      holdHistoryV1("revision_property_enumeration_ambiguous");
    }
    const key = keys[i];
    if (typeof key !== "string") {
      holdHistoryV1("revision_property_name_invalid");
    }
    if (key === "status" || key === "tx_hash" ||
        key === "payment_submitted_at_ms") continue;
    const descriptor = REQUEST_HISTORY_OWN_DESCRIPTOR_V1(detached, key);
    if (!descriptor || !REQUEST_HISTORY_HAS_OWN_V1(descriptor, "value")) {
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
function findCanonicalRequestByIdV1(
  rows: any[], requestId: unknown,
): any | null {
  if (!REQUEST_HISTORY_IS_ARRAY_V1(rows)) {
    holdHistoryV1("request_id_lookup_rows_unqualified");
  }
  let found: any = null;
  for (let i = 0; i < rows.length; i += 1) {
    if (!REQUEST_HISTORY_HAS_OWN_V1(rows, String(i))) {
      holdHistoryV1("request_id_lookup_rows_sparse");
    }
    const row = rows[i];
    if (!row || typeof row !== "object" || REQUEST_HISTORY_IS_ARRAY_V1(row)) {
      holdHistoryV1("request_id_lookup_row_invalid");
    }
    if (row.request_id !== requestId) continue;
    if (found !== null) {
      holdHistoryV1("request_id_lookup_duplicate");
    }
    found = row;
  }
  return found;
}

function foldCanonicalRequestRevisionsV1(rows: any[]): any[] {
  if (!REQUEST_HISTORY_IS_ARRAY_V1(rows) ||
      !Number.isSafeInteger(rows.length) ||
      rows.length > REQUEST_HISTORY_MAX_BYTES_V1) {
    holdHistoryV1("revision_rows_unqualified");
  }
  const byId: Record<string, any> = REQUEST_HISTORY_CREATE_V1(null);
  const order: string[] = [];
  // Walk every durable byte-framed history index. A mutable Map prototype or
  // Array.from implementation must never decide which paid obligation exists.
  for (let i = 0; i < rows.length; i += 1) {
    if (!REQUEST_HISTORY_HAS_OWN_V1(rows, String(i))) {
      holdHistoryV1("revision_rows_sparse");
    }
    const row = rows[i];
    if (!row || typeof row.request_id !== "string" || !row.request_id) {
      holdHistoryV1("revision_id_invalid");
    }
    const id = safeRequestSidecarIdV1(row.request_id);
    const existed = REQUEST_HISTORY_HAS_OWN_V1(byId, id);
    const previous = existed ? byId[id] : undefined;
    if (previous !== undefined && !validTxHashRevisionV1(previous, row)) {
      holdHistoryV1("duplicate_id_transition_unqualified");
    }
    if (!existed) {
      REQUEST_HISTORY_APPLY_V1(REQUEST_HISTORY_ARRAY_PUSH_V1, order, [id]);
    }
    byId[id] = row;
  }
  const folded: any[] = [];
  for (let i = 0; i < order.length; i += 1) {
    if (!REQUEST_HISTORY_HAS_OWN_V1(order, String(i))) {
      holdHistoryV1("revision_fold_order_sparse");
    }
    const id = order[i];
    if (typeof id !== "string" ||
        !REQUEST_HISTORY_HAS_OWN_V1(byId, id)) {
      holdHistoryV1("revision_fold_identity_missing");
    }
    REQUEST_HISTORY_APPLY_V1(
      REQUEST_HISTORY_ARRAY_PUSH_V1, folded, [byId[id]],
    );
  }
  if (folded.length !== order.length) {
    holdHistoryV1("revision_fold_cardinality");
  }
  return folded;
}


function safeRequestSidecarIdV1(value: unknown): string {
  // Never let a legacy durable request ID escape the pinned directory via
  // "..", separators, Unicode lookalikes, or an unbounded path component.
  if (typeof value !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    holdHistoryV1("unsafe_request_id");
  }
  return value;
}

// Recover ONLY an absent per-request sidecar for a complete, fsynced,
// immutable journal row. A pre-existing mismatched sidecar is evidence of
// divergent customer state and must HOLD for an independent recovery review.
// This cannot recover a partial/truncated journal append or a torn sidecar.
function qualifyOrRecoverReuseSidecarV1(
  dir: string, pinnedDir: string, dirFd: number,
  history: PinnedRequestHistoryV1, canonicalRow: any,
  assertCurrentAuthority: () => unknown,
): void {
  const id = safeRequestSidecarIdV1(canonicalRow?.request_id);
  const journalFd = history.fd;
  const original = history.identity;
  if (journalFd === null || original === null) {
    holdHistoryV1("recovery_requires_original_journal");
  }
  const journal = path.join(pinnedDir, "requests.jsonl");
  const sidecar = path.join(pinnedDir, id + ".json");
  const checkJournal = () => {
    let opened: fs.BigIntStats;
    let visible: fs.BigIntStats;
    try {
      opened = fs.fstatSync(journalFd, { bigint: true });
      visible = fs.lstatSync(journal, { bigint: true });
    } catch { holdHistoryV1("recovery_journal_unavailable"); }
    if (!sameHistoryFileV1(original, opened) ||
        !sameHistoryFileV1(opened, visible)) {
      holdHistoryV1("recovery_journal_rebound");
    }
  };
  assertCurrentAuthority();
  assertPinnedPrivateRequestDirV1(dir, dirFd);
  checkJournal();
  // A prior process may have exited after the JSONL write but before its
  // fsync. The complete canonical row is not recovery authority until the
  // retained journal FD itself is durably synced.
  fs.fsyncSync(journalFd);
  checkJournal();
  const bytes = Buffer.from(
    REQUEST_HISTORY_JSON_STRINGIFY_V1(canonicalRow, null, 2), "utf8",
  );
  if (!bytes.length || bytes.length > REQUEST_HISTORY_MAX_BYTES_V1) {
    holdHistoryV1("recovery_sidecar_size_invalid");
  }
  const before = assertPrivateRequestLeafV1(sidecar);
  let sidecarFd: number | null = null;
  let checked: fs.BigIntStats | null = null;
  let verifiedBytesIdentity: fs.BigIntStats | null = null;
  try {
    if (before === null) {
      // Absent means absent: only create-exclusively from the exact durable
      // journal row. Never truncate/rewrite a preexisting sidecar.
      try {
        sidecarFd = fs.openSync(sidecar, fs.constants.O_RDWR |
          fs.constants.O_CREAT | fs.constants.O_EXCL |
          fs.constants.O_NOFOLLOW, 0o600);
      } catch (error: any) {
        if (error?.code === "EEXIST") {
          holdHistoryV1("recovery_sidecar_interloper");
        }
        throw error;
      }
      checked = assertPrivateSidecarIdentityV1(
        sidecar, sidecarFd, null,
      );
      assertCurrentAuthority();
      checkJournal();
      fs.writeFileSync(sidecarFd, bytes);
      fs.fsyncSync(sidecarFd);
      const after = assertPrivateOpenLeafV1(sidecarFd);
      if (after.size !== BigInt(bytes.length)) {
        holdHistoryV1("recovery_sidecar_short_write");
      }
      verifiedBytesIdentity = after;
      assertPrivateSidecarStillVisibleV1(sidecar, checked);
      fs.fsyncSync(dirFd);
    } else {
      // A full sidecar must match the canonical LAST journal row byte-for-byte
      // before a public retry can be reported as idempotent internally.
      sidecarFd = fs.openSync(sidecar, fs.constants.O_RDONLY |
        fs.constants.O_NOFOLLOW);
      checked = assertPrivateSidecarIdentityV1(
        sidecar, sidecarFd, before,
      );
      if (checked.size !== BigInt(bytes.length)) {
        holdHistoryV1("reused_sidecar_content_mismatch");
      }
      const observed = Buffer.alloc(bytes.length);
      let offset = 0;
      while (offset < observed.length) {
        const read = fs.readSync(sidecarFd, observed, offset,
          observed.length - offset, offset);
        if (read <= 0) holdHistoryV1("reused_sidecar_short_read");
        offset += read;
      }
      if (!sameHistoryFileV1(checked,
            fs.fstatSync(sidecarFd, { bigint: true }))) {
        holdHistoryV1("reused_sidecar_changed_during_read");
      }
      for (let i = 0; i < bytes.length; i += 1) {
        if (observed[i] !== bytes[i]) {
          holdHistoryV1("reused_sidecar_content_mismatch");
        }
      }
      verifiedBytesIdentity = checked;
    }
    assertCurrentAuthority();
    checkJournal();
    assertPinnedPrivateRequestDirV1(dir, dirFd);
    assertPrivateSidecarStillVisibleV1(sidecar, checked!);
    // No new economic mutation after the final authority/sidecar readback.
    assertPrivateSidecarContentsAtSuccessV1(
      sidecar, sidecarFd!, verifiedBytesIdentity!, bytes,
    );
  } finally {
    if (sidecarFd !== null) fs.closeSync(sidecarFd);
  }
}

// Final retained-descriptor byte qualification after the last authority,
// journal, and private-directory checks. Matching inode/size/mode alone is not
// proof of canonical buyer data: a same-UID writer can change equal-length
// bytes in place without replacing the inode. Fail closed on *any* final
// size/metadata drift and compare every canonical byte at bounded read size.
function assertPrivateSidecarContentsAtSuccessV1(
  file: string, fd: number,
  baseline: fs.BigIntStats, canonicalBytes: Buffer,
): void {
  let before: fs.BigIntStats;
  try { before = fs.fstatSync(fd, { bigint: true }); }
  catch { holdHistoryV1("sidecar_final_descriptor_unavailable"); }
  if (!sameHistoryFileV1(baseline, before) ||
      before.size !== BigInt(canonicalBytes.length) ||
      !before.isFile()) {
    holdHistoryV1("sidecar_final_descriptor_changed");
  }
  const chunk = Buffer.alloc(Math.min(canonicalBytes.length, 64 * 1024));
  for (let offset = 0; offset < canonicalBytes.length;) {
    const size = Math.min(chunk.length, canonicalBytes.length - offset);
    let read: number;
    try { read = fs.readSync(fd, chunk, 0, size, offset); }
    catch { holdHistoryV1("sidecar_final_read_unavailable"); }
    if (read <= 0) holdHistoryV1("sidecar_final_short_read");
    for (let i = 0; i < read; i += 1) {
      if (chunk[i] !== canonicalBytes[offset + i]) {
        holdHistoryV1("sidecar_final_content_mismatch");
      }
    }
    offset += read;
  }
  let after: fs.BigIntStats;
  let visible: fs.BigIntStats;
  try {
    after = fs.fstatSync(fd, { bigint: true });
    visible = fs.lstatSync(file, { bigint: true });
  } catch { holdHistoryV1("sidecar_final_visibility_unavailable"); }
  if (!sameHistoryFileV1(before, after) ||
      !sameHistoryFileV1(after, visible) ||
      !visible.isFile() || visible.isSymbolicLink()) {
    holdHistoryV1("sidecar_final_identity_changed");
  }
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
  inputRequest: any,
  callbacks: BuyVoidPublicRequestLaunchLockCallbacksV1,
): Promise<{ dir: string; file: string | null; reused_request: any | null }> {
  const reqObj = detachCanonicalRequestDataV1(inputRequest);
  const dir = String(process.env.VOID_BUY_REQUEST_DIR ||
    ".runtime/public-buy-void-requests-v1");
  // The callback tuple carries launch-lock and history authority. Never
  // unpack it through Array.prototype[Symbol.iterator]: same-process ambient
  // prototype tampering could shift readRequests into the lock position and
  // make an unpersisted request look successful. Capture exactly six own data
  // function properties by numeric descriptor instead.
  if (!REQUEST_HISTORY_IS_ARRAY_V1(callbacks)) {
    holdHistoryV1("callback_tuple_not_array");
  }
  const callbackPrototype = REQUEST_HISTORY_GET_PROTO_V1(callbacks);
  const callbackNames = REQUEST_HISTORY_OWN_NAMES_V1(callbacks);
  const callbackKeys = REQUEST_HISTORY_KEYS_V1(callbacks);
  const callbackLength =
    REQUEST_HISTORY_OWN_DESCRIPTOR_V1(callbacks, "length");
  if ((callbackPrototype !== Array.prototype && callbackPrototype !== null) ||
      !callbackLength ||
      !REQUEST_HISTORY_HAS_OWN_V1(callbackLength, "value") ||
      callbackLength.value !== 6 ||
      callbackNames.length !== 7 ||
      callbackKeys.length !== 6 ||
      REQUEST_HISTORY_OWN_SYMBOLS_V1(callbacks).length !== 0) {
    holdHistoryV1("callback_tuple_shape_invalid");
  }
  const capturedCallbacks: any = REQUEST_HISTORY_CREATE_V1(null);
  for (let i = 0; i < 6; i += 1) {
    const descriptor =
      REQUEST_HISTORY_OWN_DESCRIPTOR_V1(callbacks, String(i));
    if (!descriptor ||
        !REQUEST_HISTORY_HAS_OWN_V1(descriptor, "value") ||
        typeof descriptor.value !== "function" ||
        descriptor.enumerable !== true) {
      holdHistoryV1("callback_tuple_entry_invalid");
    }
    capturedCallbacks[i] = descriptor.value;
  }
  const withLaunchMutation = capturedCallbacks[0];
  const readRequests = capturedCallbacks[1];
  const readEvents = capturedCallbacks[2];
  const applyEvents = capturedCallbacks[3];
  const isTerminal = capturedCallbacks[4];
  const launchMatches = capturedCallbacks[5];
  if (typeof dir !== "string" || !dir || dir.includes("\0")) {
    throw new Error("buy_void_request_directory_not_configured");
  }
  // Create private from the first inode; an existing wrong-mode directory
  // is a HOLD, not an invitation to chmod historical customer state.
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  assertPrivateRequestDirV1(dir);
  return withLaunchMutation(reqObj, async (assertCurrentAuthority: () => unknown) => {
    // Keep one private-directory FD across history read and publication.
    // Journal inode pinning and journal/sidecar crash atomicity remain HOLD.
    if (typeof fs.constants.O_NOFOLLOW !== "number" ||
        typeof fs.constants.O_DIRECTORY !== "number") {
      holdHistoryV1("pinned_directory_flags_unavailable");
    }
    const dirFd = fs.openSync(dir,
      fs.constants.O_RDONLY | fs.constants.O_DIRECTORY |
      fs.constants.O_NOFOLLOW);
    try {
      assertPinnedPrivateRequestDirV1(dir, dirFd);
      const pinnedDir = "/proc/self/fd/" + String(dirFd);
      try { fs.accessSync(pinnedDir); }
      catch { holdHistoryV1("pinned_directory_proc_unavailable"); }
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
    const heldHistory =
      assertCompleteRequestHistoryUnderLockV1(pinnedDir, requestHistory);
    // A retained original FD must be closed on ALL return and error paths,
    // including public idempotent reuse and rejected operator revisions.
    let journalFd: number | null = heldHistory.fd;
    // An operator revision's old sidecar is opened BEFORE any journal
    // append, verified against its original durable row, and kept open
    // until the eventual revision write or every error cleanup.
    let revisionSidecarFd: number | null = null;
    let reservedNewSidecarFd: number | null = null;
    try {
    const durableRequestHistory = heldHistory.rows;
    // A tolerant reader might return one row while omitting a different
    // durable row with the *same request_id*. Only the independently parsed
    // complete JSONL snapshot may drive destination admission.
    const currentRequestStates =
      foldCanonicalRequestRevisionsV1(durableRequestHistory);
    safeRequestSidecarIdV1(reqObj?.request_id);
    const projected = applyEvents(currentRequestStates, eventHistory);
    if (!REQUEST_HISTORY_IS_ARRAY_V1(projected)) {
      throw new Error("buy_void_request_history_projection_unqualified");
    }
    // Never reuse only the first matching request. Old pre-lock versions
    // could create multiple live obligations for one destination. Any such
    // history is ambiguous, even if one row exactly matches this new intent.
    // Walk every projected index rather than a caller-overridable .find().
    let active: any = null;
    const txHashRevision =
      reqObj?.status === "payment_submitted_pending_manual_review";
    const target = requestHistoryTrimLowerV1(
      reqObj.void_destination_address || "",
    );
    if (!target) holdHistoryV1("request_destination_absent");
    for (let i = 0; i < projected.length; i += 1) {
      if (!REQUEST_HISTORY_HAS_OWN_V1(projected, String(i))) {
        throw new Error("buy_void_request_history_projection_sparse");
      }
      const other = projected[i];
      if (!other || typeof other !== "object" ||
          REQUEST_HISTORY_IS_ARRAY_V1(other)) {
        throw new Error("buy_void_request_history_projection_row_invalid");
      }
      const destination = requestHistoryTrimLowerV1(
        other.void_destination_address ||
        other.delivery_address ||
        other.delivery_wallet ||
        "",
      );
      if (destination !== target ||
          isTerminal(other.effective_status || other.status) ||
          !launchMatches(other)) continue;
      if (active !== null) {
        throw new Error("buy_void_request_multiple_active_destination_under_lock");
      }
      active = other;
    }
    let originalRevisionRow: any = null;
    if (txHashRevision) {
      // The operator route authenticates its mutation intent separately.
      // The launch lock independently requires an exact same-ID,
      // same-obligation transition and no history-hidden tx hash collision.
      const original = findCanonicalRequestByIdV1(
        currentRequestStates, reqObj.request_id,
      );
      if (!original || !active || active.request_id !== reqObj.request_id ||
          !validTxHashRevisionV1(original, reqObj)) {
        holdHistoryV1("operator_revision_not_authorized_by_original");
      }
      // Every durable row, including another buyer's payment hash, must
      // survive same-process Array iterator poisoning at this final gate.
      for (let i = 0; i < durableRequestHistory.length; i += 1) {
        if (!REQUEST_HISTORY_HAS_OWN_V1(durableRequestHistory, String(i))) {
          holdHistoryV1("operator_revision_history_sparse");
        }
        const row = durableRequestHistory[i];
        if (row.request_id !== reqObj.request_id &&
            typeof row.tx_hash === "string" &&
            requestHistoryLowerV1(row.tx_hash) ===
              requestHistoryLowerV1(reqObj.tx_hash)) {
          holdHistoryV1("operator_revision_duplicate_tx_hash");
        }
      }
      originalRevisionRow = original;
    } else {
      if (reqObj?.status !== "awaiting_payment_tx_hash" ||
          (reqObj?.tx_hash !== "" && reqObj?.tx_hash != null)) {
        holdHistoryV1("public_creation_status_invalid");
      }
      if (findCanonicalRequestByIdV1(
        currentRequestStates, reqObj.request_id,
      ) !== null) holdHistoryV1("new_request_id_already_durable");
      if (active) {
        const amount = REQUEST_HISTORY_NUMBER_V1(active.usdc_amount ??
          active.requested_amount_usdc ?? 0);
        const chain = REQUEST_HISTORY_STRING_V1(active.source_chain || "base");
        if (REQUEST_HISTORY_FINITE_V1(amount) &&
            amount === REQUEST_HISTORY_NUMBER_V1(reqObj.usdc_amount) &&
            chain === reqObj.source_chain) {
          // A crash may leave an fsynced journal with no sidecar. Restore
          // only a missing sidecar from the canonical latest JSONL row;
          // conflicting existing bytes are never overwritten.
          const canonical = findCanonicalRequestByIdV1(
            currentRequestStates, active.request_id,
          );
          if (!canonical) holdHistoryV1("reused_canonical_row_missing");
          qualifyOrRecoverReuseSidecarV1(
            dir, pinnedDir, dirFd, heldHistory, canonical,
            assertCurrentAuthority,
          );
          assertCurrentAuthority();
          return { dir, reused_request: active, file: null };
        }
        throw new Error(
          "buy_void_request_active_destination_changed_during_lock",
        );
      }
    }

    const json = REQUEST_HISTORY_JSON_STRINGIFY_V1(reqObj);
    const ledger = path.join(pinnedDir, "requests.jsonl");
    const file = path.join(pinnedDir, reqObj.request_id + ".json");
    // Qualify both existing destinations before the first append. Refuse
    // any group/other-readable history rather than publishing new secrets.
    assertPrivateRequestDirV1(dir);
    const ledgerBefore = assertPrivateRequestLeafV1(ledger);
    if ((heldHistory.identity === null && ledgerBefore !== null) ||
        (heldHistory.identity !== null &&
         (ledgerBefore === null ||
          !sameHistoryFileV1(heldHistory.identity, ledgerBefore)))) {
      holdHistoryV1("journal_leaf_changed_after_read");
    }
    const sidecarBefore = assertPrivateRequestLeafV1(file);
    // New obligations must never truncate a surviving orphan sidecar whose
    // request ID is not in the canonical journal. Such a file is evidence
    // of loss/rollback or an interloper, not a blank slot for a new sale.
    if (!txHashRevision && sidecarBefore !== null) {
      holdHistoryV1("new_request_orphan_sidecar");
    }
    if (typeof fs.constants.O_NOFOLLOW !== "number") {
      holdHistoryV1("private_no_follow_unavailable");
    }
    if (txHashRevision) {
      // Preserve existing buyer evidence: a different sidecar and original
      // journal row must never be overwritten by the first tx-hash revision.
      // Verify original bytes BEFORE the journal append and retain this same
      // writable FD into the eventual revision publication.
      if (sidecarBefore === null || originalRevisionRow === null) {
        holdHistoryV1("operator_revision_original_sidecar_missing");
      }
      const originalBytes = Buffer.from(
        REQUEST_HISTORY_JSON_STRINGIFY_V1(originalRevisionRow, null, 2),
        "utf8",
      );
      if (originalBytes.length < 1 ||
          originalBytes.length > REQUEST_HISTORY_MAX_BYTES_V1) {
        holdHistoryV1("operator_revision_original_sidecar_size_invalid");
      }
      revisionSidecarFd = fs.openSync(file,
        fs.constants.O_RDWR | fs.constants.O_NOFOLLOW);
      const pinnedRevision = assertPrivateSidecarIdentityV1(
        file, revisionSidecarFd, sidecarBefore,
      );
      assertPrivateSidecarContentsAtSuccessV1(
        file, revisionSidecarFd, pinnedRevision, originalBytes,
      );
      assertCurrentAuthority();
      assertPinnedPrivateRequestDirV1(dir, dirFd);
    }
    assertPinnedPrivateRequestDirV1(dir, dirFd);
    // Refuse a post-preflight same-UID orphan BEFORE the economic journal
    // append. O_CREAT|O_EXCL atomically reserves this exact request leaf and
    // prevents a later ordinary open from replacing a newly appeared sidecar.
    // A crash at this point may leave an empty private reservation sidecar:
    // that uncertainty remains a HOLD, not automatic payment recovery.
    if (!txHashRevision) {
      try {
        reservedNewSidecarFd = fs.openSync(file,
          fs.constants.O_RDWR | fs.constants.O_CREAT |
          fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
      } catch (error: any) {
        if (error?.code === "EEXIST") {
          holdHistoryV1("sidecar_appeared_before_create");
        }
        throw error;
      }
      const reserved = assertPrivateSidecarIdentityV1(
        file, reservedNewSidecarFd, null,
      );
      if (reserved.size !== 0n) {
        holdHistoryV1("sidecar_reservation_not_empty");
      }
      assertPinnedPrivateRequestDirV1(dir, dirFd);
    }
    // Last synchronous admission check: no await may intervene.
    assertCurrentAuthority();
    if (journalFd === null) {
      // Fresh-generation O_EXCL forbids a new inode that appeared after
      // strict ENOENT history qualification. Never append to it.
      try {
        journalFd = fs.openSync(ledger, fs.constants.O_WRONLY |
          fs.constants.O_APPEND | fs.constants.O_CREAT |
          fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
      } catch (error: any) {
        if (error?.code === "EEXIST") {
          holdHistoryV1("journal_appeared_before_exclusive_create");
        }
        throw error;
      }
    }
    const journalOpened = assertPrivateOpenLeafV1(journalFd);
    if ((heldHistory.identity &&
         !sameHistoryFileV1(heldHistory.identity, journalOpened)) ||
        (!heldHistory.identity && journalOpened.size !== 0n)) {
      holdHistoryV1("journal_open_identity_changed");
    }
    // The verified FD is retained during both the following append and
    // the sidecar publication; pathname substitution can only cause HOLD.
    let journalVisible: fs.BigIntStats;
    try { journalVisible = fs.lstatSync(ledger, { bigint: true }); }
    catch { holdHistoryV1("journal_visible_unavailable_before_append"); }
    if (!sameHistoryFileV1(journalOpened, journalVisible)) {
      holdHistoryV1("journal_visible_identity_changed");
    }
    fs.writeFileSync(journalFd, json + "\n");
    fs.fsyncSync(journalFd);
    const journalAfter = fs.fstatSync(journalFd, { bigint: true });
    try { journalVisible = fs.lstatSync(ledger, { bigint: true }); }
    catch { holdHistoryV1("journal_visible_unavailable_after_append"); }
    if (!sameHistoryFileV1(journalAfter, journalVisible)) {
      holdHistoryV1("journal_visible_identity_changed");
    }
    // The legacy sidecar is still non-atomic relative to the journal.
    // Avoid O_CREAT for an existing verified inode, and require O_EXCL
    // when preflight found no file. No replaced child may be truncated.
    // Retain a *readable* descriptor until canonical bytes are authenticated
    // at the last successful publication boundary, not just after fsync.
    const canonicalSidecarBytes = Buffer.from(
      REQUEST_HISTORY_JSON_STRINGIFY_V1(reqObj, null, 2), "utf8",
    );
    if (canonicalSidecarBytes.length < 1 ||
        canonicalSidecarBytes.length > REQUEST_HISTORY_MAX_BYTES_V1) {
      holdHistoryV1("published_sidecar_size_invalid");
    }
    let sidecarFd: number;
    try {
      // For operator revisions the exactly authenticated original descriptor
      // has stayed open from before journal append. Do not reopen a pathname.
      if (revisionSidecarFd !== null) {
        sidecarFd = revisionSidecarFd;
        revisionSidecarFd = null;
      } else if (reservedNewSidecarFd !== null) {
        sidecarFd = reservedNewSidecarFd;
        reservedNewSidecarFd = null;
      } else {
        holdHistoryV1("sidecar_publication_reservation_missing");
      }
    } catch (error: any) {
      if (!sidecarBefore && error?.code === "EEXIST") {
        holdHistoryV1("sidecar_appeared_before_create");
      }
      throw error;
    }
    let sidecarOpened: fs.BigIntStats;
    let sidecarPostwrite: fs.BigIntStats;
    try {
      sidecarOpened = assertPrivateSidecarIdentityV1(
        file, sidecarFd, sidecarBefore,
      );
      fs.ftruncateSync(sidecarFd, 0);
      fs.writeFileSync(sidecarFd, canonicalSidecarBytes);
      fs.fsyncSync(sidecarFd);
      sidecarPostwrite = assertPrivateOpenLeafV1(sidecarFd);
      if (sidecarPostwrite.size !== BigInt(canonicalSidecarBytes.length)) {
        holdHistoryV1("published_sidecar_short_write");
      }
      // A late same-UID pathname swap must not produce a success receipt.
      assertPrivateSidecarStillVisibleV1(file, sidecarOpened);
    // Keep the verified sidecar FD live across parent directory fsync and
    // journal success checks. Both a new checkout and an operator revision
    // must re-read *those same bytes* before returning success.
    // File fsyncs alone do not persist newly created directory entries.
    // Interrupted journal/sidecar updates still require recovery review.
    fs.fsyncSync(dirFd);
    assertPinnedPrivateRequestDirV1(dir, dirFd);
    assertPrivateSidecarStillVisibleV1(file, sidecarOpened!);
    let journalAtSuccess: fs.BigIntStats;
    try { journalAtSuccess = fs.lstatSync(ledger, { bigint: true }); }
    catch { holdHistoryV1("journal_visible_unavailable_at_success"); }
    if (!sameHistoryFileV1(journalAfter,
          fs.fstatSync(journalFd, { bigint: true })) ||
        !sameHistoryFileV1(journalAfter, journalAtSuccess)) {
      holdHistoryV1("journal_visible_identity_changed");
    }
    assertPrivateSidecarContentsAtSuccessV1(
      file, sidecarFd, sidecarPostwrite, canonicalSidecarBytes,
    );
    return { dir, file: path.join(dir, reqObj.request_id + ".json"),
      reused_request: null };
    } finally {
      try { fs.closeSync(sidecarFd); }
      catch { holdHistoryV1("published_sidecar_close_uncertain"); }
    }
    } finally {
      // A failed revision-sidecar close must not bypass journal cleanup.
      // Preserve fail-closed ownership uncertainty while always attempting
      // closure of the independently retained original journal descriptor.
      try {
        if (reservedNewSidecarFd !== null) {
          try { fs.closeSync(reservedNewSidecarFd); }
          catch { holdHistoryV1("reserved_new_sidecar_close_uncertain"); }
        }
      } finally {
        try {
          if (revisionSidecarFd !== null) {
            try { fs.closeSync(revisionSidecarFd); }
            catch { holdHistoryV1("revision_original_sidecar_close_uncertain"); }
          }
        } finally {
          if (journalFd !== null) {
            try { fs.closeSync(journalFd); }
            catch { holdHistoryV1("journal_descriptor_close_uncertain"); }
          }
        }
      }
    }
    } finally {
      fs.closeSync(dirFd);
    }
  });
}
