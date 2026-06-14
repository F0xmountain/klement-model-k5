'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Btn from '@/components/ui/Btn'
import WDLBar from '@/components/ui/WDLBar'
import { previewMatchP } from '@/lib/klement-custom'
import { DEFAULT_WEIGHTS, BASE_FACTOR_TARGET, baseFactorSum, baseSumWithinSaveRange, normalizeBaseWeights, type ModelWeights } from '@/lib/model-config'

interface Props {
  initial: ModelWeights
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

// Vaste voorbeeldwedstrijd voor de live preview (Klement's voorspelde finale)
const PREVIEW_A = 'Netherlands'
const PREVIEW_B = 'France'

const PRESETS: Record<string, ModelWeights> = {
  presetDefault: DEFAULT_WEIGHTS,
  presetEloHeavy: { ...DEFAULT_WEIGHTS, eloWeight: 0.60 },
  presetFormHeavy: { ...DEFAULT_WEIGHTS, formWeight: 0.30 },
  presetMarketFocused: { ...DEFAULT_WEIGHTS, marketWeight: 0.50 },
  presetConservative: { ...DEFAULT_WEIGHTS, altitudeEnabled: false, travelEnabled: false },
}

// Alleen de numerieke gewicht-velden zijn slider-instelbaar (booleans zijn toggles).
type NumericWeightKey = { [K in keyof ModelWeights]: ModelWeights[K] extends number ? K : never }[keyof ModelWeights]

interface SliderDef {
  key: NumericWeightKey
  labelKey: string
  max: number
}

const BASE_SLIDERS: SliderDef[] = [
  { key: 'gdp', labelKey: 'w_gdp', max: 1 },
  { key: 'pop', labelKey: 'w_pop', max: 1 },
  { key: 'temp', labelKey: 'w_temp', max: 1 },
  { key: 'fifa', labelKey: 'w_fifa', max: 1 },
  { key: 'host', labelKey: 'w_host', max: 1 },
]

const EXT_SLIDERS: SliderDef[] = [
  { key: 'formWeight', labelKey: 'w_form', max: 1 },
  { key: 'leagueWeight', labelKey: 'w_league', max: 1 },
  { key: 'marketWeight', labelKey: 'w_market', max: 1 },
]

const STAR_SLIDERS: SliderDef[] = [
  { key: 'starPenalty1', labelKey: 'w_star1', max: 0.2 },
  { key: 'starPenalty2', labelKey: 'w_star2', max: 0.2 },
  { key: 'starPenalty3', labelKey: 'w_star3', max: 0.2 },
]

export default function ModelConfigClient({ initial }: Props) {
  const t = useTranslations('modelConfig')
  const [w, setW] = useState<ModelWeights>(initial)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const sum = baseFactorSum(w)
  const sumOff = Math.abs(sum - BASE_FACTOR_TARGET) > 0.005
  const canSave = baseSumWithinSaveRange(w)
  // FIFA-aandeel van het teamsterkte-slot (Elo krijgt de rest); som altijd 100%.
  const fifaPct = Math.round((1 - w.eloWeight) * 100)

  // Live preview met de huidige slider-waarden (niet de opgeslagen config)
  const { pA, dr, pB } = previewMatchP(PREVIEW_A, PREVIEW_B, w)

  function setWeight(key: NumericWeightKey, value: number) {
    setW(prev => ({ ...prev, [key]: value }))
    setSaveState('idle')
  }

  function setToggle(key: 'altitudeEnabled' | 'travelEnabled', value: boolean) {
    setW(prev => ({ ...prev, [key]: value }))
    setSaveState('idle')
  }

  function applyPreset(preset: ModelWeights) {
    setW(preset)
    setSaveState('idle')
  }

  function normalize() {
    setW(prev => normalizeBaseWeights(prev))
    setSaveState('idle')
  }

  async function save() {
    if (!canSave) return
    setSaveState('saving')
    try {
      const res = await fetch('/api/admin/model-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(w),
      })
      if (!res.ok) throw new Error('save failed')
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  function renderSlider({ key, labelKey, max }: SliderDef) {
    return (
      <div key={key} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 44px', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <label htmlFor={`w-${key}`} style={{ fontSize: 9, color: 'var(--color-muted)' }}>{t(labelKey)}</label>
        <input
          id={`w-${key}`}
          type="range"
          min={0}
          max={max}
          step={0.01}
          value={w[key]}
          onChange={e => setWeight(key, Number(e.target.value))}
          style={{ accentColor: 'var(--color-b)', width: '100%' }}
        />
        <span style={{ fontSize: 9, color: 'var(--color-b)', textAlign: 'right' }}>{w[key].toFixed(2)}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
      {/* Presets */}
      <div>
        <div style={{ fontSize: 9, color: 'var(--color-muted)', marginBottom: 10 }}>{t('presets')}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.entries(PRESETS).map(([name, preset]) => (
            <Btn key={name} variant="default" onClick={() => applyPreset(preset)}>{t(name)}</Btn>
          ))}
        </div>
      </div>

      {/* Base factors */}
      <div className="factor-card">
        <div style={{ fontSize: 10, color: 'var(--color-r)', marginBottom: 16 }}>{t('baseFactors')}</div>
        {BASE_SLIDERS.map(renderSlider)}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, color: sumOff ? 'var(--color-r)' : 'var(--color-g)' }}>
            {sumOff
              ? t('baseSumNormHint', { sum: sum.toFixed(2) })
              : `${t('baseSumLabel')}: ${sum.toFixed(2)} / ${BASE_FACTOR_TARGET.toFixed(2)} — ${t('baseSumOk')}`}
          </span>
          {sumOff && (
            <Btn variant="default" onClick={normalize}>{t('normalize')}</Btn>
          )}
        </div>
      </div>

      {/* Extension factors */}
      <div className="factor-card">
        <div style={{ fontSize: 10, color: 'var(--color-b)', marginBottom: 16 }}>{t('extensions')}</div>
        {/* FIFA/Elo-verdeling — som altijd 100% (zet eloWeight = 1 − FIFA%) */}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="w-fifaElo" style={{ fontSize: 9, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
            {t('fifaEloSlider')}: {t('fifaEloValue', { fifa: fifaPct, elo: 100 - fifaPct })}
          </label>
          <input
            id="w-fifaElo"
            type="range"
            min={10}
            max={90}
            step={5}
            value={fifaPct}
            onChange={e => setWeight('eloWeight', 1 - Number(e.target.value) / 100)}
            style={{ accentColor: 'var(--color-b)', width: '100%' }}
          />
        </div>
        {EXT_SLIDERS.map(renderSlider)}
      </div>

      {/* Star penalties */}
      <div className="factor-card">
        <div style={{ fontSize: 10, color: 'var(--color-g)', marginBottom: 16 }}>{t('starPenalties')}</div>
        {STAR_SLIDERS.map(renderSlider)}
        {/* Globale schaal op alle sterspeler-penalty's */}
        <div style={{ marginTop: 14 }}>
          <label htmlFor="w-starScale" style={{ fontSize: 9, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
            {t('starPlayerScale')}: {w.starPlayerScale.toFixed(1)}×
          </label>
          <input
            id="w-starScale"
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={w.starPlayerScale}
            onChange={e => setWeight('starPlayerScale', Number(e.target.value))}
            style={{ accentColor: 'var(--color-g)', width: '100%' }}
          />
          <div style={{ fontSize: 8, color: 'var(--color-muted)', marginTop: 4 }}>{t('starScaleHint')}</div>
        </div>
      </div>

      {/* Venue-factor schakelaars */}
      <div className="factor-card">
        <div style={{ fontSize: 10, color: 'var(--color-o)', marginBottom: 16 }}>{t('factorToggles')}</div>
        {([
          { key: 'altitudeEnabled', labelKey: 'altitudeToggle' },
          { key: 'travelEnabled', labelKey: 'travelToggle' },
        ] as const).map(({ key, labelKey }) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: 9, color: 'var(--color-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={w[key]}
              onChange={e => setToggle(key, e.target.checked)}
              style={{ accentColor: 'var(--color-b)' }}
            />
            {t(labelKey)}
          </label>
        ))}
      </div>

      {/* Live preview */}
      <div className="factor-card">
        <div style={{ fontSize: 10, color: 'var(--color-txt)', marginBottom: 16 }}>
          {t('previewTitle')}: {PREVIEW_A} {t('vsLabel')} {PREVIEW_B}
        </div>
        <WDLBar pA={pA} dr={dr} pB={pB} labelA={PREVIEW_A} labelB={PREVIEW_B} />
        <div style={{ marginTop: 10, fontSize: 8, color: 'var(--color-muted)' }}>{t('previewNote')}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <Btn variant="green" onClick={save} disabled={saveState === 'saving' || !canSave}>
          {saveState === 'saving' ? t('saving') : t('save')}
        </Btn>
        <Btn variant="default" onClick={() => applyPreset(DEFAULT_WEIGHTS)}>{t('reset')}</Btn>
        <span style={{ fontSize: 8 }}>
          {!canSave && <span style={{ color: 'var(--color-r)' }}>{t('saveBlocked')}</span>}
          {canSave && saveState === 'saved' && <span style={{ color: 'var(--color-g)' }}>{t('saved')}</span>}
          {canSave && saveState === 'error' && <span style={{ color: 'var(--color-r)' }}>{t('saveError')}</span>}
        </span>
      </div>
    </div>
  )
}
