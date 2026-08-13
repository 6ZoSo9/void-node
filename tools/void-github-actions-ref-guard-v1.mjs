#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MARKER = 'VOID_GITHUB_ACTIONS_REF_GUARD_V1';

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

function parseUsesValue(line) {
  const match = line.match(/^\s*(?:-\s*)?uses\s*:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))/);
  if (!match) return null;
  return (match[1] ?? match[2] ?? match[3] ?? '').trim();
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

    if (/^\s*[^#][^:]*:\s*[>|][0-9+-]*\s*(?:#.*)?$/.test(line)) {
      scalarIndent = indent;
      continue;
    }

    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const ref = parseUsesValue(line);
    if (!ref) continue;
    const classification = classifyUsesRef(ref);
    entries.push({ line: index + 1, ref, ...classification });
  }
  return entries;
}

function mutableCounts(entries) {
  const counts = new Map();
  for (const entry of entries) {
    if (!entry.mutable) continue;
    counts.set(entry.ref, (counts.get(entry.ref) ?? 0) + 1);
  }
  return counts;
}

export function auditActionRefDelta({ cwd = process.cwd(), base, head }) {
  const baseSha = resolveCommit(cwd, base);
  const headSha = resolveCommit(cwd, head);
  const diff = git(cwd, [
    'diff', '--name-status', '-z', '-M', baseSha, headSha, '--', '.github/workflows',
  ]).stdout;
  const changes = parseNameStatusZ(diff);
  const changed = [];
  const newMutableRefs = [];
  let legacyMutableRefsObserved = 0;

  for (const change of changes) {
    if (change.code === 'D') continue;
    const basePath = change.code === 'R' ? change.oldPath : change.code === 'A' || change.code === 'C' ? null : change.oldPath;
    const headPath = change.newPath;
    const baseEntries = extractUsesRefs(readGitFile(cwd, baseSha, basePath));
    const headEntries = extractUsesRefs(readGitFile(cwd, headSha, headPath));
    const baseMutable = mutableCounts(baseEntries);
    const seenHead = new Map();

    legacyMutableRefsObserved += [...baseMutable.values()].reduce((sum, n) => sum + n, 0);
    for (const entry of headEntries) {
      if (!entry.mutable) continue;
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
