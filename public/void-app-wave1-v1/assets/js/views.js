const icon = (path) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;

const pageHeader = ({ eyebrow, title, purpose, primary, secondary }) => `
  <header class="page-header">
    <div class="page-header__copy">
      <span class="eyebrow">${eyebrow}</span>
      <h1>${title}</h1>
      <p>${purpose}</p>
    </div>
    <div class="page-actions">
      ${secondary ? `<button class="button button--secondary" type="button" data-demo-toast="${secondary.toast || 'Secondary action selected'}">${secondary.label}</button>` : ''}
      ${primary ? `<button class="button button--primary" type="button" data-demo-toast="${primary.toast || 'Primary action selected'}">${primary.label}${icon('m9 18 6-6-6-6')}</button>` : ''}
    </div>
  </header>`;

export const views = {
  home: () => `
    <div data-home-view>
      <header class="page-header">
        <div class="page-header__copy">
          <span class="eyebrow">Live read-only overview</span>
          <h1>System overview</h1>
          <p>Current node and network truth, without account or mutation authority.</p>
        </div>
        <div class="page-actions">
          <a class="button button--secondary" href="#/network">Open Network</a>
          <button class="button button--primary" type="button" data-home-refresh>
            Refresh
            ${icon('M4 12a8 8 0 0 1 13.7-5.6L20 9m0-5v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15m0 5v-5h5')}
          </button>
        </div>
      </header>

      <div class="dashboard-grid home-live-grid">
        <section class="surface hero-surface span-12" aria-labelledby="home-next-title">
          <div class="hero-content">
            <span class="status-chip status-chip--info" data-home-state-chip>Loading live state</span>
            <h2 id="home-next-title" data-home-next-title>Reading local node truth</h2>
            <p data-home-summary>The Home view is waiting for the exact read-only adapter.</p>
            <div class="hero-actions">
              <a class="button button--primary" href="#/wallet">
                Open Wallet
                ${icon('m9 18 6-6-6-6')}
              </a>
              <small class="home-updated" data-home-last-updated>Not updated yet</small>
            </div>
          </div>
          <aside class="hero-aside" aria-label="Current system signal">
            <div class="signal-line"><span>Network</span><strong data-home-network-state>LOADING</strong></div>
            <div class="signal-line"><span>Account</span><strong data-home-account-state>NOT SELECTED</strong></div>
            <div class="signal-line"><span>Node</span><strong data-home-node-state>LOCAL NODE</strong></div>
          </aside>
        </section>

        <section class="span-12" aria-label="Balance availability">
          <div class="balance-strip">
            <article class="balance-tile">
              <div class="balance-tile__top"><span class="balance-tile__label">VOID</span><span class="status-chip">Wallet</span></div>
              <strong class="balance-tile__value" data-home-void-balance>—</strong>
              <span class="balance-tile__meta" data-home-balance-note>Select an account to load balances</span>
            </article>
            <article class="balance-tile">
              <div class="balance-tile__top"><span class="balance-tile__label">Spendable WC</span><span class="status-chip">Account</span></div>
              <strong class="balance-tile__value" data-home-spendable-wc>—</strong>
              <span class="balance-tile__meta">Unavailable without account context</span>
            </article>
            <article class="balance-tile balance-tile--production">
              <div class="balance-tile__top"><span class="balance-tile__label">Production WC</span><span class="status-chip status-chip--info">Read-only</span></div>
              <strong class="balance-tile__value" data-home-production-wc>—</strong>
              <span class="balance-tile__meta">No account selected</span>
            </article>
          </div>
        </section>

        <section class="surface panel span-7" aria-labelledby="current-state-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Exact adapter</span>
              <h2 id="current-state-title">Current state</h2>
              <p>Four fixed local GET sources. No cached or invented product data.</p>
            </div>
          </div>
          <div class="activity-list">
            <div class="activity-row">
              <span class="activity-icon">${icon('M12 3 4 7v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V7l-8-4Zm-3 9 2 2 4-5')}</span>
              <div class="activity-copy"><strong>HTTP health</strong><small>Local node process and request surface</small></div>
              <div class="activity-value" data-home-health-value>Loading</div>
            </div>
            <div class="activity-row">
              <span class="activity-icon">${icon('m5 12 4 4L19 6')}</span>
              <div class="activity-copy"><strong>Readiness</strong><small>Late routes and operational readiness</small></div>
              <div class="activity-value" data-home-ready-value>Loading</div>
            </div>
            <div class="activity-row">
              <span class="activity-icon">${icon('M5 12h14M12 5l7 7-7 7')}</span>
              <div class="activity-copy"><strong>Peer mesh</strong><small>Current connected peers reported by this node</small></div>
              <div class="activity-value" data-home-peers-value>—</div>
            </div>
          </div>
        </section>

        <section class="surface panel span-5" aria-labelledby="network-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Live signal</span>
              <h2 id="network-title">Network</h2>
              <p>High-level truth only. Detailed proofs remain in Network.</p>
            </div>
          </div>
          <div class="health-row health-row--single">
            <article class="health-card">
              <div class="health-card__top"><strong data-home-node-name>Local node</strong><span class="status-chip status-chip--info">Current</span></div>
              <dl>
                <div><dt>Head</dt><dd data-home-head-value>—</dd></div>
                <div><dt>Peers</dt><dd data-home-peers-value>—</dd></div>
              </dl>
            </article>
            <article class="health-card">
              <div class="health-card__top"><strong>Mesh</strong><span class="status-chip">Read-only</span></div>
              <dl>
                <div><dt>Expected</dt><dd>2 peers</dd></div>
                <div><dt>State</dt><dd data-home-mesh-value>Loading</dd></div>
              </dl>
            </article>
          </div>
        </section>
      </div>
    </div>`,

  wallet: () => walletView(),
  earn: () => earnView(),
  data: () => placeholderView('Data', 'Publish, retrieve, verify, share, and manage datasets from one consistent data workspace.', 'Review data structure', ['Dataset table', 'Publish workflow', 'Verification state']),
  buy: () => buyView(),
  market: () => marketView(),
  validate: () => validateView(),
  network: () => networkView(),
  foundation: () => foundationView(),
};

