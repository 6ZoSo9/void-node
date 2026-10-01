// @ts-nocheck
import crypto from "node:crypto";

export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_V1 =
  "VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_V1";
export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_ROOT_V1 =
  "VOID_FIXED_KEY_EXACT_MEMBERSHIP_ROOT_V1";
export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_CODEC_V1 =
  "void.fixed-key-exact-membership.page.v1";

export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_BYTES_V1 = 8_192;
export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_KEY_BYTES_V1 = 32;
export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_VALUE_BYTES_V1 = 256;
export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_INDEX_DEPTH_V1 = 64;
export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_PAGE_READS_V1 = 65;

// A minimum leaf entry is 32-byte key + 2-byte value length + 1-byte value.
// A one-entry overflow can therefore contain at most 233 entries. A
// path-compressed radix tree over N leaves has at most N-1 branching internal
// pages. Add at most 64 rewritten ancestors above an overflowing leaf:
// 2*233-1+64 = 529. Keep one spare page in the source-pinned bound.
export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_PAGE_WRITES_PER_INSERT_V1 =
  530;

export const VOID_FIXED_KEY_EXACT_MEMBERSHIP_AUTHORITY_V1 =
  Object.freeze({
    source_only: true,
    domain_neutral: true,
    fixed_32_byte_key: true,
    bounded_exact_value: true,
    content_addressed_pages: true,
    exact_found_absent_lookup: true,
    probabilistic_membership_authority: false,
    bounded_page_reads: true,
    bounded_page_writes_per_insert: true,
    original_value_collision_check: true,
    domain_separated_roots: true,
    predecessor_root_binding: true,
    source_generation_identity_binding: true,
    filesystem_read: false,
    filesystem_write: false,
    accepted_root_publication: false,
    runtime_integration: false,
    worker_effect_authority: false,
    wc_authority: false,
    transaction_authority: false,
    funds_movement: false,
  });

const PAGE_MAGIC = Buffer.from("VEM1","ascii");
const PAGE_TYPE_INTERNAL = 0;
const PAGE_TYPE_LEAF = 1;
const PAGE_HEADER_BYTES = 40;
const DIGEST_BYTES = 32;
const KEY_BYTES = VOID_FIXED_KEY_EXACT_MEMBERSHIP_KEY_BYTES_V1;
const VALUE_LENGTH_BYTES = 2;
const MIN_VALUE_BYTES = 1;
const MIN_LEAF_ENTRY_BYTES =
  KEY_BYTES + VALUE_LENGTH_BYTES + MIN_VALUE_BYTES;
const MAX_LEAF_ENTRIES = Math.floor(
  (VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_BYTES_V1 - PAGE_HEADER_BYTES) /
    MIN_LEAF_ENTRY_BYTES,
);
const MAX_U64 = (1n << 64n) - 1n;
const HEX64 = /^[0-9a-f]{64}$/u;
const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const DOMAIN = /^[a-z0-9][a-z0-9._:-]{0,63}$/u;
const CANONICAL_UINT = /^(0|[1-9][0-9]*)$/u;

export type FixedKeyExactMembershipLeafEntryV1 = {
  key_sha256: string;
  value: Buffer;
};

type InternalChildV1 = {
  nibble: number;
  digest: string;
};

type DecodedInternalPageV1 = {
  type: "internal";
  prefix_length: number;
  prefix: Buffer;
  children: InternalChildV1[];
};

type DecodedLeafPageV1 = {
  type: "leaf";
  prefix_length: number;
  prefix: Buffer;
  entries: FixedKeyExactMembershipLeafEntryV1[];
};

export type FixedKeyExactMembershipDecodedPageV1 =
  | DecodedInternalPageV1
  | DecodedLeafPageV1;

export type FixedKeyExactMembershipLookupV1 = {
  found: boolean;
  page_reads: number;
  value: Buffer | null;
};

export type FixedKeyExactMembershipInsertV1 = {
  status: "inserted" | "duplicate";
  root_sha256: string;
  new_pages: Array<{ sha256: string; bytes: Buffer }>;
  existing_value: Buffer | null;
};

