#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const REGISTRY_PATH = 'docs/repo-map-v1.json';
export const INDEX_REGISTRY_PATH = 'docs/index-map-v1.json';
export const MARKER = 'VOID_REPO_CARTOGRAPHY_V1';
export const RESOLVED_MARKER = 'VOID_REPO_CARTOGRAPHY_RESOLVED_V1';
export const SNAPSHOT_KIND = 'pinned_git_commit_tree';
export const GIT_EXECUTABLE_ENV = 'VOID_REPO_CARTOGRAPHY_GIT_EXECUTABLE';
export const GIT_EXECUTABLE_SHA256_ENV = 'VOID_REPO_CARTOGRAPHY_GIT_EXECUTABLE_SHA256';

const DOMAIN_ID_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const SELECTOR_TYPES = new Set(['exact', 'prefix']);
const GIT_OBJECT_RE = /^[0-9a-f]{40}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const GIT_REPOSITORY_SELECTION_ENV = new Set([
  'GIT_DIR',
  'GIT_WORK_TREE',
  'GIT_COMMON_DIR',
  'GIT_INDEX_FILE',
  'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES',
  'GIT_NAMESPACE',
  'GIT_REPLACE_REF_BASE',
]);
const GIT_CONFIG_INJECTION_ENV = new Set([
  'GIT_CONFIG_PARAMETERS',
  'GIT_CONFIG_COUNT',
]);
const GIT_PROGRAM_OVERRIDE_ENV = new Set([
  'GIT_EXEC_PATH',
  'GIT_SSH',
  'GIT_SSH_COMMAND',
  'GIT_ASKPASS',
  'SSH_ASKPASS',
  'GIT_EXTERNAL_DIFF',
  'GIT_PAGER',
  'GIT_EDITOR',
  'GIT_SEQUENCE_EDITOR',
]);

function fail(message) {
  throw new Error(`VOID_REPO_CARTOGRAPHY_V1 ${message}`);
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sameGitExecutableIdentity(a, b) {
  return (
    a.path === b.path &&
    a.sha256 === b.sha256 &&
    a.filesystem_identity_sha256 === b.filesystem_identity_sha256
  );
}

export function inspectReviewedGitExecutable(baseEnv = process.env) {
  const configuredPath = baseEnv[GIT_EXECUTABLE_ENV];
  const expectedSha256 = baseEnv[GIT_EXECUTABLE_SHA256_ENV];

  if (typeof configuredPath !== 'string' || !configuredPath) {
    fail(`git_executable_required env=${GIT_EXECUTABLE_ENV}`);
  }
  if (!path.isAbsolute(configuredPath)) {
    fail(`git_executable_must_be_absolute observed=${configuredPath}`);
  }
  if (typeof expectedSha256 !== 'string' || !SHA256_RE.test(expectedSha256)) {
    fail(`git_executable_sha256_invalid env=${GIT_EXECUTABLE_SHA256_ENV}`);
  }

  let canonicalPath;
  let stat;
  let bytes;
  try {
    canonicalPath = fs.realpathSync(configuredPath);
    stat = fs.statSync(canonicalPath);
    bytes = fs.readFileSync(canonicalPath);
  } catch {
    fail(`git_executable_unreadable path=${configuredPath}`);
  }
  if (!path.isAbsolute(canonicalPath)) fail('git_executable_realpath_not_absolute');
  if (!stat.isFile()) fail(`git_executable_not_regular path=${canonicalPath}`);
  if ((stat.mode & 0o111) === 0) fail(`git_executable_not_executable path=${canonicalPath}`);

  const digest = sha256(bytes);
  if (digest !== expectedSha256) {
    fail(`git_executable_sha256_mismatch expected=${expectedSha256} observed=${digest}`);
  }
  const filesystemIdentity = sha256(
    [
      canonicalPath,
      String(stat.dev),
      String(stat.ino),
      String(stat.size),
      String(stat.mode & 0o7777),
    ].join('\0'),
  );
  return {
    path: canonicalPath,
    sha256: digest,
    filesystem_identity_sha256: filesystemIdentity,
  };
}

export function sanitizedGitEnv(
  baseEnv = process.env,
  reviewedGitExecutablePath = null,
) {
  const env = { ...baseEnv };
  for (const key of GIT_REPOSITORY_SELECTION_ENV) delete env[key];
  for (const key of GIT_CONFIG_INJECTION_ENV) delete env[key];
  for (const key of GIT_PROGRAM_OVERRIDE_ENV) delete env[key];
  for (const key of Object.keys(env)) {
    if (/^GIT_CONFIG_(?:KEY|VALUE)_\d+$/.test(key)) delete env[key];
  }
  if (reviewedGitExecutablePath !== null) {
    if (!path.isAbsolute(reviewedGitExecutablePath)) {
      fail('reviewed_git_executable_path_not_absolute');
    }
    env.PATH = path.dirname(reviewedGitExecutablePath);
  }
  return env;
}

export function git(repoRoot, args, options = {}) {
  const baseEnv = options.env ?? process.env;
  const before = inspectReviewedGitExecutable(baseEnv);
  const output = execFileSync(
    before.path,
    ['--no-replace-objects', '-C', repoRoot, ...args],
    {
      encoding: Object.prototype.hasOwnProperty.call(options, 'encoding')
        ? options.encoding
        : 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 128 * 1024 * 1024,
      env: sanitizedGitEnv(baseEnv, before.path),
    },
  );
  const after = inspectReviewedGitExecutable(baseEnv);
  if (!sameGitExecutableIdentity(before, after)) {
    fail('git_executable_identity_changed_during_read');
  }
  return output;
}

export function findRepoRoot(start = process.cwd()) {
  try {
    return git(start, ['rev-parse', '--show-toplevel']).trim();
  } catch {
    fail(`repository_root_unavailable start=${start}`);
  }
}

export function readCanonicalJson(repoRoot, relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  let bytes;
  try {
    bytes = fs.readFileSync(absolute);
  } catch {
    fail(`required_file_unreadable path=${relativePath}`);
  }
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail(`invalid_json path=${relativePath}`);
  }
  return { value, bytes };
}

