import { createServerFn } from "@tanstack/react-start";

export type Analysis = {
  interestScore: number;
  engagementImbalance: { userEffortPct: number; counterpartEffortPct: number; summary: string };
  toneRadar: { playful: number; distant: number; flirty: number; dry: number; polite: number };
  subtextBreakdown: { quote: string; surfaceMeaning: string; subtextMeaning: string; actionableAdvice: string }[];
};

type Input = { transcript?: string; imageBase64?: string; mimeType?: string };

const SYSTEM = `You are Subtext Studio, an expert dating coach analyzing dating-app conversations from the perspective of the woman using the app ("the user"). The other person is "the counterpart".
Assess: how interested the counterpart is (interestScore 0-100), the share of conversational effort from each side (percentages summing to 100), the counterpart's tone on five 0-100 axes, and 3-6 key quotes with their surface meaning, likely subtext and concrete, kind, practical advice for the user.
If given a screenshot, read the messages from it first. Be honest but constructive. Respond only with JSON matching the schema.`;

const num = { type: "NUMBER" };
const str = { type: "STRING" };
const SCHEMA = {
  type: "OBJECT",
  properties: {
    interestScore: num,
    engagementImbalance: {
      type: "OBJECT",
      properties: { userEffortPct: num, counterpartEffortPct: num, summary: str },
      required: ["userEffortPct", "counterpartEffortPct", "summary"],
    },
    toneRadar: {
      type: "OBJECT",
      properties: { playful: num, distant: num, flirty: num, dry: num, polite: num },
      required: ["playful", "distant", "flirty", "dry", "polite"],
    },
    subtextBreakdown: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { quote: str, surfaceMeaning: str, subtextMeaning: str, actionableAdvice: str },
        required: ["quote", "surfaceMeaning", "subtextMeaning", "actionableAdvice"],
      },
    },
  },
  required: ["interestScore", "engagementImbalance", "toneRadar", "subtextBreakdown"],
};

export const analyzeConversation = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    if (d?.transcript?.trim()) return { transcript: d.transcript.slice(0, 20000) };
    if (d?.imageBase64 && d?.mimeType?.startsWith("image/")) return { imageBase64: d.imageBase64, mimeType: d.mimeType };
    throw new Error("Provide a transcript or an image.");
  })
  .handler(async ({ data }): Promise<Analysis> => {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("GEMINI_API_KEY is not configured.");

    const parts = data.transcript
      ? [{ text: `Conversation transcript:\n${data.transcript}` }]
      : [{ text: "Analyze the conversation in this screenshot." }, { inline_data: { mime_type: data.mimeType, data: data.imageBase64 } }];

    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts }],
          generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.4 },
        }),
      },
    );
    if (!res.ok) {
      console.error("Gemini error", res.status, await res.text());
      throw new Error(res.status === 429 ? "Rate limit reached, try again shortly." : "Analysis failed.");
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from model.");
    return JSON.parse(text) as Analysis;
  });
