import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1 =
  "VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1";

export const VOID_BUY_VOID_OPERATOR_CAPABILITY_CREDENTIAL_ID_V1 =
  "buy-void-operator-capability-v1";

export const VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1 =
  "x-void-operator-intent";

export const VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1 =
  "VOID_BUY_VOID_OPERATOR_MUTATION_V1";

export const VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1 =
  Object.freeze({
    loopback_host_required: true,
    loopback_socket_peer_required: true,
    host_or_peer_authority_forbidden: true,
    operator_bearer_capability_required: true,
    fixed_credentials_directory_id: true,
    capability_query_parameter_forbidden: true,
    capability_cookie_forbidden: true,
    capability_browser_storage_forbidden: true,
    mutation_post_required: true,
    mutation_intent_header_required: true,
    cross_site_browser_mutation_forbidden: true,
    public_ingress_authority: false,
    wallet_access: false,
    signing: false,
    transaction_broadcast: false,
    money_movement: false,
  });

const LOCAL_HOST =
  /^(?:127\.0\.0\.1|localhost|\[::1\])(?::([0-9]{1,5}))?$/i;
const LOCAL_REMOTE = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
]);
const CAPABILITY =
  /^voidbvo1\.[A-Za-z0-9_-]{43,128}$/;
const MAX_CAPABILITY_FILE_BYTES = 256;

