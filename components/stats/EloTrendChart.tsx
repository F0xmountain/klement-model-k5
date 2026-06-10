'use client'
import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import eloHistory from '@/lib/elo-history.json'
import { teamData } from '@/lib/klement'
import FlagImg from '@/components/ui/FlagImg'

const ALL_TEAMS = Object.keys(eloHistory[0]).filter(k => k !== 'date').sort()
const DEFAULT_TEAMS = ['Netherlands', 'Portugal', 'Spain', 'France']
const MAX_TEAMS = 6
const COLORS = ['var(--color-b)', 'var(--color-r)', 'var(--color-g)', 'var(--color-o)', '#7B4FA0', '#1A8A8A']
const DEC_TICKS = eloHistory.filter(r => r.date.endsWith('-12-31')).map(r => r.date)

const QUARTER_LABEL: Record<string, string> = { '03': 'Q1', '06': 'Q2', '09': 'Q3', '12': 'Q4' }

function formatQuarter(label: React.ReactNode) {
  const [year, month] = String(label).split('-')
  return `${QUARTER_LABEL[month]} ${year}`
}

export default function EloTrendChart() {
  const t = useTranslations('stats')
  const ts = useTranslations('teamSelect')
  const [selected, setSelected] = useState<string[]>(DEFAULT_TEAMS)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

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

  function remove(name: string) {
    if (selected.length <= 1) return
    setSelected(selected.filter(n => n !== name))
  }

  function add(name: string) {
    if (selected.includes(name) || selected.length >= MAX_TEAMS) return
    setSelected([...selected, name])
    setOpen(false)
    setSearch('')
  }

  const filtered = search
    ? ALL_TEAMS.filter(n => n.toLowerCase().includes(search.toLowerCase()))
    : ALL_TEAMS

  return (
    <div>
      <div className="section-title">{t('eloTitle')}</div>
      <div style={{ fontSize: 10, color: 'var(--color-muted)', lineHeight: 2.2, marginBottom: 20 }}>
        {t('eloDescription')}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        {selected.map((name, i) => {
          const td = teamData(name)
          return (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', fontSize: 9,
              border: `2px solid ${COLORS[i % COLORS.length]}`,
              backgroundColor: 'var(--color-bg)',
            }}>
              <span style={{ width: 8, height: 8, backgroundColor: COLORS[i % COLORS.length], display: 'inline-block', flexShrink: 0 }} />
              <FlagImg name={name} h={14} emoji={td?.flag ?? '🏳️'} />
              <span>{name}</span>
              <button
                onClick={() => remove(name)}
                disabled={selected.length <= 1}
                aria-label={t('removeTeam', { team: name })}
                style={{
                  background: 'none', border: 'none', fontFamily: 'inherit',
                  cursor: selected.length <= 1 ? 'default' : 'pointer',
                  color: 'var(--color-muted)', fontSize: 10, padding: 0, lineHeight: 1,
                  opacity: selected.length <= 1 ? 0.3 : 1,
                }}
              >
                ✕
              </button>
            </div>
          )
        })}

        {selected.length < MAX_TEAMS && (
          <div ref={ref} style={{ position: 'relative' }}>
            <button
              className="px-btn"
              onClick={() => setOpen(o => !o)}
              style={{
                fontFamily: 'inherit', fontSize: 9, padding: '8px 12px',
                backgroundColor: 'var(--color-bg)', color: 'var(--color-b)',
                border: '2px solid var(--color-brd2)', boxShadow: '3px 3px 0 var(--color-brd)',
              }}
            >
              + {t('addTeam')}
            </button>

            {open && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 4,
                zIndex: 200, width: 220,
                backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
                boxShadow: '4px 4px 0 var(--color-brd)',
                display: 'flex', flexDirection: 'column', maxHeight: 260,
              }}>
                <input
                  autoFocus
                  type="text"
                  placeholder={ts('searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    fontFamily: 'inherit', fontSize: 8, padding: '7px 10px',
                    border: 'none', borderBottom: '1px solid var(--color-brd)',
                    backgroundColor: 'var(--color-surf)', color: 'var(--color-txt)', outline: 'none', flexShrink: 0,
                  }}
                />
                <div style={{ overflowY: 'auto' }}>
                  {filtered.map(name => {
                    const isSelected = selected.includes(name)
                    const td = teamData(name)
                    return (
                      <div
                        key={name}
                        onClick={() => add(name)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
                          fontSize: 9, borderBottom: '1px solid var(--color-brd)',
                          cursor: isSelected ? 'default' : 'pointer',
                          opacity: isSelected ? 0.4 : 1,
                          color: 'var(--color-txt)',
                        }}
                      >
                        <FlagImg name={name} h={14} emoji={td?.flag ?? '🏳️'} />
                        <span>{name}</span>
                        {isSelected && <span style={{ marginLeft: 'auto', fontSize: 7, color: 'var(--color-g)' }}>✓</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={eloHistory} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-brd)" strokeDasharray="2 2" />
          <XAxis
            dataKey="date"
            ticks={DEC_TICKS}
            tickFormatter={d => d.slice(0, 4)}
            tick={{ fontSize: 8, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
            axisLine={{ stroke: 'var(--color-brd2)' }}
            tickLine={{ stroke: 'var(--color-brd2)' }}
          />
          <YAxis
            domain={['dataMin - 20', 'dataMax + 20']}
            tick={{ fontSize: 8, fontFamily: 'var(--font-pixel)', fill: 'var(--color-muted)' }}
            axisLine={{ stroke: 'var(--color-brd2)' }}
            tickLine={{ stroke: 'var(--color-brd2)' }}
            width={36}
          />
          <Tooltip
            labelFormatter={formatQuarter}
            contentStyle={{
              fontFamily: 'var(--font-pixel), monospace', fontSize: 9,
              backgroundColor: 'var(--color-bg)', border: '2px solid var(--color-brd2)',
              boxShadow: '3px 3px 0 var(--color-brd)',
            }}
          />
          {selected.map((name, i) => (
            <Line key={name} type="monotone" dataKey={name} name={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
