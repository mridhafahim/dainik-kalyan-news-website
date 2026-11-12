'use client'

import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { Calendar, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw, X, ExternalLink, FileText, BookOpen } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// মূল 'ক' জলছাপ
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
  isSpecial?: boolean;
  specialName?: string;
}

export default function EpaperPage() {
  const [activeTab, setActiveTab] = useState<'regular' | 'special'>('regular');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedEditionId, setSelectedEditionId] = useState<number>();
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(100);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [activeModalRegion, setActiveModalRegion] = useState<Region | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  // ক্যালেন্ডার স্টেট
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());

  const queryParam = selectedEditionId ? `?edition=${selectedEditionId}` : selectedDate ? `?date=${selectedDate}` : '';
  const { data, isLoading } = useSWR(`/api/epaper${queryParam}`, fetcher, { revalidateOnFocus: false });

  const regularEditions: EditionItem[] = data?.regularEditions || [];
  const specialEditions: EditionItem[] = data?.specialEditions || [];
  const archiveDates: string[] = data?.archiveDates || [];
  const current = data?.current;
  const pages: PageItem[] = current?.pages || [];
  const allRegions: Region[] = current?.allRegions || [];

  const currentEdition: EditionItem | null = current?.edition || null;

  useEffect(() => {
    if (currentEdition) {
      if (currentEdition.isSpecial) {
        setActiveTab('special');
      } else {
        setActiveTab('regular');
      }
      if (!selectedDate) {
        setSelectedDate(currentEdition.editionDate);
      }
    }
  }, [currentEdition]);

  const currentPage = pages[currentPageIndex] || null;
  const currentPageRegions = useMemo(() => {
    if (!currentPage) return [];
    return allRegions.filter(r => r.pageId === currentPage.id);
  }, [allRegions, currentPage]);

  const changePageWithFlip = (newIndex: number) => {
    if (newIndex === currentPageIndex || newIndex < 0 || newIndex >= pages.length) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPageIndex(newIndex);
      setIsFlipping(false);
    }, 240);
  };

  // ২ পাতার ধারাবাহিক খবরের জোড়া খোঁজার স্মার্ট লজিক
  const pairedContinuationRegion = useMemo(() => {
    if (!activeModalRegion) return null;
    const url = activeModalRegion.targetUrl || '';

    // ১. স্টোরি টোকেন দিয়ে মিল খোঁজা
    if (url.includes('group:story_')) {
      const token = url.substring(url.indexOf('group:story_'));
      const found = allRegions.find(r => r.id !== activeModalRegion.id && r.targetUrl && r.targetUrl.includes(token));
      if (found) return found;
    }

    // ২. পেজ নম্বর দিয়ে মিল খোঁজা (যদি টোকেন মিস হয়)
    if (activeModalRegion.targetPageNumber) {
      const targetP = pages.find(p => p.pageNumber === activeModalRegion.targetPageNumber);
      if (targetP) {
        const found = allRegions.find(r => r.pageId === targetP.id && (r.targetPageNumber === currentPage?.pageNumber || r.targetPageNumber === 1));
        if (found) return found;
      }
    }
    return null;
  }, [activeModalRegion, allRegions, pages, currentPage]);

  // কোন অংশটি আগে (পৃষ্ঠা ১) এবং কোনটি পরে (পৃষ্ঠা ২) তা নির্ধারণ
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

  const part1Page = useMemo(() => {
    if (!part1Region) return null;
    return pages.find(p => p.id === part1Region.pageId) || null;
  }, [part1Region, pages]);

  const part2Page = useMemo(() => {
    if (!part2Region) return null;
    return pages.find(p => p.id === part2Region.pageId) || null;
  }, [part2Region, pages]);

  // ক্যালেন্ডার গ্রিড
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

  // জলছাপসহ পেজ ডাউনলোড
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

    ctx.save();
    ctx.globalAlpha = 0.22;
    const wmW = canvas.width * 0.45;
    const wmH = (wm.naturalHeight / (wm.naturalWidth || 1)) * wmW || wmW;
    ctx.drawImage(wm, (canvas.width - wmW) / 2, (canvas.height - wmH) / 2, wmW, wmH);
    ctx.restore();

    const link = document.createElement('a');
    link.download = `Dainik-Kalyan-${currentEdition?.editionDate || 'Epaper'}-Page-${currentPage.pageNumber}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  };

  // কাটিং ডাউনলোড
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
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px' }}>
        
        {/* কালবেলা স্টাইল হেডার */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '14px 20px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '16px', gap: '14px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
            <button
              onClick={() => {
                setActiveTab('regular');
                if (regularEditions[0]) {
                  setSelectedEditionId(regularEditions[0].id);
                  setSelectedDate(regularEditions[0].editionDate);
                  setCurrentPageIndex(0);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'regular' ? '#c8102e' : 'transparent',
                color: activeTab === 'regular' ? '#fff' : '#374151',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <FileText size={16} /> নিয়মিত পত্রিকা
            </button>

            <button
              onClick={() => {
                setActiveTab('special');
                if (specialEditions[0]) {
                  setSelectedEditionId(specialEditions[0].id);
                  setSelectedDate(specialEditions[0].editionDate);
                  setCurrentPageIndex(0);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === 'special' ? '#c8102e' : 'transparent',
                color: activeTab === 'special' ? '#fff' : '#374151',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <BookOpen size={16} /> বিশেষ সংখ্যা / ম্যাগাজিন
              {specialEditions.length > 0 && (
                <span style={{ background: activeTab === 'special' ? '#fff' : '#c8102e', color: activeTab === 'special' ? '#c8102e' : '#fff', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                  {specialEditions.length}
                </span>
              )}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            <button
              onClick={() => {
                const target = activeTab === 'special' ? specialEditions[0] : regularEditions[0];
                if (target) {
                  setSelectedEditionId(target.id);
                  setSelectedDate(target.editionDate);
                  setCurrentPageIndex(0);
                }
              }}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '13px', fontWeight: 700, color: '#1f2937', cursor: 'pointer' }}
            >
              আজকের সংখ্যা ({currentEdition?.editionDate || 'সর্বশেষ'})
            </button>

            <button
              onClick={() => setShowCalendar(!showCalendar)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '6px', background: '#c8102e', color: '#fff', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(200,16,46,0.2)' }}
            >
              <Calendar size={16} /> আর্কাইভ ক্যালেন্ডার
            </button>

            {/* কালবেলা ক্যালেন্ডার পপআপ */}
            {showCalendar && (
              <div style={{ position: 'absolute', top: '115%', right: 0, zIndex: 1000, width: '310px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else { setCalMonth(m => m - 1); } }} style={{ border: 'none', background: '#f3f4f6', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{monthNamesBn[calMonth]} {calYear}</span>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else { setCalMonth(m => m + 1); } }} style={{ border: 'none', background: '#f3f4f6', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}><ChevronRight size={16} /></button>
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
                        disabled={!hasEdition}
                        onClick={() => selectDateFromCalendar(d)}
                        style={{
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          border: isSelected ? '1.5px solid #c8102e' : 'none',
                          background: isSelected ? '#c8102e' : hasEdition ? '#fee2e2' : 'transparent',
                          color: isSelected ? '#fff' : hasEdition ? '#991b1b' : '#d1d5db',
                          fontWeight: hasEdition ? 700 : 400,
                          fontSize: '13px',
                          cursor: hasEdition ? 'pointer' : 'default',
                        }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ম্যাগাজিন শেল্ফ */}
        {activeTab === 'special' && specialEditions.length > 0 && (
          <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #fecdd3', marginBottom: '18px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#9f1239', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={18} /> প্রকাশিত বিশেষ সংখ্যা ও ম্যাগাজিনসমূহ
            </h3>

            <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '6px' }}>
              {specialEditions.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedEditionId(item.id);
                    setSelectedDate(item.editionDate);
                    setCurrentPageIndex(0);
                  }}
                  style={{
                    flex: '0 0 170px',
                    padding: '10px',
                    borderRadius: '8px',
                    border: currentEdition?.id === item.id ? '2px solid #c8102e' : '1px solid #e5e7eb',
                    background: currentEdition?.id === item.id ? '#fff1f2' : '#f9fafb',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ height: '70px', background: '#ffe4e6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', color: '#e11d48' }}>
                    <BookOpen size={28} />
                  </div>
                  <strong style={{ fontSize: '13px', color: '#111827', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.specialName || item.title}
                  </strong>
                  <small style={{ color: '#6b7280', fontSize: '11px' }}>{item.editionDate}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* পেজ কন্ট্রোল বার */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '10px 18px', borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '18px', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button
              onClick={() => changePageWithFlip(Math.max(currentPageIndex - 1, 0))}
              disabled={currentPageIndex === 0}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', opacity: currentPageIndex === 0 ? 0.4 : 1 }}
              title="আগের পৃষ্ঠা"
            >
              <ChevronLeft size={16} />
            </button>

            {pages.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => changePageWithFlip(idx)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: idx === currentPageIndex ? 'none' : '1px solid #e5e7eb',
                  background: idx === currentPageIndex ? '#c8102e' : '#f9fafb',
                  color: idx === currentPageIndex ? '#fff' : '#374151',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  minWidth: '40px',
                }}
              >
                পৃষ্ঠা {p.pageNumber}
              </button>
            ))}

            <button
              onClick={() => changePageWithFlip(Math.min(currentPageIndex + 1, pages.length - 1))}
              disabled={currentPageIndex === pages.length - 1}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', opacity: currentPageIndex === pages.length - 1 ? 0.4 : 1 }}
              title="পরের পৃষ্ঠা"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setZoom(z => Math.max(z - 15, 60))} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="জুম আউট"><ZoomOut size={15} /></button>
            <span style={{ fontSize: '13px', fontWeight: 700, width: '42px', textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 15, 180))} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="জুম ইন"><ZoomIn size={15} /></button>
            <button onClick={() => setZoom(100)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }} title="রিসেট"><RotateCcw size={15} /></button>
            <button onClick={downloadPageWithWatermark} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#111827', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '13px', marginLeft: '6px' }}>
              <Download size={15} /> পেজ ডাউনলোড
            </button>
          </div>
        </div>

        {/* মূল পেপার ভিউয়ার */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: '#6b7280', fontSize: '16px' }}>
            দৈনিক কল্যাণ {activeTab === 'special' ? 'ম্যাগাজিন' : 'ই-পেপার'} লোড হচ্ছে...
          </div>
        ) : !currentPage ? (
          <div style={{ textAlign: 'center', padding: '80px 0', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <FileText size={48} color="#9ca3af" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#374151' }}>
              {selectedDate ? `${selectedDate} তারিখে কোনো ই-পেপার পাওয়া যায়নি` : 'কোনো ই-পেপার পাওয়া যায়নি'}
            </h2>
            <p style={{ color: '#6b7280', marginTop: '6px' }}>অনুগ্রহ করে আর্কাইভ ক্যালেন্ডার থেকে অন্য একটি তারিখ নির্বাচন করুন।</p>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: `${zoom}%`,
                maxWidth: '100%',
                transition: 'all 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isFlipping ? 'scale(0.97) rotateY(8deg)' : 'none',
                opacity: isFlipping ? 0.6 : 1,
                position: 'relative',
                background: '#fff',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <img
                src={currentPage.imagePath}
                alt={`পৃষ্ঠা ${currentPage.pageNumber}`}
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />

              {/* ক্লিকযোগ্য হটস্পটসমূহ */}
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
                  title="সংবাদটি সামনে বড় করে পড়তে ক্লিক করুন"
                />
              ))}
            </div>
          </div>
        )}

        {/* সামনে ওপেন হওয়া কাটিং মোডাল (২ পাতার খবর সবসময় একসাথে পাশাপাশি প্রদর্শন) */}
        {activeModalRegion && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.78)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }} onClick={() => setActiveModalRegion(null)}>
            <div style={{ background: '#fff', borderRadius: '14px', maxWidth: part2Region ? '1100px' : '650px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '24px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} onClick={e => e.stopPropagation()}>
              
              {/* মোডাল হেডার */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '14px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={WATERMARK_IMAGE} alt="ক" style={{ height: '32px', width: 'auto' }} />
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>
                      দৈনিক কল্যাণ কাটিং ভিউ
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                      {currentEdition?.editionDate} · পৃষ্ঠা {part1Page?.pageNumber || 1}
                      {part2Region && part2Page ? ` ও পৃষ্ঠা ${part2Page.pageNumber} (ধারাবাহিক সংবাদ)` : ''}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {(activeModalRegion.articleId || part1Region?.articleId) && (
                    <Link
                      href={`/news/${activeModalRegion.articleId || part1Region?.articleId}`}
                      target="_blank"
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: '#f3f4f6', color: '#1f2937', borderRadius: '6px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
                    >
                      <ExternalLink size={14} /> অনলাইন খবর
                    </Link>
                  )}
                  <button onClick={() => setActiveModalRegion(null)} style={{ background: '#f3f4f6', border: 'none', padding: '7px', borderRadius: '50%', cursor: 'pointer', display: 'flex' }}><X size={20} /></button>
                </div>
              </div>

              {/* কাটিং কন্টেইনার (একক সংবাদ হলে সিঙ্গেল, ২ পাতার হলে পাশাপাশি দুটি পার্ট) */}
              <div style={{ display: 'grid', gridTemplateColumns: part2Region ? '1fr 1fr' : '1fr', gap: '20px' }}>
                
                {/* অংশ ১: পৃষ্ঠা ১ বা প্রথম অংশের কাটিং */}
                {part1Region && part1Page && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#c8102e', display: 'flex', justifyContent: 'space-between' }}>
                      <span>প্রথম অংশ (পৃষ্ঠা {part1Page.pageNumber})</span>
                      <button onClick={() => downloadCutout(part1Region, part1Page.imagePath, `Page-${part1Page.pageNumber}-Part-1`)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>📥 কাটিং সেভ</button>
                    </div>

                    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: `${Number(part1Region.width)} / ${Number(part1Region.height)}`, borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fafafa' }}>
                      <img
                        src={part1Page.imagePath}
                        alt="News Cutout Part 1"
                        style={{
                          position: 'absolute',
                          left: `-${(Number(part1Region.x) / Number(part1Region.width)) * 100}%`,
                          top: `-${(Number(part1Region.y) / Number(part1Region.height)) * 100}%`,
                          width: `${(1 / Number(part1Region.width)) * 100}%`,
                          height: `${(1 / Number(part1Region.height)) * 100}%`,
                          maxWidth: 'none',
                          display: 'block',
                        }}
                      />

                      {/* 'ক' জলছাপ */}
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

                {/* অংশ ২: পৃষ্ঠা ২ বা চলমান অংশের কাটিং */}
                {part2Region && part2Page && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#c8102e', display: 'flex', justifyContent: 'space-between' }}>
                      <span>চলমান অংশ (পৃষ্ঠা {part2Page.pageNumber})</span>
                      <button onClick={() => downloadCutout(part2Region, part2Page.imagePath, `Page-${part2Page.pageNumber}-Part-2`)} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>📥 কাটিং সেভ</button>
                    </div>

                    <div style={{ position: 'relative', overflow: 'hidden', width: '100%', aspectRatio: `${Number(part2Region.width)} / ${Number(part2Region.height)}`, borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fafafa' }}>
                      <img
                        src={part2Page.imagePath}
                        alt="News Cutout Part 2"
                        style={{
                          position: 'absolute',
                          left: `-${(Number(part2Region.x) / Number(part2Region.width)) * 100}%`,
                          top: `-${(Number(part2Region.y) / Number(part2Region.height)) * 100}%`,
                          width: `${(1 / Number(part2Region.width)) * 100}%`,
                          height: `${(1 / Number(part2Region.height)) * 100}%`,
                          maxWidth: 'none',
                          display: 'block',
                        }}
                      />

                      {/* 'ক' জলছাপ */}
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