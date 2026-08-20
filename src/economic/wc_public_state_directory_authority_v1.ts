import fs from "node:fs";
import path from "node:path";

export type WcPublicStateDirectoryIdentityV1 = {
  dev: string;
  ino: string;
  uid: string;
  mode: number;
};

export type WcPublicStateDirectoryParentFsyncHookV1 =
  | ((
      phase: "before" | "after",
      parent: string,
      child: string,
    ) => void)
  | null;

const durableDirectoryLinksV1 =
  new Map<string, WcPublicStateDirectoryIdentityV1>();

function directoryIdentityV1(
  dir: string,
  requirePrivate: boolean,
): WcPublicStateDirectoryIdentityV1 {
  const stat: any = fs.lstatSync(dir, { bigint: true } as any);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error("wc_public_state_directory_not_authoritative");
  }
  const mode = Number(stat.mode) & 0o777;
  const expectedUid =
    typeof process.getuid === "function"
      ? String(process.getuid())
      : null;
  if (
    requirePrivate &&
    ((expectedUid !== null && String(stat.uid) !== expectedUid) ||
      (mode & 0o077) !== 0)
  ) {
    throw new Error("wc_public_state_directory_not_private");
  }
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    uid: String(stat.uid),
    mode,
  };
}

function sameIdentityV1(
  a: WcPublicStateDirectoryIdentityV1,
  b: WcPublicStateDirectoryIdentityV1,
): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.uid === b.uid &&
    a.mode === b.mode
  );
}

function isWithinV1(candidate: string, root: string): boolean {
  return candidate === root || candidate.startsWith(root + path.sep);
}

function pathComponentsV1(target: string): string[] {
  const resolved = path.resolve(target);
  const parsed = path.parse(resolved);
  const components: string[] = [];
  let current = parsed.root;
  for (const part of resolved
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean)) {
    current = path.join(current, part);
    components.push(current);
  }
  return components;
}

function fsyncDirectoryV1(dir: string): void {
  const fd = fs.openSync(dir, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

export function ensureWcPublicStateDurableDirectoryV1(
  dirRaw: string,
  authorityRootRaw: string,
  hook: WcPublicStateDirectoryParentFsyncHookV1 = null,
): WcPublicStateDirectoryIdentityV1 {
  const target = path.resolve(dirRaw);
  const authorityRoot = path.resolve(authorityRootRaw);
  if (!isWithinV1(target, authorityRoot)) {
    throw new Error("wc_public_state_directory_outside_authority_root");
  }

  for (const component of pathComponentsV1(target)) {
    const requirePrivate = isWithinV1(component, authorityRoot);
    try {
      directoryIdentityV1(component, requirePrivate);
      continue;
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") throw error;
    }

    const parent = path.dirname(component);
    const parentBefore = directoryIdentityV1(
      parent,
      isWithinV1(parent, authorityRoot),
    );
    try {
      fs.mkdirSync(component, { mode: 0o700 });
    } catch (error: any) {
      if (String(error?.code || "") !== "EEXIST") throw error;
    }
    const parentAfter = directoryIdentityV1(
      parent,
      isWithinV1(parent, authorityRoot),
    );
    if (!sameIdentityV1(parentBefore, parentAfter)) {
      throw new Error(
        "wc_public_state_directory_parent_generation_changed",
      );
    }
    directoryIdentityV1(component, requirePrivate);
  }

  const identity = directoryIdentityV1(target, true);
  const cached = durableDirectoryLinksV1.get(target);
  if (cached && sameIdentityV1(cached, identity)) return identity;

  const parent = path.dirname(target);
  hook?.("before", parent, target);
  fsyncDirectoryV1(parent);
  hook?.("after", parent, target);
  const after = directoryIdentityV1(target, true);
  if (!sameIdentityV1(identity, after)) {
    throw new Error("wc_public_state_directory_generation_changed");
  }
  durableDirectoryLinksV1.set(target, after);
  return after;
}
