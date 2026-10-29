import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { epaperEditions, epaperPages, epaperRegions, newsArticles } from '@/lib/db/schema'

export async function getPublishedEditions() { return db.select().from(epaperEditions).where(eq(epaperEditions.status, 'published')).orderBy(desc(epaperEditions.editionDate)) }
export async function getPublishedEdition(id?: number) { const editions = await getPublishedEditions(); const edition = id ? editions.find((item) => item.id === id) : editions[0]; if (!edition) return null; const pages = await db.select().from(epaperPages).where(eq(epaperPages.editionId, edition.id)).orderBy(asc(epaperPages.pageNumber)); const regions = pages.length ? await db.select().from(epaperRegions).where(eq(epaperRegions.pageId, pages[0].id)) : []; return { edition, pages, regions } }
export async function getAdminEditions() { return db.select().from(epaperEditions).orderBy(desc(epaperEditions.editionDate)) }
export async function getPublishedArticles() { return db.select({ id: newsArticles.id, titleBn: newsArticles.titleBn }).from(newsArticles).where(eq(newsArticles.status, 'published')).orderBy(desc(newsArticles.publishedAt)) }
