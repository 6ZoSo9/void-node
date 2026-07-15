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
  buy: () => placeholderView('Buy', 'Quotes, payment instructions, request status, and history will be presented as one guided purchase flow.', 'Review purchase structure', ['Quote summary', 'Payment review', 'Fulfillment status']),
  validate: () => placeholderView('Validate', 'Staking readiness, candidate status, and validator onboarding will be separated from operator controls.', 'Review validation structure', ['Readiness checklist', 'Candidate status', 'Admission proof']),
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
    ${pageHeader({ eyebrow: 'Public and participant read-only', title: 'Network', purpose: 'Inspect node health, chain alignment, public proofs, and routes without mixing in operator controls.', primary: { label: 'Compare a block', toast: 'Block comparison is not connected in Wave 1.' }, secondary: { label: 'Export status', toast: 'Status export is not connected in Wave 1.' } })}
    <div class="dashboard-grid">
      <section class="surface panel span-12"><div class="panel-header"><div class="panel-header__copy"><span class="eyebrow">Topology</span><h2>Three-box mesh</h2><p>Semantic status and exact node roles replace raw diagnostic output.</p></div><span class="status-chip status-chip--positive"><span class="status-dot status-dot--positive"></span> Aligned</span></div>
        <div class="health-row">
          <article class="health-card"><div class="health-card__top"><strong>Precision</strong><span class="status-chip status-chip--info">Primary</span></div><dl><div><dt>Head</dt><dd>1,856,587</dd></div><div><dt>Peers</dt><dd>2</dd></div></dl></article>
          <article class="health-card"><div class="health-card__top"><strong>Nimo</strong><span class="status-chip">Follower</span></div><dl><div><dt>Head</dt><dd>1,856,587</dd></div><div><dt>Drift</dt><dd>0</dd></div></dl></article>
          <article class="health-card"><div class="health-card__top"><strong>Alienware</strong><span class="status-chip">Public seed</span></div><dl><div><dt>Head</dt><dd>1,856,587</dd></div><div><dt>Peers</dt><dd>2</dd></div></dl></article>
        </div>
      </section>
      <section class="surface panel span-8"><div class="panel-header"><div class="panel-header__copy"><span class="eyebrow">Blocks</span><h2>Recent alignment</h2><p>A concise table for normal users; raw payloads move behind Advanced.</p></div><button class="button button--tertiary" type="button" data-demo-toast="Block explorer is not connected.">Open explorer</button></div>
        <div class="table-wrap"><table><thead><tr><th>Block</th><th>Precision</th><th>Nimo</th><th>Alienware</th><th>Result</th></tr></thead><tbody><tr><td class="mono">1,856,587</td><td>Visible</td><td>Visible</td><td>Visible</td><td><span class="status-chip status-chip--positive">Match</span></td></tr><tr><td class="mono">1,856,586</td><td>Visible</td><td>Visible</td><td>Visible</td><td><span class="status-chip status-chip--positive">Match</span></td></tr><tr><td class="mono">1,856,585</td><td>Visible</td><td>Visible</td><td>Visible</td><td><span class="status-chip status-chip--positive">Match</span></td></tr></tbody></table></div>
      </section>
      <section class="surface panel span-4"><div class="panel-header"><div class="panel-header__copy"><span class="eyebrow">Authority</span><h2>Public boundary</h2></div></div><div class="stack"><div class="alert"><span class="alert__icon">✓</span><div class="alert__copy"><strong>Read-only</strong><p>Public views call only exact GET allowlists.</p></div></div><div class="alert alert--warning"><span class="alert__icon">!</span><div class="alert__copy"><strong>Advanced elsewhere</strong><p>Operator mutations never appear in this view.</p></div></div></div></section>
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
