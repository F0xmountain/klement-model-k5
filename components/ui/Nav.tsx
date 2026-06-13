'use client'
import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { liveMatchNow } from '@/lib/today-schedule'

// Primaire nav — altijd zichtbaar. Secundaire items zitten achter een "More"-
// dropdown (desktop) en staan plat in het hamburger-menu (mobiel).
const PRIMARY = [
  { href: '/versus', key: 'versus' },
  { href: '/groups', key: 'groups' },
  { href: '/my-bracket', key: 'myBracket' },
  { href: '/live', key: 'live' },
  { href: '/stats', key: 'stats' },
  { href: '/impact', key: 'impact' },
] as const
const SECONDARY = [
  { href: '/teams', key: 'teams' },
  { href: '/schedule', key: 'schedule' },
  { href: '/mc', key: 'mc' },
  { href: '/knockout/r32', key: 'bracket' },
  { href: '/sim-bracket', key: 'simBracket' },
  { href: '/topscorers', key: 'topscorers' },
  { href: '/model', key: 'model' },
  { href: '/about', key: 'about' },
] as const

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.632 5.905-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  )
}

export default function Nav() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [prevRoute, setPrevRoute] = useState(`${pathname}|${locale}`)
  const [live, setLive] = useState(false)

  // Of er nu een wedstrijd bezig is — client-side bepaald (geen hydration-mismatch),
  // elke minuut herzien.
  useEffect(() => {
    const check = () => setLive(liveMatchNow(new Date()) !== null)
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  const isActive = (href: string) =>
    href === '/knockout/r32' ? pathname.startsWith('/knockout') : pathname === href
  const moreActive = SECONDARY.some(s => isActive(s.href))

  const route = `${pathname}|${locale}`
  if (route !== prevRoute) {
    setPrevRoute(route)
    setMenuOpen(false)
    setMoreOpen(false)
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <span style={{ color: 'var(--color-b)', marginRight: 6 }}>⌂</span>Klement
      </Link>
      {live && (
        <Link
          href="/groups"
          className="blink"
          style={{
            marginLeft: 10, padding: '2px 7px', fontSize: 8, letterSpacing: 1,
            backgroundColor: 'var(--color-r)', color: '#fff', textDecoration: 'none',
            alignSelf: 'center',
          }}
        >
          ● {t('live')}
        </Link>
      )}
      <button
        className="nav-hamburger"
        onClick={() => setMenuOpen(o => !o)}
        aria-label={t(menuOpen ? 'closeMenu' : 'openMenu')}
        aria-expanded={menuOpen}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <div className={`nav-menu${menuOpen ? ' open' : ''}`}>
        <div className="nav-links">
          {PRIMARY.map(({ href, key }) => (
            <Link key={href} href={href} className={`nav-link${isActive(href) ? ' active' : ''}`}>
              {t(key)}
            </Link>
          ))}
        </div>
        <div className="nav-more">
          <button
            type="button"
            className={`nav-link nav-more-toggle${moreActive ? ' active' : ''}`}
            onClick={() => setMoreOpen(o => !o)}
            aria-expanded={moreOpen}
            aria-haspopup="true"
          >
            {t('more')} ▾
          </button>
          <div className={`nav-more-panel${moreOpen ? ' open' : ''}`}>
            {SECONDARY.map(({ href, key }) => (
              <Link key={href} href={href} className={`nav-link${isActive(href) ? ' active' : ''}`}>
                {t(key)}
              </Link>
            ))}
          </div>
        </div>
        <div className="nav-extra">
          {routing.locales.map(loc => (
            <button
              key={loc}
              onClick={() => router.replace(pathname, { locale: loc })}
              className={`nav-link${locale === loc ? ' active' : ''}`}
              style={{
                padding: '0 10px',
                background: 'none',
                border: 'none',
                borderRight: '1px solid var(--color-brd)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
              aria-label={t(loc === 'en' ? 'switchToEnglish' : 'switchToDutch')}
            >
              {loc.toUpperCase()}
            </button>
          ))}
          <Link
            href="/admin"
            className="nav-link"
            style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }}
            aria-label="Admin"
          >
            <i className="ti ti-settings" style={{ fontSize: 18 }} aria-hidden />
          </Link>
          <a
            href="https://x.com/klementworldcup"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }}
            aria-label={t('followX')}
          >
            <XIcon />
          </a>
          <a
            href="https://github.com/x-cookie/klement-model-k5"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
            style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }}
            aria-label={t('viewGithub')}
          >
            <GitHubIcon />
          </a>
        </div>
      </div>
    </nav>
  )
}
