// 'use client'
// import { useEffect, useRef, useState } from 'react'
// import type React from 'react'
// import { PageTitle } from '@/components/admin/AdminUi'
// type Edition = { id:number; editionDate:string; title:string; status:string }
// type Page = { id:number; pageNumber:number; imagePath:string; width:number; height:number }
// type Shape = 'rect' | 'l' | 't'
// type Region = { id?:number; pageId?:number; x:number|string; y:number|string; width:number|string; height:number|string; shapeType?:Shape; points?:Array<{x:number;y:number}>; articleId?:number|null; targetPageNumber?:number|null; targetUrl?:string|null }
// type Article = { id:number; titleBn:string }
// const percent = (value:number|string) => Number(value) * 100
// const shapePoints = (shape: Shape) => shape === 'l' ? [{x:0,y:0},{x:.38,y:0},{x:.38,y:.62},{x:1,y:.62},{x:1,y:1},{x:0,y:1}] : shape === 't' ? [{x:0,y:0},{x:1,y:0},{x:1,y:.32},{x:.62,y:.32},{x:.62,y:1},{x:.38,y:1},{x:.38,y:.32},{x:0,y:.32}] : []
// export default function EpaperAdmin() {
//  const [editions,setEditions]=useState<Edition[]>([]),[editionId,setEditionId]=useState<number>(),[pages,setPages]=useState<Page[]>([]),[pageId,setPageId]=useState<number>(),[articles,setArticles]=useState<Article[]>([]),[regions,setRegions]=useState<Region[]>([]),[allRegions,setAllRegions]=useState<(Region&{pageId:number})[]>([])
//  const [date,setDate]=useState(''),[title,setTitle]=useState('দৈনিক কল্যাণ'),[message,setMessage]=useState(''),[drawing,setDrawing]=useState<{x:number;y:number}|null>(null),[target,setTarget]=useState(''),[shape,setShape]=useState<Shape>('rect'),[publishing,setPublishing]=useState(false)
//  const canvas=useRef<HTMLDivElement>(null)
//  async function load(id=editionId){try{const response=await fetch(`/api/epaper?admin=1${id?`&edition=${id}`:''}`);const data=await response.json();if(!response.ok)throw new Error(data.error||'ই-পেপার লোড ব্যর্থ');setEditions(data.editions||[]);setArticles(data.articles||[]);const current=data.current;if(!current){setPages([]);setAllRegions([]);setRegions([]);return}setEditionId(current.edition.id);setPages(current.pages||[]);setAllRegions(current.allRegions||[]);const selectedPage=pageId&&current.pages.some((page:Page)=>page.id===pageId)?pageId:current.pages[0]?.id;setPageId(selectedPage);setRegions((current.allRegions||[]).filter((region:Region&{pageId:number})=>region.pageId===selectedPage))}catch(error){setMessage(error instanceof Error?error.message:'ই-পেপার লোড ব্যর্থ')}}
//  useEffect(()=>{void load()},[editionId])
//  async function createEdition(){const response=await fetch('/api/admin/epaper',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({editionDate:date,title})});const data=await response.json();setMessage(data.error||'খসড়া সংস্করণ তৈরি হয়েছে');if(data.edition){setEditionId(data.edition.id);void load(data.edition.id)}}
//  async function uploadPages(files:FileList|null){if(!editionId)return setMessage('আগে একটি সংস্করণ নির্বাচন করুন');if(!files?.length)return;setMessage(`${files.length}টি পৃষ্ঠা আপলোড হচ্ছে...`);for(let index=0;index<files.length;index++){const form=new FormData();form.append('file',files[index]);const upload=await fetch('/api/admin/epaper/upload',{method:'POST',body:form}).then(r=>r.json());if(!upload.url){setMessage(upload.error||'업로드 ব্যর্থ');return}const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const item=new Image();item.onload=()=>resolve(item);item.onerror=reject;item.src=upload.url});const pageNumber=pages.length+index+1;const saved=await fetch('/api/admin/epaper',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({editionId,pageNumber,imagePath:upload.url,width:image.naturalWidth,height:image.naturalHeight})});if(!saved.ok){const data=await saved.json();setMessage(data.error||'পৃষ্ঠা যোগ ব্যর্থ');return}}setMessage('সব পৃষ্ঠা সফলভাবে যোগ হয়েছে।');void load(editionId)}
//  function point(event:React.PointerEvent){const rect=canvas.current?.getBoundingClientRect();if(!rect)return null;return{x:Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height))}}
//  function down(event:React.PointerEvent){const value=point(event);if(value)setDrawing(value)}
//  function up(event:React.PointerEvent){if(!drawing)return;const value=point(event);if(!value)return;const region={pageId,x:Math.min(drawing.x,value.x),y:Math.min(drawing.y,value.y),width:Math.abs(value.x-drawing.x),height:Math.abs(value.y-drawing.y),shapeType:shape,points:shapePoints(shape),articleId:target.startsWith('article:')?Number(target.split(':')[1]):null,targetPageNumber:target.startsWith('page:')?Number(target.split(':')[1]):null,targetUrl:null};if(region.width>.01&&region.height>.01)setRegions(current=>[...current,region]);setDrawing(null)}
//  async function saveRegions(){if(!pageId)return;const response=await fetch('/api/admin/epaper',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({pageId,regions})});const data=await response.json();setMessage(response.ok?'ম্যাপিং সংরক্ষিত হয়েছে':data.error||'ম্যাপিং সংরক্ষণ ব্যর্থ');if(response.ok)void load(editionId)}
//  async function publish(status:'published'|'draft'){if(!editionId)return;setPublishing(true);const response=await fetch('/api/admin/epaper',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({editionId,status})});const data=await response.json();setMessage(response.ok?(status==='published'?'ই-পেপার প্রকাশিত হয়েছে।':'ই-পেপার আনপাবলিশ হয়েছে।'):data.error||'স্ট্যাটাস পরিবর্তন ব্যর্থ');setPublishing(false);if(response.ok)void load(editionId)}
//  const selected=pages.find(page=>page.id===pageId)
//  return <><PageTitle title="ই-পেপার ওয়ার্কস্পেস" subtitle="একটি ইস্যুর সব পৃষ্ঠা আপলোড করুন, দৃশ্যমান অঞ্চল নির্বাচন করুন এবং নিরাপদে প্রকাশ করুন।"/><div className="epaper-workspace"><section className="admin-panel epaper-setup"><div className="workspace-heading"><div><h2>ইস্যু সেটআপ</h2><p>খসড়া ইস্যুতে কাজ করুন, প্রস্তুত হলে প্রকাশ করুন।</p></div><span className={`status-pill status-${editions.find(item=>item.id===editionId)?.status||'draft'}`}>{editions.find(item=>item.id===editionId)?.status||'draft'}</span></div><div className="two-form-grid"><label>তারিখ<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label><label>শিরোনাম<input value={title} onChange={event=>setTitle(event.target.value)}/></label></div><button className="button button-green" onClick={createEdition}>খসড়া ইস্যু তৈরি / আপডেট</button><label>ইস্যু নির্বাচন<select value={editionId||''} onChange={event=>{const id=Number(event.target.value);setEditionId(id);setPageId(undefined);void load(id)}}><option value="">ইস্যু নির্বাচন করুন</option>{editions.map(item=><option key={item.id} value={item.id}>{item.editionDate} · {item.title} · {item.status}</option>)}</select></label><label className="upload-dropzone">একসাথে একাধিক পৃষ্ঠা আপলোড করুন<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event=>void uploadPages(event.target.files)}/><small>পৃষ্ঠা নম্বর আপলোডের ক্রম অনুযায়ী নির্ধারিত হবে।</small></label><div className="publish-actions"><button className="button button-primary" disabled={!pages.length||publishing} onClick={()=>void publish('published')}>প্রকাশ করুন</button><button className="button button-ghost" disabled={publishing} onClick={()=>void publish('draft')}>খসড়ায় ফেরত</button></div></section><section className="admin-panel epaper-pages"><div className="workspace-heading"><div><h2>পৃষ্ঠা তালিকা</h2><p>{pages.length}টি পৃষ্ঠা · যেকোনো পৃষ্ঠা নির্বাচন করে লিংক আঁকুন</p></div></div><div className="page-list">{pages.map(page=><button key={page.id} className={page.id===pageId?'page-tile selected':'page-tile'} onClick={()=>{setPageId(page.id);setRegions(allRegions.filter(region=>region.pageId===page.id))}}><img src={page.imagePath} alt={`পৃষ্ঠা ${page.pageNumber}`}/><span>পৃষ্ঠা {page.pageNumber}</span></button>)}</div></section><section className="admin-panel epaper-mapper"><div className="workspace-heading"><div><h2>ভিজ্যুয়াল লিংক ম্যাপার</h2><p>ছবির উপর ড্র্যাগ করে একটি অঞ্চল আঁকুন। প্রতিটি অঞ্চল আলাদা লিংক হিসেবে সংরক্ষিত হবে।</p></div><select value={shape} onChange={event=>setShape(event.target.value as Shape)}><option value="rect">Rectangle</option><option value="l">L-shape</option><option value="t">T-shape</option></select></div>{selected?<><div ref={canvas} className="mapping-canvas phase-three-canvas" onPointerDown={down} onPointerUp={up}><img src={selected.imagePath} alt={`পৃষ্ঠা ${selected.pageNumber}`}/>{regions.map((region,index)=><span key={region.id||index} className={`mapping-region mapping-${region.shapeType||'rect'}`} style={{left:`${percent(region.x)}%`,top:`${percent(region.y)}%`,width:`${percent(region.width)}%`,height:`${percent(region.height)}%`}}><b>{index+1}</b></span>)}</div><div className="mapping-controls"><label>নতুন অঞ্চলের লক্ষ্য<select value={target} onChange={event=>setTarget(event.target.value)}><option value="">লক্ষ্য নির্বাচন করুন</option>{articles.map(article=><option key={article.id} value={`article:${article.id}`}>{article.titleBn}</option>)}{pages.filter(page=>page.id!==pageId).map(page=><option key={page.id} value={`page:${page.pageNumber}`}>ই-পেপার পৃষ্ঠা {page.pageNumber}</option>)}</select></label><button className="button button-green" disabled={!target} onClick={saveRegions}>সব লিংক সংরক্ষণ করুন ({regions.length})</button></div><div className="region-list">{regions.map((region,index)=><div key={region.id||index}><span>#{index+1} · {region.shapeType||'rect'}</span><button onClick={()=>setRegions(current=>current.filter((_,itemIndex)=>itemIndex!==index))}>মুছুন</button></div>)}</div></>:<div className="empty-state"><h3>একটি পৃষ্ঠা নির্বাচন করুন</h3><p>পেজ থাম্বনেইল থেকে শুরু করুন।</p></div>}</section></div>{message&&<p className="admin-feedback">{message}</p>}</>
// }


