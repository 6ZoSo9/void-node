import fs from "node:fs";
import path from "node:path";

export type WcPublicStateDirectoryIdentityV1 = {
  dev: string;
  ino: string;
  uid: string;
  mode: number;
};

type WcPublicStateDirectoryNamespaceEpochV1 = {
  dev: string;
  ino: string;
  mtime_ns: string;
  ctime_ns: string;
};

type WcPublicStateDurableDirectoryLinkV1 = {
  child: WcPublicStateDirectoryIdentityV1;
  parent: WcPublicStateDirectoryIdentityV1;
  parent_namespace: WcPublicStateDirectoryNamespaceEpochV1;
};

export type WcPublicStateDirectoryParentFsyncHookV1 =
  | ((
      phase: "before" | "after",
      parent: string,
      child: string,
    ) => void)
  | null;

export type WcPublicStateDirectoryBeforeCachePublishHookV1 =
  | ((parent: string, child: string) => void)
  | null;

let beforeCachePublishHookForProofV1:
  WcPublicStateDirectoryBeforeCachePublishHookV1 = null;

export function setWcPublicStateDirectoryBeforeCachePublishHookForProofV1(
  hook: WcPublicStateDirectoryBeforeCachePublishHookV1,
): void {
  beforeCachePublishHookForProofV1 = hook;
}

// Once an authority root or durability-critical descendant has been
// admitted, its exact directory generation remains authoritative for this
// process lifetime. A different private directory at the same pathname is a
// replacement, not an implicit recovery or rotation.
const durableAuthorityRootsV1 =
  new Map<string, WcPublicStateDirectoryIdentityV1>();
const durableDirectoryLinksV1 =
  new Map<string, WcPublicStateDurableDirectoryLinkV1>();

