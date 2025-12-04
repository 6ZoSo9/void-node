import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  Cpu,
  MessageCircle,
  Wallet,
  ArrowRightLeft,
  Radio,
  ShieldCheck,
  BarChart3,
  Grid3X3,
} from "lucide-react";

type Channel = {
  id: string;
  name: string;
  isDefault: boolean;
};

type ChatMessage = {
  id: number;
  channel: string;
  author: string;
  text: string;
  ts: string;
};

const DEFAULT_CHANNELS: Channel[] = [
  { id: "general", name: "#general", isDefault: true },
  { id: "tech", name: "#tech", isDefault: true },
  { id: "crypto", name: "#crypto", isDefault: true },
  { id: "sports", name: "#sports", isDefault: true },
  { id: "music", name: "#music", isDefault: true },
  { id: "tv", name: "#tv", isDefault: true },
  { id: "movies", name: "#movies", isDefault: true },
  { id: "games", name: "#games", isDefault: true },
  { id: "religion", name: "#religion", isDefault: true },
  { id: "void-dev", name: "#void-dev", isDefault: true },
  { id: "ai-lab", name: "#ai-lab", isDefault: true },
  { id: "nullfeed-meta", name: "#nullfeed-meta", isDefault: true },
];

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    channel: "general",
    author: "system",
    text: "Welcome to NullFeed v0 on VOID.",
    ts: "now",
  },
  {
    id: 2,
    channel: "void-dev",
    author: "system",
    text: "Mainnet pillars: GREEN. Work Credits v0: GREEN.",
    ts: "now",
  },
];

const MainDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<"overview" | "wallet" | "nullfeed">(
    "overview"
  );
  const [channels, setChannels] = useState<Channel[]>(DEFAULT_CHANNELS);
  const [activeChannel, setActiveChannel] = useState<string>("general");
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [chatInput, setChatInput] = useState("");
  const [joinInput, setJoinInput] = useState("");

  // Stub data – replace with real node/wallet hooks later
  const nodeStatus = {
    chainId: 2050,
    network: "VOID mainnet (plan-ready)",
    head: 1_717_588,
    safebootHead: 231_260,
    safebootGap: 1_486_328,
    txrootHealthy: true,
    lastmileHealthy: true,
  };

  const walletSummary = {
    address: "0x7D49...E6f1",
    voidBalance: "0.00",
    wcBalance: "0",
  };

  const wcHealth = {
    ciHealth: 1,
    policyProfile: "dev",
  };

  const handleSendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const next: ChatMessage = {
      id: messages.length + 1,
      channel: activeChannel,
      author: "you",
      text,
      ts: new Date().toLocaleTimeString(),
    };
    setMessages([...messages, next]);
    setChatInput("");
  };

  const handleJoinChannel = () => {
    const raw = joinInput.trim();
    if (!raw) return;

    let name = raw;
    if (!name.startsWith("#")) {
      name = `#${name}`;
    }
    const id = name.replace(/^#/, "");

    if (!channels.find((c) => c.id === id)) {
      setChannels([
        ...channels,
        { id, name, isDefault: false },
      ]);
    }
    setActiveChannel(id);
    setJoinInput("");
  };

  const filteredMessages = messages.filter(
    (m) => m.channel === activeChannel
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-slate-100">
      {/* Top nav */}
      <header className="border-b border-slate-800 bg-black/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-xs font-semibold tracking-[0.2em]">
              Φ
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-50">
                VOID / Obelisk
              </span>
              <span className="text-xs text-slate-400">
                Node · Wallet · NullFeed
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2 text-xs">
            <Button
              size="sm"
              variant={activeNav === "overview" ? "default" : "ghost"}
              onClick={() => setActiveNav("overview")}
            >
              Overview
            </Button>
            <Button
              size="sm"
              variant={activeNav === "wallet" ? "default" : "ghost"}
              onClick={() => setActiveNav("wallet")}
            >
              Wallet
            </Button>
            <Button
              size="sm"
              variant={activeNav === "nullfeed" ? "default" : "ghost"}
              onClick={() => setActiveNav("nullfeed")}
            >
              NullFeed
            </Button>
            <Button size="sm" variant="ghost" disabled>
              Marketplace (soon)
            </Button>
            <Button size="sm" variant="ghost" disabled>
              Tradeview (soon)
            </Button>
          </nav>

          <div className="flex items-center gap-4 text-xs">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-600/40 bg-emerald-900/20 px-3 py-1 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_theme(colors.emerald.400)]" />
              <span className="font-medium text-emerald-300">Pillars: GREEN</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-mono text-xs text-slate-300">
                {walletSummary.address}
              </span>
              <span className="text-[11px] text-slate-500">
                VOID {walletSummary.voidBalance} · WC {walletSummary.wcBalance}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-4">
        {activeNav === "overview" && (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Left: Node / system */}
            <div className="space-y-4">
              <Card className="border-slate-800 bg-slate-950/60">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-slate-900 p-2">
                        <Activity className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Node
                        </div>
                        <div className="text-sm font-medium text-slate-50">
                          Chain {nodeStatus.chainId} — {nodeStatus.network}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-900/40 px-3 py-1 text-[11px] font-medium text-emerald-300">
                      Healthy
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-900/70 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Head (main)
                      </div>
                      <div className="font-mono text-sm text-slate-50">
                        {nodeStatus.head.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900/70 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Head (safeboot)
                      </div>
                      <div className="font-mono text-sm text-slate-50">
                        {nodeStatus.safebootHead.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900/70 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Safeboot gap
                      </div>
                      <div className="font-mono text-sm text-amber-300">
                        {nodeStatus.safebootGap.toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900/70 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Last-mile
                      </div>
                      <div className="text-sm font-medium text-emerald-300">
                        Non-empty & healthy
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <span>TxRoot health: {nodeStatus.txrootHealthy ? "OK" : "BAD"}</span>
                    </div>
                    <Button size="xs" variant="outline" className="border-slate-700">
                      View metrics
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-950/60">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-slate-900 p-2">
                        <Cpu className="h-4 w-4 text-sky-400" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Work Credits
                        </div>
                        <div className="text-sm font-medium text-slate-50">
                          v0 — dev policy: {wcHealth.policyProfile}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                        wcHealth.ciHealth === 1
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-rose-900/40 text-rose-300"
                      }`}
                    >
                      CI: {wcHealth.ciHealth === 1 ? "PASS" : "FAIL"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Work Credits (WC) represent off-chain/AI work. v0 wiring:
                    contracts + sinks + relayer helper are green. Dashboard
                    shows high-level status here; detailed charts later.
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Relayer: WC → VOID swap path online (dev).</span>
                    <Button size="xs" variant="outline" className="border-slate-700">
                      View WC spec
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-slate-800 bg-slate-950/40">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-slate-400" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Metrics & Pillars
                      </div>
                      <div className="text-sm text-slate-200">
                        Hook to Prometheus dashboards later.
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    This tile will show mainnet-core, last-mile, safeboot, keys,
                    and WC pillar gauges at a glance. For now, it’s just a
                    placeholder so the layout is ready.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Middle: Wallet / actions */}
            <div className="space-y-4">
              <Card className="border-slate-800 bg-slate-950/60">
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-slate-900 p-2">
                        <Wallet className="h-4 w-4 text-violet-300" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Wallet
                        </div>
                        <div className="text-sm font-mono text-slate-50">
                          {walletSummary.address}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-slate-400">VOID</div>
                      <div className="font-mono text-sm text-slate-50">
                        {walletSummary.voidBalance}
                      </div>
                      <div className="mt-1 text-slate-400">WC</div>
                      <div className="font-mono text-sm text-slate-50">
                        {walletSummary.wcBalance}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Button
                      variant="outline"
                      className="h-9 justify-start border-slate-700 bg-slate-950/80"
                    >
                      <ArrowRightLeft className="mr-2 h-3 w-3" />
                      Send VOID
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 justify-start border-slate-700 bg-slate-950/80"
                    >
                      <ArrowRightLeft className="mr-2 h-3 w-3" />
                      Swap WC → VOID
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 justify-start border-slate-700 bg-slate-950/80"
                    >
                      <Radio className="mr-2 h-3 w-3" />
                      Stake / Validate
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 justify-start border-slate-700 bg-slate-950/80"
                    >
                      <Grid3X3 className="mr-2 h-3 w-3" />
                      Advanced wallet
                    </Button>
                  </div>

                  <div className="rounded-lg bg-slate-900/70 p-3 text-[11px] text-slate-400">
                    This panel will eventually read live balances from VOID
                    mainnet, show validator status, and let users route WC →
                    VOID through the relayer in a single click.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-violet-700/50 bg-violet-950/20">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-violet-300">
                        NFT Marketplace (soon)
                      </div>
                      <div className="text-sm text-violet-100">
                        VOID avatars, AI artifacts, and WC-powered items.
                      </div>
                    </div>
                    <span className="rounded-full border border-violet-600/40 px-3 py-1 text-[11px] text-violet-200">
                      Planned
                    </span>
                  </div>
                  <p className="text-xs text-violet-200/70">
                    This tile will become the entry to the on-chain NFT
                    marketplace using Work Credits as the primary “earnable”
                    budget and VOID as settlement.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-violet-700 bg-violet-900/40 text-violet-100"
                    disabled
                  >
                    Open marketplace (after mainnet)
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right: NullFeed */}
            <div className="space-y-4">
              <Card className="border-slate-800 bg-slate-950/60">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-slate-900 p-2">
                        <MessageCircle className="h-4 w-4 text-cyan-300" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          NullFeed
                        </div>
                        <div className="text-sm text-slate-50">
                          mIRC-style channel switching
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300">
                      Channel: #{activeChannel}
                    </span>
                  </div>

                  {/* Channel list */}
                  <div className="flex flex-wrap gap-1">
                    {channels.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => setActiveChannel(ch.id)}
                        className={`rounded-full border px-2 py-1 text-[11px] ${
                          activeChannel === ch.id
                            ? "border-cyan-400 bg-cyan-900/30 text-cyan-100"
                            : "border-slate-700 bg-slate-900/70 text-slate-300"
                        }`}
                      >
                        {ch.name}
                        {!ch.isDefault && (
                          <span className="ml-1 text-[9px] text-slate-400">
                            (hidden)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Join/create channel */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="#channel or channel"
                      value={joinInput}
                      onChange={(e) => setJoinInput(e.target.value)}
                      className="h-8 border-slate-700 bg-slate-950 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 border-slate-700 text-xs"
                      onClick={handleJoinChannel}
                    >
                      Join / create
                    </Button>
                  </div>

                  {/* Chat window */}
                  <div className="flex h-64 flex-col rounded-lg border border-slate-800 bg-slate-950/80">
                    <div className="flex-1 space-y-1 overflow-y-auto p-2 text-[11px]">
                      {filteredMessages.length === 0 ? (
                        <div className="mt-2 text-center text-slate-500">
                          No messages yet in #{activeChannel}. Say something.
                        </div>
                      ) : (
                        filteredMessages.map((m) => (
                          <div key={m.id} className="flex gap-2">
                            <span className="font-mono text-slate-500">
                              [{m.ts}]
                            </span>
                            <span className="font-medium text-slate-200">
                              {m.author}:
                            </span>
                            <span className="text-slate-100">{m.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="border-t border-slate-800 p-2">
                      <div className="flex items-center gap-2">
                        <Textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          rows={2}
                          placeholder="Type a message…"
                          className="flex-1 resize-none border-slate-700 bg-slate-950 text-xs"
                        />
                        <Button
                          size="sm"
                          className="h-full bg-cyan-700 text-xs hover:bg-cyan-600"
                          onClick={handleSendChat}
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    v0 is off-chain, node-hosted chat. In the future, channel
                    creators get admin powers (ban, delete, bots, images),
                    anchored to VOID chain for discovery and moderation.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeNav === "wallet" && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-800 bg-slate-950/60">
              <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-violet-300" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Wallet overview
                    </div>
                    <div className="text-sm font-mono text-slate-50">
                      {walletSummary.address}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-900/80 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      VOID
                    </div>
                    <div className="mt-1 font-mono text-sm text-slate-50">
                      {walletSummary.voidBalance}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      Work Credits
                    </div>
                    <div className="mt-1 font-mono text-sm text-slate-50">
                      {walletSummary.wcBalance}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/80 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                      Validator status
                    </div>
                    <div className="mt-1 text-sm text-emerald-300">
                      Coming soon
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  This page will eventually show validator earnings, node
                  uptime, WC earn/burn flows, and a full transaction history.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/60">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-emerald-300" />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Quick actions
                    </div>
                    <div className="text-sm text-slate-50">
                      Basic sends and WC ⇄ VOID flow.
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Button
                    variant="outline"
                    className="h-9 justify-start border-slate-700 bg-slate-950/80"
                  >
                    Send VOID
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 justify-start border-slate-700 bg-slate-950/80"
                  >
                    Swap WC → VOID
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 justify-start border-slate-700 bg-slate-950/80"
                  >
                    Receive
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 justify-start border-slate-700 bg-slate-950/80"
                  >
                    Export history
                  </Button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Hook these buttons directly into your existing API routes
                  (/tx/submit, WC relayer helper, etc.). The dashboard should
                  be the “one click” face of the deep machinery we already
                  wired.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {activeNav === "nullfeed" && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-400">
              Full-screen NullFeed view will eventually live here (multi-channel
              layout, private channels, image/bot toggles). For now, use the
              Overview tab’s NullFeed panel as the v0 implementation.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default MainDashboard;
