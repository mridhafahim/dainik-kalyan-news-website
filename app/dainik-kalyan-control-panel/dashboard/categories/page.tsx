// import ManagementPage from '@/components/admin/ManagementPage'
// export default function Categories(){return <ManagementPage title="ক্যাটাগরি ম্যানেজ করুন" subtitle="খবরগুলোকে সুন্দরভাবে সাজিয়ে রাখুন।" endpoint="/api/admin/categories" kind="category"/>}


'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { PageTitle } from '@/components/admin/AdminUi'

type Category = {
  id: number
  nameBn: string
  nameEn: string
  slug: string
  sortOrder: number
}

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[]>([])
  const [nameBn, setNameBn] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [slug, setSlug] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  async function loadCategories() {
    try {
      const res = await fetch('/api/admin/categories')
      const data = await res.json()
      if (res.ok) {
        setCategories(data.categories || [])
      }
    } catch {
      setMessage({ text: 'ক্যাটাগরি তালিকা লোড করতে সমস্যা হয়েছে', type: 'error' })
    }
  }

  useEffect(() => {
    void loadCategories()
  }, [])

  // ইংরেজি নাম লেখার সাথে সাথে স্বয়ংক্রিয় স্লাগ তৈরি
  function handleNameEnChange(val: string) {
    setNameEn(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nameBn.trim()) {
      setMessage({ text: 'বাংলা নাম অবশ্যই দিতে হবে', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameBn,
          nameEn,
          slug,
          sortOrder: Number(sortOrder) || 0
        })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ text: '✅ নতুন ক্যাটাগরি সফলভাবে যুক্ত হয়েছে!', type: 'success' })
        setNameBn('')
        setNameEn('')
        setSlug('')
        setSortOrder('0')
        void loadCategories()
      } else {
        setMessage({ text: data.error || 'ক্যাটাগরি যোগ ব্যর্থ হয়েছে', type: 'error' })
      }
    } catch (err) {
      setMessage({ text: 'সার্ভারের সাথে সংযোগ ব্যর্থ', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('আপনি কি নিশ্চিত যে এই ক্যাটাগরি মুছে ফেলতে চান?')) return
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (res.ok) {
        setMessage({ text: 'ক্যাটাগরি সফলভাবে ডিলিট করা হয়েছে', type: 'success' })
        setCategories(prev => prev.filter(c => c.id !== id))
      } else {
        setMessage({ text: data.error || 'ডিলিট ব্যর্থ', type: 'error' })
      }
    } catch {
      setMessage({ text: 'ডিলিট করতে সমস্যা হয়েছে', type: 'error' })
    }
  }

  return (
    <>
      <PageTitle
        title="ক্যাটাগরি ম্যানেজমেন্ট"
        subtitle="নতুন ক্যাটাগরি তৈরি করুন, সাজান এবং সংবাদে ব্যবহারের জন্য প্রস্তুত রাখুন।"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 400px) 1fr', gap: 24, marginTop: 20 }}>
        {/* Add Category Form */}
        <section className="admin-panel">
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>নতুন ক্যাটাগরি যুক্ত করুন</h2>

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
              বাংলা নাম (যেমন: জাতীয়, আন্তর্জাতিক) *
              <input
                type="text"
                value={nameBn}
                onChange={e => setNameBn(e.target.value)}
                placeholder="বাংলা নাম লিখুন"
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              ইংরেজি নাম (যেমন: National, Sports)
              <input
                type="text"
                value={nameEn}
                onChange={e => handleNameEnChange(e.target.value)}
                placeholder="English Name"
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              স্লাগ (URL Slug)
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="national-news"
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              সিরিয়াল / ক্রম (Sort Order)
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </label>

            <button
              type="submit"
              className="button button-primary"
              disabled={loading}
              style={{ padding: '10px', fontSize: 14, fontWeight: 700, marginTop: 6 }}
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'ক্যাটাগরি যোগ করুন'}
            </button>
          </form>
        </section>

        {/* Existing Categories List */}
        <section className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>সকল ক্যাটাগরি ({categories.length}টি)</h2>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>ক্রম</th>
                  <th style={{ padding: '10px 12px' }}>বাংলা নাম</th>
                  <th style={{ padding: '10px 12px' }}>ইংরেজি নাম</th>
                  <th style={{ padding: '10px 12px' }}>স্লাগ</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{cat.sortOrder}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#c8102e' }}>{cat.nameBn}</td>
                    <td style={{ padding: '10px 12px', color: '#475569' }}>{cat.nameEn}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      <code>/{cat.slug}</code>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 0,
                          padding: '4px 10px',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 600
                        }}
                      >
                        মুছুন
                      </button>
                    </td>
                  </tr>
                ))}
                {!categories.length && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                      এখনও কোনো ক্যাটাগরি নেই। বাঁ পাশ থেকে নতুন ক্যাটাগরি যোগ করুন।
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}