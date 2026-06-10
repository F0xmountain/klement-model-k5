import { Link } from '@/i18n/navigation'
import type { CSSProperties } from 'react'

type Variant = 'red' | 'blue' | 'green' | 'outline-blue' | 'primary' | 'default' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const variantStyles: Record<string, CSSProperties> = {
  red:          { backgroundColor: 'var(--color-r)',    color: '#fff', boxShadow: '4px 4px 0 var(--color-r-sh)' },
  blue:         { backgroundColor: 'var(--color-b)',    color: '#fff', boxShadow: '4px 4px 0 var(--color-b-sh)' },
  green:        { backgroundColor: 'var(--color-g)',    color: '#fff', boxShadow: '4px 4px 0 var(--color-g-sh)' },
  'outline-blue': { backgroundColor: 'transparent', color: 'var(--color-b)', border: '2px solid var(--color-b)', boxShadow: '4px 4px 0 var(--color-b-sh)' },
  primary:      { backgroundColor: 'var(--color-r)',    color: '#fff', boxShadow: '4px 4px 0 var(--color-r-sh)' },
  default:      { backgroundColor: 'var(--color-surf)', color: 'var(--color-txt)', border: '2px solid var(--color-brd2)', boxShadow: '4px 4px 0 var(--color-brd)' },
  ghost:        { backgroundColor: 'transparent', color: 'var(--color-muted)', border: '1px solid var(--color-brd)' },
}

const baseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '10px 16px',
  fontSize: 8,
  fontFamily: 'inherit',
  cursor: 'pointer',
  textDecoration: 'none',
  border: 'none',
  outline: 'none',
  transition: 'transform 0.05s, box-shadow 0.05s',
}

interface BaseProps {
  variant?: Variant
  size?: Size
  className?: string
  children: React.ReactNode
  style?: CSSProperties
}

interface ButtonProps extends BaseProps {
  href?: undefined
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}

interface LinkProps extends BaseProps {
  href: string
  onClick?: undefined
  type?: undefined
  disabled?: undefined
}

type Props = ButtonProps | LinkProps

export default function Btn({ variant = 'default', size: _size, className = '', children, ...rest }: Props) {
  const vs = variantStyles[variant] ?? variantStyles.default
  const combined = { ...baseStyle, ...vs, ...rest.style }

  if (rest.href !== undefined) {
    return (
      <Link href={rest.href} style={combined} className={`px-btn ${className}`}>
        {children}
      </Link>
    )
  }

  return (
    <button
      style={combined}
      className={`px-btn ${className}`}
      onClick={rest.onClick}
      type={rest.type ?? 'button'}
      disabled={rest.disabled}
    >
      {children}
    </button>
  )
}
