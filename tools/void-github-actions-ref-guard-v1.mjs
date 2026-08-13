#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MARKER = 'VOID_GITHUB_ACTIONS_REF_GUARD_V1';
const UNPARSED_USES_REF = '<unparsed-uses-syntax>';

function git(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`git ${args[0]} failed${detail ? `: ${detail}` : ''}`);
  }
  return result;
}

function resolveCommit(cwd, ref) {
  if (typeof ref !== 'string' || ref.length === 0 || ref.length > 512 || ref.includes('\0')) {
    throw new Error('base/head ref must be a non-empty bounded string');
  }
  return git(cwd, ['rev-parse', '--verify', `${ref}^{commit}`]).stdout.trim().toLowerCase();
}

function parseNameStatusZ(raw) {
  const fields = raw.split('\0');
  if (fields.at(-1) === '') fields.pop();
  const changes = [];
  for (let i = 0; i < fields.length;) {
    const status = fields[i++];
    if (!status) throw new Error('malformed git name-status output');
    const code = status[0];
    if (code === 'R' || code === 'C') {
      const oldPath = fields[i++];
      const newPath = fields[i++];
      if (!oldPath || !newPath) throw new Error('malformed rename/copy record');
      changes.push({ status, code, oldPath, newPath });
    } else {
      const path = fields[i++];
      if (!path) throw new Error('malformed path record');
      changes.push({ status, code, oldPath: code === 'A' ? null : path, newPath: code === 'D' ? null : path });
    }
  }
  return changes;
}

function readGitFile(cwd, commit, path) {
  if (!path) return '';
  const result = git(cwd, ['show', `${commit}:${path}`], { allowFailure: true });
  if (result.status !== 0) return '';
  return result.stdout;
}

function indentation(line) {
  const match = line.match(/^[ \t]*/);
  return match ? match[0].replace(/\t/g, '        ').length : 0;
}

function skipSpace(line, index) {
  let cursor = index;
  while (cursor < line.length && /[ \t]/.test(line[cursor])) cursor += 1;
  return cursor;
}

function parseQuotedScalar(line, index) {
  const quote = line[index];
  let value = '';
  let cursor = index + 1;
  const escapes = {
    '0': '\0',
    a: '\x07',
    b: '\b',
    t: '\t',
    n: '\n',
    v: '\v',
    f: '\f',
    r: '\r',
    e: '\x1b',
    ' ': ' ',
    '"': '"',
    '/': '/',
    '\\': '\\',
    N: '\u0085',
    _: '\u00a0',
    L: '\u2028',
    P: '\u2029',
  };

  while (cursor < line.length) {
    const ch = line[cursor];
    if (quote === "'") {
      if (ch === "'") {
        if (line[cursor + 1] === "'") {
          value += "'";
          cursor += 2;
          continue;
        }
        return { value, end: cursor + 1, closed: true };
      }
      value += ch;
      cursor += 1;
      continue;
    }

    if (ch === '"') return { value, end: cursor + 1, closed: true };
    if (ch !== '\\') {
      value += ch;
      cursor += 1;
      continue;
    }

    const escape = line[cursor + 1];
    if (escape === 'x' || escape === 'u' || escape === 'U') {
      const width = escape === 'x' ? 2 : escape === 'u' ? 4 : 8;
      const digits = line.slice(cursor + 2, cursor + 2 + width);
      if (digits.length !== width || !/^[0-9a-fA-F]+$/.test(digits)) {
        return { value, end: line.length, closed: false };
      }
      const codePoint = Number.parseInt(digits, 16);
      try {
        value += String.fromCodePoint(codePoint);
      } catch {
        return { value, end: line.length, closed: false };
      }
      cursor += 2 + width;
      continue;
    }
    if (!Object.hasOwn(escapes, escape)) {
      return { value, end: line.length, closed: false };
    }
    value += escapes[escape];
    cursor += 2;
  }
  return { value, end: line.length, closed: false };
}

