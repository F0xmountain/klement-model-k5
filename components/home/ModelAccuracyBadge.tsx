import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { evaluateAll, BASELINE_LOG_LOSS, type MatchPrediction } from '@/lib/model-accuracy'
import logRaw from '@/lib/prediction-log.json'

// Publieke kernstatistiek van de modelnauwkeurigheid — leest de voorspellings-log
// server-side (geen API-call). Verborgen zolang er nog geen gespeelde, geëvalueerde
// wedstrijden in de log staan. Klik linkt naar de admin-detailpagina.
export default function ModelAccuracyBadge() {
  const t = useTranslations('home')
  const summary = evaluateAll(logRaw as MatchPrediction[])
  if (summary.n < 1) return null

  const correct = summary.results.filter(r => r.correct).length

  return (
    <div style={{ textAlign: 'center', padding: '4px 0 12px' }}>
      <Link
        href="/admin/model-accuracy"
        style={{
          display: 'inline-block',
          fontSize: 8,
          color: 'var(--color-b)',
          textDecoration: 'none',
          letterSpacing: 0.5,
          border: '2px solid var(--color-brd2)',
          boxShadow: '3px 3px 0 var(--color-brd)',
          backgroundColor: 'var(--color-bg)',
          padding: '8px 14px',
        }}
      >
        🎯 {t('modelBadge', { correct, n: summary.n, loss: summary.meanLogLoss.toFixed(2) })}
        {' · '}
        {t('modelBadgeBaseline', { baseline: BASELINE_LOG_LOSS.toFixed(2) })}
      </Link>
    </div>
  )
}
