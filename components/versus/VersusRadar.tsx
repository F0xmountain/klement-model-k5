'use client'
import { useTranslations } from 'next-intl'
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend, ResponsiveContainer, Tooltip,
} from 'recharts'
import { teamData, fG, fP, fT, fF } from '@/lib/klement'
import { fE, latestElo } from '@/lib/klement-custom'

// Vaste 5 assen voor de head-to-head radar: GDP, bevolking, klimaat, FIFA, Elo.
const AXES = ['fifa', 'wealth', 'climate', 'population', 'elo'] as const
type Axis = (typeof AXES)[number]

function axisValues(name: string): Record<Axis, number> {
  const t = teamData(name)
  if (!t) return { fifa: 0, wealth: 0, climate: 0, population: 0, elo: 0 }
  const elo = latestElo(name)
  return {
    fifa: Math.round(fF(t.fifa) * 100),
    wealth: Math.round(fG(t.gdp) * 100),
    climate: Math.round(fT(t.temp) * 100),
    population: Math.round(fP(t.pop, t.latam) * 100),
    elo: Math.round(fE(elo ?? 0) * 100),
  }
}

// Beide teams in één RadarChart, twee series (teamA rood, teamB blauw —
// consistent met de kansen-weergave op de versus-pagina).
export default function VersusRadar({ teamA, teamB }: { teamA: string; teamB: string }) {
  const tf = useTranslations('factors')
  const a = axisValues(teamA)
  const b = axisValues(teamB)
  const data = AXES.map(key => ({ factor: tf(key), a: a[key], b: b[key] }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid stroke="var(--color-brd)" />
        <PolarAngleAxis dataKey="factor" tick={{ fontSize: 8, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 7, fill: 'var(--color-muted)' }} axisLine={false} />
        <Radar name={teamA} dataKey="a" stroke="var(--color-r)" fill="var(--color-r)" fillOpacity={0.25} strokeWidth={2} />
        <Radar name={teamB} dataKey="b" stroke="var(--color-b)" fill="var(--color-b)" fillOpacity={0.25} strokeWidth={2} />
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
  )
}
