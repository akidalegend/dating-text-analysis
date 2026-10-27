import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, ImageUp, ScanLine, Sparkles, X } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Subtext Studio — Conversational Intelligence" },
      { name: "description", content: "Paste a chat or upload a screenshot to reveal interest, tone and hidden subtext." },
      { property: "og:title", content: "Subtext Studio" },
      { property: "og:description", content: "Reveal interest, tone and hidden subtext in any conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SAMPLE = `Alex: hey! how was the weekend?
Sam: good
Alex: nice!! did you end up going to that concert you mentioned?
Sam: yeah it was fine
Alex: oh cool, who did you go with? I've been wanting to see them live forever
Sam: some friends
Alex: we should go together next time they're in town :)
Sam: maybe, I'm pretty busy lately
Alex: totally get it, no pressure haha
Sam: ok`;

const TONE = [
  { k: "Warmth", a: 82, b: 28 },
  { k: "Curiosity", a: 90, b: 15 },
  { k: "Humor", a: 55, b: 10 },
  { k: "Formality", a: 20, b: 45 },
  { k: "Urgency", a: 60, b: 12 },
  { k: "Avoidance", a: 10, b: 78 },
];

const SUBTEXT = [
  { line: "good", speaker: "Sam", literal: "The weekend was good.", sub: "Low investment; not inviting follow-up.", signal: "Disengaged", detail: "One-word reply with no reciprocal question. Typically signals limited bandwidth or interest." },
  { line: "some friends", speaker: "Sam", literal: "Went with friends.", sub: "Withholding detail, maintaining distance.", signal: "Guarded", detail: "Vague answer to a direct question narrows the conversational surface." },
  { line: "we should go together next time :)", speaker: "Alex", literal: "Proposal to hang out.", sub: "Testing interest with a soft invitation.", signal: "Bid", detail: "The emoji softens the ask, leaving room for both parties to save face." },
  { line: "maybe, I'm pretty busy lately", speaker: "Sam", literal: "Possibly, but busy.", sub: "Polite decline without closing the door.", signal: "Deflection", detail: "'Busy' without a counter-offer is a common soft no." },
  { line: "no pressure haha", speaker: "Alex", literal: "No obligation.", sub: "Retreating to reduce awkwardness.", signal: "Repair", detail: "Self-deprecating de-escalation after a perceived rejection." },
];

const signalTone: Record<string, string> = {
  Disengaged: "text-destructive bg-destructive/10",
  Guarded: "text-warning bg-warning/10",
  Bid: "text-primary bg-primary/10",
  Deflection: "text-destructive bg-destructive/10",
  Repair: "text-accent bg-accent/10",
};

function Index() {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [text, setText] = useState(SAMPLE);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAnalyze = tab === "paste" ? text.trim().length > 0 : !!file;

  useEffect(() => {
    if (status !== "loading") return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(id); setStatus("done"); return 100; }
        return Math.min(100, p + Math.random() * 9 + 3);
      });
    }, 120);
    return () => clearInterval(id);
  }, [status]);

  const stage = progress < 30 ? "Parsing messages" : progress < 60 ? "Mapping turn-taking" : progress < 85 ? "Scoring tone vectors" : "Decoding subtext";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-signal text-primary-foreground"><Sparkles className="size-4" /></div>
            <span className="font-display text-lg font-semibold tracking-tight">Subtext Studio</span>
          </div>
          <span className="font-mono text-xs text-muted-foreground">v0.1 · beta</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">Read between the lines.</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">Drop in any conversation to measure interest, balance, tone and the meaning behind each message.</p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-2 shadow-glow">
          <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
            {([["paste", "Paste Transcript", FileText], ["upload", "Upload Screenshot", ImageUp]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setTab(k)}
                className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition",
                  tab === k ? "bg-secondary text-foreground shadow" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "paste" ? (
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={11}
                className="w-full resize-y rounded-xl border border-input bg-background/60 p-4 font-mono text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring/50" />
            ) : (
              <div
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                onClick={() => inputRef.current?.click()}
                className={cn("flex min-h-[264px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition",
                  drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50")}>
                <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {file ? (
                  <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-3">
                    <ImageUp className="size-5 text-primary" />
                    <span className="text-sm">{file.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                  </div>
                ) : (
                  <>
                    <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary"><ImageUp className="size-6" /></div>
                    <p className="font-medium">Drop a chat screenshot here</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG or WebP from WhatsApp, iMessage, Slack…</p>
                  </>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button disabled={!canAnalyze || status === "loading"} onClick={() => setStatus("loading")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-signal px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40">
                <ScanLine className="size-4" />{status === "loading" ? "Analyzing…" : "Analyze Conversation"}
              </button>
              {status === "loading" && (
                <div className="flex-1">
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-signal transition-all duration-150" style={{ width: `${progress}%` }} />
                    <div className="absolute inset-y-0 left-0 w-1/4 animate-scan bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-muted-foreground">{stage}… {Math.round(progress)}%</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className={cn("mt-10 grid gap-5 md:grid-cols-2 transition-opacity", status !== "done" && "opacity-40 pointer-events-none")}>
          <ResultCard title="Interest Score" hint="Sam → Alex"><Gauge value={status === "done" ? 24 : 0} /></ResultCard>
          <ResultCard title="Engagement Imbalance" hint="Share of effort"><Imbalance ready={status === "done"} /></ResultCard>
          <ResultCard title="Tone Radar" hint="Alex vs Sam">
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={status === "done" ? TONE : TONE.map((t) => ({ ...t, a: 0, b: 0 }))}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="k" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Radar dataKey="a" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.25} />
                  <Radar dataKey="b" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <Legend />
          </ResultCard>
          <ResultCard title="Summary" hint="Overall read">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {status === "done" ? "Alex is carrying the conversation with questions and an invitation. Sam's short, guarded replies and a soft decline suggest low current interest." : "Run an analysis to see the summary."}
            </p>
          </ResultCard>
          <div className="md:col-span-2"><ResultCard title="Subtext Breakdown" hint={`${SUBTEXT.length} signals`}><SubtextTable /></ResultCard></div>
        </section>
      </main>
    </div>
  );
}

function ResultCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display font-semibold">{title}</h3>
        <span className="font-mono text-xs text-muted-foreground">{hint}</span>
      </div>
      {children}
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 70, c = 2 * Math.PI * r;
  const color = value < 40 ? "var(--destructive)" : value < 70 ? "var(--warning)" : "var(--success)";
  return (
    <div className="flex flex-col items-center py-2">
      <svg viewBox="0 0 180 180" className="size-48 -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" stroke="var(--muted)" strokeWidth="14" />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="-mt-[124px] mb-16 text-center">
        <div className="font-display text-4xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

function Imbalance({ ready }: { ready: boolean }) {
  const a = ready ? 78 : 50;
  return (
    <div className="space-y-5 py-4">
      <div className="flex justify-between text-sm"><span className="text-primary">Alex · {a}%</span><span className="text-accent">Sam · {100 - a}%</span></div>
      <div className="flex h-4 overflow-hidden rounded-full bg-muted">
        <div className="bg-primary transition-all duration-1000" style={{ width: `${a}%` }} />
        <div className="flex-1 bg-accent" />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[["Avg words", ready ? "11 / 2" : "–"], ["Questions", ready ? "3 / 0" : "–"], ["Initiations", ready ? "4 / 0" : "–"]].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-muted/50 p-3"><div className="font-mono text-sm">{v}</div><div className="text-xs text-muted-foreground">{l}</div></div>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex justify-center gap-5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-primary" />Alex</span>
      <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-accent" />Sam</span>
    </div>
  );
}

function SubtextTable() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="hidden grid-cols-[1.2fr_1fr_1.4fr_110px_32px] gap-4 bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <span>Message</span><span>Literal</span><span>Subtext</span><span>Signal</span><span />
      </div>
      {SUBTEXT.map((r, i) => (
        <div key={i} className="border-t border-border first:border-t-0">
          <button onClick={() => setOpen(open === i ? null : i)}
            className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-left text-sm transition hover:bg-muted/30 md:grid-cols-[1.2fr_1fr_1.4fr_110px_32px] md:items-center md:gap-4">
            <span><span className="font-mono text-xs text-muted-foreground">{r.speaker}: </span>"{r.line}"</span>
            <span className="text-muted-foreground">{r.literal}</span>
            <span>{r.sub}</span>
            <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-xs font-medium", signalTone[r.signal])}>{r.signal}</span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition", open === i && "rotate-180")} />
          </button>
          {open === i && <div className="bg-background/40 px-4 py-3 text-sm text-muted-foreground">{r.detail}</div>}
        </div>
      ))}
    </div>
  );
}
