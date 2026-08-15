import "./void_app_wave3_wallet_readonly_v1.js";
import os from "node:os";
import {
  fetchVoidUiWave2HomeSourceJsonV1,
  type VoidUiWave2HomeSourceResultV1,
  VoidUiWave2HomeSnapshotBuildOwnerV1,
} from "./void_app_wave2_home_source_fetch_v1.js";

const G: any = globalThis as any;
const INSTALL_MARK = "__void_app_wave2_home_readonly_v1";
const HOME_ROUTE = "/__void/ui/wave2/home.json";
const STATUS_ROUTE = "/__void/ui/wave2-home-v1/status.json";
const ROUTE_MARKER = "VOID_UI_WAVE2_HOME_READONLY_V1";

type SourceResult = VoidUiWave2HomeSourceResultV1;

type HomeSnapshot = {
  ok: true;
  marker: string;
  generated_at: string;
  read_only: true;
  network_name: "Mainnet-0";
  source_base: string;
  node: {
    hostname: string;
    label: string;
    role: "precision" | "nimo" | "alienware" | "local";
  };
  network: {
    health: "healthy" | "degraded";
    ready: boolean;
    chain_head: number | null;
    peer_count: number;
    expected_peer_count: 2;
  };
  account: {
    selected: false;
    label: "No account selected";
  };
  balances: {
    available: false;
    void_display: "—";
    spendable_wc_display: "—";
    production_wc_display: "—";
  };
  sources: {
    health: SourceResult;
    ready: SourceResult;
    head: SourceResult;
    peers: SourceResult;
  };
  boundaries: {
    wallet_send: false;
    ledger_write: false;
    fulfillment: false;
    wc_to_void: false;
    validator_mutation: false;
    operator_mutation: false;
    money_movement: false;
  };
};

if (!G[INSTALL_MARK]) {
  G[INSTALL_MARK] = {
    installed: false,
    attempts: 0,
    mounted_at_ms: 0,
  };

  const snapshotBuildOwner =
    new VoidUiWave2HomeSnapshotBuildOwnerV1<HomeSnapshot>();

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
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Void-Marker", ROUTE_MARKER);
  };

  const sourceBase = (): string => {
    const fallback = `http://127.0.0.1:${Number(process.env.HTTP_PORT || 4100)}`;
    const candidate = String(
      process.env.VOID_UI_HOME_SOURCE_BASE || fallback
    ).trim();

    try {
      const parsed = new URL(candidate);
      const allowedHost =
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "::1";

      if (
        parsed.protocol !== "http:" ||
        !allowedHost ||
        (parsed.pathname !== "/" && parsed.pathname !== "") ||
        parsed.search ||
        parsed.hash ||
        parsed.username ||
        parsed.password
      ) {
        return fallback;
      }

      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return fallback;
    }
  };

  const fetchJson = async (
    base: string,
    route: string
  ): Promise<SourceResult> =>
    fetchVoidUiWave2HomeSourceJsonV1(base, route);

  const nodeIdentity = (): HomeSnapshot["node"] => {
    const hostname = os.hostname();
    const lower = hostname.toLowerCase();

    if (lower.includes("precision")) {
      return { hostname, label: "Precision", role: "precision" };
    }

    if (lower.includes("n153b") || lower.includes("nimo")) {
      return { hostname, label: "Nimo", role: "nimo" };
    }

    if (lower.includes("alienware")) {
      return { hostname, label: "Alienware", role: "alienware" };
    }

    return { hostname, label: hostname, role: "local" };
  };

  const chainHead = (body: any): number | null => {
    const value =
      body?.number ??
      body?.height ??
      body?.head ??
      body?.latest ??
      null;

    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const peerCount = (body: any): number => {
    if (Array.isArray(body)) return body.length;
    if (Array.isArray(body?.connected)) return body.connected.length;
    if (Array.isArray(body?.peers)) return body.peers.length;
    return 0;
  };

  const buildSnapshot = async (): Promise<HomeSnapshot> => {
    const base = sourceBase();

    const [health, ready, head, peers] = await Promise.all([
      fetchJson(base, "/health"),
      fetchJson(base, "/__void/ready.json"),
      fetchJson(base, "/blocks/latest/number2.json"),
      fetchJson(base, "/p2p/peers"),
    ]);

    const sourceAvailability =
      health.status === 200 &&
      ready.status === 200 &&
      head.status === 200 &&
      peers.status === 200;

    const readyBody =
      ready.body !== null &&
      typeof ready.body === "object" &&
      !Array.isArray(ready.body)
        ? (ready.body as Record<string, unknown>)
        : {};

    const readyReasons = Array.isArray(readyBody.reasons)
      ? readyBody.reasons.filter(
          (reason): reason is string =>
            typeof reason === "string" && reason.length > 0
        )
      : [];

    const operationalReady =
      sourceAvailability &&
      readyBody.ready === true &&
      readyBody.txroot_live === 1 &&
      readyReasons.length === 0;

    return {
      ok: true,
      marker: ROUTE_MARKER,
      generated_at: new Date().toISOString(),
      read_only: true,
      network_name: "Mainnet-0",
      source_base: base,
      node: nodeIdentity(),
      network: {
        health: operationalReady ? "healthy" : "degraded",
        ready: operationalReady,
        chain_head: chainHead(head.body),
        peer_count: peerCount(peers.body),
        expected_peer_count: 2,
      },
      account: {
        selected: false,
        label: "No account selected",
      },
      balances: {
        available: false,
        void_display: "—",
        spendable_wc_display: "—",
        production_wc_display: "—",
      },
      sources: {
        health,
        ready,
        head,
        peers,
      },
      boundaries: {
        wallet_send: false,
        ledger_write: false,
        fulfillment: false,
        wc_to_void: false,
        validator_mutation: false,
        operator_mutation: false,
        money_movement: false,
      },
    };
  };

  const buildSnapshotCoalesced = (): Promise<HomeSnapshot> =>
    snapshotBuildOwner.getOrStart(buildSnapshot);

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

    app.use((req: any, res: any, next: any) => {
      const pathname = String(
        req?.originalUrl ||
        req?.url ||
        ""
      ).split("?", 1)[0];

      if (pathname !== HOME_ROUTE && pathname !== STATUS_ROUTE) {
        return next();
      }

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

      return next();
    });

    app.get(HOME_ROUTE, async (_req: any, res: any) => {
      securityHeaders(res);
      return res.status(200).json(await buildSnapshotCoalesced());
    });

    app.get(STATUS_ROUTE, (_req: any, res: any) => {
      securityHeaders(res);
      return res.status(200).json({
        ok: true,
        marker: ROUTE_MARKER,
        installed: true,
        home_route: HOME_ROUTE,
        loopback_only: true,
        methods: ["GET", "HEAD"],
        typed_read_only_adapter: true,
        exact_source_routes: [
          "/health",
          "/__void/ready.json",
          "/blocks/latest/number2.json",
          "/p2p/peers",
        ],
        source_base_loopback_only: true,
        account_selected: false,
        balances_available: false,
        root_replaced: false,
        participant_replaced: false,
        public_node_replaced: false,
        wallet_send: false,
        ledger_write: false,
        fulfillment: false,
        wc_to_void: false,
        validator_mutation: false,
        operator_mutation: false,
        money_movement: false,
      });
    });

    state.installed = true;
    state.mounted_at_ms = Date.now();

    try {
      console.log(
        `[void-app-wave2-home-readonly.v1] mounted ${HOME_ROUTE} loopback-only`
      );
    } catch {
      // Logging must never affect adapter availability.
    }
  };

  mount();
}
