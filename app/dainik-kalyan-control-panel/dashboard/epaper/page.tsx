'use client'

import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import { PageTitle } from '@/components/admin/AdminUi';
import { BookOpen, Calendar, Edit3, Trash2, ZoomIn, ZoomOut, RotateCcw, Square, Check, X, Link2 } from 'lucide-react';

type Edition = { id: number; editionDate: string; title: string; status: string; isSpecial?: boolean; specialName?: string };
type Page = { id: number; pageNumber: number; imagePath: string; width: number; height: number };
type Shape = 'rect' | 'l' | 't' | 'polygon';
type Region = {
  id?: number;
  pageId?: number;
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  shapeType?: Shape;
  points?: Array<{ x: number; y: number }>;
  articleId?: number | null;
  targetPageNumber?: number | null;
  targetUrl?: string | null;
};
type Article = { id: number; titleBn: string };

const percent = (value: number | string) => Number(value) * 100;

// আজকের স্থানীয় তারিখ ফরম্যাট (GMT+6 সেফ)
const getTodayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EpaperAdmin() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [editionId, setEditionId] = useState<number>();
  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageId] = useState<number>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [allRegions, setAllRegions] = useState<(Region & { pageId: number })[]>([]);

  // ফর্ম ও তারিখ স্টেট (ডিফল্ট আজকের তারিখ)
  const [date, setDate] = useState<string>(getTodayLocal());
  const [title, setTitle] = useState('দৈনিক কল্যাণ');
  const [isSpecial, setIsSpecial] = useState(false);
  const [specialName, setSpecialName] = useState('');
  const [isEditingEdition, setIsEditingEdition] = useState(false);

  // ২ পাতার ধারাবাহিক খবরের চলমান সেশন টোকেন
  const [pendingStoryToken, setPendingStoryToken] = useState<string | null>(null);
  const [pendingFromPage, setPendingFromPage] = useState<number | null>(null);

  const [message, setMessage] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [zoom, setZoom] = useState(100);

  // শেপ ও ড্রয়িং স্টেট
  const [selectedShape, setSelectedShape] = useState<Shape>('rect');
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMouse, setCurrentMouse] = useState<{ x: number; y: number } | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [selectedTarget, setSelectedTarget] = useState('');

  const canvas = useRef<HTMLDivElement>(null);

  async function load(id = editionId) {
    try {
      const response = await fetch(`/api/admin/epaper${id ? `?edition=${id}` : ''}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ই-পেপার লোড ব্যর্থ');

      setEditions(data.editions || []);
      setArticles(data.articles || []);
      const current = data.edition;

      if (!current) {
        setPages([]);
        setAllRegions([]);
        setRegions([]);
        return;
      }

      setEditionId(current.id);
      setDate(current.editionDate);
      setTitle(current.title);
      setIsSpecial(Boolean(current.isSpecial));
      setSpecialName(current.specialName || '');

      setPages(data.pages || []);
      const flattenedRegions: (Region & { pageId: number })[] = [];
      data.pages?.forEach((p: any) => {
        p.regions?.forEach((r: any) => {
          flattenedRegions.push({ ...r, pageId: p.id });
        });
      });
      setAllRegions(flattenedRegions);

      const selectedPage = pageId && data.pages?.some((p: Page) => p.id === pageId) ? pageId : data.pages?.[0]?.id;
      setPageId(selectedPage);
      setRegions(flattenedRegions.filter(r => r.pageId === selectedPage));
    } catch (error: any) {
      setMessage(error.message || 'ই-পেপার লোড ব্যর্থ');
    }
  }

  useEffect(() => {
    void load();
  }, [editionId]);

  // নতুন তারিখের জন্য সম্পূর্ণ নতুন সংখ্যা তৈরি
  async function createNewEdition() {
    if (!date) {
      setMessage('অনুগ্রহ করে একটি সঠিক তারিখ দিন।');
      return;
    }

    try {
      const response = await fetch('/api/admin/epaper', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ editionDate: date, title, isSpecial, specialName }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'সংস্করণ তৈরি ব্যর্থ');

      setMessage(`তারিখ ${date}-এর জন্য নতুন সংখ্যা সফলভাবে তৈরি হয়েছে। এখন পৃষ্ঠা আপলোড করুন।`);
      if (data.edition) {
        setEditionId(data.edition.id);
        setPages([]);
        setRegions([]);
        setPageId(undefined);
        void load(data.edition.id);
      }
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  // নির্বাচিত বর্তমান সংস্করণের তারিখ বা শিরোনাম আপডেট
  async function updateEdition() {
    if (!editionId) return;
    try {
      const response = await fetch('/api/admin/epaper', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ editionId, title, isSpecial, specialName, editionDate: date }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'আপডেট ব্যর্থ');

      setMessage('সংস্করণের তথ্য সফলভাবে আপডেট হয়েছে।');
      setIsEditingEdition(false);
      void load(editionId);
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  // পুরো সংস্করণ মুছে ফেলা
  async function deleteCurrentEdition() {
    if (!editionId || !confirm('আপনি কি নিশ্চিত এই পুরো সংস্করণ এবং এর সকল পৃষ্ঠা মুছে ফেলতে চান?')) return;
    try {
      const response = await fetch(`/api/admin/epaper?editionId=${editionId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'মুছে ফেলা ব্যর্থ');

      setMessage('সংস্করণ মুছে ফেলা হয়েছে।');
      setEditionId(undefined);
      setDate(getTodayLocal());
      void load();
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  // একক পৃষ্ঠা ডিলিট
  async function deleteSinglePage(pId: number) {
    if (!confirm('এই পৃষ্ঠাটি মুছে ফেলতে চান?')) return;
    try {
      const response = await fetch(`/api/admin/epaper?pageId=${pId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'পৃষ্ঠা মুছে ফেলা ব্যর্থ');

      setMessage('পৃষ্ঠাটি মুছে ফেলা হয়েছে।');
      void load(editionId);
    } catch (err: any) {
      setMessage(err.message);
    }
  }

  // পৃষ্ঠা আপলোড
  async function uploadPages(files: FileList | null) {
    if (!editionId) return setMessage('আগে একটি তারিখ নির্বাচন করে নতুন সংখ্যা তৈরি বা নির্বাচন করুন');
    if (!files?.length) return;

    setMessage(`${files.length}টি পৃষ্ঠা আপলোড হচ্ছে...`);
    for (let index = 0; index < files.length; index++) {
      const form = new FormData();
      form.append('file', files[index]);

      const upload = await fetch('/api/admin/epaper/upload', { method: 'POST', body: form }).then(r => r.json());
      if (!upload.url) {
        setMessage(upload.error || 'আপলোড ব্যর্থ');
        return;
      }

      const image = new Image();
      image.src = upload.url;
      await new Promise(res => { image.onload = res; image.onerror = res; });

      const pageNumber = pages.length + index + 1;
      const saved = await fetch('/api/admin/epaper', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          editionId,
          pageNumber,
          imagePath: upload.url,
          width: image.naturalWidth || 1200,
          height: image.naturalHeight || 1800,
        }),
      });

      if (!saved.ok) {
        const data = await saved.json();
        setMessage(data.error || 'পৃষ্ঠা সংরক্ষণ ব্যর্থ');
        return;
      }
    }
    setMessage('সব পৃষ্ঠা সফলভাবে যোগ হয়েছে।');
    void load(editionId);
  }

  // ড্রয়িং কোঅর্ডিনেট
  function getCoordinates(event: React.PointerEvent) {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(event: React.PointerEvent) {
    const coords = getCoordinates(event);
    if (!coords) return;

    if (selectedShape === 'polygon') {
      setPolygonPoints(prev => [...prev, coords]);
    } else {
      setIsDragging(true);
      setDragStart(coords);
      setCurrentMouse(coords);
    }
  }

  function handlePointerMove(event: React.PointerEvent) {
    const coords = getCoordinates(event);
    if (!coords) return;
    setCurrentMouse(coords);
  }

  function handlePointerUp() {
    if (!isDragging || !dragStart || !currentMouse) return;

    const x = Math.min(dragStart.x, currentMouse.x);
    const y = Math.min(dragStart.y, currentMouse.y);
    const width = Math.abs(currentMouse.x - dragStart.x);
    const height = Math.abs(currentMouse.y - dragStart.y);

    if (width > 0.015 && height > 0.015) {
      let clipPoints: Array<{ x: number; y: number }> = [];
      if (selectedShape === 'l') {
        clipPoints = [{ x: 0, y: 0 }, { x: 0.38, y: 0 }, { x: 0.38, y: 0.62 }, { x: 1, y: 0.62 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
      } else if (selectedShape === 't') {
        clipPoints = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 0.32 }, { x: 0.62, y: 0.32 }, { x: 0.62, y: 1 }, { x: 0.38, y: 1 }, { x: 0.38, y: 0.32 }, { x: 0, y: 0.32 }];
      }

      // যদি আগের পাতা থেকে কোনো ধারাবাহিক খবর লিংক করার পেন্ডিং টোকেন থাকে, তা স্বয়ংক্রিয়ভাবে জুড়ে দেওয়া
      const autoToken = pendingStoryToken ? `https://dainikkalyan.com/${pendingStoryToken}` : null;
      const autoTargetPage = pendingFromPage ? pendingFromPage : null;

      const newRegion: Region = {
        pageId,
        x,
        y,
        width,
        height,
        shapeType: selectedShape,
        points: clipPoints,
        articleId: selectedTarget.startsWith('article:') ? Number(selectedTarget.split(':')[1]) : null,
        targetPageNumber: selectedTarget.startsWith('page:') ? Number(selectedTarget.split(':')[1]) : autoTargetPage,
        targetUrl: autoToken,
      };

      setRegions(current => [...current, newRegion]);

      if (pendingStoryToken) {
        setMessage('পৃষ্ঠা ১-এর সাথে পৃষ্ঠা ২-এর ধারাবাহিক খবরের সংযোগ সম্পন্ন হয়েছে! এখন "সব লিংক সংরক্ষণ করুন" চাপুন।');
        setPendingStoryToken(null);
        setPendingFromPage(null);
      }
    }

    setIsDragging(false);
    setDragStart(null);
  }

  function finishPolygon() {
    if (polygonPoints.length < 3) {
      alert('বহুভুজ তৈরি করতে কমপক্ষে ৩টি বিন্দু নির্বাচন করুন।');
      return;
    }

    const xs = polygonPoints.map(p => p.x);
    const ys = polygonPoints.map(p => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const width = Math.max(0.01, maxX - minX);
    const height = Math.max(0.01, maxY - minY);

    const relativePoints = polygonPoints.map(p => ({
      x: (p.x - minX) / width,
      y: (p.y - minY) / height,
    }));

    const autoToken = pendingStoryToken ? `https://dainikkalyan.com/${pendingStoryToken}` : null;
    const autoTargetPage = pendingFromPage ? pendingFromPage : null;

    const newRegion: Region = {
      pageId,
      x: minX,
      y: minY,
      width,
      height,
      shapeType: 'polygon',
      points: relativePoints,
      articleId: selectedTarget.startsWith('article:') ? Number(selectedTarget.split(':')[1]) : null,
      targetPageNumber: selectedTarget.startsWith('page:') ? Number(selectedTarget.split(':')[1]) : autoTargetPage,
      targetUrl: autoToken,
    };

    setRegions(current => [...current, newRegion]);
    setPolygonPoints([]);

    if (pendingStoryToken) {
      setMessage('পৃষ্ঠা ১-এর সাথে পৃষ্ঠা ২-এর ধারাবাহিক খবরের সংযোগ সম্পন্ন হয়েছে!');
      setPendingStoryToken(null);
      setPendingFromPage(null);
    }
  }

  // অঞ্চল সংরক্ষণ
  async function saveRegions() {
    if (!pageId) return;
    const response = await fetch('/api/admin/epaper', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageId, regions }),
    });
    const data = await response.json();
    setMessage(response.ok ? 'সকল লিংক সফলভাবে সংরক্ষিত হয়েছে।' : data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
    if (response.ok) void load(editionId);
  }

  // ২ পাতার ধারাবাহিক খবরের জন্য অটো-সেভ ও পেজ ট্রানজিশন
  async function saveAndGoToNextPage(targetPageNum: number) {
    if (!pageId || !selected) return;

    // একটি নির্দিষ্ট ইউনিক স্টোরি টোকেন তৈরি
    const storyToken = `group:story_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // বর্তমান পাতার অঞ্চলে এই টোকেন ও টার্গেট পেজ বসিয়ে সেভ করা
    const updatedRegions = regions.map((r, i) => {
      if (i === 0 || r.targetPageNumber === targetPageNum) {
        return {
          ...r,
          targetPageNumber: targetPageNum,
          targetUrl: `https://dainikkalyan.com/${storyToken}`,
        };
      }
      return r;
    });

    const response = await fetch('/api/admin/epaper', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageId, regions: updatedRegions }),
    });

    if (response.ok) {
      // সেশনে টোকেন সংরক্ষণ যেন পরের পাতায় কাটলেই স্বয়ংক্রিয়ভাবে লিঙ্ক হয়ে যায়
      setPendingStoryToken(storyToken);
      setPendingFromPage(selected.pageNumber);

      setMessage(`পৃষ্ঠা ${selected.pageNumber} সেভ সম্পন্ন। এখন পৃষ্ঠা ${targetPageNum}-এ বাকি অংশ ড্র্যাগ করে কেটে নিন।`);
      const targetP = pages.find(p => p.pageNumber === targetPageNum);
      if (targetP) {
        setPageId(targetP.id);
        setRegions(allRegions.filter(r => r.pageId === targetP.id));
      }
    } else {
      const data = await response.json();
      setMessage(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
    }
  }

  // প্রকাশনা স্ট্যাটাস
  async function publish(status: 'published' | 'draft') {
    if (!editionId) return;
    setPublishing(true);
    const response = await fetch('/api/admin/epaper', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ editionId, status }),
    });
    const data = await response.json();
    setMessage(response.ok ? (status === 'published' ? 'ই-পেপার প্রকাশিত হয়েছে।' : 'ই-পেপার খসড়ায় ফেরত নেওয়া হয়েছে।') : data.error || 'স্ট্যাটাস পরিবর্তন ব্যর্থ');
    setPublishing(false);
    if (response.ok) void load(editionId);
  }

  const selected = pages.find(p => p.id === pageId);

  return (
    <>
      <PageTitle title="ই-পেপার ও ম্যাগাজিন ওয়ার্কস্পেস" subtitle="নিয়মিত ও বিশেষ সংখ্যা/ম্যাগাজিন তৈরি, সম্পাদনা ও ভিজ্যুয়াল লিংক পরিচালনা করুন।" />

      <div className="epaper-workspace">
        {/* সংখ্যা ও তারিখ সেটিংস */}
        <section className="admin-panel epaper-setup">
          <div className="workspace-heading">
            <div>
              <h2>তারিখ ও সংখ্যা সেটিংস</h2>
              <p>নতুন তারিখের পেপার তৈরি বা বিদ্যমান তারিখ এডিট করুন</p>
            </div>
            <span className={`status-pill status-${editions.find(item => item.id === editionId)?.status || 'draft'}`}>
              {editions.find(item => item.id === editionId)?.status || 'draft'}
            </span>
          </div>

          <div className="two-form-grid">
            <label>
              প্রকাশনার তারিখ (Date)
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ fontSize: '15px', fontWeight: 700 }}
              />
            </label>
            <label>
              শিরোনাম (Title)
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="দৈনিক কল্যাণ" />
            </label>
          </div>

          <div style={{ background: '#fff1f2', padding: '12px', borderRadius: '8px', border: '1px solid #fecdd3', margin: '12px 0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#9f1239', cursor: 'pointer' }}>
              <input type="checkbox" checked={isSpecial} onChange={e => setIsSpecial(e.target.checked)} />
              এটি একটি বিশেষ সংখ্যা / ম্যাগাজিন
            </label>

            {isSpecial && (
              <label style={{ marginTop: '10px', display: 'block' }}>
                বিশেষ সংখ্যা / ম্যাগাজিনের নাম
                <input
                  value={specialName}
                  onChange={e => setSpecialName(e.target.value)}
                  placeholder="যেমন: ঈদ সংখ্যা ২০২৬ / সাহিত্য সাময়িকী"
                  style={{ width: '100%', marginTop: '4px', padding: '8px', borderRadius: '6px', border: '1px solid #f43f5e' }}
                />
              </label>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
            <button
              className="button button-green"
              onClick={createNewEdition}
              style={{ fontWeight: 800, padding: '10px 18px', background: '#16a34a' }}
            >
              ➕ {date} তারিখে নতুন সংখ্যা তৈরি করুন
            </button>

            {editionId && (
              <button
                className="button button-ghost"
                onClick={updateEdition}
                style={{ fontWeight: 700, border: '1px solid #cbd5e1' }}
              >
                <Edit3 size={15} /> বর্তমান সংখ্যার তারিখ/নাম আপডেট
              </button>
            )}
          </div>

          <label>
            বিদ্যমান সংখ্যাসমূহ থেকে বেছে নিন:
            <select
              value={editionId || ''}
              onChange={event => {
                const id = Number(event.target.value);
                setEditionId(id);
                setPageId(undefined);
                void load(id);
              }}
              style={{ fontWeight: 700 }}
            >
              <option value="">-- প্রকাশিত বা খসড়া সংখ্যা নির্বাচন করুন --</option>
              {editions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.editionDate} · {item.title} {item.isSpecial ? `[ম্যাগাজিন: ${item.specialName || 'বিশেষ'}]` : ''} · {item.status}
                </option>
              ))}
            </select>
          </label>

          {editionId && (
            <button
              onClick={deleteCurrentEdition}
              style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', margin: '8px 0 14px' }}
            >
              <Trash2 size={14} /> এই পুরো সংখ্যাটি মুছে ফেলুন ({date})
            </button>
          )}

          <label className="upload-dropzone">
            একসাথে একাধিক পৃষ্ঠা আপলোড করুন
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => void uploadPages(event.target.files)} />
            <small>নির্বাচিত তারিখ: <b>{date}</b>-এর জন্য পৃষ্ঠা আপলোড হবে।</small>
          </label>

          <div className="publish-actions">
            <button className="button button-primary" disabled={!pages.length || publishing} onClick={() => void publish('published')}>
              প্রকাশ করুন
            </button>
            <button className="button button-ghost" disabled={publishing} onClick={() => void publish('draft')}>
              খসড়ায় ফেরত
            </button>
          </div>
        </section>

        {/* পৃষ্ঠা তালিকা */}
        <section className="admin-panel epaper-pages">
          <div className="workspace-heading">
            <div>
              <h2>পৃষ্ঠা তালিকা ({date})</h2>
              <p>{pages.length}টি পৃষ্ঠা · পৃষ্ঠা নির্বাচন করে লিংক ড্র্যাগ করুন</p>
            </div>
          </div>

          <div className="page-list">
            {pages.map(page => (
              <div key={page.id} style={{ position: 'relative' }}>
                <button
                  className={page.id === pageId ? 'page-tile selected' : 'page-tile'}
                  onClick={() => {
                    setPageId(page.id);
                    setRegions(allRegions.filter(region => region.pageId === page.id));
                  }}
                >
                  <img src={page.imagePath} alt={`পৃষ্ঠা ${page.pageNumber}`} />
                  <span>পৃষ্ঠা {page.pageNumber}</span>
                </button>
                <button
                  onClick={() => deleteSinglePage(page.id)}
                  title="এই পৃষ্ঠা মুছুন"
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(220, 38, 38, 0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ভিজ্যুয়াল লিংক ম্যাপার */}
        <section className="admin-panel epaper-mapper">
          <div className="workspace-heading">
            <div>
              <h2>ভিজ্যুয়াল লিংক ম্যাপার</h2>
              <p>শেপ নির্বাচন করে পেপারের ওপর ড্র্যাগ করুন।</p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setZoom(z => Math.max(z - 15, 60))} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}><ZoomOut size={14} /></button>
              <button onClick={() => setZoom(z => Math.min(z + 15, 180))} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}><ZoomIn size={14} /></button>
              <button onClick={() => setZoom(100)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}><RotateCcw size={14} /></button>
            </div>
          </div>

          {/* শেপ সিলেকশন বার */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginRight: '6px' }}>শেপ টুল:</span>

            <button
              onClick={() => { setSelectedShape('rect'); setPolygonPoints([]); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: selectedShape === 'rect' ? '2px solid #c8102e' : '1px solid #cbd5e1',
                background: selectedShape === 'rect' ? '#fee2e2' : '#fff',
                color: selectedShape === 'rect' ? '#991b1b' : '#334155',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              <Square size={14} /> আয়তক্ষেত্র (Rect)
            </button>

            <button
              onClick={() => { setSelectedShape('l'); setPolygonPoints([]); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: selectedShape === 'l' ? '2px solid #c8102e' : '1px solid #cbd5e1',
                background: selectedShape === 'l' ? '#fee2e2' : '#fff',
                color: selectedShape === 'l' ? '#991b1b' : '#334155',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ⌐ এল-শেপ (L)
            </button>

            <button
              onClick={() => { setSelectedShape('t'); setPolygonPoints([]); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: selectedShape === 't' ? '2px solid #c8102e' : '1px solid #cbd5e1',
                background: selectedShape === 't' ? '#fee2e2' : '#fff',
                color: selectedShape === 't' ? '#991b1b' : '#334155',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ┬ টি-শেপ (T)
            </button>

            <button
              onClick={() => { setSelectedShape('polygon'); setPolygonPoints([]); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 14px',
                borderRadius: '6px',
                border: selectedShape === 'polygon' ? '2px solid #c8102e' : '1px solid #cbd5e1',
                background: selectedShape === 'polygon' ? '#fee2e2' : '#fff',
                color: selectedShape === 'polygon' ? '#991b1b' : '#334155',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              ⬡ বহুভুজ (ডট মোড)
            </button>

            {selectedShape === 'polygon' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>{polygonPoints.length}টি পয়েন্ট</span>
                <button onClick={finishPolygon} style={{ padding: '5px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  শেপ সম্পন্ন করুন
                </button>
                <button onClick={() => setPolygonPoints([])} style={{ padding: '5px 10px', background: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
                  বাতিল
                </button>
              </div>
            )}
          </div>

          {/* ২ পাতার চলমান সংযোগ মোডের সক্রিয় ব্যানার */}
          {pendingStoryToken && (
            <div style={{ background: '#ecfdf5', border: '1.5px solid #10b981', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontSize: '14px', fontWeight: 700 }}>
                <Link2 size={18} color="#059669" />
                <span>পৃষ্ঠা {pendingFromPage}-এর খবরের বাকি অংশ লিংক মোড চালু আছে। এখন ড্র্যাগ করে পৃষ্ঠা {selected?.pageNumber}-এর অংশটি কেটে নিন।</span>
              </div>
              <button onClick={() => { setPendingStoryToken(null); setPendingFromPage(null); }} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
                বাতিল করুন
              </button>
            </div>
          )}

          {selected ? (
            <>
              {/* ড্রয়িং ক্যানভাস */}
              <div style={{ overflow: 'auto', maxHeight: '760px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#334155', padding: '12px', textAlign: 'center' }}>
                <div
                  ref={canvas}
                  style={{
                    width: `${zoom}%`,
                    position: 'relative',
                    margin: '0 auto',
                    userSelect: 'none',
                    touchAction: 'none',
                    cursor: 'crosshair',
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <img
                    src={selected.imagePath}
                    alt={`পৃষ্ঠা ${selected.pageNumber}`}
                    draggable={false}
                    style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
                  />

                  {/* পূর্বের সংরক্ষিত অঞ্চলসমূহ */}
                  {regions.map((region, index) => {
                    let clipStyle: string | undefined = undefined;
                    if (region.shapeType === 'l') {
                      clipStyle = 'polygon(0 0, 38% 0, 38% 62%, 100% 62%, 100% 100%, 0 100%)';
                    } else if (region.shapeType === 't') {
                      clipStyle = 'polygon(0 0, 100% 0, 100% 32%, 62% 32%, 62% 100%, 38% 100%, 38% 32%, 0 32%)';
                    } else if (region.shapeType === 'polygon' && Array.isArray(region.points) && region.points.length > 2) {
                      clipStyle = `polygon(${region.points.map(p => `${p.x * 100}% ${p.y * 100}%`).join(', ')})`;
                    }

                    return (
                      <div
                        key={region.id || index}
                        style={{
                          position: 'absolute',
                          left: `${percent(region.x)}%`,
                          top: `${percent(region.y)}%`,
                          width: `${percent(region.width)}%`,
                          height: `${percent(region.height)}%`,
                          border: '2px solid rgba(200, 16, 46, 0.85)',
                          backgroundColor: 'rgba(200, 16, 46, 0.22)',
                          clipPath: clipStyle,
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-start',
                          padding: '3px',
                        }}
                      >
                        <span style={{ background: '#c8102e', color: '#fff', borderRadius: '4px', padding: '1px 5px', fontSize: '11px', fontWeight: 800 }}>
                          #{index + 1}
                        </span>
                      </div>
                    );
                  })}

                  {/* লাইভ ড্র্যাগ বক্স */}
                  {isDragging && dragStart && currentMouse && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${percent(Math.min(dragStart.x, currentMouse.x))}%`,
                        top: `${percent(Math.min(dragStart.y, currentMouse.y))}%`,
                        width: `${percent(Math.abs(currentMouse.x - dragStart.x))}%`,
                        height: `${percent(Math.abs(currentMouse.y - dragStart.y))}%`,
                        border: '2px dashed #dc2626',
                        backgroundColor: 'rgba(239, 68, 68, 0.25)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}

                  {/* বহুভুজ ডট ও লাইন */}
                  {selectedShape === 'polygon' && polygonPoints.length > 0 && (
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                      <polyline
                        points={polygonPoints.map(p => `${percent(p.x)}%,${percent(p.y)}%`).join(' ')}
                        fill="rgba(220, 38, 38, 0.18)"
                        stroke="#dc2626"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                      />
                      {currentMouse && (
                        <line
                          x1={`${percent(polygonPoints[polygonPoints.length - 1].x)}%`}
                          y1={`${percent(polygonPoints[polygonPoints.length - 1].y)}%`}
                          x2={`${percent(currentMouse.x)}%`}
                          y2={`${percent(currentMouse.y)}%`}
                          stroke="#dc2626"
                          strokeWidth="2"
                        />
                      )}
                      {polygonPoints.map((p, i) => (
                        <circle key={i} cx={`${percent(p.x)}%`} cy={`${percent(p.y)}%`} r="5" fill="#dc2626" stroke="#fff" strokeWidth="1.5" />
                      ))}
                    </svg>
                  )}
                </div>
              </div>

              {/* টার্গেট কন্ট্রোল */}
              <div className="mapping-controls" style={{ marginTop: '14px' }}>
                <label>
                  নতুন অঞ্চলের লিংক টার্গেট:
                  <select value={selectedTarget} onChange={e => setSelectedTarget(e.target.value)}>
                    <option value="">-- সংবাদ নির্বাচন করুন বা ভিতরের পাতায় পাঠান --</option>
                    {articles.map(article => (
                      <option key={article.id} value={`article:${article.id}`}>
                        অনলাইন সংবাদ: {article.titleBn}
                      </option>
                    ))}
                    {pages.filter(p => p.id !== pageId).map(p => (
                      <option key={p.id} value={`page:${p.pageNumber}`}>
                        ভিতরের কলাম: পৃষ্ঠা {p.pageNumber}-এ দেখুন
                      </option>
                    ))}
                  </select>
                </label>

                <button className="button button-green" onClick={saveRegions}>
                  সব লিংক সংরক্ষণ করুন ({regions.length})
                </button>
              </div>

              {/* অঞ্চলের তালিকা ও ভিতরের পাতার অটো-লিংক */}
              <div className="region-list">
                {regions.map((region, index) => {
                  const targetPageNum = region.targetPageNumber || (selectedTarget.startsWith('page:') ? Number(selectedTarget.split(':')[1]) : null);

                  return (
                    <div
                      key={region.id || index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: targetPageNum ? '#fff1f2' : '#fff',
                        border: targetPageNum ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                        borderRadius: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <span style={{ fontWeight: 800, color: '#c8102e', width: '28px' }}>#{index + 1}</span>

                        <select
                          value={region.articleId ? `article:${region.articleId}` : region.targetPageNumber ? `page:${region.targetPageNumber}` : ''}
                          onChange={e => {
                            const val = e.target.value;
                            setRegions(current =>
                              current.map((r, itemIdx) => {
                                if (itemIdx === index) {
                                  return {
                                    ...r,
                                    articleId: val.startsWith('article:') ? Number(val.split(':')[1]) : null,
                                    targetPageNumber: val.startsWith('page:') ? Number(val.split(':')[1]) : null,
                                  };
                                }
                                return r;
                              })
                            );
                          }}
                          style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, maxWidth: '420px', fontSize: '13px' }}
                        >
                          <option value="">-- সংবাদ নির্বাচন করুন বা ভিতরের পাতায় পাঠান --</option>
                          {articles.map(art => (
                            <option key={art.id} value={`article:${art.id}`}>
                              অনলাইন সংবাদ: {art.titleBn}
                            </option>
                          ))}
                          {pages.filter(p => p.id !== pageId).map(p => (
                            <option key={p.id} value={`page:${p.pageNumber}`}>
                              ভিতরের কলাম: পৃষ্ঠা {p.pageNumber}-এ দেখুন
                            </option>
                          ))}
                        </select>

                        {/* ২ পাতার ধারাবাহিক খবরের জন্য অটো-সেভ বাটন */}
                        {targetPageNum && (
                          <button
                            onClick={() => saveAndGoToNextPage(targetPageNum)}
                            style={{
                              background: '#c8102e',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            💾 পৃষ্ঠা {selected.pageNumber} সেভ করে পৃষ্ঠা {targetPageNum}-এ যান
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => setRegions(current => current.filter((_, itemIndex) => itemIndex !== index))}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginLeft: '12px' }}
                      >
                        মুছুন
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>একটি পৃষ্ঠা নির্বাচন করুন</h3>
              <p>বাঁ দিকের পেজ থাম্বনেইল থেকে শুরু করুন।</p>
            </div>
          )}
        </section>
      </div>

      {message && <p className="admin-feedback">{message}</p>}
    </>
  );
}