'use client'

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { Calendar, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw, X, FileText, Copy, Check } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const WATERMARK_IMAGE = '/watermark-ka.png';
const LOGO_IMAGE = '/dainik-kalyan-logo.png';

interface Region {
  id: number;
  pageId: number;
  shapeType?: string;
  x: string | number;
  y: string | number;
  width: string | number;
  height: string | number;
  articleId: number | null;
  targetPageNumber: number | null;
  targetUrl: string | null;
  plainText?: string | null;
}

interface PageItem {
  id: number;
  pageNumber: number;
  imagePath: string;
  width: number;
  height: number;
}

interface EditionItem {
  id: number;
  editionDate: string;
  title: string;
  isSpecial?: boolean;
  specialName?: string;
}

interface ArticleItem {
  id: number;
  titleBn: string;
  bodyBn?: string;
  excerptBn?: string;
}

const toBanglaDigits = (val: string | number) =>
  String(val).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)]);

export default function EpaperPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEditionId, setSelectedEditionId] = useState<number>();
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(100);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [activeModalRegion, setActiveModalRegion] = useState<Region | null>(null);

  const [modalTab, setModalTab] = useState<'image' | 'text'>('image');
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  const [flipState, setFlipState] = useState<'idle' | 'next' | 'prev'>('idle');
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());

  const queryParam = selectedEditionId ? `?edition=${selectedEditionId}` : selectedDate ? `?date=${selectedDate}` : '';
  const { data, isLoading } = useSWR(`/api/epaper${queryParam}`, fetcher, { revalidateOnFocus: false });

  const regularEditions: EditionItem[] = data?.regularEditions || [];
  const specialEditions: EditionItem[] = data?.specialEditions || [];
  const archiveDates: string[] = data?.archiveDates || [];
  const articles: ArticleItem[] = data?.articles || [];
  const current = data?.current;
  const pages: PageItem[] = current?.pages || [];
  const allRegions: Region[] = current?.allRegions || [];
  const currentEdition: EditionItem | null = current?.edition || null;

  useEffect(() => {
    if (currentEdition) {
      if (!selectedDate) {
        setSelectedDate(currentEdition.editionDate);
      }
      const [y, m] = currentEdition.editionDate.split('-').map(Number);
      if (y && m) {
        setCalYear(y);
        setCalMonth(m - 1);
      }
    }
  }, [currentEdition, selectedDate]);

  const currentPage = pages[currentPageIndex] || null;
  const currentPageRegions = useMemo(() => {
    if (!currentPage) return [];
    return allRegions.filter(r => r.pageId === currentPage.id);
  }, [allRegions, currentPage]);

  const turnToPage = (newIndex: number) => {
    if (newIndex === currentPageIndex || newIndex < 0 || newIndex >= pages.length) return;
    setFlipState(newIndex > currentPageIndex ? 'next' : 'prev');
    setTimeout(() => {
      setCurrentPageIndex(newIndex);
      setFlipState('idle');
    }, 280);
  };

  const pairedContinuationRegion = useMemo(() => {
    if (!activeModalRegion) return null;
    const url = activeModalRegion.targetUrl || '';
    if (url.includes('group:story_')) {
      const token = url.substring(url.indexOf('group:story_'));
      const found = allRegions.find(r => r.id !== activeModalRegion.id && r.targetUrl && r.targetUrl.includes(token));
      if (found) return found;
    }
    if (activeModalRegion.targetPageNumber) {
      const targetP = pages.find(p => p.pageNumber === activeModalRegion.targetPageNumber);
      if (targetP) {
        const found = allRegions.find(r => r.pageId === targetP.id && (r.targetPageNumber === currentPage?.pageNumber || r.targetPageNumber === 1));
        if (found) return found;
      }
    }
    return null;
  }, [activeModalRegion, allRegions, pages, currentPage]);

  const part1Region = useMemo(() => {
    if (!activeModalRegion) return null;
    if (!pairedContinuationRegion) return activeModalRegion;
    const pageA = pages.find(p => p.id === activeModalRegion.pageId)?.pageNumber || 1;
    const pageB = pages.find(p => p.id === pairedContinuationRegion.pageId)?.pageNumber || 2;
    return pageA <= pageB ? activeModalRegion : pairedContinuationRegion;
  }, [activeModalRegion, pairedContinuationRegion, pages]);

  const part2Region = useMemo(() => {
    if (!pairedContinuationRegion) return null;
    return part1Region?.id === activeModalRegion?.id ? pairedContinuationRegion : activeModalRegion;
  }, [activeModalRegion, pairedContinuationRegion, part1Region]);

  const part1Page = useMemo(() => (part1Region ? pages.find(p => p.id === part1Region.pageId) || null : null), [part1Region, pages]);
  const part2Page = useMemo(() => (part2Region ? pages.find(p => p.id === part2Region.pageId) || null : null), [part2Region, pages]);

  const linkedArticle = useMemo(() => {
    const artId = part1Region?.articleId || part2Region?.articleId;
    if (!artId) return null;
    return articles.find(a => a.id === artId) || null;
  }, [part1Region, part2Region, articles]);

  const combinedPlainText = useMemo(() => {
    const p1Text = part1Region?.plainText?.trim() || '';
    const p2Text = part2Region?.plainText?.trim() || '';
    if (p1Text || p2Text) {
      return [p1Text, p2Text].filter(Boolean).join('\n\n');
    }
    if (linkedArticle) {
      return `${linkedArticle.titleBn}\n\n${linkedArticle.bodyBn || linkedArticle.excerptBn || ''}`;
    }
    return '';
  }, [part1Region, part2Region, linkedArticle]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    const offset = (firstDay + 1) % 7;
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) days.push(d);
    return days;
  }, [calYear, calMonth]);

  const monthNamesBn = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const weekDaysBn = ['শনি', 'রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র'];

  const selectDateFromCalendar = (day: number) => {
    const formattedMonth = String(calMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const fullDate = `${calYear}-${formattedMonth}-${formattedDay}`;
    setSelectedDate(fullDate);
    setSelectedEditionId(undefined);
    setCurrentPageIndex(0);
    setShowCalendar(false);
  };

  const downloadCutoutsAsPdf = async () => {
    if (!part1Region || !part1Page) return;
    setDownloadingPdf(true);
    try {
      const logo = new Image();
      logo.crossOrigin = 'anonymous';
      logo.src = LOGO_IMAGE;
      await new Promise(r => { logo.onload = r; logo.onerror = r; });

      const wm = new Image();
      wm.crossOrigin = 'anonymous';
      wm.src = WATERMARK_IMAGE;
      await new Promise(r => { wm.onload = r; wm.onerror = r; });

      const items = [{ region: part1Region, page: part1Page }];
      if (part2Region && part2Page) items.push({ region: part2Region, page: part2Page });

      const pdfPages: Array<{ jpegBytes: Uint8Array; width: number; height: number }> = [];

      for (const item of items) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = item.page.imagePath;
        await new Promise(r => { img.onload = r; img.onerror = r; });

        const canvas = document.createElement('canvas');
        canvas.width = 1240;
        canvas.height = 1754;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (logo.naturalWidth) {
          const lh = 64;
          const lw = (logo.naturalWidth / logo.naturalHeight) * lh;
          ctx.drawImage(logo, 60, 44, lw, lh);
        }
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${formattedBanglaDate} · পৃষ্ঠা ${toBanglaDigits(item.page.pageNumber)}`, canvas.width - 60, 86);

        ctx.strokeStyle = '#c8102e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(60, 126);
        ctx.lineTo(canvas.width - 60, 126);
        ctx.stroke();

        const sx = Number(item.region.x) * (img.naturalWidth || 1200);
        const sy = Number(item.region.y) * (img.naturalHeight || 1800);
        const sw = Number(item.region.width) * (img.naturalWidth || 1200);
        const sh = Number(item.region.height) * (img.naturalHeight || 1800);

        const maxBoxW = canvas.width - 120;
        const maxBoxH = canvas.height - 230;
        const scale = Math.min(maxBoxW / sw, maxBoxH / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = (canvas.width - dw) / 2;
        const dy = 155;

        ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

        if (wm.naturalWidth) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          const wmW = Math.min(dw * 0.45, 360);
          const wmH = (wm.naturalHeight / wm.naturalWidth) * wmW;
          ctx.drawImage(wm, dx + (dw - wmW) / 2, dy + (dh - wmH) / 2, wmW, wmH);
          ctx.restore();
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const bin = atob(dataUrl.split(',')[1]);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        pdfPages.push({ jpegBytes: bytes, width: 1240, height: 1754 });
      }

      const encoder = new TextEncoder();
      const parts: (Uint8Array | string)[] = [];
      let offset = 0;
      const offsets: number[] = [];
      const pushStr = (s: string) => { const b = encoder.encode(s); parts.push(b); offset += b.length; };

      pushStr('%PDF-1.4\n');
      offsets.push(offset);
      pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

      const kids = pdfPages.map((_, idx) => `${3 + idx * 3} 0 R`).join(' ');
      offsets.push(offset);
      pushStr(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pdfPages.length} >>\nendobj\n`);

      pdfPages.forEach((p, idx) => {
        const pageObj = 3 + idx * 3;
        const imgObj = pageObj + 1;
        const contObj = pageObj + 2;

        offsets.push(offset);
        pushStr(`${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imgObj} 0 R >> >> /Contents ${contObj} 0 R >>\nendobj\n`);

        offsets.push(offset);
        pushStr(`${imgObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.width} /Height ${p.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpegBytes.length} >>\nstream\n`);
        parts.push(p.jpegBytes);
        offset += p.jpegBytes.length;
        pushStr('\nendstream\nendobj\n');

        const streamContent = 'q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n';
        offsets.push(offset);
        pushStr(`${contObj} 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`);
      });

      const xrefPos = offset;
      pushStr(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`);
      for (const off of offsets) pushStr(String(off).padStart(10, '0') + ' 00000 n \n');
      pushStr(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

      const blob = new Blob(parts as unknown as BlobPart[], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dainik-Kalyan-${currentEdition?.editionDate || 'Clip'}-Page-${part1Page.pageNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const downloadPageWithWatermark = async () => {
    if (!currentPage) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentPage.imagePath;
    await new Promise(res => { img.onload = res; img.onerror = res; });
    canvas.width = img.naturalWidth || 1200;
    canvas.height = img.naturalHeight || 1800;
    ctx.drawImage(img, 0, 0);

    const wm = new Image();
    wm.crossOrigin = 'anonymous';
    wm.src = WATERMARK_IMAGE;
    await new Promise(res => { wm.onload = res; wm.onerror = res; });
    if (wm.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      const wmW = canvas.width * 0.42;
      const wmH = (wm.naturalHeight / wm.naturalWidth) * wmW;
      ctx.drawImage(wm, (canvas.width - wmW) / 2, (canvas.height - wmH) / 2, wmW, wmH);
      ctx.restore();
    }

    const link = document.createElement('a');
    link.download = `Dainik-Kalyan-${currentEdition?.editionDate || 'Epaper'}-Page-${currentPage.pageNumber}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  };

  const formattedBanglaDate = currentEdition?.editionDate
    ? new Date(`${currentEdition.editionDate}T00:00:00`).toLocaleDateString('bn-BD', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <SiteChrome>
      <style>{`
        .ep-sheet-stage { perspective: 1800px; position: relative; }
        .ep-sheet-card { transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease; transform-origin: left center; position: relative; }
        .ep-sheet-card.flip-next { transform: rotateY(-16deg) translateX(-8%) scale(0.97); opacity: 0.45; }
        .ep-sheet-card.flip-prev { transform: rotateY(16deg) translateX(8%) scale(0.97); opacity: 0.45; }
        .ep-spine-shadow { position: absolute; top: 0; bottom: 0; left: 0; width: 24px; background: linear-gradient(90deg, rgba(0,0,0,0.14), transparent); pointer-events: none; z-index: 4; }
        .ep-side-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 20; background: #c8102e; color: #fff; border: none; width: 38px; height: 52px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.25); opacity: 0.92; transition: opacity 0.15s, transform 0.15s; }
        .ep-side-arrow:hover { opacity: 1; transform: translateY(-50%) scale(1.06); }
        .ep-side-arrow:disabled { opacity: 0.25; cursor: not-allowed; }
        .ep-modal-bar { display: grid; grid-template-columns: repeat(5, 1fr); border: 1.5px solid #c8102e; border-radius: 6px; overflow: hidden; margin-bottom: 16px; }
        .ep-modal-bar button { padding: 10px 6px; border: none; border-right: 1px solid #fecdd3; font-size: 13px; font-weight: 700; cursor: pointer; background: #fff; color: #c8102e; transition: all 0.15s; text-align: center; }
        .ep-modal-bar button:last-child { border-right: none; }
        .ep-modal-bar button.active { background: #c8102e; color: #fff; }
        @media (max-width: 640px) {
          .ep-side-arrow { width: 30px; height: 42px; }
          .ep-modal-bar { grid-template-columns: repeat(3, 1fr); }
          .ep-modal-bar button { border-bottom: 1px solid #fecdd3; font-size: 12px; padding: 8px 4px; }
        }
      `}</style>

      <main style={{ maxWidth: '1320px', width: '96%', margin: '0 auto', padding: '14px 0 50px' }}>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: '#fff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', flex: 1 }}>
            <select
              value={!currentEdition?.isSpecial ? (currentEdition?.id || '') : ''}
              onChange={e => {
                const id = Number(e.target.value);
                if (id) { setSelectedEditionId(id); setCurrentPageIndex(0); }
              }}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#eff6ff', color: '#1e3a8a', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="">সংস্করণ ({regularEditions.length})</option>
              {regularEditions.map(ed => (
                <option key={ed.id} value={ed.id}>{ed.editionDate} · {ed.title}</option>
              ))}
            </select>

            <select
              value={currentEdition?.isSpecial ? (currentEdition?.id || '') : ''}
              onChange={e => {
                const id = Number(e.target.value);
                if (id) { setSelectedEditionId(id); setCurrentPageIndex(0); }
              }}
              style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff1f2', color: '#9f1239', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
            >
              <option value="">📖 ম্যাগাজিন ({specialEditions.length})</option>
              {specialEditions.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.specialName || sp.title} ({sp.editionDate})</option>
              ))}
            </select>

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowCalendar(!showCalendar)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                <Calendar size={15} color="#c8102e" />
                <span>{currentEdition?.editionDate ? toBanglaDigits(currentEdition.editionDate.split('-').reverse().join('-')) : 'তারিখ'}</span>
              </button>

              {showCalendar && (
                <div style={{ position: 'absolute', top: '115%', left: 0, zIndex: 1000, width: '295px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 12px 28px rgba(0,0,0,0.18)', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <button type="button" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else { setCalMonth(m => m - 1); } }} style={{ border: 'none', background: '#f3f4f6', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>{monthNamesBn[calMonth]} {toBanglaDigits(calYear)}</span>
                    <button type="button" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else { setCalMonth(m => m + 1); } }} style={{ border: 'none', background: '#f3f4f6', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#6b7280', marginBottom: '6px' }}>
                    {weekDaysBn.map((day, i) => (
                      <span key={i} style={{ color: i === 6 ? '#c8102e' : '#6b7280' }}>{day}</span>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                    {calendarDays.map((d, idx) => {
                      if (d === null) return <div key={idx} />;
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const hasEdition = archiveDates.includes(dateStr);
                      const isSelected = selectedDate === dateStr;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!hasEdition}
                          onClick={() => selectDateFromCalendar(d)}
                          style={{
                            height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px',
                            border: isSelected ? '1.5px solid #c8102e' : 'none',
                            background: isSelected ? '#c8102e' : hasEdition ? '#fee2e2' : 'transparent',
                            color: isSelected ? '#fff' : hasEdition ? '#991b1b' : '#d1d5db',
                            fontWeight: hasEdition ? 700 : 400, fontSize: '13px', cursor: hasEdition ? 'pointer' : 'default',
                          }}
                        >
                          {toBanglaDigits(d)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" onClick={() => setZoom(z => Math.max(z - 15, 70))} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="জুম আউট"><ZoomOut size={15} /></button>
            <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '36px', textAlign: 'center' }}>{toBanglaDigits(zoom)}%</span>
            <button type="button" onClick={() => setZoom(z => Math.min(z + 15, 175))} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="জুম ইন"><ZoomIn size={15} /></button>
            <button type="button" onClick={() => setZoom(100)} style={{ padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="রিসেট"><RotateCcw size={14} /></button>
            <button type="button" onClick={downloadPageWithWatermark} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#16a34a', color: '#fff', border: 'none', padding: '7px 12px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
              <Download size={15} /> ডাউনলোড
            </button>
          </div>
        </div>

        {pages.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', background: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <button type="button" onClick={() => turnToPage(currentPageIndex - 1)} disabled={currentPageIndex === 0} style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#c8102e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: currentPageIndex === 0 ? 0.35 : 1 }}>
              <ChevronLeft size={16} />
            </button>
            {pages.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => turnToPage(idx)}
                style={{
                  flexShrink: 0, minWidth: '34px', height: '32px', padding: '0 10px', borderRadius: '6px',
                  border: idx === currentPageIndex ? '1.5px solid #c8102e' : '1px solid #e2e8f0',
                  background: idx === currentPageIndex ? '#c8102e' : '#f8fafc',
                  color: idx === currentPageIndex ? '#fff' : '#0f172a',
                  fontWeight: 700, fontSize: '14px', cursor: 'pointer',
                }}
              >
                {toBanglaDigits(p.pageNumber)}
              </button>
            ))}
            <button type="button" onClick={() => turnToPage(currentPageIndex + 1)} disabled={currentPageIndex === pages.length - 1} style={{ flexShrink: 0, width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#c8102e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: currentPageIndex === pages.length - 1 ? 0.35 : 1 }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b', fontSize: '16px', background: '#fff', borderRadius: '12px' }}>
            দৈনিক কল্যাণ ই-পেপার লোড হচ্ছে...
          </div>
        ) : !currentPage ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <FileText size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#334155' }}>
              {selectedDate ? `${toBanglaDigits(selectedDate)} তারিখে কোনো ই-পেপার পাওয়া যায়নি` : 'কোনো ই-পেপার পাওয়া যায়নি'}
            </h2>
            <p style={{ color: '#64748b', marginTop: '6px' }}>উপরের ক্যালেন্ডার থেকে অন্য একটি তারিখ নির্বাচন করুন।</p>
          </div>
        ) : (
          <div className="ep-sheet-stage" style={{ display: 'flex', justifyContent: 'center', overflow: 'hidden', padding: '4px 0' }}>
            <button type="button" className="ep-side-arrow" style={{ left: '6px', borderRadius: '0 8px 8px 0' }} disabled={currentPageIndex === 0} onClick={() => turnToPage(currentPageIndex - 1)} title="আগের পাতা">
              <ChevronLeft size={22} />
            </button>

            <div className={`ep-sheet-card ${flipState === 'next' ? 'flip-next' : flipState === 'prev' ? 'flip-prev' : ''}`} style={{ width: `${zoom}%`, maxWidth: '100%', background: '#fff', boxShadow: '0 10px 32px rgba(0,0,0,0.14)', borderRadius: '4px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
              <div className="ep-spine-shadow" />
              <img src={currentPage.imagePath} alt={`পৃষ্ঠা ${currentPage.pageNumber}`} style={{ width: '100%', height: 'auto', display: 'block' }} />

              {currentPageRegions.map(region => (
                <div
                  key={region.id}
                  onClick={() => {
                    setActiveModalRegion(region);
                    setModalTab('image');
                    setShowShareMenu(false);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${Number(region.x) * 100}%`,
                    top: `${Number(region.y) * 100}%`,
                    width: `${Number(region.width) * 100}%`,
                    height: `${Number(region.height) * 100}%`,
                    cursor: 'pointer',
                    border: '1px dashed rgba(200, 16, 46, 0.35)',
                    backgroundColor: 'rgba(200, 16, 46, 0.02)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(200, 16, 46, 0.14)';
                    e.currentTarget.style.border = '2px solid #c8102e';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(200, 16, 46, 0.02)';
                    e.currentTarget.style.border = '1px dashed rgba(200, 16, 46, 0.35)';
                  }}
                  title="খবরটি পড়তে ক্লিক করুন"
                />
              ))}
            </div>

            <button type="button" className="ep-side-arrow" style={{ right: '6px', borderRadius: '8px 0 0 8px' }} disabled={currentPageIndex === pages.length - 1} onClick={() => turnToPage(currentPageIndex + 1)} title="পরের পাতা">
              <ChevronRight size={22} />
            </button>
          </div>
        )}

        {pages.length > 0 && (
          <section style={{ marginTop: '24px', background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ background: '#c8102e', color: '#fff', textAlign: 'center', padding: '10px', fontSize: '18px', fontWeight: 800 }}>
              সকল পাতা
            </div>
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '14px', background: '#f8fafc' }}>
              {pages.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { turnToPage(idx); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{
                    flex: '0 0 auto', position: 'relative', padding: '3px', borderRadius: '6px',
                    border: idx === currentPageIndex ? '2.5px solid #c8102e' : '1px solid #cbd5e1',
                    background: '#fff', cursor: 'pointer',
                  }}
                >
                  <span style={{ position: 'absolute', top: '6px', left: '6px', background: idx === currentPageIndex ? '#c8102e' : '#0f172a', color: '#fff', fontSize: '13px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px', zIndex: 2 }}>
                    {toBanglaDigits(p.pageNumber)}
                  </span>
                  <img src={p.imagePath} alt={`পৃষ্ঠা ${p.pageNumber}`} style={{ width: '110px', height: '150px', objectFit: 'cover', borderRadius: '4px', display: 'block' }} />
                </button>
              ))}
            </div>
          </section>
        )}

        {activeModalRegion && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.82)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }} onClick={() => setActiveModalRegion(null)}>
            <div style={{ background: '#fff', borderRadius: '12px', maxWidth: part2Region ? '1060px' : '740px', width: '100%', maxHeight: '94vh', overflowY: 'auto', padding: '18px', position: 'relative', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.35)' }} onClick={e => e.stopPropagation()}>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button type="button" onClick={() => setActiveModalRegion(null)} style={{ background: '#fee2e2', color: '#c8102e', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  <X size={16} /> বন্ধ করুন
                </button>
              </div>

              <div className="ep-modal-bar">
                <button type="button" className={modalTab === 'image' ? 'active' : ''} onClick={() => { setModalTab('image'); setShowShareMenu(false); }}>
                  ইমেজ ভিউ
                </button>
                <button type="button" className={modalTab === 'text' ? 'active' : ''} onClick={() => { setModalTab('text'); setShowShareMenu(false); }}>
                  টেক্সট ভিউ
                </button>
                <button type="button" onClick={() => setActiveModalRegion(null)}>
                  ফুল পেজ ভিউ
                </button>
                <button type="button" onClick={() => setShowShareMenu(s => !s)}>
                  শেয়ার
                </button>
                <button type="button" onClick={downloadCutoutsAsPdf} disabled={downloadingPdf}>
                  {downloadingPdf ? 'তৈরি হচ্ছে...' : 'ডাউনলোড (PDF)'}
                </button>
              </div>

              {showShareMenu && (
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #cbd5e1', padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {copiedLink ? <Check size={14} color="#16a34a" /> : <Copy size={14} />} {copiedLink ? 'কপি হয়েছে!' : 'লিংক কপি'}
                  </button>
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: '#1877f2', color: '#fff', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    Facebook শেয়ার
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent('দৈনিক কল্যাণ ই-পেপার: ' + shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: '#25d366', color: '#fff', padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    WhatsApp শেয়ার
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #c8102e', paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <img src={LOGO_IMAGE} alt="দৈনিক কল্যাণ" style={{ height: '36px', width: 'auto', objectFit: 'contain' }} />
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', borderLeft: '3px solid #c8102e', paddingLeft: '8px' }}>
                  {formattedBanglaDate} · পৃষ্ঠা {toBanglaDigits(part1Page?.pageNumber || 1)}
                  {part2Region && part2Page ? ` ও ${toBanglaDigits(part2Page.pageNumber)}` : ''}
                </div>
              </div>

              {modalTab === 'image' && (
                <div style={{ display: 'grid', gridTemplateColumns: part2Region ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '16px' }}>
                  {part1Region && part1Page && (
                    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: `${Number(part1Region.width)} / ${Number(part1Region.height)}`, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fafafa' }}>
                      <img
                        src={part1Page.imagePath}
                        alt="News Cutout Part 1"
                        style={{
                          position: 'absolute',
                          left: `-${(Number(part1Region.x) / Number(part1Region.width)) * 100}%`,
                          top: `-${(Number(part1Region.y) / Number(part1Region.height)) * 100}%`,
                          width: `${(1 / Number(part1Region.width)) * 100}%`,
                          height: `${(1 / Number(part1Region.height)) * 100}%`,
                          maxWidth: 'none', display: 'block',
                        }}
                      />
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                        <img src={WATERMARK_IMAGE} alt="ক" style={{ width: '36%', opacity: 0.25 }} />
                      </div>
                    </div>
                  )}

                  {part2Region && part2Page && (
                    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: `${Number(part2Region.width)} / ${Number(part2Region.height)}`, borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fafafa' }}>
                      <img
                        src={part2Page.imagePath}
                        alt="News Cutout Part 2"
                        style={{
                          position: 'absolute',
                          left: `-${(Number(part2Region.x) / Number(part2Region.width)) * 100}%`,
                          top: `-${(Number(part2Region.y) / Number(part2Region.height)) * 100}%`,
                          width: `${(1 / Number(part2Region.width)) * 100}%`,
                          height: `${(1 / Number(part2Region.height)) * 100}%`,
                          maxWidth: 'none', display: 'block',
                        }}
                      />
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                        <img src={WATERMARK_IMAGE} alt="ক" style={{ width: '36%', opacity: 0.25 }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modalTab === 'text' && (
                <div style={{ position: 'relative', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '28px 22px', minHeight: '320px', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <img src={WATERMARK_IMAGE} alt="ক" style={{ width: '240px', maxWidth: '55%', opacity: 0.14 }} />
                  </div>

                  <div style={{ position: 'relative', zIndex: 2, fontSize: '17px', lineHeight: 1.9, color: '#0f172a', whiteSpace: 'pre-wrap' }}>
                    {combinedPlainText ? (
                      combinedPlainText
                    ) : (
                      <p style={{ color: '#64748b', textAlign: 'center', margin: '40px 0' }}>
                        এই সংবাদটির জন্য এখনো কোনো প্লেইন টেক্সট যুক্ত করা হয়নি।
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                দৈনিক কল্যাণ · বস্তুনিষ্ঠতায় আমাদের অহংকার · যশোর
              </div>
            </div>
          </div>
        )}
      </main>
    </SiteChrome>
  );
}