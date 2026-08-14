import path from "node:path";

require("./void_app_datanet_readonly_adapter_v1.cjs");

const G: any = globalThis as any;
const INSTALL_MARK = "__void_app_wave1_foundation_v1";
const ROUTE_PREFIX = "/app";
const STATUS_ROUTE = "/__void/ui/wave1-foundation-v1/status.json";
const ROUTE_MARKER = "VOID_UI_WAVE1_REPOSITORY_FOUNDATION_V1";

if (!G[INSTALL_MARK]) {
  G[INSTALL_MARK] = {
    installed: false,
    attempts: 0,
    mounted_at_ms: 0,
  };

  const isLoopback = (req: any): boolean => {
    const raw = String(
      req?.socket?.remoteAddress ||
      req?.connection?.remoteAddress ||
      ""
    ).toLowerCase();

    return (
      raw === "127.0.0.1" ||
      raw === "::1" ||
      raw === "::ffff:127.0.0.1" ||
      raw.startsWith("127.")
    );
  };

  const securityHeaders = (res: any): void => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; " +
      "img-src 'self' data:; font-src 'self'; connect-src 'self'; " +
      "object-src 'none'; base-uri 'self'; form-action 'self'; " +
      "frame-ancestors 'none'"
    );
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    );
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Void-Marker", ROUTE_MARKER);
  };

  const rejectOutsideLoopback = (req: any, res: any): boolean => {
    if (isLoopback(req)) return false;

    securityHeaders(res);
    res.status(404).json({
      ok: false,
      error: "not_found",
      marker: ROUTE_MARKER,
    });
    return true;
  };

  const mount = (): void => {
    const state = G[INSTALL_MARK];
    if (state.installed) return;

    const app: any =
      G.__void_http_app ||
      G.__void_app ||
      G.APP ||
      G.app ||
      G.__app;

    if (!app || typeof app.get !== "function" || typeof app.use !== "function") {
      state.attempts += 1;
      if (state.attempts < 240) {
        const timer: any = setTimeout(mount, 250);
        timer.unref?.();
      }
      return;
    }

    const express = require("express");
    const shellDir = path.join(
      process.cwd(),
      "public",
      "void-app-wave1-v1"
    );

    app.use(ROUTE_PREFIX, (req: any, res: any, next: any) => {
      if (rejectOutsideLoopback(req, res)) return;

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

      return next();
    });

    app.use((req: any, res: any, next: any) => {
      const pathname = String(
        req?.originalUrl ||
        req?.url ||
        ""
      ).split("?", 1)[0];

      if (pathname !== ROUTE_PREFIX) return next();

      securityHeaders(res);
      return res.redirect(302, `${ROUTE_PREFIX}/`);
    });

    app.use(
      ROUTE_PREFIX,
      express.static(shellDir, {
        index: "index.html",
        maxAge: 0,
        etag: false,
        fallthrough: true,
        dotfiles: "deny",
        setHeaders: (res: any) => {
          securityHeaders(res);
        },
      })
    );

    app.use(ROUTE_PREFIX, (_req: any, res: any) => {
      securityHeaders(res);
      return res.status(404).type("text/plain").send("VOID app route not found");
    });

    app.get(STATUS_ROUTE, (req: any, res: any) => {
      if (rejectOutsideLoopback(req, res)) return;

      securityHeaders(res);
      return res.status(200).json({
        ok: true,
        marker: ROUTE_MARKER,
        installed: true,
        route: `${ROUTE_PREFIX}/`,
        shell_dir: shellDir,
        loopback_only: true,
        methods: ["GET", "HEAD"],
        primary_destinations: [
          "home",
          "wallet",
          "earn",
          "data",
          "buy",
          "validate",
          "network",
        ],
        advanced_is_primary_destination: false,
        api_calls: false,
        feature_logic: false,
        root_replaced: false,
        participant_replaced: false,
        public_node_replaced: false,
        wallet_logic: false,
        work_credit_logic: false,
        datanet_logic: false,
        buy_void_logic: false,
        validator_logic: false,
        operator_mutation: false,
        wallet_send: false,
        ledger_write: false,
        fulfillment: false,
        wc_to_void: false,
        money_movement: false,
      });
    });

    state.installed = true;
    state.mounted_at_ms = Date.now();

    try {
      console.log(
        `[void-app-wave1-foundation.v1] mounted ${ROUTE_PREFIX}/ loopback-only`
      );
    } catch {
      // Logging must never affect shell availability.
    }
  };

  mount();
}
