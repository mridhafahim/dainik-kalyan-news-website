import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { getCategories, getPublishedStories } from '@/lib/newsroom'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [stories, categories] = await Promise.all([getPublishedStories(), getCategories()])
  const lead = stories[0]
  return <SiteChrome><main className="container main"><div className="section-kicker"><span>আজকের প্রধান খবর</span><i /></div>{!lead ? <div className="empty-state"><h1>এখনো কোনো প্রকাশিত সংবাদ নেই</h1><p>প্রশাসন প্যানেল থেকে প্রথম সংবাদ প্রকাশ করুন।</p></div> : <><div className="news-grid"><section className="lead"><Link href={`/news/${lead.id}`} className="story-card large"><div className="story-image" style={lead.imageUrl ? { backgroundImage: `url(${lead.imageUrl})` } : undefined}><span>{categories.find(c => c.id === lead.categoryId)?.nameBn || 'সংবাদ'}</span></div><div className="story-copy"><h2>{lead.titleBn}</h2><p>{lead.excerptBn}</p><small>{lead.publishedAt ? new Date(lead.publishedAt).toLocaleDateString('bn-BD') : ''}</small></div></Link></section><aside className="side-stack">{stories.slice(1, 4).map(story => <Link href={`/news/${story.id}`} className="priority-story" key={story.id}><div className="priority-thumb" style={story.imageUrl ? { backgroundImage: `url(${story.imageUrl})` } : undefined} aria-hidden="true" /><div className="story-copy"><h3>{story.titleBn}</h3><small>{story.publishedAt ? new Date(story.publishedAt).toLocaleDateString('bn-BD') : ''}</small></div></Link>)}</aside></div><div className="section-kicker below"><span>নির্বাচিত বিভাগ</span><i /></div><div className="section-grid">{categories.slice(0, 6).map(category => <section className="highlight" key={category.id}><div className="highlight-head"><h2>{category.nameBn}</h2><Link href={`/category/${category.slug}`}>সব দেখুন <ArrowUpRight size={15} /></Link></div>{stories.filter(s => s.categoryId === category.id).slice(0, 2).map(story => <Link href={`/news/${story.id}`} className="category-story" key={story.id}><div className="story-copy"><h3>{story.titleBn}</h3><p>{story.excerptBn}</p></div></Link>)}</section>)}</div></>}</main></SiteChrome>
}
