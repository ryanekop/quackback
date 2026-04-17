export interface ResolvedTheme {
  lightPrimary: string
  lightPrimaryFg: string
  darkPrimary: string
  darkPrimaryFg: string
  radius: string
  themeMode: 'light' | 'dark' | 'user'
}

export function withDefaults(partial?: Partial<ResolvedTheme>): ResolvedTheme {
  return {
    lightPrimary: partial?.lightPrimary ?? '#6366f1',
    lightPrimaryFg: partial?.lightPrimaryFg ?? '#ffffff',
    darkPrimary: partial?.darkPrimary ?? partial?.lightPrimary ?? '#6366f1',
    darkPrimaryFg: partial?.darkPrimaryFg ?? partial?.lightPrimaryFg ?? '#ffffff',
    radius: partial?.radius ?? '24px',
    themeMode: partial?.themeMode ?? 'user',
  }
}

export function isDark(theme: ResolvedTheme, matchesDark: () => boolean): boolean {
  if (theme.themeMode === 'light') return false
  if (theme.themeMode === 'dark') return true
  return matchesDark()
}

export interface ResolveColorsOptions {
  theme: ResolvedTheme
  /** Typically `() => window.matchMedia('(prefers-color-scheme: dark)').matches`. */
  matches: () => boolean
  buttonColor?: string
}

export function resolveColors({ theme, matches, buttonColor }: ResolveColorsOptions): {
  bg: string
  fg: string
} {
  const dark = isDark(theme, matches)
  return {
    bg: buttonColor || (dark ? theme.darkPrimary : theme.lightPrimary),
    fg: dark ? theme.darkPrimaryFg : theme.lightPrimaryFg,
  }
}
