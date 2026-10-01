import { db } from "./client";
import { claims, scheme, document } from "./seed-data";
import type { Claim, Scheme, DocumentRecord } from "../types";
const claimColumns =
  "id,scheme_id,claim_text,claim_text_ta,claim_type,status,document_id,source_page,excerpt,reporting_period,geographical_scope,population_scope,metric_name,metric_value,unit,verified_at,version";
export const documentColumns =
  "id,title,organization,publication_date,document_type,source_level,source_category,original_url,status,verified_at";
export async function getClaims(): Promise<Claim[]> {
  const client = db();
  if (!client) return claims;
  const { data, error } = await client
    .from("claims")
    .select(
      `${claimColumns},document:documents(${documentColumns},source:source_domains(enabled)),scheme:schemes(verification_status)`,
    )
    .eq("status", "verified")
    .limit(500);
  if (error) throw new Error("Evidence database unavailable");
  type Row = Claim & {
    document: DocumentRecord & { source: { enabled: boolean } };
    scheme: { verification_status: string };
  };
  const rows = (data ?? []) as unknown as Row[];
  return rows
    .filter(
      (c) =>
        c.document?.status === "verified" &&
        c.document.source?.enabled &&
        c.scheme?.verification_status === "verified",
    )
    .map(
      ({
        scheme: _scheme,
        document: { source: _source, ...doc },
        ...claim
      }) => {
        void _scheme;
        void _source;
        return { ...claim, document: doc };
      },
    ) as Claim[];
}
export async function getSchemes(): Promise<Scheme[]> {
  const client = db();
  if (!client) return [scheme];
  const { data, error } = await client
    .from("schemes")
    .select("*")
    .eq("verification_status", "verified");
  if (error) throw new Error("Scheme database unavailable");
  return data ?? [];
}
export async function getDocuments(): Promise<DocumentRecord[]> {
  const client = db();
  if (!client) return [document];
  const { data, error } = await client
    .from("documents")
    .select(`${documentColumns},source:source_domains(enabled)`)
    .eq("status", "verified");
  if (error) throw new Error("Source database unavailable");
  const rows = (data ?? []) as unknown as (DocumentRecord & {
    source: { enabled: boolean };
  })[];
  return rows
    .filter((d) => d.source?.enabled)
    .map(({ source, ...d }) => {
      void source;
      return d;
    }) as DocumentRecord[];
}
