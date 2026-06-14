'use client'
import { Suspense, useState, useMemo, useCallback, useSyncExternalStore } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  resolveBracket, savePicks, parsePicks,
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
import FlagImg from '@/components/ui/FlagImg'
import TimeAgo from '@/components/ui/TimeAgo'
import { teamData } from '@/lib/klement'
import { getUpsets } from '@/lib/upset-detector'
import { getResultsLastUpdated } from '@/lib/rest-days'

type Tab = 'groups' | 'bracket' | 'klement'

const TABS: readonly Tab[] = ['groups', 'bracket', 'klement']

// useSearchParams vereist een Suspense-grens tijdens prerender.
export default function MyBracketPage() {
  return (
    <Suspense fallback={<div className="sec" />}>
      <MyBracketInner />
    </Suspense>
  )
}

function MyBracketInner() {
  const t = useTranslations('myBracket')
  const ts = useTranslations('simBracket')
  const tc = useTranslations('common')

  const koRaw = useSyncExternalStore(subscribePicks, getPicksSnapshot, getServerPicksSnapshot)
  const picks = useMemo(() => parsePicks(koRaw), [koRaw])
  const groupRaw = useSyncExternalStore(subscribeGroupPicks, getGroupPicksSnapshot, getServerGroupPicksSnapshot)
  const groupPicks = useMemo(() => parseGroupPicks(groupRaw), [groupRaw])

  const r32Teams = useMemo(() => seedR32FromGroups(groupPicks), [groupPicks])
  const resolved = useMemo(() => resolveBracket(r32Teams, picks), [r32Teams, picks])

  // Begin-tab uit ?tab= (zo landen de redirects van /sim-bracket en
  // /knockout/bracket direct op de model-bracket). Tab-wisselen blijft lokaal.
  const tabParam = useSearchParams().get('tab')
  const initialTab: Tab = TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'groups'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [copied, setCopied] = useState(false)

  // Context die voorheen op /sim-bracket stond, nu naast de model-bracket in de
  // klement-tab (deterministisch — leest results.json + modelkansen).
  const lastUpdated = getResultsLastUpdated()
  const upsets = getUpsets().slice(0, 5)

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

  // "Simuleer mijn bracket →": ga naar de bracket-tab, die de Monte Carlo-simulatie
  // van de groepskeuze toont (vaste top-2 + KO 10.000× gesimuleerd). De handmatige
  // picks blijven bewaard — de simulatie staat los van de eigen bracket eronder.
  const onSimulate = useCallback(() => {
    setTab('bracket')
  }, [])

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

            <div className="section-title" style={{ marginBottom: 6 }}>{t('simHeading')}</div>
            <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 1.8, marginBottom: 16 }}>{t('simSub')}</div>
            <SimBracketView r32={r32Teams} />

            <div style={{ borderTop: '1px solid var(--color-brd)', margin: '32px 0 20px' }} />
            <div className="section-title" style={{ marginBottom: 16 }}>{t('manualHeading')}</div>
            <MyBracketView resolved={resolved} />
            <div style={{ marginTop: 28 }}>
              <MyBracketEditor resolved={resolved} onPick={handlePick} onCopy={handleCopy} copied={copied} />
            </div>
          </div>
        )}

        {tab === 'klement' && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2, marginBottom: 6 }}>{ts('subtitle')}</div>
            {lastUpdated && (
              <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 16 }}>
                {ts('updated')} <TimeAgo iso={lastUpdated} />
              </div>
            )}
            <SimBracketView />

            {upsets.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div className="section-title">⚡ {ts('upsets')}</div>
                <div className="factor-card">
                  {upsets.map((u, i) => (
                    <div key={u.matchLabel} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 9, padding: '7px 0', borderTop: i > 0 ? '1px solid var(--color-brd)' : 'none' }}>
                      <span style={{ color: 'var(--color-muted)', minWidth: 22 }}>{u.group}</span>
                      <FlagImg name={u.teamA} h={12} emoji={teamData(u.teamA)?.flag ?? '🏳️'} />
                      <span style={{ color: 'var(--color-txt)' }}>{u.teamA}</span>
                      <span style={{ color: 'var(--color-muted)' }}>{tc('vs')}</span>
                      <FlagImg name={u.teamB} h={12} emoji={teamData(u.teamB)?.flag ?? '🏳️'} />
                      <span style={{ color: 'var(--color-txt)' }}>{u.teamB}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--color-r)' }}>
                        {u.weakerTeam} {Math.round(u.upsetProb * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
