import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function checkRateLimit(ip) {
  const key = `rate:${ip}`;

  const count = await redis.incr(key);

  if (count === 1) {
    // Berlaku 5 jam
    await redis.expire(key, 60 * 60 * 5);
  }

  return count;
}
