import type { Claim, DocumentRecord, Scheme } from "../types";
export const scheme: Scheme = {
  id: "11111111-1111-4111-8111-111111111111",
  name_en: "Naan Mudhalvan",
  name_ta: "நான் முதல்வன்",
  slug: "naan-mudhalvan",
  short_description_en:
    "Industry-relevant skills and career guidance for students and youth, as described by TNSDC.",
  short_description_ta:
    "TNSDC ஆவணத்தில் விவரிக்கப்பட்ட மாணவர்கள் மற்றும் இளைஞர்களுக்கான திறன் மேம்பாடு மற்றும் தொழில் வழிகாட்டுதல்.",
  department: "Special Programme Implementation",
  category: "Skill Development",
  launch_date: "2022-03-01",
  status: "documented",
  target_population: "Students and youth in Tamil Nadu",
  official_url: "https://www.naanmudhalvan.tn.gov.in/",
  start_year: 2022,
  end_year: null,
  verification_status: "verified",
  last_verified_at: "2026-10-01",
};
export const document: DocumentRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  title: "TNSDC — Expression of Interest, 7 March 2026",
  organization: "Tamil Nadu Skill Development Corporation",
  publication_date: "2026-03-07",
  document_type: "Official programme document (EOI)",
  source_level: "A",
  source_category: "Government announcement / programme description",
  original_url:
    "https://portal.naanmudhalvan.tn.gov.in/pdfs/EOI/2026-27_odd_iti.pdf",
  status: "verified",
  verified_at: "2026-10-01",
};
const base = {
  scheme_id: scheme.id,
  status: "verified",
  document_id: document.id,
  source_page: 2,
  reporting_period:
    "Programme description published 2026-03-07; launch event 2022 where applicable",
  geographical_scope: "Tamil Nadu",
  population_scope: "Students and youth",
  metric_name: null,
  metric_value: null,
  unit: null,
  verified_at: "2026-10-01",
  version: 1,
  document,
};
export const claims: Claim[] = [
  {
    ...base,
    id: "33333333-3333-4333-8333-333333333331",
    claim_type: "launch_date",
    claim_text:
      "TNSDC states that Naan Mudhalvan was launched on 1 March 2022.",
    claim_text_ta:
      "நான் முதல்வன் திட்டம் 1 மார்ச் 2022 அன்று தொடங்கப்பட்டது என்று TNSDC ஆவணம் கூறுகிறது.",
    excerpt: "Naan Mudhalvan was launched on the 1st of March 2022.",
  },
  {
    ...base,
    id: "33333333-3333-4333-8333-333333333332",
    claim_type: "objective",
    claim_text:
      "TNSDC describes the programme’s objective as developing industry-relevant skills and job readiness among students and youth.",
    claim_text_ta:
      "மாணவர்கள் மற்றும் இளைஞர்களின் தொழில்துறை சார்ந்த திறன்களையும் வேலைக்கான தயார்நிலையையும் மேம்படுத்துவது திட்டத்தின் நோக்கம் என்று TNSDC விவரிக்கிறது.",
    excerpt:
      "This empowers them with industry-relevant knowledge and skills enabling job readiness.",
  },
  {
    ...base,
    id: "33333333-3333-4333-8333-333333333333",
    claim_type: "benefit",
    claim_text:
      "TNSDC describes soft-skill courses covering personality development, entrepreneurship, personal finance and foreign languages.",
    claim_text_ta:
      "ஆளுமை வளர்ச்சி, தொழில்முனைவு, தனிநபர் நிதி மற்றும் வெளிநாட்டு மொழிகள் சார்ந்த மென் திறன் பயிற்சிகளை TNSDC விவரிக்கிறது.",
    excerpt:
      "On the soft skills side, students can upskill themselves through courses on personality development, entrepreneurship, personal finance and learning foreign languages.",
  },
  {
    ...base,
    id: "33333333-3333-4333-8333-333333333334",
    claim_type: "benefit",
    claim_text:
      "TNSDC describes free courses in industry-relevant skills on new and emerging technologies.",
    claim_text_ta:
      "புதிய மற்றும் வளர்ந்து வரும் தொழில்நுட்பங்களில் தொழில்துறை சார்ந்த திறன் பயிற்சிகள் இலவசமாக வழங்கப்படுவதாக TNSDC விவரிக்கிறது.",
    excerpt:
      "Students can access courses on industry-relevant skills provided free of cost on new and emerging technologies.",
  },
  {
    ...base,
    id: "33333333-3333-4333-8333-333333333335",
    claim_type: "benefit",
    claim_text:
      "The document describes career and academic counselling for students in state educational institutions.",
    claim_text_ta:
      "மாநில கல்வி நிறுவன மாணவர்களுக்கு தொழில் மற்றும் கல்வி ஆலோசனை வழங்கப்படுவதாக ஆவணம் விவரிக்கிறது.",
    excerpt:
      "The program also offers career and academic counselling to students in State educational institutions.",
  },
];
