import { LANGS } from './i18n-core.js'

export const FALLBACK_APP_NAME = 'MiGYM'
export const FALLBACK_LANG = 'en'
/** Corresponding source for this modified AGPL work (Settings footer + README). */
export const SOURCE_REPO = 'https://github.com/luziuu97/migym'
/** Upstream project this work is based on. */
export const UPSTREAM_REPO = 'https://github.com/DuarteSantos8/openGym'

/**
 * Visible app name from /api/config. The frontend is a static bundle, so branding
 * cannot be baked in at Docker build time — it has to come from the API at runtime.
 * A missing/empty/non-string value keeps the stock name (old servers, failed fetch).
 */
export function instanceAppName(config) {
  const n = config && typeof config.app_name === 'string' ? config.app_name.trim() : ''
  return n || FALLBACK_APP_NAME
}

/** In-app / tab title: gym name after join, otherwise the product name. */
export function displayTitle({ user, config } = {}) {
  const gym = user && user.gym && typeof user.gym.name === 'string' ? user.gym.name.trim() : ''
  return gym || instanceAppName(config)
}

/** Default UI language for a device that has never saved state. Unknown codes → English. */
export function instanceDefaultLang(config) {
  const l = config && typeof config.default_lang === 'string' ? config.default_lang.trim() : ''
  return LANGS[l] ? l : FALLBACK_LANG
}

/** Overlay instance defaults onto a fresh profile without touching an existing one. */
export function withInstanceDefaults(state, config, { hasSavedState } = {}) {
  const next = { ...state }
  if (!hasSavedState) next.lang = instanceDefaultLang(config)
  return next
}

/** Tab title + iOS home-screen name. Call once /api/config has arrived. */
export function applyAppBranding(name) {
  if (typeof document === 'undefined') return
  const n = (typeof name === 'string' && name.trim()) || FALLBACK_APP_NAME
  document.title = n
  const apple = document.querySelector('meta[name="apple-mobile-web-app-title"]')
  if (apple) apple.content = n
}
