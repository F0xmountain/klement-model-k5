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
import MyBracketView from '@/components/my-bracket/MyBracketView'
import ResetPicksButton from '@/components/my-bracket/ResetPicksButton'
import PixelParticles from '@/components/ui/PixelParticles'

type Tab = 'edit' | 'view'

export default function MyBracketPage() {
  const t = useTranslations('myBracket')
  const raw = useSyncExternalStore(subscribePicks, getPicksSnapshot, getServerPicksSnapshot)
  const picks = useMemo(() => parsePicks(raw), [raw])
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<Tab>('edit')

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

  const tabBtn = (id: Tab, label: string) => (
    <button
      onClick={() => setTab(id)}
      className={`ko-tab${tab === id ? ' active' : ''}`}
      style={{ fontFamily: 'inherit', fontSize: 9, padding: '8px 14px', cursor: 'pointer', background: 'none', border: 'none' }}
    >
      {label}
    </button>
  )

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="mix" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-title">{t('title')}</div>
        <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
          {t('description')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="ko-tabs" style={{ display: 'flex' }}>
            {tabBtn('edit', t('tabEdit'))}
            {tabBtn('view', t('tabView'))}
          </div>
          <ResetPicksButton />
        </div>

        {tab === 'edit' ? (
          <>
            <MyBracketDisplay resolved={resolved} />
            <MyBracketEditor picks={picks} onPick={handlePick} onCopy={handleCopy} copied={copied} />
          </>
        ) : (
          <MyBracketView resolved={resolved} />
        )}
      </div>
    </div>
  )
}