function walletView() {
  return `
    ${pageHeader({
      eyebrow: 'Read-only account context',
      title: 'Wallet',
      purpose: 'Inspect one participant account, its local wallet identity, and separated Work Credit balances without connecting, unlocking, signing, or sending.',
    })}
    <div class="dashboard-grid wallet-live-grid">
      <section class="surface hero-surface span-12" aria-labelledby="wallet-context-title">
        <div class="hero-content">
          <span class="status-chip status-chip--info" data-wallet-state-chip>No account loaded</span>
          <h2 id="wallet-context-title">Load an account ID</h2>
          <p data-wallet-message>Enter an account ID to load read-only context.</p>
          <form class="wallet-account-form" data-wallet-account-form>
            <div class="form-field wallet-account-field">
              <label for="wallet-account-id">Account ID</label>
              <input
                class="input"
                id="wallet-account-id"
                name="account"
                type="text"
                maxlength="128"
                autocomplete="off"
                spellcheck="false"
                placeholder="zoso or 0x…"
                pattern="[A-Za-z0-9._:-]{1,128}"
                data-wallet-account-input
              >
              <small>Exact participant account key. No browser wallet connection occurs.</small>
            </div>
            <div class="wallet-account-actions">
              <button class="button button--primary" type="submit" data-wallet-load>
                Load account
                ${icon('m9 18 6-6-6-6')}
              </button>
              <button class="button button--tertiary" type="button" data-wallet-clear>Clear</button>
            </div>
          </form>
        </div>
        <aside class="hero-aside" aria-label="Wallet safety boundary">
          <div class="signal-line"><span>Connection</span><strong>NONE</strong></div>
          <div class="signal-line"><span>Signing</span><strong>DISABLED</strong></div>
          <div class="signal-line"><span>Mode</span><strong>READ-ONLY</strong></div>
        </aside>
      </section>

      <section class="span-12" aria-label="Wallet balances">
        <div class="balance-strip">
          <article class="balance-tile">
            <div class="balance-tile__top"><span class="balance-tile__label">VOID</span><span class="status-chip">Unavailable</span></div>
            <strong class="balance-tile__value" data-wallet-void-balance>—</strong>
            <span class="balance-tile__meta">No verified read-only VOID balance source yet</span>
          </article>
          <article class="balance-tile">
            <div class="balance-tile__top"><span class="balance-tile__label">Ledger WC</span><span class="status-chip">Accounting</span></div>
            <strong class="balance-tile__value" data-wallet-ledger-wc>—</strong>
            <span class="balance-tile__meta" data-wallet-ledger-meta>No account loaded</span>
          </article>
          <article class="balance-tile balance-tile--production">
            <div class="balance-tile__top"><span class="balance-tile__label">Production WC</span><span class="status-chip status-chip--info">Non-spendable</span></div>
            <strong class="balance-tile__value" data-wallet-production-wc>—</strong>
            <span class="balance-tile__meta" data-wallet-production-meta>No account loaded</span>
          </article>
        </div>
      </section>

      <section class="surface panel span-7" aria-labelledby="wallet-identity-title">
        <div class="panel-header">
          <div class="panel-header__copy">
            <span class="eyebrow">Local identity</span>
            <h2 id="wallet-identity-title">Wallet status</h2>
            <p>Sanitized status only. Keystores, keys, exports, and raw records are never returned.</p>
          </div>
        </div>
        <dl class="wallet-facts">
          <div><dt>Account ID</dt><dd class="mono" data-wallet-account-id>—</dd></div>
          <div><dt>Wallet address</dt><dd class="mono" data-wallet-address>—</dd></div>
          <div><dt>Local wallet</dt><dd data-wallet-local-status>Not checked</dd></div>
          <div><dt>Lock state</dt><dd data-wallet-lock-state>Not checked</dd></div>
          <div><dt>Native gas</dt><dd data-wallet-native-gas>—</dd></div>
        </dl>
      </section>

      <section class="surface panel span-5" aria-labelledby="wallet-boundary-title">
        <div class="panel-header">
          <div class="panel-header__copy">
            <span class="eyebrow">Protected boundary</span>
            <h2 id="wallet-boundary-title">No authority</h2>
            <p>This view cannot create, import, unlock, export, send, swap, settle, or write a ledger.</p>
          </div>
        </div>
        <div class="activity-list">
          <div class="activity-row"><div class="activity-copy"><strong>Browser wallet</strong><small>No injected provider requested</small></div><div class="activity-value">Not connected</div></div>
          <div class="activity-row"><div class="activity-copy"><strong>Transactions</strong><small>No signing or broadcast path</small></div><div class="activity-value">Disabled</div></div>
          <div class="activity-row"><div class="activity-copy"><strong>Work Credits</strong><small>Separated accounting visibility</small></div><div class="activity-value">Read-only</div></div>
        </div>
      </section>

      <section class="surface panel span-12" aria-labelledby="wallet-source-title">
        <details class="wallet-source-details">
          <summary id="wallet-source-title">Advanced source status</summary>
          <dl class="wallet-source-grid">
            <div><dt>Wallet status</dt><dd data-wallet-source-status>Not checked</dd></div>
            <div><dt>Ledger WC</dt><dd data-wallet-source-ledger>Not checked</dd></div>
            <div><dt>Production WC</dt><dd data-wallet-source-production>Not checked</dd></div>
          </dl>
        </details>
      </section>
    </div>`;
}

