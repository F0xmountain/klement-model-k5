'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/lookup',      label: 'LOOKUP'  },
  { href: '/teams',       label: 'TEAMS'   },
  { href: '/mc',          label: 'MONTE'   },
  { href: '/groups',      label: 'GROUPS'  },
  { href: '/knockout/r32',label: 'BRACKET' },
  { href: '/about',       label: 'ABOUT'   },
]

export default function Nav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/knockout/r32') return pathname.startsWith('/knockout')
    return pathname === href
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'var(--color-surf)',
      borderBottom: '2px solid var(--color-brd2)',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '0 16px',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Link href="/" style={{
          fontSize: 9,
          color: 'var(--color-r)',
          background: 'var(--color-r-bg)',
          padding: '4px 8px',
          textDecoration: 'none',
          fontFamily: 'inherit',
          border: '1px solid var(--color-r-sh)',
        }}>
          WC26<span style={{ color: 'var(--color-b)' }}>▶</span>K1
        </Link>
        <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                padding: '4px 8px',
                fontSize: 6,
                textDecoration: 'none',
                fontFamily: 'inherit',
                background: isActive(href) ? 'var(--color-b-bg)' : 'transparent',
                color: isActive(href) ? 'var(--color-b)' : 'var(--color-muted)',
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
