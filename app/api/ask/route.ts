import { z } from "zod";
import { retrieveEvidence } from "@/lib/rag/retrieve";
import {
  answer,
  detectLanguage,
  isNeutral,
  validateFacts,
} from "@/lib/rag/engine";
import { provider } from "@/lib/ai/provider";
import { allowed } from "@/lib/security/rate-limit";
import { sameOrigin } from "@/lib/security/auth";
const input = z.object({
  question: z.string().trim().min(2).max(2000),
  language: z.enum(["en", "ta"]).optional(),
  previous: z.string().max(2000).optional(),
});
export async function POST(r: Request) {
  if (!sameOrigin(r))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (
    !(await allowed(r.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"))
  )
    return Response.json(
      {
        error:
          "Too many requests, or production rate limiter is not configured.",
      },
      { status: 429 },
    );
  try {
    const data = input.parse(await r.json());
    const language = data.language ?? detectLanguage(data.question);
    const e = isNeutral(data.question)
      ? await retrieveEvidence(data.question, data.previous)
      : [];
    const result = answer(data.question, language, e);
    if (e.length) {
      try {
        const selected = await provider().select(data.question, e, language);
        const valid = validateFacts(selected, e, language);
        if (valid.length) {
          result.facts = valid;
          if (!result.conflicts.length) result.direct = valid[0].text;
          result.mode =
            process.env.AI_PROVIDER === "openai-compatible"
              ? "AI evidence selection"
              : "strict extractive";
        }
      } catch {
        /* Approved extractive fallback only. */
      }
    }
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Please enter a valid question."
            : "Evidence retrieval is unavailable. Please try again.",
      },
      { status: e instanceof z.ZodError ? 400 : 503 },
    );
  }
}
