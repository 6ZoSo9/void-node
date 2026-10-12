#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildResolvedMap, findRepoRoot } from './generate_void_repo_cartography_v1.mjs';

export const SECTION_MARKER = 'VOID_REPO_SECTION_REVIEW_V1';
const DOMAIN_ID_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

function fail(message) {
  throw new Error(`VOID_REPO_SECTION_REVIEW_V1 ${message}`);
}

export function bounded(paths, limit) {
  return {
    total: paths.length,
    shown: Math.min(paths.length, limit),
    truncated: paths.length > limit,
    paths: paths.slice(0, limit),
  };
}

export function buildDomainSection({
  repoRoot = findRepoRoot(),
  domainId,
  limit = 25,
  _testOnlyAfterHeadPinned = null,
} = {}) {
  if (typeof domainId !== 'string' || !DOMAIN_ID_RE.test(domainId)) {
    fail(`domain_id_invalid value=${String(domainId)}`);
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    fail(`limit_invalid value=${String(limit)}`);
  }

  const resolved = buildResolvedMap({
    repoRoot,
    includeMatches: true,
    _testOnlyAfterHeadPinned,
  });
  if (!resolved.source_snapshot_bound) fail('source_snapshot_unbound');
  if (resolved.git_executable_identity_bound !== true) {
    fail('git_executable_identity_unbound');
  }
  const domain = resolved.domains.find((candidate) => candidate.id === domainId);
  if (!domain) fail(`unknown_domain id=${domainId}`);

  const related = domain.related_domains.map((id) => {
    const target = resolved.domains.find((candidate) => candidate.id === id);
    if (!target) fail(`related_domain_resolution_failed id=${id}`);
    return {
      id: target.id,
      area: target.area,
      purpose: target.purpose,
      canonical_match_count: target.canonical_match_count,
    };
  });

  return {
    marker: SECTION_MARKER,
    version: 1,
    source_commit_sha: resolved.source_commit_sha,
    source_tree_sha: resolved.source_tree_sha,
    source_snapshot_kind: resolved.source_snapshot_kind,
    source_snapshot_bound: resolved.source_snapshot_bound,
    git_executable_path: resolved.git_executable_path,
    git_executable_sha256: resolved.git_executable_sha256,
    git_executable_filesystem_identity_sha256:
      resolved.git_executable_filesystem_identity_sha256,
    git_executable_identity_bound: resolved.git_executable_identity_bound,
    registry_sha256: resolved.registry_sha256,
    domain: {
      id: domain.id,
      area: domain.area,
      purpose: domain.purpose,
      aliases: domain.aliases,
      authority_surfaces: domain.authority_surfaces,
      selectors: domain.selectors,
      canonical_identity_sha256: domain.canonical_identity_sha256,
      canonical_files: bounded(domain.canonical_matches, limit),
      discovery: {
        proofs: bounded(domain.discovery.proofs.matches, limit),
        workflows: bounded(domain.discovery.workflows.matches, limit),
        docs: bounded(domain.discovery.docs.matches, limit),
      },
      index_landmarks: domain.index_landmarks,
      related_domains: related,
    },
    arbitrary_registry_path_allowed: false,
    arbitrary_repository_path_allowed: false,
    source_mutation_performed: false,
  };
}

export function renderText(section) {
  const d = section.domain;
  const lines = [];
  lines.push(`VOID repo directory: ${d.id}`);
  lines.push(`purpose: ${d.purpose}`);
  lines.push(`area: ${d.area}`);
  lines.push(`source: ${section.source_commit_sha}`);
  lines.push(`source snapshot: ${section.source_snapshot_kind}`);
  lines.push(`reviewed git: ${section.git_executable_path}`);
  lines.push(`reviewed git sha256: ${section.git_executable_sha256}`);
  lines.push(
    `authority surfaces: ${d.authority_surfaces.length ? d.authority_surfaces.join(', ') : 'none'}`,
  );
  if (d.aliases.length) lines.push(`aliases: ${d.aliases.join(', ')}`);
  if (d.index_landmarks.length) {
    lines.push(`src/index.ts landmarks: ${d.index_landmarks.join(', ')}`);
  }
  lines.push('');

  const emit = (title, group) => {
    lines.push(
      `${title} (${group.shown}/${group.total}${group.truncated ? ', truncated' : ''})`,
    );
    if (group.paths.length === 0) lines.push('  - none');
    else for (const p of group.paths) lines.push(`  - ${p}`);
    lines.push('');
  };

  emit('canonical files', d.canonical_files);
  emit('proofs', d.discovery.proofs);
  emit('workflows', d.discovery.workflows);
  emit('docs', d.discovery.docs);

  lines.push('related domains');
  if (d.related_domains.length === 0) lines.push('  - none');
  else {
    for (const r of d.related_domains) {
      lines.push(`  - ${r.id}: ${r.purpose}`);
    }
  }
  lines.push('');
  lines.push(
    'Navigation evidence only; authority labels do not grant permission or prove runtime activation.',
  );
  return `${lines.join('\n')}\n`;
}

function parseCli(argv) {
  let domainId = null;
  let format = 'text';
  let limit = 25;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--domain') {
      domainId = argv[++i];
      continue;
    }
    if (arg === '--limit') {
      const raw = argv[++i];
      if (!/^\d+$/.test(raw ?? '')) {
        fail(`limit_invalid value=${String(raw)}`);
      }
      limit = Number(raw);
      continue;
    }
    if (arg === '--format') {
      format = argv[++i];
      continue;
    }
    if (arg === '--help' || arg === '-h') return { help: true };
    fail(`unknown_argument arg=${arg}`);
  }
  if (!domainId) fail('domain_required');
  if (!['text', 'json'].includes(format)) {
    fail(`format_invalid value=${String(format)}`);
  }
  return { help: false, domainId, format, limit };
}

function printHelp() {
  process.stdout.write(
    'Usage: node scripts/review_void_repo_section_v1.mjs --domain <stable-id> [--limit 25] [--format text|json]\n',
  );
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  try {
    const args = parseCli(process.argv.slice(2));
    if (args.help) printHelp();
    else {
      const section = buildDomainSection({
        domainId: args.domainId,
        limit: args.limit,
      });
      if (args.format === 'json') {
        process.stdout.write(`${JSON.stringify(section, null, 2)}\n`);
      } else {
        process.stdout.write(renderText(section));
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
