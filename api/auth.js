import crypto from 'node:crypto'
import { gymHasOwner, publicUser } from './gyms.js'
import { resolveRegisterCode } from './claim.js'
import { hashPassword, verifyPassword, normalizeEmail, isValidEmail, passwordError } from './password.js'

const fail = (status, error) => ({ ok: false, status, error })

function takeEmail(raw, { required = true } = {}) {
  const email = normalizeEmail(raw)
  if (!email) return required ? fail(400, 'email required') : { ok: true, email: '' }
  if (!isValidEmail(email)) return fail(400, 'invalid email')
  return { ok: true, email }
}

function emailTaken(db, email, exceptId) {
  return (db.users || []).some(u => u.email === email && u.id !== exceptId)
}

export async function registerPassword(db, body) {
  const name = String(body?.name || '').trim().slice(0, 40)
  if (!name) return fail(400, 'name required')
  const em = takeEmail(body?.email)
  if (!em.ok) return em
  if (emailTaken(db, em.email)) return fail(409, 'email in use')
  const pwErr = passwordError(body?.password)
  if (pwErr) return fail(400, pwErr)
  const resolved = resolveRegisterCode(db, body?.code)
  if (!resolved.ok) return resolved
  const password = await hashPassword(body.password)
  if (resolved.kind === 'claim') {
    const user = resolved.user
    user.name = name
    user.email = em.email
    user.password = password
    user.invitedBy = user.claimCode
    user.claimedAt = new Date().toISOString()
    delete user.claimCode
    return { ok: true, user }
  }
  const gym = resolved.gym
  const user = {
    id: crypto.randomBytes(12).toString('base64url'),
    name,
    email: em.email,
    password,
    created: new Date().toISOString(),
    gymId: gym.id,
    role: gymHasOwner(db.users, gym.id) ? 'member' : 'owner',
  }
  db.users.push(user)
  return { ok: true, user }
}

export async function loginPassword(db, body) {
  const email = normalizeEmail(body?.email)
  const user = email ? (db.users || []).find(u => u.email === email) : null
  if (!user || !user.password) {
    await hashPassword('invalid-login')
    return fail(401, 'invalid email or password')
  }
  if (!await verifyPassword(body?.password, user.password)) return fail(401, 'invalid email or password')
  if (user.disabled) return fail(403, 'this account has been disabled')
  return { ok: true, user }
}

export async function setOwnPassword(db, user, body) {
  if (!user) return fail(401, 'not signed in')
  const nextPw = body?.newPassword ?? body?.password
  const pwErr = passwordError(nextPw)
  if (pwErr) return fail(400, pwErr)
  if (user.password) {
    if (!await verifyPassword(body?.currentPassword, user.password)) return fail(400, 'wrong password')
  } else {
    const em = takeEmail(body?.email || user.email)
    if (!em.ok) return em
    if (emailTaken(db, em.email, user.id)) return fail(409, 'email in use')
    user.email = em.email
  }
  user.password = await hashPassword(nextPw)
  return { ok: true, user }
}

export async function adminSetPassword(db, user, body) {
  if (!user) return fail(404, 'no such user')
  const pwErr = passwordError(body?.password)
  if (pwErr) return fail(400, pwErr)
  if (body?.email != null && String(body.email).trim() !== '') {
    const em = takeEmail(body.email)
    if (!em.ok) return em
    if (emailTaken(db, em.email, user.id)) return fail(409, 'email in use')
    user.email = em.email
  } else if (!user.email) {
    return fail(400, 'email required')
  }
  user.password = await hashPassword(body.password)
  user.sv = (user.sv || 0) + 1
  return { ok: true, user }
}

export function authPublic(user, db, isAdmin) {
  const u = publicUser(user, db.gyms, isAdmin)
  if (!u) return null
  u.email = user.email || null
  u.hasPassword = !!user.password
  u.hasPasskey = (db.creds || []).some(c => c.userId === user.id)
  return u
}
