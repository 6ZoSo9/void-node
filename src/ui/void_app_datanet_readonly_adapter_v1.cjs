const path = require("node:path");

const G = globalThis;
const INSTALL_MARK = "__void_app_datanet_readonly_adapter_v1";
const ROUTE_MARKER = "VOID_APP_DATANET_READONLY_ADAPTER_V1";

const ROUTE_FILES = new Map([
  [
    "/public-node/datanet/field-replication-status-card-v1.json",
    {
      relative: ["public", "public-node", "datanet", "field-replication-status-card-v1.json"],
      contentType: "application/json",
    },
  ],
  [
    "/public-node/datanet/field-replication-status-card-v1.html",
    {
      relative: ["public", "public-node", "datanet", "field-replication-status-card-v1.html"],
      contentType: "text/html",
    },
  ],
  [
    "/public-node/datanet/index.json",
    {
      relative: ["public", "public-node", "datanet", "index.json"],
      contentType: "application/json",
    },
  ],
]);

const isLoopback = (req) => {
  const raw = String(
    req?.socket?.remoteAddress
      || req?.connection?.remoteAddress
      || "",
  ).toLowerCase();
  return (
    raw === "127.0.0.1"
    || raw === "::1"
    || raw === "::ffff:127.0.0.1"
    || raw.startsWith("127.")
  );
};

const securityHeaders = (res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Void-Marker", ROUTE_MARKER);
};

const pathnameOf = (req) => String(
  req?.originalUrl
    || req?.url
    || "",
).split("?", 1)[0];

const mount = () => {
  const state = G[INSTALL_MARK];
  if (state.installed) return;

  const app = G.__void_http_app || G.__void_app || G.APP || G.app || G.__app;
  if (!app || typeof app.use !== "function") {
    state.attempts += 1;
    if (state.attempts < 240) {
      const timer = setTimeout(mount, 250);
      timer.unref?.();
    }
    return;
  }

  app.use((req, res, next) => {
    const route = ROUTE_FILES.get(pathnameOf(req));
    if (!route) return next();

    if (!isLoopback(req)) {
      securityHeaders(res);
      return res.status(404).json({
        ok: false,
        error: "not_found",
        marker: ROUTE_MARKER,
      });
    }

    const method = String(req?.method || "GET").toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      securityHeaders(res);
      return res.status(405).json({
        ok: false,
        error: "method_not_allowed",
        allowed: ["GET", "HEAD"],
        read_only: true,
        marker: ROUTE_MARKER,
      });
    }

    securityHeaders(res);
    res.status(200);
    res.type(route.contentType);
    return res.sendFile(path.join(process.cwd(), ...route.relative));
  });

  state.installed = true;
  state.mounted_at_ms = Date.now();
};

if (!G[INSTALL_MARK]) {
  G[INSTALL_MARK] = {
    installed: false,
    attempts: 0,
    mounted_at_ms: 0,
  };
  mount();
}

module.exports = Object.freeze({
  ROUTE_MARKER,
  ROUTE_FILES,
});
