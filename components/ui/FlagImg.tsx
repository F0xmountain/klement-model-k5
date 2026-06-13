'use client'
import { useState } from 'react'
import { FLAG_CODES } from '@/lib/flags'

interface Props {
  name: string
  h?: number
  emoji?: string
}

export default function FlagImg({ name, h = 24, emoji: _emoji = '🏳' }: Props) {
  const [failed, setFailed] = useState(false)
  const code = FLAG_CODES[name]

  const w = Math.round(h * 1.5)

  if (!code || failed) {
    // Plain text country code fallback — readable on all platforms including Windows
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: w,
        height: h,
        fontSize: Math.max(6, Math.round(h * 0.45)),
        color: 'var(--color-muted)',
        backgroundColor: 'var(--color-surf)',
        border: '1px solid var(--color-brd)',
        fontFamily: 'monospace',
        fontStyle: 'normal',
        verticalAlign: 'middle',
        lineHeight: 1,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}>
        {code?.toUpperCase() ?? '?'}
      </span>
    )
  }

  // SVG from flagcdn.com — scales cleanly to any size, no width-bucketing needed
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${code}.svg`}
      width={w}
      height={h}
      alt={name}
      onError={() => setFailed(true)}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        border: '1px solid var(--color-brd)',
        objectFit: 'cover',
        flexShrink: 0,
      }}
    />
  )
}