export type FixedKeyExactMembershipRootV1 = {
  v: 1;
  format: typeof VOID_FIXED_KEY_EXACT_MEMBERSHIP_ROOT_V1;
  domain: string;
  index_generation: number;
  previous_root_sha256: string | null;
  source_generation_identity: string;
  entry_count: string;
  patricia_root_sha256: string;
  page_codec: typeof VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_CODEC_V1;
  root_sha256: string;
};

function fail(code: string, detail = ""): never {
  throw new Error(
    VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_V1 +
      ":" + code + (detail ? ":" + detail : ""),
  );
}

function sha256Bytes(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requireHex64(value: unknown, code: string): string {
  const text = String(value ?? "");
  if (!HEX64.test(text)) fail(code,text || "empty");
  return text;
}

function keyBytes(value: unknown): Buffer {
  return Buffer.from(requireHex64(value,"INVALID_KEY_SHA256"),"hex");
}

function valueBytes(value: unknown): Buffer {
  if (!Buffer.isBuffer(value)) fail("INVALID_VALUE_BYTES","not-buffer");
  const out = Buffer.from(value);
  if (
    out.length < 1 ||
    out.length > VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_VALUE_BYTES_V1
  ) {
    fail("INVALID_VALUE_BYTES",String(out.length));
  }
  return out;
}

function canonicalUint(value: unknown, code: string): string {
  const text = String(value ?? "");
  if (!CANONICAL_UINT.test(text)) fail(code,text || "empty");
  let parsed: bigint;
  try { parsed=BigInt(text); } catch { fail(code,text); }
  if (parsed < 0n || parsed > MAX_U64) fail(code,text);
  return text;
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("NON_CANONICAL_NUMBER",String(value));
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string,unknown>;
    return "{" + Object.keys(record).sort().map(
      (key)=>JSON.stringify(key)+":"+canonicalJson(record[key]),
    ).join(",") + "}";
  }
  fail("NON_CANONICAL_VALUE",typeof value);
}

function exactKeys(
  value: Record<string,unknown>,
  expected: readonly string[],
  code: string,
): void {
  const actual=Object.keys(value).sort();
  const wanted=[...expected].sort();
  if (
    actual.length!==wanted.length ||
    actual.some((key,index)=>key!==wanted[index])
  ) {
    fail(code,actual.join(","));
  }
}

function nibbleAt(bytes: Buffer,index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= 64) {
    fail("INVALID_NIBBLE_INDEX",String(index));
  }
  const byte=bytes[index >> 1];
  return (index & 1)===0 ? (byte >> 4) & 0x0f : byte & 0x0f;
}

function canonicalPrefixFromKey(key: Buffer,length: number): Buffer {
  if (!Number.isInteger(length) || length < 0 || length > 64) {
    fail("INVALID_PREFIX_LENGTH",String(length));
  }
  const out=Buffer.alloc(32,0);
  const whole=Math.floor(length / 2);
  if (whole > 0) key.copy(out,0,0,whole);
  if ((length & 1)===1) out[whole]=key[whole] & 0xf0;
  return out;
}

function assertCanonicalPrefix(prefix: Buffer,length: number): void {
  if (prefix.length!==32) fail("INVALID_PREFIX_BYTES",String(prefix.length));
  if (!Number.isInteger(length) || length < 0 || length > 64) {
    fail("INVALID_PREFIX_LENGTH",String(length));
  }
  const used=Math.ceil(length / 2);
  if (
    (length & 1)===1 &&
    used > 0 &&
    (prefix[used-1] & 0x0f)!==0
  ) {
    fail("NON_CANONICAL_PREFIX_LOW_NIBBLE",String(length));
  }
  for(let index=used; index<prefix.length; index+=1) {
    if(prefix[index]!==0) {
      fail("NON_CANONICAL_PREFIX_PADDING",length+":"+index);
    }
  }
}

