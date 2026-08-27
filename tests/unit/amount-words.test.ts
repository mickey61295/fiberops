/**
 * amount-words tests — SPEC-M8 §6: Indian-numbering amount-in-words.
 * The legacy convention: crore/lakh groups (Lakh/Crore pluralize when >1),
 * "and" before the final group, "and Paise … Only", "Rupees Zero Only" for 0.
 * Cap: 999 crore (digit fallback beyond).
 */
import { describe, it, expect } from 'vitest'
import { amountInWords } from '@/lib/erp/print/amount-words'

describe('amountInWords (Indian numbering)', () => {
  it('zero', () => {
    expect(amountInWords(0)).toBe('Rupees Zero Only')
  })

  it('single digits and teens', () => {
    expect(amountInWords(1)).toBe('Rupees One Only')
    expect(amountInWords(7)).toBe('Rupees Seven Only')
    expect(amountInWords(15)).toBe('Rupees Fifteen Only')
    expect(amountInWords(19)).toBe('Rupees Nineteen Only')
  })

  it('tens and hundreds compound', () => {
    expect(amountInWords(20)).toBe('Rupees Twenty Only')
    expect(amountInWords(42)).toBe('Rupees Forty Two Only')
    expect(amountInWords(100)).toBe('Rupees One Hundred Only')
    expect(amountInWords(234)).toBe('Rupees Two Hundred Thirty Four Only')
    expect(amountInWords(999)).toBe('Rupees Nine Hundred Ninety Nine Only')
  })

  it('thousand and lakh boundaries (singular One Lakh)', () => {
    expect(amountInWords(1000)).toBe('Rupees One Thousand Only')
    expect(amountInWords(5001)).toBe('Rupees Five Thousand and One Only')
    expect(amountInWords(100000)).toBe('Rupees One Lakh Only')
    expect(amountInWords(200500)).toBe('Rupees Two Lakhs and Five Hundred Only')
  })

  it('the seeded payment fixture value (205065 = 2,05,065)', () => {
    expect(amountInWords(205065)).toBe('Rupees Two Lakhs Five Thousand and Sixty Five Only')
  })

  it('crore (singular One Crore, plural above)', () => {
    expect(amountInWords(10000000)).toBe('Rupees One Crore Only')
    expect(amountInWords(123456789)).toBe(
      'Rupees Twelve Crores Thirty Four Lakhs Fifty Six Thousand and Seven Hundred Eighty Nine Only',
    )
    expect(amountInWords(9900000000)).toBe('Rupees Nine Hundred Ninety Crores Only')
  })

  it('paise', () => {
    expect(amountInWords(0.45)).toBe('Rupees Zero and Paise Forty Five Only')
    expect(amountInWords(100.05)).toBe('Rupees One Hundred and Paise Five Only')
    expect(amountInWords(12.99)).toBe('Rupees Twelve and Paise Ninety Nine Only')
  })

  it('negative amounts prefix Minus', () => {
    expect(amountInWords(-500)).toBe('Minus Rupees Five Hundred Only')
  })

  it('beyond 999 crore falls back to digits', () => {
    expect(amountInWords(10000000000)).toBe('Rupees 10000000000 Only')
    expect(amountInWords(123456789012.5)).toBe('Rupees 123456789012.50 Only')
  })

  it('non-finite input returns empty', () => {
    expect(amountInWords(Number.NaN)).toBe('')
    expect(amountInWords(Number.POSITIVE_INFINITY)).toBe('')
  })
})
