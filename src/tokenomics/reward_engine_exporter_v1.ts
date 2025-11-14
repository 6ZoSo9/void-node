// SPDX-License-Identifier: VCL-1.0
// NON-CONSENSUS: reward_engine_v1 metrics exporter (shadow mode only).
//
// This hooks into the Express app via the global app handle that src/index.ts
// exposes on globalThis.__void_http_app. It does NOT touch consensus state
// or real balances; it's just observability plumbing for the reward engine.

const DECIMALS = 10n ** 18n;
const MAX_SUPPLY_VOID = 666_666_666n;
const PREMINE_VOID = 230_000_000n;

const MAX_SUPPLY_WEI = MAX_SUPPLY_VOID * DECIMALS;
const PREMINE_WEI = PREMINE_VOID * DECIMALS;

// Shadow state – for now synthetic; later phases will wire to real consensus.
const state = {
  totalMintedWei: 0n,
  lastHeightRewarded: 0n,
  capOverflowWei: 0n,
  roundingDustWei: 0n,
  health: 1n, // 1 = ok, 0 = degraded, -1 = fatal
};

function formatGauge(name: string, help: string, value: bigint | number): string {
  const num = typeof value === 'bigint' ? value.toString() : String(value);
  const lines: string[] = [];
  lines.push(`# HELP ${name} ${help}`);
  lines.push(`# TYPE ${name} gauge`);
  lines.push(`${name} ${num}`);
  return lines.join('\n');
}

function buildMetrics(): string {
  const lines: string[] = [];

  lines.push(
    formatGauge(
      'void_reward_max_supply_wei',
      'MAX_SUPPLY for VOID rewards in wei (666,666,666 * 1e18)',
      MAX_SUPPLY_WEI,
    ),
  );

  lines.push(
    formatGauge(
      'void_reward_premine_wei',
      'Premine for VOID in wei (230,000,000 * 1e18)',
      PREMINE_WEI,
    ),
  );

  lines.push(
    formatGauge(
      'void_reward_total_minted_wei',
      'Total rewards minted to validators in wei (shadow state)',
      state.totalMintedWei,
    ),
  );

  lines.push(
    formatGauge(
      'void_reward_last_height',
      'Last block height for which rewards were computed (shadow state)',
      state.lastHeightRewarded,
    ),
  );

  lines.push(
    formatGauge(
      'void_reward_cap_overflow_wei',
      'Amount that would exceed MAX_SUPPLY if not clamped (should be 0)',
      state.capOverflowWei,
    ),
  );

  lines.push(
    formatGauge(
      'void_reward_rounding_dust_wei',
      'Accumulated rounding dust in wei (should stay small and bounded)',
      state.roundingDustWei,
    ),
  );

  lines.push(
    formatGauge(
      'void_reward_engine_health',
      'Reward engine health flag: 1=ok, 0=degraded, -1=fatal',
      state.health,
    ),
  );

  return lines.join('\n') + '\n';
}

function installRewardEngineExporter(): void {
  try {
    const g: any = globalThis as any;
    const app = g.__void_http_app;

    if (!app || typeof app.get !== 'function') {
      // eslint-disable-next-line no-console
      console.error('[reward-engine-exporter] no __void_http_app; exporter disabled');
      return;
    }

    if (app.__void_reward_engine_exporter_v1_installed) {
      return;
    }
    app.__void_reward_engine_exporter_v1_installed = true;

    app.get('/__void/metrics/reward_engine_v1.prom', (_req: any, res: any) => {
      const body = buildMetrics();
      res.type('text/plain; charset=utf-8').send(body);
    });

    // eslint-disable-next-line no-console
    console.log(
      '[reward-engine-exporter] /__void/metrics/reward_engine_v1.prom ready (shadow)',
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[reward-engine-exporter] failed to install exporter', err);
  }
}

installRewardEngineExporter();

export {};
