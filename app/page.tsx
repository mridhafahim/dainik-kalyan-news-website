'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { SiteChrome } from '@/components/layout/SiteChrome'

type Story = {
  id: number
  titleBn: string
  authorName: string
  imageUrl: string
  excerptBn: string
  isBreaking: boolean
  publishedAt: string
  categoryId: number
  viewCount: number
}

type Category = { id: number; nameBn: string; slug: string }
type VideoItem = { id: number; titleBn: string; youtubeUrl: string; thumbnailUrl: string }

export default function HomePage() {
  const [stories, setStories] = useState<Story[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [mostRead, setMostRead] = useState<Story[]>([])
  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null)

  // Video slider scroll ref
  const videoSliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/newsroom')
      .then(res => res.json())
      .then(data => {
        setStories(data.stories || [])
        setCategories(data.categories || [])
        setVideos(data.videos || [])
      })
      .catch(() => {})

    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.topStories) setMostRead(data.topStories)
      })
      .catch(() => {})
  }, [])

  function scrollSlider(direction: 'left' | 'right') {
    if (!videoSliderRef.current) return
    const offset = direction === 'left' ? -340 : 340
    videoSliderRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  function getEmbedId(url: string) {
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/)
    return match && match[2].length === 11 ? match[2] : null
  }

  const leadStory = stories[0]
  const secondaryStories = stories.slice(1, 5)

  // British date
  const now = new Date()
  const dayNumber = now.getDate().toString().padStart(2, '0')
  const monthName = now.toLocaleString('en-US', { month: 'long' }).toUpperCase()
  const yearNumber = now.getFullYear()
  const weekDay = now.toLocaleString('en-US', { weekday: 'long' }).toUpperCase()
  const banglaDate = now.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <SiteChrome>
      <main style={{ maxWidth: 1380, width: '94%', margin: '0 auto', padding: '20px 0 60px' }}>
        {/* Main 2-Column Grid */}
        <div className="home-main-grid">
          {/* Left Column */}
          <div>
            {leadStory && (
              <article style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: 24, marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ background: '#c8102e', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 4 }}>
                    আজকের প্রধান খবর
                  </span>
                  {leadStory.isBreaking && (
                    <span style={{ background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 4 }}>
                      ব্রেকিং
                    </span>
                  )}
                </div>

                <h1 style={{ fontSize: 'clamp(26px, 3.2vw, 42px)', lineHeight: 1.25, margin: '0 0 14px 0', color: '#0f172a' }}>
                  <Link href={`/news/${leadStory.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {leadStory.titleBn}
                  </Link>
                </h1>

                {leadStory.imageUrl && (
                  <Link href={`/news/${leadStory.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ width: '100%', maxHeight: 460, aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden', backgroundColor: '#f1f5f9', marginBottom: 16 }}>
                      <img src={leadStory.imageUrl} alt={leadStory.titleBn} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  </Link>
                )}

                {leadStory.excerptBn && (
                  <p style={{ fontSize: 17, lineHeight: 1.7, color: '#475569', margin: '0 0 10px 0' }}>
                    {leadStory.excerptBn}
                  </p>
                )}

                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  {leadStory.authorName} · {leadStory.publishedAt ? new Date(leadStory.publishedAt).toLocaleDateString('bn-BD') : ''}
                </div>
              </article>
            )}

            {/* Secondary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
              {secondaryStories.map(story => (
                <article key={story.id} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: 16 }}>
                  <div>
                    {story.imageUrl && (
                      <Link href={`/news/${story.id}`}>
                        <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f1f5f9', marginBottom: 12 }}>
                          <img src={story.imageUrl} alt={story.titleBn} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        </div>
                      </Link>
                    )}
                    <h3 style={{ fontSize: 18, lineHeight: 1.35, margin: '0 0 8px 0', color: '#0f172a' }}>
                      <Link href={`/news/${story.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {story.titleBn}
                      </Link>
                    </h3>
                    {story.excerptBn && <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>{story.excerptBn.slice(0, 100)}...</p>}
                  </div>
                  <small style={{ color: '#94a3b8', fontSize: 12, marginTop: 10 }}>{story.authorName}</small>
                </article>
              ))}
            </div>

            {/* Selected Category Sections (Modern Card UI) */}
            {categories.length > 0 && (
              <div style={{ marginTop: 44 }}>
                <div className="section-kicker" style={{ marginBottom: 20 }}>
                  <span>নির্বাচিত বিভাগসমূহ</span>
                  <i />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                  {categories.slice(0, 4).map(cat => {
                    const catStories = stories.filter(s => s.categoryId === cat.id).slice(0, 3)
                    return (
                      <div key={cat.id} style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #c8102e', paddingBottom: 8, marginBottom: 14 }}>
                          <h4 style={{ margin: 0, fontSize: 18, color: '#c8102e', fontWeight: 800 }}>{cat.nameBn}</h4>
                          <Link href={`/category/${cat.slug}`} style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>সব দেখুন →</Link>
                        </div>

                        <div style={{ display: 'grid', gap: 14 }}>
                          {catStories.map(cs => (
                            <div key={cs.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              {cs.imageUrl && (
                                <img src={cs.imageUrl} alt={cs.titleBn} style={{ width: 70, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                              )}
                              <Link href={`/news/${cs.id}`} style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', textDecoration: 'none', lineHeight: 1.35 }}>
                                {cs.titleBn}
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <aside style={{ display: 'grid', gap: 28, position: 'sticky', top: 80 }}>
            {/* British-Style Calendar Widget */}
            <div className="desktop-only-calendar" style={{ background: '#fff', border: '2px solid #1e293b', borderRadius: 12, overflow: 'hidden', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <div style={{ background: '#8b0000', color: '#fff', padding: '12px 16px', borderBottom: '3px solid #d4af37' }}>
                <span style={{ fontFamily: '"Georgia", serif', letterSpacing: '2px', fontSize: 12, fontWeight: 700 }}>THE DAINIK KALYAN</span>
                <small style={{ fontSize: 11, display: 'block', opacity: 0.9 }}>JASHORE EDITION</small>
              </div>

              <div style={{ padding: '24px 20px', background: '#faf9f6' }}>
                <span style={{ fontFamily: '"Georgia", serif', fontSize: 13, letterSpacing: '2px', color: '#64748b', fontWeight: 600 }}>{weekDay}</span>
                <div style={{ fontFamily: '"Georgia", serif', fontSize: 72, fontWeight: 700, lineHeight: 1, color: '#0f172a', margin: '6px 0' }}>{dayNumber}</div>
                <div style={{ fontFamily: '"Georgia", serif', fontSize: 15, fontWeight: 700, letterSpacing: '3px', color: '#8b0000' }}>{monthName} {yearNumber}</div>
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid #e2e8f0', fontSize: 13, color: '#475569', fontWeight: 600 }}>{banglaDate}</div>
              </div>

              <Link href="/epaper" style={{ display: 'block', background: '#0f172a', color: '#fff', padding: 12, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                📰 আজকের ই-পেপার পড়ুন →
              </Link>
            </div>

            {/* Most Read (Trending) Section */}
            <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #c8102e', paddingBottom: 10, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#c8102e', fontWeight: 800 }}>🔥 সর্বাধিক পঠিত</h3>
                <span style={{ fontSize: 11, background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>টপ ৫</span>
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                {mostRead.map((story, index) => (
                  <div key={story.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ background: index === 0 ? '#c8102e' : index === 1 ? '#ea580c' : '#64748b', color: '#fff', width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {index + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <Link href={`/news/${story.id}`} style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', textDecoration: 'none', lineHeight: 1.35 }}>
                        {story.titleBn}
                      </Link>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>👁️ {(story.viewCount || 0).toLocaleString('bn-BD')} বার পঠিত</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* ================= SEPARATE SWIPEABLE VIDEO CAROUSEL SECTION ================= */}
        {videos.length > 0 && (
          <section style={{ marginTop: 60, background: '#0f172a', color: '#fff', padding: '32px 24px', borderRadius: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 24, margin: '0 0 6px 0', color: '#ef4444', fontWeight: 900 }}>
                  🎥 ভিডিও গ্যালারি
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                  ডানে-বামে স্লাইড করে সর্বশেষ ভিডিও খবরগুলো দেখুন
                </p>
              </div>

              {/* Slider Arrows */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => scrollSlider('left')}
                  style={{ background: '#334155', color: '#fff', border: 0, width: 36, height: 36, borderRadius: 999, cursor: 'pointer', fontSize: 18, fontWeight: 'bold' }}
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => scrollSlider('right')}
                  style={{ background: '#334155', color: '#fff', border: 0, width: 36, height: 36, borderRadius: 999, cursor: 'pointer', fontSize: 18, fontWeight: 'bold' }}
                >
                  →
                </button>
              </div>
            </div>

            {/* Horizontal Swipeable Track */}
            <div
              ref={videoSliderRef}
              style={{
                display: 'flex',
                gap: 20,
                overflowX: 'auto',
                scrollSnapType: 'x mandatory',
                paddingBottom: 10
              }}
            >
              {videos.map(vid => {
                const vidId = getEmbedId(vid.youtubeUrl)
                return (
                  <div
                    key={vid.id}
                    onClick={() => { if (vidId) setActiveVideoModal(vidId) }}
                    style={{
                      flex: '0 0 300px',
                      scrollSnapAlign: 'start',
                      background: '#1e293b',
                      borderRadius: 10,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                      <img
                        src={vid.thumbnailUrl || `https://img.youtube.com/vi/${vidId}/hqdefault.jpg`}
                        alt={vid.titleBn}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
                        <span style={{ background: '#dc2626', color: '#fff', width: 44, height: 44, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          ▶
                        </span>
                      </div>
                    </div>

                    <div style={{ padding: 12 }}>
                      <h4 style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: '#f8fafc', fontWeight: 600 }}>
                        {vid.titleBn}
                      </h4>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Video Player Modal */}
        {activeVideoModal && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: 16 }}
            onClick={() => setActiveVideoModal(null)}
          >
            <div style={{ width: '100%', maxWidth: 850, aspectRatio: '16/9', position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                style={{ position: 'absolute', top: -40, right: 0, background: '#ef4444', color: '#fff', border: 0, borderRadius: 999, width: 32, height: 32, cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✕
              </button>
              <iframe
                src={`https://www.youtube.com/embed/${activeVideoModal}?autoplay=1`}
                style={{ width: '100%', height: '100%', border: 0, borderRadius: 10 }}
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </main>
    </SiteChrome>
  )
}