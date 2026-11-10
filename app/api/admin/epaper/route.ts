import { NextRequest, NextResponse } from 'next/server';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db, pool } from '@/lib/db';
import { epaperEditions, epaperPages, epaperRegions } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'অননুমোদিত অ্যাক্সেস' }, { status: 401 });
    }

    const editionIdParam = request.nextUrl.searchParams.get('edition');

    const editions = await db
      .select()
      .from(epaperEditions)
      .orderBy(desc(epaperEditions.editionDate), desc(epaperEditions.id));

    let activeEdition = null;
    if (editionIdParam) {
      const found = editions.find(e => e.id === Number(editionIdParam));
      if (found) activeEdition = found;
    }
    if (!activeEdition && editions.length > 0) {
      activeEdition = editions[0];
    }

    if (!activeEdition) {
      return NextResponse.json({ edition: null, pages: [] });
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
      pages: pagesWithRegions,
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

    // ১. পৃষ্ঠা আপলোড বা পেজ তথ্য সংরক্ষণ
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

    // ২. নতুন সংস্করণ তৈরি
    const editionDate = String(body.editionDate || '').trim();
    const title = String(body.title || 'দৈনিক কল্যাণ').trim();

    if (!editionDate) {
      return NextResponse.json({ error: 'সঠিক তারিখ দিন' }, { status: 400 });
    }

    const [existingEdition] = await db
      .select()
      .from(epaperEditions)
      .where(eq(epaperEditions.editionDate, editionDate))
      .limit(1);

    let edition;
    if (existingEdition) {
      const [updated] = await db
        .update(epaperEditions)
        .set({ title, updatedAt: new Date() })
        .where(eq(epaperEditions.id, existingEdition.id))
        .returning();
      edition = updated;
    } else {
      const [inserted] = await db
        .insert(epaperEditions)
        .values({ editionDate, title, status: 'draft' })
        .returning();
      edition = inserted;
    }

    return NextResponse.json({ edition });
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
    const status = String(body?.status || 'draft');

    if (!editionId) {
      return NextResponse.json({ error: 'সংস্করণ আইডি দিন' }, { status: 400 });
    }

    const [edition] = await db
      .update(epaperEditions)
      .set({ status, updatedAt: new Date() })
      .where(eq(epaperEditions.id, editionId))
      .returning();

    return NextResponse.json({ edition });
  } catch (error: any) {
    console.error('Admin ePaper PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'স্ট্যাটাস আপডেট ব্যর্থ' }, { status: 500 });
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

    // ১. নিশ্চিত করা যে প্রয়োজনীয় কলামগুলো রয়েছে
    try {
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS shape_type varchar(30) DEFAULT 'rect'`);
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS points jsonb DEFAULT '[]'::jsonb`);
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS article_id integer`);
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS target_page_number integer`);
      await pool.query(`ALTER TABLE epaper_regions ADD COLUMN IF NOT EXISTS target_url text`);
    } catch (migErr) {
      console.warn('Migration auto-check note:', migErr);
    }

    // ২. ডেটাবেজে থাকা পুরোনো সকল CHECK CONSTRAINT ড্রপ করা (ExecConstraints এরর দূর করার জন্য)
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
    } catch (dropErr) {
      console.warn('Constraint drop note:', dropErr);
    }

    // ৩. ফিল্ড স্যানিটাইজেশন
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

    // ৪. নেটিভ ট্রানজ্যাকশন ব্যবহার করে ডিলিট ও ইনসার্ট
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
    console.error('Admin ePaper Save Error Details:', error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}