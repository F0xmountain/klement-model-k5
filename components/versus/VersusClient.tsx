'use client'
import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { teamNames, teamData } from '@/lib/klement'
import { matchP, simResultCustom, latestElo, altitudePct, ELO_WEIGHT, FIFA_WEIGHT } from '@/lib/klement-custom'
import { travelDistance, travelPenalty } from '@/lib/travel-distance'
import { calcConfidenceInterval, type ConfidenceInterval } from '@/lib/confidence'
import { calcScoreDistribution } from '@/lib/score-distribution'
import stadiumsRaw from '@/lib/stadiums.json'
import formCacheRaw from '@/lib/form-cache.json'
import { getStarPlayerSummary, toTeamNl, type PlayerStatus } from '@/lib/squad-modifier'
import { getRestDays } from '@/lib/rest-days'
import { teamSlug } from '@/lib/team-slug'
import { Link } from '@/i18n/navigation'
import WDLBar from '@/components/ui/WDLBar'
import FlagImg from '@/components/ui/FlagImg'
import FactorBreakdown from '@/components/team/FactorBreakdown'
import TeamSelect from '@/components/ui/TeamSelect'
import PixelParticles from '@/components/ui/PixelParticles'
import PolymarketBtn from '@/components/ui/PolymarketBtn'
import VersusRadar from '@/components/versus/VersusRadar'
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

function venueFromIdx(i: number) {
  const s = stadiums[i]!
  return { altitude: s.altitude_m, lat: s.coordinates.lat, lon: s.coordinates.lon }
}

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
function expectedGoalsNum(p: number): number {
  return BASE_SCORING_RATE * (0.5 + (p - 0.5) * 0.8)
}
function expectedGoals(p: number): string {
  return expectedGoalsNum(p).toFixed(1)
}

// Betrouwbaarheidsinterval alleen tonen als het >= 2%-punt breed is — smaller dan
// dat is er te weinig variatie om zinvol te tonen. Geeft de afgeronde grenzen of null.
function ciBounds(b: { low95: number; high95: number } | undefined): { low: number; high: number } | null {
  if (!b) return null
  const low = Math.round(b.low95 * 100)
  const high = Math.round(b.high95 * 100)
  return high - low < 2 ? null : { low, high }
}

function upsetLabel(pA: number, pB: number): { key: 'coinFlip' | 'heavyFavourite' | 'upsetPotential'; color: string } | null {
  const gap = Math.abs(pA - pB)
  if (gap < 0.1) return { key: 'coinFlip', color: 'var(--color-muted)' }
  if (gap > 0.55) return { key: 'heavyFavourite', color: 'var(--color-r)' }
  if (gap > 0.35) return { key: 'upsetPotential', color: 'var(--color-r)' }
  return null
}

interface SimData { w: number; d: number; l: number }

interface H2HMatch {
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  competition: string
}
interface H2HResult {
  matches: H2HMatch[]
  summary: { teamAWins: number; draws: number; teamBWins: number }
}

