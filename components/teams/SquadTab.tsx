'use client'
import { useTranslations } from 'next-intl'
import {
  POSITION_ORDER, getSquadTeam, resolveStatus, starRankOf,
  type Category, type PlayerStatus, type SquadPlayer, type SquadTeam,
} from '@/lib/squad-utils'
import { getRatingsForPlayer, getPlayerAvgRating } from '@/lib/player-ratings'

const STATUS_DOT: Record<PlayerStatus, string> = { fit: '🟢', doubtful: '🟡', out: '🔴' }

interface RowData {
  player: SquadPlayer
  status: PlayerStatus
  starRank?: number
}

// Spelers van één positiegroep, sterspelers (rank 1/2/3) bovenaan op rang.
function groupRows(team: SquadTeam, category: Category): RowData[] {
  return team.squad
    .filter(p => p.category === category)
    .map(p => ({
      player: p,
      status: resolveStatus(team.nameNl, p.name, p.status),
      starRank: starRankOf(team, p.name),
    }))
    .sort((a, b) => {
      if (a.starRank && b.starRank) return a.starRank - b.starRank
      if (a.starRank) return -1
      if (b.starRank) return 1
      return 0
    })
}

function PlayerRow({ row, teamName }: { row: RowData; teamName: string }) {
  const isStar = row.starRank !== undefined
  const ratings = getRatingsForPlayer(row.player.name, teamName)
  const avg = getPlayerAvgRating(row.player.name, teamName)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid var(--color-brd)', fontSize: 10 }}>
      <span style={{ width: 14, flexShrink: 0, textAlign: 'center' }}>{isStar ? '⭐' : ''}</span>
      <span style={{ color: 'var(--color-txt)', fontWeight: isStar ? 'bold' : 'normal', minWidth: 0, flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.player.name}
      </span>
      {ratings.length > 0 && (
        <span style={{ color: 'var(--color-muted)', fontSize: 8, flexShrink: 0, fontFamily: 'var(--font-pixel)' }} title={ratings.map(r => `${r.matchLabel}: ${r.rating.toFixed(1)}`).join(' · ')}>
          {ratings.map(r => r.rating.toFixed(1)).join(' | ')}
        </span>
      )}
      <span style={{ color: 'var(--color-muted)', fontSize: 8, flex: '1 1 auto', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {row.player.club ?? ''}
      </span>
      {avg !== null && (
        <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--color-g)', fontFamily: 'var(--font-pixel)', whiteSpace: 'nowrap' }} title="avg">
          ⌀ {avg.toFixed(1)}
        </span>
      )}
      <span style={{ width: 16, flexShrink: 0, textAlign: 'center' }} title={row.status}>{STATUS_DOT[row.status]}</span>
    </div>
  )
}

export default function SquadTab({ teamName }: { teamName: string }) {
  const t = useTranslations('teams')
  const team = getSquadTeam(teamName)

  if (!team) {
    return <div style={{ fontSize: 10, color: 'var(--color-muted)', padding: 12 }}>—</div>
  }

  return (
    <div>
      {/* Coach + kapitein */}
      <div className="factor-card" style={{ display: 'flex', gap: 24, padding: 14, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 4 }}>{t('squad.coach')}</div>
          <div style={{ fontSize: 11, color: 'var(--color-txt)' }}>{team.coach}</div>
        </div>
        <div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 4 }}>{t('squad.captain')}</div>
          <div style={{ fontSize: 11, color: 'var(--color-txt)' }}>{team.captain}</div>
        </div>
      </div>

      {POSITION_ORDER.map(category => {
        const rows = groupRows(team, category)
        if (rows.length === 0) return null
        return (
          <div key={category} style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 4 }}>{t(`squad.${category}`)}</div>
            <div className="factor-card" style={{ padding: '4px 14px' }}>
              {rows.map(row => <PlayerRow key={row.player.name} row={row} teamName={teamName} />)}
            </div>
          </div>
        )
      })}

      <div style={{ fontSize: 10, color: 'var(--color-muted)', textAlign: 'center', marginTop: 8 }}>
        {team.squad.length} {t('squad.players')}
      </div>
    </div>
  )
}
