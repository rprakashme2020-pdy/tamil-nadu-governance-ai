import { claims } from "../lib/db/seed-data";
import { retrieve, detectLanguage } from "../lib/rag/engine";
const cases = [
  { q: "When was Naan Mudhalvan launched?", expected: [claims[0].id] },
  { q: "What is the objective of Naan Mudhalvan?", expected: [claims[1].id] },
  {
    q: "How did students benefit from Naan Mudhalvan?",
    expected: claims.slice(2).map((c) => c.id),
  },
  {
    q: "நான் முதல்வன் திட்டத்தால் மாணவர்களுக்கு என்ன பயன்?",
    expected: claims.slice(2).map((c) => c.id),
  },
  {
    q: "Naan mudhalvan la students ku enna benefit?",
    expected: claims.slice(2).map((c) => c.id),
  },
  { q: "How many people were trained by Naan Mudhalvan?", expected: [] },
  { q: "How many obtained employment under Naan Mudhalvan?", expected: [] },
];
let passed = 0;
for (const c of cases) {
  const actual = retrieve(c.q, claims).map((c) => c.id);
  const ok = JSON.stringify(actual) === JSON.stringify(c.expected);
  passed += Number(ok);
  console.log(ok ? "PASS" : "FAIL", detectLanguage(c.q), c.q);
}
console.log(`${passed}/${cases.length} exact evidence matches`);
if (passed !== cases.length) process.exit(1);
