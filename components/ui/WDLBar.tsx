import { useTranslations } from 'next-intl'

interface Props {
  pA: number
  dr: number
  pB: number
  labelA?: string
  labelB?: string
}

export default function WDLBar({ pA, dr, pB, labelA = 'WIN', labelB = 'WIN' }: Props) {
  const t = useTranslations('common')
  const pAp = Math.round(pA * 100)
  const drp = Math.round(dr * 100)
  const pBp = Math.round(pB * 100)

  return (
    <div>
      <div className="wdl-bar">
        <div className="wdl-a" style={{ flex: pAp }}>{pAp}%</div>
        <div className="wdl-d" style={{ flex: drp }}>{drp}%</div>
        <div className="wdl-b" style={{ flex: pBp }}>{pBp}%</div>
      </div>
      <div className="wdl-labels">
        <span style={{ fontSize: 9, color: 'var(--color-r)' }}>{labelA} {pAp}%</span>
        <span style={{ fontSize: 9, color: 'var(--color-muted)', textAlign: 'center' }}>{t('draw')} {drp}%</span>
        <span style={{ fontSize: 9, color: 'var(--color-b)', textAlign: 'right' }}>{labelB} {pBp}%</span>
      </div>
      <div className="marching" />
    </div>
  )
}
