'use client'
import { useTranslations } from 'next-intl'
import { ROUND_ORDER, type ResolvedBracket } from '@/lib/my-picks'
import { teamData } from '@/lib/klement'
import FlagImg from '@/components/ui/FlagImg'

interface Props {
  resolved: ResolvedBracket
}

export default function MyBracketDisplay({ resolved }: Props) {
  const t = useTranslations('myBracket')
  const tr = useTranslations('rounds')

  const finalMatch = resolved.final[0]
  const champion = finalMatch?.pick ?? null
  const champData = champion ? teamData(champion) : undefined
  const championDiffers = champion !== null && finalMatch !== undefined && champion !== finalMatch.klementPick

  return (
    <div style={{ marginBottom: 32 }}>
      <div className="champ-banner" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, color: 'var(--color-o)', letterSpacing: 2, marginBottom: 12 }}>
          {t('championTitle')}
        </div>
        {champion ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
              <FlagImg name={champion} h={40} emoji={champData?.flag ?? '🏳️'} />
              <span style={{ fontSize: 18 }}>{champion.toUpperCase()}</span>
            </div>
            {championDiffers ? (
              <span className="diff-badge">{t('championDiffers', { team: finalMatch?.klementPick ?? '' })}</span>
            ) : (
              <span className="k-badge">{t('matchesKlement')}</span>
            )}
          </>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>{t('championEmpty')}</div>
        )}
      </div>

      <div className="section-title" style={{ marginBottom: 12 }}>{t('comparisonTitle')}</div>
      <table className="group-table">
        <thead>
          <tr>
            <th></th>
            {ROUND_ORDER.map(round => <th key={round}>{tr(round)}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t('tableFilled')}</td>
            {ROUND_ORDER.map(round => {
              const matches = resolved[round]
              const filled = matches.filter(m => m.pick !== null).length
              return <td key={round}>{filled}/{matches.length}</td>
            })}
          </tr>
          <tr>
            <td>{t('tableMatchesK')}</td>
            {ROUND_ORDER.map(round => {
              const filledMatches = resolved[round].filter(m => m.pick !== null)
              const matching = filledMatches.filter(m => !m.differs).length
              const hasDiff = filledMatches.length > 0 && matching < filledMatches.length
              return (
                <td key={round} style={{ color: hasDiff ? 'var(--color-o)' : undefined }}>
                  {matching}/{filledMatches.length}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
