'use client'
import { useState } from 'react'
import { FLAG_CODES } from '@/lib/flags'

interface Props {
  name: string
  h?: number
  emoji?: string
}

// flagcdn.com supported widths — use nearest to keep aspect ratio
const SUPPORTED_WIDTHS = [16, 20, 24, 32, 40, 48, 64, 96, 160, 320]

function nearestWidth(px: number): number {
  return SUPPORTED_WIDTHS.reduce((best, w) =>
    Math.abs(w - px) < Math.abs(best - px) ? w : best
  )
}

export default function FlagImg({ name, h = 24, emoji = '🏳️' }: Props) {
  const [failed, setFailed] = useState(false)
  const code = FLAG_CODES[name]

  if (!code || failed) {
    return <span style={{ fontSize: h * 1.2, lineHeight: 1, verticalAlign: 'middle' }}>{emoji}</span>
  }

  const targetW = Math.round(h * 1.5)
  const w = nearestWidth(targetW)
  const src = `https://flagcdn.com/w${w}/${code}.png`

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      width={targetW}
      height={h}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        border: '1px solid var(--color-brd)',
        objectFit: 'cover',
      }}
    />
  )
}
