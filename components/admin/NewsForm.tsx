'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import Link from 'next/link'

type Category = {
  id: number
  nameBn: string
}

type NewsFormProps = {
  initialData?: {
    id?: number
    titleBn?: string
    categoryId?: number | null
    categoryIds?: number[]
    authorName?: string
    imageUrl?: string
    excerptBn?: string
    bodyBn?: string
    isBreaking?: boolean
    status?: string
  }
  onSuccess?: () => void
}

export default function NewsForm({ initialData, onSuccess }: NewsFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [titleBn, setTitleBn] = useState(initialData?.titleBn || '')
  
  // একাধিক ক্যাটাগরি স্টেট
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    initialData?.categoryIds || (initialData?.categoryId ? [initialData.categoryId] : [])
  )

  const [authorName, setAuthorName] = useState(initialData?.authorName || 'নিজস্ব প্রতিবেদক')
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '')
  const [excerptBn, setExcerptBn] = useState(initialData?.excerptBn || '')
  const [bodyBn, setBodyBn] = useState(initialData?.bodyBn || '')
  const [isBreaking, setIsBreaking] = useState(Boolean(initialData?.isBreaking))
  const [status, setStatus] = useState(initialData?.status || 'published')

  const [uploadingImage, setUploadingImage] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

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

  // ক্যাটাগরি টগল (ক্লিক করলে যোগ/বাদ হবে)
  function toggleCategory(catId: number) {
    setSelectedCategoryIds(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    )
  }

  // সব ক্যাটাগরি একসাথে সিলেক্ট / ডিসিলেক্ট
  function handleSelectAllCategories() {
    if (selectedCategoryIds.length === categories.length) {
      setSelectedCategoryIds([])
    } else {
      setSelectedCategoryIds(categories.map(c => c.id))
    }
  }

  // ছবি আপলোড
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
      setMessage({ text: 'সংবাদের শিরোনাম অবশ্যই প্রদান করতে হবে', type: 'error' })
      return
    }

    setSubmitting(true)
    setMessage(null)

    const payload = {
      id: initialData?.id,
      titleBn,
      categoryIds: selectedCategoryIds,
      categoryId: selectedCategoryIds[0] || null,
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
          text: initialData?.id
            ? '✅ সংবাদ সফলভাবে আপডেট হয়েছে!'
            : '✅ সংবাদ সফলভাবে প্রকাশিত হয়েছে!',
          type: 'success'
        })
        if (!initialData?.id) {
          setTitleBn('')
          setSelectedCategoryIds([])
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
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'grid',
        gap: 24,
        maxWidth: 960,
        margin: '20px auto 40px',
        background: '#fff',
        padding: 32,
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.05)'
      }}
    >
      {message && (
        <div
          style={{
            padding: '12px 18px',
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
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
          সংবাদের শিরোনাম (বাংলা) <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <input
          type="text"
          value={titleBn}
          onChange={e => setTitleBn(e.target.value)}
          placeholder="আকর্ষণীয় শিরোনাম লিখুন..."
          required
          style={{
            padding: '12px 16px',
            fontSize: 16,
            fontWeight: 600,
            borderRadius: 8,
            border: '2px solid #cbd5e1',
            outline: 'none',
            color: '#0f172a'
          }}
        />
      </div>

      {/* Multiple Category Selection */}
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <label style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            ক্যাটাগরি নির্বাচন করুন (একাধিক ক্যাটাগরি সিলেক্ট করতে পারেন)
            {selectedCategoryIds.length > 0 && (
              <span style={{ marginLeft: 8, color: '#c8102e', fontWeight: 700 }}>
                ({selectedCategoryIds.length}টি নির্বাচিত)
              </span>
            )}
          </label>

          <button
            type="button"
            onClick={handleSelectAllCategories}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              color: '#2563eb'
            }}
          >
            {selectedCategoryIds.length === categories.length && categories.length > 0
              ? '✕ সব বাদ দিন'
              : '✓ সবগুলো সিলেক্ট করুন'}
          </button>
        </div>

        {/* Clean, Error-Free Category Pills Grid */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            background: '#f8fafc',
            padding: '14px 16px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            minHeight: 52
          }}
        >
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCategory(cat.id)}
              style={{
                padding: '7px 16px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: selectedCategoryIds.includes(cat.id) ? '1px solid #c8102e' : '1px solid #cbd5e1',
                background: selectedCategoryIds.includes(cat.id) ? '#c8102e' : '#fff',
                color: selectedCategoryIds.includes(cat.id) ? '#fff' : '#334155',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s ease',
                boxShadow: selectedCategoryIds.includes(cat.id) ? '0 2px 6px rgba(200, 16, 46, 0.25)' : 'none'
              }}
            >
              <span>{selectedCategoryIds.includes(cat.id) ? '✓' : '＋'}</span>
              <span>{cat.nameBn}</span>
            </button>
          ))}

          {!categories.length && (
            <span style={{ fontSize: 13, color: '#64748b' }}>কোনো ক্যাটাগরি পাওয়া যায়নি।</span>
          )}
        </div>
      </div>

      {/* Author Name */}
      <div style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
        <label style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>
          প্রতিবেদক / লেখকের নাম
        </label>
        <input
          type="text"
          value={authorName}
          onChange={e => setAuthorName(e.target.value)}
          placeholder="নিজস্ব প্রতিবেদক"
          style={{
            padding: '10px 14px',
            fontSize: 14,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#f8fafc'
          }}
        />
      </div>

      {/* Feature Image Upload */}
      <div
        style={{
          background: '#f8fafc',
          padding: 20,
          borderRadius: 10,
          border: '1px solid #e2e8f0'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            ফিচার ইমেজ (মূল ছবি)
          </label>
          <Link
            href="/dainik-kalyan-control-panel/dashboard/media"
            target="_blank"
            style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
          >
            মিডিয়া লাইব্রেরি দেখুন ↗
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ fontSize: 13 }}
          />
          {uploadingImage && <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 600 }}>ছবি আপলোড হচ্ছে...</span>}
        </div>

        {imageUrl && (
          <div
            style={{
              marginTop: 14,
              position: 'relative',
              display: 'inline-block',
              borderRadius: 8,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <img
              src={imageUrl}
              alt="Feature Preview"
              style={{ maxHeight: 220, display: 'block', objectFit: 'cover' }}
            />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(220, 38, 38, 0.9)',
                color: '#fff',
                border: 0,
                borderRadius: 999,
                width: 28,
                height: 28,
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="ছবি মুছে ফেলুন"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Excerpt */}
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontWeight: 700, fontSize: 14, color: '#334155' }}>
            সংবাদের সারসংক্ষেপ / লিড প্যারাগ্রাফ
          </label>
          <span style={{ fontSize: 12, color: '#64748b' }}>{excerptBn.length} অক্ষর</span>
        </div>
        <textarea
          value={excerptBn}
          onChange={e => setExcerptBn(e.target.value)}
          placeholder="খবরের মূল সারসংক্ষেপ..."
          rows={2}
          style={{
            padding: '10px 14px',
            fontSize: 14,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
            সম্পূর্ণ প্রতিবেদন <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {bodyBn.trim() ? `${bodyBn.trim().split(/\s+/).length} শব্দ` : '০ শব্দ'}
          </span>
        </div>
        <textarea
          value={bodyBn}
          onChange={e => setBodyBn(e.target.value)}
          placeholder="সম্পূর্ণ সংবাদ বিস্তারিতভাবে এখানে লিখুন..."
          rows={10}
          required
          style={{
            padding: '14px 16px',
            fontSize: 15,
            lineHeight: 1.8,
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            resize: 'vertical'
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          borderTop: '2px solid #f1f5f9',
          paddingTop: 18
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 14,
            color: isBreaking ? '#dc2626' : '#64748b',
            background: isBreaking ? '#fee2e2' : '#f8fafc',
            padding: '8px 14px',
            borderRadius: 6,
            border: isBreaking ? '1px solid #fca5a5' : '1px solid #e2e8f0'
          }}
        >
          <input
            type="checkbox"
            checked={isBreaking}
            onChange={e => setIsBreaking(e.target.checked)}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
          🚨 ব্রেকিং নিউজ হিসেবে চিহ্নিত করুন
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>
            স্ট্যাটাস:
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{
                marginLeft: 8,
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff'
              }}
            >
              <option value="published">প্রকাশ করুন (Published)</option>
              <option value="draft">খসড়া রাখুন (Draft)</option>
            </select>
          </label>

          <button
            type="submit"
            className="button button-primary"
            disabled={submitting}
            style={{
              padding: '10px 28px',
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 6
            }}
          >
            {submitting ? 'সংরক্ষণ হচ্ছে...' : initialData?.id ? 'আপডেট করুন' : 'নিউজ প্রকাশ করুন'}
          </button>
        </div>
      </div>
    </form>
  )
}

export { NewsForm }