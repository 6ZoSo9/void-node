#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1 = 'VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_V1';
export const VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_PLAN_V1 = 'VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_PLAN_V1';
export const VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1 = 'VOID_NODE_FLEET_PUBLIC_FETCH_TRANSPORT_APPLY_V1';
export const PUBLIC_FETCH_REMOTE_V1 = 'void-public-fetch';
export const PUBLIC_FETCH_URL_V1 = 'https://github.com/6ZoSo9/void-node.git';
export const PUBLIC_PUSH_URL_V1 = '/dev/null';
export const CANONICAL_ORIGIN_REPOSITORY_V1 = '6ZoSo9/void-node';
export const CANONICAL_ORIGIN_FETCH_URLS_V1 = Object.freeze([
  'https://github.com/6ZoSo9/void-node.git',
  'https://github.com/6ZoSo9/void-node',
  'git@github.com:6ZoSo9/void-node.git',
  'git@github.com:6ZoSo9/void-node',
  'ssh://git@github.com/6ZoSo9/void-node.git',
  'ssh://git@github.com/6ZoSo9/void-node',
]);

const SHA40_RE = /^[0-9a-f]{40}$/;
const SHA64_RE = /^[0-9a-f]{64}$/;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const CANONICAL_ORIGIN_FETCH_URL_SET_V1 = new Set(CANONICAL_ORIGIN_FETCH_URLS_V1);

function fail(message, mutationAttempted = false) {
  const error = new Error(message);
  error.name = 'VoidFleetPublicFetchTransportError';
  error.mutationAttempted = mutationAttempted;
  throw error;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : stableJson(value));
  return createHash('sha256').update(bytes).digest('hex');
}

function exactString(value, label) {
  if (typeof value !== 'string' || value.length === 0) fail(`${label} must be a non-empty string`);
  if (/[^\x20-\x7e]/.test(value)) fail(`${label} contains non-ASCII or control characters`);
  return value;
}

function safePath(value, label) {
  const path = exactString(value, label);
  if (path !== '.' && path !== '~' && !path.startsWith('./') && !path.startsWith('../') && !path.startsWith('~/') && !path.startsWith('/')) {
    fail(`${label} must be a local filesystem path`);
  }
  return path;
}

function expandPath(value) {
  if (value === '~') return homedir();
  if (value.startsWith('~/')) return resolve(homedir(), value.slice(2));
  return resolve(value);
}

function run(repo, args, options = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 10_000,
    maxBuffer: MAX_OUTPUT_BYTES,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
  });
  return {
    ok: result.status === 0 && !result.error,
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    error: result.error ? String(result.error.message || result.error) : '',
  };
}

function requiredRun(repo, args, label) {
  const result = run(repo, args);
  if (!result.ok) fail(`${label} failed`);
  return result.stdout;
}

function lines(stdout) {
  return stdout.split(/\r?\n/).filter((line) => line.length > 0);
}

function configValues(repo, key, localOnly = true) {
  const args = ['config'];
  if (localOnly) args.push('--local');
  args.push('--get-all', key);
  const result = run(repo, args);
  if (result.status === 1 && !result.error) return [];
  if (!result.ok) fail(`unable to read ${key}`);
  return lines(result.stdout);
}

function digestStrings(values) {
  return sha256(values.map((value) => `${value.length}:${value}`).join('\n'));
}

function effectiveRemoteFetchUrls(repo, remote) {
  const result = run(repo, ['remote', 'get-url', '--all', remote]);
  if (result.status === 2 && !result.error) return [];
  if (!result.ok) fail(`unable to resolve effective fetch URL for ${remote}`);
  return lines(result.stdout);
}

function prospectivePublicFetchUrls(repo) {
  const result = run(repo, ['ls-remote', '--get-url', PUBLIC_FETCH_URL_V1]);
  if (!result.ok) fail('unable to resolve prospective public fetch URL');
  return lines(result.stdout);
}

