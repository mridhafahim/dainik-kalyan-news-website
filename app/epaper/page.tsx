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
import { useMemo, useState } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

type Region = {
  id: number
  pageId: number
  shapeType?: string
  x: string
  y: string
  width: string
  height: string
  articleId: number | null
  targetPageNumber: number | null
  targetUrl: string | null
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

  // Modal State for Clicked News Clip
  const [activeModalRegion, setActiveModalRegion] = useState<Region | null>(null)

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

  const imagePage = current?.pages?.[pageIndex]
  const regions: Region[] = (current?.allRegions || []).filter(
    (reg: Region) => reg.pageId === imagePage?.id
  )

  const linkedArticles: LinkedArticle[] = current?.linkedArticles || []

  // Find linked article details for active popup
  const activeArticle = activeModalRegion?.articleId
    ? linkedArticles.find(a => a.id === activeModalRegion.articleId)
    : null

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
              setActiveModalRegion(null)
            }}
          >
            {editions.map((ed: { id: number; editionDate: string; title: string }) => (
              <option key={ed.id} value={ed.id}>
                {ed.editionDate} · {ed.title}
              </option>
            ))}
          </select>
        </label>
        <span>{current?.pages?.length || 0} পৃষ্ঠা</span>
      </div>

      {!current ? (
        <div className="empty-state">
          <h1>কোনো প্রকাশিত ই-পেপার নেই</h1>
          <p>প্রকাশিত সংস্করণ পাওয়া গেলে এখানে প্রদর্শিত হবে।</p>
        </div>
      ) : (
        <>
          <div className="epaper-reader">
            <div className="epaper-page-wrap">
              <img
                src={imagePage?.imagePath}
                alt={`${current.edition.title} পৃষ্ঠা ${imagePage?.pageNumber}`}
                className="epaper-page-image"
              />

              {/* Hotspot regions on the page */}
              {regions.map(region => {
                const clip =
                  region.shapeType === 'l'
                    ? 'polygon(0% 0%, 38% 0%, 38% 62%, 100% 62%, 100% 100%, 0% 100%)'
                    : region.shapeType === 't'
                    ? 'polygon(0% 0%, 100% 0%, 100% 32%, 62% 32%, 62% 100%, 38% 100%, 38% 32%, 0% 32%)'
                    : undefined

                return (
                  <button
                    key={region.id}
                    type="button"
                    className="epaper-hotspot"
                    style={{
                      left: `${Number(region.x) * 100}%`,
                      top: `${Number(region.y) * 100}%`,
                      width: `${Number(region.width) * 100}%`,
                      height: `${Number(region.height) * 100}%`,
                      clipPath: clip,
                      cursor: 'pointer',
                      border: 0,
                      background: 'transparent'
                    }}
                    onClick={() => setActiveModalRegion(region)}
                    title="সংবাদটি পড়ুন ও বড় করে দেখুন"
                  />
                )
              })}
            </div>
          </div>

          {/* Page thumbnails */}
          <div className="epaper-thumbnails">
            {current.pages.map(
              (item: { id: number; pageNumber: number; imagePath: string }, idx: number) => (
                <button
                  key={item.id}
                  type="button"
                  className={idx === pageIndex ? 'selected' : ''}
                  onClick={() => {
                    setPageIndex(idx)
                    setActiveModalRegion(null)
                  }}
                >
                  <img src={item.imagePath} alt={`পৃষ্ঠা ${item.pageNumber}`} />
                  <span>পৃষ্ঠা {item.pageNumber}</span>
                </button>
              )
            )}
          </div>

          {/* News Clip Reader Popup Modal */}
          {activeModalRegion && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: 16
              }}
              onClick={() => setActiveModalRegion(null)}
            >
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  width: '100%',
                  maxWidth: '780px',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                  padding: 24,
                  position: 'relative'
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #e2e8f0',
                    paddingBottom: 12,
                    marginBottom: 16
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#c8102e' }}>
                    দৈনিক কল্যাণ ই-পেপার · পৃষ্ঠা {imagePage?.pageNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveModalRegion(null)}
                    style={{
                      border: 0,
                      background: '#f1f5f9',
                      fontSize: 18,
                      fontWeight: 'bold',
                      borderRadius: 999,
                      width: 32,
                      height: 32,
                      cursor: 'pointer'
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Newspaper Cutout View */}
                <div
                  style={{
                    overflow: 'hidden',
                    position: 'relative',
                    width: '100%',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    marginBottom: 20
                  }}
                >
                  <div
                    style={{
                      width: `${(1 / Number(activeModalRegion.width)) * 100}%`,
                      marginLeft: `-${(Number(activeModalRegion.x) / Number(activeModalRegion.width)) * 100}%`,
                      marginTop: `-${(Number(activeModalRegion.y) / Number(activeModalRegion.height)) * 100}%`
                    }}
                  >
                    <img
                      src={imagePage?.imagePath}
                      alt="Newspaper Cutting"
                      style={{ width: '100%', display: 'block' }}
                    />
                  </div>
                </div>

                {/* Linked Article Details (if available) */}
                {activeArticle ? (
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 24, lineHeight: 1.3, marginBottom: 8, color: '#0f172a' }}>
                      {activeArticle.titleBn}
                    </h2>
                    <p style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
                      {activeArticle.authorName} · {activeArticle.publishedAt ? new Date(activeArticle.publishedAt).toLocaleDateString('bn-BD') : ''}
                    </p>
                    {activeArticle.excerptBn && (
                      <p style={{ fontSize: 16, lineHeight: 1.7, color: '#334155', background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                        {activeArticle.excerptBn}
                      </p>
                    )}
                  </div>
                ) : null}

                {/* Actions & Next Column Continuation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* If the news continues on inside pages */}
                  {activeModalRegion.targetPageNumber && (
                    <button
                      type="button"
                      className="button"
                      style={{
                        background: '#0284c7',
                        color: '#fff',
                        padding: '12px 18px',
                        fontSize: 15,
                        fontWeight: 700,
                        border: 0,
                        borderRadius: 6,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                      onClick={() => {
                        const targetIdx = (current.pages || []).findIndex(
                          (p: { pageNumber: number }) => p.pageNumber === activeModalRegion.targetPageNumber
                        )
                        if (targetIdx >= 0) setPageIndex(targetIdx)
                        setActiveModalRegion(null)
                      }}
                    >
                      📄 বাকি অংশ (পৃষ্ঠা {activeModalRegion.targetPageNumber})-এ দেখুন →
                    </button>
                  )}

                  {/* Read complete news on main portal */}
                  {activeArticle && (
                    <Link
                      href={`/news/${activeArticle.id}`}
                      className="button button-primary"
                      style={{
                        padding: '12px 18px',
                        fontSize: 15,
                        fontWeight: 700,
                        textAlign: 'center',
                        textDecoration: 'none',
                        borderRadius: 6
                      }}
                    >
                      📰 মূল ওয়েবসাইটে সম্পূর্ণ প্রতিবেদনটি পড়ুন
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