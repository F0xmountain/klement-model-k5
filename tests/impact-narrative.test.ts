import { describe, it, expect } from 'vitest'
import { deltaKey, isNegligible } from '../lib/impact-narrative'

describe('impact narrative thresholds', () => {
  it('classifies gains by magnitude', () => {
    expect(deltaKey(0.05)).toBe('strongGain')
    expect(deltaKey(0.02)).toBe('moderateGain')
    expect(deltaKey(0.005)).toBe('slightGain')
  })
  it('classifies losses by magnitude', () => {
    expect(deltaKey(-0.005)).toBe('slightLoss')
    expect(deltaKey(-0.02)).toBe('moderateLoss')
    expect(deltaKey(-0.05)).toBe('strongLoss')
  })
  it('treats < 0.3% as negligible', () => {
    expect(deltaKey(0.002)).toBe('negligible')
    expect(deltaKey(-0.002)).toBe('negligible')
    expect(isNegligible(0.0029)).toBe(true)
    expect(isNegligible(0.0031)).toBe(false)
  })
})
