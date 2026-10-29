import { and, desc, eq, ilike, isNotNull, lte, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { breakingTickers, newsArticles, newsCategories, newsVideos } from '@/lib/db/schema'

const published = and(eq(newsArticles.status, 'published'), lte(newsArticles.publishedAt, new Date()))
export async function getPublishedStories() { return db.select().from(newsArticles).where(published).orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt)) }
export async function getStory(id: number) { const rows = await db.select().from(newsArticles).where(and(eq(newsArticles.id, id), published)).limit(1); return rows[0] ?? null }
export async function getStoryBySlug(slug: string) { const rows = await db.select().from(newsArticles).where(and(eq(newsArticles.slug, slug), published)).limit(1); return rows[0] ?? null }
export async function searchStories(query: string) { const term = `%${query.trim().slice(0, 100)}%`; return db.select().from(newsArticles).where(and(published, or(ilike(newsArticles.titleBn, term), ilike(newsArticles.titleEn, term), ilike(newsArticles.excerptBn, term), ilike(newsArticles.bodyBn, term)))).orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt)).limit(50) }
export async function getCategories() { return db.select().from(newsCategories).orderBy(newsCategories.sortOrder, newsCategories.nameBn) }
export async function getCategoryBySlug(slug: string) { const rows = await db.select().from(newsCategories).where(eq(newsCategories.slug, slug)).limit(1); return rows[0] ?? null }
export async function getPublishedStoriesByCategory(categoryId: number) { return db.select().from(newsArticles).where(and(eq(newsArticles.categoryId, categoryId), published)).orderBy(desc(newsArticles.publishedAt), desc(newsArticles.createdAt)) }
export async function getActiveTickers() { return db.select().from(breakingTickers).where(eq(breakingTickers.isActive, true)).orderBy(breakingTickers.sortOrder, desc(breakingTickers.createdAt)) }
export async function getPublishedVideos() { return db.select().from(newsVideos).where(eq(newsVideos.status, 'published')).orderBy(desc(newsVideos.createdAt)) }
export async function getAdminStories() { return db.select().from(newsArticles).orderBy(desc(newsArticles.updatedAt), desc(newsArticles.createdAt)) }
