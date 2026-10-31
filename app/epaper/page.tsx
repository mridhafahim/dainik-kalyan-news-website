// 'use client'
// import useSWR from 'swr'
// import Link from 'next/link'
// import { useMemo, useState } from 'react'
// const fetcher=(url:string)=>fetch(url).then(response=>response.json())
// type Region={id:number;pageId:number;shapeType?:string;x:string;y:string;width:string;height:string;articleId:number|null;targetPageNumber:number|null;targetUrl:string|null}
// export default function EpaperPage(){const [editionId,setEditionId]=useState<number>();const [page,setPage]=useState(0);const {data,isLoading}=useSWR(`/api/epaper${editionId?`?edition=${editionId}`:''}`,fetcher,{revalidateOnFocus:false});const current=data?.current;const editions=data?.editions||[];const selected=useMemo(()=>editionId?editions.find((item:{id:number})=>item.id===editionId):editions[0],[editionId,editions]);const imagePage=current?.pages?.[page];const regions:Region[]=(current?.allRegions||[]).filter((region:Region)=>region.pageId===imagePage?.id);if(isLoading)return <main className="container main"><div className="section-kicker"><span>ই-পেপার</span><i/></div><div className="empty-state"><p>ই-পেপার লোড হচ্ছে…</p></div></main>;return <main className="container main"><div className="section-kicker"><span>ই-পেপার</span><i/></div><div className="epaper-toolbar"><label>সংস্করণ <select value={selected?.id||''} onChange={event=>{setEditionId(Number(event.target.value));setPage(0)}}>{editions.map((edition:{id:number;editionDate:string;title:string})=><option key={edition.id} value={edition.id}>{edition.editionDate} · {edition.title}</option>)}</select></label><span>{current?.pages?.length||0} পৃষ্ঠা</span></div>{!current?<div className="empty-state"><h1>কোনো প্রকাশিত ই-পেপার নেই</h1><p>প্রকাশিত সংস্করণ হলে এখানে দেখা যাবে।</p></div>:<><div className="epaper-reader"><div className="epaper-page-wrap"><img src={imagePage?.imagePath} alt={`${current.edition.title} পৃষ্ঠা ${imagePage?.pageNumber}`} className="epaper-page-image"/>{regions.map(region=>{const href=region.articleId?`/news/${region.articleId}`:region.targetPageNumber?`/epaper?page=${region.targetPageNumber}`:region.targetUrl||'#';const clip=region.shapeType==='l'?'polygon(0 0,38% 0,38% 62%,100% 62%,100% 100%,0 100%)':region.shapeType==='t'?'polygon(0 0,100% 0,100% 32%,62% 32%,62% 100%,38% 100%,38% 32%,0 32%)':undefined;return <Link key={region.id} href={href} className="epaper-hotspot" style={{left:`${Number(region.x)*100}%`,top:`${Number(region.y)*100}%`,width:`${Number(region.width)*100}%`,height:`${Number(region.height)*100}%`,clipPath:clip}} aria-label="সংবাদ পড়ুন"/>})}</div></div><div className="epaper-thumbnails">{current.pages.map((item:{id:number;pageNumber:number;imagePath:string},index:number)=><button key={item.id} className={index===page?'selected':''} onClick={()=>setPage(index)}><img src={item.imagePath} alt={`পৃষ্ঠা ${item.pageNumber}`}/><span>{item.pageNumber}</span></button>)}</div></>}</main>}


'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

type Region = {
  id: number
  pageId: number
  shapeType?: string
  points?: Array<{ x: number; y: number }>
  x: string
  y: string
  width: string
  height: string
  articleId: number | null
  targetPageNumber: number | null
  targetUrl: string | null
}

type PageItem = {
  id: number
  pageNumber: number
  imagePath: string
}

type LinkedArticle = {
  id: number
  titleBn: string
  excerptBn: string
  authorName: string
  imageUrl: string
  publishedAt: string
}

