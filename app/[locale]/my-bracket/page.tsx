'use client'
import { useState, useMemo, useCallback, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import {
  resolveBracket, savePicks, parsePicks,
  subscribePicks, getPicksSnapshot, getServerPicksSnapshot,
  type MyPicks, type Round,
} from '@/lib/my-picks'
import MyBracketEditor from '@/components/my-bracket/MyBracketEditor'
import MyBracketDisplay from '@/components/my-bracket/MyBracketDisplay'
import PixelParticles from '@/components/ui/PixelParticles'

export default function MyBracketPage() {
  const t = useTranslations('myBracket')
  const raw = useSyncExternalStore(subscribePicks, getPicksSnapshot, getServerPicksSnapshot)
  const picks = useMemo(() => parsePicks(raw), [raw])
  const [copied, setCopied] = useState(false)

  const handlePick = useCallback((round: Round, index: number, team: string) => {
    const next: MyPicks = { ...picks, [round]: [...picks[round]] }
    next[round][index] = team
    savePicks(next)
  }, [picks])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(picks, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [picks])

  const resolved = resolveBracket(picks)

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('title')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 28 }}>
          {t('description')}
        </div>

        <MyBracketDisplay resolved={resolved} />
        <MyBracketEditor picks={picks} onPick={handlePick} onCopy={handleCopy} copied={copied} />
      </div>
    </div>
  )
}
