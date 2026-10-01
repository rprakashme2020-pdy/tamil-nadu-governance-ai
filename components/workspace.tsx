"use client";
import { useLanguage } from "./language-provider";
import DataExplorer from "./data-explorer";
import EvidenceDialog from "./evidence-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen,
  MessageSquare,
  Search,
  ShieldCheck,
  ArrowUp,
  FileText,
  X,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Check,
  Menu,
  Layers,
  BarChart3,
  Building2,
} from "lucide-react";
import type { Answer, Claim, Scheme, DocumentRecord } from "@/lib/types";
const links = [
  ["/", "Home", "முகப்பு"],
  ["/ask", "Ask AI", "AI கேள்வி"],
  ["/schemes", "Schemes", "திட்டங்கள்"],
  ["/timeline", "Timeline", "காலவரிசை"],
  ["/departments", "Departments", "துறைகள்"],
  ["/data", "Data Explorer", "தரவு"],
  ["/sources", "Sources", "ஆதாரங்கள்"],
  ["/about", "About", "பற்றி"],
];
const suggestions = [
  ["Naan Mudhalvan benefits", "நான் முதல்வன் திட்டத்தின் பயன்கள்"],
  [
    "When was Naan Mudhalvan launched?",
    "நான் முதல்வன் எப்போது தொடங்கப்பட்டது?",
  ],
  ["Schemes for women", "மகளிர் திட்டங்கள்"],
  ["Schemes for students", "மாணவர் திட்டங்கள்"],
  ["Employment programmes", "வேலைவாய்ப்புத் திட்டங்கள்"],
  ["Healthcare schemes", "சுகாதாரத் திட்டங்கள்"],
  ["Budget allocations", "நிதி ஒதுக்கீடுகள்"],
  ["District-wise programmes", "மாவட்டத் திட்டங்கள்"],
];
export default function Workspace({
  schemes,
  claims,
  documents,
  shared,
}: {
  schemes: Scheme[];
  claims: Claim[];
  documents: DocumentRecord[];
  shared?: Answer;
}) {
  const path = usePathname();
  const { language, setLanguage } = useLanguage();
  const ta = language === "ta";
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Answer[]>(shared ? [shared] : []);
  const [evidence, setEvidence] = useState<Claim[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [year, setYear] = useState("All");
  const [mobile, setMobile] = useState(false);
  const [copied, setCopied] = useState("");
  const [notice, setNotice] = useState("");
  async function ask(question = q) {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          language: /[\u0B80-\u0BFF]|\b(enna|ku|la)\b/i.test(question)
            ? "ta"
            : language,
          previous: answers.at(-1)?.question,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setAnswers((a) => [...a, data]);
      setQ("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to retrieve evidence");
    } finally {
      setBusy(false);
    }
  }
  async function feedback(a: Answer, reason: string) {
    const r = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer_id: a.id, question: a.question, reason }),
    });
    const d = await r.json();
    setNotice(r.ok ? "Thank you. Your feedback has been recorded." : d.error);
  }
  async function share(a: Answer) {
    const r = await fetch("/api/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: a.question,
        language: a.language,
        claimIds: a.claims.map((c) => c.id),
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setNotice(d.error);
      return;
    }
    await navigator.clipboard.writeText(`${location.origin}/answer/${d.id}`);
    setNotice("Share link copied. The answer is a dated evidence snapshot.");
  }
  const filtered = schemes.filter(
    (s) =>
      (category === "All" || s.category === category) &&
      (year === "All" || String(s.start_year) === year) &&
      (s.name_en + " " + s.name_ta + " " + s.short_description_en)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function card(s: Scheme) {
    return (
      <Link className="scheme-card" key={s.id} href={`/schemes/${s.slug}`}>
        <div className="card-top">
          <span className="icon-tile">
            <BookOpen size={23} />
          </span>
          <span className="pill">{s.category}</span>
        </div>
        <h3>{ta ? s.name_ta : s.name_en}</h3>
        <p>{ta ? s.short_description_ta : s.short_description_en}</p>
        <div className="card-footer">
          <span>{s.start_year} · Tamil Nadu</span>
          <span>
            <ShieldCheck size={15} />{" "}
            {ta ? "ஆதாரங்களுடன்" : "Source documented"}
          </span>
        </div>
      </Link>
    );
  }
  const current = schemes.find((s) => path === `/schemes/${s.slug}`);
  const isHome = path === "/";
  const isChat = path === "/ask" || path.startsWith("/answer/");
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brandmark">
            <Layers size={24} />
          </span>
          <span>
            TAMIL NADU<span className="brand-sub">GOVERNANCE AI</span>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className={mobile ? "nav open" : "nav"}
        >
          {links.map(([url, en, tamil]) => (
            <Link key={url} className={path === url ? "active" : ""} href={url}>
              {ta ? tamil : en}
            </Link>
          ))}
        </nav>
        <button
          className="language"
          aria-label="Change interface language"
          onClick={() => setLanguage(ta ? "en" : "ta")}
        >
          {ta ? "English" : "தமிழ்"}
        </button>
        <button
          className="mobile-menu"
          aria-label="Toggle menu"
          onClick={() => setMobile(!mobile)}
        >
          <Menu />
        </button>
      </header>
      <div className="term-bar">
        <span className="term-tag">2021 — 2026</span>
        <span>
          {ta
            ? "மு.க. ஸ்டாலின் தலைமையிலான முதல் ஐந்தாண்டு ஆட்சியின் ஆவணப்பதிவு"
            : "Documented record of the first 2021–2026 term led by M.K. Stalin"}
        </span>
        <span className="independent">Independent information product</span>
      </div>
      <main id="main">
        {isHome && (
          <>
            <section className="hero">
              <div className="eyebrow">
                <ShieldCheck size={16} />{" "}
                {ta
                  ? "ஆதாரங்கள் முதலில். பதில்கள் அடுத்து."
                  : "EVIDENCE FIRST. ANSWERS SECOND."}
              </div>
              <h1>
                {ta ? (
                  "தமிழ்நாடு அரசின் திட்டங்கள் மற்றும் செயல்பாடுகளை ஆதாரங்களுடன் அறிந்துகொள்ளுங்கள்"
                ) : (
                  <>
                    Ask a question.
                    <br />
                    Understand the <span>evidence.</span>
                  </>
                )}
              </h1>
              <p className="hero-copy">
                {ta
                  ? "சரிபார்க்கப்பட்ட ஆவணங்களிலிருந்து பதில்கள். ஒவ்வொரு தகவலுக்கும் அதன் ஆதாரம்."
                  : "Explore Tamil Nadu government schemes and documented outcomes with sources."}
              </p>
              {renderQuestionBox()}
              <div className="suggestions">
                {suggestions.slice(0, 4).map(([en, tamil]) => (
                  <button key={en} onClick={() => ask(ta ? tamil : en)}>
                    {ta ? tamil : en}
                  </button>
                ))}
              </div>
              <p className="small-note">
                <ShieldCheck size={14} />{" "}
                {ta
                  ? "சரிபார்க்கப்பட்ட ஆதாரங்கள் மட்டும் · பொதுப் பதிவு தேவையில்லை"
                  : "Verified evidence only · No public account required"}
              </p>
            </section>
            {renderAnswerList()}
            <section className="principles">
              <div>
                <FileText />
                <h3>{ta ? "ஆதாரத்தைக் காணுங்கள்" : "See the source"}</h3>
                <p>
                  {ta
                    ? "ஆவணம், பக்கம் மற்றும் ஆதரிக்கும் பகுதியைக் காணலாம்."
                    : "Open the document, page and supporting excerpt."}
                </p>
              </div>
              <div>
                <ShieldCheck />
                <h3>
                  {ta ? "தகவலின் வகையை அறியுங்கள்" : "Know what is reported"}
                </h3>
                <p>
                  {ta
                    ? "அரசு அறிக்கையும் சுயாதீன மதிப்பீடும் தனித்தனியாக."
                    : "Government reporting and independent verification stay distinct."}
                </p>
              </div>
              <div>
                <Search />
                <h3>{ta ? "தெரியாததும் தெளிவாக" : "Honest about the gaps"}</h3>
                <p>
                  {ta
                    ? "ஆதாரம் இல்லாதபோது, அதைத் தெளிவாகக் கூறுவோம்."
                    : "When evidence is missing, we say so."}
                </p>
              </div>
            </section>
            <section className="section">
              <div className="section-title">
                <div>
                  <div className="eyebrow">THE KNOWLEDGE BASE</div>
                  <h2>
                    {ta
                      ? "ஆவணப்படுத்தப்பட்ட திட்டங்கள்"
                      : "Explore documented schemes"}
                  </h2>
                </div>
                <Link href="/schemes">
                  {ta ? "அனைத்து திட்டங்கள்" : "Browse schemes"}
                </Link>
              </div>
              <div className="cards">
                {schemes.map(card)}
                <div className="empty-card">
                  <FileText size={28} />
                  <h3>
                    {ta
                      ? "ஆதாரப் பதிவு வளர்கிறது"
                      : "A growing evidence record"}
                  </h3>
                  <p>
                    {ta
                      ? "மேலும் திட்டங்கள் ஆய்வுக்குப் பின் சேர்க்கப்படும்."
                      : "More schemes will appear after source review. No placeholder achievements or invented statistics."}
                  </p>
                  <Link href="/sources">Explore source standards</Link>
                </div>
              </div>
            </section>
          </>
        )}
        {isChat && (
          <section className="chat-page">
            <aside className="chat-sidebar">
              <div className="eyebrow">RESEARCH WORKSPACE</div>
              <h2>{ta ? "கேள்விகளைக் கேளுங்கள்" : "Ask Governance AI"}</h2>
              <button onClick={() => setAnswers([])} className="primary">
                {ta ? "புதிய உரையாடல்" : "New conversation"}
              </button>
              <p>Conversation stays in this tab until you share an answer.</p>
              {answers.map((a) => (
                <button
                  className="history"
                  key={a.id}
                  onClick={() =>
                    document
                      .getElementById(a.id)
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  <MessageSquare size={16} />
                  {a.question}
                </button>
              ))}
              <div className="side-note">
                <ShieldCheck />
                Every answer is limited to verified evidence in this knowledge
                base.
              </div>
            </aside>
            <div className="chat-body">
              <div className="page-heading">
                <h1>
                  {ta
                    ? "ஆதாரங்களைக் கேளுங்கள்"
                    : "Your questions. Documented answers."}
                </h1>
                <p>தமிழ், English or Tanglish</p>
              </div>
              {!answers.length && (
                <div className="question-grid">
                  {suggestions.map(([en, tamil]) => (
                    <button key={en} onClick={() => ask(ta ? tamil : en)}>
                      <MessageSquare size={19} />
                      {ta ? tamil : en}
                    </button>
                  ))}
                </div>
              )}
              {renderAnswerList()}
              {!shared && renderQuestionBox()}
            </div>
          </section>
        )}
        {path === "/schemes" && (
          <section className="section route">
            <PageTitle
              title={ta ? "திட்டங்கள்" : "Schemes explorer"}
              sub="Browse the evidence record. Publication requires verified sources."
            />
            <div className="filters">
              <label>
                Search
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="English / தமிழ்"
                />
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {[
                    "All",
                    "Education",
                    "Women",
                    "Employment",
                    "Healthcare",
                    "Agriculture",
                    "Social Welfare",
                    "Infrastructure",
                    "Industry",
                    "Transport",
                    "Housing",
                    "Youth",
                    "Sports",
                    "Skill Development",
                    "Government Schools",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Launch year
                <select value={year} onChange={(e) => setYear(e.target.value)}>
                  {["All", "2021", "2022", "2023", "2024", "2025", "2026"].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
            </div>
            <div className="cards">{filtered.map(card)}</div>
            {!filtered.length && (
              <Empty text="No verified schemes match these filters." />
            )}
          </section>
        )}
        {current && (
          <section className="section route">
            <Link href="/schemes" className="back">
              All schemes
            </Link>
            <PageTitle
              title={ta ? current.name_ta : current.name_en}
              sub={
                ta ? current.short_description_ta : current.short_description_en
              }
            />
            <div className="detail-layout">
              <div>
                <div className="panel">
                  <h2>Documented facts</h2>
                  {claims
                    .filter((c) => c.scheme_id === current.id)
                    .map((c) => (
                      <div className="fact-row" key={c.id}>
                        <span>{ta ? c.claim_text_ta : c.claim_text}</span>
                        <button
                          className="citation"
                          onClick={() => setEvidence([c])}
                        >
                          [Source · p.{c.source_page}]
                        </button>
                      </div>
                    ))}
                </div>
                {[
                  "Eligibility and application process",
                  "Budget timeline",
                  "Beneficiary timeline",
                  "Independently verified outcomes",
                  "District coverage",
                ].map((t) => (
                  <div className="panel" key={t}>
                    <h2>{t}</h2>
                    <Empty
                      text={`No verified ${t.toLowerCase()} evidence has been added yet.`}
                    />
                  </div>
                ))}
              </div>
              <aside>
                <div className="panel">
                  <span className="pill">PRIMARY SOURCE ONLY</span>
                  <h3>Evidence status</h3>
                  <p>
                    Government programme description. Independent outcomes are
                    not established by this document.
                  </p>
                  <dl>
                    <dt>Launch</dt>
                    <dd>{current.launch_date}</dd>
                    <dt>Department</dt>
                    <dd>{current.department}</dd>
                    <dt>Last source check</dt>
                    <dd>{current.last_verified_at?.slice(0, 10)}</dd>
                  </dl>
                  <button
                    className="primary"
                    onClick={() =>
                      ask(
                        ta
                          ? "நான் முதல்வன் திட்டத்தின் பயன்கள்"
                          : "Naan Mudhalvan benefits",
                      )
                    }
                  >
                    Ask about this scheme
                  </button>
                </div>
              </aside>
            </div>
            {renderAnswerList()}
          </section>
        )}
        {path === "/timeline" && (
          <section className="section route">
            <PageTitle
              title={ta ? "காலவரிசை" : "The documented timeline"}
              sub="2021–2026 · Events appear only when supporting evidence exists."
            />
            {[2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
              <div className="timeline-year" key={y}>
                <span className="year">{y}</span>
                <div>
                  {schemes
                    .filter((s) => s.start_year === y)
                    .map((s) => (
                      <button
                        className="timeline-event"
                        key={s.id}
                        onClick={() =>
                          setEvidence(
                            claims.filter(
                              (c) =>
                                c.scheme_id === s.id &&
                                c.claim_type === "launch_date",
                            ),
                          )
                        }
                      >
                        <span>{s.launch_date}</span>
                        <h3>{ta ? s.name_ta : s.name_en}</h3>
                        <p>Launch · Officially documented</p>
                      </button>
                    ))}
                  {!schemes.some((s) => s.start_year === y) && (
                    <p className="muted">
                      No verified events added for this year.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
        {path === "/data" && (
          <section className="section route">
            <PageTitle
              title={ta ? "தரவு ஆய்வு" : "Data explorer"}
              sub="Every measure retains its period, population and source. Missing data is never shown as zero."
            />
            <DataExplorer
              claims={claims}
              schemes={schemes}
              language={language}
              onEvidence={setEvidence}
            />
          </section>
        )}
        {path === "/sources" && (
          <section className="section route">
            <PageTitle
              title={ta ? "ஆதாரப் பதிவு" : "The source register"}
              sub="Transparent provenance. Verification confirms a document supports a claim; it does not prove its reported outcome independently."
            />
            <div className="source-levels">
              {[
                [
                  "A",
                  "Primary official",
                  "Budgets, policy notes, Government Orders and department reports.",
                ],
                [
                  "B",
                  "Statutory / institutional",
                  "CAG, statutory bodies and institutional datasets.",
                ],
                [
                  "C",
                  "Independent",
                  "Peer-reviewed research and reputable reporting.",
                ],
                [
                  "D",
                  "Political / promotional",
                  "Attributed claims and opinions; never independent proof.",
                ],
              ].map(([l, t, d]) => (
                <div key={l}>
                  <span className="level">{l}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              ))}
            </div>
            {documents.map((d) => (
              <article className="panel source-doc" key={d.id}>
                <FileText />
                <div>
                  <span className="pill">
                    LEVEL {d.source_level} · {d.source_category}
                  </span>
                  <h2>{d.title}</h2>
                  <p>
                    {d.organization} · Published{" "}
                    {d.publication_date ?? "Date not established"}
                  </p>
                  <a
                    href={d.original_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read original document
                  </a>
                  <button
                    className="text-button"
                    onClick={() =>
                      setEvidence(claims.filter((c) => c.document_id === d.id))
                    }
                  >
                    Inspect supporting claims
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
        {path === "/departments" && (
          <section className="section route">
            <PageTitle
              title={ta ? "துறைகள்" : "Departments"}
              sub="Departments represented in the verified knowledge base."
            />
            {[...new Set(schemes.map((s) => s.department))].map((d) => (
              <div className="panel" key={d}>
                <Building2 />
                <h2>{d}</h2>
                {schemes.filter((s) => s.department === d).map(card)}
              </div>
            ))}
          </section>
        )}
        {path === "/search" && (
          <section className="section route">
            <PageTitle
              title="Search the knowledge base"
              sub="Find schemes, claims and source documents in Tamil or English."
            />
            <label className="search-field">
              <Search />
              <input
                aria-label="Search verified knowledge"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search schemes or evidence…"
              />
            </label>
            {search && (
              <>
                <div className="cards">{filtered.map(card)}</div>
                {claims
                  .filter((c) =>
                    (c.claim_text + " " + c.claim_text_ta)
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((c) => (
                    <button
                      className="search-result"
                      key={c.id}
                      onClick={() => setEvidence([c])}
                    >
                      {ta ? c.claim_text_ta : c.claim_text}
                      <span>Inspect evidence</span>
                    </button>
                  ))}
              </>
            )}
          </section>
        )}
        {path === "/about" && (
          <section className="section route about">
            <PageTitle
              title="An evidence engine for public understanding"
              sub="தமிழ்நாடு ஆட்சி தகவல் AI"
            />
            <div className="panel">
              <h2>Scope: the first 2021–2026 term led by M.K. Stalin</h2>
              <p>
                This independent research product helps people inspect
                documented government schemes. It is not an official government
                service or a party publication.
              </p>
              <h2>What verified means here</h2>
              <p>
                A reviewer has checked that a source supports the attributed
                claim. An official programme description remains government
                reporting, unless independent corroboration is recorded
                separately.
              </p>
              <h2>Accuracy before completeness</h2>
              <p>
                No source means no factual answer. Announcements,
                implementation, allocations, expenditure, targets and realised
                outcomes are separate evidence categories.
              </p>
              <h2>Privacy</h2>
              <p>
                No public login or tracking analytics are required.
                Conversations stay in your current tab. Sharing creates a public
                dated snapshot. Feedback is stored only when a database is
                configured.
              </p>
              <Link href="/admin">Evidence console</Link>
            </div>
          </section>
        )}
        {error && (
          <div role="alert" className="alert">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="notice">
            {notice}
            <button aria-label="Dismiss" onClick={() => setNotice("")}>
              <X size={16} />
            </button>
          </div>
        )}
      </main>
      <footer>
        <div className="brand-footer">TAMIL NADU GOVERNANCE AI</div>
        <span>{ta ? "ஆதாரங்கள் முதலில்." : "Evidence first. Always."}</span>
        <Link href="/sources">Source standards</Link>
        <Link href="/search">Search</Link>
        <Link href="/admin">Admin</Link>
      </footer>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          ["/", "Home", BookOpen],
          ["/ask", "Ask", MessageSquare],
          ["/schemes", "Schemes", Layers],
          ["/data", "Data", BarChart3],
          ["/sources", "Sources", FileText],
        ].map(([url, label, Icon]) => {
          const I = Icon as typeof BookOpen;
          return (
            <Link key={String(url)} href={String(url)}>
              <I size={20} />
              {String(label)}
            </Link>
          );
        })}
      </nav>
      {evidence && (
        <EvidenceDialog
          label={ta ? "இந்த பதிலை சரிபார்க்கவும்" : "Verify this answer"}
          onClose={() => setEvidence(null)}
        >
          <button
            autoFocus
            className="close"
            aria-label="Close evidence panel"
            onClick={() => setEvidence(null)}
          >
            <X />
          </button>
          <div className="eyebrow">CLAIM-BY-CLAIM EVIDENCE</div>
          <h2 id="evidence-title">
            {ta ? "இந்த பதிலை சரிபார்க்கவும்" : "Verify this answer"}
          </h2>
          <p className="muted">
            Source verification and independent outcome verification are
            different.
          </p>
          {evidence.map((c) => (
            <article className="evidence-claim" key={c.id}>
              <span className="pill">
                {c.status.toUpperCase()} · VERSION {c.version}
              </span>
              <h3>{ta ? c.claim_text_ta : c.claim_text}</h3>
              <dl>
                <dt>Source</dt>
                <dd>{c.document?.organization}</dd>
                <dt>Document</dt>
                <dd>{c.document?.title}</dd>
                <dt>Source type</dt>
                <dd>
                  Level {c.document?.source_level} ·{" "}
                  {c.document?.source_category}
                </dd>
                <dt>Publication</dt>
                <dd>{c.document?.publication_date ?? "Not established"}</dd>
                <dt>Page</dt>
                <dd>{c.source_page ?? "Not available"}</dd>
                <dt>Reporting period</dt>
                <dd>{c.reporting_period}</dd>
                <dt>Verified on</dt>
                <dd>{c.verified_at?.slice(0, 10) ?? "Pending"}</dd>
              </dl>
              <blockquote>
                <mark>{c.excerpt}</mark>
              </blockquote>
              <a
                className="primary"
                target="_blank"
                rel="noopener noreferrer"
                href={`${c.document?.original_url ?? "#"}#page=${c.source_page ?? 1}`}
              >
                Open original source
              </a>
            </article>
          ))}
        </EvidenceDialog>
      )}
    </>
  );
  function renderQuestionBox() {
    return (
      <form
        className="question-box"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <label className="sr-only" htmlFor="question">
          Ask a governance question
        </label>
        <textarea
          id="question"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            ta
              ? "நான் முதல்வன் திட்டத்தால் மாணவர்களுக்கு என்ன பயன்?"
              : "How did students benefit from Naan Mudhalvan?"
          }
          rows={2}
          maxLength={2000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
        />
        <div className="question-bottom">
          <span>
            <Search size={15} />{" "}
            {busy
              ? "Retrieving verified evidence…"
              : ta
                ? "சரிபார்க்கப்பட்ட அறிவுத்தளம்"
                : "Verified knowledge base"}
          </span>
          <button
            className="send"
            disabled={busy || !q.trim()}
            aria-label="Send question"
          >
            <ArrowUp size={22} />
          </button>
        </div>
      </form>
    );
  }
  function renderAnswerList() {
    return (
      <div className="answer-list" aria-live="polite">
        {answers.map((a) => (
          <article key={a.id} id={a.id} className="answer-card">
            <div className="user-question">
              <MessageSquare size={18} />
              {a.question}
            </div>
            <div className="answer-header">
              <span className="answer-icon">
                <Layers size={20} />
              </span>
              <span>Governance AI</span>
              <span className="pill">{a.label}</span>
            </div>
            <p className="direct" lang={a.language}>
              {a.direct}{" "}
              {a.facts.length > 0 && (
                <button
                  className="citation"
                  onClick={() =>
                    setEvidence(
                      a.claims.filter((c) => c.id === a.facts[0].claimId),
                    )
                  }
                >
                  [Source]
                </button>
              )}
            </p>
            {a.facts.length > 1 && (
              <>
                <h3>
                  {a.language === "ta" ? "முக்கிய தகவல்கள்" : "Key facts"}
                </h3>
                {a.facts.slice(1).map((f) => (
                  <p className="fact" key={f.claimId}>
                    {f.text}{" "}
                    <button
                      className="citation"
                      onClick={() =>
                        setEvidence(a.claims.filter((c) => c.id === f.claimId))
                      }
                    >
                      [Source]
                    </button>
                  </p>
                ))}
              </>
            )}
            {a.facts.length > 0 && (
              <>
                <h3>What the data means</h3>
                <p>{a.meaning}</p>
              </>
            )}
            <div className="source-status">
              <ShieldCheck size={17} />
              <p>
                {a.explanation}{" "}
                {a.claims.length > 0 && (
                  <span>
                    {" "}
                    {a.language === "ta" ? "ஆதார வகை" : "Source status"}:{" "}
                    {[
                      ...new Set(
                        a.claims.map((c) => c.document?.source_category),
                      ),
                    ].join("; ")}
                  </span>
                )}
                <br />
                Evidence verified:{" "}
                {a.verifiedAt?.slice(0, 10) ?? "No supporting evidence"} ·
                Generated {a.generatedAt.slice(0, 10)}
              </p>
            </div>
            {shared && (
              <p className="alert">
                Answer snapshot generated using evidence verified on{" "}
                {a.verifiedAt?.slice(0, 10) ?? "unknown date"}. It may no longer
                reflect the current record.
              </p>
            )}
            {a.conflicts.length > 0 &&
              a.conflicts.map((group, i) => (
                <div key={i} className="panel">
                  <h3>Conflicting figures — reason not established</h3>
                  {group.map((c) => (
                    <p key={c.id}>
                      {c.metric_value} {c.unit} · {c.reporting_period} ·{" "}
                      {c.document?.title} · Published{" "}
                      {c.document?.publication_date}
                    </p>
                  ))}
                </div>
              ))}
            <div className="answer-actions">
              <button
                disabled={!a.claims.length}
                onClick={() => setEvidence(a.claims)}
              >
                <ShieldCheck size={16} />
                {a.language === "ta"
                  ? "இந்த பதிலை சரிபார்க்கவும்"
                  : "Verify this answer"}
              </button>
              <button
                aria-label="Copy answer"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    [
                      a.direct,
                      ...a.facts.slice(1).map((f) => f.text),
                      ...a.claims.map((c) => c.document?.original_url),
                    ].join("\n"),
                  );
                  setCopied(a.id);
                }}
              >
                {copied === a.id ? <Check size={16} /> : <Copy size={16} />}
              </button>
              <button aria-label="Share answer" onClick={() => share(a)}>
                <Share2 size={16} />
              </button>
              <button
                aria-label="Helpful answer"
                onClick={() => feedback(a, "helpful")}
              >
                <ThumbsUp size={16} />
              </button>
              <button
                aria-label="Unhelpful answer"
                onClick={() => feedback(a, "unhelpful")}
              >
                <ThumbsDown size={16} />
              </button>
              <label className="sr-only" htmlFor={`report-${a.id}`}>
                Report incorrect information
              </label>
              <select
                id={`report-${a.id}`}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) feedback(a, e.target.value);
                }}
              >
                <option value="" disabled>
                  Report an issue
                </option>
                {[
                  "Incorrect statistic",
                  "Outdated information",
                  "Source does not support claim",
                  "Translation issue",
                  "Missing context",
                  "Other",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </div>
          </article>
        ))}
      </div>
    );
  }
}
function PageTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="page-heading">
      <div className="eyebrow">TAMIL NADU GOVERNANCE AI</div>
      <h1>{title}</h1>
      <p>{sub}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <FileText size={22} />
      <p>{text}</p>
    </div>
  );
}
