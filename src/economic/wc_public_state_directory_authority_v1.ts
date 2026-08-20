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

// Once an authority root or durability-critical descendant has been
// admitted, its exact directory generation remains authoritative for this
// process lifetime. A different private directory at the same pathname is a
// replacement, not an implicit recovery or rotation.
const durableAuthorityRootsV1 =
  new Map<string, WcPublicStateDirectoryIdentityV1>();
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

function cachedDirectoryIdentityV1(
  cache: Map<string, WcPublicStateDirectoryIdentityV1>,
  key: string,
  requirePrivate: boolean,
  changedCode: string,
): WcPublicStateDirectoryIdentityV1 | null {
  const cached = cache.get(key);
  if (!cached) return null;

  let current: WcPublicStateDirectoryIdentityV1;
  try {
    current = directoryIdentityV1(key, requirePrivate);
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") {
      throw new Error(changedCode);
    }
    throw error;
  }
  if (!sameIdentityV1(cached, current)) {
    throw new Error(changedCode);
  }
  return current;
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

  // Check already-admitted generations before creating anything beneath a
  // replacement tree. We still walk every component below so a symlinked or
  // non-directory ancestor cannot be hidden by a matching final inode.
  const cachedAuthorityRoot = cachedDirectoryIdentityV1(
    durableAuthorityRootsV1,
    authorityRoot,
    true,
    "wc_public_state_authority_root_generation_changed",
  );
  const cachedTarget = cachedDirectoryIdentityV1(
    durableDirectoryLinksV1,
    target,
    true,
    "wc_public_state_directory_generation_changed",
  );

  for (const component of pathComponentsV1(target)) {
    const requirePrivate = isWithinV1(component, authorityRoot);
    try {
      directoryIdentityV1(component, requirePrivate);
      continue;
    } catch (error: any) {
      if (String(error?.code || "") !== "ENOENT") throw error;
      if (cachedTarget) {
        throw new Error("wc_public_state_directory_generation_changed");
      }
      if (cachedAuthorityRoot && component === authorityRoot) {
        throw new Error(
          "wc_public_state_authority_root_generation_changed",
        );
      }
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

  let authorityIdentity = directoryIdentityV1(authorityRoot, true);
  if (
    cachedAuthorityRoot &&
    !sameIdentityV1(cachedAuthorityRoot, authorityIdentity)
  ) {
    throw new Error(
      "wc_public_state_authority_root_generation_changed",
    );
  }
  if (!cachedAuthorityRoot) {
    const authorityParent = path.dirname(authorityRoot);
    if (authorityParent !== authorityRoot) {
      fsyncDirectoryV1(authorityParent);
      const durableAuthorityIdentity = directoryIdentityV1(
        authorityRoot,
        true,
      );
      if (!sameIdentityV1(authorityIdentity, durableAuthorityIdentity)) {
        throw new Error(
          "wc_public_state_authority_root_generation_changed",
        );
      }
      authorityIdentity = durableAuthorityIdentity;
    }
    durableAuthorityRootsV1.set(authorityRoot, authorityIdentity);
  }

  const identity = directoryIdentityV1(target, true);
  if (cachedTarget) {
    if (!sameIdentityV1(cachedTarget, identity)) {
      throw new Error("wc_public_state_directory_generation_changed");
    }
    return identity;
  }

  const parent = path.dirname(target);
  hook?.("before", parent, target);
  fsyncDirectoryV1(parent);
  hook?.("after", parent, target);
  const after = directoryIdentityV1(target, true);
  if (!sameIdentityV1(identity, after)) {
    throw new Error("wc_public_state_directory_generation_changed");
  }
  const authorityAfter = directoryIdentityV1(authorityRoot, true);
  if (!sameIdentityV1(authorityIdentity, authorityAfter)) {
    throw new Error(
      "wc_public_state_authority_root_generation_changed",
    );
  }
  durableDirectoryLinksV1.set(target, after);
  return after;
}
