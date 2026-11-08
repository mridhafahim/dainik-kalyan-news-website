'use client'

import Link from 'next/link'

type TickerItem = {
  id: number
  textBn: string
  newsUrl: string
}

export function BreakingTicker({ items = [] }: { items?: TickerItem[] }) {
  if (!items || items.length === 0) return null

  return (
    <div
      style={{
        background: '#0f172a',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        height: 38,
        fontSize: 13,
        borderBottom: '1px solid #334155'
      }}
    >
      {/* Label Badge */}
      <div
        style={{
          background: '#c8102e',
          color: '#fff',
          fontWeight: 800,
          padding: '0 16px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          zIndex: 2,
          letterSpacing: '0.5px'
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: 999, background: '#fff', display: 'inline-block' }} />
        ব্রেকিং নিউজ
      </div>

      {/* Fast & Smooth Marquee Slider */}
      <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative' }}>
        <div
          style={{
            display: 'inline-block',
            paddingLeft: '100%',
            animation: 'fastMarquee 24s linear infinite' // গতি বাড়িয়ে ফাস্ট করা হয়েছে
          }}
        >
          {items.map(t => (
            <span key={t.id} style={{ marginRight: 40, display: 'inline-flex', alignItems: 'center' }}>
              <span style={{ color: '#ef4444', marginRight: 8, fontWeight: 'bold' }}>●</span>
              <Link
                href={t.newsUrl || '#'}
                style={{ color: '#f8fafc', textDecoration: 'none', fontWeight: 600 }}
              >
                {t.textBn}
              </Link>
            </span>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fastMarquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-100%, 0, 0); }
        }
      `}</style>
    </div>
  )
}