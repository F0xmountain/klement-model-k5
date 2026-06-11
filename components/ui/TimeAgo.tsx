'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

interface Props {
  iso: string | null
}

// Relatieve tijd ("3 min geleden") uit een ISO-timestamp. Berekend ná mount
// (client-only) zodat server- en client-render niet verschillen — relatieve tijd
// hangt van de huidige klok af en zou anders een hydration-mismatch geven.
export default function TimeAgo({ iso }: Props) {
  const t = useTranslations('time')
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!iso) return
    const ts = Date.parse(iso)
    if (Number.isNaN(ts)) return

    function compute() {
      const mins = Math.max(0, Math.floor((Date.now() - ts) / 60000))
      if (mins < 1) setLabel(t('justNow'))
      else if (mins < 60) setLabel(t('minutesAgo', { n: mins }))
      else if (mins < 1440) setLabel(t('hoursAgo', { n: Math.floor(mins / 60) }))
      else setLabel(t('daysAgo', { n: Math.floor(mins / 1440) }))
    }

    compute()
    const id = setInterval(compute, 60000)
    return () => clearInterval(id)
  }, [iso, t])

  if (!iso || label === null) return null
  return <span>{label}</span>
}
