// import Link from 'next/link'
// import { ArrowUpRight, FilePlus2, FolderPlus, ImagePlus, PlaySquare, FileText, Tag, Clock3 } from 'lucide-react'
// import { PageTitle, StatCard } from '@/components/admin/AdminUi'
// import { getAdminDashboardData } from '@/lib/admin-dashboard'

// export const dynamic = 'force-dynamic'
// const actions=[['news/new','নতুন খবর যোগ করুন','Add a story','red',FilePlus2],['categories','ক্যাটাগরি ম্যানেজ','Manage sections','orange',FolderPlus],['media','মিডিয়া লাইব্রেরি','Media library','blue',ImagePlus],['videos','ভিডিও যোগ করুন','Add a video','purple',PlaySquare],['epaper','ই-পেপার আপলোড','Upload today’s paper','green',FileText],['ticker','ব্রেকিং নিউজ','Manage ticker','gold',Tag]] as const
// export default async function Dashboard(){ const data=await getAdminDashboardData(); return <><PageTitle title="ড্যাশবোর্ড" subtitle="আপনার সংবাদকক্ষের আজকের চিত্র এক নজরে।"/><div className="stats-grid"><StatCard label="মোট খবর" value={data.total.toLocaleString('bn-BD')}/><StatCard label="প্রকাশিত" value={data.published.toLocaleString('bn-BD')} tone="green"/><StatCard label="ড্রাফট" value={data.drafts.toLocaleString('bn-BD')} tone="blue"/><StatCard label="শিডিউল" value={data.scheduled.toLocaleString('bn-BD')} tone="orange"/><StatCard label="ব্রেকিং নিউজ" value={data.breaking.toLocaleString('bn-BD')} tone="red"/></div><section className="admin-section"><div className="section-heading"><div><h2>আজ কী করতে চান?</h2><p>একটি কার্ড বেছে নিন।</p></div></div><div className="action-grid">{actions.map(([href,bn,en,tone,Icon])=><Link key={href} href={`/dainik-kalyan-control-panel/dashboard/${href}`} className={`action-card ${tone}`}><span className="action-icon"><Icon size={27}/></span><strong>{bn}</strong><small>{en}</small><ArrowUpRight className="action-arrow" size={19}/></Link>)}</div></section><div className="dashboard-columns"><section className="admin-panel"><div className="section-heading"><div><h2>সাম্প্রতিক কাজ</h2><p>অডিট লগ থেকে সর্বশেষ আপডেট</p></div></div>{data.activity.length ? data.activity.map(item=><div className="activity" key={item.id}><span><Clock3 size={17}/></span><div><strong>{item.action} · {item.resourceType}</strong><small>{new Date(item.createdAt).toLocaleString('bn-BD')}</small></div></div>) : <p>এখনও কোনো প্রশাসনিক কার্যক্রম নেই।</p>}</section><section className="admin-panel alert-panel"><div className="section-heading"><div><h2>প্রকাশনা সারাংশ</h2><p>ডেটাবেস থেকে লাইভ হিসাব</p></div></div><div className="alert-item"><b>{data.scheduled.toLocaleString('bn-BD')}</b><span><strong>শিডিউল করা খবর</strong><small>প্রকাশনার জন্য অপেক্ষমাণ</small></span><Link href="/dainik-kalyan-control-panel/dashboard/news">দেখুন</Link></div></section></div></> }


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

      {/* Statistics Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 16,
          marginTop: 20
        }}
      >
        {/* Total Pageviews */}
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

      {/* Two Column Layout: Most Read Trending News + Recent Stories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: 24, marginTop: 28 }}>
        {/* Most Read (Trending) Section */}
        <section className="admin-panel">
          <h2 style={{ fontSize: 18, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔥 সর্বাধিক পঠিত সংবাদ (Top Read)
          </h2>

          <div style={{ display: 'grid', gap: 12 }}>
            {topStories.map((story, index) => (
              <div
                key={story.id}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      background: index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#64748b',
                      color: '#fff',
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {index + 1}
                  </span>
                  <Link
                    href={`/news/${story.id}`}
                    target="_blank"
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#0f172a',
                      textDecoration: 'none',
                      lineHeight: 1.4
                    }}
                  >
                    {story.titleBn}
                  </Link>
                </div>

                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '3px 8px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}
                >
                  👁️ {story.viewCount || 0}
                </span>
              </div>
            ))}

            {!topStories.length && (
              <p style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>
                এখনও কোনো খবর পঠিত হয়নি।
              </p>
            )}
          </div>
        </section>

        {/* Recent Stories Table with Live View Badge */}
        <section className="admin-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>সাম্প্রতিক প্রকাশিত সংবাদ</h2>
            <Link
              href="/dainik-kalyan-control-panel/dashboard/news"
              style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
            >
              সব সংবাদ →
            </Link>
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
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {story.isBreaking && (
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: 4, fontSize: 11, marginRight: 6 }}>
                          ব্রেকিং
                        </span>
                      )}
                      {story.titleBn}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0369a1' }}>
                      👁️ {(story.viewCount || 0).toLocaleString('bn-BD')}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span className={`status-pill ${story.status === 'published' ? 'status-published' : 'status-draft'}`}>
                        {story.status === 'published' ? 'প্রকাশিত' : 'খসড়া'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <a
                        href={`/news/${story.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563eb', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}
                      >
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