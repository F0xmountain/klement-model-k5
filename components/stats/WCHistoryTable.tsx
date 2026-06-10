import { useTranslations } from 'next-intl'
import wcHistory from '@/lib/wc-history.json'
import { teamNames, teamData } from '@/lib/klement'
import FlagImg from '@/components/ui/FlagImg'

const TEAMS_2026 = new Set(teamNames())

function isQualified(name: string) {
  return name.split(' / ').some(part => TEAMS_2026.has(part))
}

function TeamCell({ name }: { name: string }) {
  const t = useTranslations('stats')
  return (
    <>
      {name.split(' / ').map(p => {
        const td = teamData(p)
        return <FlagImg key={p} name={p} h={14} emoji={td?.flag ?? '🏳️'} />
      })}
      {' '}{name}
      {isQualified(name) && (
        <>
          <br />
          <span className="k-badge">{t('qualified2026')}</span>
        </>
      )}
    </>
  )
}

export default function WCHistoryTable() {
  const t = useTranslations('stats')

  return (
    <div>
      <div className="section-title">{t('historyTitle')}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
        {t('historyDescription')}
      </div>

      <div className="group-card">
        <table className="group-table">
          <thead>
            <tr>
              <th>{t('colYear')}</th>
              <th>{t('colWinner')}</th>
              <th>{t('colRunnerUp')}</th>
              <th>{t('colHost')}</th>
            </tr>
          </thead>
          <tbody>
            {[...wcHistory].reverse().map(row => (
              <tr key={row.year}>
                <td>{row.year}</td>
                <td><TeamCell name={row.winner} /></td>
                <td><TeamCell name={row.runnerUp} /></td>
                <td><TeamCell name={row.host} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
