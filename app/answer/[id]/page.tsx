import { db } from "@/lib/db/client";
import { notFound } from "next/navigation";
import Workspace from "@/components/workspace";
import { getSchemes, getClaims, getDocuments } from "@/lib/db/repository";
export const dynamic = "force-dynamic";
export default async function Shared({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = db();
  if (!c) notFound();
  const { data } = await c
    .from("answer_snapshots")
    .select("snapshot")
    .eq("id", id)
    .single();
  if (!data) notFound();
  const [schemes, claims, documents] = await Promise.all([
    getSchemes(),
    getClaims(),
    getDocuments(),
  ]);
  return (
    <Workspace
      schemes={schemes}
      claims={claims}
      documents={documents}
      shared={data.snapshot}
    />
  );
}
