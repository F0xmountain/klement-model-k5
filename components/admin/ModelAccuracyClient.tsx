'use client'

import { useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import Btn from '@/components/ui/Btn'
import {
  evaluateAll, BASELINE_LOG_LOSS, BASELINE_BRIER, type MatchPrediction,
} from '@/lib/model-accuracy'

interface Props {
  initialLog: MatchPrediction[]
  available: MatchPrediction[] // gespeelde wedstrijden met voor-ingevulde modelkansen
}

type AddState = 'idle' | 'saving' | 'added' | 'error'

// Kleurcodering log loss: groen onder, oranje rond, rood boven de baseline.
function logLossColor(v: number): string {
  if (v < 0.9) return 'var(--color-g)'
  if (v <= 1.1) return 'var(--color-o)'
  return 'var(--color-r)'
}

const pct = (v: number) => Math.round(v * 100)

export default function ModelAccuracyClient({ initialLog, available }: Props) {
  const t = useTranslations('admin.accuracy')
  const tc = useTranslations('common')
  const locale = useLocale()
  const [log, setLog] = useState<MatchPrediction[]>(initialLog)
  const [selectedId, setSelectedId] = useState<string>('')
  const [addState, setAddState] = useState<AddState>('idle')

  const summary = useMemo(() => {
    const sorted = [...log].sort((a, b) => a.matchDate.localeCompare(b.matchDate))
    return evaluateAll(sorted)
  }, [log])

  const loggedIds = useMemo(() => new Set(log.map(e => e.matchId)), [log])
  const candidates = available.filter(m => !loggedIds.has(m.matchId))
  const selected = candidates.find(m => m.matchId === selectedId) ?? null

  const fmtDate = (iso: string) =>
    iso ? new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '—'

  async function add() {
    if (!selected) return
    setAddState('saving')
    try {
      const res = await fetch('/api/admin/prediction-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      })
      if (!res.ok) throw new Error('add failed')
      setLog(prev => [...prev, selected])
      setSelectedId('')
      setAddState('added')
    } catch {
      setAddState('error')
    }
  }

  async function remove(matchId: string) {
    try {
      const res = await fetch('/api/admin/prediction-log', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId }),
      })
      if (!res.ok) throw new Error('delete failed')
      setLog(prev => prev.filter(e => e.matchId !== matchId))
    } catch {
      /* stilletjes laten staan bij fout */
    }
  }

  const chartData = summary.results.map((r, i) => ({ idx: i + 1, logLoss: Math.round(r.logLoss * 1000) / 1000 }))

  return (
    <div style={{ display: 'grid', gap: 28 }}>
      {/* Sectie A — samenvatting */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
        <Stat label={t('evaluated')} value={String(summary.n)} />
        <Stat
          label={t('correct')}
          value={summary.n ? `${summary.results.filter(r => r.correct).length}/${summary.n} (${pct(summary.accuracy)}%)` : '—'}
        />
        <Stat
          label={t('logLoss')}
          value={summary.n ? summary.meanLogLoss.toFixed(3) : '—'}
          color={summary.n ? logLossColor(summary.meanLogLoss) : undefined}
          sub={t('baseline', { value: BASELINE_LOG_LOSS.toFixed(3) })}
        />
        <Stat
          label={t('brierScore')}
          value={summary.n ? summary.meanBrierScore.toFixed(3) : '—'}
          color={summary.n ? (summary.meanBrierScore < BASELINE_BRIER ? 'var(--color-g)' : 'var(--color-r)') : undefined}
          sub={t('baseline', { value: BASELINE_BRIER.toFixed(3) })}
        />
      </div>

      {summary.n > 0 && (
        <div style={{ fontSize: 9, color: summary.meanLogLoss < BASELINE_LOG_LOSS ? 'var(--color-g)' : 'var(--color-r)' }}>
          {summary.meanLogLoss < BASELINE_LOG_LOSS ? `✓ ${t('betterThanBaseline')}` : `✗ ${t('worseThanBaseline')}`}
        </div>
      )}

      {/* Sectie D — grafiek */}
      {chartData.length >= 2 && (
        <div>
          <div className="section-title" style={{ marginBottom: 8 }}>{t('chartTitle')}</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-brd)" strokeDasharray="2 2" />
              <XAxis
                dataKey="idx"
                tick={{ fontSize: 7, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
                axisLine={{ stroke: 'var(--color-brd2)' }}
                tickLine={{ stroke: 'var(--color-brd2)' }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 7, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
                axisLine={{ stroke: 'var(--color-brd2)' }}
                tickLine={{ stroke: 'var(--color-brd2)' }}
                width={42}
              />
              <Tooltip
                content={({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: { idx: number; logLoss: number } }> }) => {
                  if (!active || !payload || payload.length === 0) return null
                  const d = payload[0]?.payload
                  if (!d) return null
                  return (
                    <div style={{
                      fontFamily: 'var(--font-pixel), monospace', fontSize: 8,
                      backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
                      boxShadow: '3px 3px 0 var(--color-brd)', padding: '6px 8px',
                    }}>
                      {t('colLogLoss')}: {d.logLoss}
                    </div>
                  )
                }}
              />
              <ReferenceLine
                y={BASELINE_LOG_LOSS}
                stroke="var(--color-r)"
                strokeDasharray="4 3"
                label={{ value: t('chartBaseline'), fontSize: 7, fill: 'var(--color-r)', position: 'insideTopRight' }}
              />
              <Line
                type="monotone"
                dataKey="logLoss"
                stroke="var(--color-b)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--color-b)' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sectie B — wedstrijd-voor-wedstrijd tabel */}
      <div>
        <div className="section-title" style={{ marginBottom: 8 }}>{t('matchTable')}</div>
        {summary.n === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{t('noPredictions')}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8 }}>
              <thead>
                <tr style={{ color: 'var(--color-muted)', textAlign: 'left' }}>
                  <th style={th}>{t('colDate')}</th>
                  <th style={th}>{t('colTeams')}</th>
                  <th style={th}>{t('colPredicted')}</th>
                  <th style={th}>{t('colActual')}</th>
                  <th style={th}>{t('colLogLoss')}</th>
                  <th style={th}>{t('colBrier')}</th>
                  <th style={th}>{t('colResult')}</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {summary.results.map(r => (
                  <tr key={r.matchId} style={{ borderTop: '1px solid var(--color-brd)', color: 'var(--color-txt)' }}>
                    <td style={td}>{fmtDate(r.matchDate)}</td>
                    <td style={td}>{r.homeTeam} – {r.awayTeam}</td>
                    <td style={td}>{pct(r.predictedHome)}/{pct(r.predictedDraw)}/{pct(r.predictedAway)}</td>
                    <td style={td}>{r.actualHome}–{r.actualAway}</td>
                    <td style={{ ...td, color: logLossColor(r.logLoss) }}>{r.logLoss.toFixed(3)}</td>
                    <td style={td}>{r.brierScore.toFixed(3)}</td>
                    <td style={{ ...td, color: r.correct ? 'var(--color-g)' : 'var(--color-r)' }}>{r.correct ? '✓' : '✗'}</td>
                    <td style={td}>
                      <button
                        onClick={() => remove(r.matchId)}
                        title={t('remove')}
                        style={{ background: 'none', border: 'none', color: 'var(--color-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 9 }}
                      >×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sectie C — voorspelling toevoegen */}
      <div className="factor-card">
        <div style={{ fontSize: 10, color: 'var(--color-b)', marginBottom: 14 }}>{t('addPrediction')}</div>
        {candidates.length === 0 && available.length === 0 ? (
          <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>{t('noPlayedMatches')}</div>
        ) : (
          <>
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setAddState('idle') }}
              style={{
                width: '100%', marginBottom: 14, padding: '8px 10px',
                backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
                boxShadow: '3px 3px 0 var(--color-brd)', fontFamily: 'inherit', fontSize: 9, color: 'var(--color-txt)',
              }}
            >
              <option value="">{candidates.length ? t('selectMatch') : t('alreadyLogged')}</option>
              {candidates.map(m => (
                <option key={m.matchId} value={m.matchId}>
                  {fmtDate(m.matchDate)} · {m.homeTeam} {m.actualHome}–{m.actualAway} {m.awayTeam}
                </option>
              ))}
            </select>

            {selected && (
              <div style={{ fontSize: 9, color: 'var(--color-muted)', lineHeight: 1.9, marginBottom: 14 }}>
                <div>{t('modelChances')}: {selected.homeTeam} {pct(selected.predictedHome)}% · {tc('draw')} {pct(selected.predictedDraw)}% · {selected.awayTeam} {pct(selected.predictedAway)}%</div>
                <div>{t('actualScore')}: {selected.homeTeam} {selected.actualHome}–{selected.actualAway} {selected.awayTeam}</div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Btn variant="green" onClick={add} disabled={!selected || addState === 'saving'}>
                {addState === 'saving' ? t('added') : t('addButton')}
              </Btn>
              <span style={{ fontSize: 8 }}>
                {addState === 'added' && <span style={{ color: 'var(--color-g)' }}>{t('added')}</span>}
                {addState === 'error' && <span style={{ color: 'var(--color-r)' }}>{t('addError')}</span>}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '6px 8px', fontWeight: 'normal', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '6px 8px', whiteSpace: 'nowrap' }

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="factor-card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 8, color: 'var(--color-muted)' }}>{label}</div>
      <div style={{ fontSize: 20, color: color ?? 'var(--color-txt)', fontFamily: 'var(--font-pixel)' }}>{value}</div>
      {sub && <div style={{ fontSize: 7, color: 'var(--color-muted)' }}>{sub}</div>}
    </div>
  )
}
