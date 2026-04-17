import { describe, it, expect } from 'vitest'
import { resolveColors, withDefaults, isDark } from '../src/core/theme'

describe('theme.withDefaults', () => {
  it('fills in default colors when nothing is supplied', () => {
    const t = withDefaults()
    expect(t.lightPrimary).toBe('#6366f1')
    expect(t.lightPrimaryFg).toBe('#ffffff')
    expect(t.themeMode).toBe('user')
  })

  it('uses light primary as the dark fallback if no dark primary', () => {
    const t = withDefaults({ lightPrimary: '#ff0000', lightPrimaryFg: '#000000' })
    expect(t.darkPrimary).toBe('#ff0000')
    expect(t.darkPrimaryFg).toBe('#000000')
  })
})

describe('theme.isDark', () => {
  it('returns false when themeMode is light', () => {
    expect(isDark(withDefaults({ themeMode: 'light' }), () => true)).toBe(false)
  })
  it('returns true when themeMode is dark', () => {
    expect(isDark(withDefaults({ themeMode: 'dark' }), () => false)).toBe(true)
  })
  it('defers to system when themeMode is user', () => {
    expect(isDark(withDefaults({ themeMode: 'user' }), () => true)).toBe(true)
    expect(isDark(withDefaults({ themeMode: 'user' }), () => false)).toBe(false)
  })
})

describe('theme.resolveColors', () => {
  const theme = withDefaults({
    lightPrimary: '#6366f1',
    lightPrimaryFg: '#ffffff',
    darkPrimary: '#818cf8',
    darkPrimaryFg: '#0f172a',
  })

  it('uses light colors in light mode', () => {
    const c = resolveColors({ theme: { ...theme, themeMode: 'light' }, matches: () => true })
    expect(c).toEqual({ bg: '#6366f1', fg: '#ffffff' })
  })

  it('uses dark colors in dark mode', () => {
    const c = resolveColors({ theme: { ...theme, themeMode: 'dark' }, matches: () => false })
    expect(c).toEqual({ bg: '#818cf8', fg: '#0f172a' })
  })

  it('follows system preference in user mode', () => {
    const c = resolveColors({ theme, matches: () => true })
    expect(c.bg).toBe('#818cf8')
  })

  it('custom buttonColor overrides theme bg', () => {
    const c = resolveColors({ theme, matches: () => false, buttonColor: '#ff0000' })
    expect(c).toEqual({ bg: '#ff0000', fg: '#ffffff' })
  })
})
