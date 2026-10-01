import { notFound } from "next/navigation";
import Admin from "../page";
export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!["verification", "sources", "schemes", "uploads"].includes(section))
    notFound();
  return <Admin />;
}
