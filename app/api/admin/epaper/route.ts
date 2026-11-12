import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db, pool } from '@/lib/db';
import { epaperPages, epaperRegions, newsArticles } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    try {
      await pool.query(`ALTER TABLE epaper_editions ADD COLUMN IF NOT EXISTS special_name text`);
      await pool.query(`ALTER TABLE epaper_editions ADD COLUMN IF NOT EXISTS is_special boolean DEFAULT false`);
    } catch {}

    const editionIdParam = request.nextUrl.searchParams.get('edition');

    const edRes = await pool.query(
      `SELECT id, to_char(edition_date, 'YYYY-MM-DD') AS edition_date_str, title, status, is_special, special_name 
       FROM epaper_editions 
       ORDER BY edition_date DESC, id DESC`
    );

    const editions = edRes.rows.map(r => ({
      id: r.id,
      editionDate: String(r.edition_date_str),
      title: r.title,
      status: r.status,
      isSpecial: Boolean(r.is_special),
      specialName: r.special_name || '',
    }));

    let activeEdition = null;
    if (editionIdParam) {
      activeEdition = editions.find(e => e.id === Number(editionIdParam)) || null;
    }
    if (!activeEdition && editions.length > 0) {
      activeEdition = editions[0];
    }

    const articles = await db
      .select({ id: newsArticles.id, titleBn: newsArticles.titleBn })
      .from(newsArticles)
      .where(eq(newsArticles.status, 'published'))
      .orderBy(desc(newsArticles.publishedAt));

    if (!activeEdition) {
      return NextResponse.json({ edition: null, editions, pages: [], articles });
    }

    const pages = await db
      .select()
      .from(epaperPages)
      .where(eq(epaperPages.editionId, activeEdition.id))
      .orderBy(asc(epaperPages.pageNumber));

    const pagesWithRegions = await Promise.all(
      pages.map(async page => {
        try {
          const regions = await db
            .select()
            .from(epaperRegions)
            .where(eq(epaperRegions.pageId, page.id))
            .orderBy(asc(epaperRegions.id));
          return { ...page, regions };
        } catch {
          return { ...page, regions: [] };
        }
      })
    );

    return NextResponse.json({
      edition: activeEdition,
      editions,
      pages: pagesWithRegions,
      articles,
    });
  } catch (error: any) {
    console.error('Admin ePaper GET Error:', error);
    return NextResponse.json({ error: error.message || 'ডাটা লোড ব্যর্থ' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'ইনভ্যালিড রিকোয়েস্ট' }, { status: 400 });
    }

    // ১. পৃষ্ঠা আপলোড
    if (body.pageNumber !== undefined) {
      const editionId = Number(body.editionId);
      const pageNumber = Number(body.pageNumber);
      const width = Number(body.width || 800);
      const height = Number(body.height || 1200);
      const imagePath = String(body.imagePath || '');

      if (!editionId || !pageNumber || !imagePath) {
        return NextResponse.json({ error: 'সঠিক পৃষ্ঠা তথ্য দিন' }, { status: 400 });
      }

      const [existingPage] = await db
        .select()
        .from(epaperPages)
        .where(and(eq(epaperPages.editionId, editionId), eq(epaperPages.pageNumber, pageNumber)))
        .limit(1);

      let page;
      if (existingPage) {
        const [updated] = await db
          .update(epaperPages)
          .set({ imagePath, width, height })
          .where(eq(epaperPages.id, existingPage.id))
          .returning();
        page = updated;
      } else {
        const [inserted] = await db
          .insert(epaperPages)
          .values({ editionId, pageNumber, imagePath, width, height })
          .returning();
        page = inserted;
      }

      return NextResponse.json({ page });
    }

    // ২. নির্দিষ্ট তারিখে নতুন সংস্করণ তৈরি
    const editionDate = String(body.editionDate || '').trim();
    const title = String(body.title || 'দৈনিক কল্যাণ').trim();
    const isSpecial = Boolean(body.isSpecial);
    const specialName = String(body.specialName || '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(editionDate)) {
      return NextResponse.json({ error: 'সঠিক তারিখ (YYYY-MM-DD) দিন' }, { status: 400 });
    }

    try {
      await pool.query(`ALTER TABLE epaper_editions ADD COLUMN IF NOT EXISTS special_name text`);
      await pool.query(`ALTER TABLE epaper_editions ADD COLUMN IF NOT EXISTS is_special boolean DEFAULT false`);
    } catch {}

    const result = await pool.query(
      `INSERT INTO epaper_editions (edition_date, title, status, is_special, special_name)
       VALUES ($1::date, $2, 'draft', $3, $4)
       ON CONFLICT (edition_date) DO UPDATE 
       SET title = $2, is_special = $3, special_name = $4, updated_at = NOW()
       RETURNING id, to_char(edition_date, 'YYYY-MM-DD') AS edition_date_str, title, status, is_special, special_name`,
      [editionDate, title, isSpecial, specialName || null]
    );

    const r = result.rows[0];
    return NextResponse.json({
      edition: {
        id: r.id,
        editionDate: String(r.edition_date_str),
        title: r.title,
        status: r.status,
        isSpecial: Boolean(r.is_special),
        specialName: r.special_name || '',
      },
    });
  } catch (error: any) {
    console.error('Admin ePaper POST Error:', error);
    return NextResponse.json({ error: error.message || 'অপারেশন ব্যর্থ' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const editionId = Number(body?.editionId);

    if (!editionId) {
      return NextResponse.json({ error: 'সংস্করণ আইডি দিন' }, { status: 400 });
    }

    const updateFields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (body.title !== undefined) {
      updateFields.push(`title = $${idx++}`);
      values.push(body.title);
    }
    if (body.status !== undefined) {
      updateFields.push(`status = $${idx++}`);
      values.push(body.status);
    }
    if (body.isSpecial !== undefined) {
      updateFields.push(`is_special = $${idx++}`);
      values.push(Boolean(body.isSpecial));
    }
    if (body.specialName !== undefined) {
      updateFields.push(`special_name = $${idx++}`);
      values.push(body.specialName ? String(body.specialName).trim() : null);
    }
    if (body.editionDate !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(String(body.editionDate))) {
      updateFields.push(`edition_date = $${idx++}::date`);
      values.push(String(body.editionDate));
    }

    if (!updateFields.length) {
      return NextResponse.json({ error: 'আপডেট করার মতো তথ্য নেই' }, { status: 400 });
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(editionId);

    const query = `UPDATE epaper_editions SET ${updateFields.join(', ')} WHERE id = $${idx} RETURNING id, to_char(edition_date, 'YYYY-MM-DD') AS edition_date_str, title, status, is_special, special_name`;
    const result = await pool.query(query, values);

    const r = result.rows[0];
    return NextResponse.json({
      edition: r ? {
        id: r.id,
        editionDate: String(r.edition_date_str),
        title: r.title,
        status: r.status,
        isSpecial: Boolean(r.is_special),
        specialName: r.special_name || '',
      } : null,
    });
  } catch (error: any) {
    console.error('Admin ePaper PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'স্ট্যাটাস আপডেট ব্যর্থ' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = Number(searchParams.get('pageId'));
    const editionId = Number(searchParams.get('editionId'));

    if (pageId) {
      await pool.query(`DELETE FROM epaper_regions WHERE page_id = $1`, [pageId]);
      await pool.query(`DELETE FROM epaper_pages WHERE id = $1`, [pageId]);
      return NextResponse.json({ success: true, message: 'পৃষ্ঠা মুছে ফেলা হয়েছে' });
    }

    if (editionId) {
      await pool.query(`DELETE FROM epaper_regions WHERE page_id IN (SELECT id FROM epaper_pages WHERE edition_id = $1)`, [editionId]);
      await pool.query(`DELETE FROM epaper_pages WHERE edition_id = $1`, [editionId]);
      await pool.query(`DELETE FROM epaper_editions WHERE id = $1`, [editionId]);
      return NextResponse.json({ success: true, message: 'সংস্করণ মুছে ফেলা হয়েছে' });
    }

    return NextResponse.json({ error: 'সঠিক আইডি দিন' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'মুছে ফেলা ব্যর্থ' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const pageId = Number(body?.pageId);
    const regions = Array.isArray(body?.regions) ? body.regions : [];

    if (!pageId || isNaN(pageId)) {
      return NextResponse.json({ error: 'সঠিক পৃষ্ঠা আইডি দিন' }, { status: 400 });
    }

    try {
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS shape_type varchar(30) DEFAULT 'rect'`);
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS points jsonb DEFAULT '[]'::jsonb`);
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS article_id integer`);
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS target_page_number integer`);
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS target_url text`);
    } catch {}

    try {
      await pool.query(`
        DO $$ 
        DECLARE 
          r RECORD;
        BEGIN 
          FOR r IN (
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'epaper_regions'::regclass 
              AND contype = 'c'
          ) LOOP
            EXECUTE 'ALTER TABLE epaper_regions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
          END LOOP; 
        END $$;
      `);
    } catch {}

    const sanitizedRegions = regions.map((r: any) => {
      const artId = r.articleId ? parseInt(String(r.articleId), 10) : null;
      const tgtPage = r.targetPageNumber ? parseInt(String(r.targetPageNumber), 10) : null;
      let tgtUrl = r.targetUrl && typeof r.targetUrl === 'string' && r.targetUrl.trim() !== '' ? r.targetUrl.trim() : null;

      if (tgtUrl && tgtUrl.startsWith('group:')) {
        tgtUrl = 'https://dainikkalyan.com/' + tgtUrl;
      }

      return {
        shapeType: String(r.shapeType || 'rect'),
        points: Array.isArray(r.points) ? r.points : [],
        x: Number(r.x || 0).toFixed(5),
        y: Number(r.y || 0).toFixed(5),
        width: Number(r.width || 0).toFixed(5),
        height: Number(r.height || 0).toFixed(5),
        articleId: isNaN(artId as any) ? null : artId,
        targetPageNumber: isNaN(tgtPage as any) ? null : tgtPage,
        targetUrl: tgtUrl,
      };
    });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM epaper_regions WHERE page_id = $1', [pageId]);

      for (const r of sanitizedRegions) {
        await client.query(
          `INSERT INTO epaper_regions 
            (page_id, shape_type, points, x, y, width, height, article_id, target_page_number, target_url)
           VALUES 
            ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9, $10)`,
          [
            pageId,
            r.shapeType,
            JSON.stringify(r.points),
            r.x,
            r.y,
            r.width,
            r.height,
            r.articleId,
            r.targetPageNumber,
            r.targetUrl,
          ]
        );
      }
      await client.query('COMMIT');
    } catch (txError: any) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

    return NextResponse.json({
      success: true,
      message: 'কাটিং ও লিঙ্কসমূহ সফলভাবে সংরক্ষিত হয়েছে',
      count: sanitizedRegions.length,
    });
  } catch (error: any) {
    const errorMsg = error?.message ? `${error.message}${error.detail ? ' - ' + error.detail : ''}` : 'সংরক্ষণ ব্যর্থ হয়েছে';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}