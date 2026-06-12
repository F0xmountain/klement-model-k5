'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { teamNames, teamData } from '@/lib/klement'
import { explainMatch } from '@/lib/model-explain'
import { getModelAccuracy } from '@/lib/model-accuracy'
import { getModelWeights } from '@/lib/model-config'
import TeamSelect from '@/components/ui/TeamSelect'
import FlagImg from '@/components/ui/FlagImg'
import PixelBar from '@/components/ui/PixelBar'
import stadiumsRaw from '@/lib/stadiums.json'

const allTeams = teamNames().sort()

interface Stadium {
  city: string
  country: string
  stadium: string
  altitude_m: number
  coordinates: { lat: number; lon: number }
}
const stadiums = stadiumsRaw as Stadium[]

const FACTOR_LABEL: Record<string, string> = {
  fifa: 'FIFA ranking', elo: 'Elo rating', gdp: 'GDP per capita',
  pop: 'Population', temp: 'Climate (temp)', host: 'Home advantage',
}
const FACTOR_WHY: Record<string, string> = {
  fifa: 'The most direct signal of current squad strength.',
  elo: 'Form-adjusted strength rating; updates after every result.',
  gdp: 'Wealthier nations invest more in football infrastructure.',
  pop: 'Larger talent pool — weighted down outside football cultures.',
  temp: 'Teams from a ~14°C climate have historically performed best.',
  host: 'Hosting helps, but less so across a continent-wide tournament.',
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`

const cell: React.CSSProperties = { padding: '6px 8px', fontSize: 9, borderTop: '1px solid var(--color-brd)' }
const head: React.CSSProperties = { padding: '6px 8px', fontSize: 8, color: 'var(--color-muted)', textAlign: 'left' }

export default function ModelExplainClient() {
  const [teamA, setTeamA] = useState('Netherlands')
  const [teamB, setTeamB] = useState('Portugal')
  const [venueIdx, setVenueIdx] = useState<number | null>(null)
  const [polyOdds, setPolyOdds] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    fetch('/api/polymarket')
      .then(r => r.json())
      .then((data: { team: string; probability: number }[]) =>
        setPolyOdds(Object.fromEntries(data.map(p => [p.team, p.probability]))))
      .catch(() => {})
  }, [])

  const venue = venueIdx !== null
    ? { altitude: stadiums[venueIdx].altitude_m, lat: stadiums[venueIdx].coordinates.lat, lon: stadiums[venueIdx].coordinates.lon }
    : undefined

  const e = explainMatch(teamA, teamB, venue, polyOdds ?? undefined)
  const weights = getModelWeights()
  const accuracy = getModelAccuracy()

  return (
    <div>
      {/* ───────── Section 1: Live match walkthrough ───────── */}
      <div className="section-title">1 · Live match walkthrough</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
        <TeamSelect teams={allTeams} value={teamA} onChange={setTeamA} />
        <TeamSelect teams={allTeams} value={teamB} onChange={setTeamB} />
      </div>
      <select
        value={venueIdx ?? ''}
        onChange={ev => setVenueIdx(ev.target.value === '' ? null : Number(ev.target.value))}
        style={{ width: '100%', marginBottom: 20, padding: '8px 10px', backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)', boxShadow: '3px 3px 0 var(--color-brd)', fontFamily: 'inherit', fontSize: 9, color: 'var(--color-txt)' }}
      >
        <option value="">Neutral venue (no altitude/travel effect)</option>
        {stadiums.map((s, i) => (
          <option key={`${s.city}-${s.stadium}`} value={i}>{s.city} — {s.stadium} ({s.altitude_m}m)</option>
        ))}
      </select>

      {/* Step 1 — factor table */}
      <div style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 8 }}>Step 1 — Raw factor scores per team</div>
      <div className="factor-card" style={{ overflowX: 'auto', marginBottom: 20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 420 }}>
          <thead>
            <tr>
              <th style={head}>Factor</th>
              <th style={{ ...head, textAlign: 'right' }}>{teamA}</th>
              <th style={{ ...head, textAlign: 'right' }}>{teamB}</th>
              <th style={{ ...head, textAlign: 'right' }}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {e.teamA.factors.map((fa, i) => {
              const fb = e.teamB.factors[i]
              return (
                <tr key={fa.key}>
                  <td style={{ ...cell, color: 'var(--color-muted)' }}>{FACTOR_LABEL[fa.key]}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{fa.raw} → {fa.norm.toFixed(2)}</td>
                  <td style={{ ...cell, textAlign: 'right' }}>{fb.raw} → {fb.norm.toFixed(2)}</td>
                  <td style={{ ...cell, textAlign: 'right', color: 'var(--color-muted)' }}>{(e.weights[fa.key as keyof typeof e.weights] * 100).toFixed(0)}%</td>
                </tr>
              )
            })}
            <tr>
              <td style={{ ...cell, color: 'var(--color-txt)', fontWeight: 'bold' }}>Total score S</td>
              <td style={{ ...cell, textAlign: 'right', color: 'var(--color-r)', fontWeight: 'bold' }}>{e.teamA.score.toFixed(3)}</td>
              <td style={{ ...cell, textAlign: 'right', color: 'var(--color-b)', fontWeight: 'bold' }}>{e.teamB.score.toFixed(3)}</td>
              <td style={{ ...cell, textAlign: 'right', color: 'var(--color-muted)' }}>100%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Step 2 — base probabilities */}
      <div style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 8 }}>Step 2 — Score difference → win probability</div>
      <div className="factor-card" style={{ fontSize: 9, lineHeight: 2.1, color: 'var(--color-muted)', marginBottom: 20 }}>
        <div>z = (S_A − S_B) / 0.28 = ({e.teamA.score.toFixed(3)} − {e.teamB.score.toFixed(3)}) / 0.28 = <b style={{ color: 'var(--color-txt)' }}>{e.z.toFixed(3)}</b></div>
        <div>draw rate dr = 0.20 × (1 − 0.3 × |z|) = <b style={{ color: 'var(--color-txt)' }}>{pct(e.baseDr)}</b></div>
        <div>P(win {teamA}) = Φ(z) × (1 − dr) = {e.phiZ.toFixed(3)} × {(1 - e.baseDr).toFixed(3)} = <b style={{ color: 'var(--color-r)' }}>{pct(e.basePA)}</b></div>
        <div>P(draw) = <b style={{ color: 'var(--color-txt)' }}>{pct(e.baseDr)}</b></div>
        <div>P(win {teamB}) = (1 − Φ(z)) × (1 − dr) = {(1 - e.phiZ).toFixed(3)} × {(1 - e.baseDr).toFixed(3)} = <b style={{ color: 'var(--color-b)' }}>{pct(e.basePB)}</b></div>
      </div>

      {/* Step 3 — extension factors */}
      <div style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 8 }}>Step 3 — Extension factors applied (Δ on {teamA} win)</div>
      <div className="factor-card" style={{ marginBottom: 20 }}>
        {e.modifiers.map((m, i) => (
          <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, fontSize: 9, padding: '6px 0', borderTop: i > 0 ? '1px solid var(--color-brd)' : 'none' }}>
            <span style={{ color: 'var(--color-txt)', minWidth: 90 }}>{m.label}</span>
            <span style={{ color: 'var(--color-muted)', fontSize: 8, flex: 1 }}>{m.note}</span>
            <span style={{ color: Math.abs(m.deltaA) < 0.05 ? 'var(--color-muted)' : m.deltaA > 0 ? 'var(--color-g)' : 'var(--color-r)' }}>
              {Math.abs(m.deltaA) < 0.05 ? '—' : signed(m.deltaA)}
            </span>
          </div>
        ))}
      </div>

      {/* Step 4 — final */}
      <div style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 8 }}>Step 4 — Final probabilities</div>
      <div className="factor-card" style={{ fontSize: 9, lineHeight: 2.1, marginBottom: 20 }}>
        <div style={{ color: 'var(--color-r)' }}>{teamA} win: {pct(e.basePA)} → <b>{pct(e.finalPA)}</b></div>
        <div style={{ color: 'var(--color-muted)' }}>Draw: {pct(e.baseDr)} → <b>{pct(e.finalDr)}</b></div>
        <div style={{ color: 'var(--color-b)' }}>{teamB} win: {pct(e.basePB)} → <b>{pct(e.finalPB)}</b></div>
      </div>

      {/* Step 5 — poly */}
      {e.poly && (
        <>
          <div style={{ fontSize: 9, color: 'var(--color-b)', marginBottom: 8 }}>Step 5 — Polymarket blend</div>
          <div className="factor-card" style={{ fontSize: 9, lineHeight: 2.1, marginBottom: 28, color: 'var(--color-muted)' }}>
            Model: <b style={{ color: 'var(--color-txt)' }}>{pct(e.poly.modelPA)}</b> · Market: <b style={{ color: 'var(--color-txt)' }}>{pct(e.poly.marketPA)}</b> · Weight: {pct(e.poly.marketWeight)} → Combined: <b style={{ color: 'var(--color-g)' }}>{pct(e.poly.combinedPA)}</b>
          </div>
        </>
      )}

      {/* ───────── Section 2: Factor weight breakdown ───────── */}
      <div className="section-title" style={{ marginTop: 12 }}>2 · Factor weight breakdown</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
        {e.teamA.factors.map(f => {
          const wt = e.weights[f.key as keyof typeof e.weights]
          return (
            <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '120px 60px 1fr', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 9, color: 'var(--color-txt)' }}>{FACTOR_LABEL[f.key]}</span>
              <span style={{ fontSize: 9, color: 'var(--color-b)' }}>{(wt * 100).toFixed(0)}%</span>
              <div>
                <PixelBar value={wt * 100} color="var(--color-b)" />
                <div style={{ fontSize: 7, color: 'var(--color-muted)', marginTop: 3, lineHeight: 1.6 }}>{FACTOR_WHY[f.key]}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 8, lineHeight: 1.8 }}>
        Extension factors: Recent form {(weights.formWeight * 100).toFixed(0)}% · League quality {(weights.leagueWeight * 100).toFixed(0)}% · Polymarket blend {(weights.marketWeight * 100).toFixed(0)}% (plus altitude / travel / WC-experience / star-player adjustments).
      </div>
      <Link href="/admin/model-config" style={{ fontSize: 9, color: 'var(--color-b)' }}>Adjust weights in the model configurator →</Link>

      {/* ───────── Section 3: Accuracy tracker ───────── */}
      <div className="section-title" style={{ marginTop: 32 }}>3 · Model accuracy tracker</div>
      {accuracy.total === 0 ? (
        <div style={{ fontSize: 10, color: 'var(--color-muted)', padding: '30px 0', textAlign: 'center', border: '1px solid var(--color-brd)' }}>
          Accuracy data will appear as matches are played
        </div>
      ) : (
        <div className="factor-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
            <thead>
              <tr>
                <th style={head}>Match</th>
                <th style={head}>Model pick</th>
                <th style={head}>Actual</th>
                <th style={{ ...head, textAlign: 'center' }}>Correct?</th>
                <th style={{ ...head, textAlign: 'right' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {accuracy.rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...cell, color: 'var(--color-txt)' }}>
                    <FlagImg name={r.teamA} h={11} emoji={teamData(r.teamA)?.flag ?? '🏳️'} /> {r.teamA} {r.score} {r.teamB}
                  </td>
                  <td style={{ ...cell, color: 'var(--color-muted)' }}>{r.modelPickLabel}</td>
                  <td style={{ ...cell, color: 'var(--color-muted)' }}>{r.actualLabel}</td>
                  <td style={{ ...cell, textAlign: 'center', color: r.correct ? 'var(--color-g)' : 'var(--color-r)' }}>{r.correct ? '✓' : '✗'}</td>
                  <td style={{ ...cell, textAlign: 'right', color: 'var(--color-muted)' }}>{Math.round(r.confidence * 100)}%</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...cell, fontWeight: 'bold', color: 'var(--color-txt)' }} colSpan={3}>
                  {accuracy.correct}/{accuracy.total} correct ({Math.round((accuracy.correct / accuracy.total) * 100)}%)
                </td>
                <td style={{ ...cell, textAlign: 'center' }} colSpan={2}>
                  {accuracy.brier !== null ? `Brier ${accuracy.brier.toFixed(3)}` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
