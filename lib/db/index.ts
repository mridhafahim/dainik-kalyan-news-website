// import { drizzle } from 'drizzle-orm/node-postgres'
// import { Pool } from 'pg'
// import * as schema from './schema'

// const globalForDb = globalThis as unknown as { pool?: Pool }
// export const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL })
// if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool
// export const db = drizzle(pool, { schema })




import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const globalForDb = globalThis as unknown as { pool?: Pool }
export const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool

// নিরাপদভাবে view_count কলাম না থাকলে যুক্ত করা (আগের ডেটা রিসেট হবে না)
pool.query('ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;').catch(() => {})

export const db = drizzle(pool, { schema })