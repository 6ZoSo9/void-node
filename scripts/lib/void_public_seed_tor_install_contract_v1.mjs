import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export const TOR_INSTALL_MARKER = "VOID_PUBLIC_SEED_TOR_INSTALLER_V1";
export const TOR_ACTIVATION_CONFIRM = "activate-void-public-seed-tor-v1";
export const TOR_GATEWAY_UNIT = "void-public-seed-tor-gateway-v1.service";
export const TOR_TRANSPORT_UNIT = "void-public-seed-tor-v1.service";
const SENTINEL = ".void-public-seed-tor-v1-owned";

export function torInstallFail(message) {
  throw new Error(String(message));
}

export function runCommand(command, args, { allowFailure = false } = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!allowFailure && result.status !== 0) {
    torInstallFail(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return {
    status: result.status,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

export function sha256File(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function quoteSystemd(value) {
  const text = String(value);
  if (/[\0\r\n%]/.test(text)) torInstallFail("systemd argument contains a forbidden character");
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function quoteTorrc(value) {
  const text = String(value);
  if (/[\0\r\n]/.test(text)) torInstallFail("torrc path contains a control character");
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function exactRepository(repoRoot, expectedHead) {
  const root = fs.realpathSync(path.resolve(repoRoot));
  if (!/^[0-9a-f]{40}$/.test(expectedHead)) torInstallFail("expected head must be 40 lowercase hexadecimal characters");
  if (runCommand("git", ["-C", root, "rev-parse", "HEAD"]).stdout !== expectedHead) torInstallFail("repository head mismatch");
  if (runCommand("git", ["-C", root, "status", "--porcelain=v1", "--untracked-files=all"]).stdout) torInstallFail("repository is not clean");
  return root;
}

export function realExecutable(raw, label) {
  const resolved = fs.realpathSync(path.resolve(raw));
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isFile() || (stat.mode & 0o111) === 0) torInstallFail(`${label} must be an executable regular file`);
  return resolved;
}

export function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

export function canonicalFuturePath(raw, label) {
  const absolute = path.resolve(String(raw));
  let ancestor = absolute;
  const suffix = [];
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) torInstallFail(`${label} has no resolvable ancestor`);
    suffix.unshift(path.basename(ancestor));
    ancestor = parent;
  }
  const stat = fs.lstatSync(ancestor);
  if (stat.isSymbolicLink()) torInstallFail(`${label} existing ancestor must not be a symlink`);
  return path.resolve(fs.realpathSync(ancestor), ...suffix);
}

export function managedPath(raw, repoRoot, label) {
  const resolved = canonicalFuturePath(raw, label);
  const home = fs.realpathSync(os.homedir());
  if (!isInside(home, resolved) || resolved === home) torInstallFail(`${label} must be a dedicated path beneath HOME`);
  if (isInside(repoRoot, resolved)) torInstallFail(`${label} must remain outside the repository`);
  return resolved;
}

export function assertNoOverlap(entries) {
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      if (isInside(entries[left][1], entries[right][1]) || isInside(entries[right][1], entries[left][1])) {
        torInstallFail(`${entries[left][0]} and ${entries[right][0]} must not overlap`);
      }
    }
  }
}

export function prepareOwnedRoot(root, kind) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory()) torInstallFail(`${kind} root must be a real directory`);
  fs.chmodSync(root, 0o700);
  const sentinel = path.join(root, SENTINEL);
  const expected = `marker=${TOR_INSTALL_MARKER}\nkind=${kind}\npath=${root}\nuid=${process.getuid()}\n`;
  if (fs.existsSync(sentinel)) {
    const sentinelStat = fs.lstatSync(sentinel);
    if (
      sentinelStat.isSymbolicLink() ||
      !sentinelStat.isFile() ||
      sentinelStat.uid !== process.getuid() ||
      (sentinelStat.mode & 0o777) !== 0o600 ||
      fs.readFileSync(sentinel, "utf8") !== expected
    ) torInstallFail(`${kind} root ownership sentinel mismatch`);
  } else {
    if (fs.readdirSync(root).length !== 0) torInstallFail(`${kind} root is non-empty without an ownership sentinel`);
    fs.writeFileSync(sentinel, expected, { flag: "wx", mode: 0o600 });
  }
}

export function writePrivateAtomic(file, content) {
  const directory = fs.realpathSync(path.dirname(file));
  const target = path.join(directory, path.basename(file));
  const temporary = path.join(directory, `.${path.basename(file)}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`);
  fs.writeFileSync(temporary, content, { flag: "wx", mode: 0o600 });
  try {
    fs.renameSync(temporary, target);
    fs.chmodSync(target, 0o600);
  } catch (error) {
    fs.rmSync(temporary, { force: true });
    throw error;
  }
}

export function assertUnitsInactive() {
  for (const unit of [TOR_TRANSPORT_UNIT, TOR_GATEWAY_UNIT]) {
    if (runCommand("systemctl", ["--user", "is-active", "--quiet", unit], { allowFailure: true }).status === 0) {
      torInstallFail(`refusing to replace an active unit: ${unit}`);
    }
  }
}
