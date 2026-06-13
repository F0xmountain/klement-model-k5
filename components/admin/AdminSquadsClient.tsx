'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Btn from '@/components/ui/Btn'
import FlagImg from '@/components/ui/FlagImg'
import { teamData } from '@/lib/klement'
import type { PlayerStatus } from '@/lib/squad-modifier'
import type { PlayerRating } from '@/lib/player-ratings'

interface Player {
  name: string
  club: string | null
  category: string
  isStar: boolean
  starRank?: number
  status: PlayerStatus
}

export interface AdminTeam {
  teamNl: string
  nameEn: string
  teamName: string
  group: string
  coach: string
  fifaRanking: number
  squadDataError: boolean
  players: Player[]
  playedMatches: { matchId: string; label: string }[]
}

interface Props {
  teams: AdminTeam[]
  lastUpdated: string
  initialRatings: PlayerRating[]
}

type StatusMap = Record<string, Record<string, PlayerStatus>>
type View = 'injuries' | 'ratings'

const ratingKey = (matchId: string, teamName: string, player: string) => `${matchId}|${teamName}|${player}`

export default function AdminSquadsClient({ teams, lastUpdated, initialRatings }: Props) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [view, setView] = useState<View>('injuries')

  const [statuses, setStatuses] = useState<StatusMap>(() => {
    const init: StatusMap = {}
    for (const team of teams) {
      const teamStatuses: Record<string, PlayerStatus> = {}
      for (const p of team.players) teamStatuses[p.name] = p.status
      init[team.teamNl] = teamStatuses
    }
    return init
  })
  const [openTeam, setOpenTeam] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedAt, setSavedAt] = useState(lastUpdated)

  // Ratings als map (matchId|team|player → rating) voor O(1) lezen/schrijven.
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const r of initialRatings) init[ratingKey(r.matchId, r.teamName, r.playerName)] = r.rating
    return init
  })
  const [ratingTeamNl, setRatingTeamNl] = useState(teams[0]?.teamNl ?? '')
  const [ratingMatchId, setRatingMatchId] = useState('')
  const [ratingSave, setRatingSave] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  function setStatus(teamNl: string, player: string, status: PlayerStatus) {
    setStatuses(prev => ({ ...prev, [teamNl]: { ...prev[teamNl], [player]: status } }))
    setSaveState('idle')
  }

  async function handleSave() {
    setSaveState('saving')
    try {
      const res = await fetch('/api/admin/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses }),
      })
      if (!res.ok) throw new Error('save failed')
      const data = await res.json()
      setSavedAt(data.lastUpdated)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  function setRating(matchId: string, teamName: string, player: string, value: number | null) {
    const k = ratingKey(matchId, teamName, player)
    setRatings(prev => {
      const next = { ...prev }
      if (value === null) delete next[k]
      else next[k] = value
      return next
    })
    setRatingSave('idle')
  }

  async function handleSaveRatings() {
    setRatingSave('saving')
    try {
      const list: PlayerRating[] = Object.entries(ratings).map(([k, rating]) => {
        const [matchId, teamName, playerName] = k.split('|')
        return { matchId: matchId!, teamName: teamName!, playerName: playerName!, rating }
      })
      const res = await fetch('/api/admin/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratings: list }),
      })
      if (!res.ok) throw new Error('save failed')
      setRatingSave('saved')
    } catch {
      setRatingSave('error')
    }
  }

  const tabBtn = (v: View, label: string) => (
    <button
      onClick={() => setView(v)}
      className={`ko-tab${view === v ? ' active' : ''}`}
      style={{ background: 'none', fontFamily: 'inherit' }}
    >
      {label}
    </button>
  )

  return (
    <div>
      {/* Sub-tabs: Blessures | Ratings */}
      <div className="ko-tabs" style={{ overflowX: 'auto', marginBottom: 16 }}>
        {tabBtn('injuries', t('tabInjuries'))}
        {tabBtn('ratings', t('tabRatings'))}
      </div>

      {view === 'injuries' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 8, color: 'var(--color-muted)' }}>
              {t('lastUpdated')}: {savedAt ? new Date(savedAt).toLocaleString() : '—'}
            </span>
            <Btn variant="green" onClick={handleSave} disabled={saveState === 'saving'}>
              {saveState === 'saving' ? t('saving') : t('save')}
            </Btn>
          </div>

          {saveState === 'saved' && (
            <div style={{ fontSize: 8, color: 'var(--color-g)', marginBottom: 12 }}>{t('saved')}</div>
          )}
          {saveState === 'error' && (
            <div style={{ fontSize: 8, color: 'var(--color-r)', marginBottom: 12 }}>{t('saveError')}</div>
          )}

          {teams.map(team => {
            const flag = teamData(team.nameEn)?.flag ?? '🏳️'
            const open = openTeam === team.teamNl
            const sortedPlayers = [...team.players].sort(
              (a, b) => (a.starRank ?? 99) - (b.starRank ?? 99)
            )

            return (
              <div key={team.teamNl} className="group-card" style={{ marginBottom: 10 }}>
                <button
                  onClick={() => setOpenTeam(open ? null : team.teamNl)}
                  className="group-header"
                  style={{
                    width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontFamily: 'inherit',
                  }}
                >
                  <span>
                    {team.fifaRanking}. <FlagImg name={team.nameEn} h={12} emoji={flag} /> {team.nameEn} — {t('group')} {team.group} · {team.coach}
                  </span>
                  <span>{open ? '▲' : '▼'}</span>
                </button>

                {team.squadDataError && (
                  <div style={{
                    fontSize: 8, color: 'var(--color-o)', background: 'var(--color-o-bg)',
                    padding: '8px 14px', borderBottom: '1px solid var(--color-o-sh)',
                  }}>
                    ⚠ {t('squadDataErrorWarning')}
                  </div>
                )}

                {open && (
                  <div>
                    {sortedPlayers.map(player => (
                      <div key={player.name} className="admin-player-row">
                        <span className={`status-dot status-dot-${statuses[team.teamNl]?.[player.name] ?? 'fit'}`} />
                        <span>{player.isStar && '⭐ '}{player.name}</span>
                        <span style={{ color: 'var(--color-muted)' }}>{player.club ?? '—'}</span>
                        <span style={{ color: 'var(--color-muted)' }}>{t(`category.${player.category}`)}</span>
                        <select
                          className="admin-status-select"
                          value={statuses[team.teamNl]?.[player.name] ?? 'fit'}
                          onChange={e => setStatus(team.teamNl, player.name, e.target.value as PlayerStatus)}
                        >
                          <option value="fit">{tCommon('statusFit')}</option>
                          <option value="doubtful">{tCommon('statusDoubtful')}</option>
                          <option value="out">{tCommon('statusOut')}</option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : (
        <RatingsView
          teams={teams}
          ratings={ratings}
          ratingTeamNl={ratingTeamNl}
          setRatingTeamNl={v => { setRatingTeamNl(v); setRatingMatchId('') }}
          ratingMatchId={ratingMatchId}
          setRatingMatchId={setRatingMatchId}
          setRating={setRating}
          onSave={handleSaveRatings}
          saveState={ratingSave}
        />
      )}
    </div>
  )
}

interface RatingsViewProps {
  teams: AdminTeam[]
  ratings: Record<string, number>
  ratingTeamNl: string
  setRatingTeamNl: (v: string) => void
  ratingMatchId: string
  setRatingMatchId: (v: string) => void
  setRating: (matchId: string, teamName: string, player: string, value: number | null) => void
  onSave: () => void
  saveState: 'idle' | 'saving' | 'saved' | 'error'
}

function RatingsView({
  teams, ratings, ratingTeamNl, setRatingTeamNl, ratingMatchId, setRatingMatchId, setRating, onSave, saveState,
}: RatingsViewProps) {
  const t = useTranslations('admin')

  const selectStyle: React.CSSProperties = {
    padding: '8px 10px', backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
    boxShadow: '3px 3px 0 var(--color-brd)', fontFamily: 'inherit', fontSize: 9, color: 'var(--color-txt)',
  }

  const team = teams.find(t => t.teamNl === ratingTeamNl) ?? teams[0]
  const matches = team?.playedMatches ?? []
  const matchId = matches.some(m => m.matchId === ratingMatchId) ? ratingMatchId : (matches[0]?.matchId ?? '')

  // Landgemiddelde voor de geselecteerde wedstrijd (uit de huidige invoer).
  let sum = 0, count = 0
  if (team && matchId) {
    for (const p of team.players) {
      const v = ratings[ratingKey(matchId, team.teamName, p.name)]
      if (typeof v === 'number') { sum += v; count++ }
    }
  }
  const teamAvg = count > 0 ? sum / count : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn variant="green" onClick={onSave} disabled={saveState === 'saving'}>
          {saveState === 'saving' ? t('saving') : t('save')}
        </Btn>
      </div>
      {saveState === 'saved' && <div style={{ fontSize: 8, color: 'var(--color-g)', marginBottom: 12 }}>{t('saved')}</div>}
      {saveState === 'error' && <div style={{ fontSize: 8, color: 'var(--color-r)', marginBottom: 12 }}>{t('saveError')}</div>}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 4 }}>{t('selectTeam')}</div>
          <select style={selectStyle} value={ratingTeamNl} onChange={e => setRatingTeamNl(e.target.value)}>
            {teams.map(tm => (
              <option key={tm.teamNl} value={tm.teamNl}>{tm.nameEn}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 4 }}>{t('selectMatch')}</div>
          <select style={selectStyle} value={matchId} onChange={e => setRatingMatchId(e.target.value)} disabled={matches.length === 0}>
            {matches.map(m => (
              <option key={m.matchId} value={m.matchId}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!team || matches.length === 0 || !matchId ? (
        <div style={{ fontSize: 9, color: 'var(--color-muted)', padding: 12 }}>{t('noPlayedMatches')}</div>
      ) : (
        <div className="factor-card" style={{ padding: '4px 14px' }}>
          {team.players.map((player, i) => {
            const k = ratingKey(matchId, team.teamName, player.name)
            const val = ratings[k]
            return (
              <div key={player.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid var(--color-brd)' }}>
                <span style={{ flex: '1 1 auto', minWidth: 0, fontSize: 10, color: 'var(--color-txt)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.isStar && '⭐ '}{player.name}
                </span>
                <span style={{ fontSize: 8, color: 'var(--color-muted)', flexShrink: 0, width: 120, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {player.club ?? ''}
                </span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.1}
                  value={val ?? ''}
                  aria-label={t('ratingLabel')}
                  onChange={e => {
                    const raw = e.target.value
                    if (raw === '') { setRating(matchId, team.teamName, player.name, null); return }
                    const n = Math.min(10, Math.max(1, Number(raw)))
                    if (!Number.isNaN(n)) setRating(matchId, team.teamName, player.name, Math.round(n * 10) / 10)
                  }}
                  style={{
                    width: 64, flexShrink: 0, padding: '5px 8px', fontFamily: 'inherit', fontSize: 10,
                    backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)', color: 'var(--color-txt)',
                  }}
                />
              </div>
            )
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '2px solid var(--color-brd2)' }}>
            <span style={{ fontSize: 8, color: 'var(--color-muted)', letterSpacing: 1 }}>{t('teamAvg')}</span>
            <span style={{ fontSize: 14, color: 'var(--color-g)', fontFamily: 'var(--font-pixel)' }}>{teamAvg !== null ? teamAvg.toFixed(1) : '—'}</span>
          </div>
        </div>
      )}
    </div>
  )
}
