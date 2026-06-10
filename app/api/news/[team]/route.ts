import { NextResponse } from 'next/server'

export const revalidate = 1800 // 30 minutes

interface NewsApiArticle {
  title: string
  url: string
  publishedAt: string
  source: { name: string }
}

interface NewsApiResponse {
  articles?: NewsApiArticle[]
}

export interface NewsArticle {
  title: string
  url: string
  publishedAt: string
  source: string
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ team: string }> }
) {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'News API not configured' }, { status: 503 })
  }

  const { team } = await params
  const query = encodeURIComponent(`${decodeURIComponent(team)} FIFA World Cup 2026`)
  const url = `https://newsapi.org/v2/everything?q=${query}&sortBy=publishedAt&language=en&pageSize=10&apiKey=${apiKey}`

  let data: NewsApiResponse
  try {
    const res = await fetch(url, { next: { revalidate } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch news' }, { status: 502 })
    }
    data = await res.json()
  } catch {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 502 })
  }

  const cutoff = Date.now() - SEVEN_DAYS_MS
  const articles: NewsArticle[] = (data.articles ?? [])
    .filter(a => new Date(a.publishedAt).getTime() >= cutoff)
    .slice(0, 3)
    .map(a => ({
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      source: a.source.name,
    }))

  return NextResponse.json(articles)
}
