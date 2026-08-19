// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { instanceAppName, instanceDefaultLang, withInstanceDefaults, applyAppBranding, displayTitle } from './instance.js'

// Public /api/config is the only runtime channel the static frontend has. A missing config
// still has to say MiGYM — never a blank title or the upstream openGym name.

describe('instanceAppName', () => {
  it('falls back to MiGYM when config is missing or empty', () => {
    expect(instanceAppName(null)).toBe('MiGYM')
    expect(instanceAppName(undefined)).toBe('MiGYM')
    expect(instanceAppName({})).toBe('MiGYM')
    expect(instanceAppName({ app_name: '   ' })).toBe('MiGYM')
  })

  it('uses a trimmed app_name from the server', () => {
    expect(instanceAppName({ app_name: 'MiGYM' })).toBe('MiGYM')
    expect(instanceAppName({ app_name: '  MiGYM  ' })).toBe('MiGYM')
  })

  it('ignores non-string names so a bad payload cannot blank the UI', () => {
    expect(instanceAppName({ app_name: 12 })).toBe('MiGYM')
    expect(instanceAppName({ app_name: { n: 'x' } })).toBe('MiGYM')
  })
})

describe('instanceDefaultLang', () => {
  it('falls back to English when config is missing or the code is unknown', () => {
    expect(instanceDefaultLang(null)).toBe('en')
    expect(instanceDefaultLang({})).toBe('en')
    expect(instanceDefaultLang({ default_lang: 'xx' })).toBe('en')
    expect(instanceDefaultLang({ default_lang: 'ES' })).toBe('en')
  })

  it('accepts a known language code from the server', () => {
    expect(instanceDefaultLang({ default_lang: 'es' })).toBe('es')
    expect(instanceDefaultLang({ default_lang: 'de' })).toBe('de')
  })
})

describe('withInstanceDefaults', () => {
  it('applies default_lang only when this device has no saved state', () => {
    const s = { lang: 'en', unit: 'kg' }
    expect(withInstanceDefaults(s, { default_lang: 'es' }, { hasSavedState: false }).lang).toBe('es')
    expect(withInstanceDefaults(s, { default_lang: 'es' }, { hasSavedState: true }).lang).toBe('en')
  })

  it('does not mutate the input state object', () => {
    const s = { lang: 'en' }
    withInstanceDefaults(s, { default_lang: 'es' }, { hasSavedState: false })
    expect(s.lang).toBe('en')
  })
})

describe('displayTitle', () => {
  it('uses the gym name once the user belongs to a gym', () => {
    expect(displayTitle({ user: { gym: { name: 'Box Palermo' } }, config: { app_name: 'MiGYM' } })).toBe('Box Palermo')
  })
  it('falls back to MiGYM when signed out or gym-less', () => {
    expect(displayTitle({ user: null, config: { app_name: 'MiGYM' } })).toBe('MiGYM')
    expect(displayTitle({ user: { name: 'Ana' }, config: { app_name: 'MiGYM' } })).toBe('MiGYM')
  })
})

describe('applyAppBranding', () => {
  it('sets the document title and the iOS home-screen name', () => {
    document.title = 'MiGYM'
    const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]')
      || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'apple-mobile-web-app-title' }))
    meta.content = 'MiGYM'
    applyAppBranding('MiGYM')
    expect(document.title).toBe('MiGYM')
    expect(meta.content).toBe('MiGYM')
  })
})
