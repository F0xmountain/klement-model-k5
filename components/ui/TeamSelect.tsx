'use client'
import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { teamData } from '@/lib/klement'
import FlagImg from './FlagImg'

interface Props {
  teams: string[]
  value: string
  onChange: (v: string) => void
  style?: React.CSSProperties
}

export default function TeamSelect({ teams, value, onChange, style }: Props) {
  const tr = useTranslations('teamSelect')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? teams.filter(t => t.toLowerCase().includes(search.toLowerCase()))
    : teams

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const t = teamData(value)

  return (
    <div ref={ref} style={{ position: 'relative', ...style }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          backgroundColor: 'var(--color-bg)',
          border: '2px solid var(--color-brd2)',
          boxShadow: '3px 3px 0 var(--color-brd)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 9,
          color: 'var(--color-txt)',
          textAlign: 'left',
        }}
      >
        <FlagImg name={value} h={16} emoji={t?.flag ?? '🏳️'} />
        <span style={{ flex: 1 }}>{value}</span>
        <span style={{ color: 'var(--color-muted)', fontSize: 8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 200,
          backgroundColor: 'var(--color-bg)',
          border: '2px solid var(--color-brd2)',
          borderTop: 'none',
          boxShadow: '4px 4px 0 var(--color-brd)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 260,
        }}>
          <input
            ref={inputRef}
            type="text"
            placeholder={tr('searchPlaceholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              fontFamily: 'inherit',
              fontSize: 8,
              padding: '7px 10px',
              border: 'none',
              borderBottom: '1px solid var(--color-brd)',
              backgroundColor: 'var(--color-surf)',
              color: 'var(--color-txt)',
              outline: 'none',
              flexShrink: 0,
            }}
          />
          <div style={{ overflowY: 'auto' }}>
            {filtered.map(name => {
              const td = teamData(name)
              const isSelected = name === value
              return (
                <div
                  key={name}
                  onClick={() => { onChange(name); setOpen(false); setSearch('') }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 10px',
                    cursor: 'pointer',
                    fontSize: 9,
                    backgroundColor: isSelected ? 'var(--color-b-bg)' : 'transparent',
                    color: isSelected ? 'var(--color-b)' : 'var(--color-txt)',
                    borderBottom: '1px solid var(--color-brd)',
                  }}
                >
                  <FlagImg name={name} h={14} emoji={td?.flag ?? '🏳️'} />
                  <span>{name}</span>
                  {isSelected && <span style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--color-b)' }}>✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
