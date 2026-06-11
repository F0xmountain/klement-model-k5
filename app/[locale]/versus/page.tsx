'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { teamNames, teamData } from '@/lib/klement'
import { matchP, simResultCustom, ELO_WEIGHT, FIFA_WEIGHT } from '@/lib/klement-custom'
import stadiumsRaw from '@/lib/stadiums.json'
import formCacheRaw from '@/lib/form-cache.json'
import { getStarPlayerSummary, toTeamNl, type PlayerStatus } from '@/lib/squad-modifier'
import { getRestDays } from '@/lib/rest-days'
import WDLBar from '@/components/ui/WDLBar'
import FlagImg from '@/components/ui/FlagImg'
import FactorBreakdown from '@/components/team/FactorBreakdown'
import TeamSelect from '@/components/ui/TeamSelect'
import PixelParticles from '@/components/ui/PixelParticles'
import PolymarketBtn from '@/components/ui/PolymarketBtn'
import { PM_GAP_THRESHOLD } from '@/lib/polymarket'

const allTeams = teamNames().sort()
const SIM_N = 500

interface Stadium {
  city: string
  country: string
  stadium: string
  altitude_m: number
  coordinates: { lat: number; lon: number }
}
const stadiums = stadiumsRaw as Stadium[]

const formCache = formCacheRaw as Record<string, { formScore: number | null }>

type FormLevel = 'poor' | 'average' | 'good'

function formLevel(score: number): FormLevel {
  if (score < 10) return 'poor'
  if (score < 20) return 'average'
  return 'good'
}

const FORM_LEVEL_KEY: Record<FormLevel, 'formPoor' | 'formAverage' | 'formGood'> = {
  poor: 'formPoor',
  average: 'formAverage',
  good: 'formGood',
}

const FORM_LEVEL_DOT: Record<FormLevel, 'L' | 'D' | 'W'> = {
  poor: 'L',
  average: 'D',
  good: 'W',
}

const STATUS_KEY: Record<PlayerStatus, 'statusFit' | 'statusDoubtful' | 'statusOut'> = {
  fit: 'statusFit',
  doubtful: 'statusDoubtful',
  out: 'statusOut',
}

// Verwachte goals afgeleid van de winkans — geen scorevoorspelling, alleen een
// indicatie. Basis 1.35 goals/team (historisch WK-gemiddelde), bijgesteld naar
// winkans: de sterkere ploeg scoort meer, de zwakkere minder. Afgerond op 1 decimaal.
const BASE_SCORING_RATE = 1.35
function expectedGoals(p: number): string {
  return (BASE_SCORING_RATE * (0.5 + (p - 0.5) * 0.8)).toFixed(1)
}

function upsetLabel(pA: number, pB: number): { key: 'coinFlip' | 'heavyFavourite' | 'upsetPotential'; color: string } | null {
  const gap = Math.abs(pA - pB)
  if (gap < 0.1) return { key: 'coinFlip', color: 'var(--color-muted)' }
  if (gap > 0.55) return { key: 'heavyFavourite', color: 'var(--color-r)' }
  if (gap > 0.35) return { key: 'upsetPotential', color: 'var(--color-r)' }
  return null
}

interface SimData { w: number; d: number; l: number }

