'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import Btn from '@/components/ui/Btn'

export default function AdminLoginForm() {
  const t = useTranslations('admin')
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(false)

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.refresh()
    } else {
      setError(true)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320 }}>
      <label style={{ display: 'block', fontSize: 9, color: 'var(--color-muted)', marginBottom: 10 }}>
        {t('passwordLabel')}
      </label>
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="px-select"
        style={{ marginBottom: 14 }}
        autoFocus
      />
      {error && (
        <div style={{ fontSize: 8, color: 'var(--color-r)', marginBottom: 14 }}>
          {t('loginError')}
        </div>
      )}
      <Btn type="submit" variant="blue">{t('loginButton')}</Btn>
    </form>
  )
}