function keyMatchesPrefix(
  key: Buffer,
  prefix: Buffer,
  length: number,
): boolean {
  for(let index=0; index<length; index+=1) {
    if(nibbleAt(key,index)!==nibbleAt(prefix,index)) return false;
  }
  return true;
}

function commonPrefixLength(keys: Buffer[]): number {
  if(keys.length===0) return 0;
  for(let index=0; index<64; index+=1) {
    const nibble=nibbleAt(keys[0],index);
    if(keys.some((key)=>nibbleAt(key,index)!==nibble)) return index;
  }
  return 64;
}

function normalizeEntry(
  input: FixedKeyExactMembershipLeafEntryV1,
): FixedKeyExactMembershipLeafEntryV1 {
  if (!input || typeof input!=="object") fail("INVALID_LEAF_ENTRY","not-object");
  return {
    key_sha256: requireHex64(input.key_sha256,"INVALID_KEY_SHA256"),
    value: valueBytes(input.value),
  };
}

function pageHeader(
  type: number,
  prefixLength: number,
  meta: number,
  prefix: Buffer,
): Buffer {
  assertCanonicalPrefix(prefix,prefixLength);
  if (!Number.isInteger(meta) || meta < 0 || meta > 0xffff) {
    fail("INVALID_PAGE_META",String(meta));
  }
  const header=Buffer.alloc(PAGE_HEADER_BYTES,0);
  PAGE_MAGIC.copy(header,0);
  header[4]=type;
  header[5]=prefixLength;
  header.writeUInt16BE(meta,6);
  prefix.copy(header,8);
  return header;
}

export function encodeFixedKeyExactMembershipLeafPageV1(
  entriesInput: FixedKeyExactMembershipLeafEntryV1[],
): Buffer {
  if(!Array.isArray(entriesInput)) fail("INVALID_LEAF_ENTRIES","not-array");
  if(entriesInput.length > MAX_LEAF_ENTRIES) {
    fail("LEAF_CAPACITY_EXCEEDED",String(entriesInput.length));
  }
  const entries=entriesInput
    .map(normalizeEntry)
    .sort((a,b)=>a.key_sha256.localeCompare(b.key_sha256));
  for(let index=1; index<entries.length; index+=1) {
    if(entries[index-1].key_sha256===entries[index].key_sha256) {
      fail("DUPLICATE_LEAF_KEY",entries[index].key_sha256);
    }
  }
  const keys=entries.map((entry)=>keyBytes(entry.key_sha256));
  const prefixLength=commonPrefixLength(keys);
  const prefix=entries.length===0
    ? Buffer.alloc(32,0)
    : canonicalPrefixFromKey(keys[0],prefixLength);
  const chunks=[pageHeader(PAGE_TYPE_LEAF,prefixLength,entries.length,prefix)];
  for(const entry of entries) {
    const length=Buffer.alloc(2);
    length.writeUInt16BE(entry.value.length,0);
    chunks.push(keyBytes(entry.key_sha256),length,entry.value);
  }
  const body=Buffer.concat(chunks);
  if(body.length > VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_BYTES_V1) {
    fail("PAGE_TOO_LARGE",String(body.length));
  }
  return body;
}

function encodeInternalPage(
  prefix: Buffer,
  prefixLength: number,
  childrenInput: InternalChildV1[],
): Buffer {
  if(!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength >= 64) {
    fail("INVALID_INTERNAL_PREFIX_LENGTH",String(prefixLength));
  }
  assertCanonicalPrefix(prefix,prefixLength);
  const children=[...childrenInput].sort((a,b)=>a.nibble-b.nibble);
  if(children.length < 2 || children.length > 16) {
    fail("INVALID_INTERNAL_CHILD_COUNT",String(children.length));
  }
  let bitmap=0;
  for(const child of children) {
    if(!Number.isInteger(child.nibble) || child.nibble < 0 || child.nibble > 15) {
      fail("INVALID_CHILD_NIBBLE",String(child.nibble));
    }
    if((bitmap & (1 << child.nibble))!==0) {
      fail("DUPLICATE_CHILD_NIBBLE",String(child.nibble));
    }
    requireHex64(child.digest,"INVALID_CHILD_DIGEST");
    bitmap |= 1 << child.nibble;
  }
  const body=Buffer.concat([
    pageHeader(PAGE_TYPE_INTERNAL,prefixLength,bitmap,prefix),
    ...children.map((child)=>Buffer.from(child.digest,"hex")),
  ]);
  if(body.length > VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_BYTES_V1) {
    fail("PAGE_TOO_LARGE",String(body.length));
  }
  return body;
}

