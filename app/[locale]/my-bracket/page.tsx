'use client'
import { useState, useMemo, useCallback, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import {
  resolveBracket, savePicks, clearPicks, parsePicks,
  subscribePicks, getPicksSnapshot, getServerPicksSnapshot,
  type MyPicks, type Round,
} from '@/lib/my-picks'
import {
  parseGroupPicks, seedR32FromGroups,
  subscribeGroupPicks, getGroupPicksSnapshot, getServerGroupPicksSnapshot,
} from '@/lib/group-picks'
import GroupStagePicker from '@/components/my-bracket/GroupStagePicker'
import MyBracketEditor from '@/components/my-bracket/MyBracketEditor'
import MyBracketView from '@/components/my-bracket/MyBracketView'
import ResetPicksButton from '@/components/my-bracket/ResetPicksButton'
import SimBracketView from '@/components/bracket/SimBracketView'
import PixelParticles from '@/components/ui/PixelParticles'

type Tab = 'groups' | 'bracket' | 'klement'

export default function MyBracketPage() {
  const t = useTranslations('myBracket')

  const koRaw = useSyncExternalStore(subscribePicks, getPicksSnapshot, getServerPicksSnapshot)
  const picks = useMemo(() => parsePicks(koRaw), [koRaw])
  const groupRaw = useSyncExternalStore(subscribeGroupPicks, getGroupPicksSnapshot, getServerGroupPicksSnapshot)
  const groupPicks = useMemo(() => parseGroupPicks(groupRaw), [groupRaw])

  const r32Teams = useMemo(() => seedR32FromGroups(groupPicks), [groupPicks])
  const resolved = useMemo(() => resolveBracket(r32Teams, picks), [r32Teams, picks])

  const [tab, setTab] = useState<Tab>('groups')
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

  const onSimulate = useCallback(() => {
    const hasKoPicks = Object.values(picks).some(arr => arr.some(p => p !== null))
    if (hasKoPicks && !window.confirm(t('confirmReset'))) return
    clearPicks()
    setTab('bracket')
  }, [picks, t])

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

        <div className="ko-tabs" style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 20 }}>
          {tabBtn('groups', t('tabGroups'))}
          {tabBtn('bracket', t('tabBracket'))}
          {tabBtn('klement', t('tabKlement'))}
        </div>

        {tab === 'groups' && <GroupStagePicker onSimulate={onSimulate} />}

        {tab === 'bracket' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
              <button
                onClick={() => setTab('groups')}
                className="px-btn"
                style={{ fontFamily: 'inherit', fontSize: 8, padding: '6px 12px', background: 'none', border: '1px solid var(--color-brd2)', color: 'var(--color-b)', cursor: 'pointer' }}
              >
                ← {t('tabGroups')}
              </button>
              <ResetPicksButton />
            </div>
            <MyBracketView resolved={resolved} />
            <div style={{ marginTop: 28 }}>
              <MyBracketEditor resolved={resolved} onPick={handlePick} onCopy={handleCopy} copied={copied} />
            </div>
          </div>
        )}

        {tab === 'klement' && <SimBracketView />}
      </div>
    </div>
  )
}
