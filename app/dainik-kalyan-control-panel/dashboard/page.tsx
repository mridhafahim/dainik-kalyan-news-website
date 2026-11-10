'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageTitle } from '@/components/admin/AdminUi'

type StatsData = {
  totalNews: number
  breakingNews: number
  drafts: number
  categories: number
  videos: number
  epaperEditions: number
  totalViews: number
}

type StoryItem = {
  id: number
  titleBn: string
  authorName?: string
  status?: string
  isBreaking?: boolean
  viewCount: number
  createdAt?: string
}

type ResetRequest = {
  userId: string
  code: string
  expiry: number
  active: boolean
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData>({
    totalNews: 0,
    breakingNews: 0,
    drafts: 0,
    categories: 0,
    videos: 0,
    epaperEditions: 0,
    totalViews: 0
  })
  const [topStories, setTopStories] = useState<StoryItem[]>([])
  const [recentStories, setRecentStories] = useState<StoryItem[]>([])
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([])
  const [loading, setLoading] = useState(true)

  async function loadDashboardData() {
    try {
      const res = await fetch('/api/admin/dashboard')
      const data = await res.json()
      if (res.ok) {
        setStats(data.stats)
        setTopStories(data.topStories || [])
        setRecentStories(data.recentStories || [])
      }

      // মডারেটরদের পাসওয়ার্ড রিসেট রিকোয়েস্ট লোড করা
      const pwdRes = await fetch('/api/admin/password')
      const pwdData = await pwdRes.json()
      if (pwdData.resetRequests) {
        setResetRequests(pwdData.resetRequests.filter((r: any) => r.active))
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboardData()
  }, [])

  return (
    <>
      <PageTitle
        title="দৈনিক কল্যাণ কন্ট্রোল প্যানেল"
        subtitle="নিউজ পোর্টালের সার্বিক পরিসংখ্যান, লাইভ ভিউ কাউন্ট ও রিয়েল-টাইম মনিটরিং।"
      />

      {/* 🔔 SUPER ADMIN PASSWORD RESET OTP NOTIFICATION BAR */}
      {resetRequests.length > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: 10,
            padding: '14px 18px',
            marginTop: 16,
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#b45309', fontWeight: 800, fontSize: 14 }}>
            <span>🔔</span>
            <span>মডারেটর পাসওয়ার্ড রিসেট অনুরোধ এসেছে ({resetRequests.length}টি)</span>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
            {resetRequests.map(req => (
              <div
                key={req.userId}
                style={{
                  background: '#fff',
                  border: '1px solid #fde68a',
                  padding: '8px 14px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span style={{ fontSize: 13, color: '#1e293b' }}>
                  মডারেটর আইডি: <strong>{req.userId}</strong>
                </span>
                <span style={{ background: '#dc2626', color: '#fff', padding: '4px 12px', borderRadius: 6, fontSize: 14, fontWeight: 900, letterSpacing: '2px' }}>
                  ওটিপি কোড: {req.code}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistics Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 16,
          marginTop: 20
        }}
      >
        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '2px solid #2563eb', boxShadow: '0 4px 12px rgba(37,99,235,0.08)' }}>
          <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>👁️ মোট সাইট ভিউ (Pageviews)</span>
          <h2 style={{ fontSize: 32, margin: '8px 0 0', color: '#1d4ed8' }}>
            {loading ? '...' : stats.totalViews.toLocaleString('bn-BD')}
          </h2>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>মোট প্রকাশিত সংবাদ</span>
          <h2 style={{ fontSize: 32, margin: '8px 0 0', color: '#16a34a' }}>
            {loading ? '...' : stats.totalNews.toLocaleString('bn-BD')}
          </h2>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ব্রেকিং নিউজ</span>
          <h2 style={{ fontSize: 32, margin: '8px 0 0', color: '#dc2626' }}>
            {loading ? '...' : stats.breakingNews.toLocaleString('bn-BD')}
          </h2>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>খসড়া সংবাদ</span>
          <h2 style={{ fontSize: 32, margin: '8px 0 0', color: '#d97706' }}>
            {loading ? '...' : stats.drafts.toLocaleString('bn-BD')}
          </h2>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ক্যাটাগরি</span>
          <h2 style={{ fontSize: 32, margin: '8px 0 0', color: '#0284c7' }}>
            {loading ? '...' : stats.categories.toLocaleString('bn-BD')}
          </h2>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>ই-পেপার সংখ্যা</span>
          <h2 style={{ fontSize: 32, margin: '8px 0 0', color: '#9333ea' }}>
            {loading ? '...' : stats.epaperEditions.toLocaleString('bn-BD')}
          </h2>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/dainik-kalyan-control-panel/dashboard/news" className="button button-primary" style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 700, borderRadius: 6 }}>
          ➕ নতুন সংবাদ তৈরি করুন
        </Link>
        <Link href="/dainik-kalyan-control-panel/dashboard/epaper" className="button button-green" style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 700, borderRadius: 6 }}>
          📄 ই-পেপার আপলোড ও ম্যাপিং
        </Link>
        <Link href="/dainik-kalyan-control-panel/dashboard/categories" className="button button-ghost" style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 700, borderRadius: 6 }}>
          📁 ক্যাটাগরি তৈরি
        </Link>
        <Link href="/dainik-kalyan-control-panel/dashboard/media" className="button button-ghost" style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 700, borderRadius: 6 }}>
          🖼️ মিডিয়া লাইব্রেরি
        </Link>
      </div>

      {/* Two Column Layout: Top Stories + Recent Stories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 24, marginTop: 28 }}>
        <section className="admin-panel">
          <h2 style={{ fontSize: 18, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔥 সর্বাধিক পঠিত সংবাদ (Top Read)
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {topStories.map((story, index) => (
              <div key={story.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#64748b', color: '#fff', width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                    {index + 1}
                  </span>
                  <Link href={`/news/${story.id}`} target="_blank" style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', textDecoration: 'none', lineHeight: 1.4 }}>
                    {story.titleBn}
                  </Link>
                </div>
                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  👁️ {story.viewCount || 0}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>সাম্প্রতিক প্রকাশিত সংবাদ</h2>
            <Link href="/dainik-kalyan-control-panel/dashboard/news" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>সব সংবাদ →</Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>শিরোনাম</th>
                  <th style={{ padding: '10px 12px' }}>ভিউ কাউন্ট</th>
                  <th style={{ padding: '10px 12px' }}>স্ট্যাটাস</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>ভিউ</th>
                </tr>
              </thead>
              <tbody>
                {recentStories.map(story => (
                  <tr key={story.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{story.titleBn}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0369a1' }}>👁️ {(story.viewCount || 0).toLocaleString('bn-BD')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`status-pill ${story.status === 'published' ? 'status-published' : 'status-draft'}`}>
                        {story.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <a href={`/news/${story.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
                        পাবলিক সাইটে দেখুন ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  )
}