'use client'

import { useEffect, useRef, useState } from 'react'
import type React from 'react'
import { PageTitle } from '@/components/admin/AdminUi'

type Edition = { id: number; editionDate: string; title: string; status: string }
type Page = { id: number; pageNumber: number; imagePath: string; width: number; height: number }
type Shape = 'rect' | 'l' | 't'
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
  targetUrl?: string | null
}
type Article = { id: number; titleBn: string }

const shapePoints = (shape: Shape): Array<{ x: number; y: number }> => {
  if (shape === 'l') {
    return [
      { x: 0, y: 0 },
      { x: 0.38, y: 0 },
      { x: 0.38, y: 0.62 },
      { x: 1, y: 0.62 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ]
  }
  if (shape === 't') {
    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0.32 },
      { x: 0.62, y: 0.32 },
      { x: 0.62, y: 1 },
      { x: 0.38, y: 1 },
      { x: 0.38, y: 0.32 },
      { x: 0, y: 0.32 }
    ]
  }
  return []
}

export default function EpaperAdmin() {
  const [editions, setEditions] = useState<Edition[]>([])
  const [editionId, setEditionId] = useState<number>()
  const [pages, setPages] = useState<Page[]>([])
  const [pageId, setPageId] = useState<number>()
  const [articles, setArticles] = useState<Article[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegionIndex, setSelectedRegionIndex] = useState<number | null>(null)

  const [date, setDate] = useState('')
  const [title, setTitle] = useState('দৈনিক কল্যাণ')
  const [message, setMessage] = useState('')
  const [shape, setShape] = useState<Shape>('rect')
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)

  // Zoom control state
  const [zoom, setZoom] = useState<number>(1.2)

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null)

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
    void fetch(`/api/epaper?admin=1&edition=${editionId}`)
      .then(res => res.json())
      .then(data => {
        const pageRegions = (data.current?.allRegions || []).filter((r: Region & { pageId: number }) => r.pageId === newPageId)
        setRegions(pageRegions)
      })
  }

  async function createEdition() {
    if (!date) return setMessage('তারিখ নির্বাচন করুন')
    const response = await fetch('/api/admin/epaper', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ editionDate: date, title })
    })
    const data = await response.json()
    setMessage(data.error || 'সংস্করণ তৈরি/আপডেট হয়েছে')
    if (data.edition) {
      setEditionId(data.edition.id)
      void loadData(data.edition.id)
    }
  }

  async function uploadSelectedPages() {
    if (!editionId) return setMessage('আগে উপরে "সংস্করণ তৈরি / আপডেট" বাটনে ক্লিক করুন')
    if (!selectedFiles || !selectedFiles.length) return setMessage('আগে ছবি নির্বাচন করুন')

    setUploading(true)
    setMessage(`${selectedFiles.length}টি পৃষ্ঠা আপলোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...`)

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

        if (!saved.ok) {
          const data = await saved.json()
          setMessage(`পৃষ্ঠা ${pageNumber} সেভ ব্যর্থ: ${data.error || 'ত্রুটি'}`)
          setUploading(false)
          return
        }

        const savedData = await saved.json()
        if (index === 0 && savedData.page?.id) {
          firstNewPageId = savedData.page.id
        }
        uploadedCount++
        setMessage(`${uploadedCount}/${selectedFiles.length}টি পৃষ্ঠা সফলভাবে আপলোড হয়েছে...`)
      } catch (err) {
        setMessage(`আপলোডে সমস্যা হয়েছে: ${err instanceof Error ? err.message : 'ত্রুটি'}`)
        setUploading(false)
        return
      }
    }

    setUploading(false)
    setSelectedFiles(null)
    setMessage('সবগুলো পৃষ্ঠা সফলভাবে যুক্ত হয়েছে! ১ম পৃষ্ঠাটি নিচে ওপেন করা হয়েছে।')
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
    setIsDrawing(true)
    setStartPoint(pt)
    setCurrentPoint(pt)
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!isDrawing) return
    const pt = getRelativeCoords(event)
    if (pt) setCurrentPoint(pt)
  }

  function handlePointerUp(event: React.PointerEvent) {
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

    // Ignore accidental clicks
    if (width < 0.015 || height < 0.015) return

    const newRegion: Region = {
      pageId,
      x,
      y,
      width,
      height,
      shapeType: shape,
      points: shapePoints(shape),
      articleId: null,
      targetPageNumber: null,
      targetUrl: null
    }

    setRegions(prev => [...prev, newRegion])
    setSelectedRegionIndex(regions.length)
  }

  function updateRegionTarget(index: number, targetValue: string) {
    setRegions(prev => prev.map((reg, idx) => {
      if (idx !== index) return reg
      if (targetValue.startsWith('article:')) {
        return { ...reg, articleId: Number(targetValue.split(':')[1]), targetPageNumber: null, targetUrl: null }
      }
      if (targetValue.startsWith('page:')) {
        return { ...reg, targetPageNumber: Number(targetValue.split(':')[1]), articleId: null, targetUrl: null }
      }
      return { ...reg, articleId: null, targetPageNumber: null, targetUrl: null }
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
    setMessage(response.ok ? 'লিংক ম্যাপিং সফলভাবে সংরক্ষিত হয়েছে' : (data.error || 'সংরক্ষণ ব্যর্থ'))
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
      ? (status === 'published' ? 'ই-পেপার সফলভাবে প্রকাশিত হয়েছে।' : 'ই-পেপার খসড়ায় ফেরত নেওয়া হয়েছে।')
      : (data.error || 'স্ট্যাটাস পরিবর্তন ব্যর্থ'))
    if (response.ok) void loadData(editionId, pageId)
  }

  const selectedPage = pages.find(p => p.id === pageId)

  // Live drawing preview box
  const previewBox = isDrawing && startPoint && currentPoint ? {
    x: Math.min(startPoint.x, currentPoint.x) * 100,
    y: Math.min(startPoint.y, currentPoint.y) * 100,
    w: Math.abs(currentPoint.x - startPoint.x) * 100,
    h: Math.abs(currentPoint.y - startPoint.y) * 100
  } : null

  const getClipPath = (shapeType?: Shape) => {
    if (shapeType === 'l') return 'polygon(0% 0%, 38% 0%, 38% 62%, 100% 62%, 100% 100%, 0% 100%)'
    if (shapeType === 't') return 'polygon(0% 0%, 100% 0%, 100% 32%, 62% 32%, 62% 100%, 38% 100%, 38% 32%, 0% 32%)'
    return undefined
  }

  return (
    <>
      <PageTitle
        title="ই-পেপার ওয়ার্কস্পেস ও কাটিং লিংক ম্যাপার"
        subtitle="পত্রিকার কলাম ও হেডলাইন নিখুঁতভাবে সিলেক্ট করে মূল সংবাদ ও পাতার সাথে লিংক করুন।"
      />

      <div className="epaper-workspace">
        {/* Left Column: Issue Setup */}
        <section className="admin-panel epaper-setup">
          <div className="workspace-heading">
            <div>
              <h2>ইস্যু সেটআপ</h2>
              <p>তারিখ দিয়ে সংস্করণ নির্বাচন বা প্রকাশ করুন।</p>
            </div>
            <span className={`status-pill status-${editions.find(item => item.id === editionId)?.status || 'draft'}`}>
              {editions.find(item => item.id === editionId)?.status || 'draft'}
            </span>
          </div>

          <div className="two-form-grid">
            <label>
              তারিখ
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </label>
            <label>
              শিরোনাম
              <input value={title} onChange={e => setTitle(e.target.value)} />
            </label>
          </div>

          <button className="button button-green" onClick={createEdition} style={{ width: '100%', marginTop: 8 }}>
            সংস্করণ তৈরি / আপডেট
          </button>

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
            <small style={{ color: '#64748b', display: 'block', marginTop: 4 }}>
              {selectedFiles?.length ? `${selectedFiles.length}টি ছবি নির্বাচিত হয়েছে` : 'একসাথে সব পৃষ্ঠা নির্বাচন করুন'}
            </small>

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
              প্রকাশ করুন
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

        {/* Middle Column: Page List */}
        <section className="admin-panel epaper-pages">
          <div className="workspace-heading">
            <div>
              <h2>পৃষ্ঠা তালিকা ({pages.length})</h2>
              <p>কাটিং বা লিংক করার জন্য যেকোনো পৃষ্ঠায় ক্লিক করুন।</p>
            </div>
          </div>

          <div className="page-list">
            {pages.map(page => (
              <button
                key={page.id}
                type="button"
                className={`page-tile ${page.id === pageId ? 'selected' : ''}`}
                onClick={() => switchPage(page.id)}
              >
                <img src={page.imagePath} alt={`পৃষ্ঠা ${page.pageNumber}`} />
                <span>পৃষ্ঠা {page.pageNumber}</span>
              </button>
            ))}
            {!pages.length && (
              <div style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center', color: '#64748b' }}>
                এখনও কোনো পৃষ্ঠা আপলোড করা হয়নি। বাঁ পাশ থেকে ছবি নির্বাচন করে "আপলোড করুন" বাটনে চাপ দিন।
              </div>
            )}
          </div>
        </section>

        {/* Bottom / Main Section: Visual Link Mapper */}
        <section className="admin-panel epaper-mapper" style={{ gridColumn: '1 / -1' }}>
          <div
            className="workspace-heading"
            style={{
              flexWrap: 'wrap',
              gap: 12,
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 14
            }}
          >
            <div>
              <h2>
                ভিজ্যুয়াল কাটিং ম্যাপার {selectedPage ? `— পৃষ্ঠা নম্বর ${selectedPage.pageNumber}` : ''}
              </h2>
              <p>পত্রিকার লেখার ওপর মাউস টেনে বক্স আঁকুন। তারপর নিচে সেই বক্সের সাথে নিউজ বা পাতার লিংক যুক্ত করুন।</p>
            </div>

            {/* Shape Tools & Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>কাটিং টুল:</span>
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
                  L-শেপ (কলাম মোড়ক)
                </button>
                <button
                  type="button"
                  className={`button ${shape === 't' ? 'button-primary' : 'button-ghost'}`}
                  style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={() => setShape('t')}
                >
                  T-শেপ (টপ ব্যানার)
                </button>
              </div>

              {/* Zoom Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#f1f5f9',
                  padding: '4px 10px',
                  borderRadius: 8
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>জুম স্পষ্টতা:</span>
                <button
                  type="button"
                  style={{ padding: '2px 8px', fontSize: 13, cursor: 'pointer', borderRadius: 4, border: '1px solid #cbd5e1' }}
                  onClick={() => setZoom(prev => Math.max(0.8, Number((prev - 0.2).toFixed(1))))}
                >
                  －
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, minWidth: 42, textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  style={{ padding: '2px 8px', fontSize: 13, cursor: 'pointer', borderRadius: 4, border: '1px solid #cbd5e1' }}
                  onClick={() => setZoom(prev => Math.min(2.5, Number((prev + 0.2).toFixed(1))))}
                >
                  ＋
                </button>
                <button
                  type="button"
                  style={{ padding: '2px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 4, border: '1px solid #cbd5e1', marginLeft: 4 }}
                  onClick={() => setZoom(1.0)}
                >
                  100%
                </button>
                <button
                  type="button"
                  style={{ padding: '2px 8px', fontSize: 11, cursor: 'pointer', borderRadius: 4, border: '1px solid #cbd5e1' }}
                  onClick={() => setZoom(1.5)}
                >
                  150%
                </button>
              </div>
            </div>
          </div>

          {selectedPage ? (
            <>
              {/* High-Resolution Scrollable Canvas Viewport */}
              <div
                style={{
                  width: '100%',
                  maxHeight: '75vh',
                  overflow: 'auto',
                  background: '#1e293b',
                  padding: 24,
                  borderRadius: 10,
                  margin: '16px 0',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)'
                }}
              >
                <div
                  ref={canvasRef}
                  className="mapping-canvas"
                  style={{
                    position: 'relative',
                    width: `${Math.round(zoom * 1000)}px`,
                    margin: '0 auto',
                    userSelect: 'none',
                    cursor: 'crosshair',
                    lineHeight: 0,
                    backgroundColor: '#fff',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
                  }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                >
                  <img
                    src={selectedPage.imagePath}
                    alt={`পৃষ্ঠা ${selectedPage.pageNumber}`}
                    style={{ width: '100%', height: 'auto', display: 'block', pointerEvents: 'none' }}
                  />

                  {/* Cutout Regions Overlay */}
                  {regions.map((reg, index) => {
                    const isSelected = selectedRegionIndex === index
                    const clip = getClipPath(reg.shapeType)
                    return (
                      <div
                        key={reg.id || index}
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedRegionIndex(index)
                        }}
                        style={{
                          position: 'absolute',
                          left: `${Number(reg.x) * 100}%`,
                          top: `${Number(reg.y) * 100}%`,
                          width: `${Number(reg.width) * 100}%`,
                          height: `${Number(reg.height) * 100}%`,
                          backgroundColor: isSelected ? 'rgba(220, 38, 38, 0.4)' : 'rgba(37, 99, 235, 0.3)',
                          border: isSelected ? '2px solid #b91c1c' : '2px solid #1d4ed8',
                          clipPath: clip,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'flex-start'
                        }}
                      >
                        <span
                          style={{
                            background: isSelected ? '#b91c1c' : '#1d4ed8',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '0 0 4px 0'
                          }}
                        >
                          #{index + 1}
                        </span>
                      </div>
                    )
                  })}

                  {/* Live Drawing Preview */}
                  {previewBox && (
                    <div
                      style={{
                        position: 'absolute',
                        left: `${previewBox.x}%`,
                        top: `${previewBox.y}%`,
                        width: `${previewBox.w}%`,
                        height: `${previewBox.h}%`,
                        backgroundColor: 'rgba(37, 99, 235, 0.25)',
                        border: '2px dashed #1d4ed8',
                        clipPath: getClipPath(shape),
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Link Setting Header Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  marginBottom: 16
                }}
              >
                <div>
                  <strong style={{ fontSize: 16 }}>
                    পৃষ্ঠা {selectedPage.pageNumber}-এ কাটা অঞ্চল: {regions.length}টি
                  </strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                    নিচে প্রতিটি কাটিংয়ের সাথে সম্পর্কিত সংবাদ ও ভিতরের কন্টিনিউয়েশন পাতা সিলেক্ট করুন।
                  </p>
                </div>
                <button
                  className="button button-green"
                  disabled={saving || !regions.length}
                  onClick={saveRegions}
                >
                  {saving ? 'সংরক্ষণ হচ্ছে...' : 'সব লিংক সংরক্ষণ করুন'}
                </button>
              </div>

              {/* Region Link Controller List with Jump-to-Page Feature */}
              <div className="region-list" style={{ display: 'grid', gap: 12 }}>
                {regions.map((reg, index) => {
                  const currentVal = reg.articleId
                    ? `article:${reg.articleId}`
                    : reg.targetPageNumber
                    ? `page:${reg.targetPageNumber}`
                    : ''
                  const isSelected = selectedRegionIndex === index

                  return (
                    <div
                      key={reg.id || index}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        padding: '12px 16px',
                        background: isSelected ? '#fee2e2' : '#f8fafc',
                        border: isSelected ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        borderRadius: 8
                      }}
                      onClick={() => setSelectedRegionIndex(index)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 'bold', fontSize: 15 }}>#{index + 1}</span>
                          <span className="status-pill" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                            {reg.shapeType === 'l' ? 'L-Shape' : reg.shapeType === 't' ? 'T-Shape' : 'Rectangle'}
                          </span>
                        </div>

                        {/* Article or Page selector */}
                        <div style={{ flex: 1 }}>
                          <select
                            value={currentVal}
                            onChange={e => updateRegionTarget(index, e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                          >
                            <option value="">-- সংবাদ নির্বাচন করুন বা ভিতরের পাতায় পাঠান --</option>
                            <optgroup label="📰 মূল সংবাদের সাথে লিংক (Headline / Story)">
                              {articles.map(art => (
                                <option key={art.id} value={`article:${art.id}`}>
                                  সংবাদ: {art.titleBn}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="📄 ভিতরের কলাম পাতা (Continuation Page)">
                              {pages
                                .filter(p => p.id !== pageId)
                                .map(p => (
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
                          onClick={e => {
                            e.stopPropagation()
                            deleteRegion(index)
                          }}
                        >
                          মুছুন
                        </button>
                      </div>

                      {/* Interactive Continuation Jump Button */}
                      {reg.targetPageNumber && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e0f2fe', padding: '8px 12px', borderRadius: 6 }}>
                          <span style={{ fontSize: 13, color: '#0369a1' }}>
                            এই সংবাদের বাকি অংশ <strong>পৃষ্ঠা নম্বর {reg.targetPageNumber}</strong>-এ আছে।
                          </span>
                          <button
                            type="button"
                            className="button button-primary"
                            style={{ fontSize: 12, padding: '5px 12px' }}
                            onClick={() => {
                              const targetPage = pages.find(p => p.pageNumber === reg.targetPageNumber)
                              if (targetPage) switchPage(targetPage.id)
                            }}
                          >
                            ➡️ পৃষ্ঠা {reg.targetPageNumber}-এ গিয়ে বাকি অংশ কাটুন
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
              <p>উপরে থাকা পৃষ্ঠা তালিকা থেকে যেকোনো একটি পৃষ্ঠায় ক্লিক করুন।</p>
            </div>
          )}
        </section>
      </div>

      {message && <p className="admin-feedback" style={{ marginTop: 18 }}>{message}</p>}
    </>
  )
}