import { NextRequest, NextResponse } from 'next/server';
import { asc, desc, eq, inArray } from 'drizzle-orm';
import { db, pool } from '@/lib/db';
import { epaperEditions, epaperPages, epaperRegions, newsArticles } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const isAdmin = request.nextUrl.searchParams.get('admin') === '1';
    if (isAdmin) {
      const auth = await requireAdmin(request, undefined, 'epaper:read');
      if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestedId = Number(request.nextUrl.searchParams.get('edition') || 0);
    const requestedDate = request.nextUrl.searchParams.get('date');
    const isSpecialFilter = request.nextUrl.searchParams.get('special');

    // কলাম চেক
    try {
      await pool.query(`ALTER TABLE epaper_editions ADD COLUMN IF NOT EXISTS special_name text`);
      await pool.query(`ALTER TABLE epaper_editions ADD COLUMN IF NOT EXISTS is_special boolean DEFAULT false`);
    } catch {}

    const query = isAdmin
      ? `SELECT * FROM epaper_editions ORDER BY edition_date DESC, id DESC`
      : `SELECT * FROM epaper_editions WHERE status = 'published' ORDER BY edition_date DESC, id DESC`;

    const result = await pool.query(query);
    const rawEditions = result.rows.map(r => ({
      id: r.id,
      editionDate: r.edition_date instanceof Date ? r.edition_date.toISOString().slice(0, 10) : String(r.edition_date),
      title: r.title,
      status: r.status,
      isSpecial: Boolean(r.is_special),
      specialName: r.special_name || '',
    }));

    const regularEditions = rawEditions.filter(e => !e.isSpecial);
    const specialEditions = rawEditions.filter(e => e.isSpecial);

    let activeList = rawEditions;
    if (isSpecialFilter === '1') {
      activeList = specialEditions;
    } else if (isSpecialFilter === '0') {
      activeList = regularEditions;
    }

    let edition = null;
    if (requestedId) {
      edition = rawEditions.find(item => item.id === requestedId) || null;
    } else if (requestedDate) {
      edition = activeList.find(item => item.editionDate === requestedDate) || rawEditions.find(item => item.editionDate === requestedDate) || null;
    }

    if (!edition && activeList.length > 0) {
      edition = activeList[0];
    } else if (!edition && rawEditions.length > 0) {
      edition = rawEditions[0];
    }

    const archiveDates = Array.from(new Set(rawEditions.map(e => e.editionDate)));

    if (!edition) {
      return NextResponse.json({ editions: rawEditions, regularEditions, specialEditions, archiveDates, current: null }, {
        headers: { 'Cache-Control': 'no-store' }
      });
    }

    const pages = await db
      .select()
      .from(epaperPages)
      .where(eq(epaperPages.editionId, edition.id))
      .orderBy(asc(epaperPages.pageNumber));

    const allRegions = pages.length
      ? await db
          .select()
          .from(epaperRegions)
          .where(inArray(epaperRegions.pageId, pages.map(p => p.id)))
          .orderBy(asc(epaperRegions.id))
      : [];

    const regions = pages.length ? allRegions.filter(r => r.pageId === pages[0].id) : [];

    const articles = isAdmin
      ? await db
          .select({ id: newsArticles.id, titleBn: newsArticles.titleBn })
          .from(newsArticles)
          .where(eq(newsArticles.status, 'published'))
          .orderBy(desc(newsArticles.publishedAt))
      : [];

    return NextResponse.json({
      editions: rawEditions,
      regularEditions,
      specialEditions,
      archiveDates,
      current: { edition, pages, regions, allRegions },
      articles
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    console.error('ePaper GET error:', error);
    return NextResponse.json({ error: error.message || 'ই-পেপার লোড ব্যর্থ' }, { status: 500 });
  }
}