export default function EpaperPage() {
  const [editionId, setEditionId] = useState<number>()
  const [pageIndex, setPageIndex] = useState(0)

  // Active Clicked Region State
  const [activeRegion, setActiveRegion] = useState<Region | null>(null)

  const { data, isLoading } = useSWR(
    `/api/epaper${editionId ? `?edition=${editionId}` : ''}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const current = data?.current
  const editions = data?.editions || []
  const selected = useMemo(
    () => (editionId ? editions.find((item: { id: number }) => item.id === editionId) : editions[0]),
    [editionId, editions]
  )

  const pages: PageItem[] = current?.pages || []
  const imagePage = pages[pageIndex]
  const allRegions: Region[] = current?.allRegions || []
  const currentPageRegions = allRegions.filter(reg => reg.pageId === imagePage?.id)
  const linkedArticles: LinkedArticle[] = current?.linkedArticles || []

  // Close modal on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setActiveRegion(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Smart Two-Way Pairing: Finds BOTH the front-page lead AND inside continuation cuts
  const relatedRegions = useMemo(() => {
    if (!activeRegion) return []

    const currentRegionPage = pages.find(p => p.id === activeRegion.pageId)
    const currentPN = currentRegionPage?.pageNumber || 0

    // Set to collect unique related region IDs
    const matchedMap = new Map<number, Region>()
    matchedMap.set(activeRegion.id, activeRegion)

    // Match 1: By shared Article ID (if linked to same news article)
    if (activeRegion.articleId) {
      allRegions
        .filter(r => r.articleId === activeRegion.articleId)
        .forEach(r => matchedMap.set(r.id, r))
    }

    // Match 2: By Target Page Number linkage (Page 1 points to Page 2, or Page 2 points to Page 1)
    if (activeRegion.targetPageNumber) {
      const targetP = activeRegion.targetPageNumber
      allRegions
        .filter(r => {
          const rPage = pages.find(p => p.id === r.pageId)
          // Find region on target page that links back to current page, or shares continuation
          return rPage?.pageNumber === targetP && (r.targetPageNumber === currentPN || !r.targetPageNumber)
        })
        .forEach(r => matchedMap.set(r.id, r))
    }

    // Match 3: Reverse lookup (If another region points to this region's page)
    allRegions
      .filter(r => r.targetPageNumber === currentPN)
      .forEach(r => matchedMap.set(r.id, r))

    const list = Array.from(matchedMap.values())

    // Sort by page number so Page 1 always appears on the Left/First, and Page 2/3 appears on the Right/Second
    return list.sort((a, b) => {
      const pA = pages.find(p => p.id === a.pageId)?.pageNumber || 0
      const pB = pages.find(p => p.id === b.pageId)?.pageNumber || 0
      return pA - pB
    })
  }, [activeRegion, allRegions, pages])

  const activeArticle = activeRegion?.articleId
    ? linkedArticles.find(a => a.id === activeRegion.articleId)
    : null

  const getClipPath = (shapeType?: string, pts?: Array<{ x: number; y: number }>) => {
    if (shapeType === 'l') return 'polygon(0% 0%, 38% 0%, 38% 62%, 100% 62%, 100% 100%, 0% 100%)'
    if (shapeType === 't') return 'polygon(0% 0%, 100% 0%, 100% 32%, 62% 32%, 62% 100%, 38% 100%, 38% 32%, 0% 32%)'
    if (shapeType === 'polygon' && pts && pts.length >= 3) {
      return `polygon(${pts.map(p => `${(Number(p.x) * 100).toFixed(1)}% ${(Number(p.y) * 100).toFixed(1)}%`).join(', ')})`
    }
    return undefined
  }

  if (isLoading) {
    return (
      <main className="container main">
        <div className="section-kicker">
          <span>ই-পেপার</span>
          <i />
        </div>
        <div className="empty-state">
          <p>ই-পেপার লোড হচ্ছে…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="container main">
      <div className="section-kicker">
        <span>ই-পেপার</span>
        <i />
      </div>

      <div className="epaper-toolbar">
        <label>
          সংস্করণ{' '}
          <select
            value={selected?.id || ''}
            onChange={e => {
              setEditionId(Number(e.target.value))
              setPageIndex(0)
              setActiveRegion(null)
            }}
          >
            {editions.map((ed: { id: number; editionDate: string; title: string }) => (
              <option key={ed.id} value={ed.id}>
                {ed.editionDate} · {ed.title}
              </option>
            ))}
          </select>
        </label>
        <span>{pages.length} পৃষ্ঠা</span>
      </div>

      {!current ? (
        <div className="empty-state">
          <h1>কোনো প্রকাশিত ই-পেপার নেই</h1>
          <p>প্রকাশিত সংস্করণ পাওয়া গেলে এখানে প্রদর্শিত হবে।</p>
        </div>
      ) : (
        <>
          {/* Main Newspaper Page Viewer */}
          <div className="epaper-reader">
            <div className="epaper-page-wrap">
              <img
                src={imagePage?.imagePath}
                alt={`${current.edition.title} পৃষ্ঠা ${imagePage?.pageNumber}`}
                className="epaper-page-image"
              />

              {/* Clickable hotspots on newspaper page (One click opens both parts) */}
              {currentPageRegions.map(region => (
                <button
                  key={region.id}
                  type="button"
                  className="epaper-hotspot"
                  style={{
                    left: `${Number(region.x) * 100}%`,
                    top: `${Number(region.y) * 100}%`,
                    width: `${Number(region.width) * 100}%`,
                    height: `${Number(region.height) * 100}%`,
                    clipPath: getClipPath(region.shapeType, region.points),
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    background: 'transparent'
                  }}
                  onClick={() => setActiveRegion(region)}
                  title="সংবাদটি পড়ুন (ক্লিক করুন)"
                />
              ))}
            </div>
          </div>

          {/* Page Thumbnails Navigation */}
          <div className="epaper-thumbnails">
            {pages.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={idx === pageIndex ? 'selected' : ''}
                onClick={() => {
                  setPageIndex(idx)
                  setActiveRegion(null)
                }}
              >
                <img src={item.imagePath} alt={`পৃষ্ঠা ${item.pageNumber}`} />
                <span>পৃষ্ঠা {item.pageNumber}</span>
              </button>
            ))}
          </div>

          {/* Interactive Multi-Part News Overlay Section (Shows Both Cutouts Side-by-Side) */}
          {activeRegion && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(5px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '16px'
              }}
              onClick={() => setActiveRegion(null)}
            >
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  width: '100%',
                  maxWidth: relatedRegions.length > 1 ? '1100px' : '720px',
                  maxHeight: '94vh',
                  overflowY: 'auto',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                  padding: '24px',
                  position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Top Bar with Big Cut/Close Button */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '2px solid #f1f5f9',
                    paddingBottom: 14,
                    marginBottom: 20
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#c8102e',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 4
                      }}
                    >
                      দৈনিক কল্যাণ ই-পেপার
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                      {relatedRegions.length > 1
                        ? `সংযুক্ত সংবাদ: ${relatedRegions
                            .map(r => `পৃষ্ঠা ${pages.find(p => p.id === r.pageId)?.pageNumber || ''}`)
                            .join(' ও ')}`
                        : `পৃষ্ঠা ${pages.find(p => p.id === activeRegion.pageId)?.pageNumber || ''}`}
                    </span>
                  </div>

                  {/* Cut / Close Button */}
                  <button
                    type="button"
                    onClick={() => setActiveRegion(null)}
                    style={{
                      border: 0,
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: 20,
                      fontWeight: 'bold',
                      borderRadius: 999,
                      width: 36,
                      height: 36,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    title="কেটে দিন (বন্ধ করুন)"
                  >
                    ✕
                  </button>
                </div>

                {/* News Clippings Displayed Side-by-Side (উভয় অংশ একসাথে পাশাপাশি) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: relatedRegions.length > 1 ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr',
                    gap: '20px',
                    alignItems: 'start',
                    marginBottom: '22px'
                  }}
                >
                  {relatedRegions.map((reg, idx) => {
                    const regPage = pages.find(p => p.id === reg.pageId)
                    const rx = Number(reg.x)
                    const ry = Number(reg.y)
                    const rw = Number(reg.width)
                    const rh = Number(reg.height)

                    return (
                      <div
                        key={reg.id || idx}
                        style={{
                          background: '#f8fafc',
                          border: '2px solid #e2e8f0',
                          borderRadius: 10,
                          padding: 12,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                        }}
                      >
                        {/* Section Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 10,
                            paddingBottom: 6,
                            borderBottom: '1px solid #e2e8f0'
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#c8102e' }}>
                            {idx === 0
                              ? `📰 প্রথম অংশ (পৃষ্ঠা ${regPage?.pageNumber || ''} - মূল সংবাদ)`
                              : `📄 দ্বিতীয় অংশ (পৃষ্ঠা ${regPage?.pageNumber || ''} - ভিতরের কলাম)`}
                          </span>
                          <span style={{ fontSize: 11, background: '#e2e8f0', padding: '2px 8px', borderRadius: 999 }}>
                            অঞ্চল #{idx + 1}
                          </span>
                        </div>

                        {/* High-Resolution Cutout View */}
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: `${rw} / ${rh}`,
                            overflow: 'hidden',
                            borderRadius: 6,
                            backgroundColor: '#fff',
                            border: '1px solid #cbd5e1'
                          }}
                        >
                          <img
                            src={regPage?.imagePath}
                            alt="Newspaper Cutting"
                            style={{
                              position: 'absolute',
                              left: `-${(rx / rw) * 100}%`,
                              top: `-${(ry / rh) * 100}%`,
                              width: `${(1 / rw) * 100}%`,
                              height: `${(1 / rh) * 100}%`,
                              maxWidth: 'none',
                              maxHeight: 'none',
                              display: 'block',
                              clipPath: getClipPath(reg.shapeType, reg.points)
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Digital News Summary (if available) */}
                {activeArticle && (
                  <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: 16, marginBottom: 18 }}>
                    <h2 style={{ fontSize: 22, lineHeight: 1.35, color: '#0f172a', marginBottom: 8 }}>
                      {activeArticle.titleBn}
                    </h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
                      {activeArticle.authorName} · {activeArticle.publishedAt ? new Date(activeArticle.publishedAt).toLocaleDateString('bn-BD') : ''}
                    </p>
                    {activeArticle.excerptBn && (
                      <p style={{ fontSize: 15, lineHeight: 1.7, color: '#334155', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                        {activeArticle.excerptBn}
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setActiveRegion(null)}
                    style={{
                      padding: '10px 22px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#f1f5f9',
                      color: '#334155',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    ✕ বন্ধ করুন
                  </button>

                  {activeArticle && (
                    <Link
                      href={`/news/${activeArticle.id}`}
                      className="button button-primary"
                      style={{
                        padding: '10px 22px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontWeight: 700
                      }}
                    >
                      📰 মূল ওয়েবসাইটে সম্পূর্ণ প্রতিবেদন পড়ুন
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}