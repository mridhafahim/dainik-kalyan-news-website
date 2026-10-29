import { NextResponse } from 'next/server'
import { getCategories, getPublishedStories, getPublishedVideos, getActiveTickers } from '@/lib/newsroom'

export async function GET() { const [stories, categories, videos, tickers] = await Promise.all([getPublishedStories(), getCategories(), getPublishedVideos(), getActiveTickers()]); return NextResponse.json({ stories, categories, videos, tickers }, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } }) }
