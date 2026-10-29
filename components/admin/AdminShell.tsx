'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, FileText, Folder, Image, LogOut, Menu, Newspaper, PlaySquare, Settings, Tag, Users, X } from 'lucide-react'
import { useState } from 'react'

const items = [
  ['users','ইউজার','Users',Users], ['dashboard','ড্যাশবোর্ড','Dashboard',Newspaper], ['news','খবর ম্যানেজ করুন','News',FileText], ['categories','ক্যাটাগরি','Categories',Folder], ['media','মিডিয়া লাইব্রেরি','Media',Image], ['videos','ভিডিও','Videos',PlaySquare], ['epaper','ই-পেপার','E-paper',FileText], ['ticker','ব্রেকিং নিউজ','Ticker',Tag], ['ads','বিজ্ঞাপন','Ads',Tag], ['settings','সেটিংস','Settings',Settings],
] as const

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false)
  const logout = async () => { await fetch('/api/admin/login', { method: 'DELETE' }); router.push('/dainik-kalyan-control-panel/login') }
  return <div className="admin-app"><aside className={`admin-sidebar ${open ? 'is-open' : ''}`}><div className="admin-brand"><span className="brand-mark">ক</span><span><strong>দৈনিক কল্যাণ</strong><small>Control Panel</small></span><button className="admin-close" onClick={() => setOpen(false)} aria-label="মেনু বন্ধ করুন"><X size={20}/></button></div><nav>{items.map(([slug,bn,en,Icon]) => <Link key={slug} href={`/dainik-kalyan-control-panel/dashboard${slug === 'dashboard' ? '' : `/${slug}`}`} className={pathname.endsWith(slug) || (slug === 'dashboard' && pathname.endsWith('dashboard')) ? 'active' : ''} onClick={() => setOpen(false)}><Icon size={19}/><span>{bn}<small>{en}</small></span></Link>)}</nav><button className="admin-logout" onClick={logout}><LogOut size={18}/> লগআউট</button></aside><div className="admin-main"><header className="admin-topbar"><button className="admin-menu" onClick={() => setOpen(true)} aria-label="মেনু খুলুন"><Menu size={22}/></button><div><strong>স্বাগতম, সম্পাদক</strong><small>আজ আপনার সংবাদকক্ষ প্রস্তুত</small></div><div className="admin-top-actions"><button aria-label="নোটিফিকেশন"><Bell size={20}/><i>3</i></button><span className="admin-avatar">এ</span></div></header><main className="admin-content">{children}</main></div></div>
}
