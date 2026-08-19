import crypto from 'node:crypto'
import { findGymByJoinCode, normalizeJoinCode } from './gyms.js'

const fail = (status, error) => ({ ok: false, status, error })

export const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function normalizeClaimCode(raw) {
  return String(raw || '').trim().replace(/\s+/g, '').toUpperCase()
}

export function validateSuffix(raw) {
  const s = normalizeClaimCode(raw)
  if (s.length < 2 || s.length > 12) return null
  if (![...s].every(c => SUFFIX_ALPHABET.includes(c))) return null
  return s
}

export function randomSuffix() {
  const bytes = crypto.randomBytes(4)
  let out = ''
  for (let i = 0; i < 4; i++) out += SUFFIX_ALPHABET[bytes[i] % SUFFIX_ALPHABET.length]
  return out
}

export function composeClaimCode(joinCode, suffix) {
  const gym = normalizeJoinCode(joinCode)
  const s = validateSuffix(suffix)
  if (!gym || !s) return null
  return gym + '-' + s
}

export function claimCodeTaken(db, code, exceptUserId) {
  const c = normalizeClaimCode(code)
  if (!c) return true
  if ((db.gyms || []).some(g => normalizeJoinCode(g.joinCode) === c)) return true
  return (db.users || []).some(u => u.claimCode && normalizeClaimCode(u.claimCode) === c && u.id !== exceptUserId)
}

function uniqueSuffix(db, joinCode, exceptUserId) {
  for (let i = 0; i < 24; i++) {
    const suffix = randomSuffix()
    const code = composeClaimCode(joinCode, suffix)
    if (code && !claimCodeTaken(db, code, exceptUserId)) return suffix
  }
  return null
}

export function resolveRegisterCode(db, raw) {
  const code = normalizeClaimCode(raw)
  if (!code) return fail(403, 'a valid gym code is required')
  const pending = (db.users || []).find(u => u.claimCode && normalizeClaimCode(u.claimCode) === code)
  if (pending) {
    const gym = (db.gyms || []).find(g => g.id === pending.gymId) || null
    return { ok: true, kind: 'claim', user: pending, gym }
  }
  const gym = findGymByJoinCode(db.gyms, code)
  if (gym) return { ok: true, kind: 'join', gym }
  return fail(403, 'a valid gym code is required')
}

export function publicLookup(resolved) {
  if (!resolved || !resolved.ok) return resolved && resolved.ok === false ? resolved : fail(403, 'a valid gym code is required')
  if (resolved.kind === 'claim') {
    return { ok: true, kind: 'claim', name: resolved.user.name, gymName: (resolved.gym && resolved.gym.name) || '' }
  }
  return { ok: true, kind: 'join', gymName: resolved.gym.name }
}

function gymForStaff(db, staff, body) {
  let gymId = staff && staff.gymId
  if (!gymId) {
    if (staff && staff.admin && body && body.gymId) gymId = body.gymId
    else return fail(400, 'gym required')
  }
  const gym = (db.gyms || []).find(g => g.id === gymId)
  if (!gym) return fail(404, 'no such gym')
  return { ok: true, gym }
}

function takeSuffix(db, joinCode, raw, exceptUserId) {
  const trimmed = raw == null ? '' : String(raw).trim()
  if (!trimmed) {
    const suffix = uniqueSuffix(db, joinCode, exceptUserId)
    if (!suffix) return fail(409, 'code already in use')
    return { ok: true, suffix }
  }
  const suffix = validateSuffix(trimmed)
  if (!suffix) return fail(400, 'invalid join code')
  return { ok: true, suffix }
}

export function createPendingMember(db, staff, body) {
  const name = String(body && body.name || '').trim().slice(0, 40)
  if (!name) return fail(400, 'name required')
  const g = gymForStaff(db, staff, body)
  if (!g.ok) return g
  const taken = takeSuffix(db, g.gym.joinCode, body && body.suffix)
  if (!taken.ok) return taken
  const claimCode = composeClaimCode(g.gym.joinCode, taken.suffix)
  if (!claimCode || claimCodeTaken(db, claimCode)) return fail(409, 'code already in use')
  const user = {
    id: crypto.randomBytes(12).toString('base64url'),
    name,
    gymId: g.gym.id,
    role: 'member',
    created: new Date().toISOString(),
    claimCode,
  }
  db.users.push(user)
  return { ok: true, user, claimCode }
}

export function setClaimCode(db, user, body) {
  if (!user || !user.claimCode) return fail(404, 'no such user')
  const gym = (db.gyms || []).find(g => g.id === user.gymId)
  if (!gym) return fail(404, 'no such user')
  const taken = takeSuffix(db, gym.joinCode, body && body.suffix, user.id)
  if (!taken.ok) return taken
  const claimCode = composeClaimCode(gym.joinCode, taken.suffix)
  if (!claimCode || claimCodeTaken(db, claimCode, user.id)) return fail(409, 'code already in use')
  user.claimCode = claimCode
  return { ok: true, user, claimCode }
}
