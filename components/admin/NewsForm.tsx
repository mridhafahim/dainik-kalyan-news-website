// 'use client'

// import { useEffect, useMemo, useState } from 'react'
// import { CheckCircle2, ImagePlus, Save, UploadCloud } from 'lucide-react'

// type Category = { id: number; nameBn: string; nameEn?: string | null }
// type FormState = { id?: number; titleBn: string; titleEn: string; excerptBn: string; excerptEn: string; bodyBn: string; bodyEn: string; imageUrl: string; categoryIds: number[]; authorName: string; status: string; scheduledAt: string; isBreaking: boolean }
// const blank: FormState = { titleBn: '', titleEn: '', excerptBn: '', excerptEn: '', bodyBn: '', bodyEn: '', imageUrl: '', categoryIds: [], authorName: 'নিজস্ব প্রতিবেদক', status: 'draft', scheduledAt: '', isBreaking: false }

// export default function NewsForm({ editing = false, articleId }: { editing?: boolean; articleId?: number }) {
//   const [form, setForm] = useState<FormState>({ ...blank, id: articleId });
//   const [categories, setCategories] = useState<Category[]>([])
//   const [message, setMessage] = useState('')
//   const [saving, setSaving] = useState(false)
//   const [uploading, setUploading] = useState(false)
//   const [created, setCreated] = useState(false)
//   const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(current => ({ ...current, [key]: value }))
//   useEffect(() => { void fetch('/api/admin/categories').then(r => r.json()).then(data => setCategories(data.categories || [])); if (articleId) void fetch('/api/admin/news').then(r => r.json()).then(data => { const article = data.articles?.find((item: { id: number }) => item.id === articleId); if (article) setForm({ ...blank, ...article, id: article.id, titleEn: article.titleEn === article.titleBn ? '' : article.titleEn, categoryIds: article.categoryIds || (article.categoryId ? [article.categoryId] : []), scheduledAt: article.scheduledAt ? new Date(article.scheduledAt).toISOString().slice(0, 16) : '' }) }) }, [articleId])
//   const selectedNames = useMemo(() => categories.filter(category => form.categoryIds.includes(category.id)).map(category => category.nameBn).join(', '), [categories, form.categoryIds])
//   async function uploadImage(file: File) { setUploading(true); setMessage('ছবি আপলোড হচ্ছে...'); try { const body = new FormData(); body.append('file', file); const response = await fetch('/api/admin/media/upload', { method: 'POST', body }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'ছবি আপলোড ব্যর্থ'); update('imageUrl', data.asset.url); setMessage('ছবি আপলোড হয়েছে।') } catch (error) { setMessage(error instanceof Error ? error.message : 'ছবি আপলোড ব্যর্থ হয়েছে।') } finally { setUploading(false) } }
//   async function save(event: React.FormEvent) { event.preventDefault(); setSaving(true); setCreated(false); setMessage('সংরক্ষণ হচ্ছে...'); try { const response = await fetch('/api/admin/news', { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, categoryIds: form.categoryIds }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'সংরক্ষণ ব্যর্থ হয়েছে।'); setMessage('সংবাদ সফলভাবে সংরক্ষণ হয়েছে।'); setCreated(true); if (!editing) setForm({ ...blank }) } catch (error) { setMessage(error instanceof Error ? error.message : 'সংরক্ষণ ব্যর্থ হয়েছে।') } finally { setSaving(false) } }
//   return <form className="news-editor phase-two-editor" onSubmit={save}><div className="editor-main"><div className="editor-card"><label>বাংলা শিরোনাম <span className="required">আবশ্যক</span><input className="big-input" required value={form.titleBn} onChange={event => update('titleBn', event.target.value)} placeholder="সংবাদের প্রধান শিরোনাম লিখুন" /></label><label>English title <span className="optional">ঐচ্ছিক · না দিলে বাংলা শিরোনাম ব্যবহৃত হবে</span><input value={form.titleEn} onChange={event => update('titleEn', event.target.value)} placeholder="Optional English headline" /></label><div className="two-form-grid"><label>বাংলা সারাংশ <span className="optional">ঐচ্ছিক</span><textarea rows={4} value={form.excerptBn} onChange={event => update('excerptBn', event.target.value)} placeholder="সংবাদের সংক্ষিপ্ত সারাংশ" /></label><label>English summary <span className="optional">Optional</span><textarea rows={4} value={form.excerptEn} onChange={event => update('excerptEn', event.target.value)} /></label></div><label>বিস্তারিত সংবাদ<textarea rows={12} value={form.bodyBn} onChange={event => update('bodyBn', event.target.value)} placeholder="সম্পূর্ণ সংবাদ লিখুন" /></label><label>English body <span className="optional">Optional</span><textarea rows={8} value={form.bodyEn} onChange={event => update('bodyEn', event.target.value)} /></label></div><div className="editor-card"><div className="editor-card-heading"><div><strong>Featured image</strong><small>Upload an image for this story</small></div><label className="upload-button"><UploadCloud size={16} />{uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file) }} /></label></div>{form.imageUrl ? <img className="editor-image-preview" src={form.imageUrl} alt="Selected article" /> : <div className="editor-image-empty"><ImagePlus size={28} /><span>No image selected</span></div>}</div></div><aside className="editor-side"><div className="editor-card"><h3>Publishing</h3><label>Status<select value={form.status} onChange={event => update('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option></select></label>{form.status === 'scheduled' && <label>Publish at<input type="datetime-local" value={form.scheduledAt} onChange={event => update('scheduledAt', event.target.value)} /></label>}<label>Author<input value={form.authorName} onChange={event => update('authorName', event.target.value)} /></label><label className="check-row"><input type="checkbox" checked={form.isBreaking} onChange={event => update('isBreaking', event.target.checked)} /> Breaking news</label></div><div className="editor-card"><div className="editor-card-heading"><h3>Categories</h3><a href="/dainik-kalyan-control-panel/dashboard/categories">+ New category</a></div><p className="selected-hint">{selectedNames || 'Select one or more categories'}</p><div className="category-checks">{categories.map(category => <label className="check-row" key={category.id}><input type="checkbox" checked={form.categoryIds.includes(category.id)} onChange={event => update('categoryIds', event.target.checked ? [...form.categoryIds, category.id] : form.categoryIds.filter(id => id !== category.id))} />{category.nameBn}</label>)}</div></div></aside><div className="save-bar"><span className={created ? 'save-success' : message.includes('ব্যর্থ') ? 'save-error' : ''}>{created && <CheckCircle2 size={17} />}{message}</span><button className="button button-primary" disabled={saving || uploading}><Save size={16} />{saving ? 'সংরক্ষণ হচ্ছে…' : editing ? 'পরিবর্তন সংরক্ষণ' : 'সংবাদ প্রকাশ করুন'}</button></div></form>
// }



