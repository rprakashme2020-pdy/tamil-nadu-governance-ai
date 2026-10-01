import { intent, semanticClass } from "./engine";
const stop = new Set(
  "how did do does the a an to from for by was were is are what when which of in under this scheme programme students people many tell me show about benefited benefits benefit என்ன எப்போது திட்டம் திட்டத்தால் மாணவர்களுக்கு பயன் நான் la ku enna students".split(
    " ",
  ),
);
export function normalizeQuery(q: string) {
  const normalized = q
    .toLowerCase()
    .replace(/naan\s+(muthalvan|mudhalvan)/g, "naan mudhalvan")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
  const tokens = normalized
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stop.has(t));
  return [...new Set(tokens)].join(" | ");
}
export function claimMatchesIntent(
  q: string,
  c: {
    claim_type: string;
    metric_value: number | null;
    metric_name: string | null;
    reporting_period: string;
  },
) {
  const kind = intent(q),
    sem = semanticClass(q);
  const year = q.match(/\b(202[1-6])\b/)?.[1];
  if (year && kind !== "launch_date" && !c.reporting_period.includes(year))
    return false;
  if (kind === "quantitative")
    return c.metric_value !== null && (!sem || c.metric_name === sem);
  if (sem && ["employed", "spent", "achieved", "implemented"].includes(sem))
    return c.metric_name === sem;
  return c.claim_type === kind;
}
