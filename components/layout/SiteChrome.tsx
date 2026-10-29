'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowUpRight, ChevronDown, Clock3, CloudSun, Moon, Search, Sun } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import BreakingTicker from '@/components/layout/BreakingTicker'

const logoMark = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logofinal-1-kG9UPUnYBasa1wBddy2PBm9W7GmXAu.png'

export function SiteHeader() {
  const { language, toggleLanguage, t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const toggleMenu = (menu: string) => setOpenMenu(openMenu === menu ? null : menu)

  return <>
    <div className="topline"><div className="container top-inner"><div className="weather"><CloudSun size={17} /> {t('ঢাকা ৩২°C · পরিষ্কার আকাশ', 'Dhaka 32°C · Clear sky')}</div><div className="date"><Clock3 size={15} /> {t('শুক্রবার, ২৫ সেপ্টেম্বর ২০২৬', 'Friday, September 25, 2026')}</div></div></div>
    <header className="header container"><Link href="/" className="brand"><span className="brand-mark"><img src={logoMark} alt="ক" /></span><span><strong>{t('দৈনিক কল্যাণ', 'Dainik Kalyan')}</strong><small>{t('বস্তুনিষ্ঠতাই আমাদের অহংকার', 'Objectivity is our pride')}</small></span></Link><div className="header-actions"><div className="search"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('খবর খুঁজুন...', 'Search news...')} /><Link href={`/search?q=${encodeURIComponent(search)}`} aria-label={t('খুঁজুন', 'Search')}><ArrowUpRight size={17} /></Link></div><Link href="/epaper" className="epaper">{t('ই-পেপার', 'E-PAPER')}</Link></div></header>
    <nav className="nav"><div className="container nav-inner"><Link href="/">{t('প্রচ্ছদ', 'Home')}</Link><Link href="/category/bangladesh">{t('বাংলাদেশ', 'Bangladesh')}</Link><div className="nav-dropdown"><button className="nav-drop" onClick={() => toggleMenu('southwest')} aria-expanded={openMenu === 'southwest'}>{t('দক্ষিণপশ্চিম', 'Southwest')} <ChevronDown size={14} /></button>{openMenu === 'southwest' && <div className="nav-menu"><Link href="/category/southwest">{t('দক্ষিণপশ্চিম', 'Southwest')}</Link><Link href="/category/khulna">{t('খুলনা', 'Khulna')}</Link><Link href="/category/barishal">{t('বরিশাল', 'Barishal')}</Link></div>}</div><Link href="/category/politics">{t('রাজনীতি', 'Politics')}</Link><Link href="/category/sports">{t('খেলা', 'Sports')}</Link><Link href="/category/world">{t('বিশ্ব', 'World')}</Link><div className="nav-dropdown"><button className="nav-drop" onClick={() => toggleMenu('others')} aria-expanded={openMenu === 'others'}>{t('অন্যান্য', 'Others')} <ChevronDown size={14} /></button>{openMenu === 'others' && <div className="nav-menu"><Link href="/category/economy">{t('অর্থনীতি', 'Economy')}</Link><Link href="/category/video">{t('ভিডিও', 'Video')}</Link><Link href="/epaper">{t('ই-পেপার', 'E-paper')}</Link></div>}</div><div className="nav-tools"><button onClick={toggleTheme} aria-label={t('থিম বদলান', 'Toggle theme')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><button className="lang" onClick={toggleLanguage}>{language === 'bn' ? 'EN' : 'বাং'}</button></div></div></nav>
    <BreakingTicker />
  </>
}

export function SiteFooter() {
  const { t } = useLanguage()
  return <footer className="site-footer"><div className="container footer-inner"><div><strong>{t('দৈনিক কল্যাণ', 'Dainik Kalyan')}</strong><p>{t('বস্তুনিষ্ঠতাই আমাদের অহংকার', 'Objectivity is our pride')}</p></div><nav aria-label={t('ফুটার নেভিগেশন', 'Footer navigation')}><Link href="/">{t('প্রচ্ছদ', 'Home')}</Link><Link href="/epaper">{t('ই-পেপার', 'E-paper')}</Link><Link href="/search">{t('অনুসন্ধান', 'Search')}</Link></nav><small>© ২০২৬ {t('দৈনিক কল্যাণ', 'Dainik Kalyan')}</small></div></footer>
}

export function SiteChrome({ children }: { children: React.ReactNode }) { return <><SiteHeader />{children}<SiteFooter /></> }
