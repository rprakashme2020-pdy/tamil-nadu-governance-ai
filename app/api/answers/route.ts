import { z } from "zod";
import { db } from "@/lib/db/client";
import { sameOrigin } from "@/lib/security/auth";
import { allowed } from "@/lib/security/rate-limit";
import { answer, validateFacts } from "@/lib/rag/engine";
import { retrieveEvidence } from "@/lib/rag/retrieve";
export async function POST(r: Request) {
  if (
    !sameOrigin(r) ||
    !(await allowed("share:" + (r.headers.get("x-forwarded-for") ?? "local")))
  )
    return Response.json({ error: "Request rejected" }, { status: 429 });
  const p = z
    .object({
      question: z.string().min(2).max(2000),
      language: z.enum(["ta", "en"]),
      claimIds: z.array(z.string().uuid()).max(8),
    })
    .safeParse(await r.json());
  if (!p.success)
    return Response.json({ error: "Invalid answer" }, { status: 400 });
  const client = db();
  if (!client)
    return Response.json(
      { error: "Sharing requires Supabase." },
      { status: 503 },
    );
  const e = (await retrieveEvidence(p.data.question)).filter((c) =>
    p.data.claimIds.includes(c.id),
  );
  const result = answer(p.data.question, p.data.language, e);
  result.facts = validateFacts(result.facts, e, p.data.language);
  const { error } = await client
    .from("answer_snapshots")
    .insert({ id: result.id, snapshot: result });
  return Response.json(
    error ? { error: "Unable to share answer" } : { id: result.id },
    { status: error ? 500 : 200 },
  );
}
