import Workspace from "@/components/workspace";
import { getSchemes, getClaims, getDocuments } from "@/lib/db/repository";
export const dynamic = "force-dynamic";
export default async function Page() {
  const [schemes, claims, documents] = await Promise.all([
    getSchemes(),
    getClaims(),
    getDocuments(),
  ]);
  return <Workspace schemes={schemes} claims={claims} documents={documents} />;
}
