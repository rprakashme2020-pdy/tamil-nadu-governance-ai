import type { Claim, Language, Answer } from "../types";
export const insufficient = {
  en: "I don't have enough verified evidence in the database to answer this accurately.",
  ta: "இந்தக் கேள்விக்கு துல்லியமாக பதிலளிக்க போதுமான சரிபார்க்கப்பட்ட ஆதாரம் தற்போது தரவுத்தளத்தில் இல்லை.",
};
export const strictEvidenceMode = true;
export function detectLanguage(q: string): Language {
  return /[\u0B80-\u0BFF]|\b(enna|eppo|thittam|thitam|ku|la|payan|muthalvan)\b/i.test(
    q,
  )
    ? "ta"
    : "en";
}
export function intent(q: string) {
  if (
    /how many|எத்தனை|எவ்வளவு|ethana|evlo|count|number|budget|spent|allocated|பட்ஜெட்|நிதி|செலவு|beneficiar|பயனாளி/i.test(
      q,
    )
  )
    return "quantitative";
  if (/when|launch|introduced|தொடங்|எப்போது|eppo/i.test(q))
    return "launch_date";
  if (/objective|நோக்கம்/i.test(q)) return "objective";
  return "benefit";
}
export function semanticClass(q: string) {
  if (/employed|employment|placed|வேலை கிடை|வேலைவாய்ப்பு பெற்ற/i.test(q))
    return "employed";
  if (/trained|training|பயிற்சி பெற்ற/i.test(q)) return "trained";
  if (/spent|expenditure|செலவிட/i.test(q)) return "spent";
  if (/allocat|ஒதுக்க/i.test(q)) return "allocated";
  if (/achiev|சாதனை/i.test(q)) return "achieved";
  if (/target|இலக்கு/i.test(q)) return "targeted";
  if (/implement|செயல்படுத்த/i.test(q)) return "implemented";
  if (/announc|அறிவி/i.test(q)) return "announced";
  return null;
}
export function isNeutral(q: string) {
  return !/how.*vote|who.*vote|vote for|support.*party|oppose.*party|predict.*election|rank.*part|யாருக்கு.*வாக்|வாக்களி|தேர்தல்.*கணிப்பு/i.test(
    q,
  );
}
export function retrieve(q: string, all: Claim[], previous?: string): Claim[] {
  const question = q.toLowerCase();
  const schemeKnown =
    /naan|mudhalvan|muthalvan|முதல்வன்|schemes.*students|மாணவர்.*திட்ட|skill development|திறன் மேம்பா/.test(
      question,
    ) ||
    /show.*schemes.*introduced|திட்டங்கள்.*தொடங்/.test(question) ||
    (!/women|health|agricultur|மகளிர்|மருத்துவ/.test(question) &&
      !!previous &&
      /naan|முதல்வன்/i.test(previous));
  if (!schemeKnown) return [];
  const kind = intent(q);
  const sem = semanticClass(q);
  const year = q.match(/\b(202[1-6])\b/)?.[1];
  if (/guarantee|success|impact|independent|சுயாதீன|வெற்றி/i.test(q)) return [];
  return all
    .filter(
      (c) =>
        c.status === "verified" &&
        c.document?.status === "verified" &&
        c.scheme_id === "11111111-1111-4111-8111-111111111111",
    )
    .filter((c) =>
      kind === "quantitative"
        ? c.metric_value !== null && (!sem || c.metric_name === sem)
        : c.claim_type === kind,
    )
    .filter(
      (c) =>
        (!year ||
          (kind === "launch_date"
            ? c.claim_text.includes(year)
            : c.reporting_period.includes(year))) &&
        (!sem ||
          !["employed", "spent", "achieved", "implemented"].includes(sem) ||
          c.metric_name === sem),
    )
    .slice(0, 8);
}
export function conflicts(e: Claim[]): Claim[][] {
  const grouped = new Map<string, Claim[]>();
  for (const c of e) {
    if (c.metric_value === null) continue;
    const key = [
      c.scheme_id,
      c.metric_name,
      c.reporting_period,
      c.geographical_scope,
      c.population_scope,
      c.unit,
    ].join("|");
    grouped.set(key, [...(grouped.get(key) ?? []), c]);
  }
  return [...grouped.values()].filter(
    (g) => new Set(g.map((c) => c.metric_value)).size > 1,
  );
}
export function validateFacts(
  facts: { text: string; claimId: string }[],
  evidence: Claim[],
  language: Language,
) {
  return facts.filter((f) =>
    evidence.some(
      (c) =>
        c.id === f.claimId &&
        c.status === "verified" &&
        c.document?.status === "verified" &&
        f.text === (language === "ta" ? c.claim_text_ta : c.claim_text),
    ),
  );
}
export function answer(q: string, language: Language, e: Claim[]): Answer {
  const facts = validateFacts(
    e.map((c) => ({
      text: language === "ta" ? c.claim_text_ta : c.claim_text,
      claimId: c.id,
    })),
    e,
    language,
  );
  const disagreement = conflicts(e);
  const ids = new Set(e.map((c) => c.document_id));
  return {
    id: crypto.randomUUID(),
    question: q,
    language,
    direct: !isNeutral(q)
      ? language === "ta"
        ? "இந்த உதவியாளர் ஆதாரங்களுடன் ஆட்சி தகவல்களை வழங்குகிறது; வாக்களிப்பு ஆலோசனை வழங்காது."
        : "This assistant provides governance evidence and does not provide voting advice."
      : facts.length
        ? disagreement.length
          ? language === "ta"
            ? "ஒரே காலப்பகுதிக்கு ஆதாரங்கள் வேறுபட்ட புள்ளிவிவரங்களைக் கூறுகின்றன."
            : "Sources report different figures for the same reporting period."
          : facts[0].text
        : insufficient[language],
    facts: isNeutral(q) ? facts : [],
    claims: isNeutral(q) ? e : [],
    label: !facts.length
      ? "INSUFFICIENT EVIDENCE"
      : disagreement.length
        ? "CONFLICTING EVIDENCE"
        : ids.size > 1
          ? "MULTIPLE SOURCES"
          : ["C", "D"].includes(e[0]?.document?.source_level ?? "")
            ? "SECONDARY SOURCE ONLY"
            : "PRIMARY SOURCE ONLY",
    explanation:
      language === "ta"
        ? "ஆதாரத்தின் வகை காட்டப்படுகிறது; இது நம்பிக்கை சதவீதம் அல்ல."
        : "This label describes the available sources, not a probability of correctness.",
    meaning:
      language === "ta"
        ? "திட்ட விளக்கம், பயனாளிகள் உண்மையில் பெற்ற பலன்களுக்கான சுயாதீன மதிப்பீடு அல்ல. பயிற்சி பெற்றவர்கள் மற்றும் வேலை பெற்றவர்கள் வேறுபட்ட அளவீடுகள்."
        : "A programme description is not independent proof of realised outcomes. Training, employment, targets and achievements remain separate measures.",
    verifiedAt: e.length
      ? (e
          .map((c) => c.verified_at)
          .filter(Boolean)
          .sort()[0] ?? null)
      : null,
    generatedAt: new Date().toISOString(),
    conflicts: disagreement,
    mode: "strict extractive",
  };
}
