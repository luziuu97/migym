// Shape of GET /api/config. Kept in its own module so the env parsing is unit-testable
// without standing up the HTTP server.

const LANGS = new Set(['en', 'de', 'es', 'fr', 'it', 'pt', 'pl', 'tr', 'ru', 'zh', 'ko', 'hi'])
const FALLBACK_NAME = 'MiGYM'
const FALLBACK_LANG = 'en'

export function parseAppName(raw) {
  const n = typeof raw === 'string' ? raw.trim() : ''
  return n || FALLBACK_NAME
}

export function parseDefaultLang(raw) {
  const l = typeof raw === 'string' ? raw.trim() : ''
  return LANGS.has(l) ? l : FALLBACK_LANG
}

export function publicConfig(env = {}) {
  return {
    invite_only: !!env.invite_only,
    allow_guest: env.allow_guest !== false,
    join_required: env.join_required !== false,
    app_name: parseAppName(env.APP_NAME || env.RP_NAME),
    default_lang: parseDefaultLang(env.DEFAULT_LANG),
  }
}
