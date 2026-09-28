import { createClient, type RedisClientType } from "redis";

declare global {
  // eslint-disable-next-line no-var
  var redisClient: RedisClientType | undefined;
}

let client: RedisClientType | null = null;

function getGlobalRedis(): RedisClientType | null {
  if (typeof globalThis !== "undefined" && "redisClient" in globalThis) {
    return (globalThis as any).redisClient ?? null;
  }
  return null;
}

function setGlobalRedis(c: RedisClientType | null) {
  if (typeof globalThis !== "undefined") {
    (globalThis as any).redisClient = c;
  }
}

async function getClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;

  // Check global cache first (survives serverless warm starts)
  const globalCached = getGlobalRedis();
  if (globalCached) {
    try {
      await globalCached.ping();
      client = globalCached;
      return globalCached;
    } catch {
      // Connection stale — fall through to reconnect
      setGlobalRedis(null);
    }
  }

  // Check local singleton
  if (client) {
    try {
      await client.ping();
      return client;
    } catch {
      client = null;
    }
  }

  client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
  client.on("error", (err) => {
    console.error("[redis] Connection error:", err);
    client = null;
    setGlobalRedis(null);
  });
  client.on("end", () => {
    client = null;
    setGlobalRedis(null);
  });

  await client.connect();
  setGlobalRedis(client);
  return client;
}

export async function redisGet(key: string): Promise<string | null> {
  try {
    const c = await getClient();
    if (!c) return null;
    return c.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds = 60,
): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    await c.set(key, value, { EX: ttlSeconds });
  } catch {
    // non-fatal
  }
}

export async function redisSetNX(
  key: string,
  value: string,
  ttlSeconds = 60,
): Promise<boolean> {
  try {
    const c = await getClient();
    if (!c) return true;
    const result = await c.set(key, value, { NX: true, EX: ttlSeconds });
    return result !== null;
  } catch {
    return true;
  }
}

export async function redisDel(...keys: string[]): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    await c.del(keys);
  } catch {
    // non-fatal
  }
}

export async function redisHealth(): Promise<boolean> {
  try {
    const c = await getClient();
    if (!c) return false;
    await c.ping();
    return true;
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  try {
    const c = await getClient();
    if (c) {
      await c.quit();
      client = null;
      setGlobalRedis(null);
    }
  } catch {
    // non-fatal
  }
}

export const REDIS_KEYS = {
  promptList: (query: string) => `prompts:list:${query}`,
  promptDetail: (id: string) => `prompts:detail:${id}`,
  analytics: (key: string) => `analytics:${key}`,
  rateLimit: (key: string) => `ratelimit:${key}`,
};