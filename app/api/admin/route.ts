import { z } from "zod";
import { requireAdmin, sameOrigin } from "@/lib/security/auth";
import {
  metadata,
  safeSourceUrl,
  chunks,
  candidateClaims,
  hash,
} from "@/lib/security/ingestion";
import { provider } from "@/lib/ai/provider";
export const runtime = "nodejs";
export async function GET(r: Request) {
  try {
    const { client } = await requireAdmin(r);
    const results = await Promise.all([
      client
        .from("claims")
        .select("*,document:documents(*)")
        .order("created_at", { ascending: false })
        .limit(100),
      client.from("schemes").select("*"),
      client.from("source_domains").select("*"),
      client
        .from("documents")
        .select("id,title,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      client
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    for (const result of results) if (result.error) throw result.error;
    return Response.json(
      {
        claims: results[0].data,
        schemes: results[1].data,
        sources: results[2].data,
        documents: results[3].data,
        feedback: results[4].data,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Administrator access required" },
      { status: 401 },
    );
  }
}
export async function POST(r: Request) {
  if (!sameOrigin(r))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const { client, user } = await requireAdmin(r);
    if (r.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await r.formData();
      const m = metadata.parse(Object.fromEntries(form.entries()));
      const { data: source, error: sourceError } = await client
        .from("source_domains")
        .select("*")
        .eq("id", m.source_domain_id)
        .eq("enabled", true)
        .single();
      if (
        sourceError ||
        !source ||
        !safeSourceUrl(m.original_url, source.domain)
      )
        return Response.json(
          {
            error:
              "Source URL must exactly match an enabled whitelisted HTTPS domain.",
          },
          { status: 400 },
        );
      let pages: { page: number | null; text: string }[] = [];
      let filePath: string | null = null;
      let digest: string | null = null;
      const file = form.get("file");
      if (file instanceof File && file.size) {
        if (file.size > 10 * 1024 * 1024)
          return Response.json(
            { error: "File exceeds 10 MB." },
            { status: 400 },
          );
        const bytes = Buffer.from(await file.arrayBuffer());
        digest = hash(bytes);
        let ext = "";
        if (
          file.type === "application/pdf" &&
          bytes.subarray(0, 5).toString() === "%PDF-"
        ) {
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: bytes });
          try {
            const result = await parser.getText();
            pages = result.pages.map((p) => ({ page: p.num, text: p.text }));
          } finally {
            await parser.destroy();
          }
          ext = "pdf";
        } else if (
          file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
          bytes.subarray(0, 2).toString() === "PK"
        ) {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer: bytes });
          pages = [{ page: null, text: result.value }];
          ext = "docx";
        } else if (file.type === "text/plain") {
          pages = [{ page: null, text: bytes.toString("utf8") }];
          ext = "txt";
        } else
          return Response.json(
            { error: "Supported types: PDF, DOCX and plain text." },
            { status: 400 },
          );
        filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await client.storage
          .from("evidence")
          .upload(filePath, bytes, { contentType: file.type });
        if (error) throw error;
      } else pages = [{ page: null, text: m.text }];
      const text = pages.map((p) => p.text).join("\n");
      if (text.length < 40 || text.length > 300000)
        return Response.json(
          {
            error:
              "Extracted text must contain 40–300,000 characters. Scanned PDFs need OCR before upload.",
          },
          { status: 400 },
        );
      const { data: doc, error } = await client
        .from("documents")
        .insert({
          title: m.title,
          organization: source.organization,
          publication_date: m.publication_date,
          document_type: m.document_type,
          source_level: source.trust_level,
          source_category: source.source_category,
          original_url: m.original_url,
          source_domain_id: source.id,
          storage_path: filePath,
          extracted_text: text,
          content_sha256: digest,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      let index = 0;
      for (const page of pages) {
        for (const chunk of chunks(page.text)) {
          const { error } = await client.from("document_chunks").insert({
            document_id: doc.id,
            page: page.page,
            chunk_index: index++,
            content: chunk,
          });
          if (error) throw error;
        }
      }
      const suggestions = pages
        .flatMap((p) =>
          candidateClaims(p.text).map((t) => ({
            scheme_id: m.scheme_id,
            document_id: doc.id,
            claim_text: t,
            claim_text_ta: "",
            claim_type: /\d/.test(t) ? "unclassified_quantitative" : "benefit",
            source_page: p.page,
            excerpt: t,
            status: "pending",
          })),
        )
        .slice(0, 40);
      if (suggestions.length) {
        const { error } = await client.from("claims").insert(suggestions);
        if (error) throw error;
      }
      return Response.json({
        ok: true,
        document_id: doc.id,
        candidates: suggestions.length,
        message:
          "Unverified sentence candidates added. Review attribution, translations and quantitative semantics before approval.",
      });
    }
    const data = await r.json();
    if (data.action === "source") {
      const p = z
        .object({
          id: z.string().uuid().optional(),
          domain: z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/),
          organization: z.string().min(2).max(200),
          trust_level: z.enum(["A", "B", "C", "D"]),
          source_category: z.string().min(3).max(200),
          enabled: z.boolean(),
          notes: z.string().max(2000).default(""),
        })
        .parse(data.source);
      const { error } = await client.from("source_domains").upsert(p);
      if (error) throw error;
      return Response.json({ ok: true });
    }
    if (data.action === "scheme") {
      const p = z
        .object({
          id: z.string().uuid().optional(),
          name_en: z.string().min(2),
          name_ta: z.string().min(2),
          slug: z.string().regex(/^[a-z0-9-]+$/),
          short_description_en: z.string().min(5),
          short_description_ta: z.string().min(5),
          department: z.string().min(2),
          category: z.string().min(2),
          start_year: z.number().int().min(2021).max(2026),
          official_url: z.url(),
          status: z.enum(["draft", "documented", "archived"]).default("draft"),
        })
        .parse(data.scheme);
      const { error } = await client
        .from("schemes")
        .upsert({ ...p, verification_status: "pending" });
      if (error) throw error;
      return Response.json({ ok: true });
    }
    if (data.action === "verify") {
      const p = z
        .object({
          id: z.string().uuid(),
          decision: z.enum(["verified", "rejected", "investigation"]),
          reason: z.string().min(10).max(2000),
          claim_text: z.string().min(10).max(1000),
          claim_text_ta: z.string().min(5).max(1500),
          claim_type: z.enum([
            "launch_date",
            "objective",
            "benefit",
            "quantitative",
          ]),
          source_page: z.number().int().positive().nullable(),
          reporting_period: z.string().max(300),
          geographical_scope: z.string().max(200),
          population_scope: z.string().max(200),
          metric_name: z
            .enum([
              "trained",
              "employed",
              "allocated",
              "spent",
              "registered",
              "benefited",
              "applications",
              "placement_support",
              "targeted",
              "achieved",
              "announced",
              "implemented",
              "sanctioned",
              "started",
              "completed",
            ])
            .nullable(),
          metric_value: z.number().finite().nullable(),
          unit: z.string().max(100).nullable(),
          excerpt: z.string().min(10).max(2000),
        })
        .parse(data);
      const { data: claim } = await client
        .from("claims")
        .select("*,document:documents(*)")
        .eq("id", p.id)
        .single();
      if (!claim) throw new Error("Claim unavailable");
      const { data: source } = await client
        .from("source_domains")
        .select("*")
        .eq("id", claim.document.source_domain_id)
        .eq("enabled", true)
        .single();
      if (!source) throw new Error("Source domain is disabled");
      if (p.decision === "verified") {
        if (
          !claim.document.extracted_text
            ?.replace(/\s+/g, " ")
            .includes(p.excerpt.replace(/\s+/g, " "))
        )
          throw new Error("Excerpt must occur in the extracted document text");
        if (
          p.claim_type === "quantitative" &&
          (p.metric_value === null ||
            !p.metric_name ||
            !p.unit ||
            !p.source_page ||
            !p.reporting_period ||
            !p.geographical_scope ||
            !p.population_scope)
        )
          throw new Error(
            "Quantitative claims require a value, measure, unit, period, page and scopes",
          );
        if (p.claim_type !== "quantitative" && p.metric_value !== null)
          throw new Error(
            "Quantitative values require quantitative claim type",
          );
        if (
          /\d/.test(p.claim_text) &&
          p.claim_type !== "launch_date" &&
          p.claim_type !== "quantitative"
        )
          throw new Error(
            "Separate numeric assertions into quantitative claims",
          );
      }
      let embedding: number[] = [];
      if (p.decision === "verified")
        embedding = await provider().embed(
          p.claim_text + " " + p.claim_text_ta,
        );
      const { id, decision, reason, ...fields } = p;
      const { error } = await client.rpc("review_claim", {
        claim_id: id,
        decision,
        reason,
        reviewer_id: user.id,
        fields: {
          ...fields,
          embedding: embedding.length ? embedding : null,
          embedding_model: embedding.length
            ? (process.env.AI_EMBEDDING_MODEL ?? "text-embedding-3-small")
            : null,
        },
      });
      if (error) throw error;
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Invalid fields"
            : e instanceof Error && /Unauthorized|Forbidden/.test(e.message)
              ? "Administrator access required"
              : e instanceof Error
                ? e.message
                : "Administrative operation failed",
      },
      {
        status:
          e instanceof Error && /Unauthorized|Forbidden/.test(e.message)
            ? 401
            : 400,
      },
    );
  }
}
