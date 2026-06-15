'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

// Zon/maan-toggle in de nav, los van het admin-tandwiel. Leest het actuele thema
// (door het inline-script in de layout vóór paint gezet), wisselt het en bewaart
// de keuze in localStorage onder 'theme'. Toont ☾ in dark, ☀ in light.
export default function ThemeToggle() {
  const t = useTranslations('nav')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current === 'light' || current === 'dark') setTheme(current)
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* localStorage niet beschikbaar — keuze geldt dan alleen deze sessie */
    }
  }

  return (
    <button
      onClick={toggle}
      className="nav-link"
      style={{ padding: '0 10px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', fontFamily: 'inherit' }}
      aria-label={t('toggleTheme')}
    >
      <i className={theme === 'dark' ? 'ti ti-moon' : 'ti ti-sun'} style={{ fontSize: 18 }} aria-hidden />
    </button>
  )
}
