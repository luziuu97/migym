import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { makeGym } from './gyms.js'
import {
  registerPassword, loginPassword, setOwnPassword, adminSetPassword, authPublic,
} from './auth.js'

function emptyDb() {
  return { users: [], creds: [], gyms: [makeGym('Box', { id: 'g1', joinCode: 'PALERMO' })] }
}

describe('registerPassword', () => {
  it('creates a member with email and a hashed password', async () => {
    const db = emptyDb()
    db.users.push({ id: 'owner', gymId: 'g1', role: 'owner', name: 'Boss' })
    const out = await registerPassword(db, {
      name: 'Ana', email: 'Ana@Gym.COM', password: 'longenough', code: 'palermo',
    })
    assert.equal(out.ok, true)
    assert.equal(out.user.email, 'ana@gym.com')
    assert.equal(out.user.role, 'member')
    assert.equal(out.user.gymId, 'g1')
    assert.match(out.user.password, /^scrypt\$/)
    assert.equal(out.user.password.includes('longenough'), false)
  })

  it('makes the first user in a gym the owner', async () => {
    const db = emptyDb()
    const out = await registerPassword(db, {
      name: 'Boss', email: 'boss@gym.com', password: 'longenough', code: 'PALERMO',
    })
    assert.equal(out.ok, true)
    assert.equal(out.user.role, 'owner')
  })

  it('rejects a duplicate email, a short password, and a bad gym code', async () => {
    const db = emptyDb()
    await registerPassword(db, { name: 'A', email: 'a@g.com', password: 'longenough', code: 'PALERMO' })
    const dup = await registerPassword(db, { name: 'B', email: 'A@G.COM', password: 'longenough', code: 'PALERMO' })
    assert.equal(dup.ok, false)
    assert.equal(dup.status, 409)
    const short = await registerPassword(db, { name: 'C', email: 'c@g.com', password: 'short', code: 'PALERMO' })
    assert.equal(short.ok, false)
    assert.equal(short.status, 400)
    const code = await registerPassword(db, { name: 'D', email: 'd@g.com', password: 'longenough', code: 'NOPE' })
    assert.equal(code.ok, false)
    assert.equal(code.status, 403)
  })
})

describe('loginPassword', () => {
  it('returns the user for a matching email and password', async () => {
    const db = emptyDb()
    await registerPassword(db, { name: 'Ana', email: 'ana@g.com', password: 'longenough', code: 'PALERMO' })
    const out = await loginPassword(db, { email: 'ANA@g.com', password: 'longenough' })
    assert.equal(out.ok, true)
    assert.equal(out.user.name, 'Ana')
  })

  it('uses the same error for unknown email and wrong password', async () => {
    const db = emptyDb()
    await registerPassword(db, { name: 'Ana', email: 'ana@g.com', password: 'longenough', code: 'PALERMO' })
    const unknown = await loginPassword(db, { email: 'nope@g.com', password: 'longenough' })
    const wrong = await loginPassword(db, { email: 'ana@g.com', password: 'wrongwrong' })
    assert.equal(unknown.ok, false)
    assert.equal(wrong.ok, false)
    assert.equal(unknown.status, 401)
    assert.equal(unknown.error, wrong.error)
  })

  it('refuses a disabled account', async () => {
    const db = emptyDb()
    const { user } = await registerPassword(db, { name: 'Ana', email: 'ana@g.com', password: 'longenough', code: 'PALERMO' })
    user.disabled = true
    const out = await loginPassword(db, { email: 'ana@g.com', password: 'longenough' })
    assert.equal(out.ok, false)
    assert.equal(out.status, 403)
  })
})

describe('setOwnPassword', () => {
  it('requires the current password when one is already set', async () => {
    const db = emptyDb()
    const { user } = await registerPassword(db, { name: 'Ana', email: 'ana@g.com', password: 'longenough', code: 'PALERMO' })
    const bad = await setOwnPassword(db, user, { currentPassword: 'nope', newPassword: 'newenough' })
    assert.equal(bad.ok, false)
    const ok = await setOwnPassword(db, user, { currentPassword: 'longenough', newPassword: 'newenough' })
    assert.equal(ok.ok, true)
    const login = await loginPassword(db, { email: 'ana@g.com', password: 'newenough' })
    assert.equal(login.ok, true)
  })

  it('lets a passkey-only user add email and password', async () => {
    const db = emptyDb()
    const user = { id: 'u1', name: 'Ana', gymId: 'g1', role: 'member' }
    db.users.push(user)
    const missing = await setOwnPassword(db, user, { password: 'longenough' })
    assert.equal(missing.ok, false)
    assert.equal(missing.status, 400)
    const ok = await setOwnPassword(db, user, { email: 'ana@g.com', password: 'longenough' })
    assert.equal(ok.ok, true)
    assert.equal(user.email, 'ana@g.com')
    const login = await loginPassword(db, { email: 'ana@g.com', password: 'longenough' })
    assert.equal(login.ok, true)
  })
})

describe('adminSetPassword', () => {
  it('sets email+password and bumps the session version', async () => {
    const db = emptyDb()
    const user = { id: 'u1', name: 'Ana', gymId: 'g1', role: 'member', sv: 0 }
    db.users.push(user)
    const out = await adminSetPassword(db, user, { password: 'temp-pass', email: 'ana@g.com' })
    assert.equal(out.ok, true)
    assert.equal(user.email, 'ana@g.com')
    assert.equal(user.sv, 1)
    const login = await loginPassword(db, { email: 'ana@g.com', password: 'temp-pass' })
    assert.equal(login.ok, true)
  })

  it('requires email when the member has none', async () => {
    const db = emptyDb()
    const user = { id: 'u1', name: 'Ana', gymId: 'g1', role: 'member' }
    db.users.push(user)
    const out = await adminSetPassword(db, user, { password: 'temp-pass' })
    assert.equal(out.ok, false)
    assert.equal(out.status, 400)
  })
})

describe('authPublic', () => {
  it('never includes the hash and reports which login methods exist', async () => {
    const db = emptyDb()
    const { user } = await registerPassword(db, { name: 'Ana', email: 'ana@g.com', password: 'longenough', code: 'PALERMO' })
    db.creds.push({ id: 'cred1', userId: user.id })
    const pub = authPublic(user, db, () => false)
    assert.equal(pub.email, 'ana@g.com')
    assert.equal(pub.hasPassword, true)
    assert.equal(pub.hasPasskey, true)
    assert.equal('password' in pub, false)
  })
})
