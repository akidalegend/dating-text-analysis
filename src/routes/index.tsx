import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, ImageUp, ScanLine, Sparkles, X } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { analyzeConversation, type Analysis } from "@/lib/analyze.functions";

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

const toneColor = (v: number) => (v < 40 ? "var(--destructive)" : v < 70 ? "var(--warning)" : "var(--success)");

const fileToBase64 = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(f);
  });

function Index() {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [text, setText] = useState(SAMPLE);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAnalyze = tab === "paste" ? text.trim().length > 0 : !!file;

  useEffect(() => {
    if (status !== "loading") return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        return Math.min(94, p + Math.random() * 6 + 1);
      });
    }, 120);
    return () => clearInterval(id);
  }, [status]);

  const run = async () => {
    setError(null);
    setStatus("loading");
    try {
      const data = tab === "paste"
        ? { transcript: text }
        : { imageBase64: await fileToBase64(file!), mimeType: file!.type };
      const r = await analyzeConversation({ data });
      setProgress(100);
      setResult(r);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
      setStatus("idle");
    }
  };
  const done = status === "done" && !!result;
  const tone = result ? Object.entries(result.toneRadar).map(([k, v]) => ({ k: k.charAt(0).toUpperCase() + k.slice(1), v })) : ["Playful","Distant","Flirty","Dry","Polite"].map((k) => ({ k, v: 0 }));

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
              <button disabled={!canAnalyze || status === "loading"} onClick={run}
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
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        </section>

        <section className={cn("mt-10 grid gap-5 md:grid-cols-2 transition-opacity", !done && "opacity-40 pointer-events-none")}>
          <ResultCard title="Interest Score" hint="Their interest in you"><Gauge value={result?.interestScore ?? 0} /></ResultCard>
          <ResultCard title="Engagement Imbalance" hint="Share of effort"><Imbalance data={result?.engagementImbalance} /></ResultCard>
          <ResultCard title="Tone Radar" hint="Their tone">
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={tone}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="k" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                  <Radar dataKey="v" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </ResultCard>
          <ResultCard title="Summary" hint="Overall read">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {result?.engagementImbalance.summary ?? "Run an analysis to see the summary."}
            </p>
          </ResultCard>
          <div className="md:col-span-2"><ResultCard title="Subtext Breakdown" hint={`${result?.subtextBreakdown.length ?? 0} signals`}><SubtextTable rows={result?.subtextBreakdown ?? []} /></ResultCard></div>
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
  const color = toneColor(value);
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

function Imbalance({ data }: { data: Analysis["engagementImbalance"] | undefined }) {
  const a = Math.round(data?.userEffortPct ?? 50);
  const b = Math.round(data?.counterpartEffortPct ?? 50);
  const total = a + b || 1;
  return (
    <div className="space-y-5 py-4">
      <div className="flex justify-between text-sm"><span className="text-primary">You · {a}%</span><span className="text-accent">Them · {b}%</span></div>
      <div className="flex h-4 overflow-hidden rounded-full bg-muted">
        <div className="bg-primary transition-all duration-1000" style={{ width: `${(a / total) * 100}%` }} />
        <div className="flex-1 bg-accent" />
      </div>
      <p className="text-sm text-muted-foreground">{data ? (a > b + 15 ? "You're carrying most of this conversation." : b > a + 15 ? "They're putting in more effort than you." : "Effort feels fairly balanced.") : "Waiting for analysis."}</p>
    </div>
  );
}

function SubtextTable({ rows }: { rows: Analysis["subtextBreakdown"] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!rows.length) return <p className="text-sm text-muted-foreground">Key messages and what they really mean will appear here.</p>;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="hidden grid-cols-[1.2fr_1fr_1.4fr_32px] gap-4 bg-muted/50 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <span>Message</span><span>Surface</span><span>Subtext</span><span />
      </div>
      {rows.map((r, i) => (
        <div key={i} className="border-t border-border first:border-t-0">
          <button onClick={() => setOpen(open === i ? null : i)}
            className="grid w-full grid-cols-1 gap-2 px-4 py-3 text-left text-sm transition hover:bg-muted/30 md:grid-cols-[1.2fr_1fr_1.4fr_32px] md:items-center md:gap-4">
            <span>"{r.quote}"</span>
            <span className="text-muted-foreground">{r.surfaceMeaning}</span>
            <span>{r.subtextMeaning}</span>
            <ChevronDown className={cn("size-4 text-muted-foreground transition", open === i && "rotate-180")} />
          </button>
          {open === i && <div className="bg-background/40 px-4 py-3 text-sm"><span className="font-medium text-primary">Advice: </span><span className="text-muted-foreground">{r.actionableAdvice}</span></div>}
        </div>
      ))}
    </div>
  );
}