export function decodeFixedKeyExactMembershipPageV1(
  bytesInput: Buffer,
): FixedKeyExactMembershipDecodedPageV1 {
  const bytes=Buffer.from(bytesInput);
  if(
    bytes.length < PAGE_HEADER_BYTES ||
    bytes.length > VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_BYTES_V1
  ) {
    fail("INVALID_PAGE_BYTES",String(bytes.length));
  }
  if(!bytes.subarray(0,4).equals(PAGE_MAGIC)) {
    fail("INVALID_PAGE_MAGIC",bytes.subarray(0,4).toString("hex"));
  }
  const type=bytes[4];
  const prefixLength=bytes[5];
  const meta=bytes.readUInt16BE(6);
  const prefix=Buffer.from(bytes.subarray(8,40));
  assertCanonicalPrefix(prefix,prefixLength);

  if(type===PAGE_TYPE_LEAF) {
    if(meta > MAX_LEAF_ENTRIES) {
      fail("LEAF_CAPACITY_EXCEEDED",String(meta));
    }
    const entries: FixedKeyExactMembershipLeafEntryV1[]=[];
    let offset=PAGE_HEADER_BYTES;
    for(let index=0; index<meta; index+=1) {
      if(offset + KEY_BYTES + VALUE_LENGTH_BYTES > bytes.length) {
        fail("INVALID_LEAF_PAGE_LENGTH",String(bytes.length));
      }
      const key=bytes.subarray(offset,offset+KEY_BYTES).toString("hex");
      offset += KEY_BYTES;
      const valueLength=bytes.readUInt16BE(offset);
      offset += VALUE_LENGTH_BYTES;
      if(
        valueLength < 1 ||
        valueLength > VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_VALUE_BYTES_V1 ||
        offset + valueLength > bytes.length
      ) {
        fail("INVALID_LEAF_VALUE_LENGTH",String(valueLength));
      }
      const value=Buffer.from(bytes.subarray(offset,offset+valueLength));
      offset += valueLength;
      entries.push({key_sha256:key,value});
    }
    if(offset!==bytes.length) {
      fail("INVALID_LEAF_PAGE_LENGTH",bytes.length+":"+offset);
    }
    for(let index=1; index<entries.length; index+=1) {
      if(entries[index-1].key_sha256 >= entries[index].key_sha256) {
        fail("NON_CANONICAL_LEAF_ORDER",String(index));
      }
    }
    if(entries.length===0) {
      if(prefixLength!==0 || !prefix.equals(Buffer.alloc(32,0))) {
        fail("INVALID_EMPTY_LEAF_PREFIX",String(prefixLength));
      }
    } else {
      const keys=entries.map((entry)=>keyBytes(entry.key_sha256));
      const exactLength=commonPrefixLength(keys);
      const exactPrefix=canonicalPrefixFromKey(keys[0],exactLength);
      if(prefixLength!==exactLength || !prefix.equals(exactPrefix)) {
        fail("NON_CANONICAL_LEAF_PREFIX",String(prefixLength));
      }
    }
    return {type:"leaf",prefix_length:prefixLength,prefix,entries};
  }

  if(type===PAGE_TYPE_INTERNAL) {
    if(prefixLength>=64) {
      fail("INVALID_INTERNAL_PREFIX_LENGTH",String(prefixLength));
    }
    let count=0;
    for(let nibble=0; nibble<16; nibble+=1) {
      if((meta & (1 << nibble))!==0) count+=1;
    }
    if(count<2) fail("INVALID_INTERNAL_CHILD_COUNT",String(count));
    const expectedLength=PAGE_HEADER_BYTES + count * DIGEST_BYTES;
    if(bytes.length!==expectedLength) {
      fail("INVALID_INTERNAL_PAGE_LENGTH",bytes.length+":"+expectedLength);
    }
    const children: InternalChildV1[]=[];
    let offset=PAGE_HEADER_BYTES;
    for(let nibble=0; nibble<16; nibble+=1) {
      if((meta & (1 << nibble))===0) continue;
      children.push({
        nibble,
        digest:bytes.subarray(offset,offset+DIGEST_BYTES).toString("hex"),
      });
      offset += DIGEST_BYTES;
    }
    return {type:"internal",prefix_length:prefixLength,prefix,children};
  }

  fail("INVALID_PAGE_TYPE",String(type));
}

