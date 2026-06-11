'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Btn from '@/components/ui/Btn'
import FlagImg from '@/components/ui/FlagImg'
import { teamData } from '@/lib/klement'
import type { PlayerStatus } from '@/lib/squad-modifier'

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
  group: string
  coach: string
  fifaRanking: number
  squadDataError: boolean
  players: Player[]
}

interface Props {
  teams: AdminTeam[]
  lastUpdated: string
}

type StatusMap = Record<string, Record<string, PlayerStatus>>

export default function AdminSquadsClient({ teams, lastUpdated }: Props) {
  const t = useTranslations('admin')
  const tCommon = useTranslations('common')

  const [statuses, setStatuses] = useState<StatusMap>(() => {
    const init: StatusMap = {}
    for (const team of teams) {
      init[team.teamNl] = {}
      for (const p of team.players) init[team.teamNl][p.name] = p.status
    }
    return init
  })
  const [openTeam, setOpenTeam] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedAt, setSavedAt] = useState(lastUpdated)

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

  return (
    <div>
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
                    <span className={`status-dot status-dot-${statuses[team.teamNl][player.name]}`} />
                    <span>{player.isStar && '⭐ '}{player.name}</span>
                    <span style={{ color: 'var(--color-muted)' }}>{player.club ?? '—'}</span>
                    <span style={{ color: 'var(--color-muted)' }}>{t(`category.${player.category}`)}</span>
                    <select
                      className="admin-status-select"
                      value={statuses[team.teamNl][player.name]}
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
    </div>
  )
}
