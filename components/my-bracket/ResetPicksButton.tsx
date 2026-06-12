'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { clearPicks } from '@/lib/my-picks'

export default function ResetPicksButton() {
  const t = useTranslations('myBracket')
  const [done, setDone] = useState(false)

  function handleReset() {
    if (window.confirm(t('resetConfirm'))) {
      clearPicks()
      setDone(true)
      setTimeout(() => setDone(false), 2000)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {done && <span style={{ fontSize: 9, color: 'var(--color-g)' }}>{t('resetDone')}</span>}
      <button
        onClick={handleReset}
        className="px-btn"
        style={{
          fontFamily: 'inherit', fontSize: 8, padding: '6px 12px',
          backgroundColor: 'transparent', color: 'var(--color-r)',
          border: '1px solid var(--color-r)', cursor: 'pointer',
        }}
      >
        {t('reset')}
      </button>
    </div>
  )
}