'use client'

import { useEffect, useState } from 'react'
import type React from 'react'

type Category = {
  id: number
  nameBn: string
}

type NewsFormProps = {
  initialData?: {
    id?: number
    titleBn?: string
    categoryId?: number | null
    authorName?: string
    imageUrl?: string
    excerptBn?: string
    bodyBn?: string
    isBreaking?: boolean
    status?: string
  }
  onSuccess?: () => void
}

export function NewsForm({ initialData, onSuccess }: NewsFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [titleBn, setTitleBn] = useState(initialData?.titleBn || '')
  const [categoryId, setCategoryId] = useState<string>(initialData?.categoryId ? String(initialData.categoryId) : '')
  const [authorName, setAuthorName] = useState(initialData?.authorName || 'নিজস্ব প্রতিবেদক')
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '')
  const [excerptBn, setExcerptBn] = useState(initialData?.excerptBn || '')
  const [bodyBn, setBodyBn] = useState(initialData?.bodyBn || '')
  const [isBreaking, setIsBreaking] = useState(Boolean(initialData?.isBreaking))
  const [status, setStatus] = useState(initialData?.status || 'published')

  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // ডেটাবেস থেকে সব ক্যাটাগরি ড্রপডাউনে লোড করা
  useEffect(() => {
    async function loadCats() {
      try {
        const res = await fetch('/api/admin/categories')
        const data = await res.json()
        if (res.ok) setCategories(data.categories || [])
      } catch {
        console.error('Failed to load categories')
      }
    }
    void loadCats()
  }, [])

  // সরাসরি ছবি সিলেক্ট করে আপলোড ও লাইভ প্রিভিউ
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (res.ok && data.url) {
        setImageUrl(data.url)
        setMessage({ text: '✓ ছবি সফলভাবে আপলোড হয়েছে', type: 'success' })
      } else {
        setMessage({ text: data.error || 'ছবি আপলোড ব্যর্থ', type: 'error' })
      }
    } catch {
      setMessage({ text: 'ছবি আপলোড করতে সমস্যা হয়েছে', type: 'error' })
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titleBn.trim()) {
      setMessage({ text: 'সংবাদের শিরোনাম অবশ্যই দিতে হবে', type: 'error' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    const payload = {
      id: initialData?.id,
      titleBn,
      categoryId: categoryId ? Number(categoryId) : null,
      authorName,
      imageUrl,
      excerptBn,
      bodyBn,
      isBreaking,
      status
    }

    try {
      const res = await fetch('/api/admin/news', {
        method: initialData?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({
          text: initialData?.id ? '✅ সংবাদ সফলভাবে আপডেট হয়েছে!' : '✅ সংবাদ সফলভাবে প্রকাশিত হয়েছে!',
          type: 'success'
        })
        if (!initialData?.id) {
          setTitleBn('')
          setImageUrl('')
          setExcerptBn('')
          setBodyBn('')
          setIsBreaking(false)
        }
        if (onSuccess) onSuccess()
      } else {
        setMessage({ text: data.error || 'সংরক্ষণ ব্যর্থ হয়েছে', type: 'error' })
      }
    } catch {
      setMessage({ text: 'সার্ভারে সংযোগ ব্যর্থ', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18, maxWidth: 900, margin: '0 auto' }}>
      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
          }}
        >
          {message.text}
        </div>
      )}

      {/* Title */}
      <label style={{ display: 'grid', gap: 6, fontWeight: 700, fontSize: 14 }}>
        সংবাদের শিরোনাম (বাংলা) *
        <input
          type="text"
          value={titleBn}
          onChange={e => setTitleBn(e.target.value)}
          placeholder="আকর্ষণীয় শিরোনাম লিখুন..."
          required
          style={{ padding: '10px 14px', fontSize: 16, borderRadius: 6, border: '1px solid #cbd5e1' }}
        />
      </label>

      {/* Category & Author Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
          ক্যাটাগরি নির্বাচন করুন
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          >
            <option value="">-- ক্যাটাগরি বেছে নিন --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.nameBn}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
          প্রতিবেদক / লেখকের নাম
          <input
            type="text"
            value={authorName}
            onChange={e => setAuthorName(e.target.value)}
            placeholder="নিজস্ব প্রতিবেদক"
            style={{ padding: '9px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
          />
        </label>
      </div>

      {/* Feature Image Upload & Preview */}
      <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'block', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
          ফিচার ইমেজ (মূল ছবি)
        </label>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ fontSize: 13 }}
          />
          {uploadingImage && <span style={{ fontSize: 12, color: '#2563eb' }}>ছবি আপলোড হচ্ছে...</span>}
        </div>

        {/* Live Preview */}
        {imageUrl && (
          <div style={{ marginTop: 12, position: 'relative', display: 'inline-block' }}>
            <img
              src={imageUrl}
              alt="Feature Preview"
              style={{ maxHeight: 180, borderRadius: 6, border: '1px solid #cbd5e1', display: 'block' }}
            />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                background: 'rgba(220, 38, 38, 0.9)',
                color: '#fff',
                border: 0,
                borderRadius: 999,
                width: 24,
                height: 24,
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
              title="ছবি সরান"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Excerpt / Lead */}
      <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
        সংবাদের সারাংশ / লিড প্যারাগ্রাফ
        <textarea
          value={excerptBn}
          onChange={e => setExcerptBn(e.target.value)}
          placeholder="খবরের প্রথম ২-৩ লাইনের মূল সারসংক্ষেপ..."
          rows={2}
          style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical' }}
        />
      </label>

      {/* Detailed Body */}
      <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
        বিস্তারিত প্রতিবেদন *
        <textarea
          value={bodyBn}
          onChange={e => setBodyBn(e.target.value)}
          placeholder="সম্পূর্ণ সংবাদ এখানে লিখুন..."
          rows={8}
          required
          style={{ padding: '12px 14px', borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical', lineHeight: 1.6 }}
        />
      </label>

      {/* Breaking News Checkbox & Publish Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#c8102e' }}>
          <input
            type="checkbox"
            checked={isBreaking}
            onChange={e => setIsBreaking(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          🚨 ব্রেকিং নিউজ হিসেবে চিহ্নিত করুন
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>
            স্ট্যাটাস:
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{ marginLeft: 8, padding: '7px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
            >
              <option value="published">প্রকাশ করুন (Published)</option>
              <option value="draft">খসড়া রাখুন (Draft)</option>
            </select>
          </label>

          <button
            type="submit"
            className="button button-primary"
            disabled={submitting}
            style={{ padding: '10px 24px', fontSize: 15, fontWeight: 700 }}
          >
            {submitting ? 'সংরক্ষণ হচ্ছে...' : initialData?.id ? 'আপডেট করুন' : 'নিউজ প্রকাশ করুন'}
          </button>
        </div>
      </div>
    </form>
  )
}