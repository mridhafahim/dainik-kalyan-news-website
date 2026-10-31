// import ManagementPage from '@/components/admin/ManagementPage'
// export default function Ticker(){return <ManagementPage title="ব্রেকিং নিউজ" subtitle="লাইভ টিকার আপডেট করুন এবং গতি ঠিক করুন।" endpoint="/api/admin/ticker" kind="ticker"/>}



'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { PageTitle } from '@/components/admin/AdminUi'

type TickerItem = {
  id: number
  textBn: string
  textEn: string
  newsUrl: string
  isActive: boolean
  sortOrder: number
}

export default function TickerAdmin() {
  const [tickers, setTickers] = useState<TickerItem[]>([])
  const [textBn, setTextBn] = useState('')
  const [newsUrl, setNewsUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  async function loadTickers() {
    try {
      const res = await fetch('/api/admin/ticker')
      const data = await res.json()
      if (res.ok) setTickers(data.tickers || [])
    } catch {
      setMessage({ text: 'টিকার তালিকা লোড করতে সমস্যা হয়েছে', type: 'error' })
    }
  }

  useEffect(() => {
    void loadTickers()
  }, [])

  function startEdit(item: TickerItem) {
    setEditingId(item.id)
    setTextBn(item.textBn)
    setNewsUrl(item.newsUrl === '#' ? '' : item.newsUrl)
    setSortOrder(String(item.sortOrder))
    setIsActive(item.isActive)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setTextBn('')
    setNewsUrl('')
    setSortOrder('0')
    setIsActive(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!textBn.trim()) {
      setMessage({ text: 'টিকারের বাংলা শিরোনাম অবশ্যই দিতে হবে', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const payload = {
        id: editingId,
        textBn,
        textEn: textBn,
        newsUrl: newsUrl.trim() || '#',
        sortOrder: Number(sortOrder) || 0,
        isActive
      }

      const res = await fetch('/api/admin/ticker', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({
          text: editingId ? '✅ টিকার সফলভাবে আপডেট হয়েছে!' : '✅ নতুন টিকার সফলভাবে যুক্ত হয়েছে!',
          type: 'success'
        })
        cancelEdit()
        void loadTickers()
      } else {
        setMessage({ text: data.error || 'টিকার সংরক্ষণ ব্যর্থ', type: 'error' })
      }
    } catch {
      setMessage({ text: 'সার্ভারের সাথে সংযোগ ব্যর্থ', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(item: TickerItem) {
    try {
      const res = await fetch('/api/admin/ticker', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive })
      })
      if (res.ok) {
        setTickers(prev => prev.map(t => (t.id === item.id ? { ...t, isActive: !item.isActive } : t)))
      }
    } catch {
      setMessage({ text: 'স্ট্যাটাস পরিবর্তন ব্যর্থ', type: 'error' })
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('আপনি কি নিশ্চিত যে এই টিকারটি মুছে ফেলতে চান?')) return
    try {
      const res = await fetch(`/api/admin/ticker?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ text: 'টিকার ডিলিট হয়েছে', type: 'success' })
        setTickers(prev => prev.filter(t => t.id !== id))
        if (editingId === id) cancelEdit()
      }
    } catch {
      setMessage({ text: 'ডিলিট করতে সমস্যা হয়েছে', type: 'error' })
    }
  }

  return (
    <>
      <PageTitle
        title="ব্রেকিং নিউজ টিকার"
        subtitle="ওয়েবসাইটের একদম উপরে চলমান তাজা খবর ও ব্রেকিং হেডলাইন পরিচালনা করুন।"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 24, marginTop: 20 }}>
        {/* Add/Edit Form */}
        <section className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>
              {editingId ? 'টিকার এডিট করুন' : 'নতুন টিকার যুক্ত করুন'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                style={{ fontSize: 12, color: '#dc2626', background: 'transparent', border: 0, cursor: 'pointer', fontWeight: 600 }}
              >
                ✕ বাতিল
              </button>
            )}
          </div>

          {message && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 14,
                fontWeight: 600,
                background: message.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: message.type === 'success' ? '#166534' : '#991b1b',
                border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              টিকার সংবাদ (বাংলা) *
              <textarea
                value={textBn}
                onChange={e => setTextBn(e.target.value)}
                placeholder="যেমন: যশোরে ডেঙ্গু পরিস্থিতি নিয়ন্ত্রণে বিশেষ সভা অনুষ্ঠিত..."
                rows={3}
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              সংবাদের লিংক (ঐচ্ছিক)
              <input
                type="text"
                value={newsUrl}
                onChange={e => setNewsUrl(e.target.value)}
                placeholder="/news/12 অথবা https://..."
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
              <small style={{ color: '#64748b' }}>লিংক না থাকলে ফাঁকা রাখুন।</small>
            </label>

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              সিরিয়াল / অগ্রাধিকার (ক্রম)
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              সক্রিয় রাখুন (ওয়েবসাইটে দেখাবে)
            </label>

            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
              style={{ padding: '10px', fontSize: 14, fontWeight: 700, marginTop: 6 }}
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : editingId ? 'টিকার আপডেট করুন' : 'টিকার যুক্ত করুন'}
            </button>
          </form>
        </section>

        {/* Existing Tickers List */}
        <section className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>টিকার তালিকা ({tickers.length}টি)</h2>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {tickers.map(item => (
              <div
                key={item.id}
                style={{
                  background: '#f8fafc',
                  border: item.id === editingId ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>#{item.sortOrder}</span>
                    <button
                      type="button"
                      onClick={() => toggleActive(item)}
                      style={{
                        border: 0,
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: item.isActive ? '#dcfce7' : '#fee2e2',
                        color: item.isActive ? '#166534' : '#991b1b'
                      }}
                      title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                    >
                      {item.isActive ? '● সক্রিয়' : '○ নিষ্ক্রিয়'}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0f172a', lineHeight: 1.4 }}>
                    {item.textBn}
                  </p>
                  {item.newsUrl && item.newsUrl !== '#' && (
                    <small style={{ color: '#2563eb', display: 'block', marginTop: 4 }}>
                      লিংক: {item.newsUrl}
                    </small>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    style={{
                      background: '#f1f5f9',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      padding: '5px 12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    এডিট
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 0,
                      padding: '5px 12px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    মুছুন
                  </button>
                </div>
              </div>
            ))}

            {!tickers.length && (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                এখনও কোনো টিকার যুক্ত করা হয়নি।
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}