import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';

interface CacheEntry {
  value: any;
  expiresAt: number;
}

interface CacheData {
  [key: string]: CacheEntry;
}

const file = path.join(__dirname, '../cache.json');
const adapter = new JSONFile<CacheData>(file);
const db = new Low<CacheData>(adapter, {});

async function get(key: string): Promise<any | null> {
  await db.read();
  const entry = db.data?.[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    delete db.data![key];
    await db.write();
    return null;
  }
  return entry.value;
}

async function set(key: string, value: any, ttlSeconds: number): Promise<void> {
  await db.read();
  db.data = db.data || {};
  db.data[key] = {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  };
  await db.write();
}

async function has(key: string): Promise<boolean> {
  await db.read();
  const entry = db.data?.[key];
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    delete db.data![key];
    await db.write();
    return false;
  }
  return true;
}

export default { get, set, has };
