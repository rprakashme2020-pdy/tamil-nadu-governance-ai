import { db } from "../db/client";
import { getClaims, documentColumns } from "../db/repository";
import { provider } from "../ai/provider";
import { retrieve } from "./engine";
import { normalizeQuery, claimMatchesIntent } from "./normalization";
import type { Claim } from "../types";
export async function retrieveEvidence(
  q: string,
  previous?: string,
): Promise<Claim[]> {
  const client = db();
  if (!client) return retrieve(q, await getClaims(), previous);
  if (/guarantee|success|impact|independent|சுயாதீன|வெற்றி/i.test(q)) return [];
  const query =
    normalizeQuery(q) +
    (previous && !/naan|முதல்வன்/i.test(q) && /naan|முதல்வன்/i.test(previous)
      ? " | naan | mudhalvan"
      : "");
  if (!query) return [];
  let vector: number[] = [];
  try {
    vector = await provider().embed(q);
  } catch {
    /* Keyword retrieval remains available if embeddings fail. */
  }
  const { data, error } = await client.rpc("hybrid_claim_search", {
    query_text: query,
    query_embedding: vector.length ? vector : null,
    match_count: 30,
  });
  if (error) throw new Error("Retrieval unavailable");
  const candidateIds = (data ?? [])
    .filter((r: { score: number }) => r.score > 0)
    .map((r: { id: string }) => r.id);
  if (!candidateIds.length) return [];
  const { data: e, error: err } = await client
    .from("claims")
    .select(
      `id,scheme_id,claim_text,claim_text_ta,claim_type,status,document_id,source_page,excerpt,reporting_period,geographical_scope,population_scope,metric_name,metric_value,unit,verified_at,version,document:documents(${documentColumns})`,
    )
    .in("id", candidateIds)
    .eq("status", "verified");
  if (err) throw new Error("Evidence unavailable");
  return (e as unknown as Claim[])
    .filter(
      (c) => c.document?.status === "verified" && claimMatchesIntent(q, c),
    )
    .sort((a, b) => candidateIds.indexOf(a.id) - candidateIds.indexOf(b.id))
    .slice(0, 8);
}