export function fixedKeyExactMembershipPageSha256V1(bytes: Buffer): string {
  decodeFixedKeyExactMembershipPageV1(bytes);
  return sha256Bytes(bytes);
}

export function fixedKeyExactMembershipKeySha256V1(
  exactValue: Buffer | string,
): string {
  const bytes=Buffer.isBuffer(exactValue)
    ? Buffer.from(exactValue)
    : Buffer.from(String(exactValue),"utf8");
  if(
    bytes.length < 1 ||
    bytes.length > VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_VALUE_BYTES_V1
  ) {
    fail("INVALID_VALUE_BYTES",String(bytes.length));
  }
  return sha256Bytes(bytes);
}

export function createEmptyFixedKeyExactMembershipIndexV1(): {
  root_sha256: string;
  page: Buffer;
} {
  const page=encodeFixedKeyExactMembershipLeafPageV1([]);
  return {
    root_sha256:fixedKeyExactMembershipPageSha256V1(page),
    page,
  };
}

function readVerifiedPage(
  digestInput: string,
  readPage: (sha256: string)=>Buffer,
): FixedKeyExactMembershipDecodedPageV1 {
  const digest=requireHex64(digestInput,"INVALID_PAGE_DIGEST");
  const bytes=Buffer.from(readPage(digest));
  if(sha256Bytes(bytes)!==digest) fail("PAGE_DIGEST_MISMATCH",digest);
  return decodeFixedKeyExactMembershipPageV1(bytes);
}

function childFor(page: DecodedInternalPageV1,nibble: number): string | null {
  return page.children.find((child)=>child.nibble===nibble)?.digest ?? null;
}

function assertChildRelation(
  parent: DecodedInternalPageV1,
  nibble: number,
  child: FixedKeyExactMembershipDecodedPageV1,
): void {
  if(child.prefix_length<=parent.prefix_length) {
    fail("CHILD_PREFIX_NOT_DEEPER",String(child.prefix_length));
  }
  if(!keyMatchesPrefix(child.prefix,parent.prefix,parent.prefix_length)) {
    fail("CHILD_PREFIX_PARENT_MISMATCH",String(nibble));
  }
  if(nibbleAt(child.prefix,parent.prefix_length)!==nibble) {
    fail("CHILD_PREFIX_SLOT_MISMATCH",String(nibble));
  }
}

export function lookupFixedKeyExactMembershipIndexV1(
  rootSha256: string,
  keySha256: string,
  readPage: (sha256: string)=>Buffer,
): FixedKeyExactMembershipLookupV1 {
  const key=keyBytes(keySha256);
  let digest=requireHex64(rootSha256,"INVALID_PAGE_DIGEST");
  let parent: DecodedInternalPageV1 | null=null;
  let parentNibble=-1;
  let reads=0;

  for(;;) {
    reads+=1;
    if(reads > VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_PAGE_READS_V1) {
      fail("INDEX_DEPTH_EXCEEDED",String(reads));
    }
    const page=readVerifiedPage(digest,readPage);
    if(parent) assertChildRelation(parent,parentNibble,page);
    if(!keyMatchesPrefix(key,page.prefix,page.prefix_length)) {
      return {found:false,page_reads:reads,value:null};
    }
    if(page.type==="leaf") {
      const keyText=key.toString("hex");
      const entry=page.entries.find(
        (candidate)=>candidate.key_sha256===keyText,
      ) ?? null;
      return {
        found:entry!==null,
        page_reads:reads,
        value:entry ? Buffer.from(entry.value) : null,
      };
    }
    const nibble=nibbleAt(key,page.prefix_length);
    const child=childFor(page,nibble);
    if(!child) return {found:false,page_reads:reads,value:null};
    parent=page;
    parentNibble=nibble;
    digest=child;
  }
}

