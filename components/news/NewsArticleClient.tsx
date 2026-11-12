'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ZoomIn, ZoomOut, Download, Copy, Check, Image as ImageIcon, Mail, Share2, X } from 'lucide-react'

interface Story {
  id: number
  titleBn: string
  excerptBn?: string | null
  bodyBn?: string | null
  imageUrl?: string | null
  authorName: string
  publishedAt?: string | Date | null
  createdAt?: string | Date | null
  tags?: string[] | null
}

const LOGO_PATH = '/dainik-kalyan-logo.png'

export default function NewsArticleClient({
  story,
  rightSidebarStories,
  bottomRelatedStories,
}: {
  story: Story
  rightSidebarStories: Story[]
  bottomRelatedStories: Story[]
}) {
  const [fontSize, setFontSize] = useState(18)
  const [copied, setCopied] = useState(false)
  const [pageUrl, setPageUrl] = useState('')
  const [photocardDataUrl, setPhotocardDataUrl] = useState<string | null>(null)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  useEffect(() => {
    setPageUrl(window.location.href)
  }, [])

  const rawDate = story.publishedAt || story.createdAt || new Date()
  const dateObj = new Date(rawDate)
  const formattedDate = dateObj.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
  const formattedTime = dateObj.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true })

  const handleCopy = () => {
    navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // আসল PDF ডাউনলোড (উপরে দৈনিক কল্যাণ লোগো + ফ্রেমসহ)
  const handleDownloadPdf = async () => {
    setGeneratingPdf(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1240
      canvas.height = 1754
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // বাইরের সুন্দর ফ্রেম
      ctx.strokeStyle = '#c8102e'
      ctx.lineWidth = 8
      ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72)
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2
      ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96)

      // উপরে লোগো আঁকা
      const logo = new Image()
      logo.crossOrigin = 'anonymous'
      logo.src = LOGO_PATH
      await new Promise(r => { logo.onload = r; logo.onerror = r })
      if (logo.naturalWidth) {
        const lh = 75
        const lw = (logo.naturalWidth / logo.naturalHeight) * lh
        ctx.drawImage(logo, (canvas.width - lw) / 2, 74, lw, lh)
      } else {
        ctx.fillStyle = '#c8102e'
        ctx.font = 'bold 46px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('দৈনিক কল্যাণ', canvas.width / 2, 120)
      }

      ctx.textAlign = 'center'
      ctx.fillStyle = '#475569'
      ctx.font = '18px sans-serif'
      ctx.fillText('বস্তুনিষ্ঠতায় আমাদের অহংকার · www.dainikkalyan.com', canvas.width / 2, 174)

      ctx.strokeStyle = '#c8102e'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(80, 194)
      ctx.lineTo(canvas.width - 80, 194)
      ctx.stroke()

      // শিরোনাম র‍্যাপ করে লেখা
      ctx.textAlign = 'left'
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 38px sans-serif'
      let y = 250
      const maxW = canvas.width - 160
      const words = story.titleBn.split(' ')
      let line = ''
      for (const w of words) {
        const test = line + w + ' '
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(line.trim(), 80, y)
          line = w + ' '
          y += 48
        } else {
          line = test
        }
      }
      if (line.trim()) {
        ctx.fillText(line.trim(), 80, y)
        y += 44
      }

      // প্রতিবেদক, তারিখ ও সময়
      ctx.fillStyle = '#64748b'
      ctx.font = '20px sans-serif'
      ctx.fillText(`${story.authorName}  |  ${formattedDate}, ${formattedTime}`, 80, y + 6)
      y += 40

      // ছবি থাকলে আঁকা
      if (story.imageUrl) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = story.imageUrl
        await new Promise(r => { img.onload = r; img.onerror = r })
        if (img.naturalWidth) {
          const imgH = 440
          const imgW = maxW
          ctx.drawImage(img, 80, y, imgW, imgH)
          y += imgH + 40
        }
      }

      // মূল সংবাদ লেখা
      ctx.fillStyle = '#1e293b'
      ctx.font = '24px sans-serif'
      const bodyText = (story.bodyBn || story.excerptBn || '').replace(/\n+/g, ' \n ')
      for (const para of bodyText.split('\n')) {
        let pLine = ''
        for (const w of para.split(' ')) {
          const test = pLine + w + ' '
          if (ctx.measureText(test).width > maxW) {
            if (y < canvas.height - 95) ctx.fillText(pLine.trim(), 80, y)
            pLine = w + ' '
            y += 36
          } else {
            pLine = test
          }
        }
        if (pLine.trim() && y < canvas.height - 95) {
          ctx.fillText(pLine.trim(), 80, y)
          y += 44
        }
      }

      // ক্যানভাস থেকে বিশুদ্ধ PDF বাইনারি তৈরি
      const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const binStr = atob(imgDataUrl.split(',')[1])
      const imgBytes = new Uint8Array(binStr.length)
      for (let i = 0; i < binStr.length; i++) imgBytes[i] = binStr.charCodeAt(i)

      const encoder = new TextEncoder()
      const parts: (Uint8Array | string)[] = []
      let offset = 0
      const offsets: number[] = []
      const pushStr = (s: string) => { const b = encoder.encode(s); parts.push(b); offset += b.length }

      pushStr('%PDF-1.4\n')
      const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
      offsets.push(offset); pushStr(obj1)
      const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'
      offsets.push(offset); pushStr(obj2)
      const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'
      offsets.push(offset); pushStr(obj3)
      offsets.push(offset)
      pushStr(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`)
      parts.push(imgBytes); offset += imgBytes.length
      pushStr('\nendstream\nendobj\n')
      const streamContent = 'q\n595 0 0 842 0 0 cm\n/Im0 Do\nQ\n'
      offsets.push(offset)
      pushStr(`5 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}endstream\nendobj\n`)

      const xrefPos = offset
      pushStr(`xref\n0 6\n0000000000 65535 f \n`)
      for (const off of offsets) pushStr(String(off).padStart(10, '0') + ' 00000 n \n')
      pushStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`)

      const blob = new Blob(parts as unknown as BlobPart[], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Dainik-Kalyan-News-${story.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ফটোকার্ড জেনারেটর (আপনার দেওয়া নীল ফটোকার্ড থিম অনুযায়ী)
  const handleGeneratePhotocard = async () => {
    setGeneratingCard(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1080
      const ctx = canvas.getContext('2d')!

      // ওপরের অংশে সংবাদের ছবি
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, 1080, 560)
      if (story.imageUrl) {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.src = story.imageUrl
        await new Promise(r => { img.onload = r; img.onerror = r })
        if (img.naturalWidth) {
          const scale = Math.max(1080 / img.naturalWidth, 560 / img.naturalHeight)
          const dw = img.naturalWidth * scale
          const dh = img.naturalHeight * scale
          ctx.drawImage(img, (1080 - dw) / 2, (560 - dh) / 2, dw, dh)
        }
      }

      // নিচের নীল গ্রেডিয়েন্ট ব্যাকগ্রাউন্ড
      const grad = ctx.createLinearGradient(0, 520, 0, 1080)
      grad.addColorStop(0, 'rgba(12, 77, 162, 0.92)')
      grad.addColorStop(0.2, '#0c4da2')
      grad.addColorStop(1, '#072f6b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 530, 1080, 550)

      // সাদা বর্ডার বক্স
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 3
      ctx.strokeRect(56, 565, 968, 250)

      // সাদা শিরোনাম (বক্সের মাঝখানে)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 42px sans-serif'
      ctx.textAlign = 'center'
      const words = story.titleBn.split(' ')
      const lines: string[] = []
      let curr = ''
      for (const w of words) {
        const test = curr + w + ' '
        if (ctx.measureText(test).width > 900) {
          lines.push(curr.trim())
          curr = w + ' '
        } else {
          curr = test
        }
      }
      if (curr.trim()) lines.push(curr.trim())
      const startY = 690 - ((lines.slice(0, 3).length - 1) * 28)
      lines.slice(0, 3).forEach((ln, idx) => {
        ctx.fillText(ln, 540, startY + idx * 56)
      })

      // নিচে সাদা রঙে দৈনিক কল্যাণ লোগো
      const logo = new Image()
      logo.crossOrigin = 'anonymous'
      logo.src = LOGO_PATH
      await new Promise(r => { logo.onload = r; logo.onerror = r })
      if (logo.naturalWidth) {
        ctx.save()
        ctx.filter = 'brightness(0) invert(1)'
        const lh = 56
        const lw = (logo.naturalWidth / logo.naturalHeight) * lh
        ctx.drawImage(logo, (1080 - lw) / 2, 855, lw, lh)
        ctx.restore()
      } else {
        ctx.fillStyle = '#fde047'
        ctx.font = 'bold 46px sans-serif'
        ctx.fillText('দৈনিক কল্যাণ', 540, 900)
      }

      // জেনারেশনের লাইভ তারিখ ও সময়
      const genNow = new Date()
      const genDate = genNow.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
      const genTime = genNow.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', hour12: true })

      ctx.textAlign = 'left'
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 22px sans-serif'
      ctx.fillText(`${genDate} · ${genTime}`, 56, 1020)

      // মাঝখানে সাদা পিল "বিস্তারিত কমেন্টে"
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(410, 986, 260, 48, 12)
      ctx.fill()
      ctx.fillStyle = '#0f172a'
      ctx.textAlign = 'center'
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText('বিস্তারিত কমেন্টে', 540, 1018)

      // ডানদিকে ওয়েবসাইট
      ctx.textAlign = 'right'
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '22px sans-serif'
      ctx.fillText('www.dainikkalyan.com', 1024, 1020)

      setPhotocardDataUrl(canvas.toDataURL('image/png'))
    } finally {
      setGeneratingCard(false)
    }
  }

  return (
    <main className="container main" style={{ maxWidth: 1380, width: '94%', margin: '0 auto', padding: '20px 0 60px' }}>
      <p className="breadcrumb" style={{ marginBottom: 14, fontSize: 13, color: '#64748b' }}>
        <Link href="/">প্রচ্ছদ</Link> / <span>সংবাদ</span>
      </p>

      <div className="news-detail-grid">
        {/* বাম পাশ: মূল সংবাদ ও নিচে "আরও পড়ুন" */}
        <div>
          <article style={{ background: '#fff', padding: '24px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div className="section-kicker"><span>সংবাদ</span><i /></div>

            <h1 style={{ fontSize: 'clamp(24px, 3.6vw, 44px)', lineHeight: 1.22, margin: '10px 0 16px', color: '#0f172a', fontWeight: 800 }}>
              {story.titleBn}
            </h1>

            {/* শিরোনামের নিচে: বামে প্রতিবেদক, তারিখ ও সময় | ডানে শেয়ার, কপি, PDF, জুম, ফটোকার্ড */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: '#475569', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span style={{ background: '#fee2e2', color: '#c8102e', padding: '3px 10px', borderRadius: 999, fontWeight: 700 }}>
                  {story.authorName || 'নিজস্ব প্রতিবেদক'}
                </span>
                <span>📅 {formattedDate}</span>
                <span>🕒 {formattedTime}</span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook-এ শেয়ার করুন"
                  style={{ background: '#1877f2', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                >
                  Facebook
                </a>

                {/* WhatsApp */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(story.titleBn + ' ' + pageUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp-এ শেয়ার করুন"
                  style={{ background: '#25d366', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}
                >
                  WhatsApp
                </a>

                {/* Email */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(story.titleBn)}&body=${encodeURIComponent(pageUrl)}`}
                  title="ইমেইলে পাঠান"
                  style={{ background: '#475569', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Mail size={13} /> Email
                </a>

                {/* Copy Link */}
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {copied ? <Check size={13} color="#16a34a" /> : <Copy size={13} />} {copied ? 'কপি হয়েছে' : 'লিংক কপি'}
                </button>

                {/* PDF Download */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={generatingPdf}
                  style={{ background: '#c8102e', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Download size={13} /> {generatingPdf ? 'তৈরি হচ্ছে...' : 'PDF'}
                </button>

                {/* Photocard */}
                <button
                  type="button"
                  onClick={handleGeneratePhotocard}
                  disabled={generatingCard}
                  style={{ background: '#0c4da2', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <ImageIcon size={13} /> {generatingCard ? 'লোড...' : 'ফটোকার্ড'}
                </button>

                {/* Zoom Controls */}
                <button
                  type="button"
                  onClick={() => setFontSize(f => Math.max(14, f - 2))}
                  title="লেখা ছোট করুন"
                  style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setFontSize(f => Math.min(28, f + 2))}
                  title="লেখা বড় করুন"
                  style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                >
                  <ZoomIn size={14} />
                </button>
              </div>
            </div>

            {story.imageUrl && (
              <img
                src={story.imageUrl}
                alt={story.titleBn}
                style={{ width: '100%', maxHeight: 500, objectFit: 'cover', borderRadius: 8, marginBottom: 20 }}
              />
            )}

            <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: '#1e293b', transition: 'font-size 0.15s ease' }}>
              {story.bodyBn || story.excerptBn}
            </div>

            {Array.isArray(story.tags) && story.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 26, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>ট্যাগ:</span>
                {story.tags.map(t => (
                  <span key={t} style={{ background: '#f1f5f9', color: '#334155', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </article>

          {/* নিচে ২ কলামের "আরও পড়ুন" সেকশন (ডান পাশের খবরের থেকে সম্পূর্ণ আলাদা) */}
          {bottomRelatedStories.length > 0 && (
            <section style={{ marginTop: 32 }}>
              <div className="section-kicker" style={{ marginBottom: 18 }}>
                <span>আরও পড়ুন</span>
                <i />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
                {bottomRelatedStories.map(item => (
                  <article key={item.id} style={{ background: '#fff', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      {item.imageUrl && (
                        <Link href={`/news/${item.id}`}>
                          <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', marginBottom: 10 }}>
                            <img src={item.imageUrl} alt={item.titleBn} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        </Link>
                      )}
                      <h3 style={{ fontSize: 17, lineHeight: 1.35, margin: '0 0 8px', color: '#0f172a' }}>
                        <Link href={`/news/${item.id}`}>{item.titleBn}</Link>
                      </h3>
                      {item.excerptBn && <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>{item.excerptBn.slice(0, 95)}...</p>}
                    </div>
                    <small style={{ color: '#94a3b8', fontSize: 11, marginTop: 10 }}>{item.authorName}</small>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ডান পাশের সাইডবার: "সর্বশেষ" (ট্যাগ রিলেটেড সর্বশেষ সংবাদ) */}
        <aside style={{ display: 'grid', gap: 20, position: 'sticky', top: 80 }}>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #c8102e', paddingBottom: 10, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#c8102e', fontWeight: 800 }}>⚡ সর্বশেষ</h3>
              <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>সম্পর্কিত</span>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {rightSidebarStories.map((item, idx) => (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', borderBottom: idx < rightSidebarStories.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: 10 }}>
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.titleBn} style={{ width: 68, height: 50, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  )}
                  <Link href={`/news/${item.id}`} style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>
                    {item.titleBn}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* ফটোকার্ড প্রিভিউ ও ডাউনলোড মোডাল */}
      {photocardDataUrl && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setPhotocardDataUrl(null)}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, maxWidth: 520, width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: 16 }}>দৈনিক কল্যাণ ফটোকার্ড</strong>
              <button onClick={() => setPhotocardDataUrl(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: 999, width: 32, height: 32, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <img src={photocardDataUrl} alt="Photocard" style={{ width: '100%', borderRadius: 10, border: '1px solid #e2e8f0' }} />
            <a
              href={photocardDataUrl}
              download={`Dainik-Kalyan-Photocard-${story.id}.png`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 14, background: '#0c4da2', color: '#fff', padding: '10px 22px', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}
            >
              <Download size={16} /> ফটোকার্ড ডাউনলোড করুন
            </a>
          </div>
        </div>
      )}
    </main>
  )
}