function parseMappingKeyAt(line, index) {
  let cursor = skipSpace(line, index);
  if (line[cursor] === '?') cursor = skipSpace(line, cursor + 1);
  if (cursor >= line.length || line[cursor] === '#') return null;

  let key;
  if (line[cursor] === '"' || line[cursor] === "'") {
    const parsed = parseQuotedScalar(line, cursor);
    if (!parsed.closed) return { key: parsed.value, colon: null, ambiguous: true };
    key = parsed.value;
    cursor = parsed.end;
  } else {
    const match = line.slice(cursor).match(/^([^\s:#,{}\[\]]+)/);
    if (!match) return null;
    key = match[1];
    cursor += match[1].length;
  }

  cursor = skipSpace(line, cursor);
  if (line[cursor] !== ':') {
    return { key, colon: null, ambiguous: key === 'uses' };
  }
  return { key, colon: cursor, ambiguous: false };
}

function parseUsesValueAt(line, colon) {
  let cursor = skipSpace(line, colon + 1);
  if (cursor >= line.length || line[cursor] === '#' || line[cursor] === ',' || line[cursor] === '}') {
    return null;
  }

  if (line[cursor] === '"' || line[cursor] === "'") {
    const parsed = parseQuotedScalar(line, cursor);
    if (!parsed.closed || parsed.value.length === 0) return null;
    return parsed.value.trim();
  }

  const start = cursor;
  while (cursor < line.length && !/[\s#,}\]]/.test(line[cursor])) cursor += 1;
  const value = line.slice(start, cursor).trim();
  return value.length > 0 ? value : null;
}

function flowMappingStarts(line) {
  const starts = [];
  let quote = null;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index];
    if (quote === '"') {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') quote = null;
      continue;
    }
    if (quote === "'") {
      if (ch === "'" && line[index + 1] === "'") {
        index += 1;
        continue;
      }
      if (ch === "'") quote = null;
      continue;
    }
    if (ch === '#') break;
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '{' || ch === ',') starts.push(index + 1);
  }
  return starts;
}

function usesEntryFromCandidate(line, index, lineNumber) {
  const key = parseMappingKeyAt(line, index);
  if (!key || key.key !== 'uses') return null;
  if (key.colon === null || key.ambiguous) {
    return { line: lineNumber, ref: UNPARSED_USES_REF, kind: 'unparsed_uses_syntax', mutable: true };
  }
  const ref = parseUsesValueAt(line, key.colon);
  if (!ref) {
    return { line: lineNumber, ref: UNPARSED_USES_REF, kind: 'unparsed_uses_syntax', mutable: true };
  }
  const classification = classifyUsesRef(ref);
  return { line: lineNumber, ref, ...classification };
}

export function classifyUsesRef(ref) {
  if (typeof ref !== 'string' || ref.length === 0) return { kind: 'invalid', mutable: true };
  if (ref.startsWith('./') || ref === '.') return { kind: 'local', mutable: false };
  if (ref.startsWith('docker://')) {
    const at = ref.lastIndexOf('@');
    const digest = at === -1 ? '' : ref.slice(at + 1);
    const immutable = /^sha256:[0-9a-f]{64}$/i.test(digest);
    return { kind: immutable ? 'docker_digest' : 'docker_mutable', mutable: !immutable };
  }
  const at = ref.lastIndexOf('@');
  if (at <= 0 || at === ref.length - 1) return { kind: 'remote_invalid', mutable: true };
  const target = ref.slice(0, at);
  const revision = ref.slice(at + 1);
  if (!target.includes('/')) return { kind: 'remote_invalid', mutable: true };
  const immutable = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(revision);
  return { kind: immutable ? 'remote_commit' : 'remote_mutable', mutable: !immutable };
}

function blockScalarHeaderAfterColon(line, colon) {
  const rest = line.slice(colon + 1).trim();
  return /^[>|][0-9+-]*\s*(?:#.*)?$/.test(rest);
}

export function extractUsesRefs(text) {
  const entries = [];
  const lines = String(text).split(/\r?\n/);
  let scalarIndent = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const indent = indentation(line);

    if (scalarIndent !== null) {
      if (trimmed === '' || indent > scalarIndent) continue;
      scalarIndent = null;
    }

    let blockStart = skipSpace(line, 0);
    if (line[blockStart] === '-') blockStart = skipSpace(line, blockStart + 1);
    const blockKey = parseMappingKeyAt(line, blockStart);
    if (blockKey?.key === 'uses' && blockKey.colon !== null && blockScalarHeaderAfterColon(line, blockKey.colon)) {
      entries.push({
        line: index + 1,
        ref: UNPARSED_USES_REF,
        kind: 'unparsed_uses_syntax',
        mutable: true,
      });
      scalarIndent = indent;
      continue;
    }

    if (/^\s*[^#][^:]*:\s*[>|][0-9+-]*\s*(?:#.*)?$/.test(line)) {
      scalarIndent = indent;
      continue;
    }

    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const candidateStarts = [blockStart, ...flowMappingStarts(line)];
    const seenStarts = new Set();
    for (const start of candidateStarts) {
      if (seenStarts.has(start)) continue;
      seenStarts.add(start);
      const entry = usesEntryFromCandidate(line, start, index + 1);
      if (entry) entries.push(entry);
    }
  }
  return entries;
}

function mutableCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    if (!entry.mutable || entry.kind === 'unparsed_uses_syntax') continue;
    counts.set(entry.ref, (counts.get(entry.ref) ?? 0) + 1);
  }
  return counts;
}

function isAuditedActionPath(path) {
  if (!path) return false;
  if (path.startsWith('.github/workflows/')) return true;
  return /^\.github\/actions\/(?:.+\/)?action\.ya?ml$/i.test(path);
}

export function auditActionRefDelta({ cwd = process.cwd(), base, head }) {
  const baseSha = resolveCommit(cwd, base);
  const headSha = resolveCommit(cwd, head);
  const diff = git(cwd, [
    'diff', '--name-status', '-z', '-M', baseSha, headSha, '--', '.github/workflows', '.github/actions',
  ]).stdout;
  const changes = parseNameStatusZ(diff);
  const changed = [];
  const newMutableRefs = [];
  let legacyMutableRefsObserved = 0;

  for (const change of changes) {
    if (change.code === 'D') continue;
    const rawBasePath = change.code === 'R' ? change.oldPath : change.code === 'A' || change.code === 'C' ? null : change.oldPath;
    const headPath = change.newPath;
    if (!isAuditedActionPath(headPath)) continue;
    const basePath = isAuditedActionPath(rawBasePath) ? rawBasePath : null;
    const baseEntries = extractUsesRefs(readGitFile(cwd, baseSha, basePath));
    const headEntries = extractUsesRefs(readGitFile(cwd, headSha, headPath));
    const baseMutable = mutableCounts(baseEntries);
    const seenHead = new Map();

    legacyMutableRefsObserved += [...baseMutable.values()].reduce((sum, n) => sum + n, 0);
    for (const entry of headEntries) {
      if (!entry.mutable) continue;
      if (entry.kind === 'unparsed_uses_syntax') {
        newMutableRefs.push({ path: headPath, line: entry.line, uses: entry.ref, kind: entry.kind });
        continue;
      }
      const occurrence = (seenHead.get(entry.ref) ?? 0) + 1;
      seenHead.set(entry.ref, occurrence);
      if (occurrence > (baseMutable.get(entry.ref) ?? 0)) {
        newMutableRefs.push({ path: headPath, line: entry.line, uses: entry.ref, kind: entry.kind });
      }
    }

    changed.push({
      status: change.status,
      base_path: basePath,
      head_path: headPath,
      head_uses_refs: headEntries.length,
      head_mutable_refs: headEntries.filter((entry) => entry.mutable).length,
    });
  }

  const decision = newMutableRefs.length === 0 ? 'GREEN' : 'HOLD';
  return Object.freeze({
    marker: MARKER,
    version: 1,
    base_sha: baseSha,
    head_sha: headSha,
    decision,
    changed_workflows: changed,
    legacy_mutable_refs_observed: legacyMutableRefsObserved,
    new_mutable_refs: newMutableRefs,
    mutation_authority: false,
    deployment_authority: false,
    credential_authority: false,
    network_authority: false,
    economic_authority: false,
  });
}

function parseArgs(argv) {
  const out = { cwd: process.cwd(), json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (arg === '--base' || arg === '--head' || arg === '--cwd') {
      const value = argv[++i];
      if (!value) throw new Error(`${arg} requires a value`);
      out[arg.slice(2)] = value;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!out.base || !out.head) throw new Error('--base and --head are required');
  return out;
}

function printHuman(result) {
  console.log(result.marker);
  console.log(`decision=${result.decision}`);
  console.log(`base_sha=${result.base_sha}`);
  console.log(`head_sha=${result.head_sha}`);
  console.log(`changed_workflows=${result.changed_workflows.length}`);
  console.log(`legacy_mutable_refs_observed=${result.legacy_mutable_refs_observed}`);
  console.log(`new_mutable_refs=${result.new_mutable_refs.length}`);
  for (const finding of result.new_mutable_refs) {
    console.log(`HOLD ${finding.path}:${finding.line} ${finding.uses} (${finding.kind})`);
  }
}

export function main(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    const result = auditActionRefDelta(args);
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else printHuman(result);
    return result.decision === 'GREEN' ? 0 : 1;
  } catch (error) {
    console.error(`${MARKER}_ERROR: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) process.exitCode = main();
