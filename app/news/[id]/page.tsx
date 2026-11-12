import { notFound } from 'next/navigation'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { getStory, getRelatedStoriesForArticle } from '@/lib/newsroom'
import NewsArticleClient from '@/components/news/NewsArticleClient'

export const dynamic = 'force-dynamic'

export default async function NewsPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()

  const story = await getStory(id)
  if (!story) notFound()

  const { rightSidebarStories, bottomRelatedStories } = await getRelatedStoriesForArticle(story)

  return (
    <SiteChrome>
      <NewsArticleClient
        story={story}
        rightSidebarStories={rightSidebarStories}
        bottomRelatedStories={bottomRelatedStories}
      />
    </SiteChrome>
  )
}