function hostHeader(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function localHostHeader(value: unknown): boolean {
  const raw = hostHeader(value);
  const match = LOCAL_HOST.exec(raw);
  if (!match) return false;
  if (!match[1]) return true;
  const port = Number(match[1]);
  return Number.isSafeInteger(port) && port >= 1 && port <= 65535;
}

function localRemoteAddress(value: unknown): boolean {
  return (
    typeof value === "string" &&
    LOCAL_REMOTE.has(value.trim().toLowerCase())
  );
}

function sameIdentity(a: fs.Stats, b: fs.Stats): boolean {
  return (
    a.dev === b.dev &&
    a.ino === b.ino &&
    a.mode === b.mode &&
    a.nlink === b.nlink &&
    a.size === b.size &&
    a.mtimeMs === b.mtimeMs &&
    a.ctimeMs === b.ctimeMs
  );
}

function readOperatorCapabilityV1():
  | { ok: true; token: string }
  | { ok: false } {
  const rawDir = String(process.env.CREDENTIALS_DIRECTORY || "").trim();
  if (
    !rawDir ||
    !path.isAbsolute(rawDir) ||
    path.resolve(rawDir) !== rawDir
  ) {
    return { ok: false };
  }

  let directory: fs.Stats;
  try {
    directory = fs.lstatSync(rawDir);
    if (
      !directory.isDirectory() ||
      directory.isSymbolicLink() ||
      fs.realpathSync(rawDir) !== rawDir
    ) {
      return { ok: false };
    }
  } catch {
    return { ok: false };
  }

  const credentialPath = path.join(
    rawDir,
    VOID_BUY_VOID_OPERATOR_CAPABILITY_CREDENTIAL_ID_V1,
  );
  const noFollow = fs.constants.O_NOFOLLOW;
  if (typeof noFollow !== "number" || noFollow <= 0) {
    return { ok: false };
  }

  let fd: number | null = null;
  try {
    const visibleBefore = fs.lstatSync(credentialPath);
    if (
      !visibleBefore.isFile() ||
      visibleBefore.isSymbolicLink() ||
      visibleBefore.nlink !== 1 ||
      visibleBefore.size <= 0 ||
      visibleBefore.size > MAX_CAPABILITY_FILE_BYTES ||
      (visibleBefore.mode & 0o022) !== 0
    ) {
      return { ok: false };
    }

    fd = fs.openSync(
      credentialPath,
      fs.constants.O_RDONLY | noFollow,
    );
    const before = fs.fstatSync(fd);
    if (
      !before.isFile() ||
      before.nlink !== 1 ||
      before.size !== visibleBefore.size ||
      before.size <= 0 ||
      before.size > MAX_CAPABILITY_FILE_BYTES ||
      (before.mode & 0o022) !== 0 ||
      !sameIdentity(visibleBefore, before)
    ) {
      return { ok: false };
    }

    const bytes = Buffer.alloc(before.size + 1);
    let total = 0;
    while (total < bytes.length) {
      const count = fs.readSync(
        fd,
        bytes,
        total,
        bytes.length - total,
        total,
      );
      if (count === 0) break;
      total += count;
    }
    if (total !== before.size) return { ok: false };

    const after = fs.fstatSync(fd);
    const visibleAfter = fs.lstatSync(credentialPath);
    if (
      !sameIdentity(before, after) ||
      !sameIdentity(visibleAfter, after)
    ) {
      return { ok: false };
    }

    const raw = bytes.subarray(0, total).toString("utf8");
    const token = raw.endsWith("\n") ? raw.slice(0, -1) : raw;
    if (
      token !== token.trim() ||
      !CAPABILITY.test(token)
    ) {
      return { ok: false };
    }
    return { ok: true, token };
  } catch {
    return { ok: false };
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
}

function requestBearerV1(req: any): string {
  const value =
    typeof req?.headers?.authorization === "string"
      ? req.headers.authorization.trim()
      : "";
  const match = /^Bearer ([^\s]+)$/.exec(value);
  return match && CAPABILITY.test(match[1]) ? match[1] : "";
}

function capabilityMatchesV1(
  req: any,
  expected: string,
): boolean {
  const supplied = requestBearerV1(req);
  if (!supplied) return false;
  const left = Buffer.from(supplied, "utf8");
  const right = Buffer.from(expected, "utf8");
  return (
    left.length === right.length &&
    crypto.timingSafeEqual(left, right)
  );
}

function sendHeld(
  res: any,
  status: number,
  error: string,
  extra: Record<string, unknown> = {},
): false {
  if (status === 401 && typeof res?.setHeader === "function") {
    res.setHeader(
      "www-authenticate",
      'Bearer realm="void-buy-void-operator-v1"',
    );
  }
  if (status === 405 && typeof res?.setHeader === "function") {
    res.setHeader("allow", "POST");
  }
  res.status(status).json({
    schema: "void_buy_void_operator_auth_v1",
    marker: VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1,
    ok: false,
    error,
    ...extra,
  });
  return false;
}

function localTransportV1(req: any, res: any): boolean {
  const localHost = localHostHeader(req?.headers?.host);
  const localRemote = localRemoteAddress(req?.socket?.remoteAddress);
  if (localHost && localRemote) return true;
  return sendHeld(res, 403, "operator_queue_local_only", {
    loopback_host_required: true,
    loopback_socket_peer_required: true,
  });
}

export function authorizeBuyVoidOperatorLocalShellV1(
  req: any,
  res: any,
): boolean {
  return localTransportV1(req, res);
}

export function authorizeBuyVoidOperatorLocalReadV1(
  req: any,
  res: any,
): boolean {
  if (!localTransportV1(req, res)) return false;

  const capability = readOperatorCapabilityV1();
  if (!capability.ok) {
    return sendHeld(res, 503, "operator_capability_unavailable");
  }
  if (!capabilityMatchesV1(req, capability.token)) {
    return sendHeld(res, 401, "operator_capability_required");
  }
  return true;
}

function localOriginMatchesHost(req: any): boolean {
  const rawOrigin =
    typeof req?.headers?.origin === "string"
      ? req.headers.origin.trim()
      : "";
  if (!rawOrigin) return true;

  let origin: URL;
  try {
    origin = new URL(rawOrigin);
  } catch {
    return false;
  }
  if (
    (origin.protocol !== "http:" && origin.protocol !== "https:") ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !localHostHeader(origin.host)
  ) {
    return false;
  }
  return origin.host.toLowerCase() === hostHeader(req?.headers?.host);
}

export function authorizeBuyVoidOperatorMutationV1(
  req: any,
  res: any,
): boolean {
  if (!authorizeBuyVoidOperatorLocalReadV1(req, res)) return false;

  if (String(req?.method || "").toUpperCase() !== "POST") {
    return sendHeld(res, 405, "operator_mutation_method_not_allowed", {
      required_method: "POST",
    });
  }

  const intent = req?.headers?.[
    VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1
  ];
  if (
    typeof intent !== "string" ||
    intent.trim() !== VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1
  ) {
    return sendHeld(res, 403, "operator_mutation_intent_required", {
      required_header: VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1,
    });
  }

  const fetchSite =
    typeof req?.headers?.["sec-fetch-site"] === "string"
      ? req.headers["sec-fetch-site"].trim().toLowerCase()
      : "";
  if (fetchSite && fetchSite !== "same-origin") {
    return sendHeld(res, 403, "operator_mutation_cross_site_forbidden");
  }

  if (!localOriginMatchesHost(req)) {
    return sendHeld(res, 403, "operator_mutation_origin_forbidden");
  }

  return true;
}
