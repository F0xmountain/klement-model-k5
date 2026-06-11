'use client'
import { useEffect, useState } from 'react'
import type { TeamForm } from '@/app/api/form/[team]/route'

interface Props {
  team: string
}

const DOT_COUNT = 10

export default function FormBar({ team }: Props) {
  const [result, setResult] = useState<{ team: string; data: TeamForm | null } | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/form/${encodeURIComponent(team)}`)
      .then(res => res.json())
      .then((d: TeamForm) => { if (!cancelled) setResult({ team, data: d }) })
      .catch(() => { if (!cancelled) setResult({ team, data: null }) })

    return () => { cancelled = true }
  }, [team])

  if (result?.team !== team) {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: DOT_COUNT }, (_, i) => (
          <span key={i} className="form-dot form-dot-skeleton" />
        ))}
      </div>
    )
  }

  if (result.data?.formScore == null) {
    return <span style={{ fontSize: 9, color: 'var(--color-muted)' }}>–</span>
  }

  const data = result.data

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: DOT_COUNT }, (_, i) => {
        const entry = data.results[i]
        return (
          <span
            key={i}
            className={`form-dot form-dot-${entry?.result ?? 'empty'}`}
            title={entry ? `${entry.opponent} ${entry.score}` : undefined}
          />
        )
      })}
    </div>
  )
}
