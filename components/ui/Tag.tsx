type Variant = 'blue' | 'red' | 'green' | 'gray'

const styles: Record<Variant, React.CSSProperties> = {
  green: { background: 'var(--color-g-bg)', color: 'var(--color-g)', border: '1px solid var(--color-g-sh)' },
  blue:  { background: 'var(--color-b-bg)', color: 'var(--color-b)', border: '1px solid var(--color-b-sh)' },
  red:   { background: 'var(--color-r-bg)', color: 'var(--color-r)', border: '1px solid var(--color-r-sh)' },
  gray:  { background: 'var(--color-surf)', color: 'var(--color-muted)', border: '1px solid var(--color-brd)' },
}

interface Props {
  variant?: Variant
  children: React.ReactNode
}

export default function Tag({ variant = 'gray', children }: Props) {
  return (
    <span style={{ ...styles[variant], display: 'inline-flex', alignItems: 'center', padding: '2px 6px', fontSize: 6 }}>
      {children}
    </span>
  )
}