export default function VersusPage() {
  const t = useTranslations('versus')
  const tc = useTranslations('common')
  const [teamA, setTeamA] = useState('Netherlands')
  const [teamB, setTeamB] = useState('Portugal')
  const [sim, setSim] = useState<SimData | null>(null)
  const [simFor, setSimFor] = useState('')
  const [venueIdx, setVenueIdx] = useState<number | null>(null)

  const venue = venueIdx !== null
    ? { altitude: stadiums[venueIdx].altitude_m, lat: stadiums[venueIdx].coordinates.lat, lon: stadiums[venueIdx].coordinates.lon }
    : undefined
  const restA = getRestDays(teamA)
  const restB = getRestDays(teamB)
  const { pA, dr, pB } = matchP(teamA, teamB, venue, { home: restA, away: restB })
  const tA = teamData(teamA)
  const tB = teamData(teamB)
  const restWarnings = [
    { team: teamA, days: restA },
    { team: teamB, days: restB },
  ].filter((r): r is { team: string; days: number } => r.days !== undefined && r.days < 3)
  const upset = upsetLabel(pA, pB)
  const summaryA = getStarPlayerSummary(toTeamNl(teamA) ?? '')
  const summaryB = getStarPlayerSummary(toTeamNl(teamB) ?? '')

  // Reset sim results when teams change
  const key = `${teamA}:${teamB}`
  if (simFor !== '' && simFor !== key) {
    setSim(null)
    setSimFor('')
  }

  function runSim() {
    let w = 0, d = 0, l = 0
    for (let i = 0; i < SIM_N; i++) {
      const r = simResultCustom(teamA, teamB)
      if (r === 'A') w++
      else if (r === 'D') d++
      else l++
    }
    setSim({ w, d, l })
    setSimFor(key)
  }

  function surpriseMe() {
    const pool = allTeams.filter(t => t !== teamA && t !== teamB)
    const a = pool[Math.floor(Math.random() * pool.length)]
    const remaining = pool.filter(t => t !== a)
    const b = remaining[Math.floor(Math.random() * remaining.length)]
    setTeamA(a)
    setTeamB(b)
    setSim(null)
    setSimFor('')
  }

  return (
    <div className="sec page-enter" style={{ position: 'relative', overflow: 'hidden' }}>
      <PixelParticles variant="red" />
      <div style={{ position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>{t('title')}</div>
          <button className="px-btn" onClick={surpriseMe} style={{ fontSize: 8, padding: '6px 12px' }}>{t('randomBtn')}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 24 }}>
          <TeamSelect teams={allTeams} value={teamA} onChange={v => { setTeamA(v); setSim(null) }} />
          <div style={{ fontSize: 14, color: 'var(--color-r)', textAlign: 'center', fontWeight: 'bold', padding: '0 8px' }}>{tc('vs')}</div>
          <TeamSelect teams={allTeams} value={teamB} onChange={v => { setTeamB(v); setSim(null) }} />
        </div>

        <div style={{ fontSize: 8, color: 'var(--color-muted)', marginBottom: 6 }}>{t('venueLabel')}</div>
        <select
          value={venueIdx ?? ''}
          onChange={e => setVenueIdx(e.target.value === '' ? null : Number(e.target.value))}
          style={{
            width: '100%',
            marginBottom: 16,
            padding: '8px 10px',
            backgroundColor: 'var(--color-bg)',
            border: '2px solid var(--color-brd2)',
            boxShadow: '3px 3px 0 var(--color-brd)',
            fontFamily: 'inherit',
            fontSize: 9,
            color: 'var(--color-txt)',
          }}
        >
          <option value="">{t('venueNeutral')}</option>
          {stadiums.map((s, i) => (
            <option key={`${s.city}-${s.stadium}`} value={i}>{s.city} — {s.stadium} ({s.altitude_m}m)</option>
          ))}
        </select>

        <WDLBar pA={pA} dr={dr} pB={pB} labelA={teamA} labelB={teamB} />

        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            {t('expectedScore', { a: expectedGoals(pA), b: expectedGoals(pB) })}
          </div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginTop: 4 }}>
            {t('expectedScoreNote')}
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 8, color: 'var(--color-muted)' }}>
          {t('teamStrengthSplit', { elo: ELO_WEIGHT * 100, fifa: FIFA_WEIGHT * 100 })}
        </div>

        {[teamA, teamB].map(name => {
          const score = formCache[name]?.formScore
          if (score == null) return null
          const level = formLevel(score)
          return (
            <div key={name} style={{ marginTop: 4, fontSize: 8, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`form-dot form-dot-${FORM_LEVEL_DOT[level]}`} />
              {t('formIndicator', { team: name, level: t(FORM_LEVEL_KEY[level]), score })}
            </div>
          )
        })}

        {restWarnings.map(({ team, days }) => (
          <div key={team} style={{ marginTop: 4, fontSize: 8, color: 'var(--color-r)', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠️ {t('restWarning', { team, days })}
          </div>
        ))}

        {(summaryA.length > 0 || summaryB.length > 0) && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { team: teamA, flag: tA?.flag, summary: summaryA },
              { team: teamB, flag: tB?.flag, summary: summaryB },
            ].filter(({ summary }) => summary.length > 0).map(({ team, flag, summary }) => (
              <div key={team} style={{ fontSize: 8, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <FlagImg name={team} h={12} emoji={flag ?? '🏳️'} />
                <span>{team}:</span>
                {summary.map((p, i) => (
                  <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {i > 0 && <span>·</span>}
                    <span className={`status-dot status-dot-${p.status}`} />
                    {p.name} {tc(STATUS_KEY[p.status])}
                    {p.pct !== null && ` (${p.pct.toFixed(1)}%)`}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}

        {Math.abs(pA - pB) >= PM_GAP_THRESHOLD && (
          <PolymarketBtn
            teamName={pA > pB ? teamA : teamB}
            variant="match"
          />
        )}

        {/* Upset badge — click to run quick simulation */}
        {upset && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={runSim}
              style={{
                padding: '5px 12px',
                fontSize: 8,
                color: upset.color,
                border: `1px solid ${upset.color}`,
                backgroundColor: 'var(--color-r-bg)',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              {t(upset.key)} — {t('simulate')}
            </button>

            {sim && (
              <div style={{ display: 'flex', gap: 8, fontSize: 8 }}>
                <span style={{ color: 'var(--color-r)', border: '1px solid var(--color-r)', padding: '4px 8px', backgroundColor: 'var(--color-r-bg)' }}>
                  {teamA.split(' ')[0].toUpperCase()} {t('win')} {Math.round(sim.w / SIM_N * 100)}%
                </span>
                <span style={{ color: 'var(--color-muted)', border: '1px solid var(--color-brd)', padding: '4px 8px' }}>
                  {tc('draw')} {Math.round(sim.d / SIM_N * 100)}%
                </span>
                <span style={{ color: 'var(--color-b)', border: '1px solid var(--color-b)', padding: '4px 8px', backgroundColor: 'var(--color-b-bg)' }}>
                  {teamB.split(' ')[0].toUpperCase()} {t('win')} {Math.round(sim.l / SIM_N * 100)}%
                </span>
                <span style={{ color: 'var(--color-muted)', fontSize: 7, alignSelf: 'center' }}>{SIM_N} {t('simsLabel')}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 28 }}>
          {[
            { team: tA, name: teamA, accentColor: 'var(--color-r)' },
            { team: tB, name: teamB, accentColor: 'var(--color-b)' },
          ].map(({ team, name, accentColor }) => (
            <div key={name} className="factor-card" style={{ borderLeft: `4px solid ${accentColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: accentColor, marginBottom: 16 }}>
                <FlagImg name={name} h={20} emoji={team?.flag ?? '🏳️'} />
                {name.toUpperCase()}
              </div>
              {[
                { label: 'FIFA', val: `${team?.fifa} PTS` },
                { label: 'GDP',  val: `$${team?.gdp}K` },
                { label: 'CONF', val: team?.conf ?? '' },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 9, color: 'var(--color-muted)' }}>{label}</span>
                  <span style={{ fontSize: 9, color: 'var(--color-g)', backgroundColor: 'var(--color-g-bg)', padding: '3px 6px', border: '1px solid var(--color-g-sh)' }}>{val}</span>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <FactorBreakdown name={name} />
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
