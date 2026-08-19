import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { makeGym } from './gyms.js'
import { registerPassword, loginPassword } from './auth.js'
import {
  SUFFIX_ALPHABET,
  validateSuffix,
  randomSuffix,
  composeClaimCode,
  claimCodeTaken,
  resolveRegisterCode,
  publicLookup,
  createPendingMember,
  setClaimCode,
} from './claim.js'

function dbWithGym() {
  return {
    users: [{ id: 'owner', gymId: 'g1', role: 'owner', name: 'Boss' }],
    creds: [],
    gyms: [makeGym('Ashim', { id: 'g1', joinCode: 'ASHIM' })],
  }
}

describe('validateSuffix', () => {
  it('accepts 2–12 chars from the suffix alphabet', () => {
    assert.equal(validateSuffix('lu'), 'LU')
    assert.equal(validateSuffix('  luca  '), 'LUCA')
    assert.equal(validateSuffix('abcdefghjklm'), 'ABCDEFGHJKLM')
  })

  it('rejects too short, too long, and ambiguous or junk characters', () => {
    assert.equal(validateSuffix('A'), null)
    assert.equal(validateSuffix('ABCDEFGHJKLMN'), null)
    assert.equal(validateSuffix('LUCA0'), null)
    assert.equal(validateSuffix('LUCAO'), null)
    assert.equal(validateSuffix('LUC-A'), null)
  })
})

describe('randomSuffix', () => {
  it('is 4 characters from the suffix alphabet', () => {
    const s = randomSuffix()
    assert.equal(s.length, 4)
    assert.ok([...s].every(c => SUFFIX_ALPHABET.includes(c)))
  })
})

describe('composeClaimCode', () => {
  it('joins the gym code and suffix with a dash', () => {
    assert.equal(composeClaimCode('ashim', 'luca'), 'ASHIM-LUCA')
  })
})

describe('claimCodeTaken', () => {
  it('treats gym join codes and other unclaimed claimCodes as taken', () => {
    const db = dbWithGym()
    db.users.push({ id: 'p1', gymId: 'g1', role: 'member', claimCode: 'ASHIM-LUCA' })
    assert.equal(claimCodeTaken(db, 'ASHIM'), true)
    assert.equal(claimCodeTaken(db, 'ashim-luca'), true)
    assert.equal(claimCodeTaken(db, 'ASHIM-K7MQ'), false)
  })

  it('ignores a claimed row that no longer holds the code', () => {
    const db = dbWithGym()
    db.users.push({ id: 'p1', gymId: 'g1', role: 'member', invitedBy: 'ASHIM-LUCA' })
    assert.equal(claimCodeTaken(db, 'ASHIM-LUCA'), false)
  })
})

describe('resolveRegisterCode', () => {
  it('hits an unclaimed claimCode before a gym walk-in', () => {
    const db = dbWithGym()
    db.users.push({ id: 'p1', name: 'Luca', gymId: 'g1', role: 'member', claimCode: 'ASHIM-LUCA' })
    const claim = resolveRegisterCode(db, ' ashim-luca ')
    assert.equal(claim.ok, true)
    assert.equal(claim.kind, 'claim')
    assert.equal(claim.user.id, 'p1')
    const join = resolveRegisterCode(db, 'ASHIM')
    assert.equal(join.ok, true)
    assert.equal(join.kind, 'join')
    assert.equal(join.gym.id, 'g1')
  })

  it('misses after the code is claimed, and misses unknown strings', () => {
    const db = dbWithGym()
    db.users.push({ id: 'p1', name: 'Luca', gymId: 'g1', role: 'member' })
    const used = resolveRegisterCode(db, 'ASHIM-LUCA')
    assert.equal(used.ok, false)
    assert.equal(used.status, 403)
    assert.equal(used.error, 'a valid gym code is required')
    const miss = resolveRegisterCode(db, 'NOPE')
    assert.equal(miss.error, used.error)
  })
})

describe('publicLookup', () => {
  it('returns name only for a claim, gym name for both', () => {
    const db = dbWithGym()
    db.users.push({ id: 'p1', name: 'Luca', gymId: 'g1', role: 'member', claimCode: 'ASHIM-LUCA' })
    const claim = publicLookup(resolveRegisterCode(db, 'ASHIM-LUCA'))
    assert.deepEqual(claim, { ok: true, kind: 'claim', name: 'Luca', gymName: 'Ashim' })
    const join = publicLookup(resolveRegisterCode(db, 'ASHIM'))
    assert.equal(join.kind, 'join')
    assert.equal(join.gymName, 'Ashim')
    assert.equal('name' in join, false)
  })
})