function addNewPage(newPages: Map<string,Buffer>,bytes: Buffer): string {
  const digest=fixedKeyExactMembershipPageSha256V1(bytes);
  const existing=newPages.get(digest);
  if(existing && !existing.equals(bytes)) {
    fail("PAGE_DIGEST_COLLISION",digest);
  }
  newPages.set(digest,Buffer.from(bytes));
  if(
    newPages.size >
      VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_PAGE_WRITES_PER_INSERT_V1
  ) {
    fail("INSERT_PAGE_WRITE_BOUND_EXCEEDED",String(newPages.size));
  }
  return digest;
}

function leafFits(
  entries: FixedKeyExactMembershipLeafEntryV1[],
): boolean {
  if(entries.length > MAX_LEAF_ENTRIES) return false;
  try {
    encodeFixedKeyExactMembershipLeafPageV1(entries);
    return true;
  } catch(error) {
    const message=String((error as Error)?.message || error);
    if(message.includes(":PAGE_TOO_LARGE:") ||
       message.includes(":LEAF_CAPACITY_EXCEEDED:")) return false;
    throw error;
  }
}

function buildSubtree(
  entriesInput: FixedKeyExactMembershipLeafEntryV1[],
  newPages: Map<string,Buffer>,
  depth=0,
): string {
  if(depth > VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_INDEX_DEPTH_V1) {
    fail("INDEX_DEPTH_EXCEEDED",String(depth));
  }
  const entries=entriesInput.map(normalizeEntry);
  if(entries.length<1) fail("EMPTY_SUBTREE","0");
  const unique=new Set(entries.map((entry)=>entry.key_sha256));
  if(unique.size!==entries.length) fail("DUPLICATE_LEAF_KEY","subtree");

  if(leafFits(entries)) {
    return addNewPage(
      newPages,
      encodeFixedKeyExactMembershipLeafPageV1(entries),
    );
  }

  const keys=entries.map((entry)=>keyBytes(entry.key_sha256));
  const splitPrefixLength=commonPrefixLength(keys);
  if(splitPrefixLength>=64) fail("UNSPLITTABLE_LEAF",String(splitPrefixLength));
  const groups=new Map<number,FixedKeyExactMembershipLeafEntryV1[]>();
  for(const entry of entries) {
    const nibble=nibbleAt(keyBytes(entry.key_sha256),splitPrefixLength);
    const group=groups.get(nibble) ?? [];
    group.push(entry);
    groups.set(nibble,group);
  }
  if(groups.size<2) fail("UNSPLITTABLE_LEAF",String(splitPrefixLength));

  const children: InternalChildV1[]=[];
  for(const [nibble,group] of [...groups.entries()].sort((a,b)=>a[0]-b[0])) {
    children.push({
      nibble,
      digest:buildSubtree(group,newPages,depth+1),
    });
  }
  return addNewPage(
    newPages,
    encodeInternalPage(
      canonicalPrefixFromKey(keys[0],splitPrefixLength),
      splitPrefixLength,
      children,
    ),
  );
}

