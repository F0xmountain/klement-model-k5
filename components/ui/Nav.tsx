'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { liveMatchNow } from '@/lib/today-schedule'
import ThemeToggle from '@/components/ui/ThemeToggle'

// Vier hubs in de hoofdnav: twee directe kernacties (Versus, My Bracket) en twee
// gegroepeerde dropdowns (Tournament, Insights). Op desktop klappen de groepen uit
// als dropdown; op mobiel staan ze plat onder een sectiekop in het drawer-menu.
const PRIMARY = [
  { href: '/versus', key: 'versus' },
  { href: '/my-bracket', key: 'myBracket' },
] as const

const GROUPS = [
  {
    key: 'tournament',
    items: [
      { href: '/groups', key: 'groups' },
      { href: '/schedule', key: 'schedule' },
      { href: '/knockout/r32', key: 'bracket' },
      { href: '/teams', key: 'teams' },
      { href: '/topscorers', key: 'topscorers' },
      { href: '/live', key: 'live' },
    ],
  },
  {
    key: 'insights',
    items: [
      { href: '/model', key: 'model' },
      { href: '/stats', key: 'stats' },
      { href: '/impact', key: 'impact' },
    ],
  },
] as const

export default function Nav() {
  const t = useTranslations('nav')
  const tBrand = useTranslations('brand')
  const pathname = usePathname()
  const router = useRouter()
  const locale = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
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

  // Prefix-matching voor routes met subpagina's; de rest matcht exact.
  const isActive = (href: string) => {
    if (href === '/knockout/r32') return pathname.startsWith('/knockout')
    if (href === '/teams') return pathname.startsWith('/teams')
    if (href === '/versus') return pathname.startsWith('/versus')
    if (href === '/my-bracket') return pathname.startsWith('/my-bracket')
    return pathname === href
  }

  const route = `${pathname}|${locale}`
  if (route !== prevRoute) {
    setPrevRoute(route)
    setMenuOpen(false)
    setOpenGroup(null)
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <Image
          src="/head_pixel.png"
          alt=""
          width={26}
          height={26}
          aria-hidden
          style={{ imageRendering: 'pixelated', marginRight: 9, display: 'block', flexShrink: 0 }}
        />
        {tBrand('name')}
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
        {GROUPS.map(({ key, items }) => {
          const groupActive = items.some(i => isActive(i.href))
          return (
            <div key={key} className="nav-more">
              <button
                type="button"
                className={`nav-link nav-more-toggle${groupActive ? ' active' : ''}`}
                onClick={() => setOpenGroup(o => (o === key ? null : key))}
                aria-expanded={openGroup === key}
                aria-haspopup="true"
              >
                {t(key)} ▾
              </button>
              <div className={`nav-more-panel${openGroup === key ? ' open' : ''}`}>
                {items.map(({ href, key: itemKey }) => (
                  <Link key={href} href={href} className={`nav-link${isActive(href) ? ' active' : ''}`}>
                    {t(itemKey)}
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
        <div className="nav-spacer" />
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
          <ThemeToggle />
          <Link
            href="/admin"
            className="nav-link"
            style={{ padding: '0 10px', display: 'flex', alignItems: 'center' }}
            aria-label="Admin"
          >
            <i className="ti ti-settings" style={{ fontSize: 18 }} aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  )
}
