import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)
const KEY_LEN = 32
const SCRYPT = { N: 16384, r: 8, p: 1 }

export function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase()
}

export function isValidEmail(email) {
  const e = normalizeEmail(email)
  if (!e || e.length > 120) return false
  if (/\s/.test(e)) return false
  const at = e.indexOf('@')
  if (at < 1) return false
  const domain = e.slice(at + 1)
  if (!domain || !domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
}

export function passwordError(password) {
  const p = String(password || '')
  if (p.length < 8) return 'password must be at least 8 characters'
  if (p.length > 200) return 'password is too long'
  return null
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = await scrypt(password, salt, KEY_LEN, SCRYPT)
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), hash.toString('base64url')].join('$')
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$')
  if (parts[0] !== 'scrypt' || parts.length !== 6) return false
  const N = +parts[1], r = +parts[2], p = +parts[3]
  if (!N || !r || !p) return false
  let salt, expect
  try {
    salt = Buffer.from(parts[4], 'base64url')
    expect = Buffer.from(parts[5], 'base64url')
  } catch { return false }
  if (!salt.length || !expect.length) return false
  const hash = await scrypt(String(password || ''), salt, expect.length, { N, r, p })
  try { return crypto.timingSafeEqual(hash, expect) }
  catch { return false }
}