function insertion(
  digest: string,
  entry: FixedKeyExactMembershipLeafEntryV1,
  readPage: (sha256: string)=>Buffer,
  newPages: Map<string,Buffer>,
  pageReads: number,
  parent: DecodedInternalPageV1 | null=null,
  parentNibble=-1,
): {
  status:"inserted"|"duplicate";
  digest:string;
  existing:Buffer|null;
} {
  if(pageReads >= VOID_FIXED_KEY_EXACT_MEMBERSHIP_MAX_PAGE_READS_V1) {
    fail("INDEX_DEPTH_EXCEEDED",String(pageReads));
  }
  const page=readVerifiedPage(digest,readPage);
  if(parent) assertChildRelation(parent,parentNibble,page);
  const key=keyBytes(entry.key_sha256);

  if(page.type==="leaf") {
    const existing=page.entries.find(
      (candidate)=>candidate.key_sha256===entry.key_sha256,
    ) ?? null;
    if(existing) {
      if(!existing.value.equals(entry.value)) {
        fail("INDEX_KEY_VALUE_CONFLICT",entry.key_sha256);
      }
      return {
        status:"duplicate",
        digest,
        existing:Buffer.from(existing.value),
      };
    }
    const combined=[...page.entries,entry];
    if(leafFits(combined)) {
      return {
        status:"inserted",
        digest:addNewPage(
          newPages,
          encodeFixedKeyExactMembershipLeafPageV1(combined),
        ),
        existing:null,
      };
    }
    return {
      status:"inserted",
      digest:buildSubtree(combined,newPages),
      existing:null,
    };
  }

  if(!keyMatchesPrefix(key,page.prefix,page.prefix_length)) {
    let common=0;
    for(; common<page.prefix_length; common+=1) {
      if(nibbleAt(key,common)!==nibbleAt(page.prefix,common)) break;
    }
    if(common>=page.prefix_length) {
      fail("INTERNAL_PREFIX_INSERT_STATE",String(common));
    }
    const leafDigest=addNewPage(
      newPages,
      encodeFixedKeyExactMembershipLeafPageV1([entry]),
    );
    const oldNibble=nibbleAt(page.prefix,common);
    const newNibble=nibbleAt(key,common);
    if(oldNibble===newNibble) {
      fail("INTERNAL_PREFIX_SPLIT_COLLISION",String(common));
    }
    return {
      status:"inserted",
      digest:addNewPage(
        newPages,
        encodeInternalPage(
          canonicalPrefixFromKey(key,common),
          common,
          [
            {nibble:oldNibble,digest},
            {nibble:newNibble,digest:leafDigest},
          ],
        ),
      ),
      existing:null,
    };
  }

  const nibble=nibbleAt(key,page.prefix_length);
  const childDigest=childFor(page,nibble);
  if(!childDigest) {
    const leafDigest=addNewPage(
      newPages,
      encodeFixedKeyExactMembershipLeafPageV1([entry]),
    );
    return {
      status:"inserted",
      digest:addNewPage(
        newPages,
        encodeInternalPage(
          page.prefix,
          page.prefix_length,
          [...page.children,{nibble,digest:leafDigest}],
        ),
      ),
      existing:null,
    };
  }

  const childResult=insertion(
    childDigest,
    entry,
    readPage,
    newPages,
    pageReads+1,
    page,
    nibble,
  );
  if(childResult.status==="duplicate") {
    return {
      status:"duplicate",
      digest,
      existing:childResult.existing,
    };
  }
  const nextChildren=page.children.map((child)=>
    child.nibble===nibble
      ? {nibble,digest:childResult.digest}
      : child
  );
  return {
    status:"inserted",
    digest:addNewPage(
      newPages,
      encodeInternalPage(page.prefix,page.prefix_length,nextChildren),
    ),
    existing:childResult.existing,
  };
}

export function insertFixedKeyExactMembershipIndexV1(
  rootSha256: string,
  keySha256: string,
  exactValue: Buffer,
  readPageInput: (sha256: string)=>Buffer,
): FixedKeyExactMembershipInsertV1 {
  const root=requireHex64(rootSha256,"INVALID_PAGE_DIGEST");
  const entry=normalizeEntry({
    key_sha256:keySha256,
    value:exactValue,
  });
  const newPages=new Map<string,Buffer>();
  const readPage=(digest: string): Buffer =>
    newPages.get(digest) ?? readPageInput(digest);
  const result=insertion(root,entry,readPage,newPages,0);
  return {
    status:result.status,
    root_sha256:result.digest,
    new_pages:[...newPages.entries()].map(([sha256,bytes])=>({
      sha256,
      bytes:Buffer.from(bytes),
    })),
    existing_value:result.existing ? Buffer.from(result.existing) : null,
  };
}

