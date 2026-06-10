'use client'
import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { teamNames } from '@/lib/klement'
import TeamSelect from '@/components/ui/TeamSelect'
import type { NewsArticle } from '@/app/api/news/[team]/route'

const ALL_TEAMS = teamNames().sort()

function relativeTime(dateStr: string, locale: string) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diffHours = Math.round((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60))
  if (diffHours < 24) return rtf.format(-diffHours, 'hour')
  return rtf.format(-Math.round(diffHours / 24), 'day')
}

type Result =
  | { team: string; status: 'success'; articles: NewsArticle[] }
  | { team: string; status: 'error' }

export default function NewsCard() {
  const t = useTranslations('news')
  const locale = useLocale()
  const [team, setTeam] = useState('Netherlands')
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/news/${encodeURIComponent(team)}`)
      .then(res => {
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data: NewsArticle[]) => {
        if (!cancelled) setResult({ team, status: 'success', articles: data })
      })
      .catch(() => {
        if (!cancelled) setResult({ team, status: 'error' })
      })

    return () => { cancelled = true }
  }, [team])

  const loading = result === null || result.team !== team
  const error = !loading && result?.status === 'error'
  const articles = !loading && result?.status === 'success' ? result.articles : null

  return (
    <div>
      <div className="section-title">{t('title')}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
        {t('description')}
      </div>

      <div style={{ maxWidth: 280, marginBottom: 20 }}>
        <TeamSelect teams={ALL_TEAMS} value={team} onChange={setTeam} />
      </div>

      {loading && (
        <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{t('loading')}</div>
      )}

      {!loading && error && (
        <div style={{ fontSize: 10, color: 'var(--color-r)' }}>{t('error')}</div>
      )}

      {!loading && !error && articles?.length === 0 && (
        <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{t('noResults')}</div>
      )}

      {!loading && !error && articles && articles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {articles.map(a => (
            <a
              key={a.url}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', padding: '12px 14px',
                border: '2px solid var(--color-brd2)',
                backgroundColor: 'var(--color-bg)',
                boxShadow: '3px 3px 0 var(--color-brd)',
                color: 'var(--color-txt)', textDecoration: 'none',
              }}
            >
              <div style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.6 }}>{a.title}</div>
              <div style={{
                fontSize: 8, color: 'var(--color-muted)',
                display: 'flex', justifyContent: 'space-between', gap: 8,
              }}>
                <span>{a.source}</span>
                <span>{relativeTime(a.publishedAt, locale)}</span>
              </div>
            </a>
          ))}
        </div>
      )}

      <div style={{ fontSize: 9, color: 'var(--color-muted)', marginTop: 16, fontStyle: 'italic' }}>
        {t('disclaimer')}
      </div>
    </div>
  )
}
