'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip,
} from 'recharts'
import { teamNames, teamData, fG, fP, fT, fF } from '@/lib/klement'
import TeamSelect from '@/components/ui/TeamSelect'

const ALL_TEAMS = teamNames().sort()
const FACTOR_KEYS = ['fifa', 'wealth', 'climate', 'population', 'homeEdge'] as const

function factorValues(name: string) {
  const t = teamData(name)
  if (!t) return { fifa: 0, wealth: 0, climate: 0, population: 0, homeEdge: 0 }
  return {
    fifa: Math.round(fF(t.fifa) * 100),
    wealth: Math.round(fG(t.gdp) * 100),
    climate: Math.round(fT(t.temp) * 100),
    population: Math.round(fP(t.pop, t.latam) * 100),
    homeEdge: t.host ? 100 : 0,
  }
}

export default function FactorRadar() {
  const t = useTranslations('stats')
  const tf = useTranslations('factors')
  const [teamA, setTeamA] = useState('Netherlands')
  const [teamB, setTeamB] = useState('Portugal')

  const a = factorValues(teamA)
  const b = factorValues(teamB)

  const data = FACTOR_KEYS.map(key => ({
    factor: tf(key),
    a: a[key],
    b: b[key],
  }))

  return (
    <div>
      <div className="section-title">{t('radarTitle')}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
        {t('radarDescription')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20, maxWidth: 480 }}>
        <TeamSelect teams={ALL_TEAMS} value={teamA} onChange={setTeamA} />
        <TeamSelect teams={ALL_TEAMS} value={teamB} onChange={setTeamB} />
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="var(--color-brd)" />
          <PolarAngleAxis dataKey="factor" tick={{ fontSize: 8, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 7, fill: 'var(--color-muted)' }} axisLine={false} />
          <Radar name={teamA} dataKey="a" stroke="var(--color-b)" fill="var(--color-b)" fillOpacity={0.25} strokeWidth={2} />
          <Radar name={teamB} dataKey="b" stroke="var(--color-r)" fill="var(--color-r)" fillOpacity={0.25} strokeWidth={2} />
          <Legend wrapperStyle={{ fontSize: 9, fontFamily: 'var(--font-pixel)' }} />
          <Tooltip
            contentStyle={{
              fontFamily: 'var(--font-pixel), monospace', fontSize: 9,
              backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
              boxShadow: '3px 3px 0 var(--color-brd)',
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
