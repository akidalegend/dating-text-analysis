import { createServerFn } from "@tanstack/react-start";

export type Analysis = {
  interestScore: number;
  engagementImbalance: { userEffortPct: number; counterpartEffortPct: number; summary: string };
  toneRadar: { playful: number; distant: number; flirty: number; dry: number; polite: number };
  subtextBreakdown: {
    quote: string;
    surfaceMeaning: string;
    subtextMeaning: string;
    actionableAdvice: string;
  }[];
  lastMessage: string;
  counterpartName: string;
  flirtMeter: { score: number; verdict: string };
  replies: { playboy: string; loverBoy: string; neutral: string; breakUp: string };
};

type Input = { transcript?: string; imageBase64?: string; mimeType?: string };

const MODEL = "gemini-3.5-flash-lite";

const PROMPT = `You are Subtext Studio, an expert dating coach analyzing dating-app conversations from the perspective of the woman using the app ("the user"). The other person is "the counterpart".

Assess:
- interestScore: how interested the counterpart is, 0-100.
- engagementImbalance: share of conversational effort from each side (userEffortPct + counterpartEffortPct = 100) and a one-sentence summary.
- toneRadar: the counterpart's tone on five axes, each 0-100: playful, distant, flirty, dry, polite.
- subtextBreakdown: 3-6 key quotes, each with surfaceMeaning, subtextMeaning and concrete, kind actionableAdvice for the user.
- counterpartName: the counterpart's name. For screenshots, read it from the chat header at the top (contact name/title); otherwise from the transcript speaker labels. Use "" if unknown.
- flirtMeter: score 0-100 where 0 = purely friendly banter and 100 = clearly flirting, judged only from the messages, plus a one-sentence verdict citing the signals.
- lastMessage: the last message the counterpart sent.
- replies: a ready-to-send reply from the user to that last message in four personas (short, natural texting style):
  - playboy: confident, cheeky, teasing, unbothered.
  - loverBoy: warm, romantic, openly affectionate.
  - neutral: friendly, balanced, low-pressure.
  - breakUp: polite, clear, ends things kindly.

If given a screenshot, first read the chat header name, then the messages; bubbles on the right are the user, left are the counterpart. Be honest but constructive.

Respond ONLY with JSON in exactly this shape:
{"interestScore":number,"engagementImbalance":{"userEffortPct":number,"counterpartEffortPct":number,"summary":string},"toneRadar":{"playful":number,"distant":number,"flirty":number,"dry":number,"polite":number},"subtextBreakdown":[{"quote":string,"surfaceMeaning":string,"subtextMeaning":string,"actionableAdvice":string}],"counterpartName":string,"flirtMeter":{"score":number,"verdict":string},"lastMessage":string,"replies":{"playboy":string,"loverBoy":string,"neutral":string,"breakUp":string}}`;

const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

export const analyzeConversation = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    if (d?.transcript?.trim()) return { transcript: d.transcript.slice(0, 20000) };
    if (d?.imageBase64 && d?.mimeType?.startsWith("image/")) {
      return { imageBase64: d.imageBase64, mimeType: d.mimeType };
    }
    throw new Error("Provide a transcript or an image.");
  })
  .handler(async ({ data }): Promise<Analysis> => {
    const apiKey = process.env["GEMINI_API_KEY"];
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const parts: Record<string, unknown>[] = data.transcript
      ? [{ text: `${PROMPT}\n\nConversation transcript:\n${data.transcript}` }]
      : [
          { text: `${PROMPT}\n\nAnalyze the conversation in this screenshot.` },
          { inline_data: { mime_type: data.mimeType, data: data.imageBase64 } },
        ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { response_mime_type: "application/json" },
        }),
      },
    );

    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      throw new Error(res.status === 429 ? "Rate limit reached, try again shortly." : "Analysis failed.");
    }

    const json = await res.json();
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from model.");

    const r = JSON.parse(text);
    return {
      interestScore: clamp(r.interestScore),
      engagementImbalance: {
        userEffortPct: clamp(r.engagementImbalance?.userEffortPct),
        counterpartEffortPct: clamp(r.engagementImbalance?.counterpartEffortPct),
        summary: String(r.engagementImbalance?.summary ?? ""),
      },
      toneRadar: {
        playful: clamp(r.toneRadar?.playful),
        distant: clamp(r.toneRadar?.distant),
        flirty: clamp(r.toneRadar?.flirty),
        dry: clamp(r.toneRadar?.dry),
        polite: clamp(r.toneRadar?.polite),
      },
      subtextBreakdown: Array.isArray(r.subtextBreakdown)
        ? r.subtextBreakdown.map((s: Partial<Analysis["subtextBreakdown"][number]>) => ({
            quote: String(s.quote ?? ""),
            surfaceMeaning: String(s.surfaceMeaning ?? ""),
            subtextMeaning: String(s.subtextMeaning ?? ""),
            actionableAdvice: String(s.actionableAdvice ?? ""),
          }))
        : [],
      counterpartName: String(r.counterpartName ?? ""),
      flirtMeter: { score: clamp(r.flirtMeter?.score), verdict: String(r.flirtMeter?.verdict ?? "") },
      lastMessage: String(r.lastMessage ?? ""),
      replies: {
        playboy: String(r.replies?.playboy ?? ""),
        loverBoy: String(r.replies?.loverBoy ?? ""),
        neutral: String(r.replies?.neutral ?? ""),
        breakUp: String(r.replies?.breakUp ?? ""),
      },
    };
  });
