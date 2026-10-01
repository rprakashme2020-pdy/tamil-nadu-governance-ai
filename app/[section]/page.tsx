import { notFound } from "next/navigation";
import Page from "../page";
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "ask",
      "schemes",
      "timeline",
      "data",
      "sources",
      "departments",
      "about",
      "search",
    ].includes(section)
  )
    notFound();
  return <Page />;
}