describe('createPendingMember', () => {
  it('lets a trainer mint a pending member with a composed claimCode', () => {
    const db = dbWithGym()
    const trainer = { id: 't1', gymId: 'g1', role: 'trainer' }
    const out = createPendingMember(db, trainer, { name: 'Luca', suffix: 'luca' })
    assert.equal(out.ok, true)
    assert.equal(out.claimCode, 'ASHIM-LUCA')
    assert.equal(out.user.role, 'member')
    assert.equal(out.user.email, undefined)
    assert.equal(out.user.password, undefined)
    assert.equal(out.user.claimCode, 'ASHIM-LUCA')
  })

  it('rejects a suffix that collides with a gym join code or another unclaimed code', () => {
    const db = dbWithGym()
    db.gyms.push(makeGym('Other', { id: 'g2', joinCode: 'ASHIM-LUCA' }))
    const staff = { id: 'owner', gymId: 'g1', role: 'owner' }
    const vsGym = createPendingMember(db, staff, { name: 'X', suffix: 'LUCA' })
    assert.equal(vsGym.ok, false)
    assert.equal(vsGym.status, 409)
    const first = createPendingMember(db, staff, { name: 'A', suffix: 'K7MQ' })
    assert.equal(first.ok, true)
    const dup = createPendingMember(db, staff, { name: 'B', suffix: 'K7MQ' })
    assert.equal(dup.ok, false)
    assert.equal(dup.status, 409)
  })

  it('requires gymId when a platform admin has no gym', () => {
    const db = dbWithGym()
    const admin = { id: 'adm', admin: true }
    const missing = createPendingMember(db, admin, { name: 'Luca' })
    assert.equal(missing.ok, false)
    assert.equal(missing.status, 400)
    const ok = createPendingMember(db, admin, { name: 'Luca', gymId: 'g1', suffix: 'LUCA' })
    assert.equal(ok.ok, true)
    assert.equal(ok.user.gymId, 'g1')
  })
})

describe('setClaimCode', () => {
  it('regenerates so the old string misses and the new string claims', () => {
    const db = dbWithGym()
    const staff = { id: 'owner', gymId: 'g1', role: 'owner' }
    const { user } = createPendingMember(db, staff, { name: 'Luca', suffix: 'LUCA' })
    const next = setClaimCode(db, user, { suffix: 'K7MQ' })
    assert.equal(next.ok, true)
    assert.equal(next.claimCode, 'ASHIM-K7MQ')
    assert.equal(resolveRegisterCode(db, 'ASHIM-LUCA').ok, false)
    assert.equal(resolveRegisterCode(db, 'ASHIM-K7MQ').kind, 'claim')
  })

  it('404s once the member has claimed', () => {
    const db = dbWithGym()
    const user = { id: 'p1', name: 'Luca', gymId: 'g1', role: 'member' }
    const out = setClaimCode(db, user, { suffix: 'K7MQ' })
    assert.equal(out.ok, false)
    assert.equal(out.status, 404)
  })
})

describe('registerPassword claim', () => {
  it('attaches credentials to the pending row and keeps id, membership, and plan state', async () => {
    const db = dbWithGym()
    const staff = { id: 'owner', gymId: 'g1', role: 'owner' }
    const pending = createPendingMember(db, staff, { name: 'Luca', suffix: 'LUCA' })
    pending.user.membership = { plan: 'monthly', status: 'active', expiresOn: '2026-09-01' }
    const id = pending.user.id
    const out = await registerPassword(db, {
      name: 'Luca Bianchi', email: 'luca@g.com', password: 'longenough', code: 'ASHIM-LUCA',
    })
    assert.equal(out.ok, true)
    assert.equal(out.user.id, id)
    assert.equal(out.user.name, 'Luca Bianchi')
    assert.equal(out.user.email, 'luca@g.com')
    assert.equal(out.user.claimCode, undefined)
    assert.equal(out.user.invitedBy, 'ASHIM-LUCA')
    assert.ok(out.user.claimedAt)
    assert.equal(out.user.membership.plan, 'monthly')
    assert.equal(db.users.filter(u => u.id === id).length, 1)
    assert.equal(resolveRegisterCode(db, 'ASHIM-LUCA').ok, false)
  })

  it('still creates a new user on a gym walk-in', async () => {
    const db = dbWithGym()
    const out = await registerPassword(db, {
      name: 'Walk', email: 'walk@g.com', password: 'longenough', code: 'ASHIM',
    })
    assert.equal(out.ok, true)
    assert.equal(out.user.role, 'member')
    assert.equal(out.user.claimCode, undefined)
    assert.equal(db.users.length, 2)
  })

  it('refuses login against a pending row', async () => {
    const db = dbWithGym()
    createPendingMember(db, { id: 'owner', gymId: 'g1', role: 'owner' }, { name: 'Luca', suffix: 'LUCA' })
    const out = await loginPassword(db, { email: 'luca@g.com', password: 'longenough' })
    assert.equal(out.ok, false)
    assert.equal(out.status, 401)
  })
})
