import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

async function getClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;

  client = createClient({ url: process.env.REDIS_URL }) as RedisClientType;
  client.on("error", (err) => {
    console.error("[cache] Redis error:", err);
    client = null;
  });
  await client.connect();
  return client;
}

/** Prompt metadata is relatively stable; keep it for five minutes. */
export const PROMPT_METADATA_TTL_SECONDS = 5 * 60;
const DEFAULT_TTL = PROMPT_METADATA_TTL_SECONDS;

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const c = await getClient();
    if (!c) return null;
    return c.get(key);
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds = DEFAULT_TTL,
): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    await c.set(key, value, { EX: ttlSeconds });
  } catch {
    // cache miss is non-fatal
  }
}

/**
 * Atomically sets `key` only if it doesn't already exist (SET NX EX).
 * Returns true if this call created the key (i.e. the lock was acquired).
 * With no Redis backend configured, there's nothing to lock against, so
 * callers are allowed to proceed — consistent with the rest of this
 * module's fail-open behavior when caching is unavailable.
 */
export async function cacheSetNX(
  key: string,
  value: string,
  ttlSeconds = DEFAULT_TTL,
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

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    await c.del(keys);
  } catch {
    // non-fatal
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const c = await getClient();
    if (!c) return;
    const keys = await c.keys(pattern);
    if (keys.length) await c.del(keys);
  } catch {
    // non-fatal
  }
}

/** Release this service's Redis client during process shutdown. */
export async function closeCache(): Promise<void> {
  const current = client;
  client = null;
  if (!current?.isOpen) return;
  try {
    await current.quit();
  } catch {
    current.disconnect();
  }
}

export const CACHE_KEYS = {
  promptList: (query: string) => `prompts:list:${query}`,
  promptDetail: (id: string) => `prompts:metadata:${id}`,
};

/**
 * Invalidate every cache representation derived from a prompt contract
 * record. Call this after an indexed contract event as well as API writes.
 */
export async function invalidatePromptMetadata(promptId: string): Promise<void> {
  await Promise.all([
    cacheDel(CACHE_KEYS.promptDetail(promptId)),
    cacheDelPattern("prompts:list:*"),
  ]);
}
