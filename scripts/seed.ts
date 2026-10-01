import { db } from "../lib/db/client";
import { scheme, document, claims } from "../lib/db/seed-data";
async function seed() {
  const c = db();
  if (!c) throw new Error("Configure Supabase environment variables");
  const sourceId = "44444444-4444-4444-8444-444444444444";
  const steps = [
    c.from("source_domains").upsert({
      id: sourceId,
      domain: "portal.naanmudhalvan.tn.gov.in",
      organization: document.organization,
      trust_level: "A",
      source_category: document.source_category,
      enabled: true,
    }),
    c.from("schemes").upsert(scheme),
  ];
  for (const s of steps) {
    const r = await s;
    if (r.error) throw r.error;
  }
  const doc = await c
    .from("documents")
    .upsert({ ...document, source_domain_id: sourceId });
  if (doc.error) throw doc.error;
  for (const { document: unused, ...claim } of claims) {
    void unused;
    const r = await c.from("claims").upsert(claim);
    if (r.error) throw r.error;
  }
  console.log(
    "Seeded 1 scheme, 1 official document, 5 attributed claims. No outcome statistics.",
  );
}
seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