function parseJsonBytes(bytes, relativePath) {
  let value;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    fail(`invalid_json path=${relativePath}`);
  }
  return { value, bytes };
}

export function readCommitBytes(repoRoot, commitSha, relativePath) {
  if (!GIT_OBJECT_RE.test(commitSha)) {
    fail(`source_commit_invalid observed=${String(commitSha)}`);
  }
  let bytes;
  try {
    bytes = git(repoRoot, ['show', `${commitSha}:${relativePath}`], {
      encoding: null,
    });
  } catch {
    fail(`required_commit_file_unreadable commit=${commitSha} path=${relativePath}`);
  }
  if (!Buffer.isBuffer(bytes)) {
    fail(`required_commit_file_not_bytes path=${relativePath}`);
  }
  return bytes;
}

export function readCommitJson(repoRoot, commitSha, relativePath) {
  return parseJsonBytes(
    readCommitBytes(repoRoot, commitSha, relativePath),
    relativePath,
  );
}

export function validateRegistry(registry, indexRegistry) {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    fail('registry_shape_invalid');
  }
  if (registry.marker !== MARKER) {
    fail(`registry_marker_invalid observed=${String(registry.marker)}`);
  }
  if (registry.version !== 1) {
    fail(`registry_version_invalid observed=${String(registry.version)}`);
  }
  if (
    !registry.contract ||
    typeof registry.contract !== 'object' ||
    Array.isArray(registry.contract)
  ) {
    fail('registry_contract_invalid');
  }
  if (!Array.isArray(registry.domains) || registry.domains.length === 0) {
    fail('registry_domains_invalid');
  }

  const ids = new Set();
  for (const domain of registry.domains) {
    if (!domain || typeof domain !== 'object' || Array.isArray(domain)) {
      fail('domain_shape_invalid');
    }
    if (typeof domain.id !== 'string' || !DOMAIN_ID_RE.test(domain.id)) {
      fail(`domain_id_invalid observed=${String(domain.id)}`);
    }
    if (ids.has(domain.id)) fail(`duplicate_domain_id id=${domain.id}`);
    ids.add(domain.id);
    if (typeof domain.area !== 'string' || !domain.area.trim()) {
      fail(`domain_area_invalid id=${domain.id}`);
    }
    if (typeof domain.purpose !== 'string' || !domain.purpose.trim()) {
      fail(`domain_purpose_invalid id=${domain.id}`);
    }
    if (!Array.isArray(domain.selectors) || domain.selectors.length === 0) {
      fail(`domain_selectors_invalid id=${domain.id}`);
    }
    for (const selector of domain.selectors) {
      if (!selector || typeof selector !== 'object' || Array.isArray(selector)) {
        fail(`selector_shape_invalid id=${domain.id}`);
      }
      if (!SELECTOR_TYPES.has(selector.type)) {
        fail(`selector_type_invalid id=${domain.id} type=${String(selector.type)}`);
      }
      if (
        typeof selector.value !== 'string' ||
        !selector.value ||
        selector.value.startsWith('/') ||
        selector.value.includes('..')
      ) {
        fail(`selector_value_invalid id=${domain.id} value=${String(selector.value)}`);
      }
      if (typeof selector.required !== 'boolean') {
        fail(`selector_required_invalid id=${domain.id}`);
      }
    }
    for (const field of [
      'aliases',
      'related_domains',
      'index_landmarks',
      'authority_surfaces',
    ]) {
      if (
        !Array.isArray(domain[field]) ||
        domain[field].some((x) => typeof x !== 'string' || !x.trim())
      ) {
        fail(`domain_${field}_invalid id=${domain.id}`);
      }
    }
    if (
      !domain.discovery_prefixes ||
      typeof domain.discovery_prefixes !== 'object' ||
      Array.isArray(domain.discovery_prefixes)
    ) {
      fail(`domain_discovery_prefixes_invalid id=${domain.id}`);
    }
    for (const field of ['proofs', 'workflows', 'docs']) {
      const values = domain.discovery_prefixes[field];
      if (
        !Array.isArray(values) ||
        values.some(
          (x) =>
            typeof x !== 'string' ||
            !x ||
            x.startsWith('/') ||
            x.includes('..'),
        )
      ) {
        fail(`domain_discovery_${field}_invalid id=${domain.id}`);
      }
    }
  }

  for (const domain of registry.domains) {
    for (const related of domain.related_domains) {
      if (!ids.has(related)) {
        fail(`unknown_related_domain id=${domain.id} related=${related}`);
      }
      if (related === domain.id) fail(`self_related_domain id=${domain.id}`);
    }
  }

  if (
    !indexRegistry ||
    typeof indexRegistry !== 'object' ||
    !Array.isArray(indexRegistry.landmarks)
  ) {
    fail('index_registry_invalid');
  }
  const landmarkIds = new Set(
    indexRegistry.landmarks
      .map((x) => x?.id)
      .filter((x) => typeof x === 'string'),
  );
  for (const domain of registry.domains) {
    for (const landmark of domain.index_landmarks) {
      if (!landmarkIds.has(landmark)) {
        fail(`unknown_index_landmark id=${domain.id} landmark=${landmark}`);
      }
    }
  }
  return { domainIds: ids, landmarkIds };
}

