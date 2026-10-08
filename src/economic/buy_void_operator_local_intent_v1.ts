export const VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1 =
  "VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_V1";

export const VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_HEADER_V1 =
  "x-void-operator-intent";

export const VOID_BUY_VOID_OPERATOR_MUTATION_INTENT_VALUE_V1 =
  "VOID_BUY_VOID_OPERATOR_MUTATION_V1";

export const VOID_BUY_VOID_OPERATOR_LOCAL_INTENT_AUTHORITY_V1 =
  Object.freeze({
    loopback_host_required: true,
    loopback_socket_peer_required: true,
    host_or_peer_authority_forbidden: true,
    mutation_post_required: true,
    mutation_intent_header_required: true,
    cross_site_browser_mutation_forbidden: true,
    query_secret: false,
    cookie_authentication: false,
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
  return typeof value === "string" && LOCAL_REMOTE.has(value.trim().toLowerCase());
}

function sendHeld(
  res: any,
  status: number,
  error: string,
  extra: Record<string, unknown> = {},
): false {
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

export function authorizeBuyVoidOperatorLocalReadV1(
  req: any,
  res: any,
): boolean {
  const localHost = localHostHeader(req?.headers?.host);
  const localRemote = localRemoteAddress(req?.socket?.remoteAddress);
  if (localHost && localRemote) return true;
  return sendHeld(res, 403, "operator_queue_local_only", {
    loopback_host_required: true,
    loopback_socket_peer_required: true,
  });
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
