'use client'

import { useState, useMemo, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { Download, ZoomIn, ZoomOut, RotateCcw, X, ExternalLink, Calendar, ChevronRight, FileText } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// জলছাপের লোগো ইউআরএল (Vercel CDN + লোকাল ফলব্যাক)
const WATERMARK_IMAGE = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logofinal-1-kG9UPUnYBasa1wBddy2PBm9W7GmXAu.png';

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
}

export default function EpaperPage() {
  const [editionId, setEditionId] = useState<number>();
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(100);
  const [activeModalRegion, setActiveModalRegion] = useState<Region | null>(null);

  const { data, isLoading } = useSWR(`/api/epaper${editionId ? `?edition=${editionId}` : ''}`, fetcher, {
    revalidateOnFocus: false,
  });

  const editions: EditionItem[] = data?.editions || [];
  const current = data?.current;
  const pages: PageItem[] = current?.pages || [];
  const allRegions: Region[] = current?.allRegions || [];

  const selectedEdition = useMemo(() => {
    if (editionId) return editions.find(e => e.id === editionId);
    return editions[0] || null;
  }, [editionId, editions]);

  const currentPage = pages[currentPageIndex] || null;
  const currentPageRegions = useMemo(() => {
    if (!currentPage) return [];
    return allRegions.filter(r => r.pageId === currentPage.id);
  }, [allRegions, currentPage]);

  // কন্টিনিউয়েশন সংবাদ পেয়ারিং (যদি সংবাদটির বাকি অংশ অন্য পৃষ্ঠায় থাকে)
  const pairedContinuationRegion = useMemo(() => {
    if (!activeModalRegion) return null;
    const url = activeModalRegion.targetUrl || '';
    if (url.includes('group:story_')) {
      const storyToken = url.substring(url.indexOf('group:story_'));
      return allRegions.find(r => r.id !== activeModalRegion.id && r.targetUrl && r.targetUrl.includes(storyToken)) || null;
    }
    return null;
  }, [activeModalRegion, allRegions]);

  const continuationPage = useMemo(() => {
    if (!pairedContinuationRegion) return null;
    return pages.find(p => p.id === pairedContinuationRegion.pageId) || null;
  }, [pairedContinuationRegion, pages]);

  // ক্লায়েন্ট-সাইড জেপিজি ডাউনলোড (পুরো পেজ + জলছাপ)
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

    // পেজের মাঝখানে জলছাপ আঁকা
    const wm = new Image();
    wm.crossOrigin = 'anonymous';
    wm.src = WATERMARK_IMAGE;
    await new Promise(res => { wm.onload = res; wm.onerror = res; });

    ctx.save();
    ctx.globalAlpha = 0.22;
    const wmW = canvas.width * 0.45;
    const wmH = (wm.naturalHeight / (wm.naturalWidth || 1)) * wmW || wmW;
    ctx.drawImage(wm, (canvas.width - wmW) / 2, (canvas.height - wmH) / 2, wmW, wmH);
    ctx.restore();

    const link = document.createElement('a');
    link.download = `Dainik-Kalyan-${selectedEdition?.editionDate || 'Epaper'}-Page-${currentPage.pageNumber}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  };

  // নির্দিষ্ট কাটিং ডাউনলোড
  const downloadCutout = (region: Region, pageImg: string, partName: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = pageImg;

    img.onload = async () => {
      const sx = Number(region.x) * img.naturalWidth;
      const sy = Number(region.y) * img.naturalHeight;
      const sw = Number(region.width) * img.naturalWidth;
      const sh = Number(region.height) * img.naturalHeight;

      canvas.width = sw;
      canvas.height = sh;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      // জলছাপ যোগ
      const wm = new Image();
      wm.crossOrigin = 'anonymous';
      wm.src = WATERMARK_IMAGE;
      await new Promise(res => { wm.onload = res; wm.onerror = res; });

      ctx.save();
      ctx.globalAlpha = 0.26;
      const wmW = sw * 0.5;
      const wmH = (wm.naturalHeight / (wm.naturalWidth || 1)) * wmW || wmW;
      ctx.drawImage(wm, (sw - wmW) / 2, (sh - wmH) / 2, wmW, wmH);
      ctx.restore();

      const link = document.createElement('a');
      link.download = `Dainik-Kalyan-${partName}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    };
  };

  return (
    <SiteChrome>
      <main className="container main" style={{ maxWidth: '1380px', margin: '0 auto', padding: '16px' }}>
        {/* টুলবার */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '20px', gap: '14px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={18} color="#c8102e" />
            <select
              value={selectedEdition?.id || ''}
              onChange={e => {
                setEditionId(Number(e.target.value));
                setCurrentPageIndex(0);
              }}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '15px', fontWeight: 600, color: '#111827', background: '#f9fafb' }}
            >
              {editions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.editionDate} · {item.title}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setZoom(z => Math.max(z - 15, 60))} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="জুম আউট"><ZoomOut size={16} /></button>
            <span style={{ fontSize: '14px', fontWeight: 600, width: '46px', textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 15, 180))} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="জুম ইন"><ZoomIn size={16} /></button>
            <button onClick={() => setZoom(100)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="রিসেট"><RotateCcw size={16} /></button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={downloadPageWithWatermark} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#c8102e', color: '#fff', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>
              <Download size={16} /> পৃষ্ঠা ডাউনলোড (JPG)
            </button>
          </div>
        </div>

        {/* রিডার এরিয়া */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#6b7280', fontSize: '16px' }}>
            দৈনিক কল্যাণ ই-পেপার লোড হচ্ছে...
          </div>
        ) : !currentPage ? (
          <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <FileText size={48} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#374151' }}>কোনো প্রকাশিত ই-পেপার পাওয়া যায়নি</h2>
            <p style={{ color: '#6b7280', marginTop: '6px' }}>অনুগ্রহ করে পরে আবার চেষ্টা করুন।</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            {/* মূল ব্রডশিট পেজ ক্যানভাস */}
            <div style={{ width: `${zoom}%`, maxWidth: '100%', transition: 'width 0.2s ease', position: 'relative', background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', borderRadius: '4px', overflow: 'hidden' }}>
              <img
                src={currentPage.imagePath}
                alt={`পৃষ্ঠা ${currentPage.pageNumber}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />

              {/* ক্লিকযোগ্য হটস্পট বা রিজিয়নসমূহ */}
              {currentPageRegions.map(region => (
                <div
                  key={region.id}
                  onClick={() => setActiveModalRegion(region)}
                  style={{
                    position: 'absolute',
                    left: `${Number(region.x) * 100}%`,
                    top: `${Number(region.y) * 100}%`,
                    width: `${Number(region.width) * 100}%`,
                    height: `${Number(region.height) * 100}%`,
                    cursor: 'pointer',
                    border: '1.5px dashed rgba(200, 16, 46, 0.45)',
                    backgroundColor: 'rgba(200, 16, 46, 0.04)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(200, 16, 46, 0.15)';
                    e.currentTarget.style.borderColor = '#c8102e';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(200, 16, 46, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(200, 16, 46, 0.45)';
                  }}
                  title="সংবাদটি বড় করে পড়তে ক্লিক করুন"
                />
              ))}
            </div>

            {/* থাম্বনেইল তালিকা */}
            <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '14px', width: '100%', justifyContent: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              {pages.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentPageIndex(idx)}
                  style={{
                    border: idx === currentPageIndex ? '2.5px solid #c8102e' : '1px solid #d1d5db',
                    padding: '3px',
                    borderRadius: '8px',
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <img src={p.imagePath} alt={`Page ${p.pageNumber}`} style={{ width: '56px', height: '76px', objectFit: 'cover', borderRadius: '4px' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: idx === currentPageIndex ? '#c8102e' : '#4b5563' }}>পৃষ্ঠা {p.pageNumber}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* কাটিং মোডাল (জলছাপ ও পাশাপাশি ২ পাতার সংবাদ প্রদর্শন) */}
        {activeModalRegion && currentPage && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setActiveModalRegion(null)}>
            <div style={{ background: '#fff', borderRadius: '16px', maxWidth: pairedContinuationRegion ? '1100px' : '650px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '24px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
              
              {/* মোডাল হেডার */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '14px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={WATERMARK_IMAGE} alt="ক" style={{ height: '32px', width: 'auto' }} />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>দৈনিক কল্যাণ কাটিং ভিউ</h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                      {selectedEdition?.editionDate} · পৃষ্ঠা {currentPage.pageNumber}
                      {pairedContinuationRegion && continuationPage ? ` ও পৃষ্ঠা ${continuationPage.pageNumber}` : ''}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeModalRegion.articleId && (
                    <Link
                      href={`/news/${activeModalRegion.articleId}`}
                      target="_blank"
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: '#f3f4f6', color: '#1f2937', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} /> অনলাইন খবর
                    </Link>
                  )}
                  <button onClick={() => setActiveModalRegion(null)} style={{ background: '#f3f4f6', border: 'none', padding: '7px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
                </div>
              </div>

              {/* কাটিং কন্টেইনার (একক অথবা পাশাপাশি ডাবল) */}
              <div style={{ display: 'grid', gridTemplateColumns: pairedContinuationRegion ? '1fr 1fr' : '1fr', gap: '20px' }}>
                
                {/* অংশ ১: বর্তমান পাতার কাটিং */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#c8102e', display: 'flex', justifyContent: 'space-between' }}>
                    <span>পৃষ্ঠা {currentPage.pageNumber}-এর অংশ</span>
                    <button onClick={() => downloadCutout(activeModalRegion, currentPage.imagePath, `Page-${currentPage.pageNumber}-Clip`)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>📥 কাটিং সেভ</button>
                  </div>

                  <div style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: `${Number(activeModalRegion.width)} / ${Number(activeModalRegion.height)}`, borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fafafa' }}>
                    <img
                      src={currentPage.imagePath}
                      alt="News Cutout"
                      style={{
                        position: 'absolute',
                        left: `-${(Number(activeModalRegion.x) / Number(activeModalRegion.width)) * 100}%`,
                        top: `-${(Number(activeModalRegion.y) / Number(activeModalRegion.height)) * 100}%`,
                        width: `${(1 / Number(activeModalRegion.width)) * 100}%`,
                        height: `${(1 / Number(activeModalRegion.height)) * 100}%`,
                        maxWidth: 'none',
                        display: 'block',
                      }}
                    />

                    {/* স্পষ্ট 'ক' জলছাপ ওভারলে */}
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                      <img
                        src={WATERMARK_IMAGE}
                        alt="দৈনিক কল্যাণ জলছাপ"
                        style={{ width: '40%', opacity: 0.28, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.25))' }}
                      />
                    </div>
                  </div>
                </div>

                {/* অংশ ২: যদি ভিতরের পাতায় বাকি অংশ থাকে */}
                {pairedContinuationRegion && continuationPage && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#c8102e', display: 'flex', justifyContent: 'space-between' }}>
                      <span>পরের অংশ (পৃষ্ঠা {continuationPage.pageNumber})</span>
                      <button onClick={() => downloadCutout(pairedContinuationRegion, continuationPage.imagePath, `Page-${continuationPage.pageNumber}-Continuation`)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>📥 কাটিং সেভ</button>
                    </div>

                    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: `${Number(pairedContinuationRegion.width)} / ${Number(pairedContinuationRegion.height)}`, borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fafafa' }}>
                      <img
                        src={continuationPage.imagePath}
                        alt="Continuation Cutout"
                        style={{
                          position: 'absolute',
                          left: `-${(Number(pairedContinuationRegion.x) / Number(pairedContinuationRegion.width)) * 100}%`,
                          top: `-${(Number(pairedContinuationRegion.y) / Number(pairedContinuationRegion.height)) * 100}%`,
                          width: `${(1 / Number(pairedContinuationRegion.width)) * 100}%`,
                          height: `${(1 / Number(pairedContinuationRegion.height)) * 100}%`,
                          maxWidth: 'none',
                          display: 'block',
                        }}
                      />

                      {/* স্পষ্ট 'ক' জলছাপ ওভারলে */}
                      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20 }}>
                        <img
                          src={WATERMARK_IMAGE}
                          alt="দৈনিক কল্যাণ জলছাপ"
                          style={{ width: '40%', opacity: 0.28, filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.25))' }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </main>
    </SiteChrome>
  );
}