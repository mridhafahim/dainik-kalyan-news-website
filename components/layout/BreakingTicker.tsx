'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import useSWR from 'swr'
const fetcher = (url: string) => fetch(url).then((response) => response.json())

export default function BreakingTicker() {
  const { language } = useLanguage()
  const { data } = useSWR<{ tickers: Array<{ id: number; textBn: string; textEn: string; newsUrl: string }> }>('/api/newsroom', fetcher, { revalidateOnFocus: false })
  const liveItems = data?.tickers ?? []
  const items = liveItems.length ? [...liveItems, ...liveItems] : []

  return (
    <div className="breaking-ticker" role="region" aria-label={language === 'bn' ? 'ব্রেকিং নিউজ' : 'Breaking news'}>
      <div className="breaking-ticker-inner">
        <div className="breaking-label">
          <span className="live-dot" aria-hidden="true" />
          <span className="breaking-label-full">{language === 'bn' ? 'ব্রেকিং নিউজ' : 'BREAKING NEWS'}</span>
          <span className="breaking-label-mobile">LIVE</span>
        </div>
        <div className="ticker-window">
          <div className="ticker-track">
            {items.map((item, index) => (
              <Link key={`${item.id}-${index}`} href={item.newsUrl || `/news/${item.id}`} className="ticker-item">
                {language === 'bn' ? item.textBn : item.textEn}
                <span className="ticker-star" aria-hidden="true">★</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