// Gedeeld door zowel de query-param-pagina (/versus?a=&b=) als de slug-route
// (/versus/spain/netherlands). Met initialA/initialB draait de slug-modus: de
// teams komen uit de props en de URL-query wordt genegeerd.
export default function VersusClient({ initialA, initialB }: { initialA?: string; initialB?: string }) {
  const t = useTranslations('versus')
  const tc = useTranslations('common')
  const locale = useLocale()
  const slugMode = !!(initialA && initialB)
  const [teamA, setTeamA] = useState(initialA ?? 'Netherlands')
  const [teamB, setTeamB] = useState(initialB ?? 'Portugal')
  const [sim, setSim] = useState<SimData | null>(null)
  const [simFor, setSimFor] = useState('')
  const [venueIdx, setVenueIdx] = useState<number | null>(null)
  const [polyOdds, setPolyOdds] = useState<Record<string, number> | null>(null)
  const [h2hCache, setH2hCache] = useState<Record<string, H2HResult>>({})
  const [h2hOpen, setH2hOpen] = useState(false)
  const [scoresOpen, setScoresOpen] = useState(false)
  const [factorsOpen, setFactorsOpen] = useState(false)
  // CI-cache per teamparing + locatie. De berekening is zwaar (500 simulaties);
  // de keyed cache zorgt dat een al-berekend interval bij een re-render direct uit
  // de cache komt en niet opnieuw draait (de effect hieronder slaat over als de
  // sleutel al bestaat). State i.p.v. ref omdat de waarde tijdens render wordt
  // gelezen (react-hooks/refs verbiedt ref-toegang in render).
  const [ciCache, setCiCache] = useState<Record<string, ConfidenceInterval>>({})

  // URL-params (?a=&b=&venue=) eenmalig inlezen — teams case-insensitief gematcht
  // aan teams.json, venue aan stadiums.json ("Stadion, Stad"). Zo kunnen de
  // homepage-widget en de groepspagina naar een specifieke wedstrijd linken.
  // In slug-modus overgeslagen — dan komen de teams uit de props.
  useEffect(() => {
    if (slugMode) return
    const params = new URLSearchParams(window.location.search)
    const findTeam = (v: string | null) =>
      v ? allTeams.find(name => name.toLowerCase() === v.toLowerCase()) : undefined
    const a = findTeam(params.get('a'))
    const b = findTeam(params.get('b'))
    const venueParam = params.get('venue')
    const q = venueParam?.toLowerCase()
    const venueMatch = q
      ? stadiums.findIndex(s => q === `${s.stadium}, ${s.city}`.toLowerCase() || q.includes(s.stadium.toLowerCase()))
      : -1
    /* eslint-disable react-hooks/set-state-in-effect -- mount-only init from URL params */
    if (a) setTeamA(a)
    if (b) setTeamB(b)
    if (venueMatch >= 0) setVenueIdx(venueMatch)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [slugMode])

  // Polymarket-toernooiodds eenmalig ophalen (gecachet server-side via /api/polymarket)
  useEffect(() => {
    fetch('/api/polymarket')
      .then(r => r.json())
      .then((data: { team: string; probability: number }[]) => {
        setPolyOdds(Object.fromEntries(data.map(p => [p.team, p.probability])))
      })
      .catch(() => {})
  }, [])

  const venue = venueIdx !== null ? venueFromIdx(venueIdx) : undefined
  const restA = getRestDays(teamA)
  const restB = getRestDays(teamB)

  const polyAvailable = !!polyOdds && (polyOdds[teamA] ?? 0) > 0 && (polyOdds[teamB] ?? 0) > 0
  const { pA, dr, pB } = matchP(teamA, teamB, venue, { home: restA, away: restB }, polyOdds ?? undefined)
  const modelOnly = polyAvailable ? matchP(teamA, teamB, venue, { home: restA, away: restB }) : null
  const marketPA = polyAvailable ? polyOdds![teamA]! / (polyOdds![teamA]! + polyOdds![teamB]!) : null

  // H2H per teamparing ophalen (lazy, gecachet)
  const h2hKey = `${teamA}:${teamB}`
  const h2h = h2hCache[h2hKey]
  useEffect(() => {
    if (h2hCache[h2hKey]) return
    let cancelled = false
    fetch(`/api/h2h/${encodeURIComponent(teamA)}/${encodeURIComponent(teamB)}`)
      .then(r => r.json())
      .then((data: H2HResult) => { if (!cancelled) setH2hCache(prev => ({ ...prev, [h2hKey]: data })) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [h2hKey, h2hCache, teamA, teamB])

  // Betrouwbaarheidsinterval (client-side, ~0.5s) per teamparing + locatie.
  const ciKey = `${teamA}:${teamB}:${venueIdx}`
  const ci = ciCache[ciKey]
  useEffect(() => {
    if (ciCache[ciKey]) return
    const id = setTimeout(() => {
      const v = venueIdx !== null ? venueFromIdx(venueIdx) : undefined
      const data = calcConfidenceInterval(teamA, teamB, v, 500)
      setCiCache(prev => ({ ...prev, [ciKey]: data }))
    }, 30)
    return () => clearTimeout(id)
  }, [ciKey, ciCache, teamA, teamB, venueIdx])

  const tA = teamData(teamA)
  const tB = teamData(teamB)
  const eloA = latestElo(teamA)
  const eloB = latestElo(teamB)
  const altPctA = venue ? altitudePct(teamA, venue.altitude ?? 0) : 0
  const altPctB = venue ? altitudePct(teamB, venue.altitude ?? 0) : 0
  const venueCoord = venue && venue.lat !== undefined && venue.lon !== undefined ? { lat: venue.lat, lon: venue.lon } : undefined
  const travelKmA = venueCoord ? travelDistance(teamA, venueCoord) : undefined
  const travelKmB = venueCoord ? travelDistance(teamB, venueCoord) : undefined
  const travelPenA = venueCoord ? travelPenalty(teamA, venueCoord) : 0
  const travelPenB = venueCoord ? travelPenalty(teamB, venueCoord) : 0
  const scoreDist = calcScoreDistribution(expectedGoalsNum(pA), expectedGoalsNum(pB))
  const restWarnings = [
    { team: teamA, days: restA },
    { team: teamB, days: restB },
  ].filter((r): r is { team: string; days: number } => r.days !== undefined && r.days < 3)
  const upset = upsetLabel(pA, pB)
  const summaryA = getStarPlayerSummary(toTeamNl(teamA) ?? '')
  const summaryB = getStarPlayerSummary(toTeamNl(teamB) ?? '')
  const ciWin = ci ? ciBounds(ci.win) : null
  const ciLoss = ci ? ciBounds(ci.loss) : null

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
    const a = pool[Math.floor(Math.random() * pool.length)]!
    const remaining = pool.filter(t => t !== a)
    const b = remaining[Math.floor(Math.random() * remaining.length)]!
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

        {/* 2 — WDL-balk (prominent) */}
        <WDLBar pA={pA} dr={dr} pB={pB} labelA={teamA} labelB={teamB} />

        {/* 3 — Kansen met betrouwbaarheidsinterval (één regel) */}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 10, fontSize: 11, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--color-r)', fontWeight: 'bold' }}>
            {teamA} {Math.round(pA * 100)}%
            {ciWin && <span style={{ color: 'var(--color-muted)', fontWeight: 'normal', marginLeft: 4, fontSize: 9 }}>{t('confidenceInterval', ciWin)}</span>}
          </span>
          <span style={{ color: 'var(--color-muted)' }}>·</span>
          <span style={{ color: 'var(--color-muted)' }}>{tc('draw')} {Math.round(dr * 100)}%</span>
          <span style={{ color: 'var(--color-muted)' }}>·</span>
          <span style={{ color: 'var(--color-b)', fontWeight: 'bold' }}>
            {teamB} {Math.round(pB * 100)}%
            {ciLoss && <span style={{ color: 'var(--color-muted)', fontWeight: 'normal', marginLeft: 4, fontSize: 9 }}>{t('confidenceInterval', ciLoss)}</span>}
          </span>
        </div>

        {/* 4 — Verwachte score (klein, muted) */}
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>
            {t('expectedScore', { a: expectedGoals(pA), b: expectedGoals(pB) })}
          </div>
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginTop: 3 }}>
            {t('expectedScoreNote')}
          </div>
        </div>

        {/* 5 — Polymarket breakdown (alleen als marktdata beschikbaar) */}
        {polyAvailable && modelOnly && marketPA !== null && (
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 8, color: 'var(--color-muted)' }}>
            {t('polyBreakdown', {
              model: Math.round(modelOnly.pA * 100),
              market: Math.round(marketPA * 100),
              combined: Math.round(pA * 100),
            })}
          </div>
        )}

        {/* 6 — Teamsterkte-split + actuele Elo-scores (klein) */}
        <div style={{ marginTop: 8, textAlign: 'center', fontSize: 8, color: 'var(--color-muted)' }}>
          {t('teamStrengthSplit', { elo: ELO_WEIGHT * 100, fifa: FIFA_WEIGHT * 100 })}
          {eloA !== undefined && eloB !== undefined && (
            <span style={{ marginLeft: 8 }}>· {t('eloScores', { a: Math.round(eloA), b: Math.round(eloB) })}</span>
          )}
        </div>

        {/* 6a — Hoogte-bijdrage (alleen bij een hooggelegen venue met effect) */}
        {venue && venue.altitude > 1500 && (altPctA !== 0 || altPctB !== 0) && (
          <div style={{ marginTop: 4, textAlign: 'center', fontSize: 8, color: 'var(--color-o)' }}>
            ⛰ {t('altitudeLabel', { m: venue.altitude })}
            {altPctA !== 0 && <span> · {teamA} {altPctA.toFixed(1)}%</span>}
            {altPctB !== 0 && <span> · {teamB} {altPctB.toFixed(1)}%</span>}
          </div>
        )}

        {/* 6c — Reisafstand-bijdrage (alleen bij een venue met effect) */}
        {venue && (travelPenA > 0 || travelPenB > 0) && (
          <div style={{ marginTop: 4, textAlign: 'center', fontSize: 8, color: 'var(--color-muted)' }}>
            {travelPenA > 0 && <span>✈ {teamA} {t('travelDistance')}: {t('travelKm', { km: Math.round(travelKmA ?? 0) })} · −{(travelPenA * 100).toFixed(1)}%</span>}
            {travelPenA > 0 && travelPenB > 0 && <span> · </span>}
            {travelPenB > 0 && <span>✈ {teamB} {t('travelDistance')}: {t('travelKm', { km: Math.round(travelKmB ?? 0) })} · −{(travelPenB * 100).toFixed(1)}%</span>}
          </div>
        )}

        {/* 6b — Gedeelde 5-assige radar (beide teams op dezelfde assen) */}
        <div style={{ marginTop: 20 }}>
          <div className="section-title" style={{ marginBottom: 8 }}>{t('radarTitle')}</div>
          <VersusRadar teamA={teamA} teamB={teamB} />
        </div>

        {/* 7 — Factor breakdown per team (uitklapbaar, dicht by default) */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={() => setFactorsOpen(o => !o)}
            style={{ padding: '5px 12px', fontSize: 8, color: 'var(--color-muted)', border: '1px solid var(--color-brd)', backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {factorsOpen ? t('hideFactors') : t('showFactors')}
          </button>
        </div>
        {factorsOpen && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 16 }}>
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
        )}

        {/* 8 — Sterspeler-samenvatting (alleen bij twijfelachtig/out) */}
        {(summaryA.length > 0 || summaryB.length > 0) && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
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

        {/* 9 — Rustdagen-waarschuwing (alleen als relevant) */}
        {restWarnings.map(({ team, days }) => (
          <div key={team} style={{ marginTop: 6, fontSize: 8, color: 'var(--color-r)', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⚠️ {t('restWarning', { team, days })}
          </div>
        ))}

        {/* 10 — Vormindicator (alleen als vormdata beschikbaar) */}
        {[teamA, teamB].map(name => {
          const score = formCache[name]?.formScore
          if (score == null) return null
          const level = formLevel(score)
          return (
            <div key={name} style={{ marginTop: 6, fontSize: 8, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className={`form-dot form-dot-${FORM_LEVEL_DOT[level]}`} />
              {t('formIndicator', { team: name, level: t(FORM_LEVEL_KEY[level]), score })}
            </div>
          )
        })}

        {/* Verrassings-badge met snelle simulatie (interactief) */}
        {upset && (
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                  {teamA.split(' ')[0]!.toUpperCase()} {t('win')} {Math.round(sim.w / SIM_N * 100)}%
                </span>
                <span style={{ color: 'var(--color-muted)', border: '1px solid var(--color-brd)', padding: '4px 8px' }}>
                  {tc('draw')} {Math.round(sim.d / SIM_N * 100)}%
                </span>
                <span style={{ color: 'var(--color-b)', border: '1px solid var(--color-b)', padding: '4px 8px', backgroundColor: 'var(--color-b-bg)' }}>
                  {teamB.split(' ')[0]!.toUpperCase()} {t('win')} {Math.round(sim.l / SIM_N * 100)}%
                </span>
                <span style={{ color: 'var(--color-muted)', fontSize: 7, alignSelf: 'center' }}>{SIM_N} {t('simsLabel')}</span>
              </div>
            )}
          </div>
        )}

        {/* 11 — Scorekansverdeling — Poisson (uitklapbaar, dicht by default) */}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={() => setScoresOpen(o => !o)}
            style={{ padding: '4px 12px', fontSize: 8, color: 'var(--color-muted)', border: '1px solid var(--color-brd)', backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }}
          >
            {scoresOpen ? t('hideScores') : t('showScores')}
          </button>
          {scoresOpen && (
            <div style={{ marginTop: 10, border: '1px solid var(--color-brd)', padding: 12 }}>
              <div style={{ fontSize: 9, color: 'var(--color-txt)', marginBottom: 10 }}>{t('scoreDist')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', maxWidth: 280, margin: '0 auto' }}>
                {scoreDist.scores.slice(0, 8).map(s => (
                  <div key={`${s.a}-${s.b}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--color-muted)' }}>
                    <span style={{ color: 'var(--color-txt)' }}>{s.a}-{s.b}</span>
                    <span>{Math.round(s.prob * 100)}%</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 7, color: 'var(--color-muted)', marginTop: 10 }}>{t('scoreDistNote')}</div>
            </div>
          )}
        </div>

        {/* 12 — H2H-historie (uitklapbaar, dicht by default, alleen bij ≥1 wedstrijd) */}
        {h2h && h2h.matches.length >= 1 && (
          <div style={{ marginTop: 16 }}>
            <button
              onClick={() => setH2hOpen(o => !o)}
              style={{ padding: '5px 12px', fontSize: 8, color: 'var(--color-muted)', border: '1px solid var(--color-brd)', backgroundColor: 'transparent', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              {h2hOpen ? t('h2hHide') : t('h2hShow')}
            </button>
            {h2hOpen && (
              <div style={{ marginTop: 10, border: '1px solid var(--color-brd)', padding: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--color-txt)', marginBottom: 8 }}>{t('h2hTitle')}</div>
                <div style={{ fontSize: 9, color: 'var(--color-muted)', marginBottom: 10 }}>
                  {t('h2hSummary', {
                    teamA,
                    winsA: h2h.summary.teamAWins,
                    draws: h2h.summary.draws,
                    winsB: h2h.summary.teamBWins,
                    teamB,
                  })}
                </div>
                {h2h.matches.slice(0, 5).map((m, i) => (
                  <div key={i} style={{ fontSize: 8, color: 'var(--color-muted)', padding: '5px 0', borderTop: i > 0 ? '1px solid var(--color-brd)' : 'none' }}>
                    {new Date(m.date).toLocaleDateString(locale, { month: 'short', year: 'numeric' })} · {m.homeTeam} {m.homeScore}–{m.awayScore} {m.awayTeam} · {m.competition}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 13 — Trade on Polymarket */}
        {Math.abs(pA - pB) >= PM_GAP_THRESHOLD && (
          <PolymarketBtn
            teamName={pA > pB ? teamA : teamB}
            variant="match"
          />
        )}

        {/* 14 — Link naar de deelbare volledige-vergelijkingspagina (alleen in query-modus) */}
        {!slugMode && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <Link
              href={`/versus/${teamSlug(teamA)}/${teamSlug(teamB)}`}
              style={{ fontSize: 9, color: 'var(--color-b)', textDecoration: 'none', letterSpacing: 0.5 }}
            >
              {t('fullComparison')}
            </Link>
          </div>
        )}

      </div>
    </div>
  )
}
