import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
const local = new Map<string, { count: number; until: number }>();
export async function allowed(key: string) {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    const limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "governance",
    });
    return (await limiter.limit(key)).success;
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    return false;
  const now = Date.now();
  if (local.size > 10000)
    for (const [k, v] of local) if (v.until < now) local.delete(k);
  const entry = local.get(key);
  if (!entry || entry.until < now) {
    local.set(key, { count: 1, until: now + 60000 });
    return true;
  }
  entry.count++;
  return entry.count <= 20;
}
