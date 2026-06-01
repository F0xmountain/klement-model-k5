interface Props {
  pA: number
  dr: number
  pB: number
  labelA?: string
  labelB?: string
}

export default function WDLBar({ pA, dr, pB, labelA = 'Win', labelB = 'Win' }: Props) {
  const pAp = Math.round(pA * 100)
  const drp = Math.round(dr * 100)
  const pBp = Math.round(pB * 100)

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        height: 20,
        border: '2px solid var(--color-brd2)',
        boxShadow: '3px 3px 0 var(--color-brd)',
        overflow: 'hidden',
      }}>
        <div style={{ flex: pAp, background: 'var(--color-r)', transition: 'flex 0.3s' }} />
        <div style={{ flex: drp, background: 'var(--color-surf)', transition: 'flex 0.3s' }} />
        <div style={{ flex: pBp, background: 'var(--color-b)', transition: 'flex 0.3s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 7 }}>
        <span style={{ color: 'var(--color-r)' }}>{labelA} {pAp}%</span>
        <span style={{ color: 'var(--color-muted)' }}>DRAW {drp}%</span>
        <span style={{ color: 'var(--color-b)' }}>{labelB} {pBp}%</span>
      </div>
      <div className="marching" />
    </div>
  )
}
