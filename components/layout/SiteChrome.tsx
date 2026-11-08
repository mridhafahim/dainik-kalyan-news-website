'use client'

import { useEffect, useState } from 'react'
import type React from 'react'
import Link from 'next/link'
import { BreakingTicker } from './BreakingTicker'

type TickerItem = { id: number; textBn: string; newsUrl: string }

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const [tickers, setTickers] = useState<TickerItem[]>([])
  const [weather, setWeather] = useState('যশোর: ২৮° সে. · রোদোজ্জ্বল')

  // আজকের তারিখ
  const now = new Date()
  const banglaDate = now.toLocaleDateString('bn-BD', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  const englishDate = now.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  useEffect(() => {
    // ব্রেকিং টিকার লোড
    fetch('/api/newsroom')
      .then(res => res.json())
      .then(data => {
        if (data.tickers) setTickers(data.tickers)
      })
      .catch(() => {})

    // লাইভ আবহাওয়া (Open-Meteo থেকে যশোরের আবহাওয়া)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=23.16&longitude=89.21&current_weather=true')
      .then(res => res.json())
      .then(data => {
        if (data.current_weather?.temperature) {
          const temp = Math.round(data.current_weather.temperature)
          setWeather(`যশোর: ${temp}° সে. · আর্দ্রতা স্বাভাবিক`)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#faf9f6', color: '#0f172a' }}>
      {/* 1. TOP UTILITY BAR (Live Weather, Real Dates & Socials) */}
      <header style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 13, color: '#475569' }}>
        <div style={{ maxWidth: 1380, width: '94%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span>📅 {banglaDate}</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span>{englishDate}</span>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <span style={{ color: '#c8102e', fontWeight: 600 }}>🌤️ {weather}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/epaper" style={{ color: '#c8102e', textDecoration: 'none', fontWeight: 700 }}>
              📰 আজকের ই-পেপার
            </Link>
            <span style={{ color: '#cbd5e1' }}>|</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ color: '#1877f2', textDecoration: 'none', fontWeight: 'bold' }}>Facebook</a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" style={{ color: '#ff0000', textDecoration: 'none', fontWeight: 'bold' }}>YouTube</a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" style={{ color: '#000', textDecoration: 'none', fontWeight: 'bold' }}>X</a>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN LOGO HEADER */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 0' }}>
        <div style={{ maxWidth: 1380, width: '94%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <h1 style={{ margin: 0, fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 900, color: '#c8102e', letterSpacing: '-1px' }}>
                দৈনিক কল্যাণ
              </h1>
            </Link>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
              দক্ষিণাঞ্চলের শীর্ষ দৈনিক ও অনলাইন নিউজ পোর্টাল · যশোর
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              href="/epaper"
              style={{
                background: '#c8102e',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: 6,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14
              }}
            >
              ই-পেপার পড়ুন
            </Link>
          </div>
        </div>
      </div>

      {/* 3. NAVIGATION BAR */}
      <nav style={{ background: '#fff', borderBottom: '2px solid #c8102e', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ maxWidth: 1380, width: '94%', margin: '0 auto', display: 'flex', gap: 20, overflowX: 'auto', padding: '10px 0', fontSize: 15, fontWeight: 700 }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#0f172a' }}>প্রচ্ছদ</Link>
          <Link href="/category/national" style={{ textDecoration: 'none', color: '#0f172a' }}>জাতীয়</Link>
          <Link href="/category/politics" style={{ textDecoration: 'none', color: '#0f172a' }}>রাজনীতি</Link>
          <Link href="/category/jashore" style={{ textDecoration: 'none', color: '#c8102e' }}>যশোর</Link>
          <Link href="/category/sports" style={{ textDecoration: 'none', color: '#0f172a' }}>খেলাধুলা</Link>
          <Link href="/category/international" style={{ textDecoration: 'none', color: '#0f172a' }}>আন্তর্জাতিক</Link>
          <Link href="/category/economy" style={{ textDecoration: 'none', color: '#0f172a' }}>বাণিজ্য</Link>
          <Link href="/category/entertainment" style={{ textDecoration: 'none', color: '#0f172a' }}>বিনোদন</Link>
          <Link href="/epaper" style={{ textDecoration: 'none', color: '#c8102e' }}>ই-পেপার</Link>
        </div>
      </nav>

      {/* 4. FAST BREAKING NEWS TICKER */}
      <BreakingTicker items={tickers} />

      {/* PAGE CONTENT */}
      <div style={{ flex: 1 }}>{children}</div>

      {/* 5. PROTHOM ALO & KALBELA STYLE RICH FOOTER */}
      <footer style={{ background: '#0f172a', color: '#f8fafc', borderTop: '4px solid #c8102e', marginTop: 60, padding: '48px 0 24px' }}>
        <div style={{ maxWidth: 1380, width: '94%', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 36, borderBottom: '1px solid #334155', paddingBottom: 36 }}>
            {/* Column 1: Brand & Office */}
            <div>
              <h2 style={{ fontSize: 32, margin: '0 0 10px', color: '#ef4444', fontWeight: 900 }}>
                দৈনিক কল্যাণ
              </h2>
              <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
                যশোর থেকে প্রকাশিত দক্ষিণ-পশ্চিমাঞ্চলের গণমানুষের জনপ্রিয় দৈনিক পত্রিকা।
              </p>
              <div style={{ marginTop: 14, fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>
                <strong>বার্তা ও বাণিজ্যিক কার্যালয়:</strong> এম এম আলী রোড, যশোর, বাংলাদেশ।<br />
                <strong>ইমেইল:</strong> dainikkalyan@gmail.com<br />
                <strong>ফোন:</strong> +৮৮০ ২৪৭৭৭৬৭৮৯
              </div>
            </div>

            {/* Column 2: Sections */}
            <div>
              <h3 style={{ fontSize: 16, color: '#fff', borderBottom: '2px solid #ef4444', paddingBottom: 8, marginBottom: 14 }}>
                গুরুত্বপূর্ণ বিভাগ
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>প্রচ্ছদ</Link>
                <Link href="/epaper" style={{ color: '#94a3b8', textDecoration: 'none' }}>ই-পেপার</Link>
                <Link href="/category/national" style={{ color: '#94a3b8', textDecoration: 'none' }}>জাতীয়</Link>
                <Link href="/category/politics" style={{ color: '#94a3b8', textDecoration: 'none' }}>রাজনীতি</Link>
                <Link href="/category/jashore" style={{ color: '#94a3b8', textDecoration: 'none' }}>যশোর সংবাদ</Link>
                <Link href="/category/sports" style={{ color: '#94a3b8', textDecoration: 'none' }}>খেলাধুলা</Link>
                <Link href="/category/international" style={{ color: '#94a3b8', textDecoration: 'none' }}>আন্তর্জাতিক</Link>
                <Link href="/category/economy" style={{ color: '#94a3b8', textDecoration: 'none' }}>অর্থনীতি</Link>
              </div>
            </div>

            {/* Column 3: Special Initiatives */}
            <div>
              <h3 style={{ fontSize: 16, color: '#fff', borderBottom: '2px solid #ef4444', paddingBottom: 8, marginBottom: 14 }}>
                বিশেষ আয়োজন
              </h3>
              <div style={{ display: 'grid', gap: 8, fontSize: 14, color: '#94a3b8' }}>
                <Link href="/epaper" style={{ color: '#94a3b8', textDecoration: 'none' }}>ঈদ ও বিশেষ সংখ্যা</Link>
                <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>ভিডিও গ্যালারি</Link>
                <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>ফটো গ্যালারি</Link>
                <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>বিজ্ঞাপন রেট ও নীতিমালা</Link>
                <Link href="/dainik-kalyan-control-panel/login" style={{ color: '#ef4444', textDecoration: 'none', fontWeight: 600 }}>
                  অ্যাডমিন লগইন ↗
                </Link>
              </div>
            </div>

            {/* Column 4: Socials */}
            <div>
              <h3 style={{ fontSize: 16, color: '#fff', borderBottom: '2px solid #ef4444', paddingBottom: 8, marginBottom: 14 }}>
                আমাদের সাথে থাকুন
              </h3>
              <p style={{ fontSize: 13, color: '#94a3b8' }}>সোশ্যাল মিডিয়ায় সর্বশেষ খবরের আপডেট পেতে যুক্ত হোন:</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" style={{ background: '#1877f2', color: '#fff', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Facebook</a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" style={{ background: '#ff0000', color: '#fff', padding: '8px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>YouTube</a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div style={{ paddingTop: 24, textAlign: 'center', fontSize: 13, color: '#64748b' }}>
            স্বত্ব © {now.getFullYear()} দৈনিক কল্যাণ · সকল স্বত্ব সংরক্ষিত।
          </div>
        </div>
      </footer>
    </div>
  )
}