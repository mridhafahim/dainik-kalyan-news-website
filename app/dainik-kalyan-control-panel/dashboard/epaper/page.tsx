'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { PageTitle } from '@/components/admin/AdminUi'

type Edition = { id: number; editionDate: string; title: string; status: string }
type Page = { id: number; pageNumber: number; imagePath: string; width: number; height: number; specialName?: string | null }
type Shape = 'rect' | 'l' | 't' | 'polygon'
type Region = {
  id?: number
  pageId?: number
  x: number | string
  y: number | string
  width: number | string
  height: number | string
  shapeType?: Shape
  points?: Array<{ x: number; y: number }>
  articleId?: number | null
  targetPageNumber?: number | null
  targetUrl?: string | null // ব্যবহৃত হয় ইউনিক স্টোরি গ্রুপ (group:xxx) সংরক্ষণে
}
type Article = { id: number; titleBn: string }

export default function EpaperAdmin() {
  const [editions, setEditions] = useState<Edition[]>([])
  const [editionId, setEditionId] = useState<number>()
  const [pages, setPages] = useState<Page[]>([])
  const [pageId, setPageId] = useState<number>()
  const [articles, setArticles] = useState<Article[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegionIndex, setSelectedRegionIndex] = useState<number | null>(null)

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [title, setTitle] = useState('দৈনিক কল্যাণ')
  const [message, setMessage] = useState('')
  const [shape, setShape] = useState<Shape>('rect')
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  const [isSpecial, setIsSpecial] = useState(false)
  const [specialNameInput, setSpecialNameInput] = useState('')

  // ইউনিক সংবাদ জোড় বাঁধার স্টেট (Active Story Group ID)
  const [activeStoryGroupId, setActiveStoryGroupId] = useState<string | null>(null)
  const [linkingFromPage, setLinkingFromPage] = useState<number | null>(null)

  const [zoom, setZoom] = useState<number>(1.2)

  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)
  const [polyPoints, setPolyPoints] = useState<Array<{ x: number; y: number }>>([])
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)

  async function loadData(targetEditionId?: number, preservePageId?: number) {
    try {
      const activeId = targetEditionId ?? editionId
      const response = await fetch(`/api/epaper?admin=1${activeId ? `&edition=${activeId}` : ''}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'ই-পেপার ডেটা লোড ব্যর্থ')

      setEditions(data.editions || [])
      setArticles(data.articles || [])

      const current = data.current
      if (!current) {
        setPages([])
        setRegions([])
        setPageId(undefined)
        return
      }

      setEditionId(current.edition.id)
      setDate(current.edition.editionDate || '')
      setTitle(current.edition.title || 'দৈনিক কল্যাণ')

      const currentPages: Page[] = current.pages || []
      setPages(currentPages)

      const targetPage = preservePageId && currentPages.some(p => p.id === preservePageId)
        ? preservePageId
        : currentPages[0]?.id

      setPageId(targetPage)

      const activeP = currentPages.find(p => p.id === targetPage)
      setIsSpecial(Boolean(activeP?.specialName))
      setSpecialNameInput(activeP?.specialName || '')

      if (targetPage) {
        const pageRegions = (current.allRegions || []).filter((r: Region & { pageId: number }) => r.pageId === targetPage)
        setRegions(pageRegions)
      } else {
        setRegions([])
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'লোড করতে সমস্যা হয়েছে')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function switchPage(newPageId: number) {
    setPageId(newPageId)
    setSelectedRegionIndex(null)
    setPolyPoints([])
    const targetP = pages.find(p => p.id === newPageId)
    setIsSpecial(Boolean(targetP?.specialName))
    setSpecialNameInput(targetP?.specialName || '')

    void fetch(`/api/epaper?admin=1&edition=${editionId}`)
      .then(res => res.json())
      .then(data => {
        const pageRegions = (data.current?.allRegions || []).filter((r: Region & { pageId: number }) => r.pageId === newPageId)
        setRegions(pageRegions)
      })
  }

  // অটো-সেভ করে ২য় পাতায় জাম্প করা এবং ইউনিক গ্রুপ তৈরি
  async function jumpToContinuationPage(regionIndex: number, targetPageNum: number) {
    if (!pageId) return

    const reg = regions[regionIndex]
    // এই খবরের জন্য একটি ইউনিক গ্রুপ আইডি তৈরি (যদি আগে না থাকে)
    const uniqueGroupId = reg.targetUrl && reg.targetUrl.startsWith('group:')
      ? reg.targetUrl
      : `group:story_${Date.now()}_${Math.floor(Math.random() * 1000)}`

    // ১ নম্বর পাতার এই অঞ্চলটিতে ইউনিক গ্রুপ আইডি সেট করা
    const updatedRegions = regions.map((r, idx) => idx === regionIndex ? { ...r, targetUrl: uniqueGroupId, targetPageNumber: targetPageNum } : r)
    setRegions(updatedRegions)

    setMessage(`⏳ পৃষ্ঠা ${selectedPage?.pageNumber}-এর কাটিং সেভ হচ্ছে...`)
    setSaving(true)

    // ১. ডেটাবেসে আগে পৃষ্ঠা ১ সেভ করা
    const saveRes = await fetch('/api/admin/epaper', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageId, regions: updatedRegions })
    })

    setSaving(false)

    if (!saveRes.ok) {
      setMessage('❌ পৃষ্ঠা ১ সেভ ব্যর্থ হয়েছে।')
      return
    }

    setMessage(`✅ পৃষ্ঠা ১-এর কাটিং গ্রুপে সংরক্ষিত হয়েছে! এখন পৃষ্ঠা ${targetPageNum}-এ যাওয়া হচ্ছে...`)

    // ২ নম্বর পাতায় আঁকার জন্য গ্রুপ আইডি ও অরিজিন পেজ সেট রাখা
    setActiveStoryGroupId(uniqueGroupId)
    setLinkingFromPage(selectedPage?.pageNumber || 1)

    // টার্গেট পেজে সুইচ করা
    const targetP = pages.find(p => p.pageNumber === targetPageNum)
    if (targetP) {
      switchPage(targetP.id)
    }
  }

  async function createEdition() {
    if (!date) return setMessage('তারিখ নির্বাচন করুন')
    const response = await fetch('/api/admin/epaper', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ editionDate: date, title })
    })
    const data = await response.json()
    setMessage(data.error || 'সংস্করণ সফলভাবে সংরক্ষিত হয়েছে')
    if (data.edition) {
      setEditionId(data.edition.id)
      void loadData(data.edition.id)
    }
  }

  async function deleteCurrentEdition() {
    if (!editionId) return
    if (!confirm('আপনি কি নিশ্চিত যে এই পুরো সংস্করণটি সব পেজসহ ডিলিট করতে চান?')) return
    const res = await fetch(`/api/admin/epaper?editionId=${editionId}`, { method: 'DELETE' })
    if (res.ok) {
      setMessage('সংস্করণ সম্পূর্ণ মুছে ফেলা হয়েছে')
      setEditionId(undefined)
      setPages([])
      setRegions([])
      void loadData()
    }
  }

  async function deleteSinglePage(pageToDeleteId: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('আপনি কি এই পৃষ্ঠাটি ডিলিট করতে চান?')) return
    const res = await fetch(`/api/admin/epaper?pageId=${pageToDeleteId}`, { method: 'DELETE' })
    if (res.ok) {
      setMessage('পৃষ্ঠাটি ডিলিট হয়েছে')
      void loadData(editionId)
    }
  }

  async function saveSpecialTag() {
    if (!pageId) return
    const nameToSave = isSpecial ? (specialNameInput.trim() || 'বিশেষ সংখ্যা') : null
    const res = await fetch('/api/admin/epaper', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageId, specialName: nameToSave })
    })
    if (res.ok) {
      setMessage(isSpecial ? `✅ এই পৃষ্ঠাটি "${nameToSave}" হিসেবে ট্যাগ হয়েছে!` : 'সাধারণ সংখ্যায় ফেরত নেওয়া হয়েছে।')
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, specialName: nameToSave } : p))
    }
  }

  async function uploadSelectedPages() {
    if (!editionId) return setMessage('আগে উপরে সংস্করণ তৈরি করুন')
    if (!selectedFiles || !selectedFiles.length) return setMessage('আগে ছবি নির্বাচন করুন')

    setUploading(true)
    setMessage(`${selectedFiles.length}টি পৃষ্ঠা আপলোড হচ্ছে...`)

    let uploadedCount = 0
    let firstNewPageId: number | undefined

    for (let index = 0; index < selectedFiles.length; index++) {
      const form = new FormData()
      form.append('file', selectedFiles[index])

      try {
        const uploadRes = await fetch('/api/admin/epaper/upload', { method: 'POST', body: form })
        const upload = await uploadRes.json()

        if (!upload.url) {
          setMessage(`পৃষ্ঠা ${index + 1} আপলোড ব্যর্থ: ${upload.error || 'ত্রুটি'}`)
          setUploading(false)
          return
        }

        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const item = new Image()
          item.onload = () => resolve(item)
          item.onerror = reject
          item.src = upload.url
        })

        const pageNumber = pages.length + index + 1
        const saved = await fetch('/api/admin/epaper', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            editionId,
            pageNumber,
            imagePath: upload.url,
            width: image.naturalWidth,
            height: image.naturalHeight
          })
        })

        const savedData = await saved.json()
        if (index === 0 && savedData.page?.id) firstNewPageId = savedData.page.id
        uploadedCount++
        setMessage(`${uploadedCount}/${selectedFiles.length}টি পৃষ্ঠা আপলোড সম্পন্ন...`)
      } catch (err) {
        setMessage(`আপলোডে সমস্যা: ${err instanceof Error ? err.message : 'ত্রুটি'}`)
        setUploading(false)
        return
      }
    }

    setUploading(false)
    setSelectedFiles(null)
    setMessage('সব পৃষ্ঠা সফলভাবে আপলোড হয়েছে!')
    void loadData(editionId, firstNewPageId)
  }

  function getRelativeCoords(event: React.PointerEvent) {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
    }
  }

  function handlePointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return
    const pt = getRelativeCoords(event)
    if (!pt) return

    if (shape === 'polygon') {
      if (polyPoints.length >= 3) {
        const start = polyPoints[0]
        const dist = Math.hypot(pt.x - start.x, pt.y - start.y)
        if (dist < 0.025) {
          finishPolygon()
          return
        }
      }
      setPolyPoints(prev => [...prev, pt])
      return
    }

    setIsDrawing(true)
    setStartPoint(pt)
    setCurrentPoint(pt)
  }

  function handlePointerMove(event: React.PointerEvent) {
    const pt = getRelativeCoords(event)
    if (!pt) return
    if (shape === 'polygon') setHoverPoint(pt)
    else if (isDrawing) setCurrentPoint(pt)
  }

  function handlePointerUp(event: React.PointerEvent) {
    if (shape === 'polygon') return
    if (!isDrawing || !startPoint) return
    const endPoint = getRelativeCoords(event) || currentPoint
    setIsDrawing(false)
    setStartPoint(null)
    setCurrentPoint(null)

    if (!endPoint) return

    const x = Math.min(startPoint.x, endPoint.x)
    const y = Math.min(startPoint.y, endPoint.y)
    const width = Math.abs(endPoint.x - startPoint.x)
    const height = Math.abs(endPoint.y - startPoint.y)

    if (width < 0.015 || height < 0.015) return

    // যদি কোনো আগের পেজের খবরের কন্টিনিউয়েশন কাটা হয়, তবে সেই গ্রুপ আইডি এসাইন করা
    const assignedGroup = activeStoryGroupId ? activeStoryGroupId : null

    const newRegion: Region = {
      pageId,
      x,
      y,
      width,
      height,
      shapeType: shape,
      points: [],
      articleId: null,
      targetPageNumber: linkingFromPage ? linkingFromPage : null,
      targetUrl: assignedGroup
    }

    setRegions(prev => [...prev, newRegion])
    setSelectedRegionIndex(regions.length)

    if (activeStoryGroupId && linkingFromPage) {
      setMessage(`✅ পৃষ্ঠা ${linkingFromPage}-এর নির্দিষ্ট খবরের সাথে এই কলামটি নির্ভুলভাবে সংযুক্ত হয়েছে! নিচে "সব লিংক সংরক্ষণ করুন" চাপুন।`)
      setActiveStoryGroupId(null)
      setLinkingFromPage(null)
    }
  }

  function finishPolygon() {
    if (polyPoints.length < 3) return setMessage('কমপক্ষে ৩টি পয়েন্ট নির্বাচন করুন')

    const xs = polyPoints.map(p => p.x)
    const ys = polyPoints.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const width = Math.max(0.015, maxX - minX)
    const height = Math.max(0.015, maxY - minY)

    const normalizedPoints = polyPoints.map(p => ({
      x: Number(((p.x - minX) / width).toFixed(4)),
      y: Number(((p.y - minY) / height).toFixed(4))
    }))

    const assignedGroup = activeStoryGroupId ? activeStoryGroupId : null

    const newRegion: Region = {
      pageId,
      x: minX,
      y: minY,
      width,
      height,
      shapeType: 'polygon',
      points: normalizedPoints,
      articleId: null,
      targetPageNumber: linkingFromPage ? linkingFromPage : null,
      targetUrl: assignedGroup
    }

    setRegions(prev => [...prev, newRegion])
    setSelectedRegionIndex(regions.length)
    setPolyPoints([])
    setHoverPoint(null)

    if (activeStoryGroupId && linkingFromPage) {
      setMessage(`✅ পৃষ্ঠা ${linkingFromPage}-এর নির্দিষ্ট খবরের সাথে বহুভুজ কলামটি সংযুক্ত হয়েছে!`)
      setActiveStoryGroupId(null)
      setLinkingFromPage(null)
    }
  }

  function updateRegionTarget(index: number, targetValue: string) {
    setRegions(prev => prev.map((reg, idx) => {
      if (idx !== index) return reg
      if (targetValue.startsWith('article:')) {
        return { ...reg, articleId: Number(targetValue.split(':')[1]), targetPageNumber: null }
      }
      if (targetValue.startsWith('page:')) {
        return { ...reg, targetPageNumber: Number(targetValue.split(':')[1]), articleId: null }
      }
      return { ...reg, articleId: null, targetPageNumber: null }
    }))
  }

  function deleteRegion(index: number) {
    setRegions(prev => prev.filter((_, idx) => idx !== index))
    if (selectedRegionIndex === index) setSelectedRegionIndex(null)
  }

  async function saveRegions() {
    if (!pageId) return setMessage('কোনো পৃষ্ঠা নির্বাচন করা নেই')
    setSaving(true)
    const response = await fetch('/api/admin/epaper', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pageId, regions })
    })
    const data = await response.json()
    setSaving(false)
    setMessage(response.ok ? '✅ এই পৃষ্ঠার সব লিংক সফলভাবে ডেটাবেসে সংরক্ষিত হয়েছে' : (data.error || 'সংরক্ষণ ব্যর্থ'))
    if (response.ok) void loadData(editionId, pageId)
  }

  async function publish(status: 'published' | 'draft') {
    if (!editionId) return
    setPublishing(true)
    const response = await fetch('/api/admin/epaper', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ editionId, status })
    })
    const data = await response.json()
    setPublishing(false)
    setMessage(response.ok
      ? (status === 'published' ? '✅ ই-পেপার সফলভাবে প্রকাশিত হয়েছে।' : 'ই-পেপার খসড়ায় ফেরত নেওয়া হয়েছে।')
      : (data.error || 'স্ট্যাটাস পরিবর্তন ব্যর্থ'))
    if (response.ok) void loadData(editionId, pageId)
  }

  const selectedPage = pages.find(p => p.id === pageId)

  return (
    <>
      <PageTitle
        title="ই-পেপার ওয়ার্কস্পেস ও কাটিং লিংক ম্যাপার"
        subtitle="সংস্করণ তৈরি করুন, বিশেষ সংখ্যা ট্যাগ করুন এবং কলাম লিংক আঁকুন।"
      />

      <div className="epaper-workspace">
        {/* Edition Setup */}
        <section className="admin-panel epaper-setup">
          <div className="workspace-heading">
            <div>
              <h2>ইস্যু / সংস্করণ সেটআপ</h2>
              <p>তারিখ ও নাম দিয়ে সংস্করণ পরিচালনা করুন।</p>
            </div>
            <span className={`status-pill status-${editions.find(item => item.id === editionId)?.status || 'draft'}`}>
              {editions.find(item => item.id === editionId)?.status || 'draft'}
            </span>
          </div>

          <div className="two-form-grid">
            <label>
              প্রকাশের তারিখ
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
            <label>
              সংস্করণের নাম
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="যেমন: দৈনিক কল্যাণ" />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="button button-green" onClick={createEdition} style={{ flex: 1 }}>
              সংস্করণ তৈরি / আপডেট
            </button>
            {editionId && (
              <button
                type="button"
                onClick={deleteCurrentEdition}
                style={{ background: '#fee2e2', color: '#dc2626', border: 0, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
                title="এই পুরো সংস্করণটি ডিলিট করুন"
              >
                🗑️ ডিলিট
              </button>
            )}
          </div>

          <label style={{ marginTop: 14, display: 'block' }}>
            সংস্করণ পরিবর্তন করুন
            <select
              value={editionId || ''}
              onChange={e => {
                const id = Number(e.target.value)
                setEditionId(id)
                void loadData(id)
              }}
            >
              <option value="">সংস্করণ নির্বাচন করুন</option>
              {editions.map(item => (
                <option key={item.id} value={item.id}>
                  {item.editionDate} · {item.title} ({item.status})
                </option>
              ))}
            </select>
          </label>

          {/* Upload Dropzone */}
          <div style={{ marginTop: 14, padding: 14, border: '2px dashed #94a3b8', borderRadius: 8, background: '#f8fafc' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              পৃষ্ঠা আপলোড করুন (ছবি/স্ক্যান)
            </label>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={e => setSelectedFiles(e.target.files)}
              style={{ width: '100%', fontSize: 12 }}
            />
            <button
              type="button"
              className="button button-primary"
              disabled={uploading || !selectedFiles?.length}
              onClick={uploadSelectedPages}
              style={{ width: '100%', marginTop: 10, padding: '8px 12px', fontSize: 13 }}
            >
              {uploading ? 'আপলোড হচ্ছে...' : `📤 নির্বাচিত ${selectedFiles?.length || ''}টি পৃষ্ঠা আপলোড করুন`}
            </button>
          </div>

          <div className="publish-actions" style={{ marginTop: 16 }}>
            <button
              className="button button-primary"
              disabled={!pages.length || publishing}
              onClick={() => void publish('published')}
            >
              প্রকাশ করুন (Live)
            </button>
            <button
              className="button button-ghost"
              disabled={publishing}
              onClick={() => void publish('draft')}
            >
              খসড়া করুন
            </button>
          </div>
        </section>

        {/* Page List with Hover ✕ Delete Button */}
        <section className="admin-panel epaper-pages">
          <div className="workspace-heading">
            <div>
              <h2>পৃষ্ঠা তালিকা ({pages.length})</h2>
              <p>কাটিং করতে ক্লিক করুন। ভুল পেজ হলে উপরে লাল ✕ বাটনে চাপুন।</p>
            </div>
          </div>

          <div className="page-list">
            {pages.map(page => (
              <div
                key={page.id}
                style={{ position: 'relative' }}
                className={`page-tile ${page.id === pageId ? 'selected' : ''}`}
                onClick={() => switchPage(page.id)}
              >
                <button
                  type="button"
                  onClick={e => deleteSinglePage(page.id, e)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    background: '#dc2626',
                    color: '#fff',
                    border: 0,
                    borderRadius: 999,
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    zIndex: 10
                  }}
                  title="এই পৃষ্ঠাটি ডিলিট করুন"
                >
                  ✕
                </button>
                <img src={page.imagePath} alt={`পৃষ্ঠা ${page.pageNumber}`} />
                <span>
                  পৃষ্ঠা {page.pageNumber}
                  {page.specialName && (
                    <small style={{ display: 'block', color: '#c8102e', fontWeight: 'bold' }}>
                      ({page.specialName})
                    </small>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Selected Page Special Edition Tagging Box */}
          {selectedPage && (
            <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8 }}>
              <strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                পৃষ্ঠা {selectedPage.pageNumber}-এর সেটিংস:
              </strong>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={isSpecial}
                  onChange={e => setIsSpecial(e.target.checked)}
                />
                এই পৃষ্ঠাটি কি "বিশেষ সংখ্যা" (Special Edition)?
              </label>

              {isSpecial && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    value={specialNameInput}
                    onChange={e => setSpecialNameInput(e.target.value)}
                    placeholder="বিশেষ সংখ্যার নাম (যেমন: ঈদ সংখ্যা, কৌতুক, সাহিত্য)"
                    style={{ flex: 1, padding: '6px 10px', fontSize: 13, borderRadius: 4, border: '1px solid #cbd5e1' }}
                  />
                  <button
                    type="button"
                    className="button button-primary"
                    style={{ fontSize: 12, padding: '6px 14px' }}
                    onClick={saveSpecialTag}
                  >
                    সেভ করুন
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Visual Link Mapper */}
        <section className="admin-panel epaper-mapper" style={{ gridColumn: '1 / -1' }}>
          <div className="workspace-heading" style={{ flexWrap: 'wrap', gap: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
            <div>
              <h2>ভিজ্যুয়াল কাটিং ম্যাপার {selectedPage ? `— পৃষ্ঠা ${selectedPage.pageNumber}` : ''}</h2>
              <p>
                {activeStoryGroupId
                  ? `🔗 পৃষ্ঠা ${linkingFromPage}-এর নির্দিষ্ট সংবাদের সাথে লিংক হচ্ছে: এখন এই পেজে বাকি কলামটি ড্র্যাগ করে কাটুন।`
                  : 'টুল সিলেক্ট করে ড্র্যাগ করে বক্স আঁকুন। তারপর নিচে সেই বক্সের সাথে নিউজ বা ভিতরের পাতার লিংক যুক্ত করুন।'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className={`button ${shape === 'rect' ? 'button-primary' : 'button-ghost'}`}
                  style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={() => setShape('rect')}
                >
                  চারকোনা (Rectangle)
                </button>
                <button
                  type="button"
                  className={`button ${shape === 'l' ? 'button-primary' : 'button-ghost'}`}
                  style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={() => setShape('l')}
                >
                  L-শেপ
                </button>
                <button
                  type="button"
                  className={`button ${shape === 'polygon' ? 'button-primary' : 'button-ghost'}`}
                  style={{ padding: '5px 12px', fontSize: 12, background: shape === 'polygon' ? '#c8102e' : undefined, color: shape === 'polygon' ? '#fff' : undefined }}
                  onClick={() => setShape('polygon')}
                >
                  ✍️ বহুভুজ
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f1f5f9', padding: '4px 10px', borderRadius: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>জুম:</span>
                <button type="button" onClick={() => setZoom(prev => Math.max(0.8, Number((prev - 0.2).toFixed(1))))}>－</button>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom(prev => Math.min(2.5, Number((prev + 0.2).toFixed(1))))}>＋</button>
              </div>
            </div>
          </div>

          {selectedPage ? (
            <>
              <div style={{ width: '100%', maxHeight: '75vh', overflow: 'auto', background: '#1e293b', padding: 24, borderRadius: 10, margin: '16px 0' }}>
                <div
                  ref={canvasRef}
                  className="mapping-canvas"
                  style={{ position: 'relative', width: `${Math.round(zoom * 1000)}px`, margin: '0 auto', userSelect: 'none', cursor: 'crosshair', lineHeight: 0, backgroundColor: '#fff' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <img src={selectedPage.imagePath} alt={`পৃষ্ঠা ${selectedPage.pageNumber}`} style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }} />

                  {regions.map((reg, index) => {
                    const isSelected = selectedRegionIndex === index
                    return (
                      <div
                        key={reg.id || index}
                        onClick={e => { e.stopPropagation(); setSelectedRegionIndex(index) }}
                        style={{
                          position: 'absolute',
                          left: `${Number(reg.x) * 100}%`,
                          top: `${Number(reg.y) * 100}%`,
                          width: `${Number(reg.width) * 100}%`,
                          height: `${Number(reg.height) * 100}%`,
                          backgroundColor: isSelected ? 'rgba(220, 38, 38, 0.45)' : 'rgba(37, 99, 235, 0.35)',
                          border: isSelected ? '2px solid #b91c1c' : '2px solid #1d4ed8',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}
                      >
                        <span style={{ background: isSelected ? '#b91c1c' : '#1d4ed8', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 6px' }}>
                          #{index + 1}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px 18px', borderRadius: 10, marginBottom: 16 }}>
                <div>
                  <strong style={{ fontSize: 16 }}>পৃষ্ঠা {selectedPage.pageNumber}-এ কাটা অঞ্চল: {regions.length}টি</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>নিচে প্রতিটি অঞ্চলের সাথে সংবাদ বা ভিতরের পাতা লিংক করুন।</p>
                </div>
                <button className="button button-green" disabled={saving || !regions.length} onClick={saveRegions}>
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'সব লিংক সংরক্ষণ করুন'}
                </button>
              </div>

              <div className="region-list" style={{ display: 'grid', gap: 12 }}>
                {regions.map((reg, index) => {
                  const currentVal = reg.articleId ? `article:${reg.articleId}` : reg.targetPageNumber ? `page:${reg.targetPageNumber}` : ''
                  const isSelected = selectedRegionIndex === index

                  return (
                    <div
                      key={reg.id || index}
                      style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 16px', background: isSelected ? '#fee2e2' : '#f8fafc', border: isSelected ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius: 8 }}
                      onClick={() => setSelectedRegionIndex(index)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontWeight: 'bold', fontSize: 15 }}>#{index + 1}</span>

                        <div style={{ flex: 1 }}>
                          <select
                            value={currentVal}
                            onChange={e => updateRegionTarget(index, e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                          >
                            <option value="">-- সংবাদ নির্বাচন করুন বা ভিতরের পাতায় পাঠান --</option>
                            <optgroup label="📰 মূল সংবাদের সাথে লিংক">
                              {articles.map(art => (
                                <option key={art.id} value={`article:${art.id}`}>
                                  সংবাদ: {art.titleBn}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="📄 ভিতরের কলাম পাতা (Continuation Page)">
                              {pages.filter(p => p.id !== pageId).map(p => (
                                <option key={p.id} value={`page:${p.pageNumber}`}>
                                  ভিতরের কলাম: পৃষ্ঠা {p.pageNumber}-এ দেখুন
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <button
                          type="button"
                          className="button"
                          style={{ background: '#fee2e2', color: '#b91c1c', border: 0, padding: '7px 14px' }}
                          onClick={e => { e.stopPropagation(); deleteRegion(index) }}
                        >
                          মুছুন
                        </button>
                      </div>

                      {/* নির্ভুল ইউনিক জোড় বাঁধার বাটন */}
                      {reg.targetPageNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e0f2fe', padding: '10px 14px', borderRadius: 6 }}>
                          <span style={{ fontSize: 13, color: '#0369a1', fontWeight: 600 }}>
                            বাকি অংশ <strong>পৃষ্ঠা নম্বর {reg.targetPageNumber}</strong>-এ আছে।
                          </span>
                          <button
                            type="button"
                            className="button button-primary"
                            disabled={saving}
                            style={{ fontSize: 12, padding: '7px 16px', fontWeight: 700 }}
                            onClick={() => jumpToContinuationPage(index, Number(reg.targetPageNumber))}
                          >
                            {saving ? 'সংরক্ষণ হচ্ছে...' : `💾 পৃষ্ঠা ১ সেভ করে পৃষ্ঠা ${reg.targetPageNumber}-এ যান`}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
              <h3>একটি পৃষ্ঠা নির্বাচন করুন</h3>
              <p>উপরে থাকা পৃষ্ঠা তালিকা থেকে একটি পৃষ্ঠায় ক্লিক করুন।</p>
            </div>
          )}
        </section>
      </div>

      {message && <p className="admin-feedback" style={{ marginTop: 18 }}>{message}</p>}
    </>
  )
}