"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { publicDb } from "@/lib/db/browser";
import type { Claim, Scheme } from "@/lib/types";
type Source = {
  id: string;
  domain: string;
  organization: string;
  trust_level: string;
  source_category: string;
  enabled: boolean;
  notes: string;
};
type Data = {
  claims: Claim[];
  schemes: Scheme[];
  sources: Source[];
  documents: { id: string; title: string; status: string }[];
  feedback: { id: string; reason: string; question: string }[];
};
export default function AdminConsole() {
  const path = usePathname();
  const [token, setToken] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Claim | null>(null);
  const { register, handleSubmit } = useForm<{
    email: string;
    password: string;
  }>();
  async function load(t = token) {
    const r = await fetch("/api/admin", {
      headers: { Authorization: `Bearer ${t}` },
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
  }
  async function login(v: { email: string; password: string }) {
    setLoading(true);
    try {
      const c = publicDb();
      if (!c)
        throw new Error(
          "Supabase is not configured. Follow the README to configure an administrator.",
        );
      const { data, error } = await c.auth.signInWithPassword(v);
      if (error || !data.session) throw new Error("Unable to sign in");
      await load(data.session.access_token);
      setToken(data.session.access_token);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }
  async function mutate(body: object | FormData) {
    setLoading(true);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers:
          body instanceof FormData
            ? { Authorization: `Bearer ${token}` }
            : {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
        body: body instanceof FormData ? body : JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setNotice(d.message ?? "Saved.");
      await load();
      setEditing(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setLoading(false);
    }
  }
  if (!token || !data)
    return (
      <main className="admin-container login">
        <Link href="/">Tamil Nadu Governance AI</Link>
        <div className="panel">
          <h1>Evidence console</h1>
          <p>Invited administrators only. Public registration is disabled.</p>
          <form className="admin-form" onSubmit={handleSubmit(login)}>
            <label>
              Email
              <input
                type="email"
                autoComplete="username"
                required
                {...register("email")}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                {...register("password")}
              />
            </label>
            <button className="primary" disabled={loading}>
              {loading ? "Checking access…" : "Sign in"}
            </button>
          </form>
        </div>
        {notice && (
          <p role="alert" className="alert">
            {notice}
          </p>
        )}
      </main>
    );
  return (
    <main className="admin-container">
      <Link href="/">Public site</Link>
      <div className="section-title">
        <h1>Admin Evidence Console</h1>
        <button
          onClick={async () => {
            await publicDb()?.auth.signOut();
            setToken("");
            setData(null);
          }}
        >
          Sign out
        </button>
      </div>
      <nav className="admin-tabs">
        <Link href="/admin">Overview</Link>
        <Link href="/admin/uploads">Upload</Link>
        <Link href="/admin/verification">Verification</Link>
        <Link href="/admin/sources">Sources</Link>
        <Link href="/admin/schemes">Schemes</Link>
      </nav>
      {notice && (
        <p role="status" className="alert">
          {notice}
        </p>
      )}
      {path === "/admin" && (
        <>
          <div className="admin-counts">
            {[
              ["Schemes", data.schemes.length],
              ["Documents", data.documents.length],
              [
                "Verified claims",
                data.claims.filter((c) => c.status === "verified").length,
              ],
              [
                "Pending review",
                data.claims.filter((c) => c.status === "pending").length,
              ],
            ].map(([l, v]) => (
              <div key={l}>
                <strong>{v}</strong>
                {l}
              </div>
            ))}
          </div>
          <div className="admin-grid">
            <section className="panel">
              <h2>Recent uploads</h2>
              {data.documents.map((d) => (
                <p key={d.id}>
                  {d.title} · {d.status}
                </p>
              ))}
            </section>
            <section className="panel">
              <h2>Reported answers</h2>
              {!data.feedback.length && <p>No reported answers.</p>}
              {data.feedback.map((f) => (
                <p key={f.id}>
                  {f.reason} — {f.question}
                </p>
              ))}
            </section>
          </div>
        </>
      )}
      {path === "/admin/uploads" && (
        <section className="panel">
          <h2>Ingest evidence</h2>
          <p>
            Files and pasted text are untrusted. Extracted sentences are review
            candidates, never verified automatically. Source URLs are recorded,
            not fetched.
          </p>
          <form
            className="admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              mutate(new FormData(e.currentTarget));
            }}
          >
            <label>
              Document title
              <input name="title" required />
            </label>
            <label>
              Scheme
              <select name="scheme_id" required>
                {data.schemes.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name_en}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Source domain
              <select name="source_domain_id" required>
                {data.sources
                  .filter((s) => s.enabled)
                  .map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.domain} · Level {s.trust_level}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Original HTTPS URL
              <input name="original_url" type="url" required />
            </label>
            <label>
              Publication date
              <input name="publication_date" type="date" required />
            </label>
            <label>
              Document type
              <select name="document_type">
                <option>Policy note</option>
                <option>Budget</option>
                <option>Government Order</option>
                <option>Official report</option>
                <option>Independent research</option>
                <option>Media reporting</option>
                <option>Political claim</option>
              </select>
            </label>
            <label>
              Upload PDF / DOCX / TXT (maximum 10 MB)
              <input name="file" type="file" accept=".pdf,.docx,.txt" />
            </label>
            <label>
              Or paste document text
              <textarea name="text" rows={8} />
            </label>
            <button disabled={loading} className="primary">
              {loading ? "Extracting…" : "Extract review candidates"}
            </button>
          </form>
        </section>
      )}
      {path === "/admin/verification" && (
        <section>
          <h2>Claim verification queue</h2>
          {data.claims.map((c) => (
            <article className="panel" key={c.id}>
              <span className="pill">
                {c.status} · v{c.version}
              </span>
              <h3>{c.claim_text}</h3>
              <p>
                {c.document?.title} · Page {c.source_page ?? "Not available"}
              </p>
              <button className="primary" onClick={() => setEditing(c)}>
                Review / edit
              </button>
            </article>
          ))}
        </section>
      )}
      {path === "/admin/sources" && (
        <>
          <h2>Source whitelist</h2>
          {data.sources.map((s) => (
            <div className="panel" key={s.id}>
              <h3>
                {s.domain} · {s.trust_level}
              </h3>
              <p>
                {s.organization} · {s.source_category}
              </p>
              <p>{s.notes}</p>
              <button
                onClick={() =>
                  mutate({
                    action: "source",
                    source: { ...s, enabled: !s.enabled, id: s.id },
                  })
                }
              >
                {s.enabled ? "Disable source" : "Enable source"}
              </button>
            </div>
          ))}
          <section className="panel">
            <h2>Add a source</h2>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                mutate({
                  action: "source",
                  source: {
                    domain: f.get("domain"),
                    organization: f.get("organization"),
                    trust_level: f.get("trust_level"),
                    source_category: f.get("source_category"),
                    enabled: true,
                    notes: f.get("notes"),
                  },
                });
              }}
            >
              {["domain", "organization", "source_category", "notes"].map(
                (n) => (
                  <label key={n}>
                    {n.replaceAll("_", " ")}
                    <input name={n} required={n !== "notes"} />
                  </label>
                ),
              )}
              <label>
                Trust level
                <select name="trust_level">
                  {["A", "B", "C", "D"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
              <button className="primary" disabled={loading}>
                Add source
              </button>
            </form>
          </section>
        </>
      )}
      {path === "/admin/schemes" && (
        <>
          <h2>Schemes</h2>
          {data.schemes.map((s) => (
            <div className="panel" key={s.id}>
              <h3>
                {s.name_en} · {s.name_ta}
              </h3>
              <p>{s.verification_status}</p>
            </div>
          ))}
          <section className="panel">
            <h2>Create draft scheme</h2>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                const values = Object.fromEntries(
                  new FormData(e.currentTarget),
                );
                mutate({
                  action: "scheme",
                  scheme: { ...values, start_year: Number(values.start_year) },
                });
              }}
            >
              {[
                "name_en",
                "name_ta",
                "slug",
                "short_description_en",
                "short_description_ta",
                "department",
                "category",
                "official_url",
              ].map((n) => (
                <label key={n}>
                  {n.replaceAll("_", " ")}
                  <input name={n} required />
                </label>
              ))}
              <label>
                Start year
                <input
                  name="start_year"
                  type="number"
                  min={2021}
                  max={2026}
                  defaultValue={2022}
                />
              </label>
              <button className="primary" disabled={loading}>
                Create draft
              </button>
            </form>
          </section>
        </>
      )}
      {editing && (
        <div className="drawer-backdrop">
          <section
            className="evidence-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Review claim"
          >
            <button onClick={() => setEditing(null)}>Close</button>
            <h2>Review claim</h2>
            <blockquote>{editing.excerpt}</blockquote>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                mutate({
                  action: "verify",
                  id: editing.id,
                  ...Object.fromEntries(f),
                  source_page: f.get("source_page")
                    ? Number(f.get("source_page"))
                    : null,
                  metric_value: f.get("metric_value")
                    ? Number(f.get("metric_value"))
                    : null,
                  metric_name: f.get("metric_name") || null,
                  unit: f.get("unit") || null,
                });
              }}
            >
              <label>
                English attributed claim
                <textarea
                  name="claim_text"
                  required
                  defaultValue={editing.claim_text}
                />
              </label>
              <label>
                Reviewed Tamil translation
                <textarea
                  name="claim_text_ta"
                  required
                  defaultValue={editing.claim_text_ta}
                />
              </label>
              <label>
                Exact supporting excerpt
                <textarea
                  name="excerpt"
                  required
                  defaultValue={editing.excerpt}
                />
              </label>
              <label>
                Claim type
                <select
                  name="claim_type"
                  defaultValue={
                    [
                      "launch_date",
                      "objective",
                      "benefit",
                      "quantitative",
                    ].includes(editing.claim_type)
                      ? editing.claim_type
                      : "quantitative"
                  }
                >
                  {["launch_date", "objective", "benefit", "quantitative"].map(
                    (t) => (
                      <option key={t}>{t}</option>
                    ),
                  )}
                </select>
              </label>
              {[
                "source_page",
                "reporting_period",
                "geographical_scope",
                "population_scope",
                "metric_value",
                "unit",
              ].map((n) => (
                <label key={n}>
                  {n.replaceAll("_", " ")}
                  <input
                    name={n}
                    defaultValue={String(editing[n as keyof Claim] ?? "")}
                    type={
                      ["source_page", "metric_value"].includes(n)
                        ? "number"
                        : "text"
                    }
                    step="any"
                  />
                </label>
              ))}
              <label>
                Measure
                <select
                  name="metric_name"
                  defaultValue={editing.metric_name ?? ""}
                >
                  <option value="">Not quantitative</option>
                  {[
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
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label>
                Review reason
                <input name="reason" minLength={10} required />
              </label>
              <label>
                Decision
                <select name="decision">
                  <option value="investigation">Needs investigation</option>
                  <option value="verified">Approve and publish</option>
                  <option value="rejected">Reject</option>
                </select>
              </label>
              <button disabled={loading} className="primary">
                Save decision
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