function normalizedRootMaterial(input: {
  domain: unknown;
  index_generation: unknown;
  previous_root_sha256: unknown;
  source_generation_identity: unknown;
  entry_count: unknown;
  patricia_root_sha256: unknown;
}): Omit<FixedKeyExactMembershipRootV1,"root_sha256"> {
  const domain=String(input.domain ?? "");
  if(!DOMAIN.test(domain)) fail("INVALID_ROOT_DOMAIN",domain || "empty");
  const generation=Number(input.index_generation);
  if(
    !Number.isSafeInteger(generation) ||
    generation < 1 ||
    generation > Number.MAX_SAFE_INTEGER
  ) {
    fail("INVALID_INDEX_GENERATION",String(input.index_generation));
  }
  const previous=input.previous_root_sha256===null
    ? null
    : requireHex64(input.previous_root_sha256,"INVALID_PREVIOUS_ROOT_SHA256");
  if((generation===1)!==(previous===null)) {
    fail("INVALID_PREDECESSOR_GENERATION",String(generation));
  }
  const source=String(input.source_generation_identity ?? "");
  if(!SHA256_ID.test(source)) {
    fail("INVALID_SOURCE_GENERATION_IDENTITY",source || "empty");
  }
  const entryCount=canonicalUint(input.entry_count,"INVALID_ENTRY_COUNT");
  return {
    v:1,
    format:VOID_FIXED_KEY_EXACT_MEMBERSHIP_ROOT_V1,
    domain,
    index_generation:generation,
    previous_root_sha256:previous,
    source_generation_identity:source,
    entry_count:entryCount,
    patricia_root_sha256:requireHex64(
      input.patricia_root_sha256,
      "INVALID_PATRICIA_ROOT_SHA256",
    ),
    page_codec:VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_CODEC_V1,
  };
}

export function createFixedKeyExactMembershipRootV1(input: {
  domain:string;
  index_generation:number;
  previous_root_sha256:string|null;
  source_generation_identity:string;
  entry_count:string|number|bigint;
  patricia_root_sha256:string;
}): FixedKeyExactMembershipRootV1 {
  const material=normalizedRootMaterial(input);
  return Object.freeze({
    ...material,
    root_sha256:sha256Bytes(canonicalJson(material)),
  });
}

export function verifyFixedKeyExactMembershipRootV1(
  input: FixedKeyExactMembershipRootV1,
): FixedKeyExactMembershipRootV1 {
  if(!input || typeof input!=="object" || Array.isArray(input)) {
    fail("INVALID_ROOT","not-object");
  }
  exactKeys(input as unknown as Record<string,unknown>,[
    "v",
    "format",
    "domain",
    "index_generation",
    "previous_root_sha256",
    "source_generation_identity",
    "entry_count",
    "patricia_root_sha256",
    "page_codec",
    "root_sha256",
  ],"INVALID_ROOT_KEYS");
  if(
    input.v!==1 ||
    input.format!==VOID_FIXED_KEY_EXACT_MEMBERSHIP_ROOT_V1 ||
    input.page_codec!==VOID_FIXED_KEY_EXACT_MEMBERSHIP_PAGE_CODEC_V1
  ) {
    fail("INVALID_ROOT","marker");
  }
  const material=normalizedRootMaterial(input);
  const digest=sha256Bytes(canonicalJson(material));
  if(requireHex64(input.root_sha256,"INVALID_ROOT_SHA256")!==digest) {
    fail("ROOT_DIGEST_MISMATCH",digest);
  }
  return Object.freeze({...material,root_sha256:digest});
}
