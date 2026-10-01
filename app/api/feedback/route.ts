import { z } from "zod";
import { db } from "@/lib/db/client";
import { allowed } from "@/lib/security/rate-limit";
import { sameOrigin } from "@/lib/security/auth";
export async function POST(r: Request) {
  if (
    !sameOrigin(r) ||
    !(await allowed(
      "feedback:" + (r.headers.get("x-forwarded-for") ?? "local"),
    ))
  )
    return Response.json({ error: "Request rejected" }, { status: 429 });
  const parsed = z
    .object({
      answer_id: z.string().uuid(),
      question: z.string().max(2000),
      reason: z.enum([
        "helpful",
        "unhelpful",
        "Incorrect statistic",
        "Outdated information",
        "Source does not support claim",
        "Translation issue",
        "Missing context",
        "Other",
      ]),
      notes: z.string().max(2000).default(""),
    })
    .safeParse(await r.json());
  if (!parsed.success)
    return Response.json({ error: "Invalid feedback" }, { status: 400 });
  const client = db();
  if (!client)
    return Response.json(
      { error: "Feedback requires the configured database." },
      { status: 503 },
    );
  const { error } = await client.from("feedback").insert(parsed.data);
  return Response.json(
    error ? { error: "Unable to save feedback" } : { ok: true },
    { status: error ? 500 : 200 },
  );
}