export function readTrackedTree(repoRoot, commitSha) {
  if (!GIT_OBJECT_RE.test(commitSha)) {
    fail(`source_commit_invalid observed=${String(commitSha)}`);
  }
  let output;
  try {
    output = git(repoRoot, ['ls-tree', '-r', '-z', '--full-tree', commitSha]);
  } catch {
    fail(`git_ls_tree_failed commit=${commitSha}`);
  }
  const entries = [];
  for (const row of output.split('\0')) {
    if (!row) continue;
    const tab = row.indexOf('\t');
    if (tab < 0) fail('git_ls_tree_row_invalid');
    const meta = row.slice(0, tab).split(' ');
    if (meta.length !== 3) fail('git_ls_tree_meta_invalid');
    const [mode, type, object] = meta;
    if (type !== 'blob' && type !== 'commit') {
      fail(`git_ls_tree_type_invalid type=${type}`);
    }
    if (!GIT_OBJECT_RE.test(object)) {
      fail(`git_ls_tree_object_invalid path=${row.slice(tab + 1)}`);
    }
    entries.push({ path: row.slice(tab + 1), mode, blob: object });
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  return entries;
}

export function matchesSelector(filePath, selector) {
  if (selector.type === 'exact') return filePath === selector.value;
  if (selector.type === 'prefix') return filePath.startsWith(selector.value);
  fail(`selector_type_unreachable type=${String(selector.type)}`);
}

export function selectorEvidence(entries, selector, domainId) {
  const matches = entries.filter((entry) =>
    matchesSelector(entry.path, selector),
  );
  if (selector.required && matches.length === 0) {
    fail(`required_selector_missing id=${domainId} type=${selector.type} value=${selector.value}`);
  }
  const identityPayload = matches
    .map((entry) => `${entry.path}\0${entry.blob}\n`)
    .join('');
  return {
    type: selector.type,
    value: selector.value,
    required: selector.required,
    match_count: matches.length,
    tracked_identity_sha256: sha256(identityPayload),
    matches,
  };
}

function matchPrefixes(entries, prefixes) {
  const paths = new Set();
  for (const prefix of prefixes) {
    for (const entry of entries) {
      if (entry.path.startsWith(prefix)) paths.add(entry.path);
    }
  }
  return [...paths].sort();
}

export function resolveDomain(
  entries,
  domain,
  { includeMatches = true } = {},
) {
  const selectors = domain.selectors.map((selector) =>
    selectorEvidence(entries, selector, domain.id),
  );
  const canonicalByPath = new Map();
  for (const selector of selectors) {
    for (const entry of selector.matches) {
      canonicalByPath.set(entry.path, entry);
    }
  }
  const canonicalEntries = [...canonicalByPath.values()].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
  const canonicalIdentity = canonicalEntries
    .map((entry) => `${entry.path}\0${entry.blob}\n`)
    .join('');

  const discovery = {};
  for (const category of ['proofs', 'workflows', 'docs']) {
    const matches = matchPrefixes(
      entries,
      domain.discovery_prefixes[category],
    );
    discovery[category] = {
      prefixes: domain.discovery_prefixes[category],
      match_count: matches.length,
      path_list_sha256: sha256(matches.join('\n')),
      ...(includeMatches ? { matches } : {}),
    };
  }

  return {
    id: domain.id,
    area: domain.area,
    purpose: domain.purpose,
    aliases: domain.aliases,
    selectors: selectors.map(({ matches, ...rest }) => rest),
    canonical_match_count: canonicalEntries.length,
    canonical_identity_sha256: sha256(canonicalIdentity),
    ...(includeMatches
      ? {
          canonical_matches: canonicalEntries.map((entry) => entry.path),
        }
      : {}),
    related_domains: domain.related_domains,
    index_landmarks: domain.index_landmarks,
    authority_surfaces: domain.authority_surfaces,
    discovery,
  };
}

export function buildResolvedMap({
  repoRoot = findRepoRoot(),
  registryOverride = null,
  indexRegistryOverride = null,
  includeMatches = false,
  _testOnlyAfterHeadPinned = null,
} = {}) {
  const gitIdentityBefore = inspectReviewedGitExecutable();
  let head;
  try {
    head = git(
      repoRoot,
      ['rev-parse', '--verify', 'HEAD^{commit}'],
    ).trim();
  } catch {
    fail('source_head_unavailable');
  }
  if (!GIT_OBJECT_RE.test(head)) {
    fail(`source_commit_invalid observed=${String(head)}`);
  }

  if (_testOnlyAfterHeadPinned !== null) {
    if (typeof _testOnlyAfterHeadPinned !== 'function') {
      fail('test_hook_invalid');
    }
    _testOnlyAfterHeadPinned({ repoRoot, head });
  }

  let tree;
  try {
    tree = git(repoRoot, ['rev-parse', `${head}^{tree}`]).trim();
  } catch {
    fail(`source_tree_unavailable commit=${head}`);
  }
  if (!GIT_OBJECT_RE.test(tree)) {
    fail(`source_tree_invalid observed=${String(tree)}`);
  }

  const registryRead = registryOverride
    ? {
        value: registryOverride,
        bytes: Buffer.from(JSON.stringify(registryOverride)),
      }
    : readCommitJson(repoRoot, head, REGISTRY_PATH);
  const indexRead = indexRegistryOverride
    ? {
        value: indexRegistryOverride,
        bytes: Buffer.from(JSON.stringify(indexRegistryOverride)),
      }
    : readCommitJson(repoRoot, head, INDEX_REGISTRY_PATH);
  validateRegistry(registryRead.value, indexRead.value);
  const entries = readTrackedTree(repoRoot, head);
  const domains = registryRead.value.domains.map((domain) =>
    resolveDomain(entries, domain, { includeMatches }),
  );
  const sourceSnapshotBound =
    registryOverride === null && indexRegistryOverride === null;

  const gitIdentityAfter = inspectReviewedGitExecutable();
  if (!sameGitExecutableIdentity(gitIdentityBefore, gitIdentityAfter)) {
    fail('git_executable_identity_changed_during_snapshot');
  }

  return {
    marker: RESOLVED_MARKER,
    version: 1,
    source_commit_sha: head,
    source_tree_sha: tree,
    source_snapshot_kind: SNAPSHOT_KIND,
    source_snapshot_bound: sourceSnapshotBound,
    git_executable_path: gitIdentityBefore.path,
    git_executable_sha256: gitIdentityBefore.sha256,
    git_executable_filesystem_identity_sha256:
      gitIdentityBefore.filesystem_identity_sha256,
    git_executable_identity_bound: true,
    tracked_file_count: entries.length,
    registry_path: REGISTRY_PATH,
    registry_sha256: sha256(registryRead.bytes),
    index_registry_path: INDEX_REGISTRY_PATH,
    index_registry_sha256: sha256(indexRead.bytes),
    domain_count: domains.length,
    source_mutation_performed: false,
    domains,
  };
}

export function renderMarkdown(resolved) {
  const lines = [];
  lines.push('# VOID Repository Cartography');
  lines.push('');
  lines.push(`- source commit: \`${resolved.source_commit_sha}\``);
  lines.push(`- source tree: \`${resolved.source_tree_sha}\``);
  lines.push(`- source snapshot: \`${resolved.source_snapshot_kind}\``);
  lines.push(`- source snapshot bound: ${resolved.source_snapshot_bound}`);
  lines.push(`- reviewed Git executable: \`${resolved.git_executable_path}\``);
  lines.push(`- reviewed Git SHA-256: \`${resolved.git_executable_sha256}\``);
  lines.push(`- reviewed Git identity bound: ${resolved.git_executable_identity_bound}`);
  lines.push(`- tracked files: ${resolved.tracked_file_count}`);
  lines.push(`- domains: ${resolved.domain_count}`);
  lines.push(`- registry SHA-256: \`${resolved.registry_sha256}\``);
  lines.push('');
  lines.push(
    '| Domain | Area | Canonical files | Proofs | Workflows | Docs | Purpose |',
  );
  lines.push('|---|---:|---:|---:|---:|---:|---|');
  for (const domain of resolved.domains) {
    lines.push(
      `| \`${domain.id}\` | ${domain.area} | ${domain.canonical_match_count} | ${domain.discovery.proofs.match_count} | ${domain.discovery.workflows.match_count} | ${domain.discovery.docs.match_count} | ${domain.purpose.replaceAll('|', '\\|')} |`,
    );
  }
  lines.push('');
  lines.push(
    'Generated evidence only. File counts, identities, registry bytes, locations, and Git executable identity belong to the one reviewed execution boundary and pinned source commit/tree above.',
  );
  return `${lines.join('\n')}\n`;
}

function parseCli(argv) {
  let format = 'json';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--format') {
      format = argv[++i];
      continue;
    }
    if (arg === '--help' || arg === '-h') return { help: true };
    fail(`unknown_argument arg=${arg}`);
  }
  if (!['json', 'markdown'].includes(format)) {
    fail(`format_invalid value=${String(format)}`);
  }
  return { format, help: false };
}

function printHelp() {
  process.stdout.write(
    `Usage: ${GIT_EXECUTABLE_ENV}=/absolute/path/to/git ${GIT_EXECUTABLE_SHA256_ENV}=<sha256> node scripts/generate_void_repo_cartography_v1.mjs [--format json|markdown]\n`,
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
      const resolved = buildResolvedMap();
      if (args.format === 'json') {
        process.stdout.write(`${JSON.stringify(resolved, null, 2)}\n`);
      } else {
        process.stdout.write(renderMarkdown(resolved));
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
