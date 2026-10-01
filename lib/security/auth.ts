import { db } from "../db/client";
export async function requireAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const client = db();
  if (!client || !token) throw new Error("Unauthorized");
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  const { data: admin } = await client
    .from("admin_users")
    .select("id")
    .eq("id", data.user.id)
    .eq("enabled", true)
    .single();
  if (!admin) throw new Error("Forbidden");
  return { client, user: data.user };
}
export function sameOrigin(r: Request) {
  const origin = r.headers.get("origin");
  return !origin || origin === (process.env.APP_URL ?? new URL(r.url).origin);
}
