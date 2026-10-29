import Link from 'next/link'
import { getCategoryBySlug, getPublishedStoriesByCategory } from '@/lib/newsroom'
import { SiteChrome } from '@/components/layout/SiteChrome'

export const dynamic = 'force-dynamic'

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)
  if (!category) return <SiteChrome><main className="container main"><p><Link href="/">প্রচ্ছদ</Link></p><div className="empty-state"><h1>বিভাগ পাওয়া যায়নি</h1><p>This category is not available yet.</p></div></main></SiteChrome>
  const stories = await getPublishedStoriesByCategory(category.id)
  return <SiteChrome><main className="container main"><p className="breadcrumb"><Link href="/">প্রচ্ছদ</Link> / {category.nameBn}</p><div className="section-kicker"><span>{category.nameBn}</span><i /></div>{stories.length === 0 ? <div className="empty-state"><h1>{category.nameBn}</h1><p>এই বিভাগে এখনো কোনো প্রকাশিত সংবাদ নেই।</p><small>No published stories in this category yet.</small></div> : <div className="category-list">{stories.map((story) => <Link href={`/news/${story.id}`} className="category-story" key={story.id}><div className="story-image" style={story.imageUrl ? { backgroundImage: `url(${story.imageUrl})` } : undefined}><span>{category.nameBn}</span></div><div className="story-copy"><h2>{story.titleBn}</h2><p>{story.excerptBn}</p><small>{story.publishedAt ? new Date(story.publishedAt).toLocaleDateString('bn-BD') : ''}</small></div></Link>)}</div>}</main></SiteChrome>
}
