'use client'
import { useState, useEffect, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { simKO, teamData } from '@/lib/klement'
import { ROUNDS } from '@/lib/fixtures'
import { PM_GAP_THRESHOLD } from '@/lib/polymarket'
import FlagImg from '@/components/ui/FlagImg'
import PixelBar from '@/components/ui/PixelBar'
import type { TeamProbability } from '@/app/api/polymarket/route'

const SIMS = 1000
const TOP_N = 10

function simulateTournament(): string {
  const r32 = ROUNDS.r32.map(m => simKO(m.teamA, m.teamB).winner)
  const r16: string[] = []
  for (let i = 0; i < r32.length; i += 2) r16.push(simKO(r32[i], r32[i + 1]).winner)
  const qf: string[] = []
  for (let i = 0; i < r16.length; i += 2) qf.push(simKO(r16[i], r16[i + 1]).winner)
  const sf: string[] = []
  for (let i = 0; i < qf.length; i += 2) sf.push(simKO(qf[i], qf[i + 1]).winner)
  return simKO(sf[0], sf[1]).winner
}

function modelChampionProbabilities(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (let i = 0; i < SIMS; i++) {
    const champ = simulateTournament()
    counts[champ] = (counts[champ] ?? 0) + 1
  }
  const probs: Record<string, number> = {}
  for (const [team, c] of Object.entries(counts)) probs[team] = c / SIMS
  return probs
}

function formatRelative(dateStr: string, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const diffSec = Math.round((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diffSec < 60) return rtf.format(-diffSec, 'second')
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return rtf.format(-diffMin, 'minute')
  return rtf.format(-Math.round(diffMin / 60), 'hour')
}

type Data = TeamProbability[] | 'error' | null

export default function PolymarketWidget() {
  const t = useTranslations('live')
  const locale = useLocale()
  const [data, setData] = useState<Data>(null)
  const modelProbs = useMemo(() => modelChampionProbabilities(), [])

  useEffect(() => {
    fetch('/api/polymarket')
      .then(res => {
        if (!res.ok) throw new Error('failed')
        return res.json() as Promise<TeamProbability[]>
      })
      .then(setData)
      .catch(() => setData('error'))
  }, [])

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, marginBottom: 4,
      }}>
        <div className="section-title" style={{ marginBottom: 0 }}>{t('marketTitle')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 8, color: 'var(--color-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-r)' }}>
            <span className="blink" style={{ width: 6, height: 6, backgroundColor: 'var(--color-r)', display: 'inline-block' }} />
            {t('live')}
          </span>
          {data !== null && data !== 'error' && data[0] && (
            <span>{t('updated', { time: formatRelative(data[0].updatedAt, locale) })}</span>
          )}
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
        {t('marketDescription')}
      </div>

      {data === null && (
        <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{t('loading')}</div>
      )}

      {data === 'error' && (
        <div style={{ fontSize: 10, color: 'var(--color-r)' }}>{t('error')}</div>
      )}

      {data !== null && data !== 'error' && (() => {
        const top = data.slice(0, TOP_N)
        const maxProb = top[0]?.probability ?? 1
        return top.map(({ team, probability }) => {
          const pct = Math.round(probability * 1000) / 10
          const model = modelProbs[team] ?? 0
          const modelPct = Math.round(model * 1000) / 10
          const diff = probability - model
          const arrow = diff > PM_GAP_THRESHOLD ? '▲' : diff < -PM_GAP_THRESHOLD ? '▼' : '≈'
          const arrowColor = diff > PM_GAP_THRESHOLD
            ? 'var(--color-g)'
            : diff < -PM_GAP_THRESHOLD ? 'var(--color-r)' : 'var(--color-muted)'

          return (
            <div key={team} className="pm-row">
              <FlagImg name={team} h={16} emoji={teamData(team)?.flag ?? '🏳️'} />
              <div style={{ fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team}</div>
              <PixelBar value={Math.round((probability / maxProb) * 100)} color="var(--color-b)" />
              <div style={{ fontSize: 10, color: 'var(--color-b)', textAlign: 'right' }}>{pct}%</div>
              <div style={{ fontSize: 8, color: 'var(--color-muted)', textAlign: 'right' }}>
                {t('modelLabel')} {modelPct}% <span style={{ color: arrowColor }}>{arrow}</span>
              </div>
            </div>
          )
        })
      })()}
    </div>
  )
}
