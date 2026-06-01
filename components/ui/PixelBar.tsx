interface Props {
  value: number
  color?: string
}

export default function PixelBar({ value, color = 'var(--color-g-mid)' }: Props) {
  return (
    <div style={{
      height: 12,
      border: '1px solid var(--color-brd2)',
      background: 'var(--color-surf)',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, value))}%`,
        background: color,
        backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 4px)',
        transition: 'width 0.3s',
      }} />
    </div>
  )
}
