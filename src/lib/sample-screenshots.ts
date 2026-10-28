export type SamplePreset = { id: string; label: string; them: string; lines: [me: boolean, text: string][] };

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: "keen",
    label: "Keen match",
    them: "Jordan",
    lines: [
      [false, "omg I just saw you like hiking too!!"],
      [true, "haha yes, did Snowdon last month"],
      [false, "no way, which route? I've been dying to do it"],
      [true, "Pyg Track, it was gorgeous"],
      [false, "ok you have to show me pics. coffee this week? 😊"],
    ],
  },
  {
    id: "fading",
    label: "Fading out",
    them: "Chris",
    lines: [
      [true, "how was your trip?"],
      [false, "good"],
      [true, "where did you end up going?"],
      [false, "lisbon"],
      [true, "ah I love Lisbon! did you try pastéis de nata?"],
      [false, "yeah"],
    ],
  },
  {
    id: "mixed",
    label: "Mixed signals",
    them: "Taylor",
    lines: [
      [false, "you're kinda funny ngl"],
      [true, "kinda?? 😂"],
      [false, "don't let it go to your head"],
      [true, "drinks friday then?"],
      [false, "maybe, depends on work. I'll let you know"],
    ],
  },
];

/** Renders a preset as a phone-style chat screenshot and returns it as a PNG File. */
export async function renderPreset(p: SamplePreset): Promise<File> {
  const W = 720, pad = 32, lineH = 34, font = "26px system-ui, sans-serif";
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = font;
  const wrap = (t: string) => {
    const words = t.split(" "); const out: string[] = []; let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(next).width > W * 0.62 && cur) { out.push(cur); cur = w; } else cur = next;
    }
    out.push(cur); return out;
  };
  const bubbles = p.lines.map(([me, t]) => ({ me, rows: wrap(t) }));
  const H = 120 + bubbles.reduce((s, b) => s + b.rows.length * lineH + 44, 0) + pad;
  c.width = W; c.height = H;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f2f2f7"; ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = "#111"; ctx.font = "bold 30px system-ui, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(p.them, W / 2, 60);
  ctx.textAlign = "left"; ctx.font = font;
  let y = 120;
  for (const b of bubbles) {
    const w = Math.max(...b.rows.map((r) => ctx.measureText(r).width)) + 40;
    const h = b.rows.length * lineH + 22;
    const x = b.me ? W - pad - w : pad;
    ctx.fillStyle = b.me ? "#0a84ff" : "#e5e5ea";
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 22); ctx.fill();
    ctx.fillStyle = b.me ? "#fff" : "#111";
    b.rows.forEach((r, i) => ctx.fillText(r, x + 20, y + 36 + i * lineH));
    y += h + 22;
  }
  const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
  return new File([blob], `${p.id}-chat.png`, { type: "image/png" });
}
