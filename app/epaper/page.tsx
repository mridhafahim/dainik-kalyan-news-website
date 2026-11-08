'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { SiteChrome } from '@/components/layout/SiteChrome'

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
  targetUrl: string | null // ইউনিক স্টোরি গ্রুপ আইডি
}

type PageItem = {
  id: number
  pageNumber: number
  imagePath: string
  specialName?: string | null
}

type LinkedArticle = {
  id: number
  titleBn: string
  excerptBn: string
  authorName: string
  imageUrl: string
  publishedAt: string
}

function generatePdfFromJpeg(jpegDataUrl: string, width: number, height: number, filename: string) {
  const base64Data = jpegDataUrl.split(',')[1]
  const binaryStr = atob(base64Data)
  const len = binaryStr.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i)
  }

  const ptWidth = 595.28
  const ptHeight = (height / width) * ptWidth

  const contentStream = `q ${ptWidth.toFixed(2)} 0 0 ${ptHeight.toFixed(2)} 0 0 cm /Im1 Do Q`
  
  let pdf = `%PDF-1.4\n`
  const offsets: number[] = [0]

  offsets.push(pdf.length)
  pdf += `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`

  offsets.push(pdf.length)
  pdf += `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`

  offsets.push(pdf.length)
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptWidth.toFixed(2)} ${ptHeight.toFixed(2)}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`

  offsets.push(pdf.length)
  pdf += `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`

  offsets.push(pdf.length)
  const obj5Header = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`
  const obj5Footer = `\nendstream\nendobj\n`

  const headerBuf = new TextEncoder().encode(pdf + obj5Header)
  const footerBuf = new TextEncoder().encode(obj5Footer)

  const xrefOffset = headerBuf.length + bytes.length + footerBuf.length

  let xref = `xref\n0 6\n0000000000 65535 f \n`
  for (let i = 1; i <= 5; i++) {
    const off = i === 5 ? (headerBuf.length - obj5Header.length) : offsets[i]
    xref += `${String(off).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  const xrefBuf = new TextEncoder().encode(xref)
  const finalBlob = new Blob([headerBuf, bytes, footerBuf, xrefBuf], { type: 'application/pdf' })
  const blobUrl = URL.createObjectURL(finalBlob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

export default function EpaperPage() {
  const [editionId, setEditionId] = useState<number>()
  const [pageIndex, setPageIndex] = useState(0)
  const [activeRegion, setActiveRegion] = useState<Region | null>(null)

  const [selectedSpecialSection, setSelectedSpecialSection] = useState<string>('all')
  const [downloading, setDownloading] = useState(false)

  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showConverter, setShowConverter] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)

  const [inputText, setInputText] = useState('')
  const [convertedText, setConvertedText] = useState('')
  const [converterMode, setConverterMode] = useState<'avroToBijoy' | 'bijoyToAvro'>('avroToBijoy')

  const { data, isLoading } = useSWR(
    `/api/epaper${editionId ? `?edition=${editionId}` : ''}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const current = data?.current
  const editions = data?.editions || []
  const selected = useMemo(
    () => (editionId ? editions.find((item: any) => item.id === editionId) : editions[0]),
    [editionId, editions]
  )

  const rawPages: PageItem[] = current?.pages || []

  const pages: PageItem[] = useMemo(() => {
    if (selectedSpecialSection === 'all') return rawPages
    return rawPages.filter(p => p.specialName === selectedSpecialSection)
  }, [rawPages, selectedSpecialSection])

  const availableSpecialSections = useMemo(() => {
    const names = rawPages.map(p => p.specialName).filter(Boolean) as string[]
    return Array.from(new Set(names))
  }, [rawPages])

  const imagePage = pages[pageIndex] || pages[0]
  const allRegions: Region[] = current?.allRegions || []
  const currentPageRegions = allRegions.filter(reg => reg.pageId === imagePage?.id)
  const linkedArticles: LinkedArticle[] = current?.linkedArticles || []

  async function downloadCurrentPage(format: 'jpg' | 'pdf') {
    if (!imagePage?.imagePath) return
    setDownloading(true)
    setShowDownloadMenu(false)

    try {
      const pageImg = new Image()
      pageImg.crossOrigin = 'anonymous'
      await new Promise((resolve, reject) => {
        pageImg.onload = resolve
        pageImg.onerror = reject
        pageImg.src = imagePage.imagePath
      })

      const canvas = document.createElement('canvas')
      canvas.width = pageImg.naturalWidth || 1800
      canvas.height = pageImg.naturalHeight || 2500
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas error')

      ctx.drawImage(pageImg, 0, 0, canvas.width, canvas.height)

      try {
        const wmImg = new Image()
        wmImg.crossOrigin = 'anonymous'
        await new Promise(resolve => {
          wmImg.onload = resolve
          wmImg.onerror = resolve
          wmImg.src = '/watermark-ka.png'
        })
        if (wmImg.complete && wmImg.naturalWidth) {
          ctx.save()
          ctx.globalAlpha = 0.25
          const wmSize = Math.min(canvas.width, canvas.height) * 0.45
          const wx = (canvas.width - wmSize) / 2
          const wy = (canvas.height - wmSize) / 2
          ctx.drawImage(wmImg, wx, wy, wmSize, wmSize)
          ctx.restore()
        }
      } catch {}

      const filenameBase = `dainik-kalyan-page-${imagePage.pageNumber}`

      if (format === 'jpg') {
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.95)
        const a = document.createElement('a')
        a.href = jpegUrl
        a.download = `${filenameBase}.jpg`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else if (format === 'pdf') {
        const jpegUrl = canvas.toDataURL('image/jpeg', 0.92)
        generatePdfFromJpeg(jpegUrl, canvas.width, canvas.height, `${filenameBase}.pdf`)
      }
    } catch (err) {
      alert('ডাউনলোড করতে সমস্যা হয়েছে: ' + (err instanceof Error ? err.message : 'ত্রুটি'))
    } finally {
      setDownloading(false)
    }
  }

  // নির্ভুল আইসোলেটেড পেয়ারিং লজিক (শুধুমাত্র এই নির্দিষ্ট খবরের অংশগুলোই ম্যাচ করবে)
  const relatedRegions = useMemo(() => {
    if (!activeRegion) return []

    const matchedMap = new Map<number, Region>()
    matchedMap.set(activeRegion.id, activeRegion)

    // ১. যদি ইউনিক স্টোরি গ্রুপ আইডি (group:xxx) থাকে
    if (activeRegion.targetUrl && activeRegion.targetUrl.startsWith('group:')) {
      const gId = activeRegion.targetUrl
      allRegions.filter(r => r.targetUrl === gId).forEach(r => matchedMap.set(r.id, r))
    }
    // ২. যদি সরাসরি নিউজ আর্টিকেল আইডি থাকে
    else if (activeRegion.articleId) {
      allRegions.filter(r => r.articleId === activeRegion.articleId).forEach(r => matchedMap.set(r.id, r))
    }

    const list = Array.from(matchedMap.values())

    return list.sort((a, b) => {
      const pA = rawPages.find(p => p.id === a.pageId)?.pageNumber || 0
      const pB = rawPages.find(p => p.id === b.pageId)?.pageNumber || 0
      return pA - pB
    })
  }, [activeRegion, allRegions, rawPages])

  const activeArticle = activeRegion?.articleId
    ? linkedArticles.find(a => a.id === activeRegion.articleId)
    : null

  function shareTo(platform: string) {
    const url = encodeURIComponent(window.location.href)
    const title = encodeURIComponent(current?.edition?.title || 'দৈনিক কল্যাণ ই-পেপার')
    let link = ''

    if (platform === 'facebook') link = `https://www.facebook.com/sharer/sharer.php?u=${url}`
    if (platform === 'twitter') link = `https://twitter.com/intent/tweet?url=${url}&text=${title}`
    if (platform === 'whatsapp') link = `https://api.whatsapp.com/send?text=${title}%20${url}`
    if (platform === 'linkedin') link = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`

    if (link) window.open(link, '_blank', 'width=600,height=400')
    setShowShareMenu(false)
  }

  return (
    <SiteChrome>
      <main className="container main" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        <div className="section-kicker" style={{ marginTop: 14 }}>
          <span>ই-পেপার</span>
          <i />
        </div>

        {/* Toolbar */}
        <div
          className="epaper-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '12px 16px',
            margin: '14px 0'
          }}
        >
          {/* Left: Date & Special Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700 }}>
              📅 তারিখ:
              <input
                type="date"
                value={selected?.editionDate || ''}
                onChange={e => {
                  const targetDate = e.target.value
                  const found = editions.find((ed: any) => ed.editionDate === targetDate)
                  if (found) {
                    setEditionId(found.id)
                    setPageIndex(0)
                  } else {
                    alert(`${targetDate} তারিখের কোনো ই-পেপার নেই।`)
                  }
                }}
                style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
              />
            </label>

            {availableSpecialSections.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#c8102e' }}>
                ⭐ বিশেষ সংখ্যা:
                <select
                  value={selectedSpecialSection}
                  onChange={e => {
                    setSelectedSpecialSection(e.target.value)
                    setPageIndex(0)
                  }}
                  style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="all">মূল পত্রিকা (সব পৃষ্ঠা)</option>
                  {availableSpecialSections.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button-ghost"
              style={{ fontSize: 13, padding: '6px 12px', borderRadius: 4 }}
              onClick={() => setShowConverter(true)}
            >
              🔤 অভ্র ⇄ বিজয়
            </button>

            {/* Share Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="button button-ghost"
                style={{ fontSize: 13, padding: '6px 12px', borderRadius: 4 }}
                onClick={() => { setShowShareMenu(prev => !prev); setShowDownloadMenu(false); }}
              >
                📤 শেয়ার ▾
              </button>

              {showShareMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 8, display: 'grid', gap: 6, zIndex: 100, minWidth: 160 }}>
                  <button type="button" onClick={() => shareTo('facebook')} style={{ textAlign: 'left', padding: '6px 10px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>Facebook</button>
                  <button type="button" onClick={() => shareTo('twitter')} style={{ textAlign: 'left', padding: '6px 10px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>X (Twitter)</button>
                  <button type="button" onClick={() => shareTo('whatsapp')} style={{ textAlign: 'left', padding: '6px 10px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>WhatsApp</button>
                  <button type="button" onClick={() => shareTo('linkedin')} style={{ textAlign: 'left', padding: '6px 10px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13 }}>LinkedIn</button>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(window.location.href); alert('লিংক কপি হয়েছে!'); setShowShareMenu(false); }} style={{ textAlign: 'left', padding: '6px 10px', borderTop: '1px solid #f1f5f9', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#2563eb' }}>🔗 লিংক কপি</button>
                </div>
              )}
            </div>

            {/* Download Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="button button-primary"
                disabled={downloading}
                style={{ fontSize: 13, padding: '6px 14px', borderRadius: 4 }}
                onClick={() => { setShowDownloadMenu(prev => !prev); setShowShareMenu(false); }}
              >
                {downloading ? 'প্রসেস হচ্ছে...' : '⬇️ ডাউনলোড ▾'}
              </button>

              {showDownloadMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: 8, display: 'grid', gap: 6, zIndex: 100, minWidth: 190 }}>
                  <button
                    type="button"
                    onClick={() => downloadCurrentPage('jpg')}
                    style={{ textAlign: 'left', padding: '8px 12px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 4 }}
                  >
                    🖼️ JPG ডাউনলোড (জলছাপসহ)
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCurrentPage('pdf')}
                    style={{ textAlign: 'left', padding: '8px 12px', border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13, borderRadius: 4, color: '#c8102e', fontWeight: 600 }}
                  >
                    📄 আসল PDF ডাউনলোড (জলছাপসহ)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Newspaper Reader View */}
        {isLoading ? (
          <div className="empty-state"><p>ই-পেপার লোড হচ্ছে…</p></div>
        ) : !current ? (
          <div className="empty-state"><h1>কোনো প্রকাশিত ই-পেপার নেই</h1></div>
        ) : (
          <>
            <div className="epaper-reader" style={{ background: '#e2e8f0', padding: 20, borderRadius: 10 }}>
              <div className="epaper-page-wrap" style={{ position: 'relative', maxWidth: 900, margin: '0 auto', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
                <img
                  src={imagePage?.imagePath}
                  alt={`${current.edition.title} পৃষ্ঠা ${imagePage?.pageNumber}`}
                  className="epaper-page-image"
                  style={{ width: '100%', display: 'block' }}
                />

                {/* Hotspots */}
                {currentPageRegions.map(region => (
                  <button
                    key={region.id}
                    type="button"
                    className="epaper-hotspot"
                    style={{
                      position: 'absolute',
                      left: `${Number(region.x) * 100}%`,
                      top: `${Number(region.y) * 100}%`,
                      width: `${Number(region.width) * 100}%`,
                      height: `${Number(region.height) * 100}%`,
                      cursor: 'pointer',
                      border: '1.5px solid transparent',
                      background: 'transparent',
                      zIndex: 10
                    }}
                    onClick={() => setActiveRegion(region)}
                    title="সংবাদটি পড়তে ক্লিক করুন"
                  />
                ))}
              </div>
            </div>

            {/* Page Thumbnails */}
            <div className="epaper-thumbnails" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '16px 0' }}>
              {pages.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  className={idx === pageIndex ? 'selected' : ''}
                  style={{ border: idx === pageIndex ? '2px solid #c8102e' : '1px solid #cbd5e1', padding: 4, borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                  onClick={() => {
                    setPageIndex(idx)
                    setActiveRegion(null)
                  }}
                >
                  <img src={item.imagePath} alt={`পৃষ্ঠা ${item.pageNumber}`} style={{ width: 75, height: 95, objectFit: 'cover' }} />
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, marginTop: 4 }}>
                    পৃষ্ঠা {item.pageNumber}
                    {item.specialName && <small style={{ display: 'block', color: '#c8102e' }}>({item.specialName})</small>}
                  </span>
                </button>
              ))}
            </div>

            {/* Modal with Guaranteed Visible 'ক' Watermark on Top */}
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
                  {/* Modal Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: 14, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ background: '#c8102e', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 4 }}>
                        দৈনিক কল্যাণ ই-পেপার
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>
                        {relatedRegions.length > 1
                          ? `সংযুক্ত পৃষ্ঠা: ${relatedRegions.map(r => `পৃষ্ঠা ${rawPages.find(p => p.id === r.pageId)?.pageNumber || ''}`).join(' ও ')}`
                          : `পৃষ্ঠা ${rawPages.find(p => p.id === activeRegion.pageId)?.pageNumber || ''}`}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveRegion(null)}
                      style={{ border: 0, background: '#fee2e2', color: '#b91c1c', fontSize: 20, fontWeight: 'bold', borderRadius: 999, width: 36, height: 36, cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Cutout Display with Watermark ON TOP (zIndex: 10) */}
                  <div style={{ display: 'grid', gridTemplateColumns: relatedRegions.length > 1 ? 'repeat(auto-fit, minmax(320px, 1fr))' : '1fr', gap: '20px', marginBottom: '22px' }}>
                    {relatedRegions.map((reg, idx) => {
                      const regPage = rawPages.find(p => p.id === reg.pageId)
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
                            padding: 12
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#c8102e' }}>
                              {idx === 0
                                ? `📰 প্রথম অংশ (পৃষ্ঠা ${regPage?.pageNumber || ''} - মূল সংবাদ)`
                                : `📄 দ্বিতীয় অংশ (পৃষ্ঠা ${regPage?.pageNumber || ''} - ভিতরের কলাম)`}
                            </span>
                          </div>

                          {/* Cutout View with 'ক' Watermark Stamp OVER the text */}
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
                            {/* Newspaper Cutout Image */}
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
                                display: 'block'
                              }}
                            />

                            {/* Centered Bold 'ক' Watermark Stamped OVER the newspaper */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                zIndex: 10,
                                opacity: 0.28
                              }}
                            >
                              <img
                                src="/watermark-ka.png"
                                alt="ক জলছাপ"
                                style={{ width: '45%', maxWidth: 180, objectFit: 'contain' }}
                                onError={(e) => {
                                  // Fallback to logofinal-1.png if watermark-ka.png is named differently
                                  const target = e.currentTarget
                                  if (!target.src.includes('logofinal-1.png')) {
                                    target.src = '/logofinal-1.png'
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {activeArticle && (
                    <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: 16 }}>
                      <h2 style={{ fontSize: 22, color: '#0f172a', marginBottom: 8 }}>{activeArticle.titleBn}</h2>
                      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>{activeArticle.authorName}</p>
                      {activeArticle.excerptBn && (
                        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#334155', background: '#f8fafc', padding: 12, borderRadius: 8 }}>
                          {activeArticle.excerptBn}
                        </p>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => setActiveRegion(null)}
                      style={{ padding: '10px 22px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f1f5f9', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✕ বন্ধ করুন
                    </button>
                    {activeArticle && (
                      <Link
                        href={`/news/${activeArticle.id}`}
                        className="button button-primary"
                        style={{ padding: '10px 22px', borderRadius: 6, textDecoration: 'none', fontWeight: 700 }}
                      >
                        📰 মূল ওয়েবসাইটে পড়ুন
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Converter Modal */}
            {showConverter && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  backgroundColor: 'rgba(15, 23, 42, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99999,
                  padding: 16
                }}
                onClick={() => setShowConverter(false)}
              >
                <div style={{ backgroundColor: '#fff', borderRadius: 12, maxWidth: 650, width: '100%', padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>🔤 অভ্র ⇄ বিজয় টেক্সট কনভার্টার</h3>
                    <button type="button" onClick={() => setShowConverter(false)} style={{ border: 0, background: '#f1f5f9', borderRadius: 999, width: 30, height: 30, cursor: 'pointer', fontWeight: 700 }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <button type="button" className={`button ${converterMode === 'avroToBijoy' ? 'button-primary' : 'button-ghost'}`} style={{ flex: 1, padding: 8 }} onClick={() => setConverterMode('avroToBijoy')}>অভ্র/ইউনিকোড থেকে বিজয়</button>
                    <button type="button" className={`button ${converterMode === 'bijoyToAvro' ? 'button-primary' : 'button-ghost'}`} style={{ flex: 1, padding: 8 }} onClick={() => setConverterMode('bijoyToAvro')}>বিজয় থেকে অভ্র/ইউনিকোড</button>
                  </div>

                  <textarea rows={4} value={inputText} onChange={e => setInputText(e.target.value)} placeholder="এখানে টেক্সট লিখুন বা পেস্ট করুন..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', marginBottom: 12 }} />
                  <button type="button" className="button button-green" style={{ width: '100%', padding: 10, fontWeight: 700, marginBottom: 12 }} onClick={() => setConvertedText(inputText)}>কনভার্ট করুন</button>
                  <textarea rows={4} readOnly value={convertedText} placeholder="কনভার্ট করা ফলাফল এখানে আসবে..." style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', marginBottom: 12 }} />
                  <button type="button" className="button button-primary" style={{ width: '100%', padding: 8 }} onClick={() => { navigator.clipboard.writeText(convertedText); alert('কপি হয়েছে!'); }}>📋 কপি করুন</button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </SiteChrome>
  )
}