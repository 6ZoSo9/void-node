import express from "express";

type ScalarResult = {
  value: number | null;
  raw: string | null;
};

async function queryScalar(expr: string, promUrl: string): Promise<ScalarResult> {
  const url = `${promUrl}/api/v1/query?query=${encodeURIComponent(expr)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`[ui-health] Prometheus error for ${expr}: HTTP ${res.status}`);
      return { value: null, raw: null };
    }
    const json: any = await res.json();
    if (!json.data || !Array.isArray(json.data.result) || json.data.result.length === 0) {
      console.warn(`[ui-health] no result for ${expr}`);
      return { value: null, raw: null };
    }
    const rawVal = json.data.result[0].value?.[1] ?? null;
    if (typeof rawVal !== "string") {
      return { value: null, raw: null };
    }
    const num = Number(rawVal);
    if (!Number.isFinite(num)) {
      return { value: null, raw: rawVal };
    }
    return { value: num, raw: rawVal };
  } catch (err) {
    console.error(`[ui-health] query failed for ${expr}:`, err);
    return { value: null, raw: null };
  }
}

async function main(): Promise<void> {
  const app = express();

  const PORT = Number(process.env.VOID_UI_HEALTH_PORT ?? "4315");
  const PROM_URL = process.env.PROM_URL ?? "http://127.0.0.1:9090";

  app.get("/api/ui/health", async (_req, res) => {
    // Raw gauges
    const wcGauge = await queryScalar("void_mainnet_ui_work_credits_health", PROM_URL);
    const dashGauge = await queryScalar("void_mainnet_ui_dashboard_health", PROM_URL);
    const uiPillarsGauge = await queryScalar("void_mainnet_ui_pillars_health", PROM_URL);

    // 5m recordings
    const corePillars5m = await queryScalar("void:mainnet_pillars:health:last_5m", PROM_URL);
    const uiPillars5m = await queryScalar("void:mainnet_ui_pillars:health:last_5m", PROM_URL);
    const withUi5m = await queryScalar("void:mainnet_pillars_with_ui:health:last_5m", PROM_URL);

    const ok =
      corePillars5m.value === 1 &&
      uiPillars5m.value === 1 &&
      withUi5m.value === 1 &&
      wcGauge.value === 1 &&
      dashGauge.value === 1 &&
      uiPillarsGauge.value === 1;

    res.json({
      promUrl: PROM_URL,
      ok,
      gauges: {
        void_mainnet_ui_work_credits_health: wcGauge,
        void_mainnet_ui_dashboard_health: dashGauge,
        void_mainnet_ui_pillars_health: uiPillarsGauge,
      },
      recordings_5m: {
        "void:mainnet_pillars:health:last_5m": corePillars5m,
        "void:mainnet_ui_pillars:health:last_5m": uiPillars5m,
        "void:mainnet_pillars_with_ui:health:last_5m": withUi5m,
      },
    });
  });

  app.get("/", (_req, res) => {
    res.type("text/plain").send(
      [
        "VOID UI health proxy",
        "",
        `  /api/ui/health  -> JSON summary`,
        "",
        `PORT      = ${PORT}`,
        `PROM_URL  = ${PROM_URL}`,
      ].join("\n")
    );
  });

  app.listen(PORT, () => {
    console.log(
      `=== [dev-ui-health] listening on http://127.0.0.1:${PORT}/ (Prom: ${PROM_URL}) ===`
    );
    console.log("    GET /api/ui/health for JSON summary");
  });
}

main().catch((err) => {
  console.error("[dev-ui-health] fatal error:", err);
  process.exit(1);
});