function worktreeStatus(repo) {
  const result = run(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (!result.ok) fail('unable to inspect worktree status');
  const bytes = Buffer.from(result.stdout, 'utf8');
  const dirtyCount = result.stdout.length === 0 ? 0 : result.stdout.split('\0').filter(Boolean).length;
  return { digest: sha256(bytes), dirty_count: dirtyCount };
}

function indexDigest(repo) {
  const gitDir = requiredRun(repo, ['rev-parse', '--absolute-git-dir'], 'resolve git dir').trim();
  const indexPath = resolve(gitDir, 'index');
  if (!existsSync(indexPath)) fail('repository index is missing');
  const stat = statSync(indexPath);
  if (!stat.isFile()) fail('repository index is not a regular file');
  if (stat.size > MAX_OUTPUT_BYTES * 8) fail('repository index is unexpectedly large');
  return sha256(readFileSync(indexPath));
}

function operationInProgress(repo) {
  const gitDir = requiredRun(repo, ['rev-parse', '--absolute-git-dir'], 'resolve git dir').trim();
  const blockers = ['index.lock', 'MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'rebase-merge', 'rebase-apply', 'sequencer'];
  return blockers.some((name) => existsSync(resolve(gitDir, name)));
}

function refsDigest(repo) {
  const output = requiredRun(repo, ['for-each-ref', '--format=%(refname)%00%(objectname)%00%(symref)'], 'inspect refs');
  return sha256(output);
}

function assertCanonicalOriginFetchV1(stored, effective) {
  if (stored.length !== 1) fail(`origin must have exactly one canonical ${CANONICAL_ORIGIN_REPOSITORY_V1} fetch URL`);
  if (!CANONICAL_ORIGIN_FETCH_URL_SET_V1.has(stored[0])) fail(`origin does not identify canonical ${CANONICAL_ORIGIN_REPOSITORY_V1}`);
  if (effective.length !== 1 || !CANONICAL_ORIGIN_FETCH_URL_SET_V1.has(effective[0])) {
    fail(`origin effective fetch URL does not identify canonical ${CANONICAL_ORIGIN_REPOSITORY_V1}`);
  }
}

function assertProspectivePublicFetchV1(effective) {
  if (effective.length !== 1 || effective[0] !== PUBLIC_FETCH_URL_V1) {
    fail('public fetch URL is rewritten by Git configuration');
  }
}

function assertDedicatedConfigIsLocalV1(repo, localFetch, localPush) {
  const allFetch = configValues(repo, `remote.${PUBLIC_FETCH_REMOTE_V1}.url`, false);
  const allPush = configValues(repo, `remote.${PUBLIC_FETCH_REMOTE_V1}.pushurl`, false);
  if (stableJson(allFetch) !== stableJson(localFetch) || stableJson(allPush) !== stableJson(localPush)) {
    fail('dedicated remote has non-local configuration');
  }
}

function classifyDedicatedRemote(fetchValues, pushValues, effectiveValues) {
  if (fetchValues.length === 0 && pushValues.length === 0 && effectiveValues.length === 0) return 'MISSING';
  if (
    fetchValues.length === 1 && fetchValues[0] === PUBLIC_FETCH_URL_V1 &&
    pushValues.length === 1 && pushValues[0] === PUBLIC_PUSH_URL_V1 &&
    effectiveValues.length === 1 && effectiveValues[0] === PUBLIC_FETCH_URL_V1
  ) return 'ALIGN²È="25tì(€½¹ÍÐÁ…å±½…€ôì(€€€µ…É­•ÈèY=%}9=}1Q}AU	1%}Q!}QI9MA=IQ}A19}XÄ°(€€€É•µ½Ñ•}¹…µ”èAU	1%}Q!}I5=Q}XÄ°(€€€™•Ñ¡}ÕÉ°èAU	1%}Q!}UI1}XÄ°(€€€ÁÕÍ¡}ÕÉ°èAU	1%}AUM!}UI1}XÄ°(€ôì(€™½È€¡½¹ÍÐ­•ä½˜­•åÌ¤Á…å±½…‘m­•åt€ôÍ¹…ÁÍ¡½Ñm­•åtì(€Á…å±½…¹½Á•É…Ñ¥½¸€ô€½¹™¥ÕÉ•}‘•‘¥…Ñ•‘}™•Ñ¡}É•µ½Ñ•}½¹±äœì(€É•ÑÕÉ¸Á…å±½…ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸‰Õ¥±‘QÉ…¹ÍÁ½ÉÑA±…¹XÄ¡Í¹…ÁÍ¡½Ð¤ì(€½¹ÍÐÁ…å±½…€ôÁ±…¹A…å±½…¡Í¹…ÁÍ¡½Ð¤ì(€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡ì€¸¸¹Á…å±½…°Á±…¹}¥‘}Í¡„ÈÔØèÍ¡„ÈÔØ¡Á…å±½…¤°µÕÑ…Ñ¥½¹}É•ÅÕ¥É•èÍ¹…ÁÍ¡½Ð¹‘•‘¥…Ñ•‘}ÍÑ…Ñ”€„ôô€1%9œô¤ì)ô()™Õ¹Ñ¥½¸¥¹Ù…É¥…¹ÑY¥•Ü¡Í¹…ÁÍ¡½Ð¤ì(€É•ÑÕÉ¸ì(€€€‰É…¹ èÍ¹…ÁÍ¡½Ð¹‰É…¹ °(€€€¡•…èÍ¹…ÁÍ¡½Ð¹¡•…°(€€€ÑÉ•”èÍ¹…ÁÍ¡½Ð¹ÑÉ•”°(€€€Ý½É­ÑÉ••}ÍÑ…ÑÕÍ}Í¡„ÈÔØèÍ¹…ÁÍ¡½Ð¹Ý½É­ÑÉ••}ÍÑ…ÑÕÍ}Í¡„ÈÔØ°(€€€‘¥ÉÑå}½Õ¹ÐèÍ¹…ÁÍ¡½Ð¹‘¥ÉÑå}½Õ¹Ð°(€€€¥¹‘•á}Í¡„ÈÔØèÍ¹…ÁÍ¡½Ð¹¥¹‘•á}Í¡„ÈÔØ°(€€€É•™Í}Í¡„ÈÔØèÍ¹…ÁÍ¡½Ð¹É•™Í}Í¡„ÈÔØ°(€€€…¹½¹¥…±}½É¥¥¹}É•ÅÕ¥É•èÍ¹…ÁÍ¡½Ð¹…¹½¹¥…±}½É¥¥¹}É•ÅÕ¥É•°(€€€½É¥¥¹}É•Á½Í¥Ñ½ÉäèÍ¹…ÁÍ¡½Ð¹½É¥¥¹}É•Á½Í¥Ñ½Éä°(€€€½É¥¥¹}™•Ñ¡}½Õ¹ÐèÍ¹…ÁÍ¡½Ð¹½É¥¥¹}™•Ñ¡}½Õ¹Ð°(€€€½É¥¥¹}™•Ñ¡}Í¡„ÈÔØèÍ¹…ÁÍ¡½Ð¹½É¥¥¹}™•Ñ¡}Í¡„ÈÔØ°(€€€½É¥¥¹}•™™•Ñ¥Ù•}™•Ñ¡}½Õ¹ÐèÍ¹…ÁÍ¡½Ð¹½É¥¥¹}•™™•Ñ¥Ù•}™•Ñ¡}½Õ¹Ð°(€€€½É¥¥¹}•™™•Ñ¥Ù•}™•Ñ¡}Í¡„ÈÔØèÍ¹…ÁÍ¡½Ð¹½É¥¥¹}•™™•Ñ¥Ù•}™•Ñ¡}Í¡„ÈÔØ°(€€€½É¥¥¹}ÁÕÍ¡}½Õ¹ÐèÍ¹…ÁÍ¡½Ð¹½É¥¥¹}ÁÕÍ¡}½Õ¹Ð°(€€€½É¥¥¹}ÁÕÍ¡}Í¡„ÈÔØèÍ¹…ÁÍ¡½Ð¹½É¥¥¹}ÁÕÍ¡}Í¡„ÈÔØ°(€€€ÁÉ½ÍÁ•Ñ¥Ù•}ÁÕ‰±¥}™•Ñ¡}½Õ¹ÐèÍ¹…ÁÍ¡½Ð¹ÁÉ½ÍÁ•Ñ¥Ù•}ÁÕ‰±¥}™•Ñ¡}½Õ¹Ð°(€€€ÁÉ½ÍÁ•Ñ¥Ù•}ÁÕ‰±¥}™•Ñ¡}Í¡„ÈÔØèÍ¹…ÁÍ¡½Ð¹ÁÉ½ÍÁ•Ñ¥Ù•}ÁÕ‰±¥}™•Ñ¡}Í¡„ÈÔØ°(€ôì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸…ÁÁ±åQÉ…¹ÍÁ½ÉÑA±…¹XÄ¡É•Á½%¹ÁÕÐ°•áÁ•Ñ•‘A±…¹%¤ì(€¥˜€ …M!ØÑ}I¹Ñ•ÍÐ¡MÑÉ¥¹œ¡•áÁ•Ñ•‘A±…¹%€üü€œœ¤¤¤™…¥° •áÁ•Ñ•Á±…¸%µÕÍÐ‰”±½Ý•É…Í”€ØÐµ¡•àœ¤ì(€½¹ÍÐ‰•™½É”€ô¥¹ÍÁ•ÑI•Á½Í¥Ñ½ÉåQÉ…¹ÍÁ½ÉÑXÄ¡É•Á½%¹ÁÕÐ¤ì(€½¹ÍÐÁ±…¸€ô‰Õ¥±‘QÉ…¹ÍÁ½ÉÑA±…¹XÄ¡‰•™½É”¤ì(€¥˜€¡Á±…¸¹Á±…¹}¥‘}Í¡„ÈÔØ€„ôô•áÁ•Ñ•‘A±…¹%¤™…¥° ÑÉ…¹ÍÁ½ÉÐÁ±…¸¡…¹•‰•™½É”…ÁÁ±äœ¤ì((€¥˜€ …Á±…¸¹µÕÑ…Ñ¥½¹}É•ÅÕ¥É•¤ì(€€€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡ì½ÕÑ½µ”è€1Ie}1%9œ°Á±…¸°µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•è™…±Í”°µÕÑ…Ñ¥½¹}ÍÕ••‘•èÑÉÕ”°…™Ñ•Èè‰•™½É”ô¤ì(€ô((€½¹ÍÐ™¥ÉÍÐ€ôÉÕ¸¡‰•™½É”¹É•Á¼°l½¹™¥œœ°€œ´µ±½…°œ°€œ´µÉ•Á±…”µ…±°œ°É•µ½Ñ”¸‘íAU	1%}Q!}I5=Q}XÅô¹ÕÉ±€°AU	1%}Q!}UI1}XÅt¤ì(€¥˜€ …™¥ÉÍÐ¹½¬¤™…¥° ™…¥±•Ñ¼Í•Ð‘•‘¥…Ñ•™•Ñ UI0ìµÕÑ…Ñ¥½¸½ÕÑ½µ”¥ÌÕ¹•ÉÑ…¥¸…¹…ÕÑ½µ…Ñ¥ŒÉ•ÑÉä¥Ì™½É‰¥‘‘•¸œ°ÑÉÕ”¤ì(€½¹ÍÐÍ•½¹€ôÉÕ¸¡‰•™½É”¹É•Á¼°l½¹™¥œœ°€œ´µ±½…°œ°€œ´µÉ•Á±…”µ…±°œ°É•µ½Ñ”¸‘íAU	1%}Q!}I5=Q}XÅô¹ÁÕÍ¡ÕÉ±€°AU	1%}AUM!}UI1}XÅt¤ì(€¥˜€ …Í•½¹¹½¬¤™…¥° ™…¥±•Ñ¼Í•Ð‘•‘¥…Ñ•ÁÕÍ UI0ìÁ…ÉÑ¥…°‘•‘¥…Ñ•µÉ•µ½Ñ”½¹™¥œµ…ä•á¥ÍÐ…¹É•ÅÕ¥É•Ì™É•Í ¥¹ÍÁ•Ñ¥½¸œ°ÑÉÕ”¤ì((€½¹ÍÐ…™Ñ•È€ô¥¹ÍÁ•ÑI•Á½Í¥Ñ½ÉåQÉ…¹ÍÁ½ÉÑXÄ¡‰•™½É”¹É•Á¼¤ì(€¥˜€¡ÍÑ…‰±•)Í½¸¡¥¹Ù…É¥…¹ÑY¥•Ü¡…™Ñ•È¤¤€„ôôÍÑ…‰±•)Í½¸¡¥¹Ù…É¥…¹ÑY¥•Ü¡‰•™½É”¤¤¤™…¥° É•Á½Í¥Ñ½Éä¥¹Ù…É¥…¹Ð¡…¹•‘ÕÉ¥¹œ‘•‘¥…Ñ•É•µ½Ñ”½¹™¥ÕÉ…Ñ¥½¸œ°ÑÉÕ”¤ì(€¥˜€¡…™Ñ•È¹‘•‘¥…Ñ•‘}ÍÑ…Ñ”€„ôô€1%9œ¤™…¥° ‘•‘¥…Ñ•É•µ½Ñ”‘¥¹½ÐÉ•… •á…Ð…±¥¹•ÍÑ…Ñ”œ°ÑÉÕ”¤ì((€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡ì½ÕÑ½µ”è€QI9MA=IQ}=9%UIœ°Á±…¸°µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•èÑÉÕ”°µÕÑ…Ñ¥½¹}ÍÕ••‘•èÑÉÕ”°…™Ñ•Èô¤ì)ô()™Õ¹Ñ¥½¸ÁÕ‰±¥A±…¸¡Á±…¸¤ì(€É•ÑÕÉ¸ì(€€€µ…É­•ÈèÁ±…¸¹µ…É­•È°(€€€Á±…¹}¥‘}Í¡„ÈÔØèÁ±…¸¹Á±…¹}¥‘}Í¡„ÈÔØ°(€€€É•µ½Ñ•}¹…µ”èÁ±…¸¹É•µ½Ñ•}¹…µ”°(€€€™•Ñ¡}ÕÉ°èÁ±…¸¹™•Ñ¡}ÕÉ°°(€€€ÁÕÍ¡}ÕÉ°èÁ±…¸¹ÁÕÍ¡}ÕÉ°°(€€€‰É…¹ èÁ±…¸¹‰É…¹ °(€€€¡•…èÁ±…¸¹¡•…°(€€€ÑÉ•”èÁ±…¸¹ÑÉ•”°(€€€‘¥ÉÑå}½Õ¹ÐèÁ±…¸¹‘¥ÉÑå}½Õ¹Ð°(€€€…¹½¹¥…±}½É¥¥¹}É•ÅÕ¥É•èÁ±…¸¹…¹½¹¥…±}½É¥¥¹}É•ÅÕ¥É•°(€€€½É¥¥¹}É•Á½Í¥Ñ½ÉäèÁ±…¸¹½É¥¥¹}É•Á½Í¥Ñ½Éä°(€€€‘•‘¥…Ñ•‘}ÍÑ…Ñ”èÁ±…¸¹‘•‘¥…Ñ•‘}ÍÑ…Ñ”°(€€€µÕÑ…Ñ¥½¹}É•ÅÕ¥É•èÁ±…¸¹µÕÑ…Ñ¥½¹}É•ÅÕ¥É•°(€€€½Á•É…Ñ¥½¸èÁ±…¸¹½Á•É…Ñ¥½¸°(€ôì)ô()™Õ¹Ñ¥½¸…ÕÑ¡½É¥ÑåMÑ…Ñ”¡½Ù•ÉÉ¥‘•Ì€ôíô¤ì(€É•ÑÕÉ¸ì(€€€¥Ñ}½¹™¥}µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•è™…±Í”°(€€€¥Ñ}™•Ñ è™…±Í”°(€€€¥Ñ}ÁÕ±°è™…±Í”°(€€€¡•­½ÕÐè™…±Í”°(€€€É•Í•Ðè™…±Í”°(€€€µ•É”è™…±Í”°(€€€‰Õ¥±è™…±Í”°(€€€Á…­…•}¥¹ÍÑ…±°è™…±Í”°(€€€Í•ÉÙ¥•}µÕÑ…Ñ¥½¸è™…±Í”°(€€€ÉÕ¹Ñ¥µ•}µÕÑ…Ñ¥½¸è™…±Í”°(€€€¹•ÑÝ½É­}½¹™¥ÕÉ…Ñ¥½¸è™…±Í”°(€€€É•‘•¹Ñ¥…±}É•…è™…±Í”°(€€€Ý…±±•Ñ}½É}Í¥¹•Èè™…±Í”°(€€€Ý½É­}É•‘¥Ñ}½É}Ù…±¥‘…Ñ½É}µÕÑ…Ñ¥½¸è™…±Í”°(€€€ÑÉ…¹Í…Ñ¥½¸è™…±Í”°(€€€ÑÉ•…ÍÕÉå}½É}±¥ÅÕ¥‘¥Ñäè™…±Í”°(€€€™Õ¹‘Í}µ½Ù•è™…±Í”°(€€€€¸¸¹½Ù•ÉÉ¥‘•Ì°(€ôì)ô()™Õ¹Ñ¥½¸•µ¥Ð¡Ù…±Õ”°½ÕÑÁÕÑA…Ñ €ô€œœ¤ì(€½¹ÍÐ©Í½¸€ô€‘í)M=8¹ÍÑÉ¥¹¥™ä¡Ù…±Õ”°¹Õ±°°€È¥õq¹€ì(€¥˜€¡½ÕÑÁÕÑA…Ñ ¤ì(€€€½¹ÍÐÁ…Ñ €ô•áÁ…¹‘A…Ñ ¡Í…™•A…Ñ ¡½ÕÑÁÕÑA…Ñ °€½ÕÑÁÕÐœ¤¤ì(€€€ÝÉ¥Ñ•¥±•Må¹Œ¡Á…Ñ °©Í½¸°ì•¹½‘¥¹œè€ÕÑ˜àœ°µ½‘”è€Á¼ØÀÀ°™±…œè€Ýàœô¤ì(€€€¡µ½‘Må¹Œ¡Á…Ñ °€Á¼ØÀÀ¤ì(€ô(€ÁÉ½•ÍÌ¹ÍÑ‘½ÕÐ¹ÝÉ¥Ñ”¡©Í½¸¤ì)ô()™Õ¹Ñ¥½¸Ù…±Õ•™Ñ•È¡…ÉØ°¥¹‘•à°±…‰•°¤ì(€½¹ÍÐÙ…±Õ”€ô…ÉÙm¥¹‘•à€¬€Åtì(€¥˜€ …Ù…±Õ”ñðÙ…±Õ”¹ÍÑ…ÉÑÍ]¥Ñ  œ´´œ¤¤™…¥°¡€‘í±…‰•±ôÉ•ÅÕ¥É•Ì„Ù…±Õ•€¤ì(€É•ÑÕÉ¸Ù…±Õ”ì)ô()™Õ¹Ñ¥½¸Á…ÉÍ•ÉÌ¡…ÉØ¤ì(€½¹ÍÐ½ÕÐ€ôìÉ•Á¼è€œœ°½ÕÑÁÕÐè€œœ°…ÁÁ±äè™…±Í”°½¹™¥Éµ=Á•É…Ñ¥½¸è€œœ°½¹™¥ÉµA±…¹%è€œœôì(€™½È€¡±•Ð¤€ô€Àì¤€ð…ÉØ¹±•¹Ñ ì¤€¬ô€Ä¤ì(€€€½¹ÍÐ…Éœ€ô…ÉÙm¥tì(€€€¥˜€¡…Éœ€ôôô€œ´µÉ•Á¼œ¤½ÕÐ¹É•Á¼€ôÙ…±Õ•™Ñ•È¡…ÉØ°¤¬¬°…Éœ¤ì(€€€•±Í”¥˜€¡…Éœ€ôôô€œ´µ½ÕÑÁÕÐœ¤½ÕÐ¹½ÕÑÁÕÐ€ôÙ…±Õ•™Ñ•È¡…ÉØ°¤¬¬°…Éœ¤ì(€€€•±Í”¥˜€¡…Éœ€ôôô€œ´µ…ÁÁ±äœ¤½ÕÐ¹…ÁÁ±ä€ôÑÉÕ”ì(€€€•±Í”¥˜€¡…Éœ€ôôô€œ´µ½¹™¥É´µ½Á•É…Ñ¥½¸œ¤½ÕÐ¹½¹™¥Éµ=Á•É…Ñ¥½¸€ôÙ…±Õ•™Ñ•È¡…ÉØ°¤¬¬°…Éœ¤ì(€€€•±Í”¥˜€¡…Éœ€ôôô€œ´µ½¹™¥É´µÁ±…¸µ¥œ¤½ÕÐ¹½¹™¥ÉµA±…¹%€ôÙ…±Õ•™Ñ•È¡…ÉØ°¤¬¬°…Éœ¤ì(€€€•±Í”¥˜€¡…Éœ€ôôô€œ´µ¡•±Àœ¤ì(€€€€€½¹Í½±”¹±½œ UÍ…”è¹½‘”Ñ½½±Ì½Ù½¥µ¹½‘”µ™±••ÐµÁÕ‰±¥Œµ™•Ñ µÑÉ…¹ÍÁ½ÉÐµØÄ¹µ©Ì€´µÉ•Á¼AQ l´µ½ÕÑÁÕÐAQ!tl´µ…ÁÁ±ä€´µ½¹™¥É´µ½Á•É…Ñ¥½¸Y=%}9=}1Q}AU	1%}Q!}QI9MA=IQ}AA1e}XÄ€´µ½¹™¥É´µÁ±…¸µ¥M!ÈÔÙtœ¤ì(€€€€€ÁÉ½•ÍÌ¹•á¥Ð À¤ì(€€€ô•±Í”™…¥°¡Õ¹­¹½Ý¸…ÉÕµ•¹Ðè€‘í…Éõ€¤ì(€ô(€¥˜€ …½ÕÐ¹É•Á¼¤™…¥° œ´µÉ•Á¼¥ÌÉ•ÅÕ¥É•œ¤ì(€É•ÑÕÉ¸½ÕÐì)ô()™Õ¹Ñ¥½¸µ…¥¸ ¤ì(€ÑÉäì(€€€½¹ÍÐ…ÉÌ€ôÁ…ÉÍ•ÉÌ¡ÁÉ½•ÍÌ¹…ÉØ¹Í±¥” È¤¤ì(€€€½¹ÍÐÍ¹…ÁÍ¡½Ð€ô¥¹ÍÁ•ÑI•Á½Í¥Ñ½ÉåQÉ…¹ÍÁ½ÉÑXÄ¡…ÉÌ¹É•Á¼¤ì(€€€½¹ÍÐÁ±…¸€ô‰Õ¥±‘QÉ…¹ÍÁ½ÉÑA±…¹XÄ¡Í¹…ÁÍ¡½Ð¤ì(€€€¥˜€ ……ÉÌ¹…ÁÁ±ä¤ì(€€€€€•µ¥Ð¡ì(€€€€€€€µ…É­•ÈèY=%}9=}1Q}AU	1%}Q!}QI9MA=IQ}XÄ°(€€€€€€€Ù•ÉÍ¥½¸è€Ä°(€€€€€€€½ÕÑ½µ”èÁ±…¸¹µÕÑ…Ñ¥½¹}É•ÅÕ¥É•€ü€Ie}Q=}AA1dœ€è€1Ie}1%9œ°(€€€€€€€Á±…¸èÁÕ‰±¥A±…¸¡Á±…¸¤°(€€€€€€€É•…Í½¹Ìèmt°(€€€€€€€µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•è™…±Í”°(€€€€€€€…ÕÑ½µ…Ñ¥}É•ÑÉäè™…±Í”°(€€€€€€€É•ÅÕ¥É•‘}½¹™¥Éµ…Ñ¥½¹}µ…É­•ÈèY=%}9=}1Q}AU	1%}Q!}QI9MA=IQ}AA1e}XÄ°(€€€€€€€…ÕÑ¡½É¥Ñäè…ÕÑ¡½É¥ÑåMÑ…Ñ” ¤°(€€€€€ô°…ÉÌ¹½ÕÑÁÕÐ¤ì(€€€€€É•ÑÕÉ¸ì(€€€ô(€€€¥˜€¡…ÉÌ¹½¹™¥Éµ=Á•É…Ñ¥½¸€„ôôY=%}9=}1Q}AU	1%}Q!}QI9MA=IQ}AA1e}XÄ¤™…¥° •á…Ð½Á•É…Ñ¥½¸½¹™¥Éµ…Ñ¥½¸µ¥Íµ…Ñ œ¤ì(€€€¥˜€¡…ÉÌ¹½¹™¥ÉµA±…¹%€„ôôÁ±…¸¹Á±…¹}¥‘}Í¡„ÈÔØ¤™…¥° •á…ÐÁ±…¸%½¹™¥Éµ…Ñ¥½¸µ¥Íµ…Ñ œ¤ì(€€€½¹ÍÐÉ•ÍÕ±Ð€ô…ÁÁ±åQÉ…¹ÍÁ½ÉÑA±…¹XÄ¡…ÉÌ¹É•Á¼°…ÉÌ¹½¹™¥ÉµA±…¹%¤ì(€€€•µ¥Ð¡ì(€€€€€µ…É­•ÈèY=%}9=}1Q}AU	1%}Q!}QI9MA=IQ}XÄ°(€€€€€Ù•ÉÍ¥½¸è€Ä°(€€€€€½ÕÑ½µ”èÉ•ÍÕ±Ð¹½ÕÑ½µ”°(€€€€€Á±…¸èÁÕ‰±¥A±…¸¡É•ÍÕ±Ð¹Á±…¸¤°(€€€€€É•…Í½¹Ìèmt°(€€€€€µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•èÉ•ÍÕ±Ð¹µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•°(€€€€€µÕÑ…Ñ¥½¹}ÍÕ••‘•èÉ•ÍÕ±Ð¹µÕÑ…Ñ¥½¹}ÍÕ••‘•°(€€€€€…ÕÑ½µ…Ñ¥}É•ÑÉäè™…±Í”°(€€€€€…ÕÑ¡½É¥Ñäè…ÕÑ¡½É¥ÑåMÑ…Ñ”¡ì¥Ñ}½¹™¥}µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•èÉ•ÍÕ±Ð¹µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•ô¤°(€€€ô°…ÉÌ¹½ÕÑÁÕÐ¤ì(€ô…Ñ €¡•ÉÉ½È¤ì(€€€½¹ÍÐµÕÑ…Ñ¥½¹ÑÑ•µÁÑ•€ô•ÉÉ½Èü¹µÕÑ…Ñ¥½¹ÑÑ•µÁÑ•€ôôôÑÉÕ”ì(€€€•µ¥Ð¡ì(€€€€€µ…É­•ÈèY=%}9=}1Q}AU	1%}Q!}QI9MA=IQ}XÄ°(€€€€€Ù•ÉÍ¥½¸è€Ä°(€€€€€½ÕÑ½µ”è€!=1œ°(€€€€€•ÉÉ½ÈèMÑÉ¥¹œ¡•ÉÉ½Èü¹µ•ÍÍ…”ñð•ÉÉ½È¤°(€€€€€µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•èµÕÑ…Ñ¥½¹ÑÑ•µÁÑ•°(€€€€€…ÕÑ½µ…Ñ¥}É•ÑÉäè™…±Í”°(€€€€€…ÕÑ¡½É¥Ñäè…ÕÑ¡½É¥ÑåMÑ…Ñ”¡ì¥Ñ}½¹™¥}µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•èµÕÑ…Ñ¥½¹ÑÑ•µÁÑ•ô¤°(€€€ô¤ì(€€€ÁÉ½•ÍÌ¹•á¥Ñ½‘”€ô€Èì(€ô)ô()¥˜€¡ÁÉ½•ÍÌ¹…ÉÙlÅt€˜˜É•Í½±Ù”¡ÁÉ½•ÍÌ¹…ÉÙlÅt¤€ôôô™¥±•UI1Q½A…Ñ ¡¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤¤µ…¥¸ ¤ì(