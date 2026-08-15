#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  fchmodSync,
  fsyncSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  VOID_NODE_FLEET_RUNTIME_PIN_STATUS_V1,
  buildFleetRuntimePinStatusV1,
  readFreshFleetDriftAuditV1,
  readFreshFleetProcessAuditV1,
} from "../tools/void-node-fleet-runtime-pin-status-v1.mjs";

export const VOID_CANONICAL_REPOSITORY_URL_V1 =
  "https://github.com/6ZoSo9/void-node.git";

const SHA_RE = /^[0-9a-f]{40}$/;
const REMOTE_RE = /^[a-z0-9][a-z0-9._-]{0,63}$/i;
const DEFAULT_MAX_EVIDENCE_AGE_SECONDS = 300;
const MAX_EVIDENCE_AGE_SECONDS = 86_400;
const MAX_GIT_OUTPUT_BYTES = 1024 * 1024;
const DEFAULT_REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const FORBIDDEN_GIT_ENV_KEYS = new Set([
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_CONFIG_GLOBAL",
  "GIT_CONFIG_SYSTEM",
  "GIT_CONFIG_NOSYSTEM",
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_COUNT",
  "GIT_EXEC_PATH",
  "GIT_SSH",
  "GIT_SSH_COMMAND",
  "GIT_SSH_VARIANT",
  "GIT_PROXY_COMMAND",
  "GIT_SSL_NO_VERIFY",
  "GIT_SSL_CAINFO",
  "GIT_SSL_CAPATH",
  "CURL_CA_BUNDLE",
  "SSL_CERT_FILE",
  "SSL_CERT_DIR",
]);

function fail(message) {
  const error = new Error(message);
  error.name = "VoidFleetRuntimePinStatusCanonicalEvaluatorError";
  throw error;
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  if (/[^\x20-\x7e]/.test(value)) {
    fail(`${label} contains a control or non-ASCII character`);
  }
  return value;
}

function assertSha(value, label) {
  const normalized = String(value ?? "");
  if (!SHA_RE.test(normalized)) fail(`${label} must be lowercase 40-hex`);
  return normalized;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function expandHome(input) {
  if (input === "~") return homedir();
  if (input.startsWith("~/")) return resolve(homedir(), input.slice(2));
  return input;
}

function parseUnpaddedInteger(value, label) {
  if (!/^(?:0|[1-9][0-9]*)$/.test(String(value ?? ""))) {
    fail(`${label} must be an unpadded integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) fail(`${label} is outside the safe integer range`);
  return parsed;
}

export function assertCanonicalEvaluationGitEnvironmentV1(env = process.env) {
  const forbidden = [];
  for (const key of Object.keys(env)) {
    if (
      FORBIDDEN_GIT_ENV_KEYS.has(key) ||
      /^GIT_CONFIG_(?:KEY|VALUE)_[0-9]+$/.test(key)
    ) {
      forbidden.push(key);
    }
  }
  if (forbidden.length > 0) {
    fail(
      `Git repository/configuration or helper/program or HTTPS-authentication override environment is not allowed: ${forbidden
        .sort()
        .join(",")}`,
    );
  }
  return true;
}

export function inspectReviewedGitExecutableV1(gitExecutable) {
  const input = expandHome(assertString(gitExecutable, "Git executable"));
  if (!isAbsolute(input)) fail("Git executable must be an absolute path");
  const path = realpathSync(input);
  const stat = statSync(path);
  if (!stat.isFile()) fail("Git executable must be a regular file");
  if ((stat.mode & 0o111) === 0) fail("Git executable must be executable");
  const digest = sha256(readFileSync(path));
  return Object.freeze({
    path,
    sha256: digest,
    size: stat.size,
    dev: String(stat.dev),
    ino: String(stat.ino),
  });
}

function assertSameGitExecutableIdentityV1(before, after) {
  for (const key of ["path", "sha256", "size", "dev", "ino"]) {
    if (before?.[key] !== after?.[key]) {
      fail("reviewed Git executable identity changed during runtime-pin evaluation");
    }
  }
  return true;
}

function runGit(gitExecutable, repo, args, env = process.env) {
  const gitIdentity = inspectReviewedGitExecutableV1(gitExecutable);
  const result = spawnSync(gitIdentity.path, ["-C", repo, ...args], {
    encoding: "utf8",
    timeout: 10_000,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    env: { ...env, GIT_TERMINAL_PROMPT: "0" },
  });
  if (result.error || result.status !== 0) {
    fail("read-only canonical Git inspection failed");
  }
  return result.stdout ?? "";
}

function oneLine(value, label) {
  const lines = String(value)
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
  if (lines.length !== 1) fail(`${label} must contain exactly one value`);
  return lines[0];
}

function isContainedPath(base, candidate) {
  const rel = relative(base, candidate);
  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
  );
}

export function resolveSafeEvidenceOutputPathV1({
  outputPath,
  coordinatorRepo,
  gitExecutable,
  env = process.env,
}) {
  assertCanonicalEvaluationGitEnvironmentV1(env);
  const repo = realpathSync(expandHome(assertString(coordinatorRepo, "coordinator repo")));
  const expandedOutput = resolve(expandHome(assertString(outputPath, "output path")));
  const outputParent = realpathSync(dirname(expandedOutput));
  const canonicalOutput = resolve(outputParent, basename(expandedOutput));

  const topLevel = realpathSync(
    runGit(gitExecutable, repo, ["rev-parse", "--show-toplevel"], env).trim(),
  );
  if (topLevel !== repo) fail("coordinator repo must be the exact Git worktree root");

  const gitDir = realpathSync(
    oneLine(
      runGit(gitExecutable, repo, ["rev-parse", "--absolute-git-dir"], env),
      "absolute Git dir",
    ),
  );
  const gitCommonDir = realpathSync(
    oneLine(
      runGit(
        gitExecutable,
        repo,
        ["rev-parse", "--path-format=absolute", "--git-common-dir"],
        env,
      ),
      "absolute Git common dir",
    ),
  );

  for (const [label, protectedRoot] of [
    ["coordinator worktree", repo],
    ["Git directory", gitDir],
    ["Git common directory", gitCommonDir],
  ]) {
    if (isContainedPath(protectedRoot, canonicalOutput)) {
      fail(`output path must be outside the selected ${label}`);
    }
  }
  return canonicalOutput;
}

export function reserveEvidenceOutputV1({
  outputPath,
  coordinatorRepo,
  gitExecutable,
  env = process.env,
}) {
  const path = resolveSafeEvidenceOutputPathV1({
    outputPath,
    coordinatorRepo,
    gitExecutable,
    env,
  });
  const fd = openSync(path, "wx", 0o600);
  fchmodSync(fd, 0o600);
  return { path, fd, published: false };
}

export function publishReservedEvidenceOutputV1(reservation, packet) {
  if (!reservation || reservation.published || !Number.isInteger(reservation.fd)) {
    fail("evidence output reservation is not writable");
  }
  const json = `${JSON.stringify(packet, null, 2)}\n`;
  writeFileSync(reservation.fd, json, { encoding: "utf8" });
  fsyncSync(reservation.fd);
  closeSync(reservation.fd);
  reservation.fd = null;
  reservation.published = true;
  return json;
}

export function cleanupEvidenceOutputReservationV1(reservation) {
  if (!reservation) return false;
  if (Number.isInteger(reservation.fd)) {
    try {
      closeSync(reservation.fd);
    } catch (cleanupError) {
      void cleanupError;
    }
    reservation.fd = null;
²È="24É•µ½Ñ”UI0‘½•Ì¹½Ðµ…Ñ É•Ù¥•Ý•Y=%É•Á½Í¥Ñ½Éä¥‘•¹Ñ¥Ñäˆ¤ì(€ô((€½¹ÍÐ•™™•Ñ¥Ù•I•µ½Ñ•UÉ°€ô½¹•1¥¹” (€€€ÉÕ¹¥Ð¡¥Ñá•ÕÑ…‰±”°É•Á¼°l‰É•µ½Ñ”ˆ°€‰•ÐµÕÉ°ˆ°É•µ½Ñ•t°•¹Ø¤°(€€€€‰•™™•Ñ¥Ù”…¹½¹¥…°É•µ½Ñ”UI0ˆ°(€€¤ì(€¥˜€¡•™™•Ñ¥Ù•I•µ½Ñ•UÉ°€„ôôÉ…ÝI•µ½Ñ•UÉ°¤ì(€€€™…¥° ‰…µ‰¥•¹Ð¥ÐUI0É•ÝÉ¥Ñ”¡…¹•Ì…¹½¹¥…°É•µ½Ñ”¥‘•¹Ñ¥Ñäˆ¤ì(€ô((€½¹ÍÐÍ¡„€ôÅÕ•Éå…¹½¹¥…±5…¥¹áÁ±¥¥ÑUÉ±XÄ¡ì(€€€…¹½¹¥…±UÉ°è•áÁ•Ñ•‘UÉ°°(€€€¥Ñá•ÕÑ…‰±”°(€€€…¹½¹¥…±	É…¹ °(€€€•¹Ø°(€ô¤ì(€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡ì(€€€Í¡„°(€€€É•µ½Ñ•}ÕÉ°èÉ…ÝI•µ½Ñ•UÉ°°(€€€•™™•Ñ¥Ù•}É•µ½Ñ•}ÕÉ°è•™™•Ñ¥Ù•I•µ½Ñ•UÉ°°(€ô¤ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸…ÍÍ•ÉÑ…¹½¹¥…±	É…­•ÑXÄ¡ì‘É¥™Ñ…¹½¹¥…±M¡„°‰•™½É”°…™Ñ•Èô¤ì(€½¹ÍÐ‘É¥™ÑM¡„€ô…ÍÍ•ÉÑM¡„¡‘É¥™Ñ…¹½¹¥…±M¡„°€‰‘É¥™Ð…¹½¹¥…°M!ˆ¤ì(€½¹ÍÐ‰•™½É•M¡„€ô…ÍÍ•ÉÑM¡„¡‰•™½É”ü¹Í¡„°€‰ÁÉ”µ•Ù…±Õ…Ñ¥½¸…¹½¹¥…°M!ˆ¤ì(€½¹ÍÐ…™Ñ•ÉM¡„€ô…ÍÍ•ÉÑM¡„¡…™Ñ•Èü¹Í¡„°€‰Á½ÍÐµ•Ù…±Õ…Ñ¥½¸…¹½¹¥…°M!ˆ¤ì(€¥˜€¡‰•™½É•M¡„€„ôô‘É¥™ÑM¡„¤ì(€€€™…¥° ‰‘É¥™Ð…Õ‘¥Ð…¹½¹¥…°µ…¥¸¥ÌÍÑ…±”É•±…Ñ¥Ù”Ñ¼±¥Ù”…¹½¹¥…°µ…¥¸ˆ¤ì(€ô(€¥˜€¡…™Ñ•ÉM¡„€„ôô‰•™½É•M¡„¤ì(€€€™…¥° ‰…¹½¹¥…°µ…¥¸¡…¹•‘ÕÉ¥¹œÉÕ¹Ñ¥µ”µÁ¥¸•Ù…±Õ…Ñ¥½¸ˆ¤ì(€ô(€¥˜€ (€€€…™Ñ•Èü¹É•µ½Ñ•}ÕÉ°€„ôô‰•™½É”ü¹É•µ½Ñ•}ÕÉ°ñð(€€€…™Ñ•Èü¹•™™•Ñ¥Ù•}É•µ½Ñ•}ÕÉ°€„ôô‰•™½É”ü¹•™™•Ñ¥Ù•}É•µ½Ñ•}ÕÉ°(€€¤ì(€€€™…¥° ‰…¹½¹¥…°É•µ½Ñ”¥‘•¹Ñ¥Ñä¡…¹•‘ÕÉ¥¹œÉÕ¹Ñ¥µ”µÁ¥¸•Ù…±Õ…Ñ¥½¸ˆ¤ì(€ô(€É•ÑÕÉ¸‰•™½É•M¡„ì)ô()•áÁ½ÉÐ™Õ¹Ñ¥½¸•Ù…±Õ…Ñ•IÕ¹Ñ¥µ•A¥¹MÑ…ÑÕÍ1¥Ù•…¹½¹¥…±XÄ¡ì(€‘É¥™ÑÙ¥‘•¹”°(€ÁÉ½•ÍÍÙ¥‘•¹”°(€…ÁÁÉ½Ù•‘IÕ¹Ñ¥µ•M¡„°(€½½É‘¥¹…Ñ½ÉI•Á¼°(€¥Ñá•ÕÑ…‰±”°(€•áÁ•Ñ•‘…¹½¹¥…±UÉ°€ôY=%}9=9%1}IA=M%Q=Ie}UI1}XÄ°(€•¹Ø€ôÁÉ½•ÍÌ¹•¹Ø°(€•Ù…±Õ…Ñ•‘ÑÁ½¡5Ì€ô…Ñ”¹¹½Ü ¤°(€•Ù¥‘•¹•=ÕÑÁÕÑÉ•…Ñ•€ô™…±Í”°)ô¤ì(€…ÍÍ•ÉÑ…¹½¹¥…±Ù…±Õ…Ñ¥½¹¥Ñ¹Ù¥É½¹µ•¹ÑXÄ¡•¹Ø¤ì(€½¹ÍÐ¥Ñ	•™½É”€ô¥¹ÍÁ•ÑI•Ù¥•Ý•‘¥Ñá•ÕÑ…‰±•XÄ¡¥Ñá•ÕÑ…‰±”¤ì(€½¹ÍÐ…¹½¹¥…±½¹Ñ•áÐ€ôì(€€€½½É‘¥¹…Ñ½ÉI•Á¼°(€€€…¹½¹¥…±I•µ½Ñ”è‘É¥™ÑÙ¥‘•¹”¹…Õ‘¥Ð¹…¹½¹¥…°¹É•µ½Ñ”°(€€€…¹½¹¥…±	É…¹ è‘É¥™ÑÙ¥‘•¹”¹…Õ‘¥Ð¹…¹½¹¥…°¹‰É…¹ °(€€€•áÁ•Ñ•‘…¹½¹¥…±UÉ°°(€€€¥Ñá•ÕÑ…‰±”è¥Ñ	•™½É”¹Á…Ñ °(€€€•¹Ø°(€ôì(€½¹ÍÐ‰•™½É”€ôÍ…µÁ±•1¥Ù•…¹½¹¥…±5…¥¹XÄ¡…¹½¹¥…±½¹Ñ•áÐ¤ì(€¥˜€¡‰•™½É”¹Í¡„€„ôô‘É¥™ÑÙ¥‘•¹”¹…Õ‘¥Ð¹…¹½¹¥…°¹Í¡„¤ì(€€€™…¥° ‰‘É¥™Ð…Õ‘¥Ð…¹½¹¥…°µ…¥¸¥ÌÍÑ…±”É•±…Ñ¥Ù”Ñ¼±¥Ù”…¹½¹¥…°µ…¥¸ˆ¤ì(€ô((€½¹ÍÐÁ…­•Ð€ô‰Õ¥±‘±••ÑIÕ¹Ñ¥µ•A¥¹MÑ…ÑÕÍXÄ¡ì(€€€…Õ‘¥Ðè‘É¥™ÑÙ¥‘•¹”¹…Õ‘¥Ð°(€€€ÁÉ½•ÍÍÕ‘¥ÐèÁÉ½•ÍÍÙ¥‘•¹”¹…Õ‘¥Ð°(€€€…ÁÁÉ½Ù•‘IÕ¹Ñ¥µ•M¡„°(€€€Í½ÕÉ•Õ‘¥Ñ¥±•M¡„ÈÔØè‘É¥™ÑÙ¥‘•¹”¹™¥±•}Í¡„ÈÔØ°(€€€Í½ÕÉ•Õ‘¥Ñ5Ñ¥µ•Á½¡5Ìè‘É¥™ÑÙ¥‘•¹”¹µÑ¥µ•}•Á½¡}µÌ°(€€€ÁÉ½•ÍÍÕ‘¥Ñ¥±•M¡„ÈÔØèÁÉ½•ÍÍÙ¥‘•¹”¹™¥±•}Í¡„ÈÔØ°(€€€ÁÉ½•ÍÍÕ‘¥Ñ5Ñ¥µ•Á½¡5ÌèÁÉ½•ÍÍÙ¥‘•¹”¹µÑ¥µ•}•Á½¡}µÌ°(€€€•Ù…±Õ…Ñ•‘ÑÁ½¡5Ì°(€€€•Ù¥‘•¹•=ÕÑÁÕÑÉ•…Ñ•°(€ô¤ì((€½¹ÍÐ…™Ñ•È€ôÍ…µÁ±•1¥Ù•…¹½¹¥…±5…¥¹XÄ¡…¹½¹¥…±½¹Ñ•áÐ¤ì(€…ÍÍ•ÉÑ…¹½¹¥…±	É…­•ÑXÄ¡ì(€€€‘É¥™Ñ…¹½¹¥…±M¡„è‘É¥™ÑÙ¥‘•¹”¹…Õ‘¥Ð¹…¹½¹¥…°¹Í¡„°(€€€‰•™½É”°(€€€…™Ñ•È°(€ô¤ì(€½¹ÍÐ¥Ñ™Ñ•È€ô¥¹ÍÁ•ÑI•Ù¥•Ý•‘¥Ñá•ÕÑ…‰±•XÄ¡¥Ñ	•™½É”¹Á…Ñ ¤ì(€…ÍÍ•ÉÑM…µ•¥Ñá•ÕÑ…‰±•%‘•¹Ñ¥ÑåXÄ¡¥Ñ	•™½É”°¥Ñ™Ñ•È¤ì((€½¹ÍÐ…¹½¹¥…±¥Ñá•ÕÑ…‰±”€ô=‰©•Ð¹™É••é”¡ì(€€€Á…Ñ è¥Ñ	•™½É”¹Á…Ñ °(€€€Í¡„ÈÔØè¥Ñ	•™½É”¹Í¡„ÈÔØ°(€ô¤ì(€½¹ÍÐ½Á•É…Ñ½ÉÙ¥‘•¹•%‘M¡„ÈÔØ€ôÍ¡„ÈÔØ (€€€)M=8¹ÍÑÉ¥¹¥™ä¡ì(€€€€€µ…É­•ÈèY=%}9=}1Q}IU9Q%5}A%9}MQQUM}XÄ°(€€€€€ÍÑ…ÑÕÍ}¥‘}Í¡„ÈÔØèÁ…­•Ð¹ÍÑ…ÑÕÍ}¥‘}Í¡„ÈÔØ°(€€€€€…¹½¹¥…±}¥Ñ}•á•ÕÑ…‰±”è…¹½¹¥…±¥Ñá•ÕÑ…‰±”°(€€€ô¤°(€€¤ì(€É•ÑÕÉ¸=‰©•Ð¹™É••é”¡ì(€€€€¸¸¹Á…­•Ð°(€€€…¹½¹¥…±}¥Ñ}•á•ÕÑ…‰±”è…¹½¹¥…±¥Ñá•ÕÑ…‰±”°(€€€½Á•É…Ñ½É}•Ù¥‘•¹•}¥‘}Í¡„ÈÔØè½Á•É…Ñ½ÉÙ¥‘•¹•%‘M¡„ÈÔØ°(€ô¤ì)ô()™Õ¹Ñ¥½¸Á…ÉÍ•ÉÌ¡…ÉØ¤ì(€½¹ÍÐ½ÕÐ€ôì(€€€‘É¥™ÑÕ‘¥Ðè€ˆˆ°(€€€ÁÉ½•ÍÍÕ‘¥Ðè€ˆˆ°(€€€…ÁÁÉ½Ù•‘IÕ¹Ñ¥µ•M¡„è€ˆˆ°(€€€½½É‘¥¹…Ñ½ÉI•Á¼èU1Q}IA=}I==P°(€€€¥Ñá•ÕÑ…‰±”è€ˆˆ°(€€€µ…áÙ¥‘•¹••M•½¹‘ÌèU1Q}5a}Y%9}}M=9L°(€€€½ÕÑÁÕÐè€ˆˆ°(€ôì(€½¹ÍÐÍ••¸€ô¹•ÜM•Ð ¤ì(€™½È€¡±•Ð¥¹‘•à€ô€Àì¥¹‘•à€ð…ÉØ¹±•¹Ñ ì¥¹‘•à€¬ô€Ä¤ì(€€€½¹ÍÐ…Éœ€ô…ÉÙm¥¹‘•átì(€€€¥˜€¡…Éœ€ôôô€ˆ´µ¡•±Àˆ¤ì(€€€€€½¹Í½±”¹±½œ (€€€€€€€€‰UÍ…”è¹½‘”½ÁÌ½ÉÕ¹}Ù½¥‘}¹½‘•}™±••Ñ}ÉÕ¹Ñ¥µ•}Á¥¹}ÍÑ…ÑÕÍ}ØÄ¹µ©Ì€´µ‘É¥™Ðµ…Õ‘¥ÐAQ €´µÁÉ½•ÍÌµ™É•Í¡¹•ÍÌµ…Õ‘¥ÐAQ €´µ…ÁÁÉ½Ù•µÉÕ¹Ñ¥µ”µÍ¡„M!€´µ¥Ðµ•á•ÕÑ…‰±”	M}AQ l´µ½½É‘¥¹…Ñ½ÈµÉ•Á¼AQ!tl´µµ…àµ•Ù¥‘•¹”µ…”µÍ•½¹‘Ì9tl´µ½ÕÑÁÕÐAQ!tˆ°(€€€€€€¤ì(€€€€€ÁÉ½•ÍÌ¹•á¥Ð À¤ì(€€€ô(€€€¥˜€ (€€€€€€…l(€€€€€€€€ˆ´µ‘É¥™Ðµ…Õ‘¥Ðˆ°(€€€€€€€€ˆ´µÁÉ½•ÍÌµ™É•Í¡¹•ÍÌµ…Õ‘¥Ðˆ°(€€€€€€€€ˆ´µ…ÁÁÉ½Ù•µÉÕ¹Ñ¥µ”µÍ¡„ˆ°(€€€€€€€€ˆ´µ½½É‘¥¹…Ñ½ÈµÉ•Á¼ˆ°(€€€€€€€€ˆ´µ¥Ðµ•á•ÕÑ…‰±”ˆ°(€€€€€€€€ˆ´µµ…àµ•Ù¥‘•¹”µ…”µÍ•½¹‘Ìˆ°(€€€€€€€€ˆ´µ½ÕÑÁÕÐˆ°(€€€€€t¹¥¹±Õ‘•Ì¡…Éœ¤(€€€€¤ì(€€€€€™…¥°¡Õ¹­¹½Ý¸…ÉÕµ•¹Ðè€‘í…Éõ€¤ì(€€€ô(€€€¥˜€¡Í••¸¹¡…Ì¡…Éœ¤¤™…¥°¡‘ÕÁ±¥…Ñ”…ÉÕµ•¹Ðè€‘í…Éõ€¤ì(€€€Í••¸¹…‘¡…Éœ¤ì(€€€½¹ÍÐÙ…±Õ”€ô…ÉÙl¬­¥¹‘•átì(€€€¥˜€¡Ù…±Õ”€ôôôÕ¹‘•™¥¹•¤™…¥°¡µ¥ÍÍ¥¹œÙ…±Õ”™½È€‘í…Éõ€¤ì(€€€¥˜€¡…Éœ€ôôô€ˆ´µ‘É¥™Ðµ…Õ‘¥Ðˆ¤½ÕÐ¹‘É¥™ÑÕ‘¥Ð€ôÙ…±Õ”ì(€€€•±Í”¥˜€¡…Éœ€ôôô€ˆ´µÁÉ½•ÍÌµ™É•Í¡¹•ÍÌµ…Õ‘¥Ðˆ¤½ÕÐ¹ÁÉ½•ÍÍÕ‘¥Ð€ôÙ…±Õ”ì(€€€•±Í”¥˜€¡…Éœ€ôôô€ˆ´µ…ÁÁÉ½Ù•µÉÕ¹Ñ¥µ”µÍ¡„ˆ¤½ÕÐ¹…ÁÁÉ½Ù•‘IÕ¹Ñ¥µ•M¡„€ôÙ…±Õ”ì(€€€•±Í”¥˜€¡…Éœ€ôôô€ˆ´µ½½É‘¥¹…Ñ½ÈµÉ•Á¼ˆ¤½ÕÐ¹½½É‘¥¹…Ñ½ÉI•Á¼€ôÙ…±Õ”ì(€€€•±Í”¥˜€¡…Éœ€ôôô€ˆ´µ¥Ðµ•á•ÕÑ…‰±”ˆ¤½ÕÐ¹¥Ñá•ÕÑ…‰±”€ôÙ…±Õ”ì(€€€•±Í”¥˜€¡…Éœ€ôôô€ˆ´µµ…àµ•Ù¥‘•¹”µ…”µÍ•½¹‘Ìˆ¤ì(€€€€€½ÕÐ¹µ…áÙ¥‘•¹••M•½¹‘Ì€ôÁ…ÉÍ•U¹Á…‘‘•‘%¹Ñ••È¡Ù…±Õ”°€‰µ…à•Ù¥‘•¹”…”ˆ¤ì(€€€ô•±Í”¥˜€¡…Éœ€ôôô€ˆ´µ½ÕÑÁÕÐˆ¤½ÕÐ¹½ÕÑÁÕÐ€ôÙ…±Õ”ì(€ô(€¥˜€ …½ÕÐ¹‘É¥™ÑÕ‘¥Ð¤™…¥° ˆ´µ‘É¥™Ðµ…Õ‘¥Ð¥ÌÉ•ÅÕ¥É•ˆ¤ì(€¥˜€ …½ÕÐ¹ÁÉ½•ÍÍÕ‘¥Ð¤™…¥° ˆ´µÁÉ½•ÍÌµ™É•Í¡¹•ÍÌµ…Õ‘¥Ð¥ÌÉ•ÅÕ¥É•ˆ¤ì(€¥˜€ …½ÕÐ¹…ÁÁÉ½Ù•‘IÕ¹Ñ¥µ•M¡„¤™…¥° ˆ´µ…ÁÁÉ½Ù•µÉÕ¹Ñ¥µ”µÍ¡„¥ÌÉ•ÅÕ¥É•ˆ¤ì(€¥˜€ …½ÕÐ¹¥Ñá•ÕÑ…‰±”¤™…¥° ˆ´µ¥Ðµ•á•ÕÑ…‰±”¥ÌÉ•ÅÕ¥É•ˆ¤ì(€¥¹ÍÁ•ÑI•Ù¥•Ý•‘¥Ñá•ÕÑ…‰±•XÄ¡½ÕÐ¹¥Ñá•ÕÑ…‰±”¤ì(€¥˜€¡½ÕÐ¹µ…áÙ¥‘•¹••M•½¹‘Ì€ð€Äñð½ÕÐ¹µ…áÙ¥‘•¹••M•½¹‘Ì€ø5a}Y%9}}M=9L¤ì(€€€™…¥°¡µ…à•Ù¥‘•¹”…”µÕÍÐ‰”€Ä¸¸‘í5a}Y%9}}M=9MôÍ•½¹‘Í€¤ì(€ô(€É•ÑÕÉ¸½ÕÐì)ô()™Õ¹Ñ¥½¸µ…¥¸ ¤ì(€±•ÐÉ•Í•ÉÙ…Ñ¥½¸€ô¹Õ±°ì(€ÑÉäì(€€€½¹ÍÐ…ÉÌ€ôÁ…ÉÍ•ÉÌ¡ÁÉ½•ÍÌ¹…ÉØ¹Í±¥” È¤¤ì(€€€…ÍÍ•ÉÑ…¹½¹¥…±Ù…±Õ…Ñ¥½¹¥Ñ¹Ù¥É½¹µ•¹ÑXÄ¡ÁÉ½•ÍÌ¹•¹Ø¤ì(€€€¥˜€¡…ÉÌ¹½ÕÑÁÕÐ¤ì(€€€€€É•Í•ÉÙ…Ñ¥½¸€ôÉ•Í•ÉÙ•Ù¥‘•¹•=ÕÑÁÕÑXÄ¡ì(€€€€€€€½ÕÑÁÕÑA…Ñ è…ÉÌ¹½ÕÑÁÕÐ°(€€€€€€€½½É‘¥¹…Ñ½ÉI•Á¼è…ÉÌ¹½½É‘¥¹…Ñ½ÉI•Á¼°(€€€€€€€¥Ñá•ÕÑ…‰±”è…ÉÌ¹¥Ñá•ÕÑ…‰±”°(€€€€€€€•¹ØèÁÉ½•ÍÌ¹•¹Ø°(€€€€€ô¤ì(€€€ô((€€€½¹ÍÐ‘É¥™Ð€ôÉ•…‘É•Í¡±••ÑÉ¥™ÑÕ‘¥ÑXÄ¡…ÉÌ¹‘É¥™ÑÕ‘¥Ð°…ÉÌ¹µ…áÙ¥‘•¹••M•½¹‘Ì¤ì(€€€½¹ÍÐÁÉ½•ÍÍÙ¥‘•¹”€ôÉ•…‘É•Í¡±••ÑAÉ½•ÍÍÕ‘¥ÑXÄ (€€€€€…ÉÌ¹ÁÉ½•ÍÍÕ‘¥Ð°(€€€€€…ÉÌ¹µ…áÙ¥‘•¹••M•½¹‘Ì°(€€€€¤ì(€€€½¹ÍÐÁ…­•Ð€ô•Ù…±Õ…Ñ•IÕ¹Ñ¥µ•A¥¹MÑ…ÑÕÍ1¥Ù•…¹½¹¥…±XÄ¡ì(€€€€€‘É¥™ÑÙ¥‘•¹”è‘É¥™Ð°(€€€€€ÁÉ½•ÍÍÙ¥‘•¹”°(€€€€€…ÁÁÉ½Ù•‘IÕ¹Ñ¥µ•M¡„è…ÉÌ¹…ÁÁÉ½Ù•‘IÕ¹Ñ¥µ•M¡„°(€€€€€½½É‘¥¹…Ñ½ÉI•Á¼è…ÉÌ¹½½É‘¥¹…Ñ½ÉI•Á¼°(€€€€€¥Ñá•ÕÑ…‰±”è…ÉÌ¹¥Ñá•ÕÑ…‰±”°(€€€€€•Ù¥‘•¹•=ÕÑÁÕÑÉ•…Ñ•è	½½±•…¸¡É•Í•ÉÙ…Ñ¥½¸¤°(€€€ô¤ì((€€€½¹ÍÐ©Í½¸€ôÉ•Í•ÉÙ…Ñ¥½¸(€€€€€€üÁÕ‰±¥Í¡I•Í•ÉÙ•‘Ù¥‘•¹•=ÕÑÁÕÑXÄ¡É•Í•ÉÙ…Ñ¥½¸°Á…­•Ð¤(€€€€€€è€‘í)M=8¹ÍÑÉ¥¹¥™ä¡Á…­•Ð°¹Õ±°°€È¥õq¹€ì(€€€ÁÉ½•ÍÌ¹ÍÑ‘½ÕÐ¹ÝÉ¥Ñ”¡©Í½¸¤ì(€€€ÁÉ½•ÍÌ¹•á¥Ñ½‘”€ôl‰!=1ˆ°€‰U9aAQ}IU9Q%5}I%P‰t¹¥¹±Õ‘•Ì¡Á…­•Ð¹ÍÑ…ÑÕÌ¤€ü€È€è€Àì(€ô…Ñ €¡•ÉÉ½È¤ì(€€€½¹ÍÐ•Ù¥‘•¹•=ÕÑÁÕÑÉ•…Ñ•€ô±•…¹ÕÁÙ¥‘•¹•=ÕÑÁÕÑI•Í•ÉÙ…Ñ¥½¹XÄ¡É•Í•ÉÙ…Ñ¥½¸¤ì(€€€½¹Í½±”¹•ÉÉ½È (€€€€€)M=8¹ÍÑÉ¥¹¥™ä¡ì(€€€€€€€µ…É­•ÈèY=%}9=}1Q}IU9Q%5}A%9}MQQUM}XÄ°(€€€€€€€ÍÑ…ÑÕÌè€‰!=1ˆ°(€€€€€€€•ÉÉ½ÈèMÑÉ¥¹œ¡•ÉÉ½Èü¹µ•ÍÍ…”ñð•ÉÉ½È¤°(€€€€€€€µÕÑ…Ñ¥½¹}…ÑÑ•µÁÑ•è™…±Í”°(€€€€€€€…¹½¹¥…±}É•µ½Ñ•}É•…‘}½¹±äèÑÉÕ”°(€€€€€€€•Ù¥‘•¹•}½ÕÑÁÕÑ}É•…Ñ•è•Ù¥‘•¹•=ÕÑÁÕÑÉ•…Ñ•°(€€€€€ô¤°(€€€€¤ì(€€€ÁÉ½•ÍÌ¹•á¥Ñ½‘”€ô€Äì(€ô)ô()½¹ÍÐ¥¹Ù½­•‘A…Ñ €ôÁÉ½•ÍÌ¹…ÉÙlÅt€üÉ•Í½±Ù”¡ÁÉ½•ÍÌ¹…ÉÙlÅt¤€è€ˆˆì)¥˜€¡¥¹Ù½­•‘A…Ñ €˜˜™¥±•UI1Q½A…Ñ ¡¥µÁ½ÉÐ¹µ•Ñ„¹ÕÉ°¤€ôôô¥¹Ù½­•‘A…Ñ ¤ì(€µ…¥¸ ¤ì)ô(