import { z } from "zod";
import { createHash } from "node:crypto";
export function safeSourceUrl(url: string, domain: string) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === domain &&
      !u.username &&
      !u.password &&
      !u.port
    );
  } catch {
    return false;
  }
}
export function chunks(text: string, size = 1400) {
  const parts = [];
  for (let i = 0; i < text.length; i += size - 200)
    parts.push(text.slice(i, i + size));
  return parts;
}
export function candidateClaims(text: string) {
  return text
    .split(/(?<=[.!?।])\s+|\n+/)
    .map((v) => v.trim())
    .filter((v) => v.length > 40 && v.length < 700)
    .slice(0, 40);
}
export const metadata = z.object({
  title: z.string().min(3).max(250),
  scheme_id: z.string().uuid(),
  source_domain_id: z.string().uuid(),
  original_url: z.url().max(2000),
  publication_date: z.iso.date(),
  document_type: z.string().min(2).max(100),
  text: z.string().max(300000).default(""),
});
export function hash(data: Buffer) {
  return createHash("sha256").update(data).digest("hex");
}