function directoryIdentityFromStatV1(
  stat: any,
  requirePrivate: boolean,
): WcPublicStateDirectoryIdentityV1 {
  if (!stat.isDirectory()) {
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

function directoryIdentityV1(
  dir: string,
  requirePrivate: boolean,
): WcPublicStateDirectoryIdentityV1 {
  const stat: any = fs.lstatSync(dir, { bigint: true } as any);
  if (stat.isSymbolicLink()) {
    throw new Error("wc_public_state_directory_not_authoritative");
  }
  return directoryIdentityFromStatV1(stat, requirePrivate);
}

function directoryIdentityAtParentFdV1(
  parentFd: number,
  childName: string,
  requirePrivate: boolean,
  changedCode: string,
): WcPublicStateDirectoryIdentityV1 {
  if (
    !childName ||
    childName === "." ||
    childName === ".." ||
    path.basename(childName) !== childName
  ) {
    throw new Error(changedCode);
  }

  let stat: any;
  try {
    stat = fs.lstatSync(
      path.join(
        "/proc/self/fd",
        String(parentFd),
        childName,
      ),
      { bigint: true } as any,
    );
  } catch (error: any) {
    const code = String(error?.code || "");
    if (code === "ENOENT" || code === "ENOTDIR") {
      throw new Error(changedCode);
    }
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(changedCode);
  }
  return directoryIdentityFromStatV1(stat, requirePrivate);
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

function directoryNamespaceEpochFromStatV1(
  stat: any,
): WcPublicStateDirectoryNamespaceEpochV1 {
  if (!stat.isDirectory()) {
    throw new Error("wc_public_state_directory_not_authoritative");
  }
  return {
    dev: String(stat.dev),
    ino: String(stat.ino),
    mtime_ns: String(stat.mtimeNs),
    ctime_ns: String(stat.ctimeNs),
  };
}

function directoryNamespaceEpochV1(
  dir: string,
  requirePrivate: boolean,
): WcPublicStateDirectoryNamespaceEpochV1 {
  const stat: any = fs.lstatSync(
    dir,
    { bigint: true } as any,
  );
  if (stat.isSymbolicLink()) {
    throw new Error(
      "wc_public_state_directory_not_authoritative",
    );
  }
  directoryIdentityFromStatV1(stat, requirePrivate);
  return directoryNamespaceEpochFromStatV1(stat);
}

function sameNamespaceEpochV1(
  a: WcPublicStateDirectoryNamespaceEpochV1,
  b: WcPublicStateDirectoryNamespaceEpochV1,
): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.mtime_ns === b.mtime_ns &&
    a.ctime_ns === b.ctime_ns
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

function fsyncExactDirectoryLinkV1(
  parent: string,
  child: string,
  expectedParent: WcPublicStateDirectoryIdentityV1,
  expectedChild: WcPublicStateDirectoryIdentityV1,
  parentRequirePrivate: boolean,
  hook: WcPublicStateDirectoryParentFsyncHookV1,
): WcPublicStateDurableDirectoryLinkV1 {
  const parentChanged =
    "wc_public_state_directory_parent_generation_changed";
  const childChanged =
    "wc_public_state_directory_generation_changed";
  const childName = path.basename(child);
  if (path.dirname(child) !== parent || !childName) {
    throw new Error(parentChanged);
  }

  hook?.("before", parent, child);

  let fd: number;
  try {
    fd = fs.openSync(
      parent,
      fs.constants.O_RDONLY |
        Number((fs.constants as any).O_DIRECTORY || 0) |
        Number((fs.constants as any).O_NOFOLLOW || 0),
    );
  } catch (error: any) {
    const code = String(error?.code || "");
    if (
      code === "ENOENT" ||
      code === "ENOTDIR" ||
      code === "ELOOP"
    ) {
      throw new Error(parentChanged);
    }
    throw error;
  }

  try {
    const openedBefore: any = fs.fstatSync(
      fd,
      { bigint: true } as any,
    );
    const openedParent = directoryIdentityFromStatV1(
      openedBefore,
      parentRequirePrivate,
    );
    const openedNamespace =
      directoryNamespaceEpochFromStatV1(openedBefore);
    if (!sameIdentityV1(expectedParent, openedParent)) {
      throw new Error(parentChanged);
    }

    const linkedBefore = directoryIdentityAtParentFdV1(
      fd,
      childName,
      true,
      childChanged,
    );
    if (!sameIdentityV1(expectedChild, linkedBefore)) {
      throw new Error(childChanged);
    }

    const namespaceBeforeFsync =
      directoryNamespaceEpochFromStatV1(
        fs.fstatSync(fd, { bigint: true } as any),
      );
    if (!sameNamespaceEpochV1(openedNamespace, namespaceBeforeFsync)) {
      throw new Error(childChanged);
    }

    fs.fsyncSync(fd);
    hook?.("after", parent, child);

    const openedAfter: any = fs.fstatSync(
      fd,
      { bigint: true } as any,
    );
    const openedParentAfter = directoryIdentityFromStatV1(
      openedAfter,
      parentRequirePrivate,
    );
    if (!sameIdentityV1(openedParent, openedParentAfter)) {
      throw new Error(parentChanged);
    }
    const openedNamespaceAfter =
      directoryNamespaceEpochFromStatV1(openedAfter);
    if (!sameNamespaceEpochV1(openedNamespace, openedNamespaceAfter)) {
      throw new Error(childChanged);
    }

    const linkedAfter = directoryIdentityAtParentFdV1(
      fd,
      childName,
      true,
      childChanged,
    );
    if (!sameIdentityV1(expectedChild, linkedAfter)) {
      throw new Error(childChanged);
    }

    const parentAfter = directoryIdentityV1(
      parent,
      parentRequirePrivate,
    );
    if (!sameIdentityV1(expectedParent, parentAfter)) {
      throw new Error(parentChanged);
    }
    const childAfter = directoryIdentityV1(child, true);
    if (!sameIdentityV1(expectedChild, childAfter)) {
      throw new Error(childChanged);
    }

    const openedNamespaceFinal =
      directoryNamespaceEpochFromStatV1(
        fs.fstatSync(fd, { bigint: true } as any),
      );
    if (
      !sameNamespaceEpochV1(
        openedNamespace,
        openedNamespaceFinal,
      )
    ) {
      throw new Error(childChanged);
    }

    return {
      child: childAfter,
      parent: parentAfter,
      parent_namespace: openedNamespaceFinal,
    };
  } finally {
    fs.closeSync(fd);
  }
}

function assertDurableDirectoryLinkCurrentV1(
  parent: string,
  child: string,
  parentRequirePrivate: boolean,
  durableLink: WcPublicStateDurableDirectoryLinkV1,
): void {
  const parentChanged =
    "wc_public_state_directory_parent_generation_changed";
  const childChanged =
    "wc_public_state_directory_generation_changed";

  const currentParent = directoryIdentityV1(
    parent,
    parentRequirePrivate,
  );
  if (!sameIdentityV1(durableLink.parent, currentParent)) {
    throw new Error(parentChanged);
  }

  const currentChild = directoryIdentityV1(child, true);
  if (!sameIdentityV1(durableLink.child, currentChild)) {
    throw new Error(childChanged);
  }

  const currentNamespace = directoryNamespaceEpochV1(
    parent,
    parentRequirePrivate,
  );
  if (
    !sameNamespaceEpochV1(
      durableLink.parent_namespace,
      currentNamespace,
    )
  ) {
    throw new Error(childChanged);
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

function cachedDirectoryLinkV1(
  key: string,
): WcPublicStateDurableDirectoryLinkV1 | null {
  const cached = durableDirectoryLinksV1.get(key);
  if (!cached) return null;

  let current: WcPublicStateDirectoryIdentityV1;
  try {
    current = directoryIdentityV1(key, true);
  } catch (error: any) {
    if (String(error?.code || "") === "ENOENT") {
      throw new Error(
        "wc_public_state_directory_generation_changed",
      );
    }
    throw error;
  }
  if (!sameIdentityV1(cached.child, current)) {
    throw new Error(
      "wc_public_state_directory_generation_changed",
    );
  }
  return cached;
}

function ensureDurableDirectoryLinkComponentV1(
  component: string,
  authorityRoot: string,
  hook: WcPublicStateDirectoryParentFsyncHookV1,
): WcPublicStateDirectoryIdentityV1 {
  const requirePrivate = isWithinV1(
    component,
    authorityRoot,
  );
  const identity = directoryIdentityV1(
    component,
    requirePrivate,
  );
  const parent = path.dirname(component);
  if (parent === component) return identity;

  const parentRequirePrivate = isWithinV1(
    parent,
    authorityRoot,
  );
  const parentIdentity = directoryIdentityV1(
    parent,
    parentRequirePrivate,
  );
  const cached = durableDirectoryLinksV1.get(component);
  const childChanged =
    component === authorityRoot
      ? "wc_public_state_authority_root_generation_changed"
      : "wc_public_state_directory_generation_changed";

  if (cached) {
    if (!sameIdentityV1(cached.child, identity)) {
      throw new Error(childChanged);
    }
    if (!sameIdentityV1(cached.parent, parentIdentity)) {
      throw new Error(
        "wc_public_state_directory_parent_generation_changed",
      );
    }
    const parentNamespace = directoryNamespaceEpochV1(
      parent,
      parentRequirePrivate,
    );
    if (
      sameNamespaceEpochV1(
        cached.parent_namespace,
        parentNamespace,
      )
    ) {
      return identity;
    }
  }

  const durableLink = fsyncExactDirectoryLinkV1(
    parent,
    component,
    parentIdentity,
    identity,
    parentRequirePrivate,
    hook,
  );
  beforeCachePublishHookForProofV1?.(
    parent,
    component,
  );
  assertDurableDirectoryLinkCurrentV1(
    parent,
    component,
    parentRequirePrivate,
    durableLink,
  );
  durableDirectoryLinksV1.set(
    component,
    durableLink,
  );
  return durableLink.child;
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
  const cachedTarget = cachedDirectoryLinkV1(target);

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

  const durableComponents = pathComponentsV1(target).filter(
    (component) => isWithinV1(component, authorityRoot),
  );
  if (
    durableComponents.length === 0 ||
    durableComponents[0] !== authorityRoot ||
    durableComponents[durableComponents.length - 1] !== target
  ) {
    throw new Error(
      "wc_public_state_directory_outside_authority_root",
    );
  }

  const authorityIdentity =
    ensureDurableDirectoryLinkComponentV1(
      authorityRoot,
      authorityRoot,
      hook,
    );
  if (
    cachedAuthorityRoot &&
    !sameIdentityV1(cachedAuthorityRoot, authorityIdentity)
  ) {
    throw new Error(
      "wc_public_state_authority_root_generation_changed",
    );
  }
  if (!cachedAuthorityRoot) {
    durableAuthorityRootsV1.set(
      authorityRoot,
      authorityIdentity,
    );
  }

  for (const component of durableComponents) {
    if (
      component === authorityRoot ||
      component === target
    ) {
      continue;
    }
    ensureDurableDirectoryLinkComponentV1(
      component,
      authorityRoot,
      hook,
    );
  }

  if (target === authorityRoot) {
    return authorityIdentity;
  }

  const identity = directoryIdentityV1(target, true);
  if (cachedTarget) {
    if (!sameIdentityV1(cachedTarget.child, identity)) {
      throw new Error("wc_public_state_directory_generation_changed");
    }

    const parent = path.dirname(target);
    const parentRequirePrivate =
      isWithinV1(parent, authorityRoot);
    const parentIdentity = directoryIdentityV1(
      parent,
      parentRequirePrivate,
    );
    if (!sameIdentityV1(cachedTarget.parent, parentIdentity)) {
      throw new Error(
        "wc_public_state_directory_parent_generation_changed",
      );
    }

    const parentNamespace = directoryNamespaceEpochV1(
      parent,
      parentRequirePrivate,
    );
    if (
      !sameNamespaceEpochV1(
        cachedTarget.parent_namespace,
        parentNamespace,
      )
    ) {
      // Sibling publication can legitimately advance the same parent's
      // namespace epoch. Re-establish the exact parent->child link before
      // reusing durability authority; a replacement parent generation is
      // rejected above even when the exact child inode was reparented.
      const durableLink = fsyncExactDirectoryLinkV1(
        parent,
        target,
        parentIdentity,
        identity,
        parentRequirePrivate,
        hook,
      );
      beforeCachePublishHookForProofV1?.(
        parent,
        target,
      );
      assertDurableDirectoryLinkCurrentV1(
        parent,
        target,
        parentRequirePrivate,
        durableLink,
      );
      durableDirectoryLinksV1.set(
        target,
        durableLink,
      );
      return durableLink.child;
    }
    return identity;
  }

  const parent = path.dirname(target);
  const parentRequirePrivate =
    isWithinV1(parent, authorityRoot);
  const parentIdentity = directoryIdentityV1(
    parent,
    parentRequirePrivate,
  );
  const durableLink = fsyncExactDirectoryLinkV1(
    parent,
    target,
    parentIdentity,
    identity,
    parentRequirePrivate,
    hook,
  );
  beforeCachePublishHookForProofV1?.(
    parent,
    target,
  );
  assertDurableDirectoryLinkCurrentV1(
    parent,
    target,
    parentRequirePrivate,
    durableLink,
  );
  const authorityAfter = directoryIdentityV1(authorityRoot, true);
  if (!sameIdentityV1(authorityIdentity, authorityAfter)) {
    throw new Error(
      "wc_public_state_authority_root_generation_changed",
    );
  }
  durableDirectoryLinksV1.set(
    target,
    durableLink,
  );
  return durableLink.child;
}
