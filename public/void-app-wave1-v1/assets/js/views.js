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
    ${pageHeader({ eyebrow: 'Participant workspace', title: 'Good morning, ZoSo.', purpose: 'One clear place to understand your account, the network, and your next useful action.', primary: { label: 'Continue setup', toast: 'Setup flow is intentionally not connected in Wave 1.' }, secondary: { label: 'View activity', toast: 'Activity view is a foundation placeholder.' } })}
    <div class="dashboard-grid">
      <section class="surface hero-surface span-12" aria-labelledby="home-next-title">
        <div class="hero-content">
          <span class="status-chip status-chip--info"><span class="status-dot status-dot--positive"></span> Foundation state</span>
          <h2 id="home-next-title">Finish securing your local wallet</h2>
          <p>The shell recommends one next action at a time. Supporting detail stays visible without competing for attention.</p>
          <div class="hero-actions"><button class="button button--primary" type="button" data-demo-toast="Wallet setup is not connected in this foundation preview.">Open Wallet setup${icon('m9 18 6-6-6-6')}</button><button class="button button--tertiary" type="button" data-demo-toast="Help content previewed.">Why this matters</button></div>
        </div>
        <aside class="hero-aside" aria-label="Current system signal">
          <div class="signal-line"><span>Network</span><strong>HEALTHY</strong></div>
          <div class="signal-line"><span>Account</span><strong>0x8c99…bed7</strong></div>
          <div class="signal-line"><span>Node</span><strong>PRECISION</strong></div>
        </aside>
      </section>

      <section class="span-12" aria-label="Balance snapshot">
        <div class="balance-strip">
          <article class="balance-tile"><div class="balance-tile__top"><span class="balance-tile__label">VOID</span><span class="status-chip">Wallet</span></div><strong class="balance-tile__value">—</strong><span class="balance-tile__meta">Available after wallet connection</span></article>
          <article class="balance-tile"><div class="balance-tile__top"><span class="balance-tile__label">Spendable WC</span><span class="status-chip">Local</span></div><strong class="balance-tile__value">0</strong><span class="balance-tile__meta">Participant-ledger balance</span></article>
          <article class="balance-tile balance-tile--production"><div class="balance-tile__top"><span class="balance-tile__label">Production WC</span><span class="status-chip status-chip--info">Read-only</span></div><strong class="balance-tile__value">1</strong><span class="balance-tile__meta">Verified · not spendable or redeemable</span></article>
        </div>
      </section>

      <section class="surface panel span-7" aria-labelledby="activity-title">
        <div class="panel-header"><div class="panel-header__copy"><span class="eyebrow">Recent</span><h2 id="activity-title">Activity</h2><p>One feed across wallet, work, data, and network events.</p></div><button class="button button--tertiary" type="button" data-demo-toast="Full activity route is not connected.">View all</button></div>
        <div class="activity-list">
          <div class="activity-row"><span class="activity-icon">${icon('M12 3 4 7v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V7l-8-4Zm-3 9 2 2 4-5')}</span><div class="activity-copy"><strong>Production work verified</strong><small>DataNet fetch matched the expected input hash</small></div><div class="activity-value">+1 WC<br><small>Today</small></div></div>
          <div class="activity-row"><span class="activity-icon">${icon('M4 5v14h16V5H4Zm4 4h8m-8 4h5')}</span><div class="activity-copy"><strong>Dataset published</strong><small>65 bytes · local DataNet record</small></div><div class="activity-value">Verified<br><small>Today</small></div></div>
          <div class="activity-row"><span class="activity-icon">${icon('M5 12h14M12 5l7 7-7 7')}</span><div class="activity-copy"><strong>Network aligned</strong><small>Precision, Nimo, and Alienware report the same head</small></div><div class="activity-value">1,856,587<br><small>Now</small></div></div>
        </div>
      </section>

      <section class="surface panel span-5" aria-labelledby="network-title">
        <div class="panel-header"><div class="panel-header__copy"><span class="eyebrow">Live signal</span><h2 id="network-title">Network</h2><p>High-level health only. Detailed diagnostics live in Network or Advanced.</p></div><span class="status-chip status-chip--positive"><span class="status-dot status-dot--positive"></span> Healthy</span></div>
        <div class="health-row health-row--single">
          <article class="health-card"><div class="health-card__top"><strong>Precision</strong><span class="status-chip status-chip--positive">Primary</span></div><dl><div><dt>Head</dt><dd>1,856,587</dd></div><div><dt>Peers</dt><dd>2 / 2</dd></div></dl></article>
          <article class="health-card"><div class="health-card__top"><strong>Mesh</strong><span class="status-chip status-chip--positive">Aligned</span></div><dl><div><dt>Nodes</dt><dd>3</dd></div><div><dt>Drift</dt><dd>0</dd></div></dl></article>
        </div>
      </section>
    </div>`,

  wallet: () => placeholderView('Wallet', 'Balances, identity, sends, swaps, and activity will migrate here without changing existing wallet authority.', 'Review wallet structure', ['Balance group', 'Wallet identity', 'Activity and receipts']),
  earn: () => placeholderView('Earn', 'Approved work, manual execution, jobs, verification, and Work Credit results will live in a dedicated workflow.', 'Review earning structure', ['Available work', 'Job status', 'Verification result']),
  data: () => placeholderView('Data', 'Publish, retrieve, verify, share, and manage datasets from one consistent data workspace.', 'Review data structure', ['Dataset table', 'Publish workflow', 'Verification state']),
  buy: () => placeholderView('Buy', 'Quotes, payment instructions, request status, and history will be presented as one guided purchase flow.', 'Review purchase structure', ['Quote summary', 'Payment review', 'Fulfillment status']),
  validate: () => placeholderView('Validate', 'Staking readiness, candidate status, and validator onboarding will be separated from operator controls.', 'Review validation structure', ['Readiness checklist', 'Candidate status', 'Admission proof']),
  network: () => networkView(),
  foundation: () => foundationView(),
};

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
