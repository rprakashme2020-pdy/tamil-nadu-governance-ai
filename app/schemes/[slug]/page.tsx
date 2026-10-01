import { notFound } from "next/navigation";
import { getSchemes } from "@/lib/db/repository";
import Page from "../../page";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = (await getSchemes()).find((s) => s.slug === slug);
  return {
    title: s ? `${s.name_en} | ${s.name_ta}` : "Scheme not found",
    description: s?.short_description_en,
    alternates: { canonical: `/schemes/${slug}` },
    openGraph: { title: s?.name_en, description: s?.short_description_ta },
  };
}
export default async function SchemePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const s = (await getSchemes()).find((s) => s.slug === slug);
  if (!s) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: s.name_en,
            description: s.short_description_en,
            inLanguage: ["en", "ta"],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <Page />
    </>
  );
}