function earnView() {
  return `
    <div data-earn-view>
      ${pageHeader({
        eyebrow: 'Read-only earning context',
        title: 'Earn',
        purpose: 'Inspect useful-work policy, Work Credit accounting, recent jobs, and verification receipts without executing work or changing account state.',
      })}

      <div class="alert alert--warning">
        <span class="alert__icon">!</span>
        <div class="alert__copy">
          <strong>Earn Work Credits — not VOID directly</strong>
          <p>Useful verified work earns WC. WC and VOID are separate assets. When the WC/VOID market is activated, participants may exchange WC for VOID at the market-determined price; the $0.50 presale price does not set the WC/VOID rate.</p>
        </div>
      </div>

      <div class="dashboard-grid earn-live-grid">
        <section class="surface hero-surface span-12" aria-labelledby="earn-context-title">
          <div class="hero-content">
            <span class="status-chip status-chip--info" data-earn-state-chip>No account loaded</span>
            <h2 id="earn-context-title">Load a participant account</h2>
            <p data-earn-message>Enter a participant account ID to inspect earning state.</p>

            <form class="earn-account-form" data-earn-account-form>
              <div class="form-field earn-account-field">
                <label for="earn-account-id">Account ID</label>
                <input
                  class="input"
                  id="earn-account-id"
                  name="account"
                  type="text"
                  maxlength="128"
                  autocomplete="off"
                  spellcheck="false"
                  placeholder="zoso or 0x…"
                  pattern="[A-Za-z0-9._:-]{1,128}"
                  data-earn-account-input
                >
                <small>Read-only participant key. No work is submitted and no runner state changes.</small>
              </div>

              <div class="earn-account-actions">
                <button class="button button--primary" type="submit" data-earn-load>
                  Load Earn state
                  ${icon('m9 18 6-6-6-6')}
                </button>
                <button class="button button--tertiary" type="button" data-earn-clear>Clear</button>
              </div>
            </form>
          </div>

          <aside class="hero-aside" aria-label="Earn safety boundary">
            <div class="signal-line"><span>Earning</span><strong data-earn-status>NOT CHECKED</strong></div>
            <div class="signal-line"><span>Background</span><strong data-earn-background>NOT CHECKED</strong></div>
            <div class="signal-line"><span>Authority</span><strong>READ-ONLY</strong></div>
          </aside>
        </section>

        <section class="span-12" aria-label="Work Credit accounting">
          <div class="balance-strip earn-accounting-strip">
            <article class="balance-tile">
              <div class="balance-tile__top">
                <span class="balance-tile__label">Earned WC</span>
                <span class="status-chip">Accounting</span>
              </div>
              <strong class="balance-tile__value" data-earn-earned-wc>—</strong>
              <span class="balance-tile__meta" data-earn-earned-meta>No account loaded</span>
            </article>

            <article class="balance-tile">
              <div class="balance-tile__top">
                <span class="balance-tile__label">Redeemable WC</span>
                <span class="status-chip status-chip--info">Visibility only</span>
              </div>
              <strong class="balance-tile__value" data-earn-redeemable-wc>—</strong>
              <span class="balance-tile__meta" data-earn-redeemable-meta>No action in this view</span>
            </article>

            <article class="balance-tile balance-tile--production">
              <div class="balance-tile__top">
                <span class="balance-tile__label">Production WC</span>
                <span class="status-chip status-chip--info">Non-spendable</span>
              </div>
              <strong class="balance-tile__value" data-earn-production-wc>—</strong>
              <span class="balance-tile__meta" data-earn-production-meta>Separate canary accounting</span>
            </article>
          </div>
        </section>

        <section class="surface panel span-5" aria-labelledby="earn-posture-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Current posture</span>
              <h2 id="earn-posture-title">Earning policy</h2>
              <p>Account-specific visibility without runner controls.</p>
            </div>
          </div>

          <dl class="earn-facts">
            <div><dt>Account ID</dt><dd class="mono" data-earn-account-id>—</dd></div>
            <div><dt>Approved work</dt><dd data-earn-approved-work>Not checked</dd></div>
            <div><dt>Policy</dt><dd data-earn-policy>Not checked</dd></div>
            <div><dt>Safe mode</dt><dd data-earn-safe-mode>Not checked</dd></div>
            <div><dt>WC last hour</dt><dd data-earn-last-hour>—</dd></div>
            <div><dt>Last credit</dt><dd data-earn-last-credit>No credit loaded</dd></div>
            <div><dt>Credit time</dt><dd data-earn-last-credit-time>—</dd></div>
          </dl>
        </section>

        <section class="surface panel span-7" aria-labelledby="earn-work-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Policy selection</span>
              <h2 id="earn-work-title">Available work</h2>
              <p>The node's current useful-work selection is shown without a Run Once or submit action.</p>
            </div>
            <span class="status-chip status-chip--info">Execution disabled</span>
          </div>

          <div class="activity-list">
            <div class="activity-row">
              <div class="activity-copy">
                <strong data-earn-task-label>No task selected</strong>
                <small data-earn-task-reason>Load an account to inspect policy selection.</small>
              </div>
              <div class="activity-value">Read-only</div>
            </div>
            <div class="activity-row">
              <div class="activity-copy">
                <strong>Difficulty</strong>
                <small>Sanitized policy bucket</small>
              </div>
              <div class="activity-value" data-earn-task-difficulty>—</div>
            </div>
            <div class="activity-row">
              <div class="activity-copy">
                <strong>Network need</strong>
                <small>Bounded selection score</small>
              </div>
              <div class="activity-value" data-earn-task-need>—</div>
            </div>
          </div>
        </section>

        <section class="surface panel span-6" aria-labelledby="earn-jobs-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Bounded history</span>
              <h2 id="earn-jobs-title">Recent jobs</h2>
              <p>Five sanitized account jobs. Inputs and metadata remain hidden.</p>
            </div>
            <span class="status-chip"><span data-earn-jobs-count>0</span> shown</span>
          </div>

          <div class="earn-history-list" data-earn-jobs-list></div>
          <div class="earn-empty-state" data-earn-jobs-empty>No recent jobs loaded.</div>
        </section>

        <section class="surface panel span-6" aria-labelledby="earn-receipts-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Verification results</span>
              <h2 id="earn-receipts-title">Recent receipts</h2>
              <p>Five sanitized account receipts. Roots, leaves, and raw payloads stay hidden.</p>
            </div>
            <span class="status-chip"><span data-earn-receipts-count>0</span> shown</span>
          </div>

          <div class="earn-history-list" data-earn-receipts-list></div>
          <div class="earn-empty-state" data-earn-receipts-empty>No verification receipts loaded.</div>
        </section>

        <section class="surface panel span-12" aria-labelledby="earn-advanced-title">
          <details class="earn-source-details">
            <summary id="earn-advanced-title">Advanced read-only details</summary>

            <div class="earn-advanced-grid">
              <dl class="earn-source-grid">
                <div><dt>Runner status</dt><dd data-earn-source-runner>Not checked</dd></div>
                <div><dt>Reward summary</dt><dd data-earn-source-reward>Not checked</dd></div>
                <div><dt>Redeemable accounting</dt><dd data-earn-source-redeemable>Not checked</dd></div>
                <div><dt>Production WC</dt><dd data-earn-source-production>Not checked</dd></div>
                <div><dt>Jobs</dt><dd data-earn-source-jobs>Not checked</dd></div>
                <div><dt>Receipts</dt><dd data-earn-source-receipts>Not checked</dd></div>
                <div><dt>DataNet/WC</dt><dd data-earn-source-datanet>Not checked</dd></div>
              </dl>

              <dl class="earn-source-grid">
                <div><dt>DataNet</dt><dd data-earn-datanet-status>Not checked</dd></div>
                <div><dt>Node receipt records</dt><dd data-earn-datanet-records>—</dd></div>
                <div><dt>Account WC events</dt><dd data-earn-account-events>—</dd></div>
                <div><dt>Job execution</dt><dd>Disabled</dd></div>
                <div><dt>Reward award</dt><dd>Disabled</dd></div>
                <div><dt>Ledger write</dt><dd>Disabled</dd></div>
                <div><dt>Money movement</dt><dd>Disabled</dd></div>
              </dl>
            </div>
          </details>
        </section>
      </div>
    </div>`;
}

function buyView() {
  return `
    <div data-buy-view data-buy-marker="VOID_BUY_VOID_APP_LAUNCH_READY_V1">
      ${pageHeader({
        eyebrow: 'Activation-gated fixed-price presale',
        title: 'Buy VOID',
        purpose: 'Create a guarded Base or Ethereum native-USDC purchase request only when the live presale gate is OPEN. This page never sends funds or connects a wallet.',
      })}

      <div class="alert alert--warning buy-risk-warning" role="alert">
        <span class="alert__icon">!</span>
        <div class="alert__copy">
          <strong>SELF-CUSTODY ONLY — EXCHANGE SENDS ARE TREATED AS LOST</strong>
          <p>VOID is not listed on any exchange. Do not send USDC from an exchange or custodial wallet. The selected-rail USDC sender address is bound as the VOID destination identity. If an exchange sends for you, resulting VOID can be delivered to an address you do not control. VOID cannot recover those funds. Treat any exchange or custodial send as lost.</p>
        </div>
      </div>

      <div class="dashboard-grid buy-launch-grid">
        <section class="surface hero-surface span-12" aria-labelledby="buy-presale-title">
          <div class="hero-content">
            <span class="status-chip status-chip--info" data-buy-state-chip>Checking presale</span>
            <h2 id="buy-presale-title">Fixed-price presale</h2>
            <p data-buy-message>Loading the live Buy VOID configuration and verified sale state. Payment instructions remain hidden until the activation gate is open and a request is created.</p>
          </div>
          <aside class="hero-aside" aria-label="Presale launch state">
            <div class="signal-line"><span>Policy price</span><strong data-buy-price>$0.50 / VOID</strong></div>
            <div class="signal-line"><span>Intake</span><strong data-buy-intake>CHECKING</strong></div>
            <div class="signal-line"><span>Fulfillment</span><strong data-buy-fulfillment>GUARDED</strong></div>
          </aside>
        </section>

        <section class="span-12" aria-label="Presale accounting">
          <div class="balance-strip">
            <article class="balance-tile">
              <div class="balance-tile__top"><span class="balance-tile__label">Presale allocation</span><span class="status-chip">Fixed</span></div>
              <strong class="balance-tile__value" data-buy-pool-total>10,000,000 VOID</strong>
              <span class="balance-tile__meta">Finite presale pool</span>
            </article>
            <article class="balance-tile">
              <div class="balance-tile__top"><span class="balance-tile__label">Remaining</span><span class="status-chip status-chip--info">Verified state</span></div>
              <strong class="balance-tile__value" data-buy-pool-remaining>—</strong>
              <span class="balance-tile__meta" data-buy-progress>Waiting for sale state</span>
            </article>
            <article class="balance-tile balance-tile--production">
              <div class="balance-tile__top"><span class="balance-tile__label">Verified USDC</span><span class="status-chip">Paid only</span></div>
              <strong class="balance-tile__value" data-buy-raised>—</strong>
              <span class="balance-tile__meta">Unpaid requests do not reserve inventory</span>
            </article>
          </div>
        </section>

        <section class="surface panel span-7" aria-labelledby="buy-request-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Request before payment</span>
              <h2 id="buy-request-title">Create Buy VOID request</h2>
              <p>The button stays disabled unless the live node reports request intake ready.</p>
            </div>
            <span class="status-chip status-chip--warning" data-buy-form-chip>HOLD</span>
          </div>

          <form class="buy-request-form" data-buy-request-form>
            <div class="form-field">
              <label for="buy-usdc-chain">Payment network</label>
              <select class="input" id="buy-usdc-chain" name="source_chain" data-buy-chain disabled>
                <option value="base">Base Mainnet — native USDC</option>
                <option value="ethereum">Ethereum Mainnet — native USDC</option>
              </select>
              <small>Choose one network and use only the chain/token returned by the request.</small>
            </div>
            <div class="form-field">
              <label for="buy-usdc-amount">Native USDC amount</label>
              <input class="input" id="buy-usdc-amount" name="amount" inputmode="decimal" autocomplete="off" placeholder="25" data-buy-amount disabled>
              <small data-buy-limits>Loading live purchase limits.</small>
            </div>
            <div class="form-field">
              <label for="buy-void-destination">Native VOID destination address</label>
              <input class="input mono" id="buy-void-destination" name="void_destination_address" autocomplete="off" spellcheck="false" placeholder="0x…" data-buy-destination disabled>
              <small>The selected-rail USDC sender must be this exact same address.</small>
            </div>

            <div class="buy-checklist" aria-label="Required purchase acknowledgements">
              <label><input type="checkbox" data-buy-ack="self_custody" disabled> I control this self-custody address and understand exchange/custodial sends are treated as lost.</label>
              <label><input type="checkbox" data-buy-ack="native_usdc" disabled> I will send native USDC only on the network selected above and verify the returned token contract.</label>
              <label><input type="checkbox" data-buy-ack="request_before_payment" disabled> I will not send funds until this request is created and I verify its instructions.</label>
              <label><input type="checkbox" data-buy-ack="sender_equals_void_destination" disabled> The selected-rail USDC sender will equal the VOID destination address above.</label>
              <label><input type="checkbox" data-buy-ack="no_automatic_fulfillment" disabled> I understand payment observation alone is not a VOID fulfillment receipt.</label>
            </div>

            <div class="buy-action-row">
              <button class="button button--primary" type="submit" data-buy-submit disabled>Create Buy VOID request</button>
              <button class="button button--tertiary" type="button" data-buy-refresh>Refresh readiness</button>
            </div>
          </form>

          <pre class="buy-request-result" data-buy-result aria-live="polite">Presale readiness is loading. Do not send funds.</pre>
        </section>

        <section class="surface panel span-5" aria-labelledby="buy-instructions-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Verified payment identity</span>
              <h2 id="buy-instructions-title">Payment boundary</h2>
              <p>Never use an address copied from a message, post, or exchange withdrawal screen.</p>
            </div>
          </div>
          <dl class="buy-facts">
            <div><dt>Supported rails</dt><dd>Base Mainnet · 8453<br>Ethereum Mainnet · 1</dd></div>
            <div><dt>Asset</dt><dd>Native USDC</dd></div>
            <div><dt>Base USDC contract</dt><dd class="mono" data-buy-base-usdc-contract>—</dd></div>
            <div><dt>Ethereum USDC contract</dt><dd class="mono" data-buy-ethereum-usdc-contract>—</dd></div>
            <div><dt>Approved receiver</dt><dd class="mono" data-buy-receiver>Hidden until verified</dd></div>
            <div><dt>VOID chain</dt><dd>2050</dd></div>
            <div><dt>Exchange/custody</dt><dd class="buy-danger-copy">NOT SUPPORTED</dd></div>
          </dl>
        </section>

        <section class="surface panel span-6" aria-labelledby="buy-wc-void-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Coupled economic launch</span>
              <h2 id="buy-wc-void-title">WC / VOID market</h2>
              <p>The WC/VOID price is market-determined. The fixed $0.50 presale price does not set the WC/VOID exchange rate.</p>
            </div>
            <span class="status-chip status-chip--warning">Activation gated</span>
          </div>
          <div class="activity-list">
            <div class="activity-row"><div class="activity-copy"><strong>Pricing</strong><small>Pool price discovery; no fixed WC→VOID redemption rate.</small></div><div class="activity-value">Market</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Trading</strong><small>No trade button is exposed until the reviewed market runtime is live.</small></div><div class="activity-value">HOLD</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Launch order</strong><small>Presale activation remains the immediate gate; WC/VOID can follow its bounded activation ceremony.</small></div><div class="activity-value">Prepared</div></div>
          </div>
          <div class="alert alert--warning">
            <span class="alert__icon">!</span>
            <div class="alert__copy">
              <strong>Use the exact rail returned by your request</strong>
              <p>Base Mainnet and Ethereum Mainnet native USDC are supported request rails. Never switch networks or token contracts after request creation; use only the exact chain, contract, receiver, amount, and sender identity returned by the request.</p>
            </div>
          </div>
          <p class="panel-link-row"><a href="#/market">Open WC / VOID launch status →</a></p>
        </section>

        <section class="surface panel span-6" aria-labelledby="buy-earn-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Useful work</span>
              <h2 id="buy-earn-title">Earn Work Credits</h2>
              <p>VOID does not award VOID directly for ordinary useful work. Verified useful work earns WC; WC can participate in the WC/VOID market after activation.</p>
            </div>
            <span class="status-chip status-chip--info">WC accounting</span>
          </div>
          <p class="panel-link-row"><a href="#/earn">Open Earn →</a></p>
        </section>
      </div>
    </div>`;
}

function marketView() {
  return `
    <div data-market-view data-market-marker="VOID_WC_VOID_PUBLIC_LAUNCH_STATUS_V1">
      ${pageHeader({
        eyebrow: 'Activation-gated market',
        title: 'WC / VOID',
        purpose: 'Review the WC/VOID launch boundary. No quote, trade, debit, settlement, wallet, or signer control is exposed before the reviewed market runtime is live.',
      })}
      <div class="alert alert--warning">
        <span class="alert__icon">!</span>
        <div class="alert__copy">
          <strong>WC/VOID trading is not open from this page</strong>
          <p>The pool is being prepared for activation. The exchange rate will be market-determined; there is no fixed 100 WC = 1 VOID redemption and the $0.50 presale price does not set this market.</p>
        </div>
      </div>
      <div class="dashboard-grid">
        <section class="surface hero-surface span-12">
          <div class="hero-content">
            <span class="status-chip status-chip--warning">ACTIVATION GATED</span>
            <h2>Prepared without premature authority</h2>
            <p>The source, policy, vault, bounded-canary, and coupled-launch work can be completed independently of the website. Trade controls stay absent until live evidence proves the market is ready.</p>
          </div>
          <aside class="hero-aside" aria-label="WC VOID market policy">
            <div class="signal-line"><span>Pair</span><strong>WC / VOID</strong></div>
            <div class="signal-line"><span>Price</span><strong>MARKET-DETERMINED</strong></div>
            <div class="signal-line"><span>Trade authority</span><strong>HOLD</strong></div>
          </aside>
        </section>
        <section class="surface panel span-6">
          <div class="panel-header"><div class="panel-header__copy"><span class="eyebrow">Earn side</span><h2>Work → WC</h2><p>Useful verified work earns Work Credits under the network's bounded earning policy.</p></div></div>
          <p class="panel-link-row"><a href="#/earn">Review Earn →</a></p>
        </section>
        <section class="surface panel span-6">
          <div class="panel-header"><div class="panel-header__copy"><span class="eyebrow">Market side</span><h2>WC ↔ VOID</h2><p>Once activated, the pool determines the exchange rate from market state rather than a treasury-fixed conversion promise.</p></div></div>
          <p class="panel-link-row"><a href="#/buy">Review presale →</a></p>
        </section>
      </div>
    </div>`;
}

function validateView() {
  return `
    <div data-validate-view>
      ${pageHeader({
        eyebrow: 'Sealed public-safe readiness',
        title: 'Validate',
        purpose: 'Review the current Mainnet-0 validator candidate readiness definition without opening registration, stake, wallet, admission, or validator mutation authority.',
      })}
      <div class="dashboard-grid">
        <section class="surface hero-surface span-12" aria-labelledby="validate-readiness-title">
          <div class="hero-content">
            <span class="status-chip status-chip--info" data-validate-state-chip>Checking readiness</span>
            <h2 id="validate-readiness-title">Validator candidate readiness</h2>
            <p data-validate-message>No candidate state is inferred until the sealed public-safe readiness contract validates.</p>
          </div>
          <aside class="hero-aside" aria-label="Validator readiness summary">
            <div class="signal-line"><span>Minimum policy reference</span><strong data-validate-stake-policy>—</strong></div>
            <div class="signal-line"><span>Checklist items</span><strong data-validate-item-count>—</strong></div>
            <div class="signal-line"><span>Mode</span><strong>READ-ONLY</strong></div>
          </aside>
        </section>

        <section class="surface panel span-7" aria-labelledby="validate-items-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Definition-only checklist</span>
              <h2 id="validate-items-title">Candidate readiness items</h2>
              <p>These are future reviewer requirements. They are not an intake form and do not create admission.</p>
            </div>
          </div>
          <div class="activity-list" data-validate-items aria-live="polite"></div>
        </section>

        <section class="surface panel span-5" aria-labelledby="validate-gates-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Fail-closed gates</span>
              <h2 id="validate-gates-title">Current authority</h2>
              <p>Unavailable or contradictory evidence remains HOLD.</p>
            </div>
          </div>
          <div class="activity-list">
            <div class="activity-row"><div class="activity-copy"><strong>Candidate registration</strong><small>No public registration path.</small></div><div class="activity-value" data-validate-registration>Not checked</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Candidate intake</strong><small>No public intake path.</small></div><div class="activity-value" data-validate-intake>Not checked</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Public submit</strong><small>No candidate submission mutation.</small></div><div class="activity-value" data-validate-submit>Not checked</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Wallet connect</strong><small>No browser wallet connection.</small></div><div class="activity-value" data-validate-wallet>Not checked</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Stake lock</strong><small>Policy visibility only.</small></div><div class="activity-value" data-validate-stake-lock>Not checked</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Active admission</strong><small>No validator activation authority.</small></div><div class="activity-value" data-validate-admission>Not checked</div></div>
            <div class="activity-row"><div class="activity-copy"><strong>Validator-set write</strong><small>No validator-set mutation.</small></div><div class="activity-value" data-validate-set-write>Not checked</div></div>
          </div>
        </section>

        <section class="surface panel span-12" aria-labelledby="validate-boundary-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Safety boundary</span>
              <h2 id="validate-boundary-title">Visibility is not admission</h2>
              <p>This view exposes no Stake, Submit, Connect Wallet, Activate, signer, transaction, funds, validator-set write, or runtime-mutation path.</p>
            </div>
          </div>
        </section>
      </div>
    </div>`;
}

function placeholderView(title, purpose, primaryLabel, blocks) {
  return `
    ${pageHeader({ eyebrow: 'Wave 1 route scaffold', title, purpose, primary: { label: primaryLabel, toast: `${title} feature logic is frozen until its migration wave.` } })}
    <div class="alert"><span class="alert__icon">i</span><div class="alert__copy"><strong>Structure only</strong><p>This route demonstrates the shared page template, responsive behavior, and component language. It performs no feature action.</p></div></div>
    <div class="placeholder-grid view-placeholder view-placeholder--spaced">
      <section class="surface placeholder-primary">
        <div class="placeholder-primary__bar"><span class="status-chip">Primary workflow slot</span><div class="segmented-control" aria-label="Example view density"><button type="button" aria-pressed="true">Focused</button><button type="button" aria-pressed="false">Detailed</button></div></div>
        <div class="skeleton skeleton--title"></div><div class="skeleton skeleton--line skeleton--78"></div><div class="skeleton skeleton--line skeleton--62"></div><div class="skeleton skeleton--block"></div><div class="skeleton skeleton--block"></div>
      </section>
      <aside class="placeholder-secondary">
        ${blocks.map((block, index) => `<section class="surface placeholder-block"><span class="eyebrow">Supporting ${index + 1}</span><h3>${block}</h3><p>Consistent supporting information without competing with the primary task.</p></section>`).join('')}
      </aside>
    </div>`;
}

function networkView() {
  return `
    <div data-network-bootstrap-view>
      ${pageHeader({
        eyebrow: 'Live read-only network',
        title: 'Network',
        purpose: 'Loading current Mainnet-0 evidence. Static topology, peer identities, and historical block values are never substituted for live truth.',
      })}
      <div class="dashboard-grid">
        <section class="surface hero-surface span-12" aria-labelledby="network-bootstrap-title">
          <div class="hero-content">
            <span class="status-chip status-chip--info">Initializing live network</span>
            <h2 id="network-bootstrap-title">Connecting to the read-only network adapter</h2>
            <p>Current chain head, peer visibility, readiness, and source health appear only after a fresh snapshot validates.</p>
          </div>
          <aside class="hero-aside" aria-label="Network initialization state">
            <div class="signal-line"><span>Network</span><strong>MAINNET-0</strong></div>
            <div class="signal-line"><span>Evidence</span><strong>LOADING</strong></div>
            <div class="signal-line"><span>Mode</span><strong>READ-ONLY</strong></div>
          </aside>
        </section>

        <section class="span-12" aria-label="Network evidence loading">
          <div class="balance-strip">
            <article class="balance-tile">
              <div class="balance-tile__top"><span class="balance-tile__label">Chain head</span><span class="status-chip">Live only</span></div>
              <strong class="balance-tile__value">—</strong>
              <span class="balance-tile__meta">Waiting for validated evidence</span>
            </article>
            <article class="balance-tile">
              <div class="balance-tile__top"><span class="balance-tile__label">Visible peers</span><span class="status-chip">Live only</span></div>
              <strong class="balance-tile__value">—</strong>
              <span class="balance-tile__meta">No remote identity is inferred</span>
            </article>
            <article class="balance-tile balance-tile--production">
              <div class="balance-tile__top"><span class="balance-tile__label">Source checks</span><span class="status-chip status-chip--info">GET-only</span></div>
              <strong class="balance-tile__value">—</strong>
              <span class="balance-tile__meta">Health · readiness · head · peers</span>
            </article>
          </div>
        </section>

        <section class="surface panel span-12" aria-labelledby="network-bootstrap-boundary-title">
          <div class="panel-header">
            <div class="panel-header__copy">
              <span class="eyebrow">Truth boundary</span>
              <h2 id="network-bootstrap-boundary-title">No stale fallback</h2>
              <p>If live network evidence cannot initialize, this view stays empty rather than showing cached, hard-coded, or inferred machine state.</p>
            </div>
            <span class="status-chip">Read-only</span>
          </div>
        </section>
      </div>
    </div>`;
}

function foundationView() {
  const tokens = [
    ['Canvas','#07090d','canvas'], ['Surface 1','#0d121a','surface-1'], ['Surface 3','#172230','surface-3'], ['Cyan','#4ce5df','cyan'], ['Violet','#9d88ff','violet'], ['Positive','#59e391','positive'], ['Warning','#f5c85b','warning'], ['Danger','#ff718f','danger'], ['Primary text','#f4f7fb','text-primary'], ['Muted text','#788697','text-muted'], ['Border','rgba','border'], ['Overlay','rgba','overlay']
  ];
  return `
    ${pageHeader({ eyebrow: 'Wave 1 review surface', title: 'UI Foundation', purpose: 'Tokens, components, interaction states, and responsive patterns are reviewed here before any feature migration.', primary: { label: 'Approve foundation', toast: 'Approval is a human review decision; no state was changed.' } })}
    <section class="foundation-section"><div class="foundation-section__header"><div><span class="eyebrow">Foundations</span><h2>Semantic color</h2></div><p>Graphite structure, cyan interaction, violet identity, and semantic status colors. Accents are restrained rather than decorative.</p></div><div class="token-grid">${tokens.map(([name,value,bg]) => `<article class="color-token color-token--${bg}"><strong>${name}</strong><small>${value}</small></article>`).join('')}</div></section>
    <section class="foundation-section"><div class="foundation-section__header"><div><span class="eyebrow">Foundations</span><h2>Typography</h2></div><p>System sans for legibility; monospace only for identifiers, code, and machine values.</p></div><div class="surface panel typography-sample"><div class="type-row"><span>Display / 40</span><div class="type-display">Network aligned.</div></div><div class="type-row"><span>Heading / 24</span><h2>Wallet activity</h2></div><div class="type-row"><span>Body / 16</span><p>Clear copy explains the task without repeating implementation boundaries.</p></div><div class="type-row"><span>Mono / 13</span><code class="mono">0x8c994003…577dbed7</code></div></div></section>
    <section class="foundation-section"><div class="foundation-section__header"><div><span class="eyebrow">Primitives</span><h2>Components</h2></div><p>Reusable components replace feature-specific cards and inline styling.</p></div><div class="component-grid">
      <article class="surface component-example"><h3>Buttons and status</h3><div class="component-example__stage"><button class="button button--primary" type="button">Primary</button><button class="button button--secondary" type="button">Secondary</button><button class="button button--tertiary" type="button">Tertiary</button><span class="status-chip status-chip--positive">Healthy</span><span class="status-chip status-chip--warning">Guarded</span></div></article>
      <article class="surface component-example"><h3>Fields</h3><div class="component-example__stage component-example__stage--grid component-example__stage--full"><div class="form-field"><label for="demo-account">Account</label><input class="input" id="demo-account" value="0x8c99…bed7"><small>Participant identity</small></div></div></article>
      <article class="surface component-example"><h3>Alerts</h3><div class="component-example__stage component-example__stage--grid"><div class="alert"><span class="alert__icon">i</span><div class="alert__copy"><strong>Informational</strong><p>Context without blocking the task.</p></div></div><div class="alert alert--warning"><span class="alert__icon">!</span><div class="alert__copy"><strong>Guarded action</strong><p>Explicit review is required.</p></div></div></div></article>
      <article class="surface component-example"><h3>Empty and loading</h3><div class="component-example__stage component-example__stage--grid component-example__stage--full"><div class="skeleton skeleton--title"></div><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line skeleton--65"></div></div></article>
    </div></section>`;
}
