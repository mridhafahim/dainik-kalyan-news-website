// import ManagementPage from '@/components/admin/ManagementPage'
// export default function Videos(){return <ManagementPage title="ভিডিও ম্যানেজ করুন" subtitle="YouTube লিংক দিলেই ভিডিও তৈরি হয়ে যাবে।" endpoint="/api/admin/videos" kind="video"/>}



'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import { PageTitle } from '@/components/admin/AdminUi'

type VideoItem = {
  id: number
  titleBn: string
  titleEn: string
  youtubeUrl: string
  thumbnailUrl: string
  status: string
  createdAt: string
}

function extractYouTubeId(url: string) {
  const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/)
  return match && match[2].length === 11 ? match[2] : null
}

export default function VideosAdmin() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [titleBn, setTitleBn] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [status, setStatus] = useState('published')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const detectedVideoId = extractYouTubeId(youtubeUrl)

  async function loadVideos() {
    try {
      const res = await fetch('/api/admin/videos')
      const data = await res.json()
      if (res.ok) setVideos(data.videos || [])
    } catch {
      setMessage({ text: 'ভিডিও তালিকা লোড করতে সমস্যা হয়েছে', type: 'error' })
    }
  }

  useEffect(() => {
    void loadVideos()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titleBn.trim() || !youtubeUrl.trim()) {
      setMessage({ text: 'শিরোনাম ও ইউটিউব URL আবশ্যক', type: 'error' })
      return
    }

    if (!detectedVideoId) {
      setMessage({ text: 'সঠিক ইউটিউব ভিডিও লিংক প্রদান করুন', type: 'error' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleBn, titleEn, youtubeUrl, status })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage({ text: '✅ ভিডিও সফলভাবে যোগ হয়েছে!', type: 'success' })
        setTitleBn('')
        setTitleEn('')
        setYoutubeUrl('')
        void loadVideos()
      } else {
        setMessage({ text: data.error || 'ভিডিও যোগ ব্যর্থ', type: 'error' })
      }
    } catch {
      setMessage({ text: 'সার্ভারের সাথে সংযোগ ব্যর্থ', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('আপনি কি এই ভিডিওটি মুছে ফেলতে চান?')) return
    try {
      const res = await fetch(`/api/admin/videos?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setMessage({ text: 'ভিডিওটি সফলভাবে ডিলিট হয়েছে', type: 'success' })
        setVideos(prev => prev.filter(v => v.id !== id))
      }
    } catch {
      setMessage({ text: 'ডিলিট করতে সমস্যা হয়েছে', type: 'error' })
    }
  }

  return (
    <>
      <PageTitle
        title="ভিডিও ম্যানেজমেন্ট"
        subtitle="ইউটিউব ভিডিও যোগ করুন এবং পাবলিক ওয়েবসাইটে ভিডিও গ্যালারিতে প্রদর্শন করুন।"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 24, marginTop: 20 }}>
        {/* Add Video Form */}
        <section className="admin-panel">
          <h2 style={{ fontSize: 18, marginBottom: 14 }}>নতুন ভিডিও যোগ করুন</h2>

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
              ভিডিও শিরোনাম (বাংলা) *
              <input
                type="text"
                value={titleBn}
                onChange={e => setTitleBn(e.target.value)}
                placeholder="ভিডিওর শিরোনাম লিখুন"
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              ইউটিউব ভিডিও লিংক (YouTube URL) *
              <input
                type="url"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              />
              <small style={{ color: '#64748b' }}>ইউটিউবের যেকোনো সাধারণ বা শেয়ার লিংক দিতে পারেন।</small>
            </label>

            {/* Live YouTube Thumbnail Preview */}
            {detectedVideoId && (
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #cbd5e1', background: '#000' }}>
                <img
                  src={`https://img.youtube.com/vi/${detectedVideoId}/hqdefault.jpg`}
                  alt="YouTube Preview"
                  style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }}
                />
                <span style={{ display: 'block', padding: '6px 10px', fontSize: 12, color: '#22c55e', background: '#f8fafc', textAlign: 'center', fontWeight: 600 }}>
                  ✓ ভিডিও সনাক্ত হয়েছে (ভিডিও আইডি: {detectedVideoId})
                </span>
              </div>
            )}

            <label style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
              স্ট্যাটাস
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}
              >
                <option value="published">প্রকাশিত (Published)</option>
                <option value="draft">খসড়া (Draft)</option>
              </select>
            </label>

            <button
              type="submit"
              className="button button-primary"
              disabled={loading || !detectedVideoId}
              style={{ padding: '10px', fontSize: 14, fontWeight: 700, marginTop: 6 }}
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'ভিডিও যোগ করুন'}
            </button>
          </form>
        </section>

        {/* Video List */}
        <section className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>প্রকাশিত ভিডিও গ্যালারি ({videos.length}টি)</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {videos.map(vid => {
              const vidId = extractYouTubeId(vid.youtubeUrl)
              return (
                <div
                  key={vid.id}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                    <img
                      src={vid.thumbnailUrl || `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`}
                      alt={vid.titleBn}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <a
                      href={vid.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        color: '#fff',
                        fontSize: 32,
                        textDecoration: 'none'
                      }}
                      title="ইউটিউবে দেখুন"
                    >
                      ▶
                    </a>
                  </div>

                  <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: 15, margin: '0 0 8px 0', lineHeight: 1.4, color: '#0f172a' }}>
                      {vid.titleBn}
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                      <span className="status-pill status-published" style={{ fontSize: 11 }}>
                        {vid.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(vid.id)}
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
                    </div>
                  </div>
                </div>
              )
            })}

            {!videos.length && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#64748b' }}>
                এখনও কোনো ভিডিও নেই। বাঁ পাশ থেকে ইউটিউব লিংক দিয়ে ভিডিও যোগ করুন।
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  )
}