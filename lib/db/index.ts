import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { pool?: Pool }
export const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

// ডেটাবেসে কোনো ডেটা না হারিয়ে স্বয়ংক্রিয়ভাবে অনুপস্থিত কলামগুলো তৈরি করা
pool.query(`
  ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE epaper_pages ADD COLUMN IF NOT EXISTS special_name TEXT;
  ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS target_url TEXT;
  ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS target_page_number INTEGER;
  ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS shape_type TEXT DEFAULT 'rect';
  ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS points JSONB DEFAULT '[]'::jsonb;
  ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS article_id INTEGER;
  ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS plain_text TEXT;
`).catch(() => {})

export const db = drizzle(pool, { schema })