import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { publicConfig, parseAppName, parseDefaultLang } from './public-config.js'

describe('parseAppName', () => {
  it('trims and falls back to MiGYM', () => {
    assert.equal(parseAppName('MiGYM'), 'MiGYM')
    assert.equal(parseAppName('  MiGYM  '), 'MiGYM')
    assert.equal(parseAppName(''), 'MiGYM')
    assert.equal(parseAppName(undefined), 'MiGYM')
  })
})

describe('parseDefaultLang', () => {
  it('accepts known codes and rejects the rest', () => {
    assert.equal(parseDefaultLang('es'), 'es')
    assert.equal(parseDefaultLang('en'), 'en')
    assert.equal(parseDefaultLang('xx'), 'en')
    assert.equal(parseDefaultLang('ES'), 'en')
    assert.equal(parseDefaultLang(undefined), 'en')
  })
})

describe('publicConfig', () => {
  it('exposes invite flags plus app_name and default_lang', () => {
    assert.deepEqual(publicConfig({
      invite_only: true,
      allow_guest: false,
      APP_NAME: 'MiGYM',
      DEFAULT_LANG: 'es',
    }), {
      invite_only: true,
      allow_guest: false,
      join_required: true,
      app_name: 'MiGYM',
      default_lang: 'es',
    })
  })

  it('uses RP_NAME for the visible name when APP_NAME is unset', () => {
    assert.equal(publicConfig({ RP_NAME: 'MiGYM' }).app_name, 'MiGYM')
  })

  it('prefers APP_NAME over RP_NAME when both are set', () => {
    assert.equal(publicConfig({ APP_NAME: 'MiGYM', RP_NAME: 'other' }).app_name, 'MiGYM')
  })
})
