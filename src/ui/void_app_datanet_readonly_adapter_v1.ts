import path from "node:path";

export const VOID_APP_DATANET_READONLY_ADAPTER_V1 =
  "VOID_APP_DATANET_READONLY_ADAPTER_V1";

type VoidAppDataNetReadonlyRouteFileV1 = Readonly<{
  relative: readonly string[];
  contentType: string;
}>;

export const VOID_APP_DATANET_READONLY_ROUTE_FILES_V1 = new Map<
  string,
  VoidAppDataNetReadonlyRouteFileV1
>([
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

function isLoopback(req: any): boolean {
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
}

function securityHeaders(res: any): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Void-Marker", VOID_APP_DATANET_READONLY_ADAPTER_V1);
}

function pathnameOf(req: any): string {
  return String(
    req?.originalUrl
      || req?.url
      || "",
  ).split("?", 1)[0];
}

export function mountVoidAppDataNetReadonlyAdapterV1(app: any): void {
  if (!app || typeof app.use !== "function") {
    throw new TypeError("VOID App DataNet adapter requires an app.use function");
  }

  app.use((req: any, res: any, next: any) => {
    const route = VOID_APP_DATANET_READONLY_ROUTE_FILES_V1.get(pathnameOf(req));
    if (!route) return next();

    if (!isLoopback(req)) {
      securityHeaders(res);
      return res.status(404).json({
        ok: false,
        error: "not_found",
        marker: VOID_APP_DATANET_READONLY_ADAPTER_V1,
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
        marker: VOID_APP_DATANET_READONLY_ADAPTER_V1,
      });
    }

    securityHeaders(res);
    res.status(200);
    res.type(route.contentType);
    return res.sendFile(path.join(process.cwd(), ...route.relative));
  